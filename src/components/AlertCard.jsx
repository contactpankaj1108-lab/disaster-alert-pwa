import React from 'react';
import { AlertTriangle, Info, AlertOctagon, ShieldAlert, Clock, MapPin } from 'lucide-react';

export default function AlertCard({ alert }) {
  const {
    title,
    type = 'General',
    severity = 'Watch',
    location = 'Local Area',
    description,
    recommendedAction,
    source = 'Public Agency',
    startTime,
    endTime
  } = alert;

  // Severity color & icon mapping
  const getSeverityConfig = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s.includes('emergency') || s.includes('extreme') || s.includes('critical')) {
      return {
        badgeClass: 'emergency',
        border: 'var(--status-emergency)',
        icon: AlertOctagon,
        iconColor: 'var(--status-emergency)',
        label: 'EMERGENCY'
      };
    }
    if (s.includes('warning') || s.includes('high') || s.includes('severe')) {
      return {
        badgeClass: 'warning',
        border: 'var(--status-warning)',
        icon: AlertTriangle,
        iconColor: 'var(--status-warning)',
        label: 'WARNING'
      };
    }
    if (s.includes('watch') || s.includes('moderate') || s.includes('advisory')) {
      return {
        badgeClass: 'watch',
        border: 'var(--status-watch)',
        icon: ShieldAlert,
        iconColor: 'var(--status-watch)',
        label: 'WATCH / ADVISORY'
      };
    }
    return {
      badgeClass: 'normal',
      border: 'var(--status-normal)',
      icon: Info,
      iconColor: 'var(--status-normal)',
      label: 'INFORMATIONAL'
    };
  };

  const config = getSeverityConfig(severity);
  const IconComponent = config.icon;

  return (
    <div
      className="alert-card"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderLeft: `5px solid ${config.border}`,
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <IconComponent size={20} color={config.iconColor} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
            {type}
          </span>
          <span className={`badge ${config.badgeClass}`}>{config.label}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <MapPin size={13} /> {location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          Source: {source}
        </span>
        {startTime && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Clock size={13} /> Effective: {startTime}
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
        {description}
      </p>

      {recommendedAction && (
        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '0.65rem 0.85rem',
            fontSize: '0.86rem',
            color: 'var(--text-primary)'
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Protective Action: </strong>
          <span style={{ color: 'var(--text-secondary)' }}>{recommendedAction}</span>
        </div>
      )}
    </div>
  );
}
