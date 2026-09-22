import React from 'react';
import { AlertOctagon, RefreshCw, Trash2, PhoneCall, ShieldCheck } from 'lucide-react';
import { clearAllCache } from '../services/cacheService';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[Emergency App Crash Prevented]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorage = async () => {
    if (window.confirm('Reset local application storage and restore default safe offline emergency settings?')) {
      await clearAllCache();
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#f8fafc',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            textAlign: 'center'
          }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertOctagon size={32} color="#dc2626" />
            </div>

            <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
              Disaster Management Client Recovery Mode
            </h1>

            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: '1.5', marginBottom: '1.25rem' }}>
              An unexpected UI runtime exception was intercepted. The application protected your session and prevented a system crash.
            </p>

            {/* Emergency Hotline Quick Access */}
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#b91c1c', fontSize: '0.88rem' }}>
                <PhoneCall size={16} /> Immediate Emergency Voice Helplines
              </div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '0.3rem' }}>
                If you are in danger, contact emergency dispatchers directly via telephone:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <a href="tel:112" style={{ background: '#dc2626', color: '#ffffff', padding: '0.3rem 0.75rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem' }}>
                  📞 Call 112 (National Police/Disaster)
                </a>
                <a href="tel:108" style={{ background: '#2563eb', color: '#ffffff', padding: '0.3rem 0.75rem', borderRadius: '4px', textDecoration: 'none', fontWeight: '700', fontSize: '0.85rem' }}>
                  📞 Call 108 (Medical Ambulance)
                </a>
              </div>
            </div>

            {/* Recovery Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <RefreshCw size={15} /> Reload Application
              </button>

              <button
                onClick={this.handleResetStorage}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '0.6rem 1.2rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Trash2 size={15} /> Reset Local Storage
              </button>
            </div>

            {/* Collapsible Error Debug Details */}
            {this.state.error && (
              <details style={{ marginTop: '1.5rem', textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '6px', fontSize: '0.76rem', color: '#475569' }}>
                <summary style={{ cursor: 'pointer', color: '#2563eb', fontWeight: '600' }}>
                  Technical Diagnostic Details
                </summary>
                <pre style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#b91c1c' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
