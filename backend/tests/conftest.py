import os
import sys
import pytest

# Ensure backend package is in python path for test runs
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


@pytest.fixture
def sample_build_log() -> str:
    """Realistic build log with repeated lines, volatile timestamps, and a buried error."""
    lines = []
    # 40 lines of repetitive compilation
    for i in range(40):
        lines.append(f"2026-11-14 10:00:{i:02d} INFO [0x7f{i:02x}] Compiling typescript modules...")

    # Preceding context lines before failure
    lines.append("2026-11-14 10:00:41 INFO Loading database schema migrations")
    lines.append("2026-11-14 10:00:42 INFO Connecting to postgres://localhost:5432/testdb")

    # Critical failure stack trace
    lines.append("2026-11-14 10:00:43 ERROR Traceback (most recent call last):")
    lines.append("2026-11-14 10:00:44 ERROR   File 'migrate.py', line 84, in connect")
    lines.append("2026-11-14 10:00:45 Exception: ConnectionRefusedError: Port 5432 unreachable")
    lines.append("2026-11-14 10:00:46 npm ERR! command failed with exit code 1")

    return "\n".join(lines)


@pytest.fixture
def sample_mcp_json() -> str:
    """MCP tool definitions JSON with boilerplate keys and repeated array elements."""
    return """{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "x-internal-ref": "mcp-core-v2",
  "tools": [
    {
      "name": "read_file",
      "description": "Read file contents",
      "examples": ["read_file(path='foo')"],
      "parameters": {"type": "object", "properties": {"path": {"type": "string"}}}
    },
    {
      "name": "read_file",
      "description": "Read file contents",
      "examples": ["read_file(path='foo')"],
      "parameters": {"type": "object", "properties": {"path": {"type": "string"}}}
    },
    {
      "name": "read_file",
      "description": "Read file contents",
      "examples": ["read_file(path='foo')"],
      "parameters": {"type": "object", "properties": {"path": {"type": "string"}}}
    }
  ]
}"""


@pytest.fixture
def sample_cache_prompt() -> str:
    """System prompt with volatile variables in the prefix window."""
    return """You are an expert AI code reviewer.
Current Session: 4a2b9f31-7e89-410a-b152-870a319fbc41
Generated: 2026-11-14T23:39:00Z
Request ID: req-9876543210
Always output code adhering strictly to PEP 8 standards.
Provide clear docstrings and comprehensive type annotations for all functions."""


@pytest.fixture
def sample_clean_prompt() -> str:
    """Clean system prompt without any volatile cache-busting prefix variables."""
    return """You are an expert AI code reviewer.
Always output code adhering strictly to PEP 8 standards.
Provide clear docstrings and comprehensive type annotations for all functions."""

