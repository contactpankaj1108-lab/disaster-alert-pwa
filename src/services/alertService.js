/**
 * alertService.js
 * Central business logic coordinating Weather & Disaster APIs, Intelligent Alert Processing,
 * and Persistent Dual-Layer Caching (IndexedDB + LocalStorage).
 */

import { fetchWeatherData } from './api/weatherApi';
import { fetchDisasterAlerts } from './api/disasterApi';
import { processAlerts } from './alertProcessor';
import { saveToCache, getFromCache, CACHE_KEYS } from './cacheService';

/**
 * Calculates overall emergency threat level based on alerts and weather metrics
 * Returns: 'normal' | 'watch' | 'warning' | 'emergency'
 */
export function calculateThreatLevel(alerts = [], weatherData = null) {
  let hasEmergency = false;
  let hasWarning = false;
  let hasWatch = false;

  // Check alert severities
  for (const alert of alerts) {
    const sev = (alert.severity || '').toLowerCase();
    if (sev.includes('emergency') || sev.includes('critical') || sev.includes('extreme')) {
      hasEmergency = true;
      break;
    } else if (sev.includes('warning') || sev.includes('high') || sev.includes('severe')) {
      hasWarning = true;
    } else if (sev.includes('watch') || sev.includes('moderate') || sev.includes('advisory')) {
      hasWatch = true;
    }
  }

  // Check weather severity
  if (!hasEmergency && weatherData) {
    if (weatherData.severity === 'emergency') hasEmergency = true;
    else if (weatherData.severity === 'warning') hasWarning = true;
    else if (weatherData.severity === 'watch') hasWatch = true;
  }

  if (hasEmergency) return 'emergency';
  if (hasWarning) return 'warning';
  if (hasWatch) return 'watch';
  return 'normal';
}

/**
 * Hydrates state immediately from offline cache before network finishes
 */
export async function getCachedTelemetry() {
  const weatherRecord = await getFromCache(CACHE_KEYS.WEATHER);
  const alertsRecord = await getFromCache(CACHE_KEYS.ALERTS);

  if (!weatherRecord && !alertsRecord) return null;

  const weather = weatherRecord ? weatherRecord.data : null;
  const alerts = alertsRecord ? alertsRecord.data : [];
  const threat = calculateThreatLevel(alerts, weather);

  return {
    weatherData: weather,
    alerts: alerts,
    threatLevel: threat,
    lastUpdated: weatherRecord?.updatedAt || alertsRecord?.updatedAt || 'Cached',
    cacheAgeMinutes: weatherRecord?.ageMinutes || alertsRecord?.ageMinutes || 0,
    isStale: weatherRecord?.isStale || false,
    isOfflineFallback: true
  };
}

/**
 * Synchronizes all disaster and weather feeds and commits them to IndexedDB/LocalStorage
 */
export async function syncDisasterTelemetry(latitude, longitude, locationName) {
  // 1. Fetch meteorological observations
  const weatherResult = await fetchWeatherData(latitude, longitude);

  // 2. Fetch public disaster feeds & USGS seismic events
  const disasterResult = await fetchDisasterAlerts(latitude, longitude, locationName, weatherResult);

  // 3. Process alerts through intelligent normalization, deduplication, and priority sorting
  const processed = processAlerts(disasterResult.alerts);

  // 4. Compute overall threat level
  const threatLevel = calculateThreatLevel(processed, weatherResult);

  // 5. Persist to IndexedDB & LocalStorage
  await saveToCache(CACHE_KEYS.WEATHER, weatherResult);
  await saveToCache(CACHE_KEYS.ALERTS, processed);

  return {
    weatherData: weatherResult,
    alerts: processed,
    threatLevel: threatLevel,
    isOfflineFallback: weatherResult.isOfflineFallback || disasterResult.isOfflineFallback,
    lastUpdated: new Date().toLocaleTimeString(),
    cacheAgeMinutes: 0,
    sourceSummary: weatherResult.source
  };
}
