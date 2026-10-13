import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import Response, PlainTextResponse, HTMLResponse
from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.audit import log_audit_event
from backend.app.schemas import ReportItem, S3UploadResponse, S3ConfigStatusResponse
from backend.app.services.report_service import (
    generate_cleaned_csv,
    generate_anomaly_csv,
    generate_html_summary_report,
    record_generated_report
)
from backend.app.services.s3_service import (
    check_s3_configuration,
    upload_report_bytes_to_s3
)

router = APIRouter(prefix="/reports", tags=["Reports & S3"])

@router.get("/download")
def download_report(
    format: str = Query("html", enum=["html", "cleaned_csv", "anomaly_csv"]),
    current_user: dict = Depends(get_current_user)
):
    """Generate and download reports locally in CSV or HTML format."""
    user_id = current_user["id"]
    timestamp = uuid.uuid4().hex[:6]

    if format == "cleaned_csv":
        csv_data = generate_cleaned_csv(user_id)
        filename = f"spendsense_cleaned_expenses_{timestamp}.csv"
        log_audit_event("REPORT_DOWNLOAD", user_id=user_id, details=f"Downloaded cleaned CSV report: {filename}")
        record_generated_report(user_id, filename, "cleaned_csv")
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == "anomaly_csv":
        csv_data = generate_anomaly_csv(user_id)
        filename = f"spendsense_anomalies_{timestamp}.csv"
        log_audit_event("REPORT_DOWNLOAD", user_id=user_id, details=f"Downloaded anomaly CSV report: {filename}")
        record_generated_report(user_id, filename, "anomaly_csv")
        return Response(
            content=csv_data,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    else: # HTML summary
        html_data = generate_html_summary_report(user_id, current_user)
        filename = f"spendsense_summary_report_{timestamp}.html"
        log_audit_event("REPORT_DOWNLOAD", user_id=user_id, details=f"Downloaded HTML summary report: {filename}")
        record_generated_report(user_id, filename, "html")
        return Response(
            content=html_data,
            media_type="text/html",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

@router.get("/preview-html", response_class=HTMLResponse)
def preview_html_report(current_user: dict = Depends(get_current_user)):
    """Render the HTML summary report directly in the browser."""
    return generate_html_summary_report(current_user["id"], current_user)

@router.post("/upload-to-s3", response_model=S3UploadResponse)
def upload_report_to_s3(
    format: str = Query("html", enum=["html", "cleaned_csv", "anomaly_csv"]),
    current_user: dict = Depends(get_current_user)
):
    """
    Export and upload a report to a private Amazon S3 bucket under the user's isolated path.
    """
    user_id = current_user["id"]
    report_uid = f"REP-{uuid.uuid4().hex[:8].upper()}"

    if format == "cleaned_csv":
        data_str = generate_cleaned_csv(user_id)
        filename = f"cleaned_expenses_{report_uid}.csv"
        content_type = "text/csv"
    elif format == "anomaly_csv":
        data_str = generate_anomaly_csv(user_id)
        filename = f"anomalies_{report_uid}.csv"
        content_type = "text/csv"
    else:
        data_str = generate_html_summary_report(user_id, current_user)
        filename = f"summary_report_{report_uid}.html"
        content_type = "text/html"

    file_bytes = data_str.encode("utf-8")

    success, message, s3_key = upload_report_bytes_to_s3(
        file_bytes=file_bytes,
        user_id=user_id,
        report_id=report_uid,
        filename=filename,
        content_type=content_type
    )

    if not success:
        log_audit_event("S3_UPLOAD_FAILED", user_id=user_id, details=f"S3 upload failed for {filename}: {message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )

    # Save to reports table
    record_generated_report(
        user_id=user_id,
        report_name=filename,
        report_type=format,
        s3_key=s3_key,
        s3_status="uploaded_to_s3"
    )

    log_audit_event(
        "S3_UPLOAD_SUCCESS",
        user_id=user_id,
        details=f"Report {filename} saved to private S3 bucket key '{s3_key}'."
    )

    return {
        "success": True,
        "message": message,
        "s3_key": s3_key,
        "bucket": s3_key.split("/")[0] if s3_key else None
    }

@router.get("/s3-status", response_model=S3ConfigStatusResponse)
def get_s3_status():
    """Retrieve S3 integration status and least-privilege configuration guidelines."""
    return check_s3_configuration()

@router.get("/history", response_model=List[ReportItem])
def get_report_history(current_user: dict = Depends(get_current_user)):
    """Retrieve history of generated reports for the current user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, report_id, report_name, report_type, total_transactions, total_amount, anomaly_count, duplicate_count, s3_key, s3_status, created_at
            FROM reports
            WHERE user_id = ?
            ORDER BY id DESC
        """, (current_user["id"],))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
