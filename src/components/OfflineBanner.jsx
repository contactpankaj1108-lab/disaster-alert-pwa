import React from 'react';
import { WifiOff, AlertCircle, PhoneCall, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function OfflineBanner({
  isOnline,
  isSimulatedOffline,
  onToggleSimulateOffline,
  lastUpdated,
  cacheAgeMinutes = 0,
  onRetryConnection
}) {
  const isActuallyOffline = !isOnline || isSimulatedOffline;

  return (
    <div 
      className="offline-banner-container"
      style={{
        background: isActuallyOffline ? '#fff1f2' : 'transparent',
        borderBottom: isActuallyOffline ? '1px solid #fecdd3' : 'none',
        color: '#9f1239',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      {isActuallyOffline ? (
        <div style={{
          maxWidth: '1220px',
          margin: '0 auto',
          padding: '0.6rem 1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.6rem',
          fontSize: '0.85rem'
        }}>
          {/* Status Message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}>
            <WifiOff size={18} color="#e11d48" />
            <span>
              <strong>Offline Mode</strong> — Showing saved local data 
              {cacheAgeMinutes > 0 ? ` (Cached ${cacheAgeMinutes} min ago at ${lastUpdated})` : ` (Synced at ${lastUpdated})`}.
            </span>
          </div>

          {/* Quick Helpline & Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', background: '#ffe4e6', color: '#881337', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #fecdd3' }}>
              <PhoneCall size={13} color="#e11d48" />
              <span>Emergency Helplines: <strong>112 / 108</strong></span>
            </div>

            {onRetryConnection && !isSimulatedOffline && (
              <button
                onClick={onRetryConnection}
                className="tab-btn"
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  background: '#ffffff',
                  color: '#9f1239',
                  border: '1px solid #fecdd3',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <RefreshCw size={12} /> Retry Network
              </button>
            )}

            {/* Offline Simulation Toggle Button */}
            <button
              onClick={onToggleSimulateOffline}
              className="tab-btn"
              style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.55rem',
                background: isSimulatedOffline ? '#16a34a' : '#ffffff',
                color: isSimulatedOffline ? '#ffffff' : '#9f1239',
                border: '1px solid #fecdd3',
                fontWeight: '600'
              }}
              title="Toggle simulated offline state for presentation and evaluation without unplugging Wi-Fi"
            >
              {isSimulatedOffline ? '✔ Exit Simulated Offline' : '⚡ Simulate Offline'}
            </button>
          </div>
        </div>
      ) : (
        /* When online, show small unobtrusive simulation trigger in test mode if desired */
        <div style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.25rem 1.5rem',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--text-muted)'
        }}>
          <span>Offline Test Mode:</span>
          <button
            onClick={onToggleSimulateOffline}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: 'var(--text-primary)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              fontSize: '0.72rem',
              cursor: 'pointer'
            }}
          >
            ⚡ Simulate Offline
          </button>
        </div>
      )}
    </div>
  );
}
