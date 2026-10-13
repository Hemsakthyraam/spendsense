# SpendSense — Personal Expense Anomaly Detector

**Wipro CPPE Academic Capstone Submission**  
*An End-to-End Financial Intelligence System Featuring AI-Driven Outlier Detection, Robust Data Cleaning, Private Cloud Archival, and Cryptographic Security.*

---

## 1. Project Overview

**SpendSense** is a full-stack personal finance application engineered to detect unusual spending patterns in personal expense records. Traditional personal finance dashboards rely solely on static budgets and rigid rule thresholds. SpendSense integrates **unsupervised machine learning (Scikit-Learn Isolation Forest)** to uncover multi-dimensional anomalies (such as disproportionately high outlays relative to category baselines, atypical weekday purchases, or extreme value spikes) while explaining the mathematical rationale in transparent, human-readable language.

The application satisfies all four **Wipro CPPE Module Competencies**:
1. **AI Engineering**: Scikit-Learn Isolation Forest outlier detection with feature scaling, date/category feature extraction, adaptive contamination tuning, and plain-language explanation generation.
2. **Data Engineering**: Automated CSV ingestion pipeline, strict schema validation, category normalization, multi-tier duplicate detection, relational SQLite persistence with WAL mode, and aggregated financial metrics.
3. **Cloud Engineering**: Private Amazon S3 report backup using Boto3, tenant-isolated S3 object namespaces (`reports/user_{user_id}/`), AES-256 server-side encryption, and graceful local offline fallback.
4. **Security Engineering**: Salted Bcrypt password hashing, stateless HS256 JWT authorization, row-level tenant data isolation, strict CORS policies, 5 MB file upload constraints, and an immutable security audit event trail.

---

## 2. Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Vanilla CSS Design System, Recharts, Axios, Lucide Icons | Responsive, high-performance financial analytics interface with dark navy and emerald accents. |
| **Backend** | Python 3.13 / FastAPI, Uvicorn | High-throughput REST API with dependency injection and automatic OpenAPI specification. |
| **Machine Learning** | Scikit-Learn (`IsolationForest`), NumPy, Pandas | Unsupervised anomaly detection, feature engineering, and decision scoring. |
| **Data & Storage** | SQLite 3 (WAL Mode, Foreign Key Constraints), Pandas | Local relational persistence with zero external database dependencies. |
| **Cloud** | Amazon Web Services (AWS S3 via Boto3) | Optional, encrypted private cloud report storage with tenant isolation. |
| **Security** | Bcrypt (Salted rounds=12), PyJWT (HS256) | Cryptographic credential protection, token-based authorization, and audit logging. |

---

## 3. CPPE Four-Module Mapping

### A. AI Engineering
- **Isolation Forest Implementation**: Employs tree ensemble partitioning where anomalous observations require fewer random feature splits to isolate.
- **Feature Space Construction**:
  - `amount`: Raw expenditure magnitude.
  - `log_amount`: Logarithmically scaled outlay (`log1p`) to mitigate skewness.
  - `category_encoded`: Label-encoded numeric mapping of transaction categories.
  - `day_of_week`, `day_of_month`, `is_weekend`: Temporal cyclical attributes.
  - `cat_amount_ratio`: Relative outlay computed as `amount / category_mean_amount`.
- **Severity Scoring**: Decision function scores are inverted and min-max scaled into an intuitive `0% – 100%` severity index.
- **Human-Readable Explanations**: Generates contextual explanations (e.g., *"Amount $1,200.00 is 6.4x higher than your average Dining spending ($187.86)"*).
- **Graceful Dataset Scaling**: Safe handling of datasets `< 5` transactions with educational status alerts, and adaptive contamination for small sample sizes (`5 – 10`).
- **Ethical Disclaimer**: Reinforces that an anomaly indicates an unusual pattern, not necessarily fraud or an error.

### B. Data Engineering
- **CSV Ingestion Pipeline**: Ingests user CSVs validating required headers: `transaction_id`, `date`, `description`, `category`, `amount`, `payment_method`.
- **Data Sanitization**: Strips invalid characters, enforces positive numeric values, parses standard date formats (`YYYY-MM-DD`), and normalizes categories into uniform taxonomy.
- **Multi-Tier Duplicate Detection**:
  - **Tier 1 (Transaction ID)**: Matches explicit transaction IDs against historical database records and internal file rows.
  - **Tier 2 (Composite Fingerprint)**: Identifies identical combinations of `(date, amount, description, category)`.
  - **No Silent Drops**: Flagged duplicate records are safely segregated into a dedicated `duplicate_records` table and displayed in a separate UI tab.
- **SQLite Database Architecture**: Normalized tables with foreign key cascades, secondary indexing on `user_id`, `date`, and `category`, and WAL (Write-Ahead Logging) mode.

### C. Cloud Engineering
- **Private Amazon S3 Integration**: Boto3 client uploads generated reports (`HTML`, `Cleaned CSV`, `Anomaly CSV`) directly to S3.
- **Tenant-Isolated S3 Key Structure**: `reports/user_{user_id}/{report_id}_{filename}` ensures zero possibility of cross-user data exposure in shared buckets.
- **Data Protection at Rest**: Enforces server-side AES-256 encryption (`ServerSideEncryption="AES256"`).
- **Graceful Offline Mode**: SpendSense operates 100% locally with zero cloud dependencies if AWS credentials are not provided. The UI provides real-time connection status indicators and step-by-step setup guides.

### D. Security Engineering
- **Credential Protection**: Passwords hashed using standard `bcrypt` with cryptographic salt rounds. No plain text passwords are ever stored or logged.
- **Stateless Authorization**: Signed JWT access tokens with 24-hour expiration, validated via FastAPI dependencies (`get_current_user`).
- **Row-Level Tenant Isolation**: Every transaction, analytics query, and report generation strictly scopes SQL operations by `user_id = current_user.id`.
- **Defensive Input Validation**: Pydantic schemas enforce type constraints, maximum string lengths, and numeric bounds. Uploads are strictly capped at 5 MB and validated for `.csv` file types.
- **Security Audit Logging**: Every critical security action (`USER_REGISTER`, `USER_LOGIN`, `CSV_IMPORT`, `ANOMALY_RUN`, `REPORT_DOWNLOAD`, `S3_BACKUP`) is logged to the `audit_logs` table with timestamps and source IP addresses.

---

## 4. Running the Application Locally on Windows

### Prerequisites
- **Python 3.10+** (Python 3.13 supported)
- **Node.js 18+** (Node.js 24 supported)

### Step 1: Clone or Open the Workspace
```powershell
cd c:\Users\mhafe\OneDrive\Desktop\wipro_cppe
```

### Step 2: Set Up Backend
```powershell
# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Ensure .env is present (defaults configured for local mode)
copy backend\.env.example backend\.env
```

### Step 3: Run Backend Tests
Run the comprehensive 14-step automated verification suite:
```powershell
python test_backend.py
```
*Output: `ALL 14 BACKEND TESTS PASSED WITH 100% SUCCESS!`*

### Step 4: Start Backend Server
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The FastAPI interactive Swagger documentation is accessible at: `http://127.0.0.1:8000/docs`*

### Step 5: Start Frontend Server
Open a second PowerShell terminal:
```powershell
# Navigate to frontend and start Vite development server
$env:Path = "C:\Program Files\nodejs;" + $env:Path
npm --prefix frontend run dev
```
*The React application will be live at: `http://localhost:5173`*

---

## 5. Demonstration Walkthrough (3-Minute Quick Demo)

1. **Sign In**: Navigate to `http://localhost:5173`. Click the **"Quick Demo: Autofill Verified Account"** button on the Login page and click **Sign In**.
2. **Upload CSV**: Navigate to the **Upload CSV** tab in the sidebar. Click **"Download Sample CSV (37 Records)"** to view the sample dataset, then drop or upload `sample_data/sample_expenses.csv`.
3. **Review Import Results**: Observe the breakdown:
   - **36 Imported Records**
   - **1 Flagged Duplicate Record** (`TXN-1002`)
   - **0 Rejected Rows**
4. **Explore Dashboard**: View the updated summary cards, monthly trend area chart, category donut breakdown, and highest value transaction card ($3,199.00 MacBook Pro).
5. **Inspect Anomaly Radar**: Navigate to **Anomaly Detection**. Review the 3 high-severity anomalies detected by Isolation Forest (e.g., $1,200 VIP Club, $3,199 MacBook Pro, $2,450 Luxury Boutique). Adjust the **Contamination Rate slider** from 8% to 15% and click **"Re-Train & Execute Model"** to observe real-time dynamic re-clustering.
6. **Review Flagged Duplicates**: Navigate to **All Transactions** and click the **"Flagged Duplicates"** sub-tab to see how duplicate records are preserved with explanations rather than silently dropped.
7. **Generate & Download Reports**: Go to **Reports & S3**. Click **"Download HTML"** or **"Preview"** to inspect the executive financial summary report.
8. **Check Audit Trail & CPPE Mapping**: Go to **Settings & CPPE** to inspect the 4-module alignment documentation and the live security audit trail table.

---

## 6. AWS S3 Configuration (Optional)

SpendSense works locally by default. To connect a private Amazon S3 bucket for cloud report archival:

1. Open the AWS Management Console and navigate to **Amazon S3**.
2. Click **Create bucket**, enter a unique name (e.g. `spendsense-reports-demo-2026`), select your region (e.g. `us-east-1`), and ensure **"Block all public access"** is checked.
3. In AWS IAM, create a policy with least-privilege permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SpendSenseReportStorage",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::spendsense-reports-demo-2026/reports/*"
    }
  ]
}
```
4. Update `backend/.env`:
```ini
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=spendsense-reports-demo-2026
```
5. Restart the backend. The **Reports & S3** page will display `Amazon S3 Private Archival: Connected` with server-side AES-256 encryption.

---

## 7. REST API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Service health and database check | No |
| `POST` | `/auth/register` | Register user with Bcrypt password hashing | No |
| `POST` | `/auth/login` | Authenticate user and issue JWT token | No |
| `GET` | `/auth/me` | Fetch authenticated user profile | Yes |
| `GET` | `/auth/audit-logs` | Retrieve user security audit trail | Yes |
| `POST` | `/transactions/upload` | Ingest CSV, validate format, clean & isolate duplicates | Yes |
| `GET` | `/transactions` | List user transactions with category/date/anomaly filters | Yes |
| `GET` | `/transactions/summary` | Retrieve KPI card values & aggregated dashboard metrics | Yes |
| `GET` | `/transactions/anomalies` | Retrieve only Isolation Forest flagged anomalies | Yes |
| `GET` | `/transactions/duplicates` | Retrieve segregated duplicate transactions | Yes |
| `POST` | `/transactions/detect-anomalies` | Re-tune Isolation Forest contamination rate | Yes |
| `GET` | `/transactions/sample-csv` | Download synthetic sample dataset | No |
| `DELETE` | `/transactions/clear` | Clear transactions and duplicates for re-testing | Yes |
| `GET` | `/analytics/monthly` | Retrieve chronological monthly expenditure sums | Yes |
| `GET` | `/analytics/categories` | Retrieve category breakdown with percentages | Yes |
| `GET` | `/analytics/payment-methods` | Retrieve payment method distribution | Yes |
| `GET` | `/analytics/top-transactions` | Retrieve highest-value single transactions | Yes |
| `GET` | `/reports/download` | Download report locally (`html`, `cleaned_csv`, `anomaly_csv`) | Yes |
| `GET` | `/reports/preview-html` | Preview HTML report in browser | Yes |
| `POST` | `/reports/upload-to-s3` | Backup report to private S3 bucket under user key | Yes |
| `GET` | `/reports/s3-status` | Check S3 credentials and connection status | No |
| `GET` | `/reports/history` | List generated report history | Yes |

---

## 8. College Presentation Summary

> **"SpendSense is an intelligent financial tracking system designed to solve a fundamental limitation of traditional personal budgeting apps: static, manual thresholds that fail to detect nuanced spending abnormalities. By leveraging an unsupervised Scikit-Learn Isolation Forest model alongside an automated ETL data engineering pipeline, SpendSense parses raw CSV files, purges duplicates without silent data loss, and isolates statistical outliers across expenditure magnitude, category baselines, and temporal cadences. Designed under enterprise cloud and security principles, the system demonstrates private, tenant-isolated S3 archival, salted password hashing, JWT authorization, and full security audit logging."**

---

## 9. Known Limitations & Future Enhancements

| Limitation | Planned Future Enhancement |
|---|---|
| Contamination rate is set statically or adjusted manually via slider. | Implement automated hyperparameter tuning (e.g. silhouette analysis or statistical IQR heuristic contamination). |
| Static category normalization dictionary. | Integrate lightweight NLP / fuzzy string matching (Levenshtein distance) for dynamic category recognition. |
| CSV is currently the only ingestion format. | Support direct Open Banking API connections (Plaid / Teller) and bank PDF statement parsing. |
| Single-currency assumption (USD). | Multi-currency normalization with live foreign exchange conversion APIs. |

---

## 10. Verification & Test Certification

The backend automated test suite (`test_backend.py`) verifies all 14 core system pathways:
- Health checks and database connection verification.
- User registration and bcrypt password hashing.
- JWT generation and `/auth/me` verification.
- Data clearing and database reset.
- CSV ingestion and multi-tier duplicate detection (`TXN-1002`).
- Retrieval of 36 transactions and separation of duplicates.
- Isolation Forest anomaly detection identifying high-value outliers ($1,200 VIP club, $3,199 MacBook, $2,450 jewelry).
- Isolation Forest contamination parameter re-tuning.
- Analytics aggregations across monthly trends and category shares.
- Local report generation for both cleaned CSV and executive HTML.
- S3 graceful offline handling.
- Audit trail event persistence.

*Certified for Wipro CPPE Academic Submission.*
