import React, { useState, useEffect } from 'react';
import { 
  X, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  RefreshCw, 
  ShieldAlert, 
  User, 
  Phone 
} from 'lucide-react';
import { fetchMySosRequests, cancelUnsentSos } from '../services/sosService';

export default function MySosRequestsModal({ isOpen, onClose }) {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const items = await fetchMySosRequests();
      setRequests(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRequests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDeleteDraft = async (id) => {
    await cancelUnsentSos(id);
    setConfirmDeleteId(null);
    loadRequests();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending transmission':
        return { label: 'Pending Transmission (Offline)', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'Received':
        return { label: 'Received by Dispatch', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' };
      case 'Assigned':
        return { label: 'Assigned to Responder', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      case 'Responding':
        return { label: 'Responder En Route', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      case 'Resolved':
        return { label: 'Incident Resolved', bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
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
          maxWidth: '620px',
          maxHeight: '88vh',
          overflowY: 'auto',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingRight: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={20} color="#dc2626" /> My Emergency SOS Broadcasts
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Live dispatch status and responder tracking for your requests
            </p>
          </div>
          <button
            onClick={loadRequests}
            disabled={isLoading}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            Loading your incident transmissions...
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
            <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: '700', color: '#0f172a' }}>No Active SOS Calls Registered</div>
            <div style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              You have not transmitted any emergency distress calls from this device.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {requests.map((item) => {
              const badge = getStatusBadge(item.status);
              const isUnsentDraft = item.status === 'Pending transmission';

              return (
                <div 
                  key={item.clientGeneratedId || item.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#0f172a' }}>
                          {item.id || item.clientGeneratedId}
                        </span>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: '4px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontWeight: '700' }}>
                          {badge.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Initiated: {new Date(item.createdAt || item.queuedAt).toLocaleString()}
                      </div>
                    </div>

                    {isUnsentDraft && (
                      <div>
                        {confirmDeleteId === item.clientGeneratedId ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>Delete unsent?</span>
                            <button
                              onClick={() => handleDeleteDraft(item.clientGeneratedId)}
                              style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.45rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700' }}
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '4px', padding: '0.2rem 0.45rem', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(item.clientGeneratedId)}
                            style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
                            title="Delete unsent draft"
                          >
                            <Trash2 size={13} /> Cancel Draft
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#334155', background: '#f8fafc', padding: '0.6rem', borderRadius: '6px' }}>
                    <div><strong>Emergency:</strong> <span style={{ textTransform: 'capitalize' }}>{item.category}</span></div>
                    <div><strong>People Affected:</strong> {item.affectedCount}</div>
                    <div><strong>Coordinates:</strong> {item.coordinates?.latitude?.toFixed(4)}°, {item.coordinates?.longitude?.toFixed(4)}°</div>
                    <div><strong>Location Source:</strong> {item.locationSource || 'Browser GPS'}</div>
                  </div>

                  {item.description && (
                    <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      "{item.description}"
                    </div>
                  )}

                  {/* Assigned Responder Info */}
                  {item.assignedResponderName && (
                    <div style={{ marginTop: '0.6rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <User size={15} color="#16a34a" />
                      <div>
                        <strong>Assigned Responder:</strong> {item.assignedResponderName}
                      </div>
                    </div>
                  )}

                  {/* Audit Trail Snippet */}
                  {item.auditHistory && item.auditHistory.length > 0 && (
                    <div style={{ marginTop: '0.6rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>
                        LATEST PROGRESS UPDATE:
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                        • {item.auditHistory[item.auditHistory.length - 1].details} ({new Date(item.auditHistory[item.auditHistory.length - 1].timestamp).toLocaleTimeString()})
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              background: '#1e293b',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1.25rem',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
