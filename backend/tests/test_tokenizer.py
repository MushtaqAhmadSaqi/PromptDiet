import pytest
from engine.tokenizer import (
    count_tokens,
    estimate_gemini_tokens,
    calculate_cost_savings,
    compute_token_metrics,
)


def test_count_tokens_returns_positive_integer():
    text = "PromptDiet is a local-first system prompt and log token compressor."
    count = count_tokens(text)
    assert isinstance(count, int)
    assert count >= 10


def test_empty_string_returns_zero():
    assert count_tokens("") == 0
    assert count_tokens("   ") > 0  # whitespace has token value
    assert estimate_gemini_tokens("") == 0


def test_calculate_cost_savings():
    # 1,000,000 tokens at $2.50/M for gpt-4o = $2.50
    savings = calculate_cost_savings(1_000_000, model="gpt-4o")
    assert pytest.approx(savings, 0.001) == 2.50

    # 100,000 tokens at $0.10/M for gemini-2.0-flash = $0.01
    gemini_savings = calculate_cost_savings(100_000, model="gemini-2.0-flash")
    assert pytest.approx(gemini_savings, 0.0001) == 0.01

    assert calculate_cost_savings(0) == 0.0
    assert calculate_cost_savings(-50) == 0.0


def test_gemini_token_estimate():
    sample = "A" * 400
    est = estimate_gemini_tokens(sample)
    assert est == 100


def test_compute_token_metrics():
    original = "This is a verbose redundant sentence. " * 10
    compressed = "This is a verbose redundant sentence."
    metrics = compute_token_metrics(original, compressed)

    assert metrics.original_tokens > metrics.compressed_tokens
    assert metrics.tokens_saved > 0
    assert metrics.reduction_pct > 80.0
    assert metrics.cost_saved_usd > 0.0
    assert metrics.gemini_estimate > 0

