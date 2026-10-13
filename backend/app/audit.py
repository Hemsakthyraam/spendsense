from typing import Optional
from backend.app.database import get_db

def log_audit_event(
    action: str,
    user_id: Optional[int] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Record a security or application event into the audit_logs table."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO audit_logs (user_id, action, details, ip_address)
                VALUES (?, ?, ?, ?)
                """,
                (user_id, action, details, ip_address)
            )
    except Exception as e:
        # Audit logging failure should not crash primary flow, but print safely
        print(f"[AUDIT LOGGING ERROR] Failed to record audit event '{action}': {e}")

def get_user_audit_logs(user_id: int, limit: int = 50) -> list[dict]:
    """Retrieve audit logs for a specific user, ordered from most recent."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, action, details, ip_address, timestamp
            FROM audit_logs
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (user_id, limit)
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
