import os
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
from fastapi.testclient import TestClient

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.abspath("."))

from backend.app.main import app

def run_tests():
    with TestClient(app) as client:
        print("=== [1] Testing Health Endpoint ===")
        res = client.get("/health")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        health_data = res.json()
        print(f"Health response: {health_data}")
        assert health_data["status"] == "healthy"

        print("\n=== [2] Testing User Registration ===")
        test_user = {
            "username": "testuser_cppe",
            "email": "testuser@example.com",
            "password": "SecurePassword123!",
            "full_name": "CPPE Candidate"
        }
        res = client.post("/auth/register", json=test_user)
        if res.status_code == 400:
            print("User already registered, proceeding to login...")
        else:
            assert res.status_code == 201, f"Register failed: {res.text}"
            print("Registration successful.")

        print("\n=== [3] Testing User Login ===")
        login_data = {
            "username": test_user["username"],
            "password": test_user["password"]
        }
        res = client.post("/auth/login", json=login_data)
        assert res.status_code == 200, f"Login failed: {res.text}"
        token_info = res.json()
        token = token_info["access_token"]
        print(f"Login successful! Received JWT token (first 25 chars): {token[:25]}...")

        headers = {"Authorization": f"Bearer {token}"}

        print("\n=== [4] Testing /auth/me ===")
        res = client.get("/auth/me", headers=headers)
        assert res.status_code == 200, f"/auth/me failed: {res.text}"
        user_me = res.json()
        print(f"Authenticated user: {user_me['username']} ({user_me['email']})")

        print("\n=== [5] Testing Clear User Data (Reset) ===")
        res = client.delete("/transactions/clear", headers=headers)
        assert res.status_code == 200

        print("\n=== [6] Testing CSV Ingestion & Duplicate Detection ===")
        sample_csv_path = os.path.join("sample_data", "sample_expenses.csv")
        with open(sample_csv_path, "rb") as f:
            file_bytes = f.read()

        res = client.post(
            "/transactions/upload",
            files={"file": ("sample_expenses.csv", file_bytes, "text/csv")},
            headers=headers
        )
        assert res.status_code == 200, f"Upload failed: {res.text}"
        upload_res = res.json()
        print(f"Upload Summary: {upload_res}")
        assert upload_res["imported_count"] > 0
        assert upload_res["duplicate_count"] >= 1, "Duplicate record (TXN-1002) should be detected!"

        print("\n=== [7] Testing Transactions Listing & Filtering ===")
        res = client.get("/transactions", headers=headers)
        assert res.status_code == 200
        txns = res.json()
        print(f"Retrieved {len(txns)} transactions.")

        print("\n=== [8] Testing Duplicate Records Endpoint ===")
        res = client.get("/transactions/duplicates", headers=headers)
        assert res.status_code == 200
        dups = res.json()
        print(f"Flagged duplicates: {len(dups)}")
        for d in dups:
            print(f"  - Dup Txn: {d['transaction_id']}, Amount: ${d['amount']}, Reason: {d['duplicate_reason']}")

        print("\n=== [9] Testing Anomaly Detection Results ===")
        res = client.get("/transactions/anomalies", headers=headers)
        assert res.status_code == 200
        anomalies = res.json()
        print(f"Flagged {len(anomalies)} anomalies via Isolation Forest:")
        for anom in anomalies:
            print(f"  - Anomaly: [{anom['category']}] {anom['description']} (₹{anom['amount']}) | Score: {anom['anomaly_score']}% | Reason: {anom['anomaly_reason']}")

        print("\n=== [10] Testing Re-tuning Isolation Forest Contamination ===")
        res = client.post("/transactions/detect-anomalies", json={"contamination": 0.12}, headers=headers)
        assert res.status_code == 200
        retune_res = res.json()
        print(f"Re-tuned Anomaly Result: {retune_res['status_message']}")

        print("\n=== [11] Testing Dashboard Summary & Analytics ===")
        res = client.get("/transactions/summary", headers=headers)
        assert res.status_code == 200
        summary = res.json()
        print(f"Dashboard KPI Cards:")
        print(f"  - Total Spent: ₹{summary['total_expenses']:,.2f}")
        print(f"  - Avg Txn: ₹{summary['avg_transaction']:,.2f}")
        print(f"  - Total Txns: {summary['transaction_count']}")
        print(f"  - Anomalies: {summary['anomaly_count']}")
        print(f"  - Duplicates: {summary['duplicate_count']}")
        if summary["highest_transaction"]:
            print(f"  - Highest Txn: {summary['highest_transaction']['description']} (₹{summary['highest_transaction']['amount']:,.2f})")

        res = client.get("/analytics/monthly", headers=headers)
        assert res.status_code == 200
        print(f"Monthly Trends: {res.json()}")

        res = client.get("/analytics/categories", headers=headers)
        assert res.status_code == 200
        print(f"Category Breakdown count: {len(res.json())}")

        print("\n=== [12] Testing Report Downloads (Cleaned CSV & HTML) ===")
        res = client.get("/reports/download?format=cleaned_csv", headers=headers)
        assert res.status_code == 200
        assert "text/csv" in res.headers["content-type"]
        print(f"Cleaned CSV report download verified (size: {len(res.content)} bytes).")

        res = client.get("/reports/download?format=html", headers=headers)
        assert res.status_code == 200
        assert "text/html" in res.headers["content-type"]
        print(f"HTML summary report download verified (size: {len(res.content)} bytes).")

        print("\n=== [13] Testing AWS S3 Status & Graceful Offline Behavior ===")
        res = client.get("/reports/s3-status")
        assert res.status_code == 200
        s3_status = res.json()
        print(f"S3 status: Configured={s3_status['is_configured']}")

        res = client.post("/reports/upload-to-s3?format=html", headers=headers)
        print(f"S3 upload response when unconfigured: HTTP {res.status_code} ({res.json().get('detail', res.text)})")

        print("\n=== [14] Testing Audit Logs Trail ===")
        res = client.get("/auth/audit-logs", headers=headers)
        assert res.status_code == 200
        logs = res.json()
        print(f"Audit log trail has {len(logs)} recorded events:")
        for l in logs[:5]:
            print(f"  - [{l['timestamp']}] {l['action']}: {l['details']}")

        print("\n>>> ALL 14 BACKEND TESTS PASSED WITH 100% SUCCESS! <<<")

if __name__ == "__main__":
    run_tests()
