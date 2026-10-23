import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, AlertTriangle, Plus } from 'lucide-react';
import { fetchVerifiedHazards } from '../services/hazardService';

// Custom DivIcons created with inline SVGs/CSS (100% offline-friendly, no broken image links)
const createDivIcon = (symbol, bgColor, borderColor) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${bgColor};
        border: 2px solid ${borderColor};
        color: #ffffff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        cursor: pointer;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
};

const USER_ICON = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <!-- Expanding Radar Pulse Wave -->
      <div style="
        position: absolute;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(14, 165, 233, 0.45);
        animation: user-radar-pulse 2s infinite cubic-bezier(0, 0, 0.2, 1);
        pointer-events: none;
      "></div>
      <!-- Core Pulsating Dot -->
      <div style="
        position: relative;
        background: #0284c7;
        border: 3px solid #ffffff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        box-shadow: 0 0 12px rgba(2, 132, 199, 0.9), 0 2px 6px rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #ffffff;"></div>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

const TYPE_CONFIG = {
  hospital: { icon: '🏥', bg: '#ef4444', border: '#fca5a5' },
  police: { icon: '🚓', bg: '#2563eb', border: '#93c5fd' },
  fire: { icon: '🚒', bg: '#ea580c', border: '#fdba74' },
  shelter: { icon: '🏠', bg: '#10b981', border: '#86efac' }
};

const HAZARD_ICONS = {
  flooded_road: '🌊',
  damaged_building: '🏚️',
  blocked_road: '🚧',
  fallen_tree: '🪵',
  fire: '🔥',
  other: '⚠️'
};

export default function ResourceMap({
  userLocation,
  resources = [],
  selectedResource,
  onSelectResource,
  onOpenReportHazard
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const hazardsLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersMapRef = useRef({});

  const [verifiedHazards, setVerifiedHazards] = useState([]);
  const [showHazards, setShowHazards] = useState(true);

  // Load verified hazards
  const loadHazards = async () => {
    const list = await fetchVerifiedHazards();
    setVerifiedHazards(list);
  };

  useEffect(() => {
    loadHazards();
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = userLocation?.latitude || 30.7333;
      const initialLon = userLocation?.longitude || 76.7794;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: 13,
        zoomControl: true
      });

      // Standard OpenStreetMap Tile Layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Layer for emergency resources
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Layer for verified hazards
      const hazardsLayer = L.layerGroup().addTo(map);
      hazardsLayerRef.current = hazardsLayer;

      // Dedicated layer for user marker (highest z-index)
      const userLayer = L.layerGroup().addTo(map);
      userLayerRef.current = userLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        userLayerRef.current = null;
        markersLayerRef.current = null;
        hazardsLayerRef.current = null;
        userMarkerRef.current = null;
        markersMapRef.current = {};
      }
    };
  }, []);

  // Update User Location Marker & View
  useEffect(() => {
    if (!mapInstanceRef.current || !userLayerRef.current || !userLocation) return;
    const map = mapInstanceRef.current;
    const userLayer = userLayerRef.current;
    const { latitude, longitude, city } = userLocation;

    userLayer.clearLayers();

    const userMarker = L.marker([latitude, longitude], {
      icon: USER_ICON,
      zIndexOffset: 3000
    })
      .addTo(userLayer)
      .bindPopup(`
        <div style="font-family: sans-serif; color: #1e293b; min-width: 150px; padding: 4px 2px;">
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
            <strong style="color: #0284c7; font-size: 13px;">📍 You Are Here</strong>
          </div>
          <div style="font-size: 12px; font-weight: 600; color: #0f172a;">${city || 'Current Monitored Zone'}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°
          </div>
          <div style="font-size: 10px; color: #0284c7; margin-top: 4px;">
            Source: ${userLocation.source || 'Browser Geolocation'}
          </div>
        </div>
      `);

    userMarkerRef.current = userMarker;
    map.setView([latitude, longitude], map.getZoom());
  }, [userLocation]);

  // Update Resource Markers
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;

    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    markersMapRef.current = {};

    resources.forEach((item) => {
      const config = TYPE_CONFIG[item.type] || { icon: '📍', bg: '#64748b', border: '#cbd5e1' };
      const icon = createDivIcon(config.icon, config.bg, config.border);

      const marker = L.marker([item.latitude, item.longitude], { icon })
        .addTo(markersLayer)
        .bindPopup(`
          <div style="font-family: sans-serif; color: #0f172a; min-width: 190px; padding: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <strong style="font-size: 13px; color: #0f172a;">${item.name}</strong>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: ${config.bg};">
                ${item.type}
              </span>
              ${item.distanceText ? `
                <span style="font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 1px 6px; border-radius: 4px;">
                  📍 ${item.distanceText}
                </span>
              ` : ''}
            </div>
            <div style="font-size: 12px; color: #475569; margin-bottom: 4px;">
              ${item.address || 'Address on file'}
            </div>
            ${item.phone ? `<div style="font-size: 11px; font-weight: 600; color: #0369a1; margin-bottom: 2px;">📞 ${item.phone}</div>` : ''}
            ${item.capacity ? `<div style="font-size: 11px; color: #15803d; margin-bottom: 2px;">${item.capacity}</div>` : ''}
          </div>
        `);

      markersMapRef.current[item.id] = marker;

      marker.on('click', () => {
        if (onSelectResource) onSelectResource(item);
      });
    });
  }, [resources, onSelectResource]);

  // Update Verified Hazard Markers
  useEffect(() => {
    if (!hazardsLayerRef.current || !mapInstanceRef.current) return;
    const hazardsLayer = hazardsLayerRef.current;
    hazardsLayer.clearLayers();

    if (!showHazards) return;

    verifiedHazards.forEach((haz) => {
      if (!haz.coordinates?.latitude || !haz.coordinates?.longitude) return;

      const symbol = HAZARD_ICONS[haz.hazardType] || '⚠️';
      const icon = L.divIcon({
        className: 'custom-hazard-marker',
        html: `
          <div style="
            background: #d97706;
            border: 2px solid #ffffff;
            color: #ffffff;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4);
            cursor: pointer;
          ">
            ${symbol}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      L.marker([haz.coordinates.latitude, haz.coordinates.longitude], { icon })
        .addTo(hazardsLayer)
        .bindPopup(`
          <div style="font-family: sans-serif; color: #0f172a; min-width: 200px; padding: 2px;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 3px;">
              <span style="font-size: 14px;">${symbol}</span>
              <strong style="font-size: 13px; color: #92400e;">${haz.title}</strong>
            </div>
            <div style="font-size: 10px; font-weight: 700; color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
              ✓ Verified Community Hazard
            </div>
            <div style="font-size: 12px; color: #334155; margin-bottom: 4px;">
              ${haz.description}
            </div>
            <div style="font-size: 10px; color: #64748b;">
              Verified by: ${haz.verifiedBy || 'Dispatch Officer'} • Updated: ${new Date(haz.updatedAt).toLocaleTimeString()}
            </div>
            ${haz.photoUrl ? `
              <div style="margin-top: 6px;">
                <img src="${haz.photoUrl}" alt="Evidence" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1;" />
              </div>
            ` : ''}
          </div>
        `);
    });
  }, [verifiedHazards, showHazards]);

  // Focus & open popup when a resource is selected from the list
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedResource) return;
    const marker = markersMapRef.current[selectedResource.id];
    mapInstanceRef.current.flyTo(
      [selectedResource.latitude, selectedResource.longitude],
      15,
      { duration: 0.8 }
    );
    if (marker) {
      marker.openPopup();
    }
  }, [selectedResource]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current || !userLocation) return;
    mapInstanceRef.current.setView([userLocation.latitude, userLocation.longitude], 14, {
      animate: true
    });
    if (userMarkerRef.current) {
      userMarkerRef.current.openPopup();
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '450px', background: '#f1f5f9' }} />

      {/* Floating Controls Top-Right */}
      <div 
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          alignItems: 'flex-end'
        }}
      >
        {onOpenReportHazard && (
          <button
            onClick={onOpenReportHazard}
            style={{
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.45rem 0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}
          >
            <Plus size={14} /> Report Hazard
          </button>
        )}

        <button
          onClick={() => setShowHazards((prev) => !prev)}
          style={{
            background: showHazards ? '#ffffff' : '#f1f5f9',
            color: showHazards ? '#d97706' : '#64748b',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.4rem 0.65rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.74rem',
            fontWeight: '600'
          }}
        >
          <AlertTriangle size={13} />
          {showHazards ? `Hazards (${verifiedHazards.length}) Visible` : 'Hazards Hidden'}
        </button>
      </div>

      {/* Floating Recenter Control Bottom-Right */}
      <button
        onClick={handleRecenter}
        title="Recenter on My Location"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 500,
          background: '#ffffff',
          color: '#0f172a',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '0.6rem 0.85rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: '600'
        }}
      >
        <Crosshair size={16} /> Recenter on Me
      </button>
    </div>
  );
}
