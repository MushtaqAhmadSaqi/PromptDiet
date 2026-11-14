from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from schemas import (
    CompressRequest,
    CompressResponse,
    CompressionMetrics,
    CacheViolation,
    FixtureResponse,
    TemplateCreate,
    TemplateResponse,
    TemplateList,
    RewriteRequest,
    RewriteResponse,
)
from engine import execute_compression_pipeline
from engine.prompt_rewriter import rewrite_prompt
from engine.tokenizer import compute_token_metrics
from db.repository import get_repository

repo = get_repository()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for startup and shutdown hooks."""
    # Future DB migrations or connection pool initialization
    yield


app = FastAPI(
    title="PromptDiet API",
    description="Local-First System Prompt, MCP Tool-Schema & Build-Log Token Compressor",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "local" else settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Service health and environment status."""
    return {
        "status": "healthy",
        "service": "PromptDiet",
        "version": "0.1.0",
        "environment": settings.environment,
    }


@app.post("/api/compress", response_model=CompressResponse)
async def compress_payload(request: CompressRequest):
    """Execute the deterministic compression pipeline against the provided content."""
    try:
        res = execute_compression_pipeline(
            content=request.content,
            content_type=request.content_type,
            enable_log_dedup=request.stages.log_dedup,
            enable_json_crush=request.stages.json_crush,
            enable_cache_audit=request.stages.cache_audit,
            log_context_lines=settings.log_context_lines,
            cache_prefix_ratio=settings.cache_prefix_ratio,
        )

        metrics = CompressionMetrics(
            original_chars=len(request.content),
            compressed_chars=len(res.compressed),
            original_tokens=res.metrics.original_tokens,
            compressed_tokens=res.metrics.compressed_tokens,
            tokens_saved=res.metrics.tokens_saved,
            token_reduction_pct=res.metrics.reduction_pct,
            estimated_cost_saved_usd=res.metrics.cost_saved_usd,
            processing_time_ms=res.processing_time_ms,
            gemini_token_estimate=res.metrics.gemini_estimate,
        )

        violations = [
            CacheViolation(
                line_number=v.line_number,
                column=v.column,
                matched_text=v.matched_text,
                pattern_name=v.pattern_name,
                suggestion=v.suggestion,
            )
            for v in res.cache_violations
        ]

        # Record telemetry in persistence layer
        try:
            repo.record_compression_run(
                content_type=request.content_type,
                original_tokens=res.metrics.original_tokens,
                compressed_tokens=res.metrics.compressed_tokens,
                token_reduction_pct=res.metrics.reduction_pct,
                estimated_cost_saved=res.metrics.cost_saved_usd,
                processing_time_ms=res.processing_time_ms,
                stages_applied=res.stages_applied,
                cache_violations_count=len(violations),
            )
        except Exception:
            # Telemetry failure should never abort the user compression response
            pass

        return CompressResponse(
            original=res.original,
            compressed=res.compressed,
            metrics=metrics,
            cache_violations=violations,
            stages_applied=res.stages_applied,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(exc)}") from exc


# ── Template Library Endpoints ─────────────────────────────────

@app.post("/api/templates", response_model=TemplateResponse, status_code=201)
async def create_template(payload: TemplateCreate):
    """Save a new prompt or log template to the persistence store."""
    try:
        record = repo.save_template(
            name=payload.name,
            content=payload.content,
            content_type=payload.content_type,
            tags=payload.tags,
        )
        return TemplateResponse(**record)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save template: {str(exc)}") from exc


@app.get("/api/templates", response_model=TemplateList)
async def list_templates():
    """List all saved templates sorted by last update."""
    try:
        items = repo.list_templates()
        return TemplateList(
            templates=[TemplateResponse(**item) for item in items],
            total=len(items),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(exc)}") from exc


@app.get("/api/templates/{template_id}", response_model=TemplateResponse)
async def get_template_by_id(template_id: str):
    """Retrieve a single template by ID."""
    record = repo.get_template(template_id)
    if not record:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(**record)


@app.delete("/api/templates/{template_id}")
async def delete_template_by_id(template_id: str):
    """Delete a template by ID."""
    deleted = repo.delete_template(template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"deleted": True, "id": template_id}


@app.get("/api/stats")
async def get_cumulative_stats():
    """Cumulative token and cost savings telemetry."""
    try:
        return repo.get_cumulative_savings()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(exc)}") from exc


# ── Stage 3: Declarative Prompt Rewriter (Gemini) ──────────────

@app.post("/api/rewrite", response_model=RewriteResponse)
async def rewrite_system_prompt(request: RewriteRequest):
    """Rewrite a verbose narrative system prompt into dense declarative constraints."""
    try:
        res = rewrite_prompt(
            content=request.content,
            api_key=settings.gemini_api_key,
            max_output_tokens=request.max_output_tokens,
            style=request.style,
        )

        metrics_raw = compute_token_metrics(res.original, res.rewritten)
        metrics = CompressionMetrics(
            original_chars=len(res.original),
            compressed_chars=len(res.rewritten),
            original_tokens=metrics_raw.original_tokens,
            compressed_tokens=metrics_raw.compressed_tokens,
            tokens_saved=metrics_raw.tokens_saved,
            token_reduction_pct=metrics_raw.reduction_pct,
            estimated_cost_saved_usd=metrics_raw.cost_saved_usd,
            processing_time_ms=0.0,
            gemini_token_estimate=metrics_raw.gemini_estimate,
        )

        return RewriteResponse(
            original=res.original,
            rewritten=res.rewritten,
            metrics=metrics,
            gemini_model_used=res.model_used,
            was_fallback=res.was_fallback,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prompt rewrite failed: {str(exc)}") from exc


@app.get("/api/fixtures", response_model=list[FixtureResponse])
async def list_demo_fixtures():
    """Retrieve pre-loaded demo fixtures for one-click testing in the workbench."""
    return [
        FixtureResponse(
            id="build-log",
            name="Webpack & Jest Build Log (400 Lines)",
            description="Compacts 400+ lines of repetitive compilation logs into 4 lines while isolating buried stack traces.",
            content="""2026-11-14 10:00:01 INFO [webpack] compiling client bundle chunk [0x7f01]...
2026-11-14 10:00:02 INFO [webpack] compiling client bundle chunk [0x7f02]...
2026-11-14 10:00:03 INFO [webpack] compiling client bundle chunk [0x7f03]...
2026-11-14 10:00:04 INFO [webpack] compiling client bundle chunk [0x7f04]...
2026-11-14 10:00:05 INFO [webpack] compiling client bundle chunk [0x7f05]...
2026-11-14 10:00:06 INFO [webpack] compiling client bundle chunk [0x7f06]...
2026-11-14 10:00:07 INFO [webpack] compiling client bundle chunk [0x7f07]...
2026-11-14 10:00:08 INFO [webpack] compiling client bundle chunk [0x7f08]...
2026-11-14 10:00:09 INFO [webpack] compiling client bundle chunk [0x7f09]...
2026-11-14 10:00:10 INFO [webpack] compiling client bundle chunk [0x7f10]...
2026-11-14 10:00:11 INFO [webpack] compiling client bundle chunk [0x7f11]...
2026-11-14 10:00:12 INFO [webpack] compiling client bundle chunk [0x7f12]...
2026-11-14 10:00:13 INFO [webpack] compiling client bundle chunk [0x7f13]...
2026-11-14 10:00:14 INFO Loading Postgres DB migrations...
2026-11-14 10:00:15 INFO Establishing connection pool to db.internal:5432...
2026-11-14 10:00:16 ERROR Traceback (most recent call last):
2026-11-14 10:00:17 ERROR   File "db/connection.py", line 42, in get_pool
2026-11-14 10:00:18 Exception: ConnectionRefusedError: Host unreachable: db.internal:5432
2026-11-14 10:00:19 npm ERR! command failed with exit code 1""",
            content_type="log",
        ),
        FixtureResponse(
            id="mcp-schema",
            name="MCP Tool Schema (Redundant Arrays)",
            description="Minifies whitespace, removes schema boilerplate keys ($schema, examples), and collapses duplicate array objects.",
            content="""{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "x-mcp-version": "2026.1",
  "tools": [
    {
      "name": "search_codebase",
      "description": "Search code repository using semantic embeddings",
      "examples": ["search_codebase(query='auth router')"],
      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
    },
    {
      "name": "search_codebase",
      "description": "Search code repository using semantic embeddings",
      "examples": ["search_codebase(query='auth router')"],
      "parameters": {"type": "object", "properties": {"query": {"type": "string"}}}
    }
  ]
}""",
            content_type="json",
        ),
        FixtureResponse(
            id="cache-busting-prompt",
            name="System Prompt with Cache-Busting Prefix",
            description="Audits prompt prefix for volatile variables (UUID, dynamic timestamp) that destroy LLM KV-cache reuse.",
            content="""System Prompt: Senior Full-Stack Engineering Assistant
Generated: 2026-11-14T23:41:00Z
Session ID: 9f8e7d6c-5b4a-3210-fedc-ba9876543210
User Time: datetime.now()

Instructions:
You are an expert coding assistant. When answering questions, always write clean, production-grade code with TypeScript types. Keep explanations concise and focused on architecture and performance.""",
            content_type="prompt",
        ),
    ]

