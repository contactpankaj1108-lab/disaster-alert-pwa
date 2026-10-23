/**
 * src/services/hazardService.js
 * Geotagged Community Hazard Reporting Client Service.
 * Coordinates citizen submissions, offline failover, public verified map markers,
 * and dispatcher verification workflow.
 */

import { queueHazardReport, getOrCreateClientToken } from './offlineQueueService';
import { authorityAuth } from './authorityAuthService';

export async function submitHazardReport(data, isEffectivelyOnline = true) {
  const userToken = getOrCreateClientToken();
  const clientGeneratedId = `haz-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  const payload = {
    ...data,
    id: clientGeneratedId,
    clientGeneratedId,
    userToken,
    locationCaptureTime: data.locationCaptureTime || new Date().toISOString()
  };

  // If offline, queue locally
  if (!isEffectivelyOnline || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const queued = await queueHazardReport(payload);
    return {
      success: true,
      isQueuedOffline: true,
      hazard: queued,
      message: 'Network offline. Hazard report saved locally in queue and marked Pending transmission.'
    };
  }

  try {
    const res = await fetch('/api/hazards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const body = await res.json();
      return {
        success: true,
        isQueuedOffline: false,
        hazard: body.hazard,
        message: body.message
      };
    } else {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('[Hazard Submission Failover to Queue]:', err.message);
    const queued = await queueHazardReport(payload);
    return {
      success: true,
      isQueuedOffline: true,
      hazard: queued,
      message: 'Server unreachable. Hazard report queued locally for automatic retry.'
    };
  }
}

/**
 * Fetch verified hazards for public map display
 */
export async function fetchVerifiedHazards() {
  try {
    const res = await fetch('/api/hazards/verified', {
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const body = await res.json();
      return body.hazards || [];
    }
  } catch (err) {
    console.warn('[Failed to fetch verified hazards]:', err.message);
  }
  return [];
}

/**
 * Fetch all hazards for Authority Command Center
 */
export async function fetchAuthorityHazards() {
  const res = await fetch('/api/authority/hazards', {
    headers: authorityAuth.getAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch hazard reports.');
  }
  const body = await res.json();
  return body.hazards || [];
}

/**
 * Dispatcher: Verify, reject, or resolve hazard report
 */
export async function updateHazardVerification(id, status, note = '') {
  const res = await fetch(`/api/authority/hazards/${id}/status`, {
    method: 'PATCH',
    headers: authorityAuth.getAuthHeaders(),
    body: JSON.stringify({ status, note })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update hazard verification status.');
  }
  const body = await res.json();
  return body.hazard;
}
