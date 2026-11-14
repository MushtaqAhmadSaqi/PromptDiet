import pytest
from engine.cache_aligner import audit_cache_prefix


def test_volatile_prefix_detected(sample_cache_prompt: str):
    """Ensure dynamic session variables in the prefix window are flagged."""
    result = audit_cache_prefix(sample_cache_prompt)
    assert result.is_cache_friendly is False
    assert len(result.violations) >= 3

    patterns = {v.pattern_name for v in result.violations}
    assert "uuid_v4" in patterns
    assert "iso_timestamp" in patterns
    assert "session_or_request_id" in patterns


def test_clean_prompt_passes(sample_clean_prompt: str):
    """Ensure a deterministic prompt without dynamic variables passes audit."""
    result = audit_cache_prefix(sample_clean_prompt)
    assert result.is_cache_friendly is True
    assert len(result.violations) == 0


def test_coordinate_accuracy():
    """Verify exact line and column coordinates of cache violations."""
    prompt = "Header Line 1\nRun ID: 123e4567-e89b-12d3-a456-426614174000\nInstructions here."
    result = audit_cache_prefix(prompt)
    assert len(result.violations) >= 1
    uuid_v = next(v for v in result.violations if v.pattern_name == "uuid_v4")
    assert uuid_v.line_number == 2
    assert uuid_v.matched_text == "123e4567-e89b-12d3-a456-426614174000"


def test_unix_epoch_detected():
    """Verify Unix epoch timestamps in prefix are caught."""
    prompt = "Cache-Key: 1715000000\nPrompt instruction follows."
    result = audit_cache_prefix(prompt)
    assert any(v.pattern_name == "unix_epoch" for v in result.violations)


def test_runtime_clock_call_detected():
    """Verify dynamic datetime / Date calls are flagged."""
    prompt = "System prompt generated at datetime.now()\nStatic rules."
    result = audit_cache_prefix(prompt)
    assert any(v.pattern_name == "dynamic_clock_call" for v in result.violations)

