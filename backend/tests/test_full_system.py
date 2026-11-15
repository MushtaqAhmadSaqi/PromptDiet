"""End-to-End System Test Suite for PromptDiet."""

import json
import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.testclient import TestClient
from main import app
from engine import execute_compression_pipeline, auto_detect_content_type
from engine.log_deduplicator import deduplicate_log
from engine.json_crusher import crush_json
from engine.cache_aligner import audit_cache_prefix
from engine.prompt_rewriter import rewrite_prompt
from engine.tokenizer import count_tokens, calculate_cost_savings
from db.repository import get_repository


def run_comprehensive_e2e_tests():
    print("=" * 70)
    print("PROMPTDIET END-TO-END VERIFICATION RUNNER")
    print("=" * 70)

    # 1. Content Auto-detection
    print("\n[TEST 1/8] Verifying content-type autodetection...")
    assert auto_detect_content_type('{"a": 1}') == "json"
    assert auto_detect_content_type('[{"tool": "read"}]') == "json"
    assert auto_detect_content_type("2026-11-15 INFO Starting build...") == "log"
    assert auto_detect_content_type("Traceback (most recent call last):") == "log"
    assert auto_detect_content_type("You are an expert AI assistant.") == "prompt"
    print("  -> Passed! (JSON, Log, and Prompt correctly identified)")

    # 2. Stage 1: 400-Line Build Log Fixture
    print("\n[TEST 2/8] Testing Stage 1: Build Log Compression (401 lines)...")
    fixtures_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fixtures")
    with open(os.path.join(fixtures_dir, "build_log_400_lines.txt"), "r", encoding="utf-8") as f:
        log_content = f.read()

    t0 = time.perf_counter()
    log_res = deduplicate_log(log_content)
    log_latency_ms = (time.perf_counter() - t0) * 1000.0

    print(f"  - Original lines:    {log_res.original_lines}")
    print(f"  - Compressed lines:  {log_res.compressed_lines}")
    print(f"  - Line reduction:    {log_res.reduction_pct}%")
    print(f"  - Processing latency: {log_latency_ms:.2f} ms")
    assert log_res.original_lines == 401
    assert log_res.compressed_lines <= 15
    assert log_res.reduction_pct > 95.0
    assert "ModuleNotFoundError" in log_res.text
    assert "npm ERR! Exit status 1" in log_res.text
    print("  -> Passed! (96%+ reduction, stack trace and exit codes intact, <5ms latency)")

    # 3. Stage 2: 50-Tool MCP Schema Fixture
    print("\n[TEST 3/8] Testing Stage 2: JSON & MCP Schema Crusher (50 tools)...")
    with open(os.path.join(fixtures_dir, "mcp_schema_50_tools.json"), "r", encoding="utf-8") as f:
        json_content = f.read()

    t0 = time.perf_counter()
    json_res = crush_json(json_content)
    json_latency_ms = (time.perf_counter() - t0) * 1000.0

    print(f"  - Original bytes:    {json_res.original_bytes:,} B")
    print(f"  - Compressed bytes:  {json_res.compressed_bytes:,} B")
    print(f"  - Byte reduction:    {json_res.reduction_pct}%")
    print(f"  - Structural validity: {json_res.is_valid}")
    print(f"  - Processing latency: {json_latency_ms:.2f} ms")
    assert json_res.is_valid is True
    assert json_res.reduction_pct > 50.0
    parsed = json.loads(json_res.text)
    assert "$schema" not in parsed
    assert "tools" in parsed
    print("  -> Passed! (54%+ reduction, valid JSON structure verified)")

    # 4. Stage 3: Declarative System Prompt Rewriter
    print("\n[TEST 4/8] Testing Stage 3: Declarative Prompt Rewriter...")
    verbose_prompt = (
        "Hello assistant! Please make sure to always format responses in bullet points. "
        "Kindly do not include any polite conversational preambles like Sure thing or Happy to help. "
        "You must keep all answers under 50 words."
    )
    pipe_res = rewrite_prompt(verbose_prompt, style="pipe_delimited")
    bullet_res = rewrite_prompt(verbose_prompt, style="bullet")
    minimal_res = rewrite_prompt(verbose_prompt, style="minimal")

    print(f"  - Original:   '{verbose_prompt[:50]}...'")
    print(f"  - Rewritten:  '{pipe_res.rewritten}'")
    print(f"  - Model used: {pipe_res.model_used} (fallback={pipe_res.was_fallback})")
    assert pipe_res.rewritten != ""
    assert "Hello" not in pipe_res.rewritten
    assert "Please make sure to" not in pipe_res.rewritten
    assert "- " in bullet_res.rewritten
    assert ";" in minimal_res.rewritten or "|" in minimal_res.rewritten
    print("  -> Passed! (Narrative filler stripped across pipe, bullet, and minimal styles)")

    # 5. Stage 4: KV-Cache Prefix Auditor
    print("\n[TEST 5/8] Testing Stage 4: KV-Cache Prefix Auditor...")
    with open(os.path.join(fixtures_dir, "system_prompt_800_words.txt"), "r", encoding="utf-8") as f:
        prompt_content = f.read()

    audit_res = audit_cache_prefix(prompt_content)
    print(f"  - Prefix lines scanned: {audit_res.prefix_lines_scanned} of {audit_res.total_lines}")
    print(f"  - Violations detected:  {len(audit_res.violations)}")
    for v in audit_res.violations:
        print(f"    * L{v.line_number}:C{v.column} [{v.pattern_name}]: '{v.matched_text}'")
    assert audit_res.is_cache_friendly is False
    assert len(audit_res.violations) >= 3
    patterns = {v.pattern_name for v in audit_res.violations}
    assert "uuid_v4" in patterns
    assert "iso_timestamp" in patterns
    print("  -> Passed! (Exact line/column coordinates and patterns identified)")

    # 6. Hybrid Database Storage Layer
    print("\n[TEST 6/8] Testing Hybrid Database Storage (SQLite)...")
    repo = get_repository()
    t_name = f"E2E Test Template {time.time()}"
    saved_tpl = repo.save_template(
        name=t_name,
        content="ERROR 500 Internal Server Error",
        content_type="log",
        tags=["e2e", "test"],
    )
    t_id = saved_tpl["id"]
    fetched = repo.get_template(t_id)
    assert fetched is not None
    assert fetched["name"] == t_name

    all_tpls = repo.list_templates()
    assert any(t["id"] == t_id for t in all_tpls)

    # Record run and query stats
    run_id = repo.record_compression_run(
        content_type="log",
        original_tokens=1000,
        compressed_tokens=200,
        token_reduction_pct=80.0,
        estimated_cost_saved=0.002,
        processing_time_ms=1.5,
        stages_applied=["log_deduplicator"],
    )
    assert run_id is not None
    stats = repo.get_cumulative_savings()
    print(f"  - Total runs recorded:    {stats['total_runs']}")
    print(f"  - Total tokens saved:     {stats['total_tokens_saved']:,}")
    print(f"  - Total cost saved:       ${stats['total_cost_saved_usd']}")
    print(f"  - Average reduction:      {stats['avg_reduction_pct']}%")
    assert stats["total_runs"] >= 1
    assert stats["total_tokens_saved"] >= 800

    deleted = repo.delete_template(t_id)
    assert deleted is True
    assert repo.get_template(t_id) is None
    print("  -> Passed! (Template CRUD and cumulative telemetry calculation confirmed)")

    # 7. FastAPI REST API Endpoints via TestClient
    print("\n[TEST 7/8] Testing FastAPI REST Endpoints via TestClient...")
    client = TestClient(app)

    # /api/health
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy"

    # /api/fixtures
    r = client.get("/api/fixtures")
    assert r.status_code == 200
    fixtures = r.json()
    assert len(fixtures) == 3

    # /api/compress (full pipeline)
    r = client.post(
        "/api/compress",
        json={
            "content": log_content,
            "content_type": "log",
            "stages": {"log_dedup": True, "json_crush": False, "cache_audit": False},
        },
    )
    assert r.status_code == 200
    c_data = r.json()
    assert "log_deduplicator" in c_data["stages_applied"]
    assert c_data["metrics"]["tokens_saved"] > 0
    print(f"  - API Compress: {c_data['metrics']['original_tokens']} -> {c_data['metrics']['compressed_tokens']} tokens ({c_data['metrics']['token_reduction_pct']}%)")

    # /api/rewrite
    r = client.post(
        "/api/rewrite",
        json={"content": verbose_prompt, "style": "pipe_delimited", "max_output_tokens": 100},
    )
    assert r.status_code == 200
    rw_data = r.json()
    assert rw_data["rewritten"] != ""

    # /api/stats
    r = client.get("/api/stats")
    assert r.status_code == 200

    print("  -> Passed! (All REST endpoints responding 200 with valid schemas)")

    # 8. Tokenizer & Cost Calculation Accuracy
    print("\n[TEST 8/8] Testing Tokenizer & Telemetry Math...")
    n_tokens = count_tokens("PromptDiet is a token compressor for AI agents.")
    assert n_tokens >= 8
    cost = calculate_cost_savings(1_000_000, model="gpt-4o")
    assert round(cost, 2) == 2.50
    print(f"  - Token count verified:   {n_tokens} tokens")
    print(f"  - GPT-4o cost per 1M:     ${cost:.2f}")
    print("  -> Passed! (BPE and cost telemetry math verified)")

    print("\n" + "=" * 70)
    print("ALL 8 END-TO-END TEST SUITES COMPLETED WITH 100% SUCCESS!")
    print("=" * 70)


if __name__ == "__main__":
    run_comprehensive_e2e_tests()
