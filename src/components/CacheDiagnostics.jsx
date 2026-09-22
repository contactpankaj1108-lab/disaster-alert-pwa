import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Trash2, CheckCircle2, HardDrive, ChevronDown, ChevronUp } from 'lucide-react';
import { getCacheDiagnostics, clearAllCache } from '../services/cacheService';

export default function CacheDiagnostics({ onCacheCleared }) {
  const [isOpen, setIsOpen] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  const loadDiagnostics = async () => {
    const data = await getCacheDiagnostics();
    setDiagnostics(data);
  };

  useEffect(() => {
    if (isOpen) {
      loadDiagnostics();
    }
  }, [isOpen]);

  const handleClear = async () => {
    if (window.confirm('Clear all local cached disaster alerts, weather observations, and facility storage?')) {
      setIsClearing(true);
      await clearAllCache();
      await loadDiagnostics();
      setIsClearing(false);
      if (onCacheCleared) onCacheCleared();
    }
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1.15rem', marginTop: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Database size={16} color="#475569" />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            Offline Storage & Cache Inspector (IndexedDB / LocalStorage)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          <span>{isOpen ? 'Hide Storage' : 'Inspect Local Cache'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-primary)' }}>
              <HardDrive size={15} color="#475569" />
              <span>Active Engine: <strong>{diagnostics?.storageEngine || 'Checking...'}</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                onClick={loadDiagnostics}
                className="tab-btn"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              >
                <RefreshCw size={12} /> Refresh Stats
              </button>
              <button
                onClick={handleClear}
                disabled={isClearing}
                className="tab-btn"
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
              >
                <Trash2 size={12} /> Clear Cache
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
            {diagnostics && Object.entries(diagnostics.records).map(([key, info]) => (
              <div 
                key={key} 
                style={{ background: 'var(--bg-subtle)', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              >
                <div style={{ fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', fontSize: '0.74rem' }}>
                  {key.replace('cached_', '')}
                </div>
                {info.cached ? (
                  <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.76rem' }}>
                    <div>Status: <span style={{ color: '#15803d', fontWeight: '600' }}>✔ Cached</span></div>
                    <div>Updated: {info.updatedAt} ({info.ageMinutes} min ago)</div>
                    <div>Payload: {info.sizeBytes} bytes</div>
                  </div>
                ) : (
                  <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                    No record in storage
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
