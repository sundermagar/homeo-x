# ML Training Pipeline — Local Qwen Fine-Tuning

Manual, on-demand fine-tuning of `Qwen2.5-1.5B-Instruct` on accumulated clinical consultations from `public.ml_training_logs`. RAG-augmented (pgvector embeddings) for in-context learning.

**Hardware target:** 16GB RAM, CPU-only (no NVIDIA GPU required). Cloud GPU optional via `TRAIN_DEVICE=cuda`.

---

## One-time setup

1. **Python 3.11+ (3.14 works).** PyTorch 2.11+ ships cp314 wheels.
2. **Create a virtualenv and install deps:**
   ```powershell
   python -m venv ml-pipeline\.venv
   ml-pipeline\.venv\Scripts\Activate.ps1
   pip install -r ml-pipeline\requirements.txt
   ```
3. **Install Ollama:** download from https://ollama.com/download. After install, pull the base once:
   ```powershell
   ollama pull qwen2.5:1.5b
   ```
4. **Clone llama.cpp** anywhere (only needed for the `deploy` step):
   ```powershell
   git clone https://github.com/ggerganov/llama.cpp C:\dev\llama.cpp
   ```
   Then either pass `--llama-cpp C:\dev\llama.cpp` on deploy, or set:
   ```powershell
   setx LLAMA_CPP_DIR "C:\dev\llama.cpp"
   ```

---

## Run training (any time)

From the repo root:

```powershell
# Full pipeline — export, train, evaluate. No auto-deploy.
pnpm train:qwen

# Or step-by-step:
pnpm train:export          # builds train.jsonl / val.jsonl from latest DB rows
pnpm train:tune            # fine-tunes a new versioned adapter
pnpm train:eval            # measures quality vs the previous version

# Review eval_report.json, then if happy:
pnpm train:deploy          # merges adapter, converts to GGUF, registers in Ollama
```

**First run**: use `pnpm train:export -- --full` to rebuild from all available data. Subsequent runs are incremental (uses `state/last_run.json` as a bookmark).

---

## Switching production to your trained model

After deploy, you'll have `ollama run qwen-homeo:latest` working locally. To switch the live API to it:

1. Confirm Ollama is running and the model is loaded: `ollama list`
2. Edit [.env](../.env) (or wherever you keep secrets) and set:
   ```
   PRIMARY_AI_PROVIDER=ollama
   OLLAMA_MODEL=qwen-homeo:latest
   ```
3. In [apps/api/src/infrastructure/ai/ai-provider-chain.ts](../apps/api/src/infrastructure/ai/ai-provider-chain.ts), reorder so Ollama comes first and Groq/Gemini/Anthropic are the fallbacks. (Already-supported pattern — fallback chain already exists.)
4. Restart the API.

You can always flip back by reverting the env var — no migration, no risk.

---

## Folder layout

```
ml-pipeline/
├── README.md
├── requirements.txt
├── fine-tune-qwen.py            # Phase 2 — LoRA fine-tune
├── eval.py                      # Phase 3 — measure quality
├── deploy-to-ollama.py          # Phase 4 — merge + GGUF + ollama create
├── prompts/
│   └── system.txt               # canonical system prompt (single source of truth)
├── state/                       # gitignored
│   └── last_run.json            # incremental-export bookmark
└── output/                      # gitignored
    ├── train.jsonl              # latest exported training set
    ├── val.jsonl                # 10% stratified holdout
    ├── dataset_card.json        # row counts + remedy distribution
    └── qwen-homeo-v{N}/         # one folder per training run
        ├── adapter/             # LoRA weights (~30MB)
        ├── training_log.json
        ├── eval_report.json
        ├── merged_hf/           # base + adapter merged (only after deploy)
        ├── qwen-homeo-v{N}.q4_k_m.gguf
        └── Modelfile
```

The exporter itself lives in [apps/api/src/scripts/export-training-data.ts](../apps/api/src/scripts/export-training-data.ts) because it needs the workspace's `@mmc/database` client.

---

## How RAG fits into training

Each training example is a 3-message ChatML conversation:
1. **system** — the fixed homeopathy reasoning prompt from `prompts/system.txt`
2. **user** — the current patient (symptoms, modalities, mode) **plus 2 most-similar past cases** retrieved via pgvector cosine kNN
3. **assistant** — the doctor's actual final remedy + rubrics (ground truth)

The model learns to *use* retrieved similar cases when reasoning — same pattern that inference will follow once deployed.

---

## What to expect on a 16GB / Intel Iris Xe PC

| Dataset size | Approx training time | RAM peak |
|---|---|---|
| 100 cases × 3 epochs | 2-4 hours | ~8GB |
| 500 cases × 3 epochs | 10-15 hours | ~9GB |
| 2000 cases × 3 epochs | 40-60 hours | ~10GB |

LoRA keeps memory low; the bottleneck is CPU throughput. Run overnight or over a weekend. PC stays usable but warm. Background jobs are fine; avoid running other heavy AI processes simultaneously.

Want it faster? Rent a CUDA spot instance (RunPod, Lambda, vast.ai) for ~$0.50–$1.50/hr — 2000 cases finishes in ~30 minutes. Set `TRAIN_DEVICE=cuda` and run the same scripts there.

---

## Eval gate

`pnpm train:deploy` refuses to publish a model that regressed >5% on any of: valid-JSON rate, top-1 remedy match, rubric Jaccard. Pass `--force` to override.

---

## Optional: weekly schedule via Windows Task Scheduler

If you want automation later, register a task that runs `pnpm train:qwen` weekly. Example (Sunday 2 AM):

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument "-NoProfile -Command `"cd C:\Users\garim\Documents\GitHub\homeo-x; pnpm train:qwen *>> ml-pipeline\output\cron.log`""
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2am
Register-ScheduledTask -TaskName "homeo-qwen-train" -Action $action -Trigger $trigger
```

The deploy step is left manual on purpose — you review `eval_report.json` before publishing.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `train.jsonl missing` | run `pnpm train:export` first |
| `eligible rows: 0` | no rows have all of `doctor_final_remedy`, `extracted_symptoms`, `mapped_rubrics`, `soap_notes`. Doctors must approve consultations. |
| OOM during training | reduce `--max-seq-length` to 1024, or `--lora-r 4`, or close other apps |
| `convert_hf_to_gguf.py not found` | clone llama.cpp and pass `--llama-cpp` |
| eval regressed | inspect `output/qwen-homeo-v{N}/eval_report.json` — often means too little new data; skip deploy this week |
