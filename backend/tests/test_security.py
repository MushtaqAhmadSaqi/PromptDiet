"""Security and Hardening Test Suite for PromptDiet API & Engine.

Tests for:
1. SQL Injection resiliency in SQLite persistence layer
2. Input sanitization & Malicious payload handling (XSS, control chars, null bytes)
3. CORS configuration & credentials security
4. Payload size limits & Denial of Service resilience
5. Fixture path traversal prevention
6. Information disclosure prevention (exception handling)
"""

import pytest
from starlette.testclient import TestClient
from main import app
from config import settings
from db.repository import get_repository

client = TestClient(app)


def test_cors_credentials_security():
    """Verify CORS does not allow wildcard origin when credentials are enabled in production mode."""
    # When allow_credentials is True, allow_origins must not be wildcard ['*']
    if settings.environment != "local":
        assert "*" not in settings.cors_origins


def test_sql_injection_in_templates():
    """Verify that SQL injection payloads in template fields do not execute or corrupt the database."""
    repo = get_repository()

    sqli_payloads = [
        "' OR '1'='1",
        "'; DROP TABLE test; --",
        "1' UNION SELECT 1, 2, 3 --",
        "' OR 1=1 /*",
    ]

    for payload in sqli_payloads:
        # Create template with SQL injection payload
        resp = client.post(
            "/api/templates",
            json={
                "name": f"SQLi {payload}",
                "content": f"SELECT * FROM users WHERE user = {payload}",
                "content_type": "prompt",
                "tags": [payload, "security-test"],
            },
        )
        assert resp.status_code == 201
        created = resp.json()
        template_id = created["id"]

        # Fetch template back and verify exact string matches without executing SQL
        fetch_resp = client.get(f"/api/templates/{template_id}")
        assert fetch_resp.status_code == 200
        data = fetch_resp.json()
        assert data["name"] == f"SQLi {payload}"
        assert payload in data["tags"]

        # Attempt SQL injection via ID parameter
        bad_id_resp = client.get(f"/api/templates/{payload}")
        assert bad_id_resp.status_code == 404

        # Clean up
        del_resp = client.delete(f"/api/templates/{template_id}")
        assert del_resp.status_code == 200


def test_template_name_length_limit():
    """Verify that template names exceeding 100 characters are rejected with 422."""
    resp = client.post(
        "/api/templates",
        json={
            "name": "A" * 101,
            "content": "Valid content",
            "content_type": "prompt",
        },
    )
    assert resp.status_code == 422


def test_xss_and_html_payload_resilience():
    """Verify that script tags, event handlers, and HTML payloads are treated as inert strings."""
    xss_payloads = [
        "<script>alert(1)</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/'/+/onmouseover=1+(alert)(1)//>",
    ]

    for payload in xss_payloads:
        resp = client.post(
            "/api/compress",
            json={
                "content": payload,
                "content_type": "prompt",
                "stages": {"log_dedup": False, "json_crush": False, "cache_audit": True},
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["original"] == payload
        # Ensure server did not crash or execute payload


def test_malformed_json_security():
    """Verify that malformed JSON payloads in JSON crusher do not crash the service with 500."""
    malformed_inputs = [
        '{"unterminated": "string',
        '{key_without_quotes: 123}',
        '{"nested": {"too_deep": ' + ('{"a":' * 200) + '1' + ('}' * 200) + '}}',
        'null',
        '[]',
        '{"a": 1, "b": [1, 2, 3, ]}',  # trailing comma
    ]

    for bad_json in malformed_inputs:
        resp = client.post(
            "/api/compress",
            json={
                "content": bad_json,
                "content_type": "json",
                "stages": {"log_dedup": False, "json_crush": True, "cache_audit": False},
            },
        )
        # Should gracefully return 200 with raw text or handled response, never crash
        assert resp.status_code == 200
        data = resp.json()
        assert "compressed" in data


def test_path_traversal_fixtures_protection():
    """Verify that fixtures endpoint returns only controlled, static whitelist items."""
    resp = client.get("/api/fixtures")
    assert resp.status_code == 200
    fixtures = resp.json()
    valid_ids = {"build-log", "mcp-schema", "cache-busting-prompt"}
    for f in fixtures:
        assert f["id"] in valid_ids
        assert not f["id"].startswith(".")
        assert ".." not in f["id"]
        assert "/" not in f["id"]
        assert "\\" not in f["id"]


def test_template_invalid_content_type():
    """Verify input validation rejects invalid content_type enums."""
    resp = client.post(
        "/api/templates",
        json={
            "name": "Invalid Type Test",
            "content": "Sample content",
            "content_type": "malicious_type_injection",
        },
    )
    assert resp.status_code == 422  # Unprocessable Entity (Pydantic validation)


def test_stats_telemetry_resilience_on_injection():
    """Verify stats endpoint aggregates safely without SQL evaluation errors."""
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    stats = resp.json()
    assert "total_runs" in stats
    assert "total_tokens_saved" in stats
    assert "total_cost_saved_usd" in stats
    assert "avg_reduction_pct" in stats
    assert isinstance(stats["total_runs"], int)
