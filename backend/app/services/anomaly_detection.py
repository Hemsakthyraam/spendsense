import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import LabelEncoder, StandardScaler

ANOMALY_DISCLAIMER = (
    "Note: SpendSense anomaly detection identifies unusual or outlier transaction patterns "
    "using Machine Learning (Isolation Forest). An anomaly is an unusual transaction, not necessarily "
    "fraud, error, or unauthorized activity."
)

def run_expense_anomaly_detection(
    transactions: List[Dict[str, Any]],
    contamination: float = 0.08
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Run Machine Learning Anomaly Detection using Scikit-Learn Isolation Forest.
    
    Returns:
        (updated_transactions, summary_metadata)
    """
    n_samples = len(transactions)

    # 1. Edge Case: Extremely small datasets (< 5 transactions)
    if n_samples < 5:
        # Reset any anomaly flags and return friendly explanation
        updated = []
        for txn in transactions:
            t_copy = dict(txn)
            t_copy["is_anomaly"] = 0
            t_copy["anomaly_score"] = 0.0
            t_copy["anomaly_reason"] = "Insufficient dataset size (< 5 records) to reliably determine statistical anomalies."
            updated.append(t_copy)
        
        summary = {
            "total_analyzed": n_samples,
            "anomaly_count": 0,
            "contamination_rate": contamination,
            "is_sufficient_data": False,
            "status_message": f"Dataset contains only {n_samples} record(s). At least 5-10 records are required for statistical and ML anomaly detection.",
            "disclaimer": ANOMALY_DISCLAIMER
        }
        return updated, summary

    # Convert to DataFrame for feature engineering
    df = pd.DataFrame(transactions)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
    df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
    
    # 2. Feature Engineering
    # A. Date-derived features
    df["day_of_week"] = df["date_dt"].dt.dayofweek.fillna(0).astype(int)
    df["day_of_month"] = df["date_dt"].dt.day.fillna(1).astype(int)
    df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x in [5, 6] else 0)

    # B. Amount transformations
    df["log_amount"] = np.log1p(np.maximum(df["amount"], 0))

    # C. Category encoding & Category-level statistics
    le = LabelEncoder()
    df["category_encoded"] = le.fit_transform(df["category"].astype(str))
    
    # Calculate category means and standard deviations
    cat_stats = df.groupby("category")["amount"].agg(["mean", "std", "count"]).to_dict("index")
    
    # Ratio to category average
    def compute_cat_ratio(row):
        cat = row["category"]
        stat = cat_stats.get(cat, {"mean": row["amount"]})
        mean_val = stat.get("mean", 0.0)
        if mean_val > 0:
            return round(row["amount"] / mean_val, 2)
        return 1.0

    df["cat_amount_ratio"] = df.apply(compute_cat_ratio, axis=1)

    # Overall statistics
    overall_mean = df["amount"].mean()
    overall_std = df["amount"].std() if df["amount"].std() > 0 else 1.0

    # 3. Model Training & Anomaly Prediction
    features = [
        "amount",
        "log_amount",
        "category_encoded",
        "day_of_week",
        "day_of_month",
        "is_weekend",
        "cat_amount_ratio"
    ]
    X = df[features].values

    # Handle dataset sizes between 5 and 9
    effective_contamination = min(max(contamination, 0.02), 0.35)
    if n_samples < 10:
        effective_contamination = min(0.20, max(1.0 / n_samples, 0.10))

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Scikit-learn Isolation Forest model
    clf = IsolationForest(
        n_estimators=100,
        contamination=effective_contamination,
        random_state=42,
        bootstrap=False
    )
    clf.fit(X_scaled)
    
    # -1 for anomaly, 1 for inlier
    raw_preds = clf.predict(X_scaled)
    # Decision function: negative values indicate anomaly, lower is more anomalous
    raw_scores = clf.decision_function(X_scaled)

    # 4. Score Normalization (0% - 100% anomaly severity)
    # Invert decision function: lower decision score -> higher anomaly score
    inverted = -raw_scores
    min_inv = inverted.min()
    max_inv = inverted.max()
    
    if max_inv > min_inv:
        normalized_scores = (inverted - min_inv) / (max_inv - min_inv) * 100.0
    else:
        normalized_scores = np.zeros(n_samples)

    # 5. Build Human-Readable Explanations for Anomalies
    updated_records = []
    anomaly_counter = 0

    for i, row in df.iterrows():
        is_anom = 1 if raw_preds[i] == -1 else 0
        norm_score = round(float(normalized_scores[i]), 1)
        amt = float(row["amount"])
        cat = row["category"]
        ratio = float(row["cat_amount_ratio"])
        day_name = row["date_dt"].strftime("%A") if pd.notna(row["date_dt"]) else "weekday"
        
        cat_mean = cat_stats.get(cat, {}).get("mean", overall_mean)
        
        reason = None
        if is_anom:
            anomaly_counter += 1
            if ratio >= 2.5:
                reason = f"Amount ₹{amt:,.2f} is {ratio:.1f}x higher than your average {cat} spending (₹{cat_mean:,.2f})."
            elif amt > (overall_mean + 2 * overall_std):
                reason = f"High outlier transaction (₹{amt:,.2f}) exceeding 2 standard deviations from your overall average."
            elif row["is_weekend"] == 0 and amt > (cat_mean * 1.8):
                reason = f"Unusually large {cat} expense (₹{amt:,.2f}) on a {day_name}."
            else:
                reason = f"Atypical transaction characteristics flagged by multi-dimensional Isolation Forest analysis (severity score: {norm_score}%)."
        else:
            reason = "Standard transaction pattern within typical spending distribution."

        rec_dict = dict(transactions[i])
        rec_dict["is_anomaly"] = is_anom
        rec_dict["anomaly_score"] = norm_score
        rec_dict["anomaly_reason"] = reason
        updated_records.append(rec_dict)

    summary = {
        "total_analyzed": n_samples,
        "anomaly_count": anomaly_counter,
        "contamination_rate": effective_contamination,
        "is_sufficient_data": True,
        "status_message": (
            f"Successfully evaluated {n_samples} transactions using Scikit-Learn Isolation Forest. "
            f"Identified {anomaly_counter} unusual transaction pattern(s)."
        ),
        "disclaimer": ANOMALY_DISCLAIMER
    }

    return updated_records, summary
