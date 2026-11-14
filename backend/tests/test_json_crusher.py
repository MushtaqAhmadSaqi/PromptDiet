import json
import pytest
from engine.json_crusher import crush_json


def test_mcp_json_crush_and_minification(sample_mcp_json: str):
    """Ensure MCP schema is minified, stripped of boilerplate, and validated."""
    result = crush_json(sample_mcp_json)
    assert result.is_valid is True
    assert result.reduction_pct > 30.0
    assert result.compressed_bytes < result.original_bytes

    # Parse compressed text back into Python dict to verify valid JSON
    parsed = json.loads(result.text)
    assert "$schema" not in parsed
    assert "x-internal-ref" not in parsed
    assert "tools" in parsed

    # Verify array deduplication
    tools = parsed["tools"]
    assert len(tools) == 1
    assert tools[0]["name"] == "read_file"
    assert tools[0]["__repeated"] == 3
    assert "examples" not in tools[0]


def test_invalid_json_raises_value_error():
    """Ensure invalid JSON raises ValueError with informative error message."""
    invalid = "{ name: 'broken_json', missing_quotes: true "
    with pytest.raises(ValueError, match="Invalid JSON input"):
        crush_json(invalid)


def test_empty_json_string():
    """Ensure empty or whitespace-only input returns valid empty JSON."""
    result = crush_json("   ")
    assert result.is_valid is True
    assert result.text == "{}"


def test_nested_primitive_array_dedup():
    """Ensure arrays with primitive identical values also collapse."""
    raw = json.dumps({"tags": ["agent", "agent", "agent", "runner"]})
    result = crush_json(raw)
    parsed = json.loads(result.text)
    assert parsed["tags"][0] == "agent"
    assert parsed["tags"][1] == "[repeated 2 more times]"
    assert parsed["tags"][2] == "runner"

