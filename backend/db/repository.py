from typing import Protocol, Any, runtime_checkable
import json
import uuid
from datetime import datetime, timezone


@runtime_checkable
class AbstractRepository(Protocol):
    """Abstract interface for local SQLite and cloud Supabase storage adapters."""

    def save_template(
        self, name: str, content: str, content_type: str, tags: list[str]
    ) -> dict[str, Any]:
        """Save a new prompt template and return its stored record."""
        ...

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        """Fetch a single template by ID."""
        ...

    def list_templates(self) -> list[dict[str, Any]]:
        """List all saved templates."""
        ...

    def delete_template(self, template_id: str) -> bool:
        """Delete a template by ID, returning True if deleted."""
        ...

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
        """Record an optimization run and return run ID."""
        ...

    def get_cumulative_savings(self) -> dict[str, Any]:
        """Calculate total tokens saved and total cost saved across all runs."""
        ...


def get_repository() -> AbstractRepository:
    """Factory creating the appropriate repository adapter based on runtime settings."""
    from config import settings

    if settings.supabase_url and settings.supabase_key:
        from db.supabase_adapter import SupabaseAdapter

        return SupabaseAdapter(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_key,
        )

    from db.sqlite_adapter import SQLiteAdapter

    return SQLiteAdapter(db_path=settings.sqlite_path)

