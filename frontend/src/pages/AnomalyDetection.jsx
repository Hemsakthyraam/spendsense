import React, { useState, useEffect } from 'react';
import { transactionService } from '../services/api';
import {
  AlertTriangle,
  Sliders,
  Play,
  CheckCircle2,
  Info,
  DollarSign,
  TrendingUp,
  BrainCircuit,
  FileSpreadsheet
} from 'lucide-react';

export const AnomalyDetection = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [contamination, setContamination] = useState(0.08);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resultMsg, setResultMsg] = useState(null);
  const [error, setError] = useState('');

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await transactionService.getAnomalies();
      setAnomalies(res.data);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError('Failed to fetch anomalies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const handleRunModel = async () => {
    try {
      setRunning(true);
      setError('');
      setResultMsg(null);
      const res = await transactionService.detectAnomalies({
        contamination: parseFloat(contamination),
      });
      setResultMsg(res.data);
      // Re-fetch anomalies
      await fetchAnomalies();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to execute anomaly detection model.';
      setError(msg);
    } finally {
      setRunning(false);
    }
  };

  // Metrics
  const totalAnomalies = anomalies.length;
  const avgAnomalyAmount = totalAnomalies > 0
    ? anomalies.reduce((sum, a) => sum + a.amount, 0) / totalAnomalies
    : 0;
  const maxScore = totalAnomalies > 0
    ? Math.max(...anomalies.map(a => a.anomaly_score))
    : 0;

  return (
    <div>
      {/* AI Engineering Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BrainCircuit size={26} style={{ color: '#6366f1' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Isolation Forest Anomaly Radar</h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              Unsupervised machine learning model identifying outlier expenditure patterns based on transaction amount, category-encoded distributions, and temporal features.
            </p>
          </div>

          <span className="badge-tag badge-cppe" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            AI Engineering Module
          </span>
        </div>
      </div>

      {/* Model Parameter Tuning Card */}
      <div className="card" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ flex: '1', minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Sliders size={18} style={{ color: '#6366f1' }} />
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                Contamination Rate Parameter: {(contamination * 100).toFixed(0)}%
              </label>
            </div>
            <input
              type="range"
              min="0.02"
              max="0.25"
              step="0.01"
              value={contamination}
              onChange={(e) => setContamination(parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: '#6366f1' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              <span>2% (Conservative — Only Extreme Outliers)</span>
              <span>8% (Recommended Default)</span>
              <span>25% (High Sensitivity)</span>
            </div>
          </div>

          <button
            onClick={handleRunModel}
            disabled={running}
            className="btn btn-primary btn-lg"
          >
            {running ? (
              'Fitting Isolation Forest...'
            ) : (
              <>
                <Play size={18} />
                Re-Train & Execute Model
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginTop: '16px', marginBottom: 0 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {resultMsg && (
          <div className="alert alert-success" style={{ marginTop: '16px', marginBottom: 0 }}>
            <CheckCircle2 size={16} />
            <span>{resultMsg.status_message}</span>
          </div>
        )}
      </div>

      {/* Reassuring Disclaimer Card */}
      <div className="alert alert-warning" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
        <Info size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem', color: '#92400e' }}>
          <strong>Understanding Anomaly Flags:</strong> An anomaly indicates a statistically unusual transaction pattern (e.g., an expenditure significantly larger than your normal category average, or an unusual day of the week). An anomaly is <strong>not necessarily fraudulent or unauthorized</strong> — it highlights spending that warrants your awareness or review.
        </div>
      </div>

      {/* Anomaly Metrics */}
      <div className="dashboard-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Flagged Anomalies</span>
            <div className="stat-icon rose">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{totalAnomalies}</div>
          <div className="stat-subtext">Identified by Isolation Forest</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Avg Anomaly Amount</span>
            <div className="stat-icon indigo">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value">₹{avgAnomalyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-subtext">Average value of outlier expenses</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Max Severity Score</span>
            <div className="stat-icon amber">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value">{maxScore.toFixed(1)}%</div>
          <div className="stat-subtext">Relative decision function deviation</div>
        </div>
      </div>

      {/* Anomalies Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Flagged Anomaly Transactions</div>
            <div className="card-subtitle">Sorted by machine learning outlier severity score</div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Evaluating dataset...
          </div>
        ) : anomalies.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 className="empty-state-icon" style={{ color: '#10b981' }} />
            <h3>No Anomalies Detected</h3>
            <p>All recorded expenses fall within expected statistical distributions for the current contamination rate.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Txn ID</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Anomaly Severity Score</th>
                  <th>Model Explanation / Decision Reason</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((anom) => (
                  <tr key={anom.id}>
                    <td><code>{anom.transaction_id || `TXN-${anom.id}`}</code></td>
                    <td>{anom.date}</td>
                    <td><strong>{anom.description}</strong></td>
                    <td><span className="badge badge-category">{anom.category}</span></td>
                    <td>
                      <strong style={{ color: '#ef4444', fontSize: '0.95rem' }}>
                        ₹{Number(anom.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </td>
                    <td>
                      <div className="score-bar-container">
                        <div className="score-bar-bg">
                          <div
                            className="score-bar-fill"
                            style={{
                              width: `${Math.min(anom.anomaly_score, 100)}%`,
                              backgroundColor: anom.anomaly_score > 85 ? '#ef4444' : '#f59e0b'
                            }}
                          />
                        </div>
                        <span className="score-text" style={{ color: anom.anomaly_score > 85 ? '#ef4444' : '#f59e0b' }}>
                          {anom.anomaly_score}%
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '320px', fontSize: '0.825rem', color: '#475569' }}>
                      {anom.anomaly_reason}
                    </td>
                    <td style={{ color: '#64748b' }}>{anom.payment_method}</td>
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
