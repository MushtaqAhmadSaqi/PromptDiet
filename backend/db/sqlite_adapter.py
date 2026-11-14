import os
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Any


class SQLiteAdapter:
    """Local SQLite repository implementing AbstractRepository."""

    def __init__(self, db_path: str = "data/promptdiet.db") -> None:
        # If relative path, ensure it's placed inside backend directory if not already
        if not os.path.isabs(db_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.db_path = os.path.join(base_dir, db_path)
        else:
            self.db_path = db_path

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._init_schema()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        """Create tables and indices if not already present."""
        with self._get_connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS prompt_templates (
                    id              TEXT PRIMARY KEY,
                    name            TEXT NOT NULL,
                    content         TEXT NOT NULL,
                    content_type    TEXT NOT NULL CHECK (content_type IN ('log', 'json', 'prompt')),
                    tags            TEXT DEFAULT '[]',
                    created_at      TEXT NOT NULL,
                    updated_at      TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS compression_runs (
                    id                      TEXT PRIMARY KEY,
                    template_id             TEXT,
                    content_type            TEXT NOT NULL,
                    original_tokens         INTEGER NOT NULL,
                    compressed_tokens       INTEGER NOT NULL,
                    token_reduction_pct     REAL NOT NULL,
                    estimated_cost_saved    REAL NOT NULL,
                    processing_time_ms      REAL NOT NULL,
                    stages_applied          TEXT NOT NULL,
                    cache_violations_count  INTEGER DEFAULT 0,
                    created_at              TEXT NOT NULL,
                    FOREIGN KEY (template_id) REFERENCES prompt_templates(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_templates_updated ON prompt_templates(updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_runs_created ON compression_runs(created_at DESC);
                """
            )

    def save_template(
        self, name: str, content: str, content_type: str, tags: list[str]
    ) -> dict[str, Any]:
        template_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        tags_json = json.dumps(tags)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO prompt_templates (id, name, content, content_type, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (template_id, name, content, content_type, tags_json, now, now),
            )
            conn.commit()

        return {
            "id": template_id,
            "name": name,
            "content": content,
            "content_type": content_type,
            "tags": tags,
            "created_at": now,
            "updated_at": now,
        }

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT id, name, content, content_type, tags, created_at, updated_at FROM prompt_templates WHERE id = ?",
                (template_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "id": row["id"],
                "name": row["name"],
                "content": row["content"],
                "content_type": row["content_type"],
                "tags": json.loads(row["tags"]),
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }

    def list_templates(self) -> list[dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT id, name, content, content_type, tags, created_at, updated_at FROM prompt_templates ORDER BY updated_at DESC"
            )
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "content": row["content"],
                    "content_type": row["content_type"],
                    "tags": json.loads(row["tags"]),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                }
                for row in rows
            ]

    def delete_template(self, template_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM prompt_templates WHERE id = ?", (template_id,)
            )
            conn.commit()
            return cursor.rowcount > 0

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
        stages_json = json.dumps(stages_applied)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO compression_runs (
                    id, template_id, content_type, original_tokens, compressed_tokens,
                    token_reduction_pct, estimated_cost_saved, processing_time_ms,
                    stages_applied, cache_violations_count, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    template_id,
                    content_type,
                    original_tokens,
                    compressed_tokens,
                    token_reduction_pct,
                    estimated_cost_saved,
                    processing_time_ms,
                    stages_json,
                    cache_violations_count,
                    now,
                ),
            )
            conn.commit()

        return run_id

    def get_cumulative_savings(self) -> dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT
                    COUNT(*) as total_runs,
                    COALESCE(SUM(original_tokens - compressed_tokens), 0) as total_tokens_saved,
                    COALESCE(SUM(estimated_cost_saved), 0.0) as total_cost_saved,
                    COALESCE(AVG(token_reduction_pct), 0.0) as avg_reduction_pct
                FROM compression_runs
                """
            )
            row = cursor.fetchone()
            return {
                "total_runs": row["total_runs"],
                "total_tokens_saved": row["total_tokens_saved"],
                "total_cost_saved_usd": round(row["total_cost_saved"], 6),
                "avg_reduction_pct": round(row["avg_reduction_pct"], 2),
            }

