/**
 * test-runner.js
 * Automated CLI test suite for Disaster Alert & Emergency Resource PWA.
 * Verifies core algorithms, validators, distance calculations, and alert processing.
 * Run via: node scripts/test-runner.js
 */

import { validateCoordinates, sanitizeText } from '../src/utils/validators.js';
import { 
  calculateDistanceKm, 
  formatDistance, 
  CHANDIGARH_RESOURCES, 
  getResourcesWithDistance 
} from '../src/data/emergencyResources.js';
import { 
  normalizeAlert, 
  processAlerts, 
  SEVERITY_WEIGHTS 
} from '../src/services/alertProcessor.js';
import { classifyNetworkError } from '../src/utils/errorHandler.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${message}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('  DISASTER ALERT PWA — AUTOMATED SUITE (STEP 14)      ');
console.log('======================================================\n');

// ----------------------------------------------------
// 1. Coordinate Validation & Bounds Checking
// ----------------------------------------------------
console.log('Test Group 1: Coordinate Validation & Input Sanitization');
{
  const valid = validateCoordinates(30.7333, 76.7794);
  assert(valid.isValid === true && valid.latitude === 30.7333, 'Validates standard Kharar/Chandigarh coordinates');

  const invalidLatHigh = validateCoordinates(95.5, 76.7);
  assert(invalidLatHigh.isValid === false && invalidLatHigh.error.includes('-90.0° and +90.0°'), 'Rejects latitude > 90.0°');

  const invalidLatLow = validateCoordinates(-95.5, 76.7);
  assert(invalidLatLow.isValid === false && invalidLatLow.error.includes('-90.0° and +90.0°'), 'Rejects latitude < -90.0°');

  const invalidLon = validateCoordinates(30.7, 195.0);
  assert(invalidLon.isValid === false && invalidLon.error.includes('-180.0° and +180.0°'), 'Rejects longitude > 180.0°');

  const nanCheck = validateCoordinates('invalid', 76.7);
  assert(nanCheck.isValid === false && nanCheck.error.includes('valid decimal numbers'), 'Rejects NaN inputs gracefully');

  const sanitized = sanitizeText('<script>alert("XSS")</script>Disaster Shelter', 50);
  assert(!sanitized.includes('<') && !sanitized.includes('>') && sanitized.includes('Disaster Shelter'), 'Strips XSS tags from location text');
}

// ----------------------------------------------------
// 2. Haversine Spherical Distance Engine
// ----------------------------------------------------
console.log('\nTest Group 2: Haversine Geodesic Distance Matrix');
{
  // Known reference: Kharar (30.7499, 76.6411) to Chandigarh Sector 17 (30.7415, 76.7681) ~ 12.18 km
  const distanceKm = calculateDistanceKm(30.7499, 76.6411, 30.7415, 76.7681);
  const isAccurate = distanceKm > 11.5 && distanceKm < 13.0;
  assert(isAccurate, `Haversine distance Kharar to Chd Sector 17 calculated as ${distanceKm.toFixed(2)} km (expected ~12.2 km)`);

  // Same point distance should be 0
  const zeroDistance = calculateDistanceKm(30.7499, 76.6411, 30.7499, 76.6411);
  assert(zeroDistance === 0, 'Distance from point to itself is 0.00 km');

  // Format distance
  assert(formatDistance(0.45) === '450 m away', 'Formats sub-kilometer distances in meters (450 m away)');
  assert(formatDistance(5.24) === '5.2 km away', 'Formats multi-kilometer distances in kilometers (5.2 km away)');

  // Facilities dataset integrity
  assert(Array.isArray(CHANDIGARH_RESOURCES) && CHANDIGARH_RESOURCES.length >= 10, `Emergency facility dataset contains ${CHANDIGARH_RESOURCES.length} verified records`);
  
  const hasHospitals = CHANDIGARH_RESOURCES.some(f => f.type === 'hospital');
  const hasPolice = CHANDIGARH_RESOURCES.some(f => f.type === 'police');
  const hasFire = CHANDIGARH_RESOURCES.some(f => f.type === 'fire');
  const hasShelters = CHANDIGARH_RESOURCES.some(f => f.type === 'shelter');
  assert(hasHospitals && hasPolice && hasFire && hasShelters, 'All 4 critical facility categories (hospital, police, fire, shelter) are present');

  // Closest-first sorting
  const sorted = getResourcesWithDistance(30.7499, 76.6411);
  assert(sorted[0].distanceKm <= sorted[1].distanceKm, 'getResourcesWithDistance sorts results in ascending proximity order (closest first)');
}

// ----------------------------------------------------
// 3. Alert Processing & Protective Action Synthesis
// ----------------------------------------------------
console.log('\nTest Group 3: Intelligent Alert Processing & Normalization');
{
  const mockAlerts = [
    {
      id: 'alert-1',
      type: 'Flood',
      title: 'Flash Flood Warning for Sukhna Lake Corridor',
      severity: 'emergency',
      location: 'Kharar / Sukhna',
      description: 'Heavy rainfall overflow risk at flood gates'
    },
    {
      id: 'alert-2',
      type: 'Earthquake',
      title: 'Magnitude 4.5 Tremor Reported',
      severity: 'warning',
      location: 'Himalayan Ridge',
      description: 'Seismic activity detected at depth 10km'
    },
    // Duplicate alert to test deduplication
    {
      id: 'alert-1-duplicate',
      type: 'Flood',
      title: 'Flash Flood Warning for Sukhna Lake Corridor',
      severity: 'emergency',
      location: 'Kharar / Sukhna',
      description: 'Heavy rainfall overflow risk at flood gates'
    }
  ];

  const processed = processAlerts(mockAlerts);
  assert(processed.length === 2, `Deduplication successfully reduced 3 alerts (with 1 duplicate) to ${processed.length} unique alerts`);
  assert(processed[0].severity === 'Emergency', 'Highest severity alert (Emergency) correctly placed at the top of the feed');
  assert(typeof processed[0].recommendedAction === 'string' && processed[0].recommendedAction.length > 10, 'Protective actions synthesized for flood alert');

  const normalizedEarthquake = normalizeAlert({ type: 'Earthquake', severity: 'Warning' });
  assert(normalizedEarthquake.recommendedAction.toLowerCase().includes('drop') || normalizedEarthquake.recommendedAction.toLowerCase().includes('cover'), 'Synthesizes Drop, Cover, and Hold On for seismic events');
}

// ----------------------------------------------------
// 4. Error Classification & Graceful Fallback
// ----------------------------------------------------
console.log('\nTest Group 4: Network Error Handling & Message Normalization');
{
  const timeoutErr = new Error('The operation was aborted due to timeout');
  const timeoutMsg = classifyNetworkError(timeoutErr);
  assert(timeoutMsg.includes('timed out due to high network latency'), 'Maps network timeout to user-friendly latency advisory');

  const offlineErr = new Error('Failed to fetch');
  const offlineMsg = classifyNetworkError(offlineErr);
  assert(offlineMsg.includes('Operating on verified local offline cache'), 'Maps fetch failure to offline cache advisory');

  const rateLimitErr = new Error('HTTP 429 Too Many Requests');
  const rateLimitMsg = classifyNetworkError(rateLimitErr);
  assert(rateLimitMsg.includes('Reusing latest verified cached observations'), 'Maps 429 rate limit to cache reuse advisory');
}

console.log('\n======================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
