import React, { useState, useEffect } from 'react';
import { analyticsService } from '../services/api';
import {
  BarChart3,
  PieChart as PieIcon,
  CreditCard,
  DollarSign,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#14b8a6', '#f97316', '#64748b'
];

export const Analytics = () => {
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [topTxns, setTopTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [mRes, cRes, pRes, tRes] = await Promise.all([
          analyticsService.getMonthly(),
          analyticsService.getCategories(),
          analyticsService.getPaymentMethods(),
          analyticsService.getTopTransactions(5)
        ]);
        setMonthly(mRes.data);
        setCategories(cRes.data);
        setPaymentMethods(pRes.data);
        setTopTxns(tRes.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        Calculating expense analytics...
      </div>
    );
  }

  const hasData = categories.length > 0 || monthly.length > 0;

  if (!hasData) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FileSpreadsheet className="empty-state-icon" />
        <h3>No Transaction Data Found</h3>
        <p style={{ color: '#64748b' }}>Please upload an expense dataset first to see comprehensive financial analytics.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Analytics Header Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BarChart3 size={26} style={{ color: '#10b981' }} />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Expense Analytics & Trends</h2>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '6px' }}>
              Multi-dimensional analysis of personal expenses across time horizons, spending categories, and payment channels.
            </p>
          </div>
          <span className="badge-tag badge-cppe" style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
            Data Engineering Module
          </span>
        </div>
      </div>

      {/* Row 1: Monthly Trend & Payment Methods */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        {/* Monthly Trend */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Chronological Spending Trajectory</div>
              <div className="card-subtitle">Monthly aggregate expenditures in USD</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthly} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Total Spent']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Payment Method Share</div>
              <div className="card-subtitle">Distribution across payment instruments</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethods}
                  dataKey="amount"
                  nameKey="payment_method"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {paymentMethods.map((entry, index) => (
                    <Cell key={`pm-${index}`} fill={PALETTE[index % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
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
          </div>
        </div>
      </div>

      {/* Row 2: Category Breakdown Bar Chart */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Category Spending Comparison</div>
            <div className="card-subtitle">Total volume by categorized expense type</div>
          </div>
        </div>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#64748b' }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Total Spent']}
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                {categories.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Top Transactions Spotlight Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Top 5 Highest-Value Transactions</div>
            <div className="card-subtitle">Largest single outflow transactions in your dataset</div>
          </div>
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
                <th>Payment Method</th>
                <th>Anomaly Status</th>
              </tr>
            </thead>
            <tbody>
              {topTxns.map((t) => (
                <tr key={t.id}>
                  <td><code>{t.transaction_id || `TXN-${t.id}`}</code></td>
                  <td>{t.date}</td>
                  <td><strong>{t.description}</strong></td>
                  <td><span className="badge badge-category">{t.category}</span></td>
                  <td>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>
                      ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </td>
                  <td style={{ color: '#64748b' }}>{t.payment_method}</td>
                  <td>
                    {t.is_anomaly === 1 ? (
                      <span className="badge badge-anomaly">
                        Anomaly ({t.anomaly_score}%)
                      </span>
                    ) : (
                      <span className="badge badge-normal">Normal</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
