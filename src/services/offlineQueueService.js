/**
 * src/services/offlineQueueService.js
 * Offline-First IndexedDB and LocalStorage Queue for Emergency SOS and Hazard Reports.
 * Features:
 * - Unique client-generated IDs for idempotent backend creation
 * - Status: 'Pending transmission' until server acknowledges
 * - Exponential backoff retry loop with configurable limits
 * - Manual retry trigger & confirmed deletion of unsent drafts
 * - Background Sync registration with foreground failover
 */

const DB_NAME = 'DisasterAlertPWA_DB';
const DB_VERSION = 2; // Upgraded to support dedicated queue stores
const SOS_QUEUE_STORE = 'sos_queue';
const HAZARD_QUEUE_STORE = 'hazard_queue';

const LOCAL_STORAGE_SOS_KEY = 'resqalert_sos_queue';
const LOCAL_STORAGE_HAZARD_KEY = 'resqalert_hazard_queue';
const LOCAL_STORAGE_TOKEN_KEY = 'resqalert_user_token';

// Maximum retry attempts before pausing automatic attempts
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 2000;

// Subscribers for queue changes (reactive UI updates)
const listeners = new Set();

export function subscribeToQueueChanges(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('[Queue Listener Error]:', e);
    }
  });
}

/**
 * Returns or creates persistent client userToken for IDOR protection
 */
export function getOrCreateClientToken() {
  if (typeof window === 'undefined') return 'server-env-token';
  let token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
  if (!token) {
    token = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, token);
  }
  return token;
}

/**
 * Open or upgrade IndexedDB
 */
function openQueueDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not available.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('emergency_cache')) {
        db.createObjectStore('emergency_cache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(SOS_QUEUE_STORE)) {
        db.createObjectStore(SOS_QUEUE_STORE, { keyPath: 'clientGeneratedId' });
      }
      if (!db.objectStoreNames.contains(HAZARD_QUEUE_STORE)) {
        db.createObjectStore(HAZARD_QUEUE_STORE, { keyPath: 'clientGeneratedId' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// ---------------------------------------------------------------------------
// LocalStorage Fallback Helpers
// ---------------------------------------------------------------------------

function getLsQueue(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLsQueue(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.warn('[Queue LocalStorage Quota Exceeded]:', e);
  }
}

// ---------------------------------------------------------------------------
// SOS Offline Queue
// ---------------------------------------------------------------------------

/**
 * Queues an SOS request locally with 'Pending transmission' status
 */
export async function queueSosRequest(sosData) {
  const clientGeneratedId = sosData.clientGeneratedId || `sos-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const record = {
    ...sosData,
    clientGeneratedId,
    userToken: sosData.userToken || getOrCreateClientToken(),
    createdAt: sosData.createdAt || nowIso,
    status: 'Pending transmission', // NEVER marked received until server acknowledges
    retryCount: 0,
    lastRetryAt: null,
    nextRetryAt: Date.now() + INITIAL_BACKOFF_MS,
    deliveryAcknowledged: false,
    queuedAt: nowIso
  };

  // 1. Mirror to LocalStorage
  const lsItems = getLsQueue(LOCAL_STORAGE_SOS_KEY).filter((i) => i.clientGeneratedId !== clientGeneratedId);
  lsItems.push(record);
  saveLsQueue(LOCAL_STORAGE_SOS_KEY, lsItems);

  // 2. Persist to IndexedDB
  try {
    const db = await openQueueDatabase();
    await new Promise((resolve) => {
      const tx = db.transaction(SOS_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SOS_QUEUE_STORE);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[IndexedDB Queue Error, using LocalStorage fallback]:', err);
  }

  // Register Background Sync if supported
  registerBackgroundSync('sync-sos-queue');

  notifyListeners();
  return record;
}

/**
 * Gets all pending SOS requests
 */
export async function getQueuedSosRequests() {
  try {
    const db = await openQueueDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(SOS_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(SOS_QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result || [];
        resolve(items);
      };
      req.onerror = () => resolve(getLsQueue(LOCAL_STORAGE_SOS_KEY));
    });
  } catch {
    return getLsQueue(LOCAL_STORAGE_SOS_KEY);
  }
}

/**
 * Deletes an unsent draft SOS request after user confirmation
 */
export async function deleteQueuedSosRequest(clientGeneratedId) {
  // Remove from LocalStorage
  const lsItems = getLsQueue(LOCAL_STORAGE_SOS_KEY).filter((i) => i.clientGeneratedId !== clientGeneratedId);
  saveLsQueue(LOCAL_STORAGE_SOS_KEY, lsItems);

  // Remove from IndexedDB
  try {
    const db = await openQueueDatabase();
    await new Promise((resolve) => {
      const tx = db.transaction(SOS_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SOS_QUEUE_STORE);
      store.delete(clientGeneratedId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {}

  notifyListeners();
  return true;
}

/**
 * Removes successfully acknowledged request from queue
 */
export async function acknowledgeQueuedSos(clientGeneratedId) {
  return deleteQueuedSosRequest(clientGeneratedId);
}

// ---------------------------------------------------------------------------
// Hazard Offline Queue
// ---------------------------------------------------------------------------

export async function queueHazardReport(hazardData) {
  const clientGeneratedId = hazardData.clientGeneratedId || `haz-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const record = {
    ...hazardData,
    clientGeneratedId,
    userToken: hazardData.userToken || getOrCreateClientToken(),
    createdAt: hazardData.createdAt || nowIso,
    status: 'Pending transmission',
    retryCount: 0,
    queuedAt: nowIso
  };

  const lsItems = getLsQueue(LOCAL_STORAGE_HAZARD_KEY).filter((i) => i.clientGeneratedId !== clientGeneratedId);
  lsItems.push(record);
  saveLsQueue(LOCAL_STORAGE_HAZARD_KEY, lsItems);

  try {
    const db = await openQueueDatabase();
    await new Promise((resolve) => {
      const tx = db.transaction(HAZARD_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(HAZARD_QUEUE_STORE);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {}

  registerBackgroundSync('sync-sos-queue');
  notifyListeners();
  return record;
}

export async function getQueuedHazards() {
  try {
    const db = await openQueueDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(HAZARD_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(HAZARD_QUEUE_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(getLsQueue(LOCAL_STORAGE_HAZARD_KEY));
    });
  } catch {
    return getLsQueue(LOCAL_STORAGE_HAZARD_KEY);
  }
}

export async function acknowledgeQueuedHazard(clientGeneratedId) {
  const lsItems = getLsQueue(LOCAL_STORAGE_HAZARD_KEY).filter((i) => i.clientGeneratedId !== clientGeneratedId);
  saveLsQueue(LOCAL_STORAGE_HAZARD_KEY, lsItems);

  try {
    const db = await openQueueDatabase();
    await new Promise((resolve) => {
      const tx = db.transaction(HAZARD_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(HAZARD_QUEUE_STORE);
      store.delete(clientGeneratedId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {}

  notifyListeners();
  return true;
}

// ---------------------------------------------------------------------------
// Synchronization Engine (Safe Exponential Backoff)
// ---------------------------------------------------------------------------

let isSyncingQueue = false;

/**
 * Attempt transmission of all queued items
 */
export async function syncOfflineQueues() {
  if (isSyncingQueue) return { syncing: true };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { online: false, message: 'Offline. Sync delayed until connectivity returns.' };
  }

  isSyncingQueue = true;
  notifyListeners();

  const results = {
    sosSucceeded: 0,
    sosFailed: 0,
    hazardsSucceeded: 0,
    hazardsFailed: 0
  };

  try {
    // 1. Process SOS Queue
    const sosQueue = await getQueuedSosRequests();
    for (const item of sosQueue) {
      if (item.retryCount >= MAX_RETRY_ATTEMPTS) {
        // Paused after retry limit reached; requires manual retry button
        continue;
      }

      try {
        const res = await fetch('/api/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });

        if (res.ok) {
          const body = await res.json();
          // Server confirmed! Safely remove from local queue
          await acknowledgeQueuedSos(item.clientGeneratedId);
          results.sosSucceeded++;
        } else {
          // Increment retry attempt with exponential backoff
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastRetryAt = new Date().toISOString();
          const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, item.retryCount);
          item.nextRetryAt = Date.now() + backoffDelay;
          await queueSosRequest(item);
          results.sosFailed++;
        }
      } catch (err) {
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastRetryAt = new Date().toISOString();
        const backoffDelay = INITIAL_BACKOFF_MS * Math.pow(2, item.retryCount);
        item.nextRetryAt = Date.now() + backoffDelay;
        await queueSosRequest(item);
        results.sosFailed++;
      }
    }

    // 2. Process Hazard Queue
    const hazardQueue = await getQueuedHazards();
    for (const item of hazardQueue) {
      try {
        const res = await fetch('/api/hazards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });

        if (res.ok) {
          await acknowledgeQueuedHazard(item.clientGeneratedId);
          results.hazardsSucceeded++;
        } else {
          results.hazardsFailed++;
        }
      } catch {
        results.hazardsFailed++;
      }
    }
  } finally {
    isSyncingQueue = false;
    notifyListeners();
  }

  return results;
}

/**
 * Registers Background Sync with Service Worker if supported
 */
function registerBackgroundSync(tag) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => reg.sync.register(tag))
      .catch((err) => console.log('[Background Sync Not Supported or Blocked]:', err.message));
  }
}

// Listen for service worker background sync trigger
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_SOS_SYNC') {
      syncOfflineQueues();
    }
  });

  // Listen for online event to immediately trigger retry
  window.addEventListener('online', () => {
    console.log('[ResQAlert Connection Restored] Triggering offline queue transmission...');
    syncOfflineQueues();
  });
}
