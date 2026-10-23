/**
 * src/services/sosService.js
 * Citizen Emergency SOS Service.
 * Coordinates direct API transmission, offline queuing failover, and personal status tracking.
 */

import { 
  queueSosRequest, 
  getQueuedSosRequests, 
  deleteQueuedSosRequest, 
  getOrCreateClientToken 
} from './offlineQueueService';

/**
 * Submits an emergency SOS request.
 * If online, transmits directly to server.
 * If offline or server unreachable, queues safely in IndexedDB / LocalStorage with 'Pending transmission' status.
 */
export async function submitSosRequest(data, isEffectivelyOnline = true) {
  const userToken = getOrCreateClientToken();
  const clientGeneratedId = `sos-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const payload = {
    ...data,
    id: clientGeneratedId,
    clientGeneratedId,
    userToken,
    locationCaptureTime: data.locationCaptureTime || new Date().toISOString()
  };

  // If offline, immediately queue locally
  if (!isEffectivelyOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const queued = await queueSosRequest(payload);
    return {
      success: true,
      isQueuedOffline: true,
      incident: queued,
      message: 'Network offline. SOS saved locally in emergency queue and marked Pending transmission.'
    };
  }

  // Attempt server transmission with 6-second timeout
  try {
    const res = await fetch('/api/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const result = await res.json();
      return {
        success: true,
        isQueuedOffline: false,
        incident: result.incident,
        isDuplicate: result.isDuplicate,
        message: result.message
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with status ${res.status}`);
    }
  } catch (err) {
    console.warn('[SOS Server Failover to Offline Queue]:', err.message);
    const queued = await queueSosRequest(payload);
    return {
      success: true,
      isQueuedOffline: true,
      incident: queued,
      message: 'Server unreachable. SOS safely queued locally and marked Pending transmission.'
    };
  }
}

/**
 * Retrieves the citizen's own incidents.
 * Merges online server-confirmed requests with locally queued pending transmissions.
 */
export async function fetchMySosRequests() {
  const userToken = getOrCreateClientToken();
  const queuedItems = await getQueuedSosRequests();
  let serverItems = [];

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const res = await fetch(`/api/sos/my-requests?token=${encodeURIComponent(userToken)}`, {
        signal: AbortSignal.timeout(4000)
      });
      if (res.ok) {
        const body = await res.json();
        serverItems = body.incidents || [];
      }
    }
  } catch (err) {
    console.warn('[Unable to fetch server SOS requests]:', err.message);
  }

  // Merge queued and server items, deduplicating by clientGeneratedId or id
  const seenIds = new Set();
  const combined = [];

  // Queued pending items come first
  for (const q of queuedItems) {
    const idKey = q.clientGeneratedId || q.id;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      combined.push(q);
    }
  }

  // Server items
  for (const s of serverItems) {
    const idKey = s.clientGeneratedId || s.id;
    if (!seenIds.has(idKey)) {
      seenIds.add(idKey);
      combined.push(s);
    }
  }

  return combined;
}

/**
 * Deletes an unsent draft after user confirmation
 */
export async function cancelUnsentSos(clientGeneratedId) {
  return deleteQueuedSosRequest(clientGeneratedId);
}
