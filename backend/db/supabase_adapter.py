import json
import uuid
from datetime import datetime, timezone
from typing import Any
import httpx


class SupabaseAdapter:
    """Supabase REST (PostgREST HTTPS) repository implementing AbstractRepository.

    Communicates over port 443 to bypass blocked raw PostgreSQL (port 5432) on free container tiers.
    """

    def __init__(self, supabase_url: str, supabase_key: str) -> None:
        self.base_url = supabase_url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    def save_template(
        self, name: str, content: str, content_type: str, tags: list[str]
    ) -> dict[str, Any]:
        template_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": template_id,
            "name": name,
            "content": content,
            "content_type": content_type,
            "tags": json.dumps(tags),
            "created_at": now,
            "updated_at": now,
        }

        with httpx.Client(timeout=10.0) as client:
            resp = client.post(
                f"{self.base_url}/prompt_templates",
                headers=self.headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()[0]
            data["tags"] = json.loads(data["tags"])
            return data

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{self.base_url}/prompt_templates?id=eq.{template_id}",
                headers=self.headers,
            )
            if resp.status_code == 200 and resp.json():
                row = resp.json()[0]
                row["tags"] = json.loads(row["tags"]) if isinstance(row["tags"], str) else row["tags"]
                return row
            return None

    def list_templates(self) -> list[dict[str, Any]]:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{self.base_url}/prompt_templates?order=updated_at.desc",
                headers=self.headers,
            )
            if resp.status_code == 200:
                rows = resp.json()
                for row in rows:
                    if isinstance(row.get("tags"), str):
                        row["tags"] = json.loads(row["tags"])
                return rows
            return []

    def delete_template(self, template_id: str) -> bool:
        with httpx.Client(timeout=10.0) as client:
            resp = client.delete(
                f"{self.base_url}/prompt_templates?id=eq.{template_id}",
                headers=self.headers,
            )
            return resp.status_code in (200, 204)

    def record_compression_run(
        self,
        content_type: str,
        original_tokens: int,
        compressed_tokens: int,
        token_reduction_pct: float,
        estimated_cost_saved: float,
        processing_time_ms: float,
        stages_applied: list[str],
        cache_violations_count: int = 0,
        template_id: str | None = None,
    ) -> str:
        run_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        payload = {
            "id": run_id,
            "template_id": template_id,
            "content_type": content_type,
            "original_tokens": original_tokens,
            "compressed_tokens": compressed_tokens,
            "token_reduction_pct": token_reduction_pct,
            "estimated_cost_saved": estimated_cost_saved,
            "processing_time_ms": processing_time_ms,
            "stages_applied": json.dumps(stages_applied),
            "cache_violations_count": cache_violations_count,
            "created_at": now,
        }

        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{self.base_url}/compression_runs",
                headers=self.headers,
                json=payload,
            )
        return run_id

    def get_cumulative_savings(self) -> dict[str, Any]:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                f"{self.base_url}/compression_runs?select=original_tokens,compressed_tokens,estimated_cost_saved,token_reduction_pct",
                headers=self.headers,
            )
            if resp.status_code == 200:
                rows = resp.json()
                total_runs = len(rows)
                total_tokens = sum(r["original_tokens"] - r["compressed_tokens"] for r in rows)
                total_cost = sum(r["estimated_cost_saved"] for r in rows)
                avg_reduction = (
                    sum(r["token_reduction_pct"] for r in rows) / total_runs
                    if total_runs > 0
                    else 0.0
                )
                return {
                    "total_runs": total_runs,
                    "total_tokens_saved": total_tokens,
                    "total_cost_saved_usd": round(total_cost, 6),
                    "avg_reduction_pct": round(avg_reduction, 2),
                }
            return {
                "total_runs": 0,
                "total_tokens_saved": 0,
                "total_cost_saved_usd": 0.0,
                "avg_reduction_pct": 0.0,
            }

