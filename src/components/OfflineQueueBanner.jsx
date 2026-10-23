import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { 
  getQueuedSosRequests, 
  getQueuedHazards, 
  syncOfflineQueues, 
  subscribeToQueueChanges 
} from '../services/offlineQueueService';

export default function OfflineQueueBanner({ onOpenSosRequests }) {
  const [sosCount, setSosCount] = useState(0);
  const [hazardCount, setHazardCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState(null);

  const checkQueues = async () => {
    const sos = await getQueuedSosRequests();
    const haz = await getQueuedHazards();
    setSosCount(sos.length);
    setHazardCount(haz.length);
  };

  useEffect(() => {
    checkQueues();
    const unsubscribe = subscribeToQueueChanges(checkQueues);
    return () => unsubscribe();
  }, []);

  const totalQueued = sosCount + hazardCount;
  if (totalQueued === 0 && !syncStatusMsg) return null;

  const handleManualRetry = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('Attempting emergency transmission to dispatch...');

    try {
      const results = await syncOfflineQueues();
      if (results.online === false) {
        setSyncStatusMsg('⚠️ Device is still offline. Queued items will transmit automatically when internet returns.');
      } else if (results.sosSucceeded > 0 || results.hazardsSucceeded > 0) {
        setSyncStatusMsg(`✅ Successfully transmitted ${results.sosSucceeded} SOS call(s) and ${results.hazardsSucceeded} hazard report(s)!`);
        setTimeout(() => setSyncStatusMsg(null), 6000);
      } else {
        setSyncStatusMsg('⚠️ Transmission could not reach dispatch. Retrying with exponential backoff...');
        setTimeout(() => setSyncStatusMsg(null), 5000);
      }
    } catch {
      setSyncStatusMsg('⚠️ Transmission error. Requests remain safe in local queue.');
      setTimeout(() => setSyncStatusMsg(null), 5000);
    } finally {
      setIsSyncing(false);
      checkQueues();
    }
  };

  return (
    <div 
      style={{
        background: '#fffbeb',
        borderBottom: '2px solid #f59e0b',
        borderTop: '1px solid #fde68a',
        padding: '0.65rem 1rem',
        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
      }}
    >
      <div 
        style={{
          maxWidth: '1220px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div 
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: '#fef3c7',
              border: '1px solid #fde68a',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Radio size={16} style={{ animation: 'pulse 1.5s infinite' }} />
          </div>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#92400e', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>⚠️ PENDING TRANSMISSION ({totalQueued}):</span>
              <span style={{ fontWeight: '500' }}>
                {sosCount > 0 && `${sosCount} SOS Emergency Call(s)`}
                {sosCount > 0 && hazardCount > 0 && ' & '}
                {hazardCount > 0 && `${hazardCount} Hazard Report(s)`}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#b45309' }}>
              {syncStatusMsg || 'Stored securely in device IndexedDB. NOT yet acknowledged by dispatch server.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {onOpenSosRequests && (
            <button
              onClick={onOpenSosRequests}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Review / Cancel Drafts
            </button>
          )}

          <button
            onClick={handleManualRetry}
            disabled={isSyncing}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              boxShadow: '0 2px 5px rgba(217, 119, 6, 0.3)'
            }}
          >
            <RefreshCw size={12} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Transmitting...' : 'Retry Transmission Now'}
          </button>
        </div>
      </div>
    </div>
  );
}
