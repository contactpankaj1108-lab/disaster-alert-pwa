/**
 * cacheService.js
 * Offline-First Caching Layer combining IndexedDB with LocalStorage fallback.
 * Manages persistent storage of disaster alerts, telemetry, facilities, and settings.
 * Includes cache age tracking, freshness metrics, and offline diagnostics.
 */

const DB_NAME = 'DisasterAlertPWA_DB';
const DB_VERSION = 1;
const STORE_NAME = 'emergency_cache';

export const CACHE_KEYS = {
  WEATHER: 'cached_weather',
  ALERTS: 'cached_alerts',
  RESOURCES: 'cached_resources',
  LOCATION: 'cached_location',
  SETTINGS: 'cached_settings'
};

// Check if IndexedDB is available
const isIndexedDBSupported = () => {
  return typeof window !== 'undefined' && 'indexedDB' in window;
};

/**
 * Initializes and returns the IndexedDB database instance
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB not supported; using LocalStorage fallback.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Saves a key-value record with metadata (timestamp, age, status)
 * @param {string} key 
 * @param {any} data 
 * @returns {Promise<boolean>}
 */
export async function saveToCache(key, data) {
  const payload = {
    key,
    data,
    timestamp: Date.now(),
    updatedAt: new Date().toLocaleTimeString(),
    dateString: new Date().toLocaleDateString()
  };

  // Always mirror to localStorage as synchronous, high-reliability fallback
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`dap_${key}`, JSON.stringify(payload));
    }
  } catch {
    // Quota or incognito restriction handled safely
  }

  // Persist to IndexedDB
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(payload);

      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => resolve(false);
    });
  } catch {
    return true; // LocalStorage fallback succeeded
  }
}

/**
 * Retrieves a cached record and computes freshness metrics
 * @param {string} key 
 * @param {number|null} maxAgeMs Optional maximum acceptable age in milliseconds
 * @returns {Promise<Object|null>} { data, timestamp, isStale, ageMinutes, updatedAt }
 */
export async function getFromCache(key, maxAgeMs = null) {
  let record = null;

  // 1. Try reading from IndexedDB
  try {
    const db = await openDatabase();
    record = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(key);

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    });
  } catch {
    record = null;
  }

  // 2. Fall back to LocalStorage if not found in IndexedDB
  if (!record && typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(`dap_${key}`);
      if (raw) record = JSON.parse(raw);
    } catch {
      record = null;
    }
  }

  if (!record) return null;

  // Compute freshness
  const ageMs = Date.now() - record.timestamp;
  const ageMinutes = Math.round(ageMs / 60000);
  const isStale = maxAgeMs ? ageMs > maxAgeMs : ageMinutes > 360; // 6 hours default staleness threshold

  return {
    data: record.data,
    timestamp: record.timestamp,
    updatedAt: record.updatedAt,
    dateString: record.dateString,
    ageMinutes,
    isStale
  };
}

/**
 * Clears all cached disaster, weather, and facility records
 */
export async function clearAllCache() {
  // Clear LocalStorage entries
  if (typeof localStorage !== 'undefined') {
    Object.values(CACHE_KEYS).forEach((k) => {
      localStorage.removeItem(`dap_${k}`);
    });
  }

  // Clear IndexedDB store
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve(true);
      clearReq.onerror = () => resolve(false);
    });
  } catch {
    return true;
  }
}

/**
 * Deletes a single key from cache
 */
export async function deleteFromCache(key) {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`dap_${key}`);
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return true;
  }
}

/**
 * Returns cache diagnostics for inspection in UI or testing reports
 */
export async function getCacheDiagnostics() {
  const diagnostics = {};
  let totalCached = 0;
  for (const key of Object.values(CACHE_KEYS)) {
    const item = await getFromCache(key);
    if (item) {
      totalCached++;
      diagnostics[key] = {
        cached: true,
        updatedAt: item.updatedAt,
        ageMinutes: item.ageMinutes,
        isStale: item.isStale,
        sizeBytes: JSON.stringify(item.data).length
      };
    } else {
      diagnostics[key] = { cached: false };
    }
  }
  return {
    storageEngine: isIndexedDBSupported() ? 'IndexedDB + LocalStorage (Dual Layer)' : 'LocalStorage Fallback',
    totalItems: totalCached,
    records: diagnostics
  };
}
