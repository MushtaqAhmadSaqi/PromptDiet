from typing import Literal
from pydantic import BaseModel, Field


class StageConfig(BaseModel):
    """Configuration toggles for individual deterministic compression stages."""

    log_dedup: bool = Field(default=True, description="Enable Stage 1 Log Deduplicator")
    json_crush: bool = Field(default=True, description="Enable Stage 2 JSON/MCP Crusher")
    cache_audit: bool = Field(default=True, description="Enable Stage 4 KV-Cache Prefix Auditor")


class CompressRequest(BaseModel):
    """Payload for POST /api/compress."""

    content: str = Field(..., description="Raw text to compress (log, json, prompt)")
    content_type: Literal["log", "json", "prompt", "auto"] = Field(
        default="auto", description="Content classification"
    )
    stages: StageConfig = Field(default_factory=StageConfig)


class CacheViolation(BaseModel):
    """Single KV-cache prefix violation coordinate and suggestion."""

    line_number: int
    column: int
    matched_text: str
    pattern_name: str
    suggestion: str


class CompressionMetrics(BaseModel):
    """Quantitative telemetry for compression results."""

    original_chars: int
    compressed_chars: int
    original_tokens: int
    compressed_tokens: int
    tokens_saved: int
    token_reduction_pct: float
    estimated_cost_saved_usd: float
    processing_time_ms: float
    gemini_token_estimate: int | None = None


class CompressResponse(BaseModel):
    """Result of POST /api/compress."""

    original: str
    compressed: str
    metrics: CompressionMetrics
    cache_violations: list[CacheViolation] = []
    stages_applied: list[str] = []


class RewriteRequest(BaseModel):
    """Payload for POST /api/rewrite."""

    content: str = Field(..., description="Verbose narrative prompt to convert")
    max_output_tokens: int = Field(default=300, ge=50, le=2000)
    style: Literal["pipe_delimited", "bullet", "minimal"] = "pipe_delimited"


class RewriteResponse(BaseModel):
    """Result of POST /api/rewrite."""

    original: str
    rewritten: str
    metrics: CompressionMetrics
    gemini_model_used: str
    was_fallback: bool = False


class TemplateCreate(BaseModel):
    """Payload to create or update a saved prompt template."""

    name: str = Field(..., min_length=1, max_length=100)
    content: str = Field(...)
    content_type: Literal["log", "json", "prompt"] = "prompt"
    tags: list[str] = Field(default_factory=list)


class TemplateResponse(BaseModel):
    """Saved template schema."""

    id: str
    name: str
    content: str
    content_type: str
    tags: list[str]
    created_at: str
    updated_at: str


class TemplateList(BaseModel):
    """List of templates."""

    templates: list[TemplateResponse]
    total: int


class FixtureResponse(BaseModel):
    """Sample demo fixture for one-click UI switcher."""

    id: str
    name: str
    description: str
    content: str
    content_type: Literal["log", "json", "prompt"]

