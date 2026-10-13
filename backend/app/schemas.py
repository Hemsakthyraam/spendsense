from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# --- User & Auth Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    created_at: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Transaction Schemas ---
class TransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_id: Optional[str] = None
    date: str
    description: str
    category: str
    amount: float
    payment_method: str
    is_anomaly: int
    anomaly_score: float
    anomaly_reason: Optional[str] = None
    created_at: Optional[str] = None

class DuplicateResponse(BaseModel):
    id: int
    user_id: int
    transaction_id: Optional[str] = None
    date: str
    description: str
    category: str
    amount: float
    payment_method: str
    duplicate_reason: str
    detected_at: Optional[str] = None

class UploadSummaryResponse(BaseModel):
    total_processed: int
    imported_count: int
    duplicate_count: int
    rejected_count: int
    rejected_errors: List[str]
    message: str

class DashboardSummaryResponse(BaseModel):
    total_expenses: float
    avg_transaction: float
    transaction_count: int
    anomaly_count: int
    duplicate_count: int
    highest_transaction: Optional[dict] = None
    recent_transactions: List[dict] = []
    category_summary: List[dict] = []
    monthly_trend: List[dict] = []

# --- Anomaly Schemas ---
class AnomalyDetectionRequest(BaseModel):
    contamination: float = Field(0.08, ge=0.01, le=0.50)
    sensitivity: Optional[str] = "medium"  # low, medium, high

class AnomalyDetectionResponse(BaseModel):
    total_analyzed: int
    anomaly_count: int
    contamination_rate: float
    status_message: str
    is_sufficient_data: bool
    disclaimer: str

# --- Analytics Schemas ---
class MonthlyTrendItem(BaseModel):
    month: str
    amount: float
    count: int

class CategoryItem(BaseModel):
    category: str
    amount: float
    count: int
    percentage: float

class PaymentMethodItem(BaseModel):
    payment_method: str
    amount: float
    count: int
    percentage: float

# --- Report & Cloud Schemas ---
class ReportItem(BaseModel):
    id: int
    report_id: str
    report_name: str
    report_type: str
    total_transactions: int
    total_amount: float
    anomaly_count: int
    duplicate_count: int
    s3_key: Optional[str] = None
    s3_status: str
    created_at: str

class S3UploadResponse(BaseModel):
    success: bool
    message: str
    s3_key: Optional[str] = None
    bucket: Optional[str] = None

class S3ConfigStatusResponse(BaseModel):
    is_configured: bool
    bucket: Optional[str] = None
    region: Optional[str] = None
    instructions: str

# --- Audit Log Schema ---
class AuditLogResponse(BaseModel):
    id: int
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: str
