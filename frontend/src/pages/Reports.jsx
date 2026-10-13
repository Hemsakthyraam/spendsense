import React, { useState, useEffect } from 'react';
import { reportService } from '../services/api';
import {
  FileText,
  Download,
  CloudUpload,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  CloudOff,
  Cloud,
  FileSpreadsheet,
  History,
  Lock
} from 'lucide-react';

export const Reports = () => {
  const [s3Status, setS3Status] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingS3, setUploadingS3] = useState(false);
  const [s3Message, setS3Message] = useState(null);
  const [s3Error, setS3Error] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, histRes] = await Promise.all([
        reportService.getS3Status(),
        reportService.getHistory()
      ]);
      setS3Status(statusRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDownload = async (format, filename) => {
    try {
      const res = await reportService.downloadReportBlob(format);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      // Refresh report history
      loadData();
    } catch (err) {
      alert('Failed to download report: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleUploadS3 = async (format) => {
    try {
      setUploadingS3(true);
      setS3Error('');
      setS3Message(null);
      const res = await reportService.uploadToS3(format);
      setS3Message(res.data.message);
      // Refresh history
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload report to AWS S3.';
      setS3Error(msg);
    } finally {
      setUploadingS3(false);
    }
  };

  return (
    <div>
      {/* Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={26} style={{ color: '#6366f1' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Reports & Cloud Archival</h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              Generate structured financial summaries, cleaned datasets, and optionally archive private encrypted reports to Amazon S3.
            </p>
          </div>
          <span className="badge-tag badge-cppe" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Cloud Engineering Module
          </span>
        </div>
      </div>

      {/* Report Generation Options Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* 1. Executive HTML Report */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: 0 }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Executive HTML Summary</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '8px 0 16px' }}>
              Self-contained, visually styled HTML document containing KPI cards, flagged anomaly transactions, category spending breakdowns, and AI model disclosures.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleDownload('html', 'spendsense_summary_report.html')}
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
            >
              <Download size={14} />
              Download HTML
            </button>
            <button
              onClick={() => window.open(reportService.getPreviewUrl(), '_blank')}
              className="btn btn-secondary btn-sm"
              title="Open full executive report in a new tab"
            >
              <ExternalLink size={14} />
              Preview
            </button>
          </div>
        </div>

        {/* 2. Cleaned Expenses CSV */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: 0 }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#d1fae5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <FileSpreadsheet size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Cleaned Expenses CSV</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '8px 0 16px' }}>
              Complete normalized dataset including all validated transactions, standardized category tags, computed anomaly severity scores, and decision rationale.
            </p>
          </div>

          <button
            onClick={() => handleDownload('cleaned_csv', 'spendsense_cleaned_expenses.csv')}
            className="btn btn-primary btn-sm"
          >
            <Download size={14} />
            Download Cleaned CSV
          </button>
        </div>

        {/* 3. Anomalies-Only CSV */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', marginBottom: 0 }}>
          <div>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <AlertCircle size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Anomalies-Only CSV</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '8px 0 16px' }}>
              Targeted dataset containing only the transactions flagged as statistical anomalies by Isolation Forest, sorted in descending order of outlier severity.
            </p>
          </div>

          <button
            onClick={() => handleDownload('anomaly_csv', 'spendsense_anomalies_only.csv')}
            className="btn btn-secondary btn-sm"
            style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          >
            <Download size={14} />
            Download Anomaly CSV
          </button>
        </div>
      </div>

      {/* AWS S3 Cloud Integration Card */}
      <div className="card" style={{ borderLeft: s3Status?.is_configured ? '4px solid #10b981' : '4px solid #f59e0b' }}>
        <div className="card-header">
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {s3Status?.is_configured ? (
                <>
                  <Cloud size={20} style={{ color: '#10b981' }} />
                  Amazon S3 Private Archival: Connected
                </>
              ) : (
                <>
                  <CloudOff size={20} style={{ color: '#f59e0b' }} />
                  Amazon S3 Private Archival: Local-Only Mode Active
                </>
              )}
            </div>
            <div className="card-subtitle">
              {s3Status?.is_configured
                ? `Active Bucket: ${s3Status.bucket} (${s3Status.region}) — Encrypted at rest (AES-256)`
                : 'AWS S3 integration is optional. SpendSense runs 100% locally with local reports and SQLite storage.'}
            </div>
          </div>

          {s3Status?.is_configured && (
            <span className="badge badge-normal">
              <Lock size={12} />
              Private Least-Privilege
            </span>
          )}
        </div>

        {s3Status && !s3Status.is_configured && (
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
              How to enable Amazon S3 Cloud Archival:
            </div>
            <pre style={{
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              padding: '12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              overflowX: 'auto',
              fontFamily: 'monospace',
              lineHeight: 1.5
            }}>
{`# Add these to backend/.env:
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-private-bucket-name`}
            </pre>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px' }}>
              <strong>Security Best Practice:</strong> Ensure the bucket has "Block All Public Access" enabled. Reports are isolated under <code>reports/user_{'{user_id}'}/</code> to prevent cross-tenant data leaks.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => handleUploadS3('html')}
            disabled={uploadingS3}
            className="btn btn-primary"
          >
            <CloudUpload size={16} />
            {uploadingS3 ? 'Uploading to S3...' : 'Backup HTML Report to Private S3 Bucket'}
          </button>

          <button
            onClick={() => handleUploadS3('cleaned_csv')}
            disabled={uploadingS3}
            className="btn btn-secondary"
          >
            <CloudUpload size={16} />
            Backup Cleaned CSV to S3
          </button>
        </div>

        {s3Message && (
          <div className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>
            <CheckCircle2 size={16} />
            <span>{s3Message}</span>
          </div>
        )}

        {s3Error && (
          <div className="alert alert-danger" style={{ marginTop: '16px', marginBottom: 0 }}>
            <AlertCircle size={16} />
            <span>{s3Error}</span>
          </div>
        )}
      </div>

      {/* Generated Report History Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">
              <History size={18} />
              Generated Report History & Audit
            </div>
            <div className="card-subtitle">
              Audit log of reports created and archived during this session
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h3>No Report History Yet</h3>
            <p>Generate or download a report above to establish your report audit trail.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Report ID</th>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Transactions</th>
                  <th>Total Amount</th>
                  <th>Anomalies</th>
                  <th>Storage Destination</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((rep) => (
                  <tr key={rep.id}>
                    <td><code>{rep.report_id}</code></td>
                    <td><strong>{rep.report_name}</strong></td>
                    <td>
                      <span className="badge badge-category">{rep.report_type}</span>
                    </td>
                    <td>{rep.total_transactions}</td>
                    <td>₹{Number(rep.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      {rep.anomaly_count > 0 ? (
                        <span className="badge badge-anomaly">{rep.anomaly_count} Flagged</span>
                      ) : (
                        <span className="badge badge-normal">0</span>
                      )}
                    </td>
                    <td>
                      {rep.s3_status === 'uploaded_to_s3' ? (
                        <span className="badge badge-normal" title={rep.s3_key}>
                          <Cloud size={12} />
                          AWS S3 Private
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                          Local Download
                        </span>
                      )}
                    </td>
                    <td style={{ color: '#64748b' }}>{rep.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
