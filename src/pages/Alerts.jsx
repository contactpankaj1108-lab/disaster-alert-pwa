import React, { useState, useMemo, useEffect } from 'react';
import { BellRing, Search, Filter, ShieldAlert, CheckCircle2, AlertOctagon, AlertTriangle } from 'lucide-react';
import AlertCard from '../components/AlertCard';

export default function Alerts({ alerts = [] }) {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Debounce search input to conserve low-bandwidth resources
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Compute available types from the alert collection
  const availableTypes = useMemo(() => {
    const types = new Set(alerts.map((a) => a.type));
    return ['ALL', ...Array.from(types)];
  }, [alerts]);

  // Count severities
  const stats = useMemo(() => {
    let emergencies = 0;
    let warnings = 0;
    let watches = 0;
    for (const a of alerts) {
      const s = (a.severity || '').toLowerCase();
      if (s.includes('emergency') || s.includes('critical')) emergencies++;
      else if (s.includes('warning') || s.includes('high')) warnings++;
      else watches++;
    }
    return { emergencies, warnings, watches, total: alerts.length };
  }, [alerts]);

  // Filter alerts according to search, severity, and type
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Severity check
      if (severityFilter !== 'ALL') {
        if (alert.severity.toUpperCase() !== severityFilter) return false;
      }

      // Type check
      if (typeFilter !== 'ALL') {
        if (alert.type !== typeFilter) return false;
      }

      // Query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = alert.title.toLowerCase().includes(q);
        const matchesDesc = alert.description.toLowerCase().includes(q);
        const matchesLoc = alert.location.toLowerCase().includes(q);
        const matchesAction = (alert.recommendedAction || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesAction) return false;
      }

      return true;
    });
  }, [alerts, severityFilter, typeFilter, searchQuery]);

  return (
    <div className="alerts-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Top Banner Card */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div className="card-title" style={{ marginBottom: '0.25rem' }}>
              <BellRing size={20} color="#fbbf24" />
              Live Emergency Advisories & Weather Alerts
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>
              Real-time regional notices processed from weather and seismic data feeds, prioritized by urgency.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge emergency" style={{ fontSize: '0.75rem' }}>
              <AlertOctagon size={13} /> {stats.emergencies} Emergency
            </span>
            <span className="badge warning" style={{ fontSize: '0.75rem' }}>
              <AlertTriangle size={13} /> {stats.warnings} Warning
            </span>
            <span className="badge watch" style={{ fontSize: '0.75rem' }}>
              <ShieldAlert size={13} /> {stats.watches} Watch
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 0, padding: '0.9rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          
          {/* Text Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.75rem' }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search alerts by keyword, location, or required protective action..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                width: '100%'
              }}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearchQuery('');
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            
            {/* Severity Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Severity:</span>
              {['ALL', 'EMERGENCY', 'WARNING', 'WATCH'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className="tab-btn"
                  style={{
                    fontSize: '0.76rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: severityFilter === sev ? '#0f172a' : 'var(--bg-card)',
                    color: severityFilter === sev ? '#ffffff' : 'var(--text-secondary)',
                    border: severityFilter === sev ? '1px solid #0f172a' : '1px solid var(--border-color)'
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Type:</span>
              {availableTypes.map((typ) => (
                <button
                  key={typ}
                  onClick={() => setTypeFilter(typ)}
                  className="tab-btn"
                  style={{
                    fontSize: '0.76rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '4px',
                    background: typeFilter === typ ? '#0f172a' : 'var(--bg-card)',
                    color: typeFilter === typ ? '#ffffff' : 'var(--text-secondary)',
                    border: typeFilter === typ ? '1px solid #0f172a' : '1px solid var(--border-color)'
                  }}
                >
                  {typ}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Alert Feed List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.25rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filteredAlerts.length} of {alerts.length} Active Hazard Notifications
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Ranked by Hazard Priority
          </span>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--bg-card)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🟢</div>
            <div style={{ fontWeight: '700', fontSize: '1.15rem', color: 'var(--text-primary)' }}>No Matching Active Alerts</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
              No disaster hazards match your active search or severity filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
