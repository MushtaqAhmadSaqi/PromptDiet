"""Stage 2: JSON & MCP Schema Crusher.

Minifies whitespace, removes redundant boilerplate schema keys,
and deduplicates repeated array object schemas while preserving structural validity.
"""

import json
from typing import Any, NamedTuple

DEFAULT_STRIP_KEYS = {
    "$schema",
    "examples",
    "example",
    "x-readme-ref",
    "x-internal",
    "x-docs-url",
}


class JsonCrushResult(NamedTuple):
    text: str
    original_bytes: int
    compressed_bytes: int
    reduction_pct: float
    is_valid: bool


def _strip_boilerplate(node: Any, strip_keys: set[str]) -> Any:
    """Recursively strip non-functional boilerplate keys and x- prefixed extensions."""
    if isinstance(node, dict):
        cleaned: dict[str, Any] = {}
        for k, v in node.items():
            if k in strip_keys or k.startswith("x-"):
                continue
            cleaned[k] = _strip_boilerplate(v, strip_keys)
        return cleaned
    if isinstance(node, list):
        return [_strip_boilerplate(item, strip_keys) for item in node]
    return node


def _deduplicate_array_schemas(node: Any) -> Any:
    """Collapse consecutive or identical array object items with repetition markers."""
    if isinstance(node, list):
        processed_list = [_deduplicate_array_schemas(item) for item in node]
        if not processed_list:
            return []

        # If array items are dictionaries, look for repeated structures
        collapsed: list[Any] = []
        i = 0
        n = len(processed_list)
        while i < n:
            item = processed_list[i]
            count = 1
            # Check consecutive identical items
            while i + 1 < n and processed_list[i + 1] == item:
                count += 1
                i += 1

            if count > 1 and isinstance(item, dict):
                # Annotate repetition count inside the representative object
                annotated = dict(item)
                annotated["__repeated"] = count
                collapsed.append(annotated)
            elif count > 1:
                # Non-dict primitive repeated items
                collapsed.append(item)
                collapsed.append(f"[repeated {count - 1} more times]")
            else:
                collapsed.append(item)
            i += 1
        return collapsed

    if isinstance(node, dict):
        return {k: _deduplicate_array_schemas(v) for k, v in node.items()}

    return node


def crush_json(
    raw_json: str,
    strip_boilerplate_keys: bool = True,
    dedup_arrays: bool = True,
    custom_strip_keys: set[str] | None = None,
) -> JsonCrushResult:
    """Crush a JSON or MCP tool schema payload.

    Args:
        raw_json: Input JSON string.
        strip_boilerplate_keys: Whether to remove $schema, examples, and x-* keys.
        dedup_arrays: Whether to deduplicate identical array schemas with __repeated count.
        custom_strip_keys: Optional set of additional keys to strip.

    Returns:
        JsonCrushResult containing compressed valid JSON string and compression stats.

    Raises:
        ValueError: If raw_json is not syntactically valid JSON.
    """
    if not raw_json or not raw_json.strip():
        return JsonCrushResult(
            text="{}",
            original_bytes=len(raw_json.encode("utf-8")),
            compressed_bytes=2,
            reduction_pct=0.0,
            is_valid=True,
        )

    original_bytes = len(raw_json.encode("utf-8"))

    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON input: {exc.msg} at line {exc.lineno} column {exc.colno}") from exc

    data = parsed
    if strip_boilerplate_keys:
        keys_to_strip = set(DEFAULT_STRIP_KEYS)
        if custom_strip_keys:
            keys_to_strip.update(custom_strip_keys)
        data = _strip_boilerplate(data, keys_to_strip)

    if dedup_arrays:
        data = _deduplicate_array_schemas(data)

    # Minify whitespace using compact delimiters
    compressed_text = json.dumps(data, separators=(",", ":"), ensure_ascii=False)

    # Verify structural integrity post-compression
    json.loads(compressed_text)

    compressed_bytes = len(compressed_text.encode("utf-8"))
    reduction = (
        ((original_bytes - compressed_bytes) / original_bytes * 100.0)
        if original_bytes > 0
        else 0.0
    )

    return JsonCrushResult(
        text=compressed_text,
        original_bytes=original_bytes,
        compressed_bytes=compressed_bytes,
        reduction_pct=round(reduction, 2),
        is_valid=True,
    )

