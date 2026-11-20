from contextlib import asynccontextmanager
import time
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
    yield


app = FastAPI(
    title="PromptDiet API",
    description="Local-First System Prompt, MCP Tool-Schema & Build-Log Token Compressor",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS Middleware (spec-compliant: never pair wildcard origins with allow_credentials=True)
_cors_origins = settings.cors_origins if settings.cors_origins else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_use_wildcard = settings.environment == "local" and "*" in _cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _use_wildcard else _cors_origins,
    allow_credentials=not _use_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    """Service health and environment status."""
    return {
        "status": "healthy",
        "service": "PromptDiet",
        "version": "0.2.0",
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
        start_time = time.perf_counter()
        res = rewrite_prompt(
            content=request.content,
            api_key=settings.gemini_api_key,
            max_output_tokens=request.max_output_tokens,
            style=request.style,
        )
        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

        metrics_raw = compute_token_metrics(res.original, res.rewritten)
        metrics = CompressionMetrics(
            original_chars=len(res.original),
            compressed_chars=len(res.rewritten),
            original_tokens=metrics_raw.original_tokens,
            compressed_tokens=metrics_raw.compressed_tokens,
            tokens_saved=metrics_raw.tokens_saved,
            token_reduction_pct=metrics_raw.reduction_pct,
            estimated_cost_saved_usd=metrics_raw.cost_saved_usd,
            processing_time_ms=latency_ms,
            gemini_token_estimate=metrics_raw.gemini_estimate,
        )

        try:
            repo.record_compression_run(
                content_type="prompt",
                original_tokens=metrics_raw.original_tokens,
                compressed_tokens=metrics_raw.compressed_tokens,
                token_reduction_pct=metrics_raw.reduction_pct,
                estimated_cost_saved=metrics_raw.cost_saved_usd,
                processing_time_ms=latency_ms,
                stages_applied=[f"gemini_rewriter ({res.model_used})"],
                cache_violations_count=0,
            )
        except Exception:
            pass

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
    import os
    base_dir = os.path.dirname(os.path.abspath(__file__))
    fixtures_dir = os.path.join(base_dir, "fixtures")

    log_file = os.path.join(fixtures_dir, "build_log_400_lines.txt")
    json_file = os.path.join(fixtures_dir, "mcp_schema_50_tools.json")
    prompt_file = os.path.join(fixtures_dir, "system_prompt_800_words.txt")

    log_content = ""
    json_content = ""
    prompt_content = ""

    if os.path.exists(log_file):
        with open(log_file, "r", encoding="utf-8") as f:
            log_content = f.read()
    if os.path.exists(json_file):
        with open(json_file, "r", encoding="utf-8") as f:
            json_content = f.read()
    if os.path.exists(prompt_file):
        with open(prompt_file, "r", encoding="utf-8") as f:
            prompt_content = f.read()

    return [
        FixtureResponse(
            id="build-log",
            name="Webpack & Jest Build Log (400 Lines)",
            description="Compacts 400+ lines of repetitive compilation logs into ~13 lines (96%+ reduction) while isolating buried stack traces.",
            content=log_content or "INFO compiling...\nINFO compiling...\nERROR Build failed!",
            content_type="log",
        ),
        FixtureResponse(
            id="mcp-schema",
            name="MCP Tool Schema (50 Tools)",
            description="Minifies whitespace, removes schema boilerplate keys ($schema, examples), and collapses duplicate array objects.",
            content=json_content or '{"tools": []}',
            content_type="json",
        ),
        FixtureResponse(
            id="cache-busting-prompt",
            name="System Prompt with Cache-Busting Prefix",
            description="Audits prompt prefix for volatile variables (UUID, dynamic timestamp) that destroy LLM KV-cache reuse.",
            content=prompt_content or "System Prompt\nSession: 123e4567\nInstructions: code",
            content_type="prompt",
        ),
    ]
