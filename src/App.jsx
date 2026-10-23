import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Radio, 
  LayoutDashboard, 
  Bell, 
  MapPin, 
  ShieldAlert,
  Shield
} from 'lucide-react';
import Home from './pages/Home';
import Alerts from './pages/Alerts';
import Resources from './pages/Resources';
import Safety from './pages/Safety';
import AuthorityDashboard from './pages/AuthorityDashboard';
import NetworkStatus from './components/NetworkStatus';
import InstallPwaButton from './components/InstallPwaButton';
import OfflineBanner from './components/OfflineBanner';
import OfflineQueueBanner from './components/OfflineQueueBanner';
import SosModal from './components/SosModal';
import MySosRequestsModal from './components/MySosRequestsModal';
import HazardReportModal from './components/HazardReportModal';
import AuthorityLoginModal from './components/AuthorityLoginModal';
import { 
  getCurrentBrowserLocation, 
  getGeolocationPermissionState, 
  DEFAULT_LOCATION 
} from './services/locationService';
import { syncDisasterTelemetry, getCachedTelemetry } from './services/alertService';
import { saveToCache, getFromCache, CACHE_KEYS } from './services/cacheService';
import { classifyNetworkError } from './utils/errorHandler';
import { authorityAuth } from './services/authorityAuthService';
import { syncOfflineQueues } from './services/offlineQueueService';

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [emergencyLevel, setEmergencyLevel] = useState('normal'); // 'normal' | 'watch' | 'warning' | 'emergency'
  const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleTimeString());
  const [cacheAgeMinutes, setCacheAgeMinutes] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  
  // Geolocation states
  const [permissionStatus, setPermissionStatus] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);

  // Phase 1 Feature Modals & Auth State
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [isMySosOpen, setIsMySosOpen] = useState(false);
  const [isHazardModalOpen, setIsHazardModalOpen] = useState(false);
  const [isAuthLoginOpen, setIsAuthLoginOpen] = useState(false);
  const [isAuthorityAuthenticated, setIsAuthorityAuthenticated] = useState(() => authorityAuth.isAuthenticated());

  const [weatherData, setWeatherData] = useState({
    temperature: 28,
    apparentTemperature: 30,
    condition: 'Partly Cloudy',
    windSpeed: 14,
    humidity: 65,
    source: 'Open-Meteo Weather API'
  });

  const [alerts, setAlerts] = useState([]);

  // Rate-limiting / Bandwidth conservation tracker
  const lastSyncRef = useRef({ time: 0, lat: null, lon: null });

  // Telemetry Sync Pipeline with Bandwidth Throttling
  const handleSyncTelemetry = useCallback(async (targetLoc, force = false) => {
    const loc = targetLoc || location;
    setIsSyncing(true);

    // 1. If offline (real or simulated), use cache immediately without making network calls
    if (isSimulatedOffline || !navigator.onLine) {
      const cached = await getCachedTelemetry();
      if (cached) {
        if (cached.weatherData) setWeatherData(cached.weatherData);
        if (cached.alerts) setAlerts(cached.alerts);
        setEmergencyLevel(cached.threatLevel);
        setLastUpdated(cached.lastUpdated);
        setCacheAgeMinutes(cached.cacheAgeMinutes);
      }
      setIsOfflineFallback(true);
      setIsSyncing(false);
      return;
    }

    // 2. Bandwidth Guard: Prevent redundant network calls within 45s for unchanged coordinates
    const now = Date.now();
    const sameLoc = 
      lastSyncRef.current.lat !== null &&
      Math.abs(loc.latitude - lastSyncRef.current.lat) < 0.001 &&
      Math.abs(loc.longitude - lastSyncRef.current.lon) < 0.001;

    if (!force && sameLoc && (now - lastSyncRef.current.time < 45000)) {
      setIsSyncing(false);
      return;
    }

    try {
      const bundle = await syncDisasterTelemetry(loc.latitude, loc.longitude, loc.city);
      setWeatherData(bundle.weatherData);
      setAlerts(bundle.alerts);
      setEmergencyLevel(bundle.threatLevel);
      setIsOfflineFallback(bundle.isOfflineFallback);
      setLastUpdated(bundle.lastUpdated);
      setCacheAgeMinutes(bundle.cacheAgeMinutes || 0);
      lastSyncRef.current = { time: now, lat: loc.latitude, lon: loc.longitude };
    } catch (err) {
      const friendlyMsg = classifyNetworkError(err);
      console.warn('[Telemetry Sync Failover]:', friendlyMsg);
      setIsOfflineFallback(true);
    } finally {
      setIsSyncing(false);
    }
  }, [isSimulatedOffline, location]);

  // Online / Offline event synchronization
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        handleSyncTelemetry(location, true);
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsOfflineFallback(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncTelemetry, isSimulatedOffline, location]);

  // Initial boot: Instant Hydration from IndexedDB & LocalStorage Cache
  const initialBootDoneRef = useRef(false);
  useEffect(() => {
    async function boot() {
      if (initialBootDoneRef.current) return;
      initialBootDoneRef.current = true;

      // 1. Hydrate settings (Data Saver)
      const cachedSettings = await getFromCache(CACHE_KEYS.SETTINGS);
      if (cachedSettings && cachedSettings.data) {
        setIsDataSaver(!!cachedSettings.data.isDataSaver);
      }

      // 2. Hydrate last known location from cache
      const cachedLoc = await getFromCache(CACHE_KEYS.LOCATION);
      let activeLoc = DEFAULT_LOCATION;
      if (cachedLoc && cachedLoc.data) {
        activeLoc = cachedLoc.data;
        setLocation(activeLoc);
      }

      // 3. Hydrate disaster telemetry from cache
      const cachedTelem = await getCachedTelemetry();
      if (cachedTelem) {
        if (cachedTelem.weatherData) setWeatherData(cachedTelem.weatherData);
        if (cachedTelem.alerts) setAlerts(cachedTelem.alerts);
        setEmergencyLevel(cachedTelem.threatLevel);
        setLastUpdated(cachedTelem.lastUpdated);
        setCacheAgeMinutes(cachedTelem.cacheAgeMinutes);
        setIsOfflineFallback(true);
      }

      // 4. Inspect browser geolocation permission
      const permState = await getGeolocationPermissionState();
      setPermissionStatus(permState);

      if (permState === 'granted') {
        handleRequestBrowserLocation();
      } else {
        handleSyncTelemetry(activeLoc);
      }

      // 5. Check and resume any pending offline SOS or hazard transmissions
      syncOfflineQueues();
    }

    boot();
  }, []);

  // Save Data Saver state to cache
  const handleToggleDataSaver = () => {
    setIsDataSaver((prev) => {
      const next = !prev;
      saveToCache(CACHE_KEYS.SETTINGS, { isDataSaver: next });
      return next;
    });
  };

  // Save location to persistent cache whenever it updates
  useEffect(() => {
    if (location?.latitude && location?.longitude) {
      saveToCache(CACHE_KEYS.LOCATION, location);
    }
  }, [location]);

  // Native Browser Geolocation Request
  const handleRequestBrowserLocation = useCallback(async () => {
    setIsDetectingLocation(true);
    setLocationError(null);

    const result = await getCurrentBrowserLocation();
    setPermissionStatus(result.permissionState);

    if (result.success) {
      setLocation(result.location);
      handleSyncTelemetry(result.location, true);
    } else {
      setLocationError(result.error);
      setLocation((prev) => ({
        ...prev,
        source: 'Fallback (Location Denied/Unavailable)'
      }));
    }

    setIsDetectingLocation(false);
  }, [handleSyncTelemetry]);

  // Handler for manual location fallback selection
  const handleSelectManualLocation = (preset) => {
    const updated = {
      city: preset.name,
      latitude: preset.latitude,
      longitude: preset.longitude,
      source: preset.source || 'Manual Selection'
    };
    setLocation(updated);
    setLocationError(null);
    handleSyncTelemetry(updated, true);
  };

  // Handler for navigation with optional filter preset
  const handleNavigate = (tab, filter = 'all') => {
    setActiveTab(tab);
    setActiveFilter(filter);
  };

  return (
    <div className={`app-container ${isDataSaver ? 'data-saver-mode' : ''}`}>
      {/* Top Emergency Header Bar */}
      <header className="app-header">
        <div className="header-top">
          <div className="brand" onClick={() => setActiveTab('home')}>
            <div className="brand-icon-wrapper">
              <Radio size={22} color="#ffffff" />
            </div>
            <div>
              <h1 className="brand-title">
                ResQAlert
                <span className="brand-pill">
                  PWA
                </span>
              </h1>
              <div className="brand-subtitle">
                Disaster Response & Resource Locator
              </div>
            </div>
          </div>

          <div className="header-badges">
            {/* Install PWA Prompt Button */}
            <InstallPwaButton />

            {/* Regional Threat Level */}
            <span className={`badge ${emergencyLevel}`} title="Regional Emergency Threat Level">
              <span className="badge-dot"></span>
              {emergencyLevel === 'normal' && 'ALL CLEAR'}
              {emergencyLevel === 'watch' && 'WEATHER WATCH'}
              {emergencyLevel === 'warning' && 'WARNING'}
              {emergencyLevel === 'emergency' && 'EMERGENCY ALERT'}
            </span>

            {/* Network Status Widget with Quality & Data Saver Toggle */}
            <NetworkStatus 
              isOnline={isOnline} 
              isSimulatedOffline={isSimulatedOffline}
              isDataSaver={isDataSaver}
              onToggleDataSaver={handleToggleDataSaver}
            />
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <nav className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell size={15} />
            Active Alerts ({alerts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
            onClick={() => setActiveTab('resources')}
          >
            <MapPin size={15} />
            Emergency Map
          </button>
          <button
            className={`tab-btn ${activeTab === 'safety' ? 'active' : ''}`}
            onClick={() => setActiveTab('safety')}
          >
            <ShieldAlert size={15} />
            Safety Protocols
          </button>
          <button
            className={`tab-btn ${activeTab === 'authority' ? 'active' : ''}`}
            onClick={() => {
              if (authorityAuth.isAuthenticated()) {
                setIsAuthorityAuthenticated(true);
                setActiveTab('authority');
              } else {
                setIsAuthLoginOpen(true);
              }
            }}
            style={{
              marginLeft: 'auto',
              border: '1px solid #cbd5e1'
            }}
            title="Authorized Dispatcher & Responder Command Portal"
          >
            <Shield size={15} color="#2563eb" />
            Command Center {isAuthorityAuthenticated && '✓'}
          </button>
        </nav>
      </header>

      {/* Offline Status & Demonstration Control Banner */}
      <OfflineBanner
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulateOffline={() => setIsSimulatedOffline((prev) => !prev)}
        lastUpdated={lastUpdated}
        cacheAgeMinutes={cacheAgeMinutes}
        onRetryConnection={() => handleSyncTelemetry(location, true)}
      />

      {/* Phase 3: Persistent Offline SOS & Hazard Queue Banner */}
      <OfflineQueueBanner
        onOpenSosRequests={() => setIsMySosOpen(true)}
      />

      {/* Main Viewport Content */}
      <main className="main-content">
        {activeTab === 'home' && (
          <Home
            location={location}
            permissionStatus={permissionStatus}
            isDetecting={isDetectingLocation}
            errorMessage={locationError}
            onRequestLocation={handleRequestBrowserLocation}
            onSelectManualLocation={handleSelectManualLocation}
            emergencyLevel={emergencyLevel}
            isOnline={isOnline && !isSimulatedOffline}
            lastUpdated={lastUpdated}
            alerts={alerts}
            weatherData={weatherData}
            resourceStats={{ hospitals: 4, police: 3, fire: 3, shelters: 4 }}
            onNavigate={handleNavigate}
            onRefreshData={() => handleSyncTelemetry(location, true)}
            isSyncing={isSyncing}
            isOfflineFallback={isOfflineFallback || isSimulatedOffline}
            onOpenSosModal={() => setIsSosModalOpen(true)}
            onOpenMySosRequests={() => setIsMySosOpen(true)}
            onOpenHazardModal={() => setIsHazardModalOpen(true)}
          />
        )}
        {activeTab === 'alerts' && <Alerts alerts={alerts} />}
        {activeTab === 'resources' && (
          <Resources
            initialFilter={activeFilter}
            location={location}
            onOpenReportHazard={() => setIsHazardModalOpen(true)}
          />
        )}
        {activeTab === 'safety' && <Safety />}
        {activeTab === 'authority' && (
          <AuthorityDashboard
            onLogout={() => {
              setIsAuthorityAuthenticated(false);
              setActiveTab('home');
            }}
            onNavigateHome={() => setActiveTab('home')}
          />
        )}
      </main>

      {/* Phase 1 Modals */}
      <SosModal
        isOpen={isSosModalOpen}
        onClose={() => setIsSosModalOpen(false)}
        initialLocation={location}
        isOnline={isOnline && !isSimulatedOffline}
        onSosSubmitted={() => {
          setIsMySosOpen(true);
        }}
      />

      <MySosRequestsModal
        isOpen={isMySosOpen}
        onClose={() => setIsMySosOpen(false)}
      />

      <HazardReportModal
        isOpen={isHazardModalOpen}
        onClose={() => setIsHazardModalOpen(false)}
        initialLocation={location}
        isOnline={isOnline && !isSimulatedOffline}
      />

      <AuthorityLoginModal
        isOpen={isAuthLoginOpen}
        onClose={() => setIsAuthLoginOpen(false)}
        onLoginSuccess={() => {
          setIsAuthorityAuthenticated(true);
          setActiveTab('authority');
        }}
      />

      {/* Application Footer */}
      <footer className="app-footer">
        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
          ResQAlert • Disaster Warning & Emergency Resource System
        </div>
        <div style={{ marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Powered by React 19, Leaflet, IndexedDB & Open-Meteo • 
          {isDataSaver && <span style={{ color: '#b45309', margin: '0 0.35rem' }}>⚡ Data Saver Active •</span>}
          {(!isOnline || isSimulatedOffline) ? ' 🔴 Offline Cache Mode' : ' 🟢 Online Live Mode'} • Last Updated: {lastUpdated}
        </div>
      </footer>
    </div>
  );
}

export default App;
