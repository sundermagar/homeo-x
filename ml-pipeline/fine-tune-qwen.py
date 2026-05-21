"""
LoRA fine-tune Qwen2.5-1.5B-Instruct on exported clinical consultations.

Runs entirely on CPU (16GB RAM target). Saves a versioned LoRA adapter
to ml-pipeline/output/qwen-homeo-v{N}/ — adapters are ~30MB, base model
stays untouched on disk.

Usage:
    python ml-pipeline/fine-tune-qwen.py
    python ml-pipeline/fine-tune-qwen.py --epochs 5 --lr 1e-4
    TRAIN_DEVICE=cuda python ml-pipeline/fine-tune-qwen.py   # if a GPU appears
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import torch
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from rich.console import Console
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
)
from trl import SFTConfig, SFTTrainer

console = Console()

# ─── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = ROOT / "output"
TRAIN_FILE = OUTPUT_ROOT / "train.jsonl"
VAL_FILE = OUTPUT_ROOT / "val.jsonl"
STATE_FILE = ROOT / "state" / "last_run.json"

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"


def next_version_dir() -> Path:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    existing = sorted([p for p in OUTPUT_ROOT.glob("qwen-homeo-v*") if p.is_dir()])
    n = len(existing) + 1
    out = OUTPUT_ROOT / f"qwen-homeo-v{n}"
    out.mkdir(parents=True, exist_ok=False)
    return out


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--batch-size", type=int, default=1)
    p.add_argument("--grad-accum", type=int, default=8)
    p.add_argument("--max-seq-length", type=int, default=2048)
    p.add_argument("--lora-r", type=int, default=8)
    p.add_argument("--lora-alpha", type=int, default=16)
    p.add_argument("--lora-dropout", type=float, default=0.05)
    p.add_argument("--warmup-steps", type=int, default=20)
    p.add_argument("--eval-steps", type=int, default=50)
    p.add_argument("--save-steps", type=int, default=100)
    p.add_argument("--logging-steps", type=int, default=10)
    return p.parse_args()


def check_data():
    if not TRAIN_FILE.exists():
        console.print(f"[red]train.jsonl missing at {TRAIN_FILE}.[/red]")
        console.print("Run [bold]pnpm train:export[/bold] first.")
        sys.exit(1)
    train_count = sum(1 for _ in TRAIN_FILE.open("r", encoding="utf-8"))
    val_count = sum(1 for _ in VAL_FILE.open("r", encoding="utf-8")) if VAL_FILE.exists() else 0
    console.print(f"[cyan]train rows:[/cyan] {train_count}")
    console.print(f"[cyan]val rows:[/cyan]   {val_count}")
    if train_count < 10:
        console.print("[yellow]⚠ very small dataset — model will overfit. Recommend ≥300 examples for usable results.[/yellow]")
    return train_count, val_count


def pick_device() -> tuple[str, torch.dtype]:
    env = os.environ.get("TRAIN_DEVICE", "").lower()
    if env == "cuda" and torch.cuda.is_available():
        return "cuda", torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    if env == "cuda":
        console.print("[yellow]TRAIN_DEVICE=cuda requested but no GPU available — falling back to CPU.[/yellow]")
    # CPU path: fp32 is the safest choice across torch versions on Intel CPUs.
    return "cpu", torch.float32


def main():
    args = parse_args()
    out_dir = next_version_dir()
    console.rule(f"[bold green]Fine-tuning → {out_dir.name}[/bold green]")

    train_count, val_count = check_data()
    device, dtype = pick_device()
    console.print(f"[cyan]device:[/cyan] {device}  [cyan]dtype:[/cyan] {dtype}")

    # ─── Tokenizer ────────────────────────────────────────────────────────────
    console.print(f"[cyan]loading tokenizer:[/cyan] {BASE_MODEL}")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # ─── Model ────────────────────────────────────────────────────────────────
    console.print(f"[cyan]loading base model:[/cyan] {BASE_MODEL} (this can take a few minutes)")
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=dtype,
        device_map=device if device == "cuda" else None,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    if device == "cpu":
        model = model.to("cpu")

    model.config.use_cache = False

    # ─── LoRA ─────────────────────────────────────────────────────────────────
    lora_cfg = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    )
    model = get_peft_model(model, lora_cfg)
    trainable, total = 0, 0
    for p in model.parameters():
        total += p.numel()
        if p.requires_grad:
            trainable += p.numel()
    console.print(f"[cyan]trainable params:[/cyan] {trainable:,} / {total:,}  ({100*trainable/total:.3f}%)")

    # ─── Dataset ──────────────────────────────────────────────────────────────
    data_files = {"train": str(TRAIN_FILE)}
    if val_count > 0:
        data_files["validation"] = str(VAL_FILE)
    ds = load_dataset("json", data_files=data_files)

    # Apply Qwen chat template to convert messages → string.
    def format_row(example):
        return {
            "text": tokenizer.apply_chat_template(
                example["messages"],
                tokenize=False,
                add_generation_prompt=False,
            )
        }

    ds = ds.map(format_row, remove_columns=["messages"])

    # ─── Trainer ──────────────────────────────────────────────────────────────
    sft_cfg = SFTConfig(
        output_dir=str(out_dir),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        warmup_steps=args.warmup_steps,
        lr_scheduler_type="cosine",
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        save_total_limit=2,
        eval_strategy="steps" if val_count > 0 else "no",
        eval_steps=args.eval_steps if val_count > 0 else None,
        max_length=args.max_seq_length,            # renamed in trl >= 0.13
        dataset_text_field="text",
        packing=False,
        completion_only_loss=True,                 # only train on assistant turn
        bf16=(dtype == torch.bfloat16),
        fp16=(dtype == torch.float16),
        report_to=[],
        gradient_checkpointing=True,
        optim="adamw_torch",
        seed=42,
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_cfg,
        train_dataset=ds["train"],
        eval_dataset=ds.get("validation"),
        processing_class=tokenizer,                # renamed in trl >= 0.13
    )

    # ─── Train ────────────────────────────────────────────────────────────────
    console.rule("[bold yellow]Training[/bold yellow]")
    t0 = time.time()
    trainer.train()
    elapsed = time.time() - t0
    console.print(f"[green]training done in {elapsed/60:.1f} min[/green]")

    # ─── Save adapter ─────────────────────────────────────────────────────────
    adapter_dir = out_dir / "adapter"
    trainer.save_model(str(adapter_dir))
    tokenizer.save_pretrained(str(adapter_dir))
    console.print(f"[green]adapter saved →[/green] {adapter_dir}")

    # ─── Training log ─────────────────────────────────────────────────────────
    log_history = trainer.state.log_history
    summary = {
        "base_model": BASE_MODEL,
        "version_dir": out_dir.name,
        "train_rows": train_count,
        "val_rows": val_count,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "lora": {"r": args.lora_r, "alpha": args.lora_alpha, "dropout": args.lora_dropout},
        "elapsed_seconds": round(elapsed, 1),
        "device": device,
        "final_log": log_history[-1] if log_history else None,
        "log_history": log_history,
    }
    (out_dir / "training_log.json").write_text(json.dumps(summary, indent=2))
    console.print(f"[green]training log →[/green] {out_dir / 'training_log.json'}")

    console.rule("[bold green]✓ done[/bold green]")
    console.print(f"Next step: [bold]pnpm train:eval[/bold] (or python ml-pipeline/eval.py)")


if __name__ == "__main__":
    main()
