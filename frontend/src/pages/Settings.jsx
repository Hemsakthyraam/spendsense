import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Shield,
  LogOut,
  IndianRupee,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const Settings = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Product Account Header */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: 800,
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.25)'
            }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {user?.full_name || user?.username || 'User Account'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '2px' }}>
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>

          <span className="badge-tag" style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', padding: '6px 14px' }}>
            <CheckCircle2 size={14} />
            Active Account
          </span>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div className="card-title">
            <User size={18} style={{ color: '#6366f1' }} />
            Profile Information
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Username
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {user?.username}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Email Address
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {user?.email}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Default Currency
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IndianRupee size={18} style={{ color: '#10b981' }} />
              INR (₹ Indian Rupee)
            </div>
          </div>
        </div>
      </div>

      {/* Security & Logout Card */}
      <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
        <div className="card-header">
          <div className="card-title">
            <Shield size={18} style={{ color: '#6366f1' }} />
            Session & Security
          </div>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
          You are securely logged in with a cryptographically hashed session. Clicking logout will securely terminate your current session on this device.
        </p>

        <button
          onClick={logout}
          className="btn btn-danger btn-lg"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
        >
          <LogOut size={18} />
          Sign Out of SpendSense
        </button>
      </div>
    </div>
  );
};
