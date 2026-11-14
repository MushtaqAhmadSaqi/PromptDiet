import pytest
from engine.prompt_rewriter import rewrite_prompt, _deterministic_offline_rewrite


def test_missing_key_triggers_deterministic_fallback():
    """Ensure missing or unset Gemini API key falls back to offline rule engine."""
    verbose_prompt = (
        "Hello! Please make sure to always respond in bullet points. "
        "Kindly do not include any polite conversational preambles. "
        "You must keep all responses under 100 words."
    )
    result = rewrite_prompt(verbose_prompt, api_key=None, style="pipe_delimited")

    assert result.was_fallback is True
    assert result.model_used in ("deterministic-rule-engine", "deterministic-fallback-after-error")
    assert "Hello" not in result.rewritten
    assert "Please make sure to" not in result.rewritten
    assert "|" in result.rewritten or ";" in result.rewritten


def test_style_variations():
    """Test bullet, minimal, and pipe styles under deterministic rules."""
    text = "Please write tests. Always use pytest. Never use mock without reason."

    bullet_res = _deterministic_offline_rewrite(text, style="bullet")
    assert bullet_res.startswith("- ")

    minimal_res = _deterministic_offline_rewrite(text, style="minimal")
    assert ";" in minimal_res

    pipe_res = _deterministic_offline_rewrite(text, style="pipe_delimited")
    assert " | " in pipe_res


def test_empty_prompt_handling():
    """Ensure empty prompt returns cleanly."""
    result = rewrite_prompt("", api_key=None)
    assert result.rewritten == ""

