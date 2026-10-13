import React from 'react';
import {
  LayoutDashboard,
  UploadCloud,
  Receipt,
  AlertTriangle,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload CSV', icon: UploadCloud },
  { id: 'transactions', label: 'All Transactions', icon: Receipt },
  { id: 'anomalies', label: 'Anomaly Detection', icon: AlertTriangle },
  { id: 'analytics', label: 'Expense Analytics', icon: BarChart3 },
  { id: 'reports', label: 'Reports & S3', icon: FileText },
  { id: 'settings', label: 'Account Settings', icon: Settings },
];

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="sidebar-logo-text">Spend<span>Sense</span></div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', letterSpacing: '0.04em' }}>
            PERSONAL EXPENSE ANALYTICS
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username || 'User'}</div>
            <div className="user-role">{user?.email || 'Logged In'}</div>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
};
