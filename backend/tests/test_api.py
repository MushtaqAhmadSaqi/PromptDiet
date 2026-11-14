import pytest
from starlette.testclient import TestClient
from main import app

client = TestClient(app)


def test_api_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "PromptDiet"


def test_api_fixtures_endpoint():
    resp = client.get("/api/fixtures")
    assert resp.status_code == 200
    fixtures = resp.json()
    assert len(fixtures) == 3
    ids = {f["id"] for f in fixtures}
    assert "build-log" in ids
    assert "mcp-schema" in ids
    assert "cache-busting-prompt" in ids


def test_api_compress_log(sample_build_log: str):
    payload = {
        "content": sample_build_log,
        "content_type": "log",
        "stages": {"log_dedup": True, "json_crush": False, "cache_audit": False},
    }
    resp = client.post("/api/compress", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "log_deduplicator" in data["stages_applied"]
    assert data["metrics"]["tokens_saved"] > 0
    assert data["metrics"]["token_reduction_pct"] > 0


def test_api_compress_json(sample_mcp_json: str):
    payload = {
        "content": sample_mcp_json,
        "content_type": "json",
        "stages": {"log_dedup": False, "json_crush": True, "cache_audit": False},
    }
    resp = client.post("/api/compress", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "json_crusher" in data["stages_applied"]
    assert "$schema" not in data["compressed"]


def test_api_compress_cache_audit(sample_cache_prompt: str):
    payload = {
        "content": sample_cache_prompt,
        "content_type": "prompt",
        "stages": {"log_dedup": False, "json_crush": False, "cache_audit": True},
    }
    resp = client.post("/api/compress", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["cache_violations"]) >= 2


def test_api_rewrite_system_prompt():
    payload = {
        "content": "Please make sure to always format responses as json. Never use conversational greetings.",
        "max_output_tokens": 150,
        "style": "pipe_delimited",
    }
    resp = client.post("/api/rewrite", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["rewritten"] != ""
    assert data["metrics"]["original_tokens"] >= data["metrics"]["compressed_tokens"]


def test_api_template_lifecycle():
    # 1. Create
    create_payload = {
        "name": "Integration Test Template",
        "content": "ERROR Failed to start cluster on 10.0.0.1",
        "content_type": "log",
        "tags": ["cluster", "integration"],
    }
    create_resp = client.post("/api/templates", json=create_payload)
    assert create_resp.status_code == 201
    created = create_resp.json()
    t_id = created["id"]
    assert created["name"] == "Integration Test Template"

    # 2. Get by ID
    get_resp = client.get(f"/api/templates/{t_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == t_id

    # 3. List
    list_resp = client.get("/api/templates")
    assert list_resp.status_code == 200
    assert any(t["id"] == t_id for t in list_resp.json()["templates"])

    # 4. Delete
    del_resp = client.delete(f"/api/templates/{t_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["deleted"] is True

    # 5. Confirm 404
    get_after_del = client.get(f"/api/templates/{t_id}")
    assert get_after_del.status_code == 404


def test_api_stats_endpoint():
    resp = client.get("/api/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_runs" in data
    assert "total_tokens_saved" in data
    assert "total_cost_saved_usd" in data

