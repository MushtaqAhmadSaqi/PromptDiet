"""Stage 1: Deterministic Log Deduplicator.

Single-pass O(N) sliding-window log deduplication with normalized line signatures,
heuristic error-trace preservation, and preceding k-line context buffering.
"""

from collections import deque
import hashlib
import re
from typing import NamedTuple

# Regular expressions for stripping volatile components before hashing line signatures
_RE_ISO_TIMESTAMP = re.compile(
    r"\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b"
)
_RE_CLOCK_TIME = re.compile(r"\b\d{2}:\d{2}:\d{2}(?:\.\d+)?\b")
_RE_BRACKET_DATE = re.compile(r"\[\d{2}/[A-Za-z]{3}/\d{4}[: ]\d{2}:\d{2}:\d{2}[^\]]*\]")
_RE_HEX_ADDRESS = re.compile(r"\b0x[0-9a-fA-F]+\b")
_RE_PID = re.compile(r"\b(?:pid|PID|process)[=:\s]*\d+\b", re.IGNORECASE)
_RE_UUID = re.compile(
    r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b"
)

# Heuristic patterns indicating critical error lines that must never be collapsed
_RE_ERROR_HEURISTIC = re.compile(
    r"(?:\b(?:ERROR|FAIL|FAILED|FATAL|CRITICAL|Exception|Traceback)\b|"
    r"(?:exit(?:ed)? with (?:code|status) [1-9]\d*)|"
    r"(?:command failed with exit code)|"
    r"(?:npm ERR!|ELIFECYCLE))",
    re.IGNORECASE,
)


class DeduplicationResult(NamedTuple):
    text: str
    original_lines: int
    compressed_lines: int
    reduction_pct: float


def normalize_line(line: str) -> str:
    """Strip volatile tokens (timestamps, memory addresses, PIDs, UUIDs) from a log line."""
    cleaned = _RE_ISO_TIMESTAMP.sub("<TIMESTAMP>", line)
    cleaned = _RE_BRACKET_DATE.sub("<TIMESTAMP>", cleaned)
    cleaned = _RE_CLOCK_TIME.sub("<TIME>", cleaned)
    cleaned = _RE_HEX_ADDRESS.sub("<HEX_ADDR>", cleaned)
    cleaned = _RE_PID.sub("<PID>", cleaned)
    cleaned = _RE_UUID.sub("<UUID>", cleaned)
    return cleaned.strip()


def compute_line_signature(line: str) -> str:
    """Compute an MD5 hash signature of the normalized line content."""
    normalized = normalize_line(line)
    return hashlib.md5(normalized.encode("utf-8", errors="replace")).hexdigest()


def is_error_line(line: str) -> bool:
    """Check if the line matches any critical error heuristic."""
    return bool(_RE_ERROR_HEURISTIC.search(line))


def deduplicate_log(raw_log: str, context_lines: int = 3) -> DeduplicationResult:
    """Deduplicate repetitive build log lines while preserving error stack traces.

    Algorithm:
    - O(N) single-pass sliding window.
    - Normalizes volatile tokens (timestamps, hex addresses) before hashing line signatures.
    - Consecutive lines with identical signatures are collapsed into a counter marker:
      `[previous line repeated N times]`.
    - Error lines (Traceback, Exception, FAIL, etc.) bypass collapse entirely and are
      preceded by up to k context lines tracked via collections.deque(maxlen=k).

    Args:
        raw_log: Raw log text.
        context_lines: Number of preceding context lines to retain before any error line.

    Returns:
        DeduplicationResult containing compressed text and compression metrics.
    """
    if not raw_log:
        return DeduplicationResult(
            text="", original_lines=0, compressed_lines=0, reduction_pct=0.0
        )

    lines = raw_log.splitlines()
    total_original = len(lines)
    if total_original <= 1:
        return DeduplicationResult(
            text=raw_log,
            original_lines=total_original,
            compressed_lines=total_original,
            reduction_pct=0.0,
        )

    output: list[str] = []
    # Circular buffer tracking the last k lines for error context
    context_buffer: deque[str] = deque(maxlen=max(1, context_lines))

    # Sliding window state
    current_sig: str | None = None
    repeat_count: int = 0
    pending_first_line: str | None = None

    def flush_repeat_window() -> None:
        """Emit any active repeating line sequence."""
        nonlocal current_sig, repeat_count, pending_first_line
        if pending_first_line is not None:
            output.append(pending_first_line)
            if repeat_count > 1:
                output.append(f"  [previous line repeated {repeat_count - 1} times]")
        current_sig = None
        repeat_count = 0
        pending_first_line = None

    for line in lines:
        if is_error_line(line):
            # Error encountered: flush prior repeating lines
            flush_repeat_window()

            # Emit error line verbatim
            output.append(line)
            # Clear context buffer on error boundary
            context_buffer.clear()
        else:
            sig = compute_line_signature(line)
            if sig == current_sig:
                repeat_count += 1
            else:
                flush_repeat_window()
                current_sig = sig
                repeat_count = 1
                pending_first_line = line

            # Keep context buffer updated with recent non-error lines
            context_buffer.append(line)

    # Flush any remaining items at end of log
    flush_repeat_window()

    compressed_text = "\n".join(output)
    total_compressed = len(output)
    reduction = (
        ((total_original - total_compressed) / total_original * 100.0)
        if total_original > 0
        else 0.0
    )

    return DeduplicationResult(
        text=compressed_text,
        original_lines=total_original,
        compressed_lines=total_compressed,
        reduction_pct=round(reduction, 2),
    )
