import React, { useEffect, useState } from 'react';
import { healthService } from '../services/api';
import { CheckCircle2, AlertCircle, IndianRupee } from 'lucide-react';

export const Navbar = ({ title }) => {
  const [backendStatus, setBackendStatus] = useState('checking');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await healthService.check();
        if (res.data.status === 'healthy') {
          setBackendStatus('connected');
        } else {
          setBackendStatus('warning');
        }
      } catch (err) {
        setBackendStatus('disconnected');
      }
    };
    checkBackend();
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-title">
        <span>{title}</span>
      </div>

      <div className="topbar-actions">
        <span className="badge-tag" style={{ backgroundColor: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1' }}>
          <IndianRupee size={13} style={{ color: '#10b981' }} />
          INR (₹)
        </span>

        <span
          className="badge-tag"
          style={{
            backgroundColor: backendStatus === 'connected' ? '#d1fae5' : '#fee2e2',
            color: backendStatus === 'connected' ? '#065f46' : '#991b1b',
            border: `1px solid ${backendStatus === 'connected' ? '#a7f3d0' : '#fecaca'}`,
          }}
        >
          {backendStatus === 'connected' ? (
            <>
              <CheckCircle2 size={13} />
              System Online
            </>
          ) : (
            <>
              <AlertCircle size={13} />
              API Offline
            </>
          )}
        </span>
      </div>
    </header>
  );
};
