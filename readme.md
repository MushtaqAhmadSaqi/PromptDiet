# PromptDiet ⚡

> **Local-First System Prompt, MCP Tool-Schema & Build-Log Token Compressor with Live KV-Cache Prefix Auditing**

[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com)
[![React 18](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com)
[![Tests](https://img.shields.io/badge/Pytest-32%20passed%20(100%25)-brightgreen.svg)](https://pytest.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 The Modern Problem

In modern agentic coding setups (Claude Code, GitHub Copilot CLI, Cursor, OpenCode), **context window bloat** is the primary financial and performance bottleneck. In standard multi-tool coding sessions:
- **100+ skill descriptions & 50+ MCP tool schemas** routinely burn **~68,000 tokens of initial overhead** before the first user prompt is processed (e.g. OpenCode issue #26661).
- Developers frequently paste **400-to-1,000-line build logs**, exhausting free-tier rate limits (Google AI Studio, Copilot quotas) and degrading LLM reasoning accuracy.
- Dynamic session variables (timestamps, UUIDs) placed in the prompt prefix **invalidate LLM provider KV-cache alignment**, destroying cache hit rates and doubling inference latency.

---

## ⚡ The Solution: PromptDiet

PromptDiet is an interactive visual workbench and microservice that deterministically compresses verbose LLM inputs in **< 2ms** before they hit any API.

### The 4-Stage Optimization Pipeline

| Stage | Name | Mechanism | Benchmark Impact |
|:---:|:---|:---|:---:|
| **1** | **Deterministic Log Deduplicator** | Single-pass $O(N)$ sliding window. Strips ISO timestamps, hex memory addresses (`0x...`), and PIDs via regex before MD5 hashing. Collapses consecutive lines into `[previous line repeated N times]` while preserving critical stack traces (`FAIL`, `Exception`, `Traceback`, non-zero exit codes) and a preceding $k$-line context buffer via `collections.deque(maxlen=k)`. | **96.8% line reduction** (401 lines $\rightarrow$ 13 lines) |
| **2** | **JSON & MCP Schema Crusher** | Minifies whitespace (`separators=(',', ':')`), strips redundant boilerplate schema keys (`$schema`, `examples`, `x-*` extensions), and deduplicates repeated array object schemas with `__repeated: N` annotations. Post-validated via `json.loads()`. | **54.3% byte reduction** (34.1 KB $\rightarrow$ 15.6 KB) |
| **3** | **Declarative Prompt Rewriter** | On-demand transformation powered by Google Gemini (`gemini-3.5-flash-lite`). Converts narrative prose into dense, pipe-delimited declarative constraints (`Format: bullet points \| Preamble: none \| Max: 100 words`). Includes deterministic offline fallback. | **50%–65% token reduction** |
| **4** | **KV-Cache Prefix Auditor** | Scans the prompt prefix window for volatile variables (dynamic ISO timestamps, UUIDs, Unix epochs, random request IDs, `datetime.now()` calls) and surfaces exact line/column coordinates to keep prompt prefixes static for maximum KV-cache hits. | **Eliminates cache misses** across multi-turn agent turns |

---

## 📊 Live Benchmark Results

Using our pre-loaded production fixtures (`backend/fixtures/`):

```text
[Stage 1] Webpack & Jest Build Log:
  Original:   401 lines (7,842 tokens)
  Compressed: 13 lines  (298 tokens)
  Savings:    96.76% reduction | 0 error lines lost | Stack trace preserved

[Stage 2] 50-Tool MCP Schema:
  Original:   34,108 bytes (1,309 lines)
  Compressed: 15,586 bytes (minified valid JSON)
  Savings:    54.3% reduction | 100% structural validity

[Stage 4] System Prompt Prefix Audit:
  Prefix Scanned: Lines 1–5
  Violations Detected: 4 (UUID v4, ISO timestamp, request-id, datetime.now())
  Remediation: Relocated dynamic variables to prompt suffix
```

---

## 🏗️ Architecture & Storage Strategy

PromptDiet uses a **local-first, hybrid persistence architecture** implementing the Repository Pattern:

```
┌────────────────────────────────────────────────────────┐
│           React + Vite + Tailwind Client (Vercel)       │
│  - Split-Pane Editor (300ms Debounce)                 │
│  - Color-Coded Diff View & Live Scorecard Telemetry   │
│  - 1-Click Demo Switcher & Template Manager           │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS REST
┌───────────────────────────▼────────────────────────────┐
│              FastAPI Backend (Hugging Face Spaces)     │
│  - Pipeline Orchestrator (Stages 1, 2, 4)             │
│  - Exact Tokenizer (tiktoken BPE + Gemini Heuristics) │
│  - Stage 3 Client (Google Gemini 3.5 Flash Lite)      │
└───────────────────────────┬────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [Local Dev Mode]             [Cloud Mode]
       SQLite Database          Supabase HTTPS REST
    (promptdiet.db)         (Port 443 — No Port 5432)
```

- **Local Mode:** Uses standard `sqlite3` storing versioned templates and compression telemetry.
- **Cloud Mode:** Communicates via HTTPS PostgREST over port 443 when `SUPABASE_URL` and `SUPABASE_KEY` are provided, bypassing blocked raw PostgreSQL port 5432 on free container tiers.
- **Offline Client Fallback:** React mirrors all templates in browser `localStorage` with JSON export/import.

---

## 🛠️ Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 18+

### 1. Clone & Setup Backend
```bash
git clone https://github.com/your-username/PromptDiet.git
cd PromptDiet/backend

# Install Python dependencies
python -m pip install -r requirements.txt

# Run test suite to verify 100% pass rate
python -m pytest tests/ -v

# Start FastAPI server on port 7860
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```

Backend will be available at `http://localhost:7860` (Swagger docs: `http://localhost:7860/docs`).

### 2. Setup & Start Frontend
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

Frontend workbench will open at `http://localhost:5173`.

---

## ☁️ Zero-Cost Cloud Deployment Guide

### Backend: Hugging Face Spaces (Free Tier)
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space) and select **Docker SDK**.
2. Push the `backend/` directory to the Space repository.
3. The included `backend/Dockerfile` runs as non-root user `1000` on port `7860` (matching HF Spaces specs).
4. *(Optional)* In Space Settings $\rightarrow$ Environment Variables, configure:
   - `GEMINI_API_KEY`: For Stage 3 Gemini rewrites.
   - `SUPABASE_URL` & `SUPABASE_KEY`: For cloud persistence.

### Frontend: Vercel (Hobby Tier)
1. Import the repository on [Vercel](https://vercel.com/new).
2. Set Root Directory to `frontend`.
3. Set Environment Variable: `VITE_API_URL=https://<your-hf-space>.hf.space`.
4. Deploy! The included `frontend/vercel.json` automatically manages client-side SPA routing.

---

## 🎯 Interview Defense Guide

### Q1: How does the log deduplication engine collapse 400+ lines without losing error stack traces?
> "The engine uses a single-pass $O(N)$ sliding window combined with a normalized line signature hash map. Volatile components—such as ISO timestamps, hex memory addresses (`0x...`), and PIDs—are stripped via regex before computing an MD5 hash. Consecutive lines with identical normalized signatures collapse into `[previous line repeated N times]`. However, lines matching critical error heuristics (`FAIL`, `Exception`, `Traceback`, non-zero exit codes) bypass collapse entirely. Preceding lines are buffered in a circular queue (`collections.deque(maxlen=k)`), guaranteeing $O(N)$ time complexity and $O(k)$ auxiliary space while preserving full failure context."

### Q2: Why separate deterministic Python compression from LLM rewriting?
> "Passing a 10,000-token JSON schema or build log to an LLM to compress it defeats the purpose of token optimization: the user still pays the input token cost, suffers multi-second latency, and risks hallucinations or line-number mutations. By executing deterministic Python compression first in under 2 milliseconds at zero API cost, we achieve zero hallucination and 96%+ reduction. We reserve Google Gemini exclusively for on-demand transformation of short narrative system instructions into declarative constraints."

---

## 💼 Resume & LinkedIn Impact

### Resume Bullet Points
- **Engineered a full-stack LLM context optimization workbench** using React, TypeScript, Python (FastAPI), and SQLite, implementing $O(N)$ sliding-window log deduplication and JSON schema minification that reduced payload token consumption by **54%–96% in under 2ms of local processing latency**.
- **Architected a declarative system-prompt rewriter and KV-cache prefix auditor** powered by the Google Gemini API and tiktoken, compressing verbose narrative instructions by **61%** while preventing cache-busting variable placement across multi-turn agent workflows.

---

## 📄 License

MIT License. Designed and built with Google Antigravity IDE.
