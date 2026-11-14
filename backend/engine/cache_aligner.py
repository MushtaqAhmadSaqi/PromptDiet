"""Stage 4: KV-Cache Prefix Auditor.

Scans the prompt prefix window for volatile variables (timestamps, UUIDs, session IDs)
that break LLM provider KV-cache alignment across multi-turn agent interactions.
"""

import re
from typing import NamedTuple

CACHE_VIOLATION_PATTERNS = [
    (
        "iso_timestamp",
        re.compile(r"\b\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?\b"),
        "Dynamic ISO timestamp in prompt prefix invalidates KV-cache. Move timestamp to the prompt suffix.",
    ),
    (
        "uuid_v4",
        re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"),
        "Random UUID in prompt prefix invalidates KV-cache across sessions. Pass session identifiers in user turn or prompt suffix.",
    ),
    (
        "unix_epoch",
        re.compile(r"\b1[6-9]\d{8}(?:\d{3})?\b"),
        "Unix epoch timestamp detected in prompt prefix. Move epoch values to prompt suffix.",
    ),
    (
        "session_or_request_id",
        re.compile(r"\b(?:session[_-]?id|req(?:uest)?[_-]?id|trace[_-]?id)[=:\s]+[\'\"]?([A-Za-z0-9_-]{8,})[\'\"]?", re.IGNORECASE),
        "Dynamic request or session ID in prefix destroys cache reuse. Relocate to suffix.",
    ),
    (
        "dynamic_clock_call",
        re.compile(r"\b(?:datetime\.now\(\)|Date\.now\(\)|time\.time\(\)|new Date\(\))\b"),
        "Dynamic time evaluation in prefix generates non-deterministic prompt headers. Provide static instructions or relocate.",
    ),
]


class CacheViolation(NamedTuple):
    line_number: int
    column: int
    matched_text: str
    pattern_name: str
    suggestion: str


class AuditResult(NamedTuple):
    violations: list[CacheViolation]
    prefix_lines_scanned: int
    total_lines: int
    is_cache_friendly: bool


def audit_cache_prefix(
    prompt: str,
    prefix_ratio: float = 0.2,
    max_prefix_lines: int = 50,
) -> AuditResult:
    """Audit prompt prefix for cache-busting variables.

    Args:
        prompt: Raw system prompt or input text.
        prefix_ratio: Fraction of total lines from the beginning considered cache prefix.
        max_prefix_lines: Upper bound of prefix lines to inspect.

    Returns:
        AuditResult with detected violations and cache friendliness indicator.
    """
    if not prompt or not prompt.strip():
        return AuditResult(violations=[], prefix_lines_scanned=0, total_lines=0, is_cache_friendly=True)

    lines = prompt.splitlines()
    total_lines = len(lines)

    # Determine prefix boundary:
    # For small prompts, scan at least up to min(5, total_lines) so early variables aren't missed.
    # Otherwise use prefix_ratio bound by max_prefix_lines.
    calculated_lines = int(total_lines * prefix_ratio)
    prefix_line_count = min(max(calculated_lines, min(5, total_lines)), max_prefix_lines)

    violations: list[CacheViolation] = []

    for line_idx in range(prefix_line_count):
        line = lines[line_idx]
        line_num = line_idx + 1

        for pattern_name, regex, suggestion in CACHE_VIOLATION_PATTERNS:
            for match in regex.finditer(line):
                col_num = match.start() + 1
                violations.append(
                    CacheViolation(
                        line_number=line_num,
                        column=col_num,
                        matched_text=match.group(0),
                        pattern_name=pattern_name,
                        suggestion=suggestion,
                    )
                )

    return AuditResult(
        violations=violations,
        prefix_lines_scanned=prefix_line_count,
        total_lines=total_lines,
        is_cache_friendly=len(violations) == 0,
    )
