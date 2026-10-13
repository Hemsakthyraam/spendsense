import React, { useState, useEffect } from 'react';
import { transactionService } from '../services/api';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';

export const TransactionsList = () => {
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all' or 'duplicates'
  const [transactions, setTransactions] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [anomalyFilter, setAnomalyFilter] = useState('all'); // 'all', '1', '0'
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  // Categories list
  const [categories, setCategories] = useState([]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {
        sort_by: sortBy,
        order: order,
      };
      if (search.trim()) params.search = search.trim();
      if (category !== 'all') params.category = category;
      if (anomalyFilter !== 'all') params.is_anomaly = parseInt(anomalyFilter, 10);

      const [txnRes, dupRes] = await Promise.all([
        transactionService.getAll(params),
        transactionService.getDuplicates()
      ]);

      setTransactions(txnRes.data);
      setDuplicates(dupRes.data);

      // Extract unique categories
      const cats = Array.from(new Set(txnRes.data.map(t => t.category))).sort();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [category, anomalyFilter, sortBy, order]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleClearData = async () => {
    if (window.confirm('Are you sure you want to delete all transactions and duplicate records? This action cannot be undone.')) {
      try {
        await transactionService.clearAll();
        fetchTransactions();
      } catch (err) {
        alert('Failed to clear data: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  return (
    <div>
      {/* Tab Switcher & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`btn ${activeSubTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          >
            All Cleaned Transactions ({transactions.length})
          </button>
          <button
            onClick={() => setActiveSubTab('duplicates')}
            className={`btn ${activeSubTab === 'duplicates' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ position: 'relative' }}
          >
            <Copy size={16} />
            Flagged Duplicates ({duplicates.length})
            {duplicates.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b'
              }} />
            )}
          </button>
        </div>

        <button
          onClick={handleClearData}
          className="btn btn-secondary btn-sm"
          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
          title="Reset your transaction database"
        >
          <Trash2 size={14} />
          Reset All Data
        </button>
      </div>

      {activeSubTab === 'all' ? (
        <>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
              {/* Search */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search description / ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ padding: '8px 12px' }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <Search size={15} />
                </button>
              </form>

              {/* Category Dropdown */}
              <div>
                <select
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Anomaly Status Dropdown */}
              <div>
                <select
                  className="form-select"
                  value={anomalyFilter}
                  onChange={(e) => setAnomalyFilter(e.target.value)}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="all">All Statuses</option>
                  <option value="1">Flagged Anomalies Only</option>
                  <option value="0">Normal Transactions Only</option>
                </select>
              </div>

              {/* Sort By Dropdown */}
              <div>
                <select
                  className="form-select"
                  value={`${sortBy}-${order}`}
                  onChange={(e) => {
                    const [s, o] = e.target.value.split('-');
                    setSortBy(s);
                    setOrder(o);
                  }}
                  style={{ padding: '8px 12px' }}
                >
                  <option value="date-desc">Newest Date First</option>
                  <option value="date-asc">Oldest Date First</option>
                  <option value="amount-desc">Highest Amount First</option>
                  <option value="amount-asc">Lowest Amount First</option>
                  <option value="score-desc">Highest Anomaly Severity</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="card">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                Loading transactions...
              </div>
            ) : transactions.length === 0 ? (
              <div className="empty-state">
                <FileSpreadsheet className="empty-state-icon" />
                <h3>No Matching Transactions</h3>
                <p>Try modifying your search or filter options, or upload new data.</p>
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
                      <th>Status & Severity</th>
                      <th>Reason / Detail</th>
                      <th>Payment Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td><code>{t.transaction_id || `TXN-${t.id}`}</code></td>
                        <td>{t.date}</td>
                        <td><strong>{t.description}</strong></td>
                        <td><span className="badge badge-category">{t.category}</span></td>
                        <td><strong>₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                        <td>
                          {t.is_anomaly === 1 ? (
                            <span className="badge badge-anomaly">
                              <AlertTriangle size={12} />
                              Anomaly ({t.anomaly_score}%)
                            </span>
                          ) : (
                            <span className="badge badge-normal">
                              <CheckCircle2 size={12} />
                              Normal
                            </span>
                          )}
                        </td>
                        <td style={{ maxWidth: '280px', fontSize: '0.8rem', color: '#64748b' }}>
                          {t.anomaly_reason || 'Typical spending pattern.'}
                        </td>
                        <td style={{ color: '#64748b' }}>{t.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Flagged Duplicates View */
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Copy size={20} style={{ color: '#f59e0b' }} />
                Identified Duplicate Records
              </div>
              <div className="card-subtitle">
                These transactions were detected as duplicates based on Transaction ID or the combined signature of Date, Amount, Description, and Category. They were safely separated to protect financial dataset integrity.
              </div>
            </div>
          </div>

          {duplicates.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 className="empty-state-icon" style={{ color: '#10b981' }} />
              <h3>Zero Duplicates Found</h3>
              <p>Your imported expense records contain no duplicate transactions.</p>
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
                    <th>Payment Method</th>
                    <th>Duplicate Detection Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d) => (
                    <tr key={d.id} style={{ backgroundColor: '#fffbeb' }}>
                      <td><code>{d.transaction_id || 'N/A'}</code></td>
                      <td>{d.date}</td>
                      <td><strong>{d.description}</strong></td>
                      <td><span className="badge badge-category">{d.category}</span></td>
                      <td><strong style={{ color: '#b45309' }}>₹{Number(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                      <td>{d.payment_method}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500 }}>
                          {d.duplicate_reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
