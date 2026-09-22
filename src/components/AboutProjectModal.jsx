import React from 'react';
import { 
  X, 
  GraduationCap, 
  Code2, 
  Wifi, 
  MapPin, 
  Database, 
  Cpu, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function AboutProjectModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 16, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: '#131d2e',
        border: '1px solid #24344d',
        borderRadius: '12px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #24344d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          background: '#131d2e',
          zIndex: 1
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(59, 130, 246, 0.15)',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <GraduationCap size={22} color="#60a5fa" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0, color: '#ffffff' }}>
                ResQAlert Project Overview
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                Final Year B.Tech Project • Computer Science & Engineering
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.88rem', lineHeight: '1.6' }}>
          
          {/* Executive Summary */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Problem Statement & Objective
            </h3>
            <p style={{ color: '#cbd5e1' }}>
              During natural disasters (flash floods, earthquakes, severe storms), cellular infrastructure degrades and victims often struggle to find immediate shelters, hospitals, or verified safety alerts. Most existing emergency systems require high-bandwidth apps or dedicated hardware. 
            </p>
            <p style={{ color: '#cbd5e1', marginTop: '0.4rem' }}>
              <strong>ResQAlert</strong> is a 100% software-based, offline-first Progressive Web App (PWA) designed to provide instant localized threat advisories and nearest emergency facility mapping, even when the internet is completely unavailable.
            </p>
          </div>

          {/* Key Engineering Features */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Core Engineering Subsystems
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              <div style={{ background: '#182438', border: '1px solid #273954', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
                  <Wifi size={15} color="#38bdf8" /> Offline-First PWA Architecture
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  Custom Service Worker with Cache-First strategy for static assets and Network-First with IndexedDB fallback for live telemetry.
                </div>
              </div>

              <div style={{ background: '#182438', border: '1px solid #273954', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
                  <MapPin size={15} color="#4ade80" /> Haversine Geodesic Math
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  Client-side spherical distance engine ($R = 6371\text{ km}$) that recalculates proximity and sorts facilities closest-first instantly on location change.
                </div>
              </div>

              <div style={{ background: '#182438', border: '1px solid #273954', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
                  <Database size={15} color="#fbbf24" /> Dual-Layer Local Storage
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  Primary high-capacity IndexedDB storage engine with seamless automatic fallback to browser LocalStorage and cache freshness counters.
                </div>
              </div>

              <div style={{ background: '#182438', border: '1px solid #273954', padding: '0.75rem', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#ffffff', marginBottom: '0.25rem' }}>
                  <Zap size={15} color="#f87171" /> Low-Bandwidth Optimizations
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
                  250ms search debounce, 45-second network sync throttle, 2G/3G connection quality detection, and battery-friendly Data Saver mode.
                </div>
              </div>
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#60a5fa', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Technology Stack
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['React 19', 'JavaScript (ESM)', 'Vite', 'Leaflet.js', 'Service Worker API', 'IndexedDB', 'Open-Meteo API', 'USGS Seismic Feed', 'HTML5 Geolocation', 'Lucide Icons'].map((tech) => (
                <span key={tech} style={{ background: '#223249', color: '#e2e8f0', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', border: '1px solid #2f4362' }}>
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Hardware-Free Note */}
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.82rem', color: '#86efac' }}>
            <strong>100% Software-Based Design:</strong> Requires no Arduino, ESP32, Raspberry Pi, or external sensors. Runs in any modern Chromium or mobile browser directly from standard web protocols.
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid #24344d',
          background: '#101827',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#94a3b8',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px'
        }}>
          <span>ResQAlert • Capstone Project Submission</span>
          <button
            onClick={onClose}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
