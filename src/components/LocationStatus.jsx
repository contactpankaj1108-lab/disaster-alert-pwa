import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  Loader2, 
  ShieldCheck, 
  Crosshair 
} from 'lucide-react';
import { FALLBACK_CITIES } from '../services/locationService';
import { validateCoordinates, sanitizeText } from '../utils/validators';

export default function LocationStatus({
  location,
  permissionStatus,
  isDetecting,
  errorMessage,
  onRequestLocation,
  onSelectManualLocation
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [coordError, setCoordError] = useState('');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const result = validateCoordinates(customLat, customLon);
    if (!result.isValid) {
      setCoordError(result.error);
      return;
    }

    const cleanCity = sanitizeText(customCity, 50);
    onSelectManualLocation({
      name: cleanCity || `Custom (${result.latitude.toFixed(2)}, ${result.longitude.toFixed(2)})`,
      latitude: result.latitude,
      longitude: result.longitude,
      source: 'Custom Coordinates'
    });
    setShowDropdown(false);
    setShowCustomInput(false);
    setCustomLat('');
    setCustomLon('');
    setCustomCity('');
    setCoordError('');
  };

  return (
    <div className="location-status-card" style={{ background: 'var(--bg-surface)', padding: '1.2rem', borderRadius: '10px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Location Information */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <ShieldCheck size={14} color="#16a34a" />
            <span>Monitored Region</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <MapPin size={22} color="var(--accent-blue)" />
            <span style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)' }}>
              {location?.city || 'Locating Area...'}
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Coordinates: <strong>{location ? `${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°` : '--'}</strong> 
            {location?.accuracy && <span> (±{location.accuracy}m accuracy)</span>}
            {' '}• Source: <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{location?.source || 'Default'}</span>
          </div>
        </div>

        {/* Action Controls & Permission Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* Permission Status Pill */}
          {permissionStatus === 'granted' && (
            <span className="badge normal" title="Browser Geolocation permission active">
              <CheckCircle2 size={13} /> GPS Active
            </span>
          )}
          {permissionStatus === 'denied' && (
            <span className="badge emergency" title="GPS permission denied in browser settings">
              <AlertCircle size={13} /> GPS Disabled
            </span>
          )}
          {permissionStatus === 'prompt' && (
            <span className="badge watch" title="Click 'Use My GPS' to allow browser location access">
              <Navigation size={13} /> GPS Prompt
            </span>
          )}

          {/* Trigger Browser Geolocation Button */}
          <button
            onClick={onRequestLocation}
            disabled={isDetecting}
            className="tab-btn"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.82rem',
              background: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)'
            }}
            title="Request current latitude/longitude from navigator.geolocation"
          >
            {isDetecting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Detecting GPS...
              </>
            ) : (
              <>
                <Crosshair size={14} /> Use My GPS
              </>
            )}
          </button>

          {/* Fallback Location Selector Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="tab-btn"
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.82rem',
                background: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              Select City <ChevronDown size={14} />
            </button>

            {showDropdown && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  minWidth: '240px',
                  padding: '0.5rem 0'
                }}
              >
                <div style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                  Regional Test Presets
                </div>
                {FALLBACK_CITIES.map((city) => (
                  <div
                    key={city.name}
                    onClick={() => {
                      onSelectManualLocation(city);
                      setShowDropdown(false);
                    }}
                    style={{
                      padding: '0.5rem 0.9rem',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{city.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {city.latitude.toFixed(1)}°, {city.longitude.toFixed(1)}°
                    </span>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid var(--border-color)', padding: '0.4rem 0.9rem 0' }}>
                  <button
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      padding: '0.2rem 0',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    {showCustomInput ? '▲ Hide Custom Input' : '▼ Custom Lat / Long Coordinates'}
                  </button>
                </div>

                {showCustomInput && (
                  <form onSubmit={handleCustomSubmit} style={{ padding: '0.6rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder="Location Name (e.g. Sector 17)"
                      value={customCity}
                      onChange={(e) => setCustomCity(e.target.value)}
                      style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        type="number"
                        step="any"
                        placeholder="Lat (-90 to 90)"
                        value={customLat}
                        onChange={(e) => { setCustomLat(e.target.value); setCoordError(''); }}
                        required
                        style={{ width: '50%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                      <input
                        type="number"
                        step="any"
                        placeholder="Lon (-180 to 180)"
                        value={customLon}
                        onChange={(e) => { setCustomLon(e.target.value); setCoordError(''); }}
                        required
                        style={{ width: '50%', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}
                      />
                    </div>
                    {coordError && (
                      <div style={{ color: '#dc2626', fontSize: '0.74rem', background: '#fef2f2', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
                        ⚠️ {coordError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="tab-btn active"
                      style={{ fontSize: '0.8rem', padding: '0.35rem', marginTop: '0.2rem', justifyContent: 'center' }}
                    >
                      Set Coordinates
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation Feedback Message (Warning or Error) */}
      {errorMessage && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.82rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <AlertCircle size={15} color="#ef4444" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
