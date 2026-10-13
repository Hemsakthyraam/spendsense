import React, { useEffect, useState } from 'react';
import { transactionService } from '../services/api';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Copy,
  ArrowUpRight,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const CATEGORY_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#14b8a6', '#f97316', '#64748b'
];

export const Dashboard = ({ setActiveTab }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await transactionService.getSummary();
      setSummary(res.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading SpendSense analytics...</div>
      </div>
    );
  }

  const hasData = summary && summary.transaction_count > 0;

  if (!hasData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div className="empty-state-icon">
          <FileSpreadsheet size={54} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Expense Transactions Yet</h3>
        <p style={{ color: '#64748b', maxWidth: '480px', margin: '0 auto 24px' }}>
          Get started by uploading your expense CSV. SpendSense will automatically clean the data, identify duplicates, and run AI anomaly detection.
        </p>
        <button
          onClick={() => setActiveTab('upload')}
          className="btn btn-primary btn-lg"
        >
          <UploadCloud size={20} />
          Upload Your First CSV
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Spending</span>
            <div className="stat-icon emerald">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="stat-value">₹{summary.total_expenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-subtext">Across {summary.transaction_count} transactions</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Average Transaction</span>
            <div className="stat-icon indigo">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="stat-value">₹{summary.avg_transaction.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-subtext">Mean transaction value</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Total Transactions</span>
            <div className="stat-icon sky">
              <Receipt size={18} />
            </div>
          </div>
          <div className="stat-value">{summary.transaction_count}</div>
          <div className="stat-subtext">Cleaned & stored in SQLite</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Flagged Anomalies</span>
            <div className="stat-icon rose">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{summary.anomaly_count}</div>
          <div className="stat-subtext">Isolation Forest ML outliers</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-title">Identified Duplicates</span>
            <div className="stat-icon amber">
              <Copy size={18} />
            </div>
          </div>
          <div className="stat-value" style={{ color: '#d97706' }}>{summary.duplicate_count}</div>
          <div className="stat-subtext">Safely isolated records</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Monthly Trend Area Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Monthly Spending Trend</div>
              <div className="card-subtitle">Aggregated expenditures over time</div>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            {summary.monthly_trend && summary.monthly_trend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary.monthly_trend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Total Spent']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', paddingTop: '100px', color: '#94a3b8' }}>
                Single period detected
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Category Distribution</div>
              <div className="card-subtitle">Expense proportion by spending category</div>
            </div>
          </div>
          <div style={{ height: '260px', width: '100%' }}>
            {summary.category_summary && summary.category_summary.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.category_summary}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {summary.category_summary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name]}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Highest Value & Anomaly Alert Card */}
      {summary.highest_transaction && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          borderColor: '#312e81'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Highest Value Transaction In Dataset
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                {summary.highest_transaction.description}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <span>Date: {summary.highest_transaction.date}</span>
                <span>•</span>
                <span>Category: {summary.highest_transaction.category}</span>
                <span>•</span>
                <span>Payment: {summary.highest_transaction.payment_method}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38bdf8' }}>
                ₹{Number(summary.highest_transaction.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {summary.highest_transaction.is_anomaly === 1 && (
                <span className="badge badge-anomaly" style={{ marginTop: '6px' }}>
                  <AlertTriangle size={12} />
                  Flagged by Isolation Forest
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Recent Transactions</div>
            <div className="card-subtitle">Latest imported expense activities</div>
          </div>
          <button
            onClick={() => setActiveTab('transactions')}
            className="btn btn-secondary btn-sm"
          >
            View All ({summary.transaction_count})
            <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Txn ID</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {summary.recent_transactions.map((txn) => (
                <tr key={txn.id}>
                  <td><strong>{txn.transaction_id || `TXN-${txn.id}`}</strong></td>
                  <td>{txn.date}</td>
                  <td>{txn.description}</td>
                  <td>
                    <span className="badge badge-category">{txn.category}</span>
                  </td>
                  <td><strong>₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                  <td>
                    {txn.is_anomaly === 1 ? (
                      <span className="badge badge-anomaly" title={txn.anomaly_reason}>
                        <AlertTriangle size={12} />
                        Anomaly ({txn.anomaly_score}%)
                      </span>
                    ) : (
                      <span className="badge badge-normal">Normal</span>
                    )}
                  </td>
                  <td style={{ color: '#64748b' }}>{txn.payment_method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
