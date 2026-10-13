import io
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Tuple, Any

# Standard category normalization map
CATEGORY_NORMALIZATION_MAP = {
    "grocery": "Groceries",
    "groceries": "Groceries",
    "supermarket": "Groceries",
    "food": "Dining",
    "dining": "Dining",
    "restaurant": "Dining",
    "coffee": "Dining",
    "café": "Dining",
    "transport": "Transportation",
    "transportation": "Transportation",
    "travel": "Travel",
    "flights": "Travel",
    "hotel": "Travel",
    "utilities": "Utilities",
    "utility": "Utilities",
    "electric": "Utilities",
    "water": "Utilities",
    "gas": "Utilities",
    "entertainment": "Entertainment",
    "movies": "Entertainment",
    "shopping": "Shopping",
    "apparel": "Shopping",
    "clothing": "Shopping",
    "electronics": "Shopping",
    "healthcare": "Healthcare",
    "medical": "Healthcare",
    "health": "Healthcare",
    "pharmacy": "Healthcare",
    "education": "Education",
    "school": "Education",
    "tuition": "Education",
    "books": "Education",
    "personal": "Personal Care",
    "other": "Other",
}

REQUIRED_COLUMNS = ["transaction_id", "date", "description", "category", "amount", "payment_method"]

def normalize_category_name(raw_cat: Any) -> str:
    """Normalize category names to standard professional capitalization."""
    if pd.isna(raw_cat) or not str(raw_cat).strip():
        return "Other"
    clean = str(raw_cat).strip().lower()
    return CATEGORY_NORMALIZATION_MAP.get(clean, clean.title())

def normalize_payment_method(raw_method: Any) -> str:
    """Normalize payment methods."""
    if pd.isna(raw_method) or not str(raw_method).strip():
        return "Other"
    clean = str(raw_method).strip().title()
    if "Credit" in clean:
        return "Credit Card"
    if "Debit" in clean:
        return "Debit Card"
    if "Transfer" in clean or "Bank" in clean:
        return "Bank Transfer"
    if "Cash" in clean:
        return "Cash"
    return clean

def clean_and_validate_expense_csv(
    file_bytes: bytes,
    existing_records: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[str]]:
    """
    Parse, validate, and clean uploaded expense CSV data.
    
    Returns:
        (valid_to_import, duplicate_records, rejection_errors)
    """
    rejection_errors = []
    valid_records = []
    duplicate_records = []

    # 1. Read CSV using Pandas
    try:
        # Try UTF-8 first, fallback to latin-1
        try:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
    except Exception as e:
        rejection_errors.append(f"Malformed CSV file: Unable to parse file format ({str(e)})")
        return [], [], rejection_errors

    # 2. Validate Required Columns
    df_cols_lower = {str(c).strip().lower(): c for c in df.columns}
    missing_cols = [req for req in REQUIRED_COLUMNS if req.lower() not in df_cols_lower]
    if missing_cols:
        rejection_errors.append(
            f"Missing required CSV columns: {', '.join(missing_cols)}. "
            f"Expected headers: {', '.join(REQUIRED_COLUMNS)}"
        )
        return [], [], rejection_errors

    # Standardize column names
    col_mapping = {df_cols_lower[req.lower()]: req for req in REQUIRED_COLUMNS}
    df = df.rename(columns=col_mapping)[REQUIRED_COLUMNS]

    # Build existing lookup sets for duplicate detection against database
    existing_txn_ids = set()
    existing_fingerprints = set()
    for rec in existing_records:
        if rec.get("transaction_id"):
            existing_txn_ids.add(str(rec["transaction_id"]).strip().upper())
        fp = (
            str(rec.get("date", "")).strip(),
            round(float(rec.get("amount", 0)), 2),
            str(rec.get("description", "")).strip().lower(),
            str(rec.get("category", "")).strip().lower()
        )
        existing_fingerprints.add(fp)

    # In-file tracking for internal duplicates
    seen_in_file_ids = set()
    seen_in_file_fingerprints = set()

    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-based index including header
        
        raw_txn_id = str(row["transaction_id"]).strip() if pd.notna(row["transaction_id"]) else ""
        raw_date = str(row["date"]).strip() if pd.notna(row["date"]) else ""
        raw_desc = str(row["description"]).strip() if pd.notna(row["description"]) else ""
        raw_cat = row["category"]
        raw_amount = row["amount"]
        raw_payment = row["payment_method"]

        # Validate Date
        parsed_date_str = ""
        try:
            parsed_dt = pd.to_datetime(raw_date, errors="raise")
            parsed_date_str = parsed_dt.strftime("%Y-%m-%d")
        except Exception:
            rejection_errors.append(f"Row {row_num}: Invalid date format '{raw_date}'. Please use YYYY-MM-DD.")
            continue

        # Validate Amount
        try:
            # Handle potential currency symbols or commas
            amt_str = str(raw_amount).replace("$", "").replace(",", "").strip()
            amount_val = float(amt_str)
            if amount_val <= 0:
                rejection_errors.append(f"Row {row_num}: Amount must be a positive number greater than 0 (got {amount_val}).")
                continue
            if np.isnan(amount_val) or np.isinf(amount_val):
                rejection_errors.append(f"Row {row_num}: Amount is not a valid numerical value.")
                continue
            amount_val = round(amount_val, 2)
        except Exception:
            rejection_errors.append(f"Row {row_num}: Non-numeric amount value '{raw_amount}'.")
            continue

        # Validate Description
        if not raw_desc or raw_desc.lower() == "nan":
            raw_desc = "Unspecified Transaction"

        # Normalize Category and Payment Method
        clean_cat = normalize_category_name(raw_cat)
        clean_payment = normalize_payment_method(raw_payment)

        # Generate transaction fingerprint
        clean_fp = (
            parsed_date_str,
            amount_val,
            raw_desc.lower(),
            clean_cat.lower()
        )

        # Duplicate Checks
        is_duplicate = False
        dup_reason = ""

        # A. Check transaction_id match
        if raw_txn_id:
            txn_key = raw_txn_id.upper()
            if txn_key in existing_txn_ids:
                is_duplicate = True
                dup_reason = f"Duplicate Transaction ID '{raw_txn_id}' already exists in your account records."
            elif txn_key in seen_in_file_ids:
                is_duplicate = True
                dup_reason = f"Duplicate Transaction ID '{raw_txn_id}' appears multiple times within the uploaded CSV."
            else:
                seen_in_file_ids.add(txn_key)

        # B. Check combination fingerprint match
        if not is_duplicate:
            if clean_fp in existing_fingerprints:
                is_duplicate = True
                dup_reason = f"Identical transaction (Date: {parsed_date_str}, Amount: ${amount_val}, Description: '{raw_desc}') already exists."
            elif clean_fp in seen_in_file_fingerprints:
                is_duplicate = True
                dup_reason = f"Duplicate transaction entry with identical Date, Amount, Description, and Category found within this CSV."
            else:
                seen_in_file_fingerprints.add(clean_fp)

        record_payload = {
            "transaction_id": raw_txn_id if raw_txn_id else f"TXN-GEN-{idx+1:04d}",
            "date": parsed_date_str,
            "description": raw_desc,
            "category": clean_cat,
            "amount": amount_val,
            "payment_method": clean_payment,
        }

        if is_duplicate:
            record_payload["duplicate_reason"] = dup_reason
            duplicate_records.append(record_payload)
        else:
            valid_records.append(record_payload)

    return valid_records, duplicate_records, rejection_errors
