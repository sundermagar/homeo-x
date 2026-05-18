"""
Evaluate the latest LoRA adapter against val.jsonl held-out cases.

Metrics:
  1. valid_json_rate    — fraction of outputs that parse as JSON
  2. top1_remedy_match  — fraction where predicted suggestedRemedy.name matches ground truth
  3. rubric_jaccard     — mean Jaccard overlap of mappedRubrics with ground truth

Compares against the previous version (if any) and writes eval_report.json.

Usage:
    python ml-pipeline/eval.py
    python ml-pipeline/eval.py --version v3        # eval a specific version
    python ml-pipeline/eval.py --max-samples 20    # quick smoke test
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import torch
from peft import PeftModel
from rich.console import Console
from rich.table import Table
from transformers import AutoModelForCausalLM, AutoTokenizer

console = Console()

ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = ROOT / "output"
VAL_FILE = OUTPUT_ROOT / "val.jsonl"
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"


def list_versions() -> list[Path]:
    return sorted([p for p in OUTPUT_ROOT.glob("qwen-homeo-v*") if p.is_dir()],
                  key=lambda p: int(re.search(r"v(\d+)$", p.name).group(1)))


def normalize_remedy(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def parse_json_loose(text: str):
    """Strip code fences and grab the first {...} object."""
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--version", help="adapter version dir name (default = latest)")
    p.add_argument("--max-samples", type=int, default=0, help="cap samples (0=all)")
    p.add_argument("--max-new-tokens", type=int, default=512)
    return p.parse_args()


def main():
    args = parse_args()
    if not VAL_FILE.exists():
        console.print(f"[red]val.jsonl missing at {VAL_FILE}[/red]")
        sys.exit(1)

    versions = list_versions()
    if not versions:
        console.print("[red]no trained versions found in ml-pipeline/output/[/red]")
        sys.exit(1)

    if args.version:
        target = OUTPUT_ROOT / args.version
        if not target.exists():
            console.print(f"[red]version {args.version} not found[/red]")
            sys.exit(1)
    else:
        target = versions[-1]
    console.rule(f"[bold green]Evaluating {target.name}[/bold green]")

    adapter_dir = target / "adapter"
    if not adapter_dir.exists():
        console.print(f"[red]adapter not found at {adapter_dir}[/red]")
        sys.exit(1)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    console.print(f"[cyan]loading base + adapter on {device}[/cyan]")
    tokenizer = AutoTokenizer.from_pretrained(str(adapter_dir), trust_remote_code=True)
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=dtype,
        device_map=device if device == "cuda" else None,
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    if device == "cpu":
        base = base.to("cpu")
    model = PeftModel.from_pretrained(base, str(adapter_dir))
    model.eval()

    # Load val.jsonl
    samples = []
    with VAL_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            samples.append(json.loads(line))
    if args.max_samples > 0:
        samples = samples[: args.max_samples]
    console.print(f"[cyan]eval samples:[/cyan] {len(samples)}")

    valid_json = 0
    top1_match = 0
    jaccards = []
    rows = []

    for i, s in enumerate(samples):
        msgs = s["messages"]
        # Drop the assistant turn — model has to produce it.
        truth = msgs[-1]["content"]
        prompt_msgs = msgs[:-1]
        prompt = tokenizer.apply_chat_template(prompt_msgs, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

        with torch.no_grad():
            out = model.generate(
                **inputs,
                max_new_tokens=args.max_new_tokens,
                do_sample=False,
                temperature=0.3,
                top_p=0.8,
                pad_token_id=tokenizer.pad_token_id or tokenizer.eos_token_id,
            )
        gen = tokenizer.decode(out[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)

        truth_obj = parse_json_loose(truth) or {}
        pred_obj = parse_json_loose(gen)
        is_valid = pred_obj is not None
        valid_json += 1 if is_valid else 0

        truth_name = normalize_remedy((truth_obj.get("suggestedRemedy") or {}).get("name", ""))
        pred_name = normalize_remedy(((pred_obj or {}).get("suggestedRemedy") or {}).get("name", ""))
        match = (truth_name and pred_name and truth_name == pred_name)
        top1_match += 1 if match else 0

        truth_rubrics = {r.get("rubricName", "").strip().lower() for r in (truth_obj.get("mappedRubrics") or [])}
        pred_rubrics = {r.get("rubricName", "").strip().lower() for r in ((pred_obj or {}).get("mappedRubrics") or [])}
        truth_rubrics.discard("")
        pred_rubrics.discard("")
        j = jaccard(truth_rubrics, pred_rubrics)
        jaccards.append(j)

        rows.append({
            "idx": i,
            "valid_json": is_valid,
            "truth_remedy": truth_name,
            "pred_remedy": pred_name,
            "match": bool(match),
            "rubric_jaccard": round(j, 3),
        })
        console.print(f"  [{i+1}/{len(samples)}] json={is_valid}  truth={truth_name!r}  pred={pred_name!r}  match={match}  J={j:.2f}")

    n = max(len(samples), 1)
    metrics = {
        "valid_json_rate": round(valid_json / n, 4),
        "top1_remedy_match": round(top1_match / n, 4),
        "rubric_jaccard_mean": round(sum(jaccards) / n, 4),
        "samples_evaluated": len(samples),
    }

    # Compare against previous version.
    diff_block = {}
    if len(versions) >= 2 and target == versions[-1]:
        prev = versions[-2]
        prev_report = prev / "eval_report.json"
        if prev_report.exists():
            try:
                prev_metrics = json.loads(prev_report.read_text()).get("metrics", {})
                diff_block = {
                    "previous_version": prev.name,
                    "delta": {
                        k: round(metrics[k] - prev_metrics.get(k, 0), 4)
                        for k in ("valid_json_rate", "top1_remedy_match", "rubric_jaccard_mean")
                    },
                }
            except Exception:
                pass

    report = {
        "version": target.name,
        "metrics": metrics,
        "comparison": diff_block,
        "per_sample": rows,
    }
    (target / "eval_report.json").write_text(json.dumps(report, indent=2))

    # Pretty print
    console.rule("[bold green]Results[/bold green]")
    t = Table(title=target.name)
    t.add_column("Metric")
    t.add_column("Value", justify="right")
    if diff_block:
        t.add_column(f"Δ vs {diff_block['previous_version']}", justify="right")
    for k in ("valid_json_rate", "top1_remedy_match", "rubric_jaccard_mean"):
        row = [k, f"{metrics[k]:.4f}"]
        if diff_block:
            d = diff_block["delta"][k]
            sign = "+" if d >= 0 else ""
            row.append(f"{sign}{d:.4f}")
        t.add_row(*row)
    console.print(t)
    console.print(f"\n[green]report →[/green] {target / 'eval_report.json'}")


if __name__ == "__main__":
    main()
