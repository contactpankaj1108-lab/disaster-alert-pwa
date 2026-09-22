import React from 'react';
import { 
  Activity, 
  AlertTriangle, 
  ShieldCheck, 
  Hospital, 
  Shield, 
  Flame, 
  Home as HomeIcon, 
  CloudRain, 
  Wind, 
  Thermometer, 
  ArrowRight,
  Clock,
  RefreshCw
} from 'lucide-react';
import LocationStatus from './LocationStatus';
import AlertCard from './AlertCard';
import CacheDiagnostics from './CacheDiagnostics';
import SystemDiagnostics from './SystemDiagnostics';

export default function Dashboard({
  location,
  permissionStatus,
  isDetecting,
  errorMessage,
  onRequestLocation,
  onSelectManualLocation,
  emergencyLevel,
  isOnline,
  lastUpdated,
  alerts = [],
  weatherData,
  resourceStats = { hospitals: 4, police: 3, fire: 2, shelters: 5 },
  onNavigate,
  onRefreshData,
  isSyncing = false,
  isOfflineFallback = false
}) {
  return (
    <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Location & Geolocation Header */}
      <LocationStatus
        location={location}
        permissionStatus={permissionStatus}
        isDetecting={isDetecting}
        errorMessage={errorMessage}
        onRequestLocation={onRequestLocation}
        onSelectManualLocation={onSelectManualLocation}
      />

      {/* 2. Emergency Status & Environmental Conditions Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        
        {/* Threat Level Card */}
        <div className="card" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title" style={{ marginBottom: 0 }}>
                <Activity size={18} color="var(--accent-blue)" />
                Hazard Advisory Status
              </div>
              <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: isOfflineFallback ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isOfflineFallback ? '#fca5a5' : '#86efac' }}>
                {isOfflineFallback ? 'Offline Saved Data' : 'Live Public Feed'}
              </span>
            </div>
            <div style={{ margin: '0.75rem 0' }}>
              {emergencyLevel === 'normal' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>🟢</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--status-normal)' }}>ALL CLEAR</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>No active severe weather or disaster warnings</div>
                  </div>
                </div>
              )}
              {emergencyLevel === 'watch' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>🟡</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--status-watch)' }}>WEATHER WATCH</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Advisory conditions reported; keep phone charged</div>
                  </div>
                </div>
              )}
              {emergencyLevel === 'warning' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>🟠</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--status-warning)' }}>WARNING ACTIVE</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Hazardous conditions nearby; prepare for safety action</div>
                  </div>
                </div>
              )}
              {emergencyLevel === 'emergency' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '2rem' }}>🔴</span>
                  <div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--status-emergency)' }}>EMERGENCY ALERT</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Immediate life safety risk; take shelter now</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={13} /> Updated: {lastUpdated}
            </span>
            {onRefreshData && (
              <button 
                onClick={onRefreshData}
                disabled={isSyncing}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-blue)', cursor: isSyncing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
              >
                <RefreshCw size={13} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} /> {isSyncing ? 'Updating...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>

        {/* Live Weather / Environment Card */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ marginBottom: 0 }}>
              <CloudRain size={18} color="var(--accent-blue)" />
              Local Weather Conditions
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Open-Meteo Feed
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <Thermometer size={18} color="#d97706" style={{ margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temperature</div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {weatherData?.temperature ?? '28'}°C
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <Wind size={18} color="#0284c7" style={{ margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wind Speed</div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {weatherData?.windSpeed ?? '14'} km/h
              </div>
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
              <CloudRain size={18} color="#6366f1" style={{ margin: '0 auto 0.25rem' }} />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Condition</div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {weatherData?.condition ?? 'Clear'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Active Disaster Alerts Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>
            <AlertTriangle size={18} color="var(--status-watch)" />
            Live Alerts & Advisories ({alerts.length})
          </div>
          {alerts.length > 0 && (
            <button
              onClick={() => onNavigate('alerts')}
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              View All Alerts <ArrowRight size={14} />
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
            <ShieldCheck size={36} color="var(--status-normal)" style={{ margin: '0 auto 0.5rem' }} />
            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>No active disaster warnings</div>
            <div style={{ fontSize: '0.85rem' }}>Current area conditions are within safe operating limits.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {alerts.slice(0, 2).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* 4. Quick Emergency Directory Finder */}
      <div className="card">
        <div className="card-title">
          <Hospital size={18} color="var(--accent-blue)" />
          Find Nearest Emergency Facilities
        </div>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Distances calculated in real-time using client-side Haversine geodesic formula.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <button
            onClick={() => onNavigate('resources', 'hospital')}
            className="tab-btn"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Hospital size={26} color="#dc2626" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Hospitals</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {resourceStats.hospitals} Facilities Nearby
            </span>
          </button>

          <button
            onClick={() => onNavigate('resources', 'police')}
            className="tab-btn"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Shield size={26} color="#2563eb" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Police Stations</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {resourceStats.police} Stations Nearby
            </span>
          </button>

          <button
            onClick={() => onNavigate('resources', 'fire')}
            className="tab-btn"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Flame size={26} color="#ea580c" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Fire Stations</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {resourceStats.fire} Stations Nearby
            </span>
          </button>

          <button
            onClick={() => onNavigate('resources', 'shelter')}
            className="tab-btn"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '0.85rem',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <HomeIcon size={26} color="#16a34a" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>Emergency Shelters</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {resourceStats.shelters} Evacuation Shelters
            </span>
          </button>
        </div>
      </div>

      {/* 5. Offline Storage & Cache Diagnostics (IndexedDB / LocalStorage) */}
      <CacheDiagnostics onCacheCleared={onRefreshData} />

      {/* 6. Step 14 Live System Diagnostic & Verification Suite */}
      <SystemDiagnostics />

    </div>
  );
}
