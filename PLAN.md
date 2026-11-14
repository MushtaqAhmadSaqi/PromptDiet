# PromptDiet — Phased Implementation Plan

> **Version:** 0.1.0 · **Last Updated:** 2026-11-13
> **Execution Rule:** Complete each sub-phase, run its verification command, and get user approval before proceeding.

---

## Phase 0: Architecture & Scaffolding ✅

- [x] Define complete monorepo directory tree
- [x] Write `ARCHITECTURE.md` with data flow, API contracts, DB schemas, storage pattern
- [x] Write `PLAN.md` (this file) with granular checkboxes and verification commands
- [x] Get user approval before proceeding to Phase 1

---

## Phase 1: Core Deterministic Python Engine & Unit Tests ✅

### Sub-phase 1A: Log Deduplicator + JSON Crusher ✅

- [x] Create `backend/` package structure (`__init__.py`, `requirements.txt`, `config.py`)
- [x] Implement `backend/engine/__init__.py` (pipeline orchestrator function)
- [x] Implement `backend/engine/log_deduplicator.py`
  - [x] Regex normalization (strip timestamps, hex addresses, PIDs, UUIDs)
  - [x] Line-signature hashing with `hashlib.md5`
  - [x] Sliding-window sequential dedup → `[… repeated N times]` markers
  - [x] Error-line heuristic bypass (`FAIL`, `ERROR`, `Exception`, `Traceback`, non-zero exit)
  - [x] `collections.deque(maxlen=k)` context buffer preceding error lines
- [x] Implement `backend/engine/json_crusher.py`
  - [x] Whitespace minification via `json.dumps(separators=(',',':'))`
  - [x] Configurable boilerplate key stripping (`$schema`, `examples`, `x-*`, nested `description`)
  - [x] Array object schema deduplication with `__repeated` annotation
  - [x] Post-compression structural validation via `json.loads()`

---

### Sub-phase 1B: Cache Aligner + Tokenizer ✅

- [x] Implement `backend/engine/cache_aligner.py`
  - [x] Configurable prefix window (20% of prompt or 50 lines, whichever is smaller)
  - [x] Regex patterns: ISO timestamps, UUID v4, Unix epochs, random session IDs, `datetime.now()`
  - [x] Return list of `CacheViolation` dicts with `{line_number, column, matched_text, pattern_name, suggestion}`
- [x] Implement `backend/engine/tokenizer.py`
  - [x] `tiktoken` wrapper using `cl100k_base` encoding (GPT-4o compatible)
  - [x] Gemini token estimation (character-based heuristic: `len(text) / 4`)
  - [x] Cost estimation function (configurable price per 1M input tokens)

---

### Sub-phase 1C: Pytest Unit Test Suite ✅

- [x] Create `backend/tests/conftest.py` with shared fixtures:
  - [x] `sample_build_log` — 46 lines with repeated INFO lines + buried Exception & Traceback
  - [x] `sample_mcp_json` — MCP tool array with 3 repeated object schemas
  - [x] `sample_cache_prompt` — System prompt with volatile variables in prefix
  - [x] `sample_clean_prompt` — Deterministic clean prompt
- [x] Write `backend/tests/test_log_deduplicator.py` (7 tests, all passing)
- [x] Write `backend/tests/test_json_crusher.py` (4 tests, all passing)
- [x] Write `backend/tests/test_cache_aligner.py` (5 tests, all passing)
- [x] Write `backend/tests/test_tokenizer.py` (5 tests, all passing)

---

## Phase 2: FastAPI Backend, Gemini Rewriter & Hybrid Storage ✅

### Sub-phase 2A: FastAPI App + Pydantic Schemas ✅

- [x] Implement `backend/schemas.py` — all Pydantic v2 models from ARCHITECTURE.md §4
  - [x] `CompressRequest`, `CompressResponse`, `CompressionMetrics`, `CacheViolation`
  - [x] `RewriteRequest`, `RewriteResponse`
  - [x] `TemplateCreate`, `TemplateResponse`, `TemplateList`
  - [x] `FixtureResponse`
- [x] Implement `backend/main.py`
  - [x] FastAPI app with lifespan context manager
  - [x] CORS middleware with configurable origins
  - [x] `POST /api/compress` route — calls pipeline, returns `CompressResponse`
  - [x] `GET /api/fixtures` route — serves pre-loaded demo data
  - [x] Health check `GET /api/health`

---

### Sub-phase 2B: Hybrid Storage Adapter ✅

- [x] Implement `backend/db/repository.py` — `AbstractRepository` protocol class
  - [x] `save_template()`, `get_template()`, `list_templates()`, `delete_template()`
  - [x] `record_compression_run()`, `get_cumulative_savings()`
- [x] Implement `backend/db/sqlite_adapter.py`
  - [x] Auto-create `data/promptdiet.db` and run `CREATE TABLE IF NOT EXISTS`
  - [x] All CRUD methods using `sqlite3` standard library
- [x] Implement `backend/db/supabase_adapter.py`
  - [x] Uses PostgREST HTTPS client over port 443
  - [x] Same interface as SQLite adapter
- [x] Add template CRUD & stats routes to `main.py`:
  - [x] `POST /api/templates` — create template
  - [x] `GET /api/templates` — list all templates
  - [x] `GET /api/templates/{id}` — get single template
  - [x] `DELETE /api/templates/{id}` — delete template
  - [x] `GET /api/stats` — cumulative token and cost savings

---

### Sub-phase 2C: Gemini Declarative Rewriter ✅

- [x] Implement `backend/engine/prompt_rewriter.py`
  - [x] Initialize `google-genai` client with `GEMINI_API_KEY` env var
  - [x] System instruction: convert verbose prose → pipe-delimited constraints
  - [x] Graceful deterministic fallback when API key is missing or offline
- [x] Add `POST /api/rewrite` route to `main.py`
- [x] Write `backend/tests/test_prompt_rewriter.py` (3 tests, all passing)
- [x] Write `backend/tests/test_api.py` (8 integration tests, all passing)

---

## Phase 3: React Split-Pane Diff Workbench

### Sub-phase 3A: Vite + React + Tailwind Scaffold + Layout

- [ ] Initialize Vite project in `frontend/` with React template
- [ ] Install and configure Tailwind CSS + PostCSS
- [ ] Create `frontend/src/components/Layout.jsx` — app shell (header, footer, dark mode)
- [ ] Create `frontend/src/components/MetricScorecard.jsx` — single metric card
- [ ] Create `frontend/src/components/MetricsDashboard.jsx` — grid of 4 scorecards:
  - [ ] Tokens Saved (absolute number)
  - [ ] Reduction Percentage (%)
  - [ ] Processing Latency (ms)
  - [ ] Estimated Cost Saved (USD)
- [ ] Create `frontend/src/components/StageToggles.jsx` — pipeline stage checkboxes
- [ ] Create `frontend/src/utils/api.js` — fetch wrapper for backend API
- [ ] Create `frontend/src/utils/formatters.js` — number/byte/dollar formatting

**Verification:**
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173 — verify layout renders with placeholder scorecards
```

---

### Sub-phase 3B: Split-Pane Editor + Diff View + Debounce

- [ ] Create `frontend/src/hooks/useDebounce.js` — 300ms debounce hook
- [ ] Create `frontend/src/hooks/useCompression.js` — manages API state (loading, error, result)
- [ ] Create `frontend/src/components/SplitPaneEditor.jsx`
  - [ ] Left pane: textarea for raw input
  - [ ] Right pane: read-only display of compressed output
  - [ ] Wired to `useDebounce` → `useCompression` → backend API
- [ ] Create `frontend/src/components/DiffView.jsx` — color-coded inline diff
  - [ ] Red highlights for removed lines/tokens
  - [ ] Green highlights for compressed replacements
- [ ] Create `frontend/src/components/CacheWarnings.jsx`
  - [ ] Renders list of KV-cache violations with line numbers and suggestions
  - [ ] Yellow/amber warning styling

**Verification:**
```bash
# Start backend: cd backend && uvicorn main:app --port 8000
# Start frontend: cd frontend && npm run dev
# In browser: paste a sample build log in left pane
# Verify: compressed output appears in right pane after 300ms, diff highlights render, metrics update
```

---

### Sub-phase 3C: Template Manager + Gemini Rewrite Button

- [ ] Create `frontend/src/hooks/useLocalStorage.js` — read/write/sync to localStorage
- [ ] Create `frontend/src/components/TemplateManager.jsx`
  - [ ] Save current input as named template
  - [ ] Load saved templates into editor
  - [ ] Export all templates as JSON file
  - [ ] Import templates from JSON file
  - [ ] Sync with backend API when available, fallback to localStorage only
- [ ] Add "Rewrite Prose with Gemini" action button to the UI
  - [ ] Calls `POST /api/rewrite` on current editor content
  - [ ] Shows loading spinner during API call
  - [ ] Displays rewritten result in right pane with separate metrics
  - [ ] Shows warning badge if Gemini was unavailable (fallback mode)
- [ ] Wire up `App.jsx` to compose all components with proper state flow

**Verification:**
```bash
# With both frontend and backend running:
# 1. Type in editor → verify real-time compression
# 2. Save a template → verify it appears in template list
# 3. Reload page → verify template persists (localStorage)
# 4. Click "Rewrite with Gemini" on a verbose prompt → verify rewritten output
# 5. Export templates → verify JSON file downloads
```

---

## Phase 4: Demo Fixtures & Zero-Cost Deployment

### Sub-phase 4A: Demo Fixtures + Demo Switcher UI

- [ ] Create `backend/fixtures/build_log_400_lines.txt`
  - [ ] Realistic npm/webpack build output with 380+ repeated INFO lines
  - [ ] Buried `Error: Module not found` + full stack trace at line ~350
  - [ ] Non-zero exit code at final line
- [ ] Create `backend/fixtures/mcp_schema_50_tools.json`
  - [ ] Array of 50 MCP tool definitions with repeated parameter schemas
  - [ ] Realistic tool names (file_read, web_search, code_edit, etc.)
- [ ] Create `backend/fixtures/system_prompt_800_words.txt`
  - [ ] Verbose conversational system prompt (~800 words)
  - [ ] Contains compressible narrative patterns and volatile timestamps
- [ ] Create `frontend/src/components/DemoSwitcher.jsx`
  - [ ] Dropdown or button group: "Build Log", "MCP Schema", "System Prompt"
  - [ ] One-click loads fixture into editor and auto-triggers compression
  - [ ] Shows expected vs actual compression ratio for each fixture

**Verification:**
```bash
# In browser: click each demo fixture button
# Verify: fixture loads, compression runs automatically, metrics display correct values
# Verify build log: ~400 lines → ~4-10 lines, error stack trace preserved
# Verify JSON schema: significant byte reduction, output is valid JSON
# Verify system prompt: token count visibly decreases
```

---

### Sub-phase 4B: Dockerfile, Vercel Config & README

- [ ] Create `backend/Dockerfile`
  - [ ] Base: `python:3.12-slim`
  - [ ] Non-root user (UID 1000) for HF Spaces compliance
  - [ ] Install dependencies from `requirements.txt`
  - [ ] Expose port 7860
  - [ ] `CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]`
- [ ] Create `frontend/vercel.json`
  - [ ] SPA rewrites for client-side routing
  - [ ] API proxy rewrites: `/api/*` → HF Spaces backend URL
- [ ] Create `.env.example` (root) with all environment variables documented
- [ ] Create `frontend/.env.example` with `VITE_API_URL` placeholder
- [ ] Update `README.md` with:
  - [ ] Project overview and motivation
  - [ ] Architecture diagram (embed from ARCHITECTURE.md)
  - [ ] Local development quick start (backend + frontend)
  - [ ] One-click demo fixtures description
  - [ ] Deployment instructions (Vercel + HF Spaces)
  - [ ] Environment variable reference table
  - [ ] API endpoint reference
  - [ ] Tech stack badges
  - [ ] License (MIT)
- [ ] Create `.gitignore` with Python, Node, and IDE patterns

**Verification:**
```bash
# Test Dockerfile locally:
cd backend
docker build -t promptdiet-backend .
docker run -p 7860:7860 promptdiet-backend
curl http://localhost:7860/api/health

# Test frontend build:
cd frontend
npm run build
# Verify: dist/ folder created with static assets

# Final integration test:
# 1. Backend running on port 7860
# 2. Frontend dev server pointing to backend
# 3. All demo fixtures work end-to-end
# 4. Template save/load works
# 5. Gemini rewrite works (if API key set)
```

---

## Summary Metrics (Targets)

| Metric | Target |
|---|---|
| Build log compression | 400 lines → 4–10 lines (95%+ reduction) |
| JSON schema minification | 50–70% byte reduction |
| System prompt rewrite | 50–65% token reduction |
| Deterministic pipeline latency | < 5ms for 10KB input |
| Test coverage | 100% pass rate on all pytest tests |
| Deployment cost | \$0/month (Vercel Hobby + HF Spaces Free + Supabase Free) |

