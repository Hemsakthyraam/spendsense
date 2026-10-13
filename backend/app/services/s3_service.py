import io
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from typing import Dict, Any, Tuple
from backend.app.config import settings

def get_s3_client():
    """Create a Boto3 S3 client using environment variables or standard AWS credential chains."""
    kwargs = {}
    if settings.AWS_REGION:
        kwargs["region_name"] = settings.AWS_REGION
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
    
    return boto3.client("s3", **kwargs)

def check_s3_configuration() -> Dict[str, Any]:
    """Check whether AWS S3 is configured and provide setup instructions."""
    is_cfg = settings.is_s3_configured
    return {
        "is_configured": is_cfg,
        "bucket": settings.AWS_S3_BUCKET if is_cfg else None,
        "region": settings.AWS_REGION if is_cfg else None,
        "instructions": (
            "To enable AWS S3 Report Archival:\n"
            "1. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, and AWS_REGION in backend/.env\n"
            "2. Ensure the IAM policy grants s3:PutObject and s3:GetObject on the private bucket.\n"
            "3. Ensure the S3 bucket has 'Block Public Access' ENABLED (least privilege principle).\n"
            "Note: SpendSense works completely locally with local report generation and downloads if S3 is not configured."
        )
    }

def upload_report_bytes_to_s3(
    file_bytes: bytes,
    user_id: int,
    report_id: str,
    filename: str,
    content_type: str = "text/csv"
) -> Tuple[bool, str, str]:
    """
    Upload a report to a private Amazon S3 bucket under a user-isolated prefix.
    
    Returns:
        (success: bool, message: str, s3_key: str)
    """
    if not settings.is_s3_configured:
        return False, "AWS S3 is not configured. Please configure AWS credentials in your .env file or environment variables.", ""

    # User-specific prefix to enforce cloud-level user isolation
    s3_key = f"reports/user_{user_id}/{report_id}_{filename}"

    try:
        s3 = get_s3_client()
        # Upload object without public ACL to ensure privacy
        s3.put_object(
            Bucket=settings.AWS_S3_BUCKET,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
            ServerSideEncryption="AES256" # Server-side encryption at rest
        )
        return True, f"Successfully uploaded report to private S3 bucket '{settings.AWS_S3_BUCKET}' at key '{s3_key}'.", s3_key
    except NoCredentialsError:
        return False, "AWS credentials were not found. Please provide valid AWS credentials.", ""
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", str(e))
        return False, f"AWS S3 Client Error ({error_code}): {error_msg}", ""
    except Exception as e:
        return False, f"Unexpected error during S3 upload: {str(e)}", ""
