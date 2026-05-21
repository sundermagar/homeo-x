"""
Merge the latest LoRA adapter into the base model, convert to GGUF, and
register as an Ollama model named `qwen-homeo:v{N}` (and `:latest`).

Prerequisites:
    - ollama installed and running locally (https://ollama.com/download)
    - llama.cpp cloned somewhere; pass its path with --llama-cpp or set
      LLAMA_CPP_DIR env var. We need its convert_hf_to_gguf.py script.
    - The base model (Qwen/Qwen2.5-1.5B-Instruct) downloaded — happens
      automatically on first fine-tune run.

Usage:
    python ml-pipeline/deploy-to-ollama.py
    python ml-pipeline/deploy-to-ollama.py --version v3
    python ml-pipeline/deploy-to-ollama.py --llama-cpp C:/dev/llama.cpp
    python ml-pipeline/deploy-to-ollama.py --force   # skip eval-gate check
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

import torch
from peft import PeftModel
from rich.console import Console
from transformers import AutoModelForCausalLM, AutoTokenizer

console = Console()

ROOT = Path(__file__).resolve().parent
OUTPUT_ROOT = ROOT / "output"
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"


def list_versions() -> list[Path]:
    return sorted([p for p in OUTPUT_ROOT.glob("qwen-homeo-v*") if p.is_dir()],
                  key=lambda p: int(re.search(r"v(\d+)$", p.name).group(1)))


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--version", help="version dir name (default = latest)")
    p.add_argument("--llama-cpp", default=os.environ.get("LLAMA_CPP_DIR", ""),
                   help="path to llama.cpp checkout (for convert_hf_to_gguf.py)")
    p.add_argument("--quant", default="q4_k_m",
                   help="GGUF quantization (q4_k_m balances quality/size)")
    p.add_argument("--force", action="store_true",
                   help="deploy even if eval metrics regressed")
    p.add_argument("--ollama-tag", default="qwen-homeo",
                   help="Ollama model name prefix")
    return p.parse_args()


def check_ollama():
    if shutil.which("ollama") is None:
        console.print("[red]ollama CLI not on PATH. Install from https://ollama.com/download[/red]")
        sys.exit(1)


def check_llama_cpp(path: str) -> Path:
    if not path:
        console.print("[red]--llama-cpp not set and LLAMA_CPP_DIR env var empty.[/red]")
        console.print("Clone it once:  [bold]git clone https://github.com/ggerganov/llama.cpp[/bold]")
        sys.exit(1)
    p = Path(path)
    converter = p / "convert_hf_to_gguf.py"
    if not converter.exists():
        # Older versions used 'convert-hf-to-gguf.py'
        alt = p / "convert-hf-to-gguf.py"
        if alt.exists():
            return alt
        console.print(f"[red]convert_hf_to_gguf.py not found in {p}[/red]")
        sys.exit(1)
    return converter


def gate_eval(version_dir: Path, force: bool):
    report = version_dir / "eval_report.json"
    if not report.exists():
        console.print(f"[yellow]no eval_report.json in {version_dir.name} — run pnpm train:eval first.[/yellow]")
        if not force:
            console.print("[red]aborting (use --force to skip gate)[/red]")
            sys.exit(1)
        return
    data = json.loads(report.read_text())
    delta = data.get("comparison", {}).get("delta", {})
    if delta and any(v < -0.05 for v in delta.values()):
        console.print(f"[red]eval regressed vs previous version: {delta}[/red]")
        if not force:
            console.print("[red]aborting (use --force to deploy anyway)[/red]")
            sys.exit(1)
    metrics = data.get("metrics", {})
    console.print(f"[cyan]eval metrics:[/cyan] {metrics}")


def merge_adapter(version_dir: Path) -> Path:
    adapter_dir = version_dir / "adapter"
    merged_dir = version_dir / "merged_hf"
    if merged_dir.exists():
        console.print(f"[cyan]merged model already exists at {merged_dir}, reusing[/cyan]")
        return merged_dir

    console.print(f"[cyan]loading base + adapter to merge…[/cyan]")
    tokenizer = AutoTokenizer.from_pretrained(str(adapter_dir), trust_remote_code=True)
    base = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="cpu",
        trust_remote_code=True,
        low_cpu_mem_usage=True,
    )
    peft_model = PeftModel.from_pretrained(base, str(adapter_dir))
    merged = peft_model.merge_and_unload()
    merged_dir.mkdir(parents=True, exist_ok=True)
    merged.save_pretrained(str(merged_dir), safe_serialization=True)
    tokenizer.save_pretrained(str(merged_dir))
    console.print(f"[green]merged HF model →[/green] {merged_dir}")
    return merged_dir


def convert_to_gguf(merged_dir: Path, converter: Path, quant: str, version_dir: Path) -> Path:
    out_gguf = version_dir / f"{version_dir.name}.{quant}.gguf"
    if out_gguf.exists():
        console.print(f"[cyan]gguf already exists at {out_gguf}, reusing[/cyan]")
        return out_gguf

    console.print(f"[cyan]converting → GGUF (quant={quant})…[/cyan]")
    cmd = [
        sys.executable, str(converter),
        str(merged_dir),
        "--outfile", str(out_gguf),
        "--outtype", quant.split("_")[0] if quant.startswith("q") else "f16",
    ]
    console.print(f"[dim]$ {' '.join(cmd)}[/dim]")
    rc = subprocess.call(cmd)
    if rc != 0 or not out_gguf.exists():
        console.print("[red]conversion failed[/red]")
        sys.exit(rc or 1)
    console.print(f"[green]gguf →[/green] {out_gguf}")
    return out_gguf


def make_modelfile(version_dir: Path, gguf_path: Path, system_prompt: str) -> Path:
    mf = version_dir / "Modelfile"
    body = (
        f'FROM {gguf_path.resolve().as_posix()}\n'
        'PARAMETER temperature 0.3\n'
        'PARAMETER top_p 0.8\n'
        'PARAMETER num_ctx 4096\n'
        'PARAMETER repeat_penalty 1.1\n'
        f'SYSTEM """{system_prompt.strip()}"""\n'
    )
    mf.write_text(body, encoding="utf-8")
    return mf


def ollama_create(model_tag: str, version_tag: str, modelfile: Path):
    for tag in (f"{model_tag}:{version_tag}", f"{model_tag}:latest"):
        console.print(f"[cyan]ollama create {tag}[/cyan]")
        rc = subprocess.call(["ollama", "create", tag, "-f", str(modelfile)])
        if rc != 0:
            console.print(f"[red]ollama create failed for {tag}[/red]")
            sys.exit(rc)


def main():
    args = parse_args()
    check_ollama()
    converter = check_llama_cpp(args.llama_cpp)

    versions = list_versions()
    if not versions:
        console.print("[red]no trained versions found[/red]")
        sys.exit(1)
    target = OUTPUT_ROOT / args.version if args.version else versions[-1]
    if not target.exists():
        console.print(f"[red]{target} not found[/red]")
        sys.exit(1)
    version_tag = target.name.replace("qwen-homeo-", "")  # "v1", "v2", …

    console.rule(f"[bold green]Deploying {target.name} → ollama[/bold green]")
    gate_eval(target, args.force)

    merged = merge_adapter(target)
    gguf = convert_to_gguf(merged, converter, args.quant, target)

    system_prompt = (ROOT / "prompts" / "system.txt").read_text(encoding="utf-8")
    modelfile = make_modelfile(target, gguf, system_prompt)
    console.print(f"[green]Modelfile →[/green] {modelfile}")

    ollama_create(args.ollama_tag, version_tag, modelfile)

    console.rule("[bold green]✓ done[/bold green]")
    console.print(f"Test:  [bold]ollama run {args.ollama_tag}:{version_tag}[/bold]")
    console.print(f"Then flip your provider in [bold].env[/bold] / [bold]ai-provider-chain.ts[/bold] when you're ready.")


if __name__ == "__main__":
    main()
