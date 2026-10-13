from typing import Dict, List, Any
import pandas as pd
from backend.app.database import get_db

def get_user_dashboard_summary(user_id: int) -> Dict[str, Any]:
    """Calculate aggregate dashboard statistics for the authenticated user."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Total expenses, transaction count, avg amount
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0.0) as total_spent,
                COALESCE(AVG(amount), 0.0) as avg_amount
            FROM transactions 
            WHERE user_id = ?
        """, (user_id,))
        stats = cursor.fetchone()
        
        # 2. Anomaly count
        cursor.execute("""
            SELECT COUNT(*) as anom_count 
            FROM transactions 
            WHERE user_id = ? AND is_anomaly = 1
        """, (user_id,))
        anom_row = cursor.fetchone()

        # 3. Duplicate count
        cursor.execute("""
            SELECT COUNT(*) as dup_count 
            FROM duplicate_records 
            WHERE user_id = ?
        """, (user_id,))
        dup_row = cursor.fetchone()

        # 4. Highest transaction
        cursor.execute("""
            SELECT id, transaction_id, date, description, category, amount, payment_method, is_anomaly
            FROM transactions
            WHERE user_id = ?
            ORDER BY amount DESC
            LIMIT 1
        """, (user_id,))
        highest_row = cursor.fetchone()
        highest_txn = dict(highest_row) if highest_row else None

        # 5. Recent 5 transactions
        cursor.execute("""
            SELECT id, transaction_id, date, description, category, amount, payment_method, is_anomaly, anomaly_score, anomaly_reason
            FROM transactions
            WHERE user_id = ?
            ORDER BY date DESC, id DESC
            LIMIT 5
        """, (user_id,))
        recent_rows = cursor.fetchall()
        recent_txns = [dict(r) for r in recent_rows]

    # Category and Monthly summaries for mini cards
    category_summary = get_category_analytics(user_id)
    monthly_trend = get_monthly_analytics(user_id)

    return {
        "total_expenses": round(float(stats["total_spent"]), 2),
        "avg_transaction": round(float(stats["avg_amount"]), 2),
        "transaction_count": int(stats["total_count"]),
        "anomaly_count": int(anom_row["anom_count"]),
        "duplicate_count": int(dup_row["dup_count"]),
        "highest_transaction": highest_txn,
        "recent_transactions": recent_txns,
        "category_summary": category_summary,
        "monthly_trend": monthly_trend
    }

def get_monthly_analytics(user_id: int) -> List[Dict[str, Any]]:
    """Aggregate spending by month (YYYY-MM) in chronological order."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                SUBSTR(date, 1, 7) as month,
                ROUND(SUM(amount), 2) as amount,
                COUNT(*) as count
            FROM transactions
            WHERE user_id = ? AND LENGTH(date) >= 7
            GROUP BY SUBSTR(date, 1, 7)
            ORDER BY month ASC
        """, (user_id,))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def get_category_analytics(user_id: int) -> List[Dict[str, Any]]:
    """Aggregate spending by category with percentages."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                category,
                ROUND(SUM(amount), 2) as amount,
                COUNT(*) as count
            FROM transactions
            WHERE user_id = ?
            GROUP BY category
            ORDER BY amount DESC
        """, (user_id,))
        rows = cursor.fetchall()
        
        items = [dict(r) for r in rows]
        total_sum = sum(item["amount"] for item in items)
        
        for item in items:
            item["percentage"] = round((item["amount"] / total_sum * 100), 1) if total_sum > 0 else 0.0
            
        return items

def get_payment_method_analytics(user_id: int) -> List[Dict[str, Any]]:
    """Aggregate spending by payment method with percentages."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                payment_method,
                ROUND(SUM(amount), 2) as amount,
                COUNT(*) as count
            FROM transactions
            WHERE user_id = ?
            GROUP BY payment_method
            ORDER BY amount DESC
        """, (user_id,))
        rows = cursor.fetchall()
        
        items = [dict(r) for r in rows]
        total_sum = sum(item["amount"] for item in items)
        
        for item in items:
            item["percentage"] = round((item["amount"] / total_sum * 100), 1) if total_sum > 0 else 0.0
            
        return items
