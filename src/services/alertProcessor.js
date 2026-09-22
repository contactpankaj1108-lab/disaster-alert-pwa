/**
 * alertProcessor.js
 * Intelligent alert processing and normalization pipeline.
 * Standardizes heterogeneous alert payloads from various public meteorological
 * and geological APIs into a consistent internal schema.
 */

// Universal Severity Ranking
export const SEVERITY_WEIGHTS = {
  emergency: 4,
  critical: 4,
  extreme: 4,
  warning: 3,
  high: 3,
  severe: 3,
  watch: 2,
  moderate: 2,
  advisory: 2,
  normal: 1,
  low: 1,
  informational: 1
};

// Recommended Action Knowledge Base for synthesizing missing protective actions
const DEFAULT_ACTIONS_BY_TYPE = {
  flood: 'Move immediately to higher ground. Avoid low-lying underpasses and subterranean walkways. Do not walk or drive through flowing water.',
  earthquake: 'Drop, Cover, and Hold On! Stay indoors away from windows and falling masonry until shaking stops completely.',
  storm: 'Shelter in an interior room on the lowest floor. Keep clear of windows and unplug high-draw electrical appliances.',
  'extreme temperature': 'Stay in shaded or air-conditioned environments. Drink plenty of potable fluids and limit strenuous physical outdoor exertion.',
  fire: 'Evacuate toward designated assembly zones. Stay low under smoke and never re-enter burning structures.',
  tsunami: 'Move inland and seek vertical evacuation in reinforced multi-story buildings immediately.',
  general: 'Monitor local government emergency bulletins and battery-operated radio broadcasts for protective directives.'
};

/**
 * Normalizes incoming raw alert objects into the standard internal schema
 * @param {Object} raw 
 * @returns {Object} Normalized Alert
 */
export function normalizeAlert(raw) {
  if (!raw) return null;

  // Determine standard type
  let type = raw.type || 'General';
  const typeLower = type.toLowerCase();
  if (typeLower.includes('flood') || typeLower.includes('rain') || typeLower.includes('water')) {
    type = 'Flood';
  } else if (typeLower.includes('quake') || typeLower.includes('seismic')) {
    type = 'Earthquake';
  } else if (typeLower.includes('storm') || typeLower.includes('wind') || typeLower.includes('lightning') || typeLower.includes('hail')) {
    type = 'Storm';
  } else if (typeLower.includes('heat') || typeLower.includes('cold') || typeLower.includes('temperature')) {
    type = 'Extreme Temperature';
  } else if (typeLower.includes('fire') || typeLower.includes('smoke')) {
    type = 'Fire';
  }

  // Determine standard severity
  const rawSev = (raw.severity || 'Watch').toLowerCase();
  let severity = 'Watch';
  let severityWeight = 2;

  if (rawSev.includes('emergency') || rawSev.includes('critical') || rawSev.includes('extreme')) {
    severity = 'Emergency';
    severityWeight = 4;
  } else if (rawSev.includes('warning') || rawSev.includes('high') || rawSev.includes('severe')) {
    severity = 'Warning';
    severityWeight = 3;
  } else if (rawSev.includes('watch') || rawSev.includes('moderate') || rawSev.includes('advisory')) {
    severity = 'Watch';
    severityWeight = 2;
  } else {
    severity = 'Normal';
    severityWeight = 1;
  }

  // Synthesize recommended action if missing
  let recommendedAction = raw.recommendedAction;
  if (!recommendedAction || recommendedAction.trim() === '') {
    recommendedAction = DEFAULT_ACTIONS_BY_TYPE[type.toLowerCase()] || DEFAULT_ACTIONS_BY_TYPE.general;
  }

  return {
    id: raw.id || `alert-${Math.random().toString(36).substring(2, 9)}`,
    title: raw.title || `${severity} Alert for ${type}`,
    type: type,
    severity: severity,
    severityWeight: severityWeight,
    location: raw.location || 'Monitored Region',
    description: raw.description || 'Hazardous regional conditions detected. Exercise caution.',
    recommendedAction: recommendedAction,
    source: raw.source || 'Public Alert Service',
    startTime: raw.startTime || 'Active Now',
    endTime: raw.endTime || 'Until Further Notice',
    timestamp: raw.timestamp || Date.now(),
    isSample: !!raw.isSample
  };
}

/**
 * Intelligent alert processing pipeline:
 * 1. Normalizes all alerts to common format
 * 2. De-duplicates identical events
 * 3. Sorts alerts strictly by severity weight (Emergency -> Warning -> Watch -> Normal)
 * @param {Array} alertList 
 * @returns {Array} Cleaned, normalized, prioritized alerts
 */
export function processAlerts(alertList = []) {
  if (!Array.isArray(alertList)) return [];

  const normalized = [];
  const seenKeys = new Set();

  for (const raw of alertList) {
    const item = normalizeAlert(raw);
    if (!item) continue;

    // Deduplication signature based on type + location + title similarity
    const signature = `${item.type.toLowerCase()}-${item.location.toLowerCase()}-${item.severity.toLowerCase()}`;
    if (!seenKeys.has(signature)) {
      seenKeys.add(signature);
      normalized.push(item);
    }
  }

  // Sort descending by severity weight (highest severity first)
  return normalized.sort((a, b) => b.severityWeight - a.severityWeight);
}
