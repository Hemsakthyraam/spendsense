import os
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query, Response
from fastapi.responses import FileResponse, PlainTextResponse
from backend.app.config import settings
from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.audit import log_audit_event
from backend.app.schemas import (
    TransactionResponse,
    DuplicateResponse,
    UploadSummaryResponse,
    DashboardSummaryResponse,
    AnomalyDetectionRequest,
    AnomalyDetectionResponse
)
from backend.app.services.data_cleaning import clean_and_validate_expense_csv
from backend.app.services.anomaly_detection import run_expense_anomaly_detection
from backend.app.services.analytics_service import get_user_dashboard_summary

router = APIRouter(prefix="/transactions", tags=["Transactions"])

@router.post("/upload", response_model=UploadSummaryResponse)
async def upload_transactions_csv(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Ingest, validate, clean, and detect duplicates in an uploaded CSV file.
    Runs automated anomaly detection upon successful import.
    """
    user_id = current_user["id"]

    # 1. Validate file extension & mime type
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a standard comma-separated (.csv) file."
        )

    # 2. Read bytes and enforce file size constraint
    contents = await file.read()
    if len(contents) > settings.MAX_CSV_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowable size of {settings.MAX_CSV_SIZE_BYTES // (1024*1024)} MB."
        )

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty. Please upload a valid CSV file with transaction records."
        )

    # 3. Fetch existing user records for cross-dataset duplicate checks
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT transaction_id, date, description, category, amount FROM transactions WHERE user_id = ?", (user_id,))
        existing_txns = [dict(r) for r in cursor.fetchall()]

    # 4. Clean, validate, and identify duplicates
    valid_records, duplicate_records, rejection_errors = clean_and_validate_expense_csv(contents, existing_txns)

    if not valid_records and not duplicate_records and rejection_errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"CSV processing failed: {rejection_errors[0]}"
        )

    # 5. Persist imported transactions & duplicate logs to SQLite
    imported_count = 0
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Insert valid records
        for rec in valid_records:
            cursor.execute("""
                INSERT INTO transactions (user_id, transaction_id, date, description, category, amount, payment_method)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                rec["transaction_id"],
                rec["date"],
                rec["description"],
                rec["category"],
                rec["amount"],
                rec["payment_method"]
            ))
            imported_count += 1

        # Insert duplicate records
        for dup in duplicate_records:
            cursor.execute("""
                INSERT INTO duplicate_records (user_id, transaction_id, date, description, category, amount, payment_method, duplicate_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                dup.get("transaction_id"),
                dup["date"],
                dup["description"],
                dup["category"],
                dup["amount"],
                dup["payment_method"],
                dup["duplicate_reason"]
            ))

    # 6. Run automated Anomaly Detection if we have transactions
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE user_id = ?", (user_id,))
        all_user_txns = [dict(r) for r in cursor.fetchall()]

    if all_user_txns:
        updated_txns, _ = run_expense_anomaly_detection(all_user_txns, contamination=0.08)
        with get_db() as conn:
            cursor = conn.cursor()
            for ut in updated_txns:
                cursor.execute("""
                    UPDATE transactions 
                    SET is_anomaly = ?, anomaly_score = ?, anomaly_reason = ?
                    WHERE id = ?
                """, (ut["is_anomaly"], ut["anomaly_score"], ut["anomaly_reason"], ut["id"]))

    # 7. Audit log
    log_audit_event(
        "CSV_IMPORT",
        user_id=user_id,
        details=f"Imported {imported_count} records, identified {len(duplicate_records)} duplicates, rejected {len(rejection_errors)} rows from {file.filename}."
    )

    total_proc = len(valid_records) + len(duplicate_records) + len(rejection_errors)
    msg = f"Successfully imported {imported_count} transaction(s)."
    if duplicate_records:
        msg += f" {len(duplicate_records)} duplicate record(s) were flagged and separated."
    if rejection_errors:
        msg += f" {len(rejection_errors)} row(s) had invalid formatting."

    return {
        "total_processed": total_proc,
        "imported_count": imported_count,
        "duplicate_count": len(duplicate_records),
        "rejected_count": len(rejection_errors),
        "rejected_errors": rejection_errors[:10],
        "message": msg
    }

@router.get("", response_model=List[TransactionResponse])
def get_transactions(
    category: Optional[str] = None,
    is_anomaly: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = "date",
    order: Optional[str] = "desc",
    current_user: dict = Depends(get_current_user)
):
    """Retrieve filtered and sorted transactions for the authenticated user."""
    user_id = current_user["id"]
    query = "SELECT * FROM transactions WHERE user_id = ?"
    params = [user_id]

    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)

    if is_anomaly is not None:
        query += " AND is_anomaly = ?"
        params.append(is_anomaly)

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    if min_amount is not None:
        query += " AND amount >= ?"
        params.append(min_amount)

    if max_amount is not None:
        query += " AND amount <= ?"
        params.append(max_amount)

    if search:
        query += " AND (description LIKE ? OR transaction_id LIKE ?)"
        term = f"%{search.strip()}%"
        params.extend([term, term])

    # Sorting
    allowed_sorts = {
        "date": "date",
        "amount": "amount",
        "score": "anomaly_score",
        "id": "id"
    }
    sort_col = allowed_sorts.get(sort_by, "date")
    sort_dir = "ASC" if order.lower() == "asc" else "DESC"
    query += f" ORDER BY {sort_col} {sort_dir}, id DESC"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_summary(current_user: dict = Depends(get_current_user)):
    """Retrieve full dashboard KPI cards and summary statistics."""
    return get_user_dashboard_summary(current_user["id"])

@router.get("/anomalies", response_model=List[TransactionResponse])
def get_anomalies(current_user: dict = Depends(get_current_user)):
    """Retrieve only the anomalous transactions flagged by Isolation Forest."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM transactions 
            WHERE user_id = ? AND is_anomaly = 1 
            ORDER BY anomaly_score DESC, amount DESC
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.get("/duplicates", response_model=List[DuplicateResponse])
def get_duplicates(current_user: dict = Depends(get_current_user)):
    """Retrieve all flagged duplicate records."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM duplicate_records 
            WHERE user_id = ? 
            ORDER BY detected_at DESC, id DESC
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

@router.post("/detect-anomalies", response_model=AnomalyDetectionResponse)
def trigger_anomaly_detection(
    req: AnomalyDetectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually execute or re-tune Isolation Forest anomaly detection."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM transactions WHERE user_id = ?", (user_id,))
        transactions = [dict(r) for r in cursor.fetchall()]

    if not transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transactions found to analyze. Please upload transaction records first."
        )

    updated_txns, summary = run_expense_anomaly_detection(transactions, contamination=req.contamination)

    with get_db() as conn:
        cursor = conn.cursor()
        for ut in updated_txns:
            cursor.execute("""
                UPDATE transactions 
                SET is_anomaly = ?, anomaly_score = ?, anomaly_reason = ?
                WHERE id = ?
            """, (ut["is_anomaly"], ut["anomaly_score"], ut["anomaly_reason"], ut["id"]))

    log_audit_event(
        "ANOMALY_RUN",
        user_id=user_id,
        details=f"Ran Isolation Forest with contamination={req.contamination}. Flagged {summary['anomaly_count']} anomalies across {summary['total_analyzed']} records."
    )

    return summary

@router.get("/sample-csv")
def download_sample_csv():
    """Download the synthetic sample expense dataset."""
    sample_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "sample_data", "sample_expenses.csv")
    if os.path.exists(sample_file):
        return FileResponse(
            path=sample_file,
            filename="sample_expenses.csv",
            media_type="text/csv"
        )
    raise HTTPException(status_code=404, detail="Sample dataset not found.")

@router.delete("/clear")
def clear_user_data(current_user: dict = Depends(get_current_user)):
    """Reset user transactions and duplicate records."""
    user_id = current_user["id"]
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM duplicate_records WHERE user_id = ?", (user_id,))
    
    log_audit_event("DATA_RESET", user_id=user_id, details="User cleared all transactions and duplicates.")
    return {"message": "All transaction data has been cleared successfully."}
