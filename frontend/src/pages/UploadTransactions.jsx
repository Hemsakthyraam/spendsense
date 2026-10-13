import React, { useState, useRef } from 'react';
import { transactionService } from '../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ArrowRight,
  Info
} from 'lucide-react';

export const UploadTransactions = ({ setActiveTab }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    setUploadResult(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Invalid file type. Please upload a comma-separated (.csv) file.');
      setFile(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('File size exceeds the 5 MB limit.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError('');
      const res = await transactionService.uploadCsv(formData);
      setUploadResult(res.data);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to process and upload CSV file.';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* Overview Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Upload Expense Transactions</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>
              Import historical personal expense data for automated cleaning, duplicate isolation, and Isolation Forest ML anomaly detection.
            </p>
          </div>

          <a
            href={transactionService.getSampleCsvUrl()}
            download="sample_expenses.csv"
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <Download size={16} />
            Download Sample CSV (37 Records)
          </a>
        </div>
      </div>

      {/* Schema Requirement Card */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '14px'
      }}>
        <Info size={20} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.875rem', color: '#475569' }}>
          <strong>Required CSV Header Format:</strong>
          <code style={{
            display: 'block',
            marginTop: '6px',
            padding: '6px 10px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            color: '#0f172a',
            fontSize: '0.8rem',
            fontFamily: 'monospace'
          }}>
            transaction_id, date, description, category, amount, payment_method
          </code>
          <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginTop: '6px' }}>
            Supported date formats: YYYY-MM-DD. Duplicate records will be automatically identified and safely segregated.
          </span>
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="card">
        <div
          className={`upload-dropzone ${isDragging ? 'dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            style={{ display: 'none' }}
          />

          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: isDragging ? '#e0e7ff' : '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: '#6366f1'
          }}>
            <UploadCloud size={28} />
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
            {file ? file.name : 'Choose a CSV file or drag & drop here'}
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            {file ? `${(file.size / 1024).toFixed(1)} KB — Ready to upload` : 'CSV files up to 5 MB'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '20px', marginBottom: 0 }}>
            <XCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Import Error:</strong> {error}
            </div>
          </div>
        )}

        {file && (
          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              disabled={uploading}
            >
              {uploading ? 'Processing & Detecting...' : 'Ingest & Clean Dataset'}
            </button>
          </div>
        )}
      </div>

      {/* Upload Results Summary Card */}
      {uploadResult && (
        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <CheckCircle2 size={24} style={{ color: '#10b981' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Dataset Ingestion Complete</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{uploadResult.message}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', margin: '20px 0' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Total Processed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '4px' }}>{uploadResult.total_processed}</div>
            </div>

            <div style={{ background: '#ecfdf5', padding: '16px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#047857', textTransform: 'uppercase' }}>Imported Records</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857', marginTop: '4px' }}>{uploadResult.imported_count}</div>
            </div>

            <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b45309', textTransform: 'uppercase' }}>Duplicate Records</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>{uploadResult.duplicate_count}</div>
            </div>

            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c', textTransform: 'uppercase' }}>Rejected Rows</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b91c1c', marginTop: '4px' }}>{uploadResult.rejected_count}</div>
            </div>
          </div>

          {uploadResult.rejected_errors && uploadResult.rejected_errors.length > 0 && (
            <div className="alert alert-warning" style={{ marginTop: '16px' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Rejection Details:</strong>
                <ul style={{ paddingLeft: '18px', marginTop: '4px' }}>
                  {uploadResult.rejected_errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="btn btn-primary"
            >
              View Updated Dashboard
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => setActiveTab('anomalies')}
              className="btn btn-secondary"
            >
              Inspect Anomaly Radar
            </button>
            {uploadResult.duplicate_count > 0 && (
              <button
                onClick={() => setActiveTab('transactions')}
                className="btn btn-secondary"
              >
                <Copy size={15} />
                View {uploadResult.duplicate_count} Duplicate Records
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
