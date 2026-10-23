import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Shield, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  LogOut, 
  RefreshCw, 
  Check,
  Radio
} from 'lucide-react';
import L from 'leaflet';
import { authorityAuth } from '../services/authorityAuthService';
import { fetchAuthorityHazards, updateHazardVerification } from '../services/hazardService';

export default function AuthorityDashboard({ onLogout }) {
  const [currentUser] = useState(() => authorityAuth.getUser());
  const [activeTab, setActiveTab] = useState('incidents'); // 'incidents' | 'map' | 'hazards'

  // Incidents Data & Filters
  const [incidents, setIncidents] = useState([]);
  const [responders, setResponders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'affected', 'severity'
  const [onlyMyAssigned, setOnlyMyAssigned] = useState(false);

  // Selected Incident for Assignment / Status Update Modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [actionStatus, setActionStatus] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [assignedResponderId, setAssignedResponderId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Hazards Verification Data
  const [hazards, setHazards] = useState([]);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [hazardActionNote, setHazardActionNote] = useState('');

  // Map Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const incidentMarkersLayerRef = useRef(null);

  // Load Incidents and Responders
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const headers = authorityAuth.getAuthHeaders();
      let incidentUrl = `/api/authority/incidents?status=${filterStatus}&category=${filterCategory}&search=${encodeURIComponent(searchTerm)}`;
      if (onlyMyAssigned && currentUser?.role === 'responder') {
        incidentUrl += '&assignedToMe=true';
      }

      const res = await fetch(incidentUrl, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          authorityAuth.logout();
          if (onLogout) onLogout();
          return;
        }
        throw new Error('Failed to fetch incidents.');
      }

      const data = await res.json();
      setIncidents(data.incidents || []);

      // If Dispatcher, also load responders list
      if (currentUser?.role === 'dispatcher') {
        const respRes = await fetch('/api/authority/responders', { headers });
        if (respRes.ok) {
          const respData = await respRes.json();
          setResponders(respData.responders || []);
        }
      }

      // Load hazards
      const hazList = await fetchAuthorityHazards();
      setHazards(hazList || []);
    } catch (err) {
      setErrorMsg(err.message || 'Error loading command center data.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.role, filterCategory, filterStatus, onLogout, onlyMyAssigned, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Leaflet Map Initialization for Incident Spatial Awareness
  useEffect(() => {
    if (activeTab !== 'map' || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [30.74, 76.70],
        zoom: 12
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markersLayer = L.layerGroup().addTo(map);
      incidentMarkersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    // Plot incident markers
    if (incidentMarkersLayerRef.current) {
      const layer = incidentMarkersLayerRef.current;
      layer.clearLayers();

      incidents.forEach((inc) => {
        if (!inc.coordinates?.latitude || !inc.coordinates?.longitude) return;

        const isEmergency = inc.status === 'Received' || inc.status === 'Assigned';
        const color = isEmergency ? '#dc2626' : (inc.status === 'Responding' ? '#ea580c' : '#16a34a');

        const icon = L.divIcon({
          className: 'custom-authority-marker',
          html: `
            <div style="
              background: ${color};
              border: 2px solid #ffffff;
              color: #ffffff;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 800;
              box-shadow: 0 4px 10px rgba(0,0,0,0.5);
              cursor: pointer;
            ">
              🚨
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = L.marker([inc.coordinates.latitude, inc.coordinates.longitude], { icon })
          .addTo(layer)
          .bindPopup(`
            <div style="font-family: sans-serif; color: #0f172a; min-width: 200px; padding: 2px;">
              <strong style="color: ${color}; font-size: 13px;">${inc.id}</strong>
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 2px;">
                ${inc.category} (${inc.affectedCount} Affected)
              </div>
              <div style="font-size: 11px; color: #475569; margin-top: 4px;">
                Status: <strong>${inc.status}</strong>
              </div>
              <div style="font-size: 11px; color: #475569;">
                Contact: ${inc.contactName || 'Anonymous'} ${inc.contactPhone ? `(${inc.contactPhone})` : ''}
              </div>
              ${inc.assignedResponderName ? `<div style="font-size: 11px; color: #15803d; margin-top: 2px;">Assigned: ${inc.assignedResponderName}</div>` : ''}
            </div>
          `);

        marker.on('click', () => {
          setSelectedIncident(inc);
          setActionStatus(inc.status);
        });
      });
    }

    return () => {
      // Keep map initialized when switching
    };
  }, [activeTab, incidents]);

  // Sorting
  const sortedIncidents = [...incidents].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
    if (sortBy === 'affected') return (b.affectedCount || 0) - (a.affectedCount || 0);
    return 0;
  });

  // Action: Update Status
  const handleUpdateStatus = async () => {
    if (!selectedIncident || !actionStatus) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/authority/incidents/${selectedIncident.id}/status`, {
        method: 'PATCH',
        headers: authorityAuth.getAuthHeaders(),
        body: JSON.stringify({ status: actionStatus, note: actionNote })
      });
      if (!res.ok) throw new Error('Status update failed.');
      const data = await res.json();
      setSelectedIncident(data.incident);
      setActionNote('');
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Action: Assign Responder (Dispatcher only)
  const handleAssignResponder = async () => {
    if (!selectedIncident || !assignedResponderId) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/authority/incidents/${selectedIncident.id}/assign`, {
        method: 'PATCH',
        headers: authorityAuth.getAuthHeaders(),
        body: JSON.stringify({ responderId: assignedResponderId })
      });
      if (!res.ok) throw new Error('Assignment failed.');
      const data = await res.json();
      setSelectedIncident(data.incident);
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Action: Hazard Verification (Verify or Reject)
  const handleHazardReview = async (id, status) => {
    try {
      await updateHazardVerification(id, status, hazardActionNote);
      setSelectedHazard(null);
      setHazardActionNote('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Authority Header & User Bar */}
      <div 
        style={{
          background: '#1e293b',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{
              background: '#0284c7',
              borderRadius: '8px',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                ResQAlert Command Dispatch
              </h2>
              <span 
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px',
                  background: currentUser?.role === 'dispatcher' ? '#ea580c' : '#0284c7',
                  color: '#ffffff'
                }}
              >
                {currentUser?.role === 'dispatcher' ? 'Chief Dispatcher' : 'First Responder'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Logged in as: <strong style={{ color: '#f1f5f9' }}>{currentUser?.name}</strong> ({currentUser?.email})
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
            style={{
              background: '#334155',
              border: 'none',
              borderRadius: '6px',
              color: '#f8fafc',
              padding: '0.45rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh Feed
          </button>

          <button
            onClick={() => {
              authorityAuth.logout();
              if (onLogout) onLogout();
            }}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '0.45rem 0.85rem',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
        >
          <Radio size={14} /> Active Distress Incidents ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
        >
          <MapPin size={14} /> Spatial GIS View
        </button>
        <button
          onClick={() => setActiveTab('hazards')}
          className={`tab-btn ${activeTab === 'hazards' ? 'active' : ''}`}
        >
          <AlertTriangle size={14} /> Community Hazard Queue ({hazards.filter(h => h.status === 'unverified').length} Unverified)
        </button>
      </div>

      {/* TAB 1: INCIDENTS TABLE & FEED */}
      {activeTab === 'incidents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Filter & Search Bar */}
          <div 
            className="card"
            style={{ 
              marginBottom: 0, 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '0.75rem', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search by ID, name, location or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  background: 'transparent'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="all">All Statuses</option>
                <option value="Received">Received</option>
                <option value="Assigned">Assigned</option>
                <option value="Responding">Responding</option>
                <option value="Resolved">Resolved</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="all">All Categories</option>
                <option value="trapped">Trapped</option>
                <option value="medical emergency">Medical</option>
                <option value="flood">Flood</option>
                <option value="fire">Fire</option>
                <option value="other">Other</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="affected">Most People Affected</option>
              </select>

              {currentUser?.role === 'responder' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '600', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={onlyMyAssigned}
                    onChange={(e) => setOnlyMyAssigned(e.target.checked)}
                  />
                  Assigned to Me Only
                </label>
              )}
            </div>
          </div>

          {/* Incidents Table */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading emergency incidents...
            </div>
          ) : sortedIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <CheckCircle size={36} color="#16a34a" style={{ margin: '0 auto 0.5rem' }} />
              <div style={{ fontWeight: '700', fontSize: '1rem', color: '#0f172a' }}>No matching distress incidents found</div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.25rem' }}>
                All clear or no incidents match the selected filter criteria.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Incident ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem' }}>People</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Coordinates / Source</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Time</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Responder</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedIncidents.map((inc) => {
                    const isNew = inc.status === 'Received';
                    const isAssigned = inc.status === 'Assigned';
                    const isResponding = inc.status === 'Responding';
                    const isResolved = inc.status === 'Resolved';

                    let statusBg = '#e0f2fe';
                    let statusColor = '#0369a1';
                    if (isNew) { statusBg = '#fee2e2'; statusColor = '#dc2626'; }
                    if (isAssigned) { statusBg = '#fef3c7'; statusColor = '#b45309'; }
                    if (isResponding) { statusBg = '#fed7aa'; statusColor = '#c2410c'; }
                    if (isResolved) { statusBg = '#dcfce7'; statusColor = '#15803d'; }

                    return (
                      <tr 
                        key={inc.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isNew ? 'rgba(254, 242, 242, 0.4)' : '#ffffff'
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#0f172a' }}>
                          <code>{inc.id}</code>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize' }}>
                          <strong>{inc.category}</strong>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ fontWeight: '700', color: inc.affectedCount > 2 ? '#dc2626' : '#0f172a' }}>
                            {inc.affectedCount}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div>{inc.coordinates?.latitude?.toFixed(4)}°, {inc.coordinates?.longitude?.toFixed(4)}°</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inc.locationSource}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#64748b' }}>
                          {new Date(inc.createdAt).toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <span style={{ background: statusBg, color: statusColor, padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>
                            {inc.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                          {inc.assignedResponderName ? (
                            <span style={{ color: '#15803d', fontWeight: '600' }}>✓ {inc.assignedResponderName}</span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              setSelectedIncident(inc);
                              setActionStatus(inc.status);
                              setAssignedResponderId(inc.assignedResponderId || '');
                            }}
                            style={{
                              background: '#1e293b',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.78rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SPATIAL GIS LEAFLET MAP */}
      {activeTab === 'map' && (
        <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MapPin size={16} color="#dc2626" /> Spatial Incident Dispatch Map
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Click any incident marker 🚨 on the map to open dispatch controls.
            </div>
          </div>

          <div 
            ref={mapContainerRef} 
            style={{ 
              width: '100%', 
              height: '480px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1',
              position: 'relative'
            }} 
          />
        </div>
      )}

      {/* TAB 3: COMMUNITY HAZARDS VERIFICATION */}
      {activeTab === 'hazards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '0.88rem', color: '#475569' }}>
            Community members submit geotagged road and weather hazards. Dispatchers verify reports before they appear as public markers on citizen maps.
          </div>

          {hazards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              No community hazard reports submitted yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
              {hazards.map((haz) => {
                const isUnverified = haz.status === 'unverified';
                const isVerified = haz.status === 'verified';
                const isRejected = haz.status === 'rejected';

                return (
                  <div 
                    key={haz.id}
                    style={{
                      background: '#ffffff',
                      border: isUnverified ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                        <div>
                          <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>
                            {haz.title}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            Reported: {new Date(haz.createdAt).toLocaleString()}
                          </div>
                        </div>

                        <span 
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: isVerified ? '#dcfce7' : (isRejected ? '#fee2e2' : '#fef3c7'),
                            color: isVerified ? '#15803d' : (isRejected ? '#b91c1c' : '#b45309')
                          }}
                        >
                          {haz.status}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#334155', margin: '0.5rem 0' }}>
                        {haz.description}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                        📍 {haz.coordinates?.latitude?.toFixed(4)}°, {haz.coordinates?.longitude?.toFixed(4)}° ({haz.locationSource})
                      </div>

                      {/* Photo Thumbnail */}
                      {haz.photoUrl && (
                        <div style={{ marginTop: '0.6rem' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#475569', marginBottom: '0.2rem' }}>
                            Evidence Photograph:
                          </div>
                          <img
                            src={haz.photoUrl}
                            alt="Hazard Evidence"
                            style={{
                              width: '100%',
                              maxHeight: '140px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Dispatcher Actions */}
                    {currentUser?.role === 'dispatcher' && isUnverified && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => handleHazardReview(haz.id, 'verified')}
                          style={{
                            flex: 1,
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.4rem',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={14} /> Verify & Publish
                        </button>
                        <button
                          onClick={() => handleHazardReview(haz.id, 'rejected')}
                          style={{
                            background: '#f1f5f9',
                            color: '#dc2626',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* INCIDENT DETAILS & MANAGEMENT MODAL */}
      {selectedIncident && (
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
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setSelectedIncident(null)}
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
              ✕
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
              Incident Dispatch Manager: {selectedIncident.id}
            </h3>

            {/* Quick Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
              <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{selectedIncident.category}</span></div>
              <div><strong>People Affected:</strong> {selectedIncident.affectedCount}</div>
              <div><strong>Contact:</strong> {selectedIncident.contactName} {selectedIncident.contactPhone ? `(${selectedIncident.contactPhone})` : ''}</div>
              <div><strong>Coordinates:</strong> {selectedIncident.coordinates?.latitude?.toFixed(5)}°, {selectedIncident.coordinates?.longitude?.toFixed(5)}°</div>
              <div><strong>Source:</strong> {selectedIncident.locationSource}</div>
              <div><strong>Registered:</strong> {new Date(selectedIncident.createdAt).toLocaleString()}</div>
            </div>

            {selectedIncident.description && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.84rem', color: '#991b1b', marginBottom: '1rem' }}>
                <strong>Citizen Notes:</strong> "{selectedIncident.description}"
              </div>
            )}

            {/* Dispatcher: Assign Responder */}
            {currentUser?.role === 'dispatcher' && (
              <div style={{ border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.35rem' }}>
                  Assign Designated Quick Response Unit
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={assignedResponderId}
                    onChange={(e) => setAssignedResponderId(e.target.value)}
                    style={{ flex: 1, padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  >
                    <option value="">-- Choose First Responder --</option>
                    {responders.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.email})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignResponder}
                    disabled={isUpdating || !assignedResponderId}
                    style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Assign Unit
                  </button>
                </div>
              </div>
            )}

            {/* Status Transition Control (Both Dispatcher & Responder) */}
            <div style={{ border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.35rem' }}>
                Transition Incident Operational Status
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="Received">Received (Pending Unit Assignment)</option>
                  <option value="Assigned">Assigned (Unit Alerted)</option>
                  <option value="Responding">Responding (Units En Route)</option>
                  <option value="Resolved">Resolved (Rescue Complete)</option>
                </select>

                <input
                  type="text"
                  placeholder="Optional log entry / status note..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />

                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdating}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', fontSize: '0.84rem', fontWeight: '700', cursor: 'pointer', alignSelf: 'flex-start' }}
                >
                  Commit Status Change
                </button>
              </div>
            </div>

            {/* Full Audit History Timeline */}
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.4rem' }}>
                Incident Audit History Log
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                {selectedIncident.auditHistory?.map((audit, idx) => (
                  <div key={idx} style={{ borderBottom: idx < selectedIncident.auditHistory.length - 1 ? '1px solid #e2e8f0' : 'none', paddingBottom: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                      <strong>{audit.actorName} ({audit.actorRole})</strong>
                      <span>{new Date(audit.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ color: '#334155', marginTop: '0.1rem' }}>
                      {audit.details}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                onClick={() => setSelectedIncident(null)}
                style={{ background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '600' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
