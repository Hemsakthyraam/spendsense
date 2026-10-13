import io
import uuid
import json
from datetime import datetime
from typing import Dict, Any, Tuple
import pandas as pd
from backend.app.database import get_db

def generate_cleaned_csv(user_id: int) -> str:
    """Generate CSV string of all cleaned user transactions with anomaly fields."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                transaction_id, date, description, category, amount, payment_method, 
                is_anomaly, anomaly_score, anomaly_reason
            FROM transactions
            WHERE user_id = ?
            ORDER BY date DESC
        """, (user_id,))
        rows = cursor.fetchall()

    if not rows:
        return "transaction_id,date,description,category,amount,payment_method,is_anomaly,anomaly_score,anomaly_reason\n"

    df = pd.DataFrame([dict(r) for r in rows])
    return df.to_csv(index=False)

def generate_anomaly_csv(user_id: int) -> str:
    """Generate CSV string of detected anomalous transactions only."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                transaction_id, date, description, category, amount, payment_method, 
                anomaly_score, anomaly_reason
            FROM transactions
            WHERE user_id = ? AND is_anomaly = 1
            ORDER BY anomaly_score DESC
        """, (user_id,))
        rows = cursor.fetchall()

    if not rows:
        return "transaction_id,date,description,category,amount,payment_method,anomaly_score,anomaly_reason\n"

    df = pd.DataFrame([dict(r) for r in rows])
    return df.to_csv(index=False)

def generate_html_summary_report(user_id: int, user_info: Dict[str, Any]) -> str:
    """Generate a self-contained, professional HTML executive report."""
    with get_db() as conn:
        cursor = conn.cursor()
        # Summary
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0.0) as total_amount,
                COALESCE(AVG(amount), 0.0) as avg_amount
            FROM transactions WHERE user_id = ?
        """, (user_id,))
        summary = cursor.fetchone()

        # Anomalies
        cursor.execute("""
            SELECT transaction_id, date, description, category, amount, payment_method, anomaly_score, anomaly_reason
            FROM transactions 
            WHERE user_id = ? AND is_anomaly = 1
            ORDER BY anomaly_score DESC
        """, (user_id,))
        anomalies = [dict(r) for r in cursor.fetchall()]

        # Categories
        cursor.execute("""
            SELECT category, ROUND(SUM(amount), 2) as amount, COUNT(*) as count
            FROM transactions
            WHERE user_id = ?
            GROUP BY category
            ORDER BY amount DESC
        """, (user_id,))
        categories = [dict(r) for r in cursor.fetchall()]

    total_amt = float(summary["total_amount"])
    total_cnt = int(summary["total_count"])
    avg_amt = float(summary["avg_amount"])
    anom_cnt = len(anomalies)

    rows_html = ""
    for anom in anomalies:
        rows_html += f"""
        <tr>
            <td><strong>{anom['transaction_id'] or 'N/A'}</strong></td>
            <td>{anom['date']}</td>
            <td>{anom['description']}</td>
            <td><span class="badge cat">{anom['category']}</span></td>
            <td><strong>₹{float(anom['amount']):,.2f}</strong></td>
            <td><span class="badge score">{anom['anomaly_score']}%</span></td>
            <td><small>{anom['anomaly_reason'] or ''}</small></td>
        </tr>
        """

    cat_rows_html = ""
    for c in categories:
        pct = round((c['amount'] / total_amt * 100), 1) if total_amt > 0 else 0
        cat_rows_html += f"""
        <tr>
            <td>{c['category']}</td>
            <td>₹{float(c['amount']):,.2f}</td>
            <td>{c['count']}</td>
            <td>{pct}%</td>
        </tr>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>SpendSense — Anomaly & Expense Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 30px; }}
        .container {{ max-width: 900px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }}
        .logo {{ font-size: 24px; font-weight: 800; color: #0f172a; }}
        .logo span {{ color: #10b981; }}
        .meta {{ font-size: 13px; color: #64748b; text-align: right; }}
        .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 25px 0; }}
        .card {{ background: #f1f5f9; padding: 18px; border-radius: 8px; border-left: 4px solid #6366f1; }}
        .card.alert {{ border-left-color: #ef4444; }}
        .card-val {{ font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 5px; }}
        .card-lbl {{ font-size: 12px; font-weight: 600; text-transform: uppercase; color: #64748b; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }}
        th, td {{ padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }}
        th {{ background: #f8fafc; font-weight: 600; color: #475569; }}
        .badge {{ padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
        .badge.cat {{ background: #e0e7ff; color: #3730a3; }}
        .badge.score {{ background: #fee2e2; color: #991b1b; }}
        .disclaimer {{ margin-top: 30px; padding: 15px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; font-size: 12px; color: #92400e; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <div class="logo">Spend<span>Sense</span></div>
                <div style="font-size: 14px; color: #64748b;">Personal Expense Anomaly Detector</div>
            </div>
            <div class="meta">
                <div><strong>User:</strong> {user_info.get('username', 'N/A')} ({user_info.get('email', '')})</div>
                <div><strong>Generated:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}</div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-lbl">Total Spending</div>
                <div class="card-val">₹{total_amt:,.2f}</div>
            </div>
            <div class="card">
                <div class="card-lbl">Total Transactions</div>
                <div class="card-val">{total_cnt}</div>
            </div>
            <div class="card">
                <div class="card-lbl">Average Amount</div>
                <div class="card-val">₹{avg_amt:,.2f}</div>
            </div>
            <div class="card alert">
                <div class="card-lbl">Detected Anomalies</div>
                <div class="card-val">{anom_cnt}</div>
            </div>
        </div>

        <h3>Flagged Anomaly Transactions</h3>
        {('<p style="color:#64748b;">No anomalous transactions detected in current dataset.</p>' if not anomalies else f'''
        <table>
            <thead>
                <tr>
                    <th>Txn ID</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Severity</th>
                    <th>Reason / Anomaly Indicator</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        ''')}

        <h3 style="margin-top: 30px;">Category Breakdown</h3>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total Spent</th>
                    <th>Transactions</th>
                    <th>Share</th>
                </tr>
            </thead>
            <tbody>
                {cat_rows_html}
            </tbody>
        </table>

        <div class="disclaimer">
            <strong>AI Engineering Notice:</strong> Anomaly detection is generated via Scikit-Learn Isolation Forest machine learning model. An anomaly indicates an unusual transaction pattern (amount, category ratio, or date cadence) and is not necessarily fraudulent or unauthorized.
        </div>

        <div class="footer">
            SpendSense Mini-Project | Wipro CPPE Submission | Automated Report Generation
        </div>
    </div>
</body>
</html>
"""
    return html

def record_generated_report(
    user_id: int,
    report_name: str,
    report_type: str,
    s3_key: str = None,
    s3_status: str = "local_only"
) -> Dict[str, Any]:
    """Store report metadata record in the reports table."""
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount), 0.0) as total_amount
            FROM transactions WHERE user_id = ?
        """, (user_id,))
        sum_row = cursor.fetchone()

        cursor.execute("SELECT COUNT(*) FROM transactions WHERE user_id = ? AND is_anomaly = 1", (user_id,))
        anom_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM duplicate_records WHERE user_id = ?", (user_id,))
        dup_count = cursor.fetchone()[0]

        cursor.execute("""
            INSERT INTO reports (
                user_id, report_id, report_name, report_type,
                total_transactions, total_amount, anomaly_count, duplicate_count,
                s3_key, s3_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id, report_id, report_name, report_type,
            int(sum_row["total_count"]), float(sum_row["total_amount"]),
            int(anom_count), int(dup_count),
            s3_key, s3_status
        ))
        
        cursor.execute("SELECT * FROM reports WHERE report_id = ?", (report_id,))
        saved = cursor.fetchone()
        return dict(saved)
