from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from backend.app.auth import get_current_user
from backend.app.database import get_db
from backend.app.schemas import MonthlyTrendItem, CategoryItem, PaymentMethodItem, TransactionResponse
from backend.app.services.analytics_service import (
    get_monthly_analytics,
    get_category_analytics,
    get_payment_method_analytics
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/monthly", response_model=List[MonthlyTrendItem])
def get_monthly(current_user: dict = Depends(get_current_user)):
    """Retrieve monthly spending aggregates in chronological order."""
    return get_monthly_analytics(current_user["id"])

@router.get("/categories", response_model=List[CategoryItem])
def get_categories(current_user: dict = Depends(get_current_user)):
    """Retrieve category-wise spending totals and percentage distributions."""
    return get_category_analytics(current_user["id"])

@router.get("/payment-methods", response_model=List[PaymentMethodItem])
def get_payment_methods(current_user: dict = Depends(get_current_user)):
    """Retrieve payment-method distribution and percentage share."""
    return get_payment_method_analytics(current_user["id"])

@router.get("/top-transactions", response_model=List[TransactionResponse])
def get_top_transactions(
    limit: int = 5,
    current_user: dict = Depends(get_current_user)
):
    """Retrieve the highest-value transactions for the authenticated user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM transactions
            WHERE user_id = ?
            ORDER BY amount DESC
            LIMIT ?
        """, (current_user["id"], limit))
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
