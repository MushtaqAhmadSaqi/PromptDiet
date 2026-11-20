# PromptDiet Backend

The backend is a FastAPI service that runs PromptDiet's compression pipeline:

- build-log deduplication
- JSON and MCP schema minification
- prompt rewriting with an optional Gemini API key
- KV-cache prefix auditing
- template persistence and compression statistics

## Requirements

- Python 3.12+

## Local setup

From this directory:

```bash
python -m pip install -r requirements.txt
python -m pytest tests/ -v
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```

The API is available at `http://localhost:7860`. Interactive API documentation is
available at `http://localhost:7860/docs`.

## Configuration

Settings are loaded from environment variables or a `.env` file. Useful options
include:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ENVIRONMENT` | Runtime environment | `local` |
| `PORT` | Service port | `7860` |
| `SQLITE_PATH` | SQLite database path | `data/promptdiet.db` |
| `GEMINI_API_KEY` | Enables Gemini prompt rewriting | unset |
| `SUPABASE_URL` | Optional Supabase REST endpoint | unset |
| `SUPABASE_KEY` | Optional Supabase key | unset |

Without `GEMINI_API_KEY`, prompt rewriting uses the deterministic offline
fallback. Without Supabase settings, the local SQLite repository is used.

## API endpoints

- `GET /api/health` - health and environment status
- `POST /api/compress` - run the compression pipeline
- `POST /api/rewrite` - rewrite a narrative prompt
- `GET /api/fixtures` - load demo fixtures
- `GET /api/stats` - retrieve cumulative savings
- `GET/POST/DELETE /api/templates` - manage saved templates

## Docker

Build and run the included image:

```bash
docker build -t promptdiet-backend .
docker run --rm -p 7860:7860 promptdiet-backend
```

The root [project README](../readme.md) contains the complete local development
and deployment overview.
