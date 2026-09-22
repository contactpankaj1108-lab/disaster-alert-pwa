import React, { useState, useMemo } from 'react';
import { Map, Phone, Navigation, Info, ArrowUpDown, Compass, CheckCircle2 } from 'lucide-react';
import ResourceMap from '../components/ResourceMap';
import ResourceFilter from '../components/ResourceFilter';
import { getResourcesWithDistance } from '../data/emergencyResources';

export default function Resources({ location, initialFilter = 'all' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(
    initialFilter && initialFilter !== 'all' ? [initialFilter] : ['hospital', 'police', 'fire', 'shelter']
  );
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'name'
  const [selectedResource, setSelectedResource] = useState(null);

  // Load resources relative to current monitored coordinates with Haversine distance
  const rawResources = useMemo(() => {
    const lat = location?.latitude || 30.7333;
    const lon = location?.longitude || 76.7794;
    return getResourcesWithDistance(lat, lon);
  }, [location?.latitude, location?.longitude]);

  // Compute counts per category
  const counts = useMemo(() => {
    return rawResources.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});
  }, [rawResources]);

  // Filtered & Sorted resources
  const filteredResources = useMemo(() => {
    const list = rawResources.filter((res) => {
      const matchesType = selectedTypes.includes(res.type);
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        res.name.toLowerCase().includes(q) || 
        res.address.toLowerCase().includes(q) ||
        res.type.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });

    if (sortBy === 'distance') {
      return list.sort((a, b) => a.distanceKm - b.distanceKm);
    } else {
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
  }, [rawResources, selectedTypes, searchQuery, sortBy]);

  const handleToggleType = (typeId) => {
    setSelectedTypes((prev) => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  return (
    <div className="resources-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Header Info */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div className="card-title" style={{ marginBottom: '0.2rem' }}>
              <Map size={20} color="#475569" />
              Emergency Services & Safe Zones
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Interactive Leaflet map • Distance computed on-device via Haversine formula
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Showing {filteredResources.length} of {rawResources.length} Facilities
            </span>

            {/* Sort Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <ArrowUpDown size={13} />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                <option value="distance">Sort: Closest First</option>
                <option value="name">Sort: Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.35rem' }}>
          Real-time distance calculated via spherical trigonometry from your coordinates (<strong>{location?.city || 'Monitored Area'}</strong>).
          Clicking any facility automatically focuses and opens its interactive marker on the map.
        </p>

        {/* Demo Data Disclaimer Banner */}
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={14} color="#64748b" />
          <span>Notice: Facilities are from verified local offline datasets for simulation and demonstration. In real-world emergencies, always dial <strong>112</strong>.</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <ResourceFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTypes={selectedTypes}
        onToggleType={handleToggleType}
        counts={counts}
      />

      {/* Map + List Split Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) minmax(290px, 1.1fr)', gap: '1rem', minHeight: '540px' }}>
        
        {/* Interactive Leaflet Map Container */}
        <div style={{ height: '540px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <ResourceMap
            userLocation={location}
            resources={filteredResources}
            selectedResource={selectedResource}
            onSelectResource={setSelectedResource}
          />
        </div>

        {/* Facilities Directory List */}
        <div style={{ height: '540px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingRight: '0.25rem' }}>
          {filteredResources.length === 0 ? (
            <div style={{ background: 'var(--bg-surface)', padding: '2.5rem 1rem', textAlign: 'center', borderRadius: '8px', color: 'var(--text-muted)' }}>
              No facilities match the active filter criteria.
            </div>
          ) : (
            filteredResources.map((res) => {
              const isSelected = selectedResource?.id === res.id;
              const typeColors = {
                hospital: '#ef4444',
                police: '#3b82f6',
                fire: '#f97316',
                shelter: '#10b981'
              };
              const color = typeColors[res.type] || '#64748b';

              return (
                <div
                  key={res.id}
                  onClick={() => setSelectedResource(res)}
                  style={{
                    background: isSelected ? '#f1f5f9' : 'var(--bg-surface)',
                    border: isSelected ? '1px solid #94a3b8' : '1px solid var(--border-color)',
                    borderLeft: `4px solid ${color}`,
                    borderRadius: '8px',
                    padding: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}
                >
                  {/* Title & Proximity Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.94rem', color: 'var(--text-primary)', lineHeight: '1.3' }}>
                      {res.name}
                    </div>
                    {res.distanceText && (
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        background: '#e2e8f0',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap'
                      }}>
                        📍 {res.distanceText}
                      </span>
                    )}
                  </div>

                  {/* Category & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: '700', color: color }}>
                      {res.type}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={12} /> {res.status || 'Active'}
                    </span>
                  </div>

                  {/* Address */}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {res.address}
                  </div>

                  {/* Capacity Info */}
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {res.capacity}
                  </div>

                  {/* Service capabilities tags */}
                  {res.services && res.services.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      {res.services.map((svc, i) => (
                        <span key={i} style={{ fontSize: '0.7rem', background: '#f1f5f9', color: 'var(--text-secondary)', border: '1px solid #e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                          {svc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                    {res.phone && (
                      <a
                        href={`tel:${res.phone.split('/')[0].trim()}`}
                        onClick={(e) => e.stopPropagation()}
                        className="tab-btn"
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.55rem',
                          background: '#0f172a',
                          color: '#ffffff',
                          border: '1px solid #0f172a',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Phone size={12} /> Call Helpline
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedResource(res);
                      }}
                      className="tab-btn"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.25rem 0.55rem',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Compass size={12} /> View on Map
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
