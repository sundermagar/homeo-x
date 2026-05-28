# AI Operations Dashboard — Complete Specification
**Homeopathic Clinic Management Platform · Admin Panel**
*Version 1.0 · June 2025 · Engineering Team*

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [The Credit System — How It Works](#2-the-credit-system--how-it-works)
3. [Model Registry — Free vs Paid Models](#3-model-registry--free-vs-paid-models)
4. [Dashboard — Every Metric Explained](#4-dashboard--every-metric-explained)
5. [Burn Rate & Forecast Card](#5-burn-rate--forecast-card)
6. [Add Credits — Complete Flow](#6-add-credits--complete-flow)
7. [Wallet & Transaction Ledger](#7-wallet--transaction-ledger)
8. [Routing Engine — Feature to Model Mapping](#8-routing-engine--feature-to-model-mapping)
9. [Alerts & Notifications](#9-alerts--notifications)
10. [Request Logs & Audit Trail](#10-request-logs--audit-trail)
11. [Known Bugs to Fix](#11-known-bugs-to-fix)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Purpose & Scope

This document is the single source of truth for the AI Operations Dashboard — the central control room for all AI activity within the Homeopathic Clinic Management Platform. Every engineer, designer, and product owner should be able to implement any part of this dashboard by following this document alone, without needing to ask questions.

The dashboard covers six core areas:

- **Credit Ledger** — how the wallet works, how ₹ converts to credits, and how to top up
- **Model Registry** — free vs. paid models, configuration, and per-model pricing
- **Credit Consumption** — which feature (Consultation, STT, Summarization, etc.) is using how many credits
- **Routing Engine** — which model handles which feature, with fallbacks
- **Request Logs & Audit Trail** — every AI call with full attribution
- **Forecasting & Alerts** — burn rate, depletion estimates, and threshold notifications

> **Core rule:** Every number on this dashboard that relates to AI cost must be expressed in **CREDITS** — except the Wallet section, which shows amounts in **₹ (rupees)** because it is the deposit/financial layer.

---

## 2. The Credit System — How It Works

### 2.1 What is a Credit?

A credit is the internal unit of AI consumption used throughout the platform. Credits act as a buffer between real-world rupee costs (which vary by model, token count, and provider) and the simplified number users see on screen. All dashboards, alerts, and breakdowns show credits — never raw rupees (except the wallet deposit screen).

### 2.2 Credit-to-Rupee Conversion

The conversion rate is fixed and configured in system settings. The default rate is:

| Parameter | Value | Notes |
|-----------|-------|-------|
| Conversion rate | 1,000 credits = ₹1 | Default. Configurable in system config. |
| Minimum deposit | ₹100 | Equals 100,000 credits |
| Credit precision | Whole numbers only | Credits are always rounded **up** on deduction |
| Display format | Comma-formatted integers | e.g. `19,200` not `19200` |

> **Example:** A consultation call uses GPT-4o and consumes 1,842 tokens (1,200 input + 642 output). At GPT-4o pricing (₹0.008/1k input, ₹0.024/1k output), the cost is ₹0.01251. At 1,000 credits/₹1 this equals 12.51 credits → rounded up to **13 credits** deducted.

### 2.3 How Credits Are Deducted

Every AI call goes through this pipeline automatically. The feature making the call does not handle billing logic.

| Step | What happens | Where it runs |
|------|-------------|---------------|
| 1. Call received | Platform feature sends a request to the AI Service | Feature service |
| 2. Routing lookup | Routing engine checks which model handles this feature (from Redis cache, TTL 60s) | AI Service / Redis |
| 3. Budget check | Check if daily feature budget and tenant monthly limit are within range | AI Service |
| 4. Wallet check | Check wallet balance ≥ overdraft buffer (default: 100 credits) | Wallet Service |
| 5. API call | Call the provider using encrypted API key from vault | AI Service |
| 6. Token counting | Count input + output tokens returned by provider | AI Service |
| 7. Cost calculation | Apply per-token pricing → ₹ cost → multiply by credits_per_rupee → round up | AI Service |
| 8. Deduction | Atomic `DECRBY` on Redis wallet balance, async sync to PostgreSQL | Wallet Service |
| 9. Logging | Write full request log (feature, model, user, tokens, credits, latency) | Logger Service |
| 10. Return | Return AI output to the calling feature | AI Service |

> **If step 4 fails** (insufficient credits), the AI call is blocked. Return `INSUFFICIENT_CREDITS` to the feature. The feature must handle this gracefully — show a user-friendly message, not a raw error.

### 2.4 Billing Cycles

Each clinic (tenant) has a monthly billing cycle:

- **Cycle start date** — typically 1st of the month, configurable per clinic
- **Total credits** — credit balance loaded for this cycle (e.g. 10,000 credits = ₹10)
- **Consumed** — running total since cycle start; resets on cycle reset date
- **Remaining** — Total minus Consumed; updated in real time
- **Cycle reset** — on reset date, Consumed resets to 0; wallet balance carries forward unless explicitly cleared

> Cycle reset does **NOT** automatically top up the wallet. Admins must manually add credits each cycle.

---

## 3. Model Registry — Free vs Paid Models

### 3.1 Model Types

| Type | Description | Credit Deduction | Examples |
|------|-------------|-----------------|---------|
| **Paid (API-based)** | External provider models billed per token or per minute. Credits deducted on every call based on actual usage. | Yes — per call | GPT-4o, Claude Sonnet, Gemini 1.5 Pro |
| **Free (API-based)** | Provider free-tier models. No credits deducted, but calls are still **logged**. | No — logged only | Gemini 1.5 Flash (free tier), Llama 3 via Groq free |
| **Self-hosted** | Models on our own infrastructure. Cost is flat operational overhead. Credit rate set manually by admin. | Optional — flat rate | Llama 4 Scout, Mistral 7B on own GPU |

> **Even free models must be logged.** Free usage can become paid once quotas are exceeded. Logging provides the safety net to detect when a "free" model starts costing money.

### 3.2 Paid Model Pricing — All 4 Formulas

| Pricing type | Formula | Applicable models |
|-------------|---------|------------------|
| **Token-based** | `(input_tokens × input_rate_per_1k / 1000 + output_tokens × output_rate_per_1k / 1000) × credits_per_rupee` → round up | GPT-4o, GPT-4o Mini, Claude Sonnet, Claude Haiku, Gemini 1.5 Pro |
| **Per-minute (audio)** | `(audio_duration_seconds / 60) × cost_per_minute × credits_per_rupee` → round up | Whisper v3 (STT) |
| **Per-request (flat)** | `1 × cost_per_request × credits_per_rupee` → round up | Classification or embedding models |
| **Custom / manual** | Admin sets a fixed credit amount per call | Llama 4 Scout (self-hosted) |

### 3.3 Current Models in the Platform

| Model | Provider | Type | Pricing basis | Input rate | Output rate | Features used in |
|-------|----------|------|--------------|-----------|------------|-----------------|
| GPT-4o | OpenAI | Paid | Token-based | ₹0.008/1k | ₹0.024/1k | Consultation, Analysis |
| GPT-4o Mini | OpenAI | Paid | Token-based | ₹0.002/1k | ₹0.006/1k | Follow-ups, Email, SMS |
| Claude Sonnet 4 | Anthropic | Paid | Token-based | ₹0.006/1k | ₹0.018/1k | Summarization, Prescription |
| Claude Haiku 4.5 | Anthropic | Paid | Token-based | ₹0.001/1k | ₹0.003/1k | WhatsApp messages |
| Gemini 1.5 Pro | Google | Paid | Token-based | ₹0.005/1k | ₹0.015/1k | Fallback (Consultation) |
| Whisper v3 | OpenAI | Paid | Per-minute | ₹0.30/min | — | STT (Transcription) |
| Llama 4 Scout | Self-hosted | Self-hosted | Custom flat | 5 credits/call | — | Consultation (fallback) |
| Gemini 1.5 Flash | Google | Free tier | Free (logged) | Free | Free | Testing / Dev only |

> These rates are stored in `ai_model_pricing` and are the source of truth for all credit calculations. If a provider changes their pricing, update this table. Historical calculations retain the rate that was active at the time of the call.

### 3.4 What Each Model Card Shows in Admin UI

Every model card in the Model Directory must display all of these:

- Model name and provider label
- Status badge — `Active` (green) / `Inactive` (gray) / `Free` (blue)
- Pricing type and rates — e.g. `"₹0.008 / 1k input tokens"`
- Credits per call estimate — avg credits/call from last 7 days
- Monthly request count — total API calls this calendar month
- Monthly credits consumed — credits used by this model this month (not ₹)
- Error rate — % of failed calls in last 7 days
- Average latency — p50 and p95 in milliseconds
- Features using this model — e.g. `Consultation, Summarization`

---

## 4. Dashboard — Every Metric Explained

### 4.1 The Four Top Metric Cards

---

#### Card 1 — Total Credits

| Property | Detail |
|----------|--------|
| Primary value | Total credits loaded into the wallet for the current billing cycle (e.g. `10,000`) |
| Secondary label | `"Current billing cycle"` — confirms this is the cycle cap, not a lifetime total |
| Color indicator | Green dot — always static, this card just shows the cap |
| Data source | `wallet_accounts.total_credits_this_cycle` |
| Updates when | Admin adds credits to the wallet |
| What it is NOT | This is NOT the remaining balance — that is Card 3 |

---

#### Card 2 — Consumed

| Property | Detail |
|----------|--------|
| Primary value | Total credits consumed since billing cycle start (e.g. `55`) |
| Secondary label | `"X% of total used"` — percentage of the cycle cap consumed so far |
| Color indicator | Amber dot — indicates active consumption |
| Data source | `SUM(credits_deducted) FROM ai_request_logs WHERE created_at >= cycle_start` |
| Updates when | Every AI call — near real-time (max 30s delay from Redis sync) |
| Alert threshold | Turns red when consumed ≥ 80% of total credits |
| Secondary calculation | `% = (consumed / total_credits) × 100`, formatted to 1 decimal |

---

#### Card 3 — Remaining

| Property | Detail |
|----------|--------|
| Primary value | Credits still available. Formula: `Total Credits − Consumed` (e.g. `9,945`) |
| Secondary label | `"~X days at current burn"` — forecast from burn rate calculation |
| Color indicator | Blue → amber when < 20% remaining → red when < 10% remaining |
| Data source | `wallet_accounts.balance_credits` (live Redis value) |
| Updates when | Every AI call (decrements atomically via Redis `DECRBY`) |
| Days remaining formula | `FLOOR(remaining_credits / avg_daily_burn_credits)`. Avg burn = 7-day rolling average. |
| Edge case | If `avg_daily_burn = 0` (no usage yet) → show `"∞"` not a division error |

---

#### Card 4 — Daily Burn

| Property | Detail |
|----------|--------|
| Primary value | Average credits/day over last 7 days (e.g. `2`) |
| Secondary label | `"↑/↓ X% vs last week"` — week-over-week change |
| Color indicator | Amber dot |
| Data source | `SUM(credits_deducted) FROM ai_request_logs WHERE created_at >= NOW()-7d GROUP BY DATE` → average |
| Updates when | Recomputed every hour by background cron, cached in Redis |
| Arrow logic | ↓ green if burn decreased. ↑ red if burn increased > 20% |
| Display precision | Round to nearest whole number. If burn < 1/day, show as decimal (e.g. `0.3`) |

---

### 4.2 Credit Consumption Over Time Chart

The main chart on the dashboard. Shows credit consumption over time broken down by module (feature).

| Property | Detail |
|----------|--------|
| Chart type | **Stacked bar chart** — daily bars, each bar stacked by module color |
| X-axis | Dates — one bar per day |
| Y-axis | Credits consumed (integers, no ₹) |
| Date range toggle | `7 days` / `14 days` / `30 days` buttons top-right of card |
| Tooltip on hover | Date + each module's credit count + total for that day |
| Legend | Custom HTML legend — each module color + name + total for selected period |
| Data source | `SUM(credits_deducted) FROM ai_request_logs GROUP BY DATE(created_at), feature` |
| Refresh interval | Every 5 minutes (Redis cached, not live DB query) |
| Empty state | If no data → flat zero-line with `"No AI usage in this period"` |

### 4.3 Module Breakdown — Horizontal Bars

Each row contains:

- Colored dot (matching chart color for that module)
- Module name
- Proportional fill bar — width relative to highest-consuming module (which is always 100%)
- Raw credit count — right-aligned (e.g. `"19,200"`)
- Percentage of total — right-aligned (e.g. `"31%"`)

#### Feature Color Constants

> Create a single `aiModuleColors.ts` constants file and import it everywhere — charts, bars, badges, and logs must all use these exact values.

| Module / Feature | What it does | Color hex | Typical range/month |
|-----------------|-------------|----------|-------------------|
| Consultation | AI-assisted doctor-patient consultation. Longest prompts, highest token usage. | `#1D9E75` (teal) | 15,000–50,000 credits |
| STT (Speech-to-Text) | Real-time transcription of consultation audio via Whisper. Billed per minute. | `#378ADD` (blue) | 8,000–20,000 credits |
| Summarization | Summarizing consultation notes into structured patient records. | `#D85A30` (coral) | 5,000–15,000 credits |
| Prescription | AI-generated prescription suggestions based on consultation. | `#7F77DD` (purple) | 3,000–10,000 credits |
| WhatsApp | Automated WhatsApp messages — appointment reminders, follow-ups. | `#639922` (lime) | 2,000–8,000 credits |
| Email | AI-drafted patient emails — test results, care instructions. | `#D4537E` (pink) | 1,500–6,000 credits |
| SMS | Short AI-generated SMS alerts. Lowest token usage per call. | `#888780` (gray) | 500–3,000 credits |

### 4.4 Quick Navigation Cards

Four shortcut cards that deep-link to sub-sections. Each shows a live count.

| Card | Count shown | Link | Warning state |
|------|------------|------|---------------|
| Model Directory | `X Active Models` | `/admin/ai/models` | Amber if any model error rate > 5%. Red if 0 active models. |
| Routing Rules | `X Chains Configured` | `/admin/ai/routing` | Amber if any feature has no fallback. Red if any feature has no primary model. |
| Security Vault | `X Active Keys` | `/admin/ai/keys` | **RED if 0 active keys** — AI calls will fail. Amber if any key expires within 14 days. |
| Audit Logs | `X Anomalies Today` | `/admin/ai/logs` | Amber if anomalies > 0. Red if anomalies > 10 in one day. |

> **Security Vault at 0 Active Keys is a critical error.** Every AI call will fail with an authentication error. This card must show a red border and explanatory message — not a neutral gray state.

### 4.5 Recent Activity Feed

Live list of the last 10 AI requests. "View all" links to the full Logs page.

Each row shows:

| Field | Description | Format |
|-------|-------------|--------|
| Module icon | Colored icon for the feature | Tabler icon, 16px, module color |
| Feature name | Which feature triggered this call | e.g. `"Consultation"`, `"STT"` |
| Status check | Success or failed indicator | `✓` green / `✗` red |
| Doctor / User | Which staff member triggered this | e.g. `"Dr. Sharma"` |
| Model used | Which AI model processed this | e.g. `"llama-4-scout-17b"` (truncated) |
| Token count | Input + output tokens | e.g. `"⬡ 1,854"` |
| Credits deducted | Credits taken from wallet | `"−11"` in red |
| Time ago | Relative timestamp | e.g. `"3h ago"`, `"just now"` |

**Footer:** `"Showing last 10 transactions"` left — `"Total: −X credits"` right in red.

The total in the footer must match the **Consumed** metric card exactly for the same time window.

---

## 5. Burn Rate & Forecast Card

### 5.1 Purpose

Answers one question for the admin: *"How long will my credits last?"* Located bottom-right of the dashboard. Every number is a live computation.

### 5.2 Every Row — Definition, Formula, Edge Cases

| Row label | What it shows | Formula | Edge cases |
|-----------|--------------|---------|-----------|
| Credits used this cycle | Progress bar + fraction `"55 / 10,000"` | `consumed / total_credits`. Bar width = `(consumed/total) × 100%` | If total = 0 → show `"No credits loaded"` warning |
| Avg daily burn | Average credits/day | `SUM(credits, last 7 days) / 7` → 1 decimal | If no usage in 7 days → `"0 credits/day"` not null |
| Credits will last | Estimated days until empty | `FLOOR(remaining / avg_daily_burn)` → `"~X days"` | If avg_daily_burn = 0 → `"∞"`. If remaining = 0 → `"Wallet empty"` |
| Cycle resets | Next billing cycle reset date | `cycle_start_day + 1 month`, formatted `"Jan 7, 2026"` | **Bug in current code:** shows wrong year. Fix: use actual `cycle_start` date from DB |
| Projected shortfall | Will credits run out before cycle end? | `projected = avg_daily_burn × days_until_cycle_end`. If projected > remaining → `shortfall = projected − remaining` | If no shortfall → show `"On track"` not `"−0 credits"`. Shortfall shown in red. |

> The "Credits will last" calculation must use the **7-day rolling average** for stability. Using only today's usage causes wild swings (e.g. a quiet day sends the estimate to infinity). The 7-day window smooths out weekday/weekend variation.

### 5.3 Top Up Wallet Button

Opens the same Add Credits modal as `"+ Add Credits"` in the page header. Do not create two separate implementations.

Button hint text: `"Top up wallet · Current balance: 9,945 credits (₹9.94)"`

---

## 6. Add Credits — Complete Flow

### 6.1 Trigger Points

- `"+ Add Credits"` button in the page header (top right)
- `"Top up wallet"` button in the Burn Rate card
- `"Add credits now"` CTA in the low-balance alert banner (when remaining < 20%)

All three open the same modal. Do not navigate to a separate page.

### 6.2 The Modal — All Fields

| Field | Type | Description | Validation |
|-------|------|-------------|-----------|
| Amount (₹) | Number input + quick-select | Quick buttons: ₹5,000 / ₹10,000 / ₹25,000 / ₹50,000 / Custom | Min: ₹100. Max: ₹5,00,000. Integer only. |
| Credits preview | Auto-computed (read-only) | Shows credits this deposit gives: `amount × 1000` | Updates instantly on amount change |
| New balance preview | Auto-computed (read-only) | `current_balance + new_credits` | Updates instantly |
| Payment reference | Text input (optional) | Invoice number or bank transfer ref. Stored in transaction record. | Max 200 chars |
| Notes | Textarea (optional) | Free-text admin note attached to this deposit | Max 500 chars |

### 6.3 Confirm Button — Dynamic Text

The button must update to reflect selected amount:

- `"Confirm — add 5,000 credits"` → when ₹5,000 selected
- `"Confirm — add 10,000 credits"` → when ₹10,000 selected (default pre-selected)
- `"Confirm — add 25,000 credits"` → when ₹25,000 selected

### 6.4 What Happens on Confirm

1. Validate: `amount > 0`, `amount >= 100`, `amount <= 500000`
2. `POST /api/admin/ai/wallet/deposit { amount_inr, reference, notes }`
3. Backend: `INSERT into wallet_transactions (type=DEPOSIT, amount_inr, credits=amount×1000)`
4. Backend: `UPDATE wallet_accounts SET balance_credits += credits, balance_inr += amount_inr`
5. Redis: `INCRBY wallet:balance {credits}` — atomic, immediate
6. Close modal → refresh all 4 metric cards and Burn Rate card
7. Show success banner: `"₹X deposited — Y credits added. New balance: Z credits."`
8. Entry appears at top of Recent Activity feed and Transaction Ledger

> **This is a financial operation.** The DB `INSERT` and `UPDATE` must be inside a single PostgreSQL transaction. If either fails, both must roll back. Never show a success banner unless the backend confirms both steps completed.

---

## 7. Wallet & Transaction Ledger

### 7.1 Wallet Overview Section

The Wallet page is the only section where ₹ is shown alongside credits.

| Element | What it shows |
|---------|--------------|
| Balance (large) | Current balance in ₹ (large) with credits in smaller text below |
| Visual fill bar | Green bar showing % of last top-up still remaining |
| Peak balance | Highest balance ever recorded (shown for context) |
| Days remaining | Same calculation as Card 3 — links to Burn Rate card |
| Spent this month | Credits consumed × (1/credits_per_rupee) = ₹ equivalent + raw credit count |
| Total deposited | Lifetime sum of all deposits in ₹ + deposit count |

### 7.2 Transaction Ledger — All Columns

| Column | Format | Description |
|--------|--------|-------------|
| Date & Time | `"25 Jun 2025, 10:42:18"` | Full timestamp. Sortable. Default: newest first. |
| Type | Badge | `"+ Deposit"` green / `"− Deduction"` red / `"± Adjustment"` amber |
| Description | Text | Deductions: `"Feature · Model"`. Deposits: `"Manual top-up · Ref #XXXX"`. |
| Credits | Mono font | `+10,000` for deposits, `−184` for deductions. Always show sign. |
| Amount ₹ | Mono font | Only on Wallet page. `credits ÷ 1000`. |
| Running balance | Mono font | Balance in credits after this transaction. Must match audit trail. |

### 7.3 Filters

- Date range picker — from/to
- Type filter — All / Deposits only / Deductions only
- Feature filter — deductions from a specific feature
- Model filter — deductions from a specific model
- Credit range — min/max credits per transaction

**Export:** `"Export CSV"` button — columns: Date, Type, Description, Credits, Amount_INR, Running_Balance. No prompt/response content in exports.

---

## 8. Routing Engine — Feature to Model Mapping

### 8.1 What Routing Means

The Routing Engine decides which AI model processes each feature's requests. Without routing rules, the platform has no way to know that Consultation should use GPT-4o while Transcription should use Whisper. Routing also handles failures and budget overruns.

### 8.2 Routing Rule Fields

| Field | Type | Required | Description |
|-------|------|---------|-------------|
| `feature` | Enum | Yes | One of: `Consultation, STT, Summarization, Prescription, WhatsApp, Email, SMS, Analysis` |
| `primary_model_id` | FK → ai_models | Yes | Model that handles this feature by default |
| `fallback_model_id` | FK → ai_models | Recommended | Used when primary fails or exceeds budget. `NULL` = no fallback (feature fails hard) |
| `daily_budget_credits` | Integer | Optional | Max credits this feature can consume per day |
| `monthly_budget_credits` | Integer | Optional | Max credits per month (useful for SMS/WhatsApp blast spikes) |
| `is_enabled` | Boolean | Yes | Master on/off for AI on this feature |
| `max_tokens_per_call` | Integer | Optional | Hard cap on tokens per request — prevents runaway prompts |

### 8.3 Complete Routing Decision Tree

For every AI request, the routing engine executes this in order:

| Step | Check | If YES | If NO |
|------|-------|--------|-------|
| 1 | Is routing rule `is_enabled = true`? | Continue | Return `AI_DISABLED`. Feature renders without AI. |
| 2 | Is primary model `status = ACTIVE`? | Continue to step 3 | Go to step 5 (try fallback) |
| 3 | Is `daily_budget_credits` set AND today's feature spend < daily budget? | Continue | Go to step 5 (try fallback) |
| 4 | Is wallet balance > overdraft_buffer (default 100 credits)? | Call primary model API | Return `INSUFFICIENT_CREDITS`. Alert admin. |
| 4a | Did the API call succeed? | Deduct credits, log, return result | Go to step 5 (try fallback) |
| 5 | Is `fallback_model_id` set AND fallback is ACTIVE? | Call fallback model API | Return `ALL_MODELS_FAILED`. Alert admin. |
| 5a | Did fallback API call succeed? | Deduct credits, log with `is_fallback=true`, return result | Return `ALL_MODELS_FAILED`. Log failure. Alert admin. |

> Every fallback event (step 5+) must be logged with `is_fallback = true` and must count as an anomaly in the Audit Logs card. Frequent fallback events signal a problem with the primary model.

### 8.4 Default Routing Configuration

| Feature | Primary model | Fallback model | Daily budget | Max tokens/call |
|---------|--------------|---------------|-------------|----------------|
| Consultation | GPT-4o | Claude Sonnet 4 | 5,000 credits | 4,000 |
| STT | Whisper v3 | Gemini 1.5 Pro | 2,000 credits | (audio, N/A) |
| Summarization | Claude Sonnet 4 | GPT-4o | 2,000 credits | 2,000 |
| Prescription | Claude Sonnet 4 | GPT-4o Mini | 1,500 credits | 1,500 |
| WhatsApp | Claude Haiku 4.5 | GPT-4o Mini | 1,000 credits | 500 |
| Email | GPT-4o Mini | Claude Haiku 4.5 | 1,000 credits | 800 |
| SMS | GPT-4o Mini | Claude Haiku 4.5 | 500 credits | 200 |

---

## 9. Alerts & Notifications

### 9.1 All Alert Types

| Alert type | Trigger condition | Default threshold | Channels | Severity |
|-----------|-----------------|-----------------|---------|---------|
| Wallet low | Remaining credits < X | 20% of total | Email + In-app | Warning |
| Wallet critical | Remaining credits < X | 10% of total | Email + SMS + In-app | Critical |
| Wallet empty | Remaining credits = 0 | N/A | Email + SMS + In-app | Critical |
| Daily burn spike | Today's burn > 7-day avg × 1.5 | Auto-computed | In-app | Warning |
| Feature over daily budget | Feature daily spend ≥ daily_budget_credits | Per routing rule | In-app + Email | Warning |
| Fallback triggered | Any request uses fallback model | N/A | In-app | Info |
| All models failed | Both primary and fallback fail | N/A | Email + SMS + In-app | Critical |
| API key expiring | Key expires within N days | 14 days | Email + In-app | Warning |
| API key expired | Key status = EXPIRED | N/A | Email + SMS + In-app | Critical |
| Tenant near monthly limit | Tenant monthly spend ≥ 80% of limit | 80% | Email + In-app | Warning |
| Model error rate high | Model errors > 5% in last 1 hour | 5% | In-app + Email | Warning |
| Depletion imminent | Days remaining < 7 | 7 days | Email + SMS | Warning |

### 9.2 Alert Feed on Dashboard

Shows the 5 most recent alerts. Each row:

- Severity icon — warning triangle (amber), info circle (blue), check (green), X (red)
- Alert message — concise one-line description
- Timestamp — relative (e.g. `"3 minutes ago"`)
- Clicking the row marks it read and dims it
- `"View all"` link navigates to the full Alert History page

---

## 10. Request Logs & Audit Trail

### 10.1 Every Field Stored per Log Entry

| Field | Data type | Description |
|-------|-----------|-------------|
| `id` | UUID | Unique identifier |
| `created_at` | Timestamptz | Exact datetime with milliseconds |
| `feature` | Varchar | `Consultation / STT / Summarization / Prescription / WhatsApp / Email / SMS` |
| `model_id` | UUID FK | Which AI model processed this request |
| `model_name` | Varchar (denormalized) | Model display name at time of call (cached in case model is later renamed) |
| `is_fallback` | Boolean | True if fallback model was used |
| `tenant_id` | UUID | Which clinic triggered this call |
| `user_id` | UUID | Which doctor or staff member triggered this call |
| `user_name` | Varchar (denormalized) | Display name at time of call |
| `session_id` | UUID | Groups all AI calls within a single consultation session |
| `request_prompt` | Text | Full system + user prompt. Shown truncated in UI. SUPER_ADMIN only. |
| `response_text` | Text | Full model response. Shown truncated in UI. SUPER_ADMIN only. |
| `input_tokens` | Integer | Tokens in the prompt (from provider response) |
| `output_tokens` | Integer | Tokens in the response (from provider response) |
| `audio_seconds` | Decimal | Duration in seconds for STT/Whisper calls |
| `credits_deducted` | Integer | Exact credits taken from wallet |
| `cost_inr` | Decimal(12,6) | Exact ₹ cost at time of call (archived for financial records) |
| `latency_ms` | Integer | End-to-end response time in milliseconds |
| `status` | Enum | `SUCCESS / FAILED / FALLBACK_USED` |
| `error_code` | Varchar | Provider error code if status = FAILED (e.g. `"rate_limit_exceeded"`) |
| `error_message` | Text | Human-readable error from provider |

### 10.2 Log Table UI — Visible Columns

| Column | Format | Notes |
|--------|--------|-------|
| Timestamp | `"25 Jun, 10:42:18"` | Sortable. Default: newest first. |
| Feature | Colored badge | Uses module color constants from Section 4.3 |
| Model | Plain text | Truncated to 20 chars |
| Doctor / User | Plain text | Links to user profile |
| Prompt (truncated) | Monospace, 50 chars + `"..."` | Full text in side panel. SUPER_ADMIN only. |
| Tokens | Integer, mono | Input + output combined. `"—"` for audio calls. |
| Credits | Integer, mono | Credits deducted, shown in red |
| Status | Colored badge | `SUCCESS` (green), `FAILED` (red), `FALLBACK_USED` (amber) |

### 10.3 Role-Based Privacy Controls

Request logs contain patient medical data. Access is strictly controlled:

| Role | Can see metadata (feature, model, credits) | Can see prompt/response text | Can export full content |
|------|------------------------------------------|----------------------------|------------------------|
| SUPER_ADMIN | Yes | Yes — full text in side panel | Yes — with confirmation step |
| CLINIC_ADMIN | Yes — own clinic only | No — shows `"Restricted"` | No |
| DOCTOR | Own requests only | No | No |

---

## 11. Known Bugs to Fix

Based on the current dashboard screenshot — all must be fixed before go-live:

| # | Bug | Where | Root cause | Priority |
|---|-----|-------|-----------|---------|
| 1 | Cycle reset date shows `"Jan 7, 2040"` instead of next month | Burn Rate card — Cycle resets row | Likely adding months as days or wrong epoch calculation | **Critical** |
| 2 | Security Vault shows `"0 Active Keys"` with no warning state | Quick Navigation card | No API keys stored AND no warning UI implemented | **Critical** |
| 3 | Recent Activity feed shows only `"Consultation"` entries | Recent Activity feed | Either only Consultation has been used OR the query is filtering incorrectly | Medium |
| 4 | `"Credits will last: ~4972 days"` looks suspicious | Burn Rate card | Math is correct (2 credits/day burn) but UX needs a note explaining the low-usage phase | Low |

---

## 12. Implementation Checklist

Use this as a ticket-by-ticket checklist. Every item must be done before the module is considered complete.

### Backend

- [ ] Fix cycle reset date calculation bug (Section 11, Bug #1)
- [ ] Implement atomic Redis `DECRBY` for credit deduction with PostgreSQL async sync
- [ ] Create `ai_request_logs` table with monthly partitioning
- [ ] Create `routing_rules` table and seed all 7 features with default config from Section 8.4
- [ ] Implement routing engine decision tree (all 7 steps from Section 8.3)
- [ ] Implement credit deduction formula for all 4 pricing types (Section 3.2)
- [ ] Encrypt API keys with AES-256-GCM — never store plaintext
- [ ] Implement all 12 alert types from Section 9.1 with configurable thresholds
- [ ] Dashboard aggregation cron — every 5 minutes, cached in Redis
- [ ] Burn rate calculation cron — every 1 hour, cached in Redis
- [ ] Key expiry checker cron — daily at 9 AM
- [ ] Role-based access control — CLINIC_ADMIN cannot see prompt/response text
- [ ] Wallet deposit endpoint — atomic DB transaction (INSERT + UPDATE in one txn)

### Frontend

- [ ] Implement 4 metric cards with correct data sources and edge cases (Section 4.1)
- [ ] Implement stacked bar chart with 7-color module breakdown (Section 4.2)
- [ ] Create `aiModuleColors.ts` constants file and import everywhere
- [ ] Implement module breakdown horizontal bar list with hex colors from Section 4.3
- [ ] Implement Quick Navigation cards with live counts and warning states (Section 4.4)
- [ ] Implement Recent Activity feed with all 8 fields from Section 4.5
- [ ] Implement Burn Rate card with all 5 rows and correct formulas (Section 5.2)
- [ ] Implement Add Credits modal with dynamic confirm button text (Section 6)
- [ ] Show success banner after deposit with new balance
- [ ] Security Vault card — red/warning state when 0 active keys (Section 4.4)
- [ ] Log table with 8 columns, filters, and row click → side panel (Section 10.2)
- [ ] Privacy guard — hide prompt/response for CLINIC_ADMIN (Section 10.3)

---

*AI Operations Dashboard Specification · Version 1.0 · June 2025*
*Homeopathic Clinic Management Platform · Engineering Team*
*Full database schema and API endpoint reference available in the Engineering wiki.*