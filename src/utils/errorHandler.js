/**
 * errorHandler.js
 * Universal error classification and user-facing message normalizer.
 * Ensures the application communicates problems calmly and accurately during crises.
 */

export function classifyNetworkError(error) {
  if (!error) return 'An unexpected error occurred.';

  const msg = (error.message || error.toString()).toLowerCase();

  if (msg.includes('abort') || msg.includes('timeout') || error.name === 'TimeoutError') {
    return 'The request timed out due to high network latency. Operating in offline cache mode.';
  }

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('offline') || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
    return 'Network connection is unavailable. Operating on verified local offline cache.';
  }

  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'Public API request rate limit reached. Reusing latest verified cached observations.';
  }

  if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
    return 'External government service temporarily unresponsive. Showing local cached emergency data.';
  }

  return `Service error: ${error.message || 'Unable to reach public feed'}. Operating in safe offline mode.`;
}
