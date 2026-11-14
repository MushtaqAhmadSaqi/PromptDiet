import pytest
from engine.log_deduplicator import deduplicate_log, is_error_line, normalize_line


def test_repetitive_build_log_collapses(sample_build_log: str):
    """Ensure a 46-line repetitive build log collapses to under 10 lines."""
    result = deduplicate_log(sample_build_log)
    assert result.original_lines == 46
    assert result.compressed_lines <= 9
    assert result.reduction_pct > 75.0
    assert "[previous line repeated" in result.text


def test_critical_errors_preserved(sample_build_log: str):
    """Ensure error stack traces and exit codes bypass collapse entirely."""
    result = deduplicate_log(sample_build_log)
    assert "ERROR Traceback (most recent call last):" in result.text
    assert "File 'migrate.py', line 84, in connect" in result.text
    assert "Exception: ConnectionRefusedError: Port 5432 unreachable" in result.text
    assert "npm ERR! command failed with exit code 1" in result.text


def test_volatile_tokens_normalized():
    """Ensure timestamps and hex memory addresses are stripped before hashing."""
    line1 = "2026-11-14 10:00:01 INFO [0x7fa12] Compiling bundle"
    line2 = "2026-11-14 10:00:02 INFO [0x7fa99] Compiling bundle"
    norm1 = normalize_line(line1)
    norm2 = normalize_line(line2)
    assert norm1 == norm2
    assert "<TIMESTAMP>" in norm1
    assert "<HEX_ADDR>" in norm1


def test_empty_log_handling():
    """Ensure empty log returns zero lines without crashing."""
    result = deduplicate_log("")
    assert result.original_lines == 0
    assert result.compressed_lines == 0
    assert result.reduction_pct == 0.0
    assert result.text == ""


def test_single_line_log():
    """Ensure single line log returns verbatim."""
    single = "2026-11-14 10:00:00 INFO Starting server..."
    result = deduplicate_log(single)
    assert result.original_lines == 1
    assert result.compressed_lines == 1
    assert result.reduction_pct == 0.0
    assert result.text == single


def test_all_unique_lines_preserved():
    """Ensure unique lines without repetition are not collapsed."""
    unique_log = "INFO Step 1\nINFO Step 2\nINFO Step 3\nINFO Step 4"
    result = deduplicate_log(unique_log)
    assert result.original_lines == 4
    assert result.compressed_lines == 4
    assert result.reduction_pct == 0.0
    assert "[previous line repeated" not in result.text


def test_error_at_start():
    """Ensure an immediate error on line 1 is handled gracefully."""
    error_first = "ERROR Immediate fatal bootstrap failure\nINFO recovering\nINFO recovering"
    result = deduplicate_log(error_first)
    assert result.text.startswith("ERROR Immediate fatal bootstrap failure")
    assert "[previous line repeated 1 times]" in result.text

