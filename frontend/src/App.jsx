import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { UploadTransactions } from './pages/UploadTransactions';
import { TransactionsList } from './pages/TransactionsList';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { Analytics } from './pages/Analytics';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const TAB_TITLES = {
  dashboard: 'Executive Financial Dashboard',
  upload: 'Expense CSV Upload & Ingestion',
  transactions: 'Cleaned Transaction Database',
  anomalies: 'AI Isolation Forest Anomaly Radar',
  analytics: 'Expense Trends & Distribution Analytics',
  reports: 'Reports & Amazon S3 Cloud Archival',
  settings: 'Account Settings',
};

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#ffffff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
            Spend<span style={{ color: '#10b981' }}>Sense</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            Loading secure session...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="main-layout">
        <Navbar title={TAB_TITLES[activeTab] || 'SpendSense'} />

        <main className="main-content">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'upload' && <UploadTransactions setActiveTab={setActiveTab} />}
          {activeTab === 'transactions' && <TransactionsList />}
          {activeTab === 'anomalies' && <AnomalyDetection />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
