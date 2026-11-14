"""Stage 3: Declarative System Prompt Rewriter.

Converts verbose conversational system prompts into compact, pipe-delimited
declarative constraints using Google Gemini (model: gemini-3.5-flash-lite)
with an automatic deterministic fallback when offline or without an API key.
"""

import os
import re
from typing import NamedTuple, Literal

try:
    from google import genai
    _GENAI_SDK_AVAILABLE = True
except ImportError:
    _GENAI_SDK_AVAILABLE = False


SYSTEM_INSTRUCTION = """You are PromptDiet's Prompt Minifier.
Your task is to convert verbose, conversational LLM instructions into dense, pipe-delimited declarative constraints.

RULES:
1. Strip all conversational filler, pleasantries, preambles, and conversational framing.
2. Group constraints by key attributes using concise 'Key: Value' syntax.
3. Delimit constraints with pipes: ' | '.
4. Maintain exact semantic rules, restrictions, and output formats.
5. Never add commentary or explanations. Output ONLY the compressed declarative prompt.

EXAMPLE:
Input: 'Hello assistant! Please make sure to always answer in bullet points. Do not include any polite greeting or introductory filler like Sure thing. Keep your response under 100 words.'
Output: 'Format: bullet points | Preamble: omit | Max length: 100 words'
"""

# Regex substitutions for deterministic offline fallback
_FILLER_PATTERNS = [
    (re.compile(r"\b(?:hello|hi|hey|greetings|dear assistant)[,!\.\s]*", re.IGNORECASE), ""),
    (re.compile(r"\b(?:please\s+(?:make\s+sure\s+to\s+)?|kindly\s+|be\s+sure\s+to\s+)", re.IGNORECASE), ""),
    (re.compile(r"\b(?:i\s+would\s+like\s+you\s+to\s+|i\s+want\s+you\s+to\s+|you\s+must\s+always\s+|you\s+should\s+)", re.IGNORECASE), ""),
    (re.compile(r"\b(?:do\s+not\s+|never\s+)", re.IGNORECASE), "Omit: "),
    (re.compile(r"\b(?:always\s+respond\s+in\s+|format\s+(?:your\s+response\s+as\s+)?|output\s+as\s+)", re.IGNORECASE), "Format: "),
]


class RewriteResult(NamedTuple):
    original: str
    rewritten: str
    model_used: str
    was_fallback: bool


def _deterministic_offline_rewrite(text: str, style: str = "pipe_delimited") -> str:
    """Deterministic local regex compressor when Gemini is unavailable."""
    cleaned = text
    for pattern, replacement in _FILLER_PATTERNS:
        cleaned = pattern.sub(replacement, cleaned)

    # Split into sentences or clauses
    parts = [p.strip() for p in re.split(r"[;\n\.]+", cleaned) if p.strip()]
    if not parts:
        return text

    if style == "bullet":
        return "\n".join(f"- {p}" for p in parts)
    elif style == "minimal":
        return "; ".join(parts)
    else:  # pipe_delimited
        return " | ".join(parts)


def rewrite_prompt(
    content: str,
    api_key: str | None = None,
    max_output_tokens: int = 300,
    style: Literal["pipe_delimited", "bullet", "minimal"] = "pipe_delimited",
    model_name: str = "gemini-3.5-flash-lite",
) -> RewriteResult:
    """Rewrite a verbose system prompt into declarative constraints.

    Args:
        content: Raw conversational system prompt.
        api_key: Optional Google AI Studio API key (falls back to GEMINI_API_KEY env).
        max_output_tokens: Cap on generated output tokens.
        style: Target layout formatting (pipe_delimited, bullet, minimal).
        model_name: Target Gemini model identifier.

    Returns:
        RewriteResult with transformed prompt and metadata.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY")

    # If SDK or key is missing, execute deterministic fallback
    if not _GENAI_SDK_AVAILABLE or not key:
        rewritten = _deterministic_offline_rewrite(content, style=style)
        return RewriteResult(
            original=content,
            rewritten=rewritten,
            model_used="deterministic-rule-engine",
            was_fallback=True,
        )

    try:
        client = genai.Client(api_key=key)
        prompt_with_style = f"Style requirement: {style}\n\nInput prompt to compress:\n{content}"

        response = client.models.generate_content(
            model=model_name,
            contents=prompt_with_style,
            config={
                "system_instruction": SYSTEM_INSTRUCTION,
                "max_output_tokens": max_output_tokens,
                "temperature": 0.1,
            },
        )

        output_text = response.text.strip() if response.text else ""
        if not output_text:
            output_text = _deterministic_offline_rewrite(content, style=style)
            return RewriteResult(
                original=content,
                rewritten=output_text,
                model_used=model_name,
                was_fallback=True,
            )

        return RewriteResult(
            original=content,
            rewritten=output_text,
            model_used=model_name,
            was_fallback=False,
        )

    except Exception:
        # Graceful fallback on network error or invalid API key
        output_text = _deterministic_offline_rewrite(content, style=style)
        return RewriteResult(
            original=content,
            rewritten=output_text,
            model_used="deterministic-fallback-after-error",
            was_fallback=True,
        )

