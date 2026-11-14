"""Token counting, estimation, and cost telemetry.

Uses tiktoken for exact BPE token counts and provides Gemini heuristic estimation
along with provider cost calculation.
"""

import re
from typing import NamedTuple

try:
    import tiktoken
    _TIKTOKEN_AVAILABLE = True
except ImportError:
    _TIKTOKEN_AVAILABLE = False

# Default pricing models ($ per 1,000,000 input tokens)
PRICING_PER_MILLION = {
    "gpt-4o": 2.50,
    "gpt-4o-mini": 0.15,
    "claude-3-5-sonnet": 3.00,
    "gemini-2.0-flash": 0.10,
}

_ENCODING_CACHE: dict = {}
_FALLBACK_TOKEN_PATTERN = re.compile(r"\w+|[^\w\s]+|\s+", re.UNICODE)


def _is_tiktoken_cached() -> bool:
    """Check if tiktoken BPE files are locally cached on disk without triggering network calls."""
    import os, tempfile
    cache_dirs = [
        os.environ.get("TIKTOKEN_CACHE_DIR", ""),
        os.path.join(tempfile.gettempdir(), "data-gym-cache"),
        os.path.join(tempfile.gettempdir()),
    ]
    for cdir in cache_dirs:
        if cdir and os.path.isdir(cdir):
            for fname in os.listdir(cdir):
                if "223921b76ee99bde995b7ff738513eef100fb51d18c93597a113bcffe865b2a7" in fname or "cl100k" in fname:
                    return True
    return False


def _get_encoding(encoding_name: str = "cl100k_base"):
    if not _TIKTOKEN_AVAILABLE:
        return None
    if encoding_name in _ENCODING_CACHE:
        return _ENCODING_CACHE[encoding_name]

    # Only load tiktoken if cached locally, preventing blocking network/DNS timeouts
    if not _is_tiktoken_cached():
        _ENCODING_CACHE[encoding_name] = None
        return None

    try:
        enc = tiktoken.get_encoding(encoding_name)
        _ENCODING_CACHE[encoding_name] = enc
        return enc
    except Exception:
        _ENCODING_CACHE[encoding_name] = None
        return None


def count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    """Calculate exact token count using tiktoken, falling back to BPE-approximate regex.

    Args:
        text: Input string.
        encoding_name: tiktoken encoding name (default: cl100k_base).

    Returns:
        Integer token count.
    """
    if not text:
        return 0

    enc = _get_encoding(encoding_name)
    if enc is not None:
        try:
            return len(enc.encode(text, disallowed_special=()))
        except Exception:
            pass

    # High-fidelity regex approximation when tiktoken BPE blob is unavailable offline
    tokens = _FALLBACK_TOKEN_PATTERN.findall(text)
    return len(tokens) if tokens else max(1, len(text) // 4)


def estimate_gemini_tokens(text: str) -> int:
    """Heuristic token estimation for Google Gemini models (~4 chars per token)."""
    if not text:
        return 0
    # Gemini tokenization is typically ~3.8-4.2 characters per token for English
    return max(1, round(len(text) / 4.0))


def calculate_cost_savings(
    tokens_saved: int,
    model: str = "gpt-4o",
) -> float:
    """Calculate estimated dollar cost savings based on input token reduction.

    Args:
        tokens_saved: Number of tokens eliminated.
        model: Target model pricing key (default: gpt-4o).

    Returns:
        Estimated savings in USD (rounded to 6 decimal places).
    """
    if tokens_saved <= 0:
        return 0.0

    rate_per_million = PRICING_PER_MILLION.get(model, 2.50)
    savings = (tokens_saved / 1_000_000.0) * rate_per_million
    return round(savings, 6)


class TokenMetrics(NamedTuple):
    original_tokens: int
    compressed_tokens: int
    tokens_saved: int
    reduction_pct: float
    cost_saved_usd: float
    gemini_estimate: int


def compute_token_metrics(
    original_text: str,
    compressed_text: str,
    model: str = "gpt-4o",
) -> TokenMetrics:
    """Compute comprehensive token metrics and savings between original and compressed text."""
    orig_tokens = count_tokens(original_text)
    comp_tokens = count_tokens(compressed_text)
    tokens_saved = max(0, orig_tokens - comp_tokens)

    reduction = (
        ((orig_tokens - comp_tokens) / orig_tokens * 100.0)
        if orig_tokens > 0
        else 0.0
    )

    cost_saved = calculate_cost_savings(tokens_saved, model=model)
    gemini_est = estimate_gemini_tokens(compressed_text)

    return TokenMetrics(
        original_tokens=orig_tokens,
        compressed_tokens=comp_tokens,
        tokens_saved=tokens_saved,
        reduction_pct=round(reduction, 2),
        cost_saved_usd=cost_saved,
        gemini_estimate=gemini_est,
    )
