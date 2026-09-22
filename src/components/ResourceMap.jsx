import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

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

export default function ResourceMap({
  userLocation,
  resources = [],
  selectedResource,
  onSelectResource
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersMapRef = useRef({});

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

      // Separate layer for resources
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

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
            ${item.services && item.services.length > 0 ? `
              <div style="display: flex; gap: 3px; flex-wrap: wrap; margin-top: 4px;">
                ${item.services.slice(0, 3).map(s => `<span style="font-size: 9px; background: #f1f5f9; color: #475569; padding: 1px 4px; border-radius: 3px;">${s}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `);

      markersMapRef.current[item.id] = marker;

      marker.on('click', () => {
        if (onSelectResource) onSelectResource(item);
      });
    });
  }, [resources, onSelectResource]);

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

  // Recenter map button handler
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

      {/* Floating Recenter Control */}
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
