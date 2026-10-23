import React, { useState } from 'react';
import { Shield, Lock, Mail, X, AlertCircle, KeyRound } from 'lucide-react';
import { authorityAuth } from '../services/authorityAuthService';

export default function AuthorityLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const user = await authorityAuth.login(email, password);
      if (onLoginSuccess) onLoginSuccess(user);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemoAccount = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div 
            style={{ 
              background: '#1e293b', 
              color: '#ffffff', 
              width: '42px', 
              height: '42px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Authority Command Center
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Dispatcher & First Responder Portal (RBAC Protected)
            </p>
          </div>
        </div>

        {/* Demo Accounts Quick-Fill Card */}
        <div 
          style={{ 
            background: '#f0fdf4', 
            border: '1px solid #bbf7d0', 
            borderRadius: '8px', 
            padding: '0.65rem', 
            marginBottom: '1rem',
            fontSize: '0.75rem' 
          }}
        >
          <div style={{ fontWeight: '700', color: '#166534', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <KeyRound size={13} /> Demo Accounts (Click to Auto-fill):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => handleUseDemoAccount('dispatcher@resqalert.org', 'DispatchPass123!')}
              style={{
                background: '#ffffff',
                border: '1px solid #86efac',
                borderRadius: '4px',
                padding: '0.35rem 0.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.73rem',
                color: '#14532d'
              }}
            >
              <strong>👮 Dispatcher Role:</strong> <code>dispatcher@resqalert.org</code> (Full dispatch & assignment)
            </button>
            <button
              type="button"
              onClick={() => handleUseDemoAccount('responder@resqalert.org', 'ResponderPass123!')}
              style={{
                background: '#ffffff',
                border: '1px solid #86efac',
                borderRadius: '4px',
                padding: '0.35rem 0.5rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '0.73rem',
                color: '#14532d'
              }}
            >
              <strong>🚑 Responder Role:</strong> <code>responder@resqalert.org</code> (Assigned incident workflow)
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
              <Mail size={13} /> Official Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dispatcher@resqalert.org"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
              <Lock size={13} /> Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: '#1e293b',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1rem',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: '0.5rem'
            }}
          >
            {isLoading ? 'Verifying Authorization...' : 'Sign In to Command Center'}
          </button>
        </form>
      </div>
    </div>
  );
}
