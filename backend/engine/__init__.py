"""PromptDiet Compression Engine.

Coordinates the 4-stage optimization pipeline:
- Stage 1: Log Deduplicator
- Stage 2: JSON Crusher
- Stage 3: Declarative Prompt Rewriter (Gemini)
- Stage 4: KV-Cache Prefix Auditor
"""

import time
from typing import Any, NamedTuple

from engine.log_deduplicator import deduplicate_log
from engine.json_crusher import crush_json
from engine.cache_aligner import audit_cache_prefix, CacheViolation
from engine.tokenizer import compute_token_metrics, TokenMetrics


class PipelineOutput(NamedTuple):
    original: str
    compressed: str
    metrics: TokenMetrics
    processing_time_ms: float
    cache_violations: list[CacheViolation]
    stages_applied: list[str]


def auto_detect_content_type(text: str) -> str:
    """Heuristic content type detector: json, log, or prompt."""
    stripped = text.strip()
    if (stripped.startswith("{") and stripped.endswith("}")) or (
        stripped.startswith("[") and stripped.endswith("]")
    ):
        return "json"
    if any(k in text for k in ["INFO", "ERROR", "WARN", "DEBUG", "Traceback", "Exception"]):
        return "log"
    return "prompt"


def execute_compression_pipeline(
    content: str,
    content_type: str = "auto",
    enable_log_dedup: bool = True,
    enable_json_crush: bool = True,
    enable_cache_audit: bool = True,
    log_context_lines: int = 3,
    cache_prefix_ratio: float = 0.2,
) -> PipelineOutput:
    """Execute the configured deterministic compression stages."""
    start_time = time.perf_counter()

    resolved_type = (
        auto_detect_content_type(content)
        if content_type == "auto"
        else content_type
    )

    current_text = content
    stages_applied: list[str] = []
    violations: list[CacheViolation] = []

    # Stage 1: Log Deduplication
    if enable_log_dedup and resolved_type in ("log", "auto"):
        res = deduplicate_log(current_text, context_lines=log_context_lines)
        if res.reduction_pct > 0 or res.compressed_lines < res.original_lines:
            current_text = res.text
            stages_applied.append("log_deduplicator")

    # Stage 2: JSON & MCP Schema Crusher
    if enable_json_crush and resolved_type in ("json", "auto"):
        try:
            jres = crush_json(current_text)
            current_text = jres.text
            stages_applied.append("json_crusher")
        except ValueError:
            # Not valid JSON, bypass Stage 2
            pass

    # Stage 4: KV-Cache Prefix Auditor
    if enable_cache_audit and resolved_type in ("prompt", "auto"):
        audit = audit_cache_prefix(content, prefix_ratio=cache_prefix_ratio)
        violations = audit.violations
        if violations:
            stages_applied.append("cache_aligner")

    # Compute metrics
    metrics = compute_token_metrics(content, current_text)
    latency_ms = round((time.perf_counter() - start_time) * 1000.0, 2)

    return PipelineOutput(
        original=content,
        compressed=current_text,
        metrics=metrics,
        processing_time_ms=latency_ms,
        cache_violations=violations,
        stages_applied=stages_applied,
    )

