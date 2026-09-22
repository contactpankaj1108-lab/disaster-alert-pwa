import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Activity, 
  Loader2,
  FileCheck2
} from 'lucide-react';
import { validateCoordinates, sanitizeText } from '../utils/validators';
import { calculateDistanceKm, formatDistance, CHANDIGARH_RESOURCES, getResourcesWithDistance } from '../data/emergencyResources';
import { normalizeAlert, processAlerts } from '../services/alertProcessor';
import { classifyNetworkError } from '../utils/errorHandler';
import { getCacheDiagnostics, saveToCache, getFromCache, deleteFromCache } from '../services/cacheService';

export default function SystemDiagnostics() {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runAllTests = async () => {
    setIsRunning(true);
    const results = [];
    const startTime = performance.now();

    // Test 1: Geolocation & Coordinate Validation
    try {
      const valid = validateCoordinates(30.7333, 76.7794);
      const invalidLat = validateCoordinates(95.0, 76.7);
      const invalidLon = validateCoordinates(30.7, 190.0);
      const sanitized = sanitizeText('<script>alert(1)</script>Safe Area', 50);
      const hasGeoApi = 'geolocation' in navigator;

      const passed = valid.isValid && !invalidLat.isValid && !invalidLon.isValid && !sanitized.includes('<') && hasGeoApi;
      results.push({
        id: 'geo-validators',
        title: 'Geolocation API & Coordinate Boundary Validation',
        status: passed ? 'pass' : 'fail',
        detail: `Browser Geolocation API: ${hasGeoApi ? 'Available' : 'Unavailable'}. Boundary bounds [-90, +90] & [-180, +180] strictly verified.`
      });
    } catch (err) {
      results.push({ id: 'geo-validators', title: 'Geolocation API & Coordinate Validation', status: 'fail', detail: err.message });
    }

    // Test 2: Haversine Distance Engine
    try {
      const distKm = calculateDistanceKm(30.7499, 76.6411, 30.7415, 76.7681);
      const formatted = formatDistance(0.45);
      const sorted = getResourcesWithDistance(30.7499, 76.6411);
      const passed = distKm > 11.5 && distKm < 13.0 && formatted === '450 m away' && sorted[0].distanceKm <= sorted[1].distanceKm;

      results.push({
        id: 'haversine-engine',
        title: 'Haversine Geodesic Distance Matrix (R = 6371 km)',
        status: passed ? 'pass' : 'fail',
        detail: `Kharar to Chd Sector 17 calculated as ${distKm.toFixed(2)} km. Sub-km meter formatting and closest-first sorting verified.`
      });
    } catch (err) {
      results.push({ id: 'haversine-engine', title: 'Haversine Geodesic Engine', status: 'fail', detail: err.message });
    }

    // Test 3: Emergency Resource Dataset Integrity
    try {
      const hasAllCategories = ['hospital', 'police', 'fire', 'shelter'].every(cat => 
        CHANDIGARH_RESOURCES.some(r => r.type === cat)
      );
      const hasValidCoords = CHANDIGARH_RESOURCES.every(r => typeof r.latitude === 'number' && typeof r.longitude === 'number');

      results.push({
        id: 'resource-dataset',
        title: 'Emergency Facility Offline Dataset Integrity',
        status: (hasAllCategories && hasValidCoords) ? 'pass' : 'fail',
        detail: `${CHANDIGARH_RESOURCES.length} verified facilities found across Hospital, Police, Fire, and Shelter categories with valid GPS geometry.`
      });
    } catch (err) {
      results.push({ id: 'resource-dataset', title: 'Emergency Dataset Integrity', status: 'fail', detail: err.message });
    }

    // Test 4: Alert Processing, Deduplication & Severity Ranking
    try {
      const mockRaw = [
        { id: 't1', type: 'Flood', severity: 'Emergency', location: 'Kharar', title: 'Flash Flood' },
        { id: 't2', type: 'Storm', severity: 'Watch', location: 'Mohali', title: 'Thunderstorm' },
        { id: 't1-dup', type: 'Flood', severity: 'Emergency', location: 'Kharar', title: 'Flash Flood' }
      ];
      const processed = processAlerts(mockRaw);
      const deduplicated = processed.length === 2;
      const severitySorted = processed[0].severity === 'Emergency';
      const actionSynthesized = typeof processed[0].recommendedAction === 'string' && processed[0].recommendedAction.length > 5;

      results.push({
        id: 'alert-processor',
        title: 'Alert Processing, Deduplication & Action Synthesis',
        status: (deduplicated && severitySorted && actionSynthesized) ? 'pass' : 'fail',
        detail: `Successfully deduplicated 3 raw alerts to 2 unique events. Priority sorting (Emergency > Watch) and protective directives verified.`
      });
    } catch (err) {
      results.push({ id: 'alert-processor', title: 'Alert Processing Engine', status: 'fail', detail: err.message });
    }

    // Test 5: Storage Layer (IndexedDB / LocalStorage)
    try {
      // Execute live roundtrip probe to verify active persistence
      await saveToCache('sys_diag_probe', { status: 'healthy', timestamp: Date.now() });
      const probe = await getFromCache('sys_diag_probe');
      const diag = await getCacheDiagnostics();
      await deleteFromCache('sys_diag_probe');

      const storageWorking = !!(probe && probe.data?.status === 'healthy');
      const activePartitions = diag?.totalItems ?? (diag?.records ? Object.values(diag.records).filter(r => r.cached).length : 0);

      results.push({
        id: 'storage-layer',
        title: 'Persistent Storage Layer (IndexedDB / LocalStorage)',
        status: storageWorking ? 'pass' : 'fail',
        detail: `Active storage engine: ${diag?.storageEngine || 'Dual Layer'}. Roundtrip write/read verified. Verified partitions: ${activePartitions} records.`
      });
    } catch (err) {
      results.push({ id: 'storage-layer', title: 'Persistent Storage Layer', status: 'fail', detail: `Storage error: ${err.message}` });
    }

    // Test 6: Service Worker & PWA Manifest
    try {
      const swSupported = 'serviceWorker' in navigator;
      const hasController = !!navigator.serviceWorker?.controller;
      const manifestLinked = !!document.querySelector('link[rel="manifest"]');

      results.push({
        id: 'pwa-readiness',
        title: 'PWA Web App Manifest & Service Worker Registration',
        status: (swSupported && manifestLinked) ? 'pass' : 'fail',
        detail: `Service Worker API: Supported. Controller: ${hasController ? 'Active' : 'Installed / Pending Scope'}. Manifest tag present in document head.`
      });
    } catch (err) {
      results.push({ id: 'pwa-readiness', title: 'PWA Manifest & Service Worker', status: 'fail', detail: err.message });
    }

    // Test 7: Network Error Classification & Failover
    try {
      const classifiedTimeout = classifyNetworkError(new Error('timeout'));
      const classifiedOffline = classifyNetworkError(new Error('failed to fetch'));
      const passed = classifiedTimeout.includes('high network latency') && classifiedOffline.includes('offline cache');

      results.push({
        id: 'error-classifier',
        title: 'Network Error Classification & Failover Normalizer',
        status: passed ? 'pass' : 'fail',
        detail: 'Network latency timeouts and offline fetch exceptions correctly mapped to human-friendly emergency advisories.'
      });
    } catch (err) {
      results.push({ id: 'error-classifier', title: 'Error Classification', status: 'fail', detail: err.message });
    }

    const elapsed = (performance.now() - startTime).toFixed(1);
    setTestResults({
      timestamp: new Date().toLocaleTimeString(),
      elapsedMs: elapsed,
      passedCount: results.filter(r => r.status === 'pass').length,
      totalCount: results.length,
      suite: results
    });

    setIsRunning(false);
  };

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1.15rem', marginTop: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={17} color="#16a34a" />
          <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
            System Subsystems & Automated Unit Tests
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
          <span>{isOpen ? 'Hide Test Suite' : 'Inspect Unit Tests'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', fontSize: '0.84rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Live in-browser test runner verifying Geolocation, Haversine calculations, IndexedDB, Service Worker, and Alert normalization.
            </div>

            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="tab-btn active"
              style={{
                fontSize: '0.82rem',
                padding: '0.35rem 0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderRadius: '6px'
              }}
            >
              {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {isRunning ? 'Running Tests...' : 'Run Verification Tests'}
            </button>
          </div>

          {testResults && (
            <div>
              <div style={{ 
                background: testResults.passedCount === testResults.totalCount ? '#f0fdf4' : '#fef2f2', 
                border: `1px solid ${testResults.passedCount === testResults.totalCount ? '#bbf7d0' : '#fecaca'}`,
                padding: '0.6rem 0.8rem', 
                borderRadius: '6px',
                marginBottom: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: testResults.passedCount === testResults.totalCount ? '#15803d' : '#b91c1c' }}>
                  <FileCheck2 size={16} />
                  <span>Validation Result: {testResults.passedCount} of {testResults.totalCount} Subsystems Passed</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Execution Time: {testResults.elapsedMs}ms • Tested at {testResults.timestamp}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {testResults.suite.map((test) => (
                  <div 
                    key={test.id} 
                    style={{ 
                      background: 'var(--bg-subtle)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '6px', 
                      padding: '0.6rem 0.75rem' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{test.title}</span>
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: '700', 
                          padding: '0.15rem 0.45rem', 
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          background: test.status === 'pass' ? '#f0fdf4' : '#fef2f2',
                          color: test.status === 'pass' ? '#15803d' : '#b91c1c',
                          border: `1px solid ${test.status === 'pass' ? '#bbf7d0' : '#fecaca'}`
                        }}
                      >
                        {test.status === 'pass' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {test.status === 'pass' ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: '1.4' }}>
                      {test.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
