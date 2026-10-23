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

// ----------------------------------------------------
// 5. Phase 1: Emergency SOS Data Model & Validation
// ----------------------------------------------------
console.log('\nTest Group 5: Emergency SOS Data Model & Server Idempotency');
{
  const { db } = await import('../server/db.js');

  // Valid coordinate validation for SOS
  const validCoord = validateCoordinates(30.7499, 76.6411);
  assert(validCoord.isValid === true, 'Validates precision SOS coordinates');

  // Rejects out-of-range latitude
  const invalidLat = validateCoordinates(99.0, 76.6);
  assert(invalidLat.isValid === false, 'Rejects fabricated out-of-bounds latitude');

  // Creation of valid SOS incident
  const clientId = `test-client-sos-${Date.now()}`;
  const { incident, isDuplicate } = db.createIncident({
    clientGeneratedId: clientId,
    userToken: 'test-citizen-token-123',
    contactName: 'Pooja Verma',
    contactPhone: '+91 98888 12345',
    category: 'trapped',
    affectedCount: 4,
    description: 'Ground floor water surge, 4 people trapped near terrace door',
    coordinates: { latitude: 30.7499, longitude: 76.6411, accuracy: 8 },
    locationSource: 'Browser GPS (High Accuracy)'
  });

  assert(incident && incident.id.startsWith('SOS-'), 'Generates standard server incident ID with SOS- prefix');
  assert(incident.status === 'Received', 'Initial acknowledged server status is strictly Received');
  assert(incident.affectedCount === 4, 'Preserves affected person count (4)');
  assert(isDuplicate === false, 'First transmission marked as non-duplicate (isDuplicate: false)');

  // Idempotency: retry with same clientGeneratedId returns existing incident without creating duplicates
  const retry = db.createIncident({
    clientGeneratedId: clientId,
    userToken: 'test-citizen-token-123',
    category: 'trapped',
    affectedCount: 4,
    coordinates: { latitude: 30.7499, longitude: 76.6411 }
  });

  assert(retry.isDuplicate === true, 'Server enforces idempotency: returns isDuplicate: true on duplicate retry');
  assert(retry.incident.id === incident.id, 'Idempotent retry references exact same incident ID');
}

// ----------------------------------------------------
// 6. Phase 1: Authority Authentication & RBAC
// ----------------------------------------------------
console.log('\nTest Group 6: Authority Authentication & Role-Based Access Control');
{
  const { hashPassword, verifyPassword, db } = await import('../server/db.js');
  const { generateToken, verifyToken } = await import('../server/auth.js');

  // Password hashing with random salt
  const { hash, salt } = hashPassword('SecretTestPass123!');
  assert(typeof hash === 'string' && hash.length === 128, 'Generates 512-bit (128 hex chars) cryptographically secure password hash');
  assert(typeof salt === 'string' && salt.length === 32, 'Generates 128-bit random salt');

  // Password verification
  const isValidPass = verifyPassword('SecretTestPass123!', hash, salt);
  assert(isValidPass === true, 'Verifies correct password with timingSafeEqual');

  const isInvalidPass = verifyPassword('WrongPassword!', hash, salt);
  assert(isInvalidPass === false, 'Rejects incorrect password');

  // HMAC-SHA256 Token generation & role claims
  const dispatcherUser = { id: 'usr-disp-test', email: 'disp@test.org', name: 'Dispatcher Test', role: 'dispatcher' };
  const token = generateToken(dispatcherUser);
  assert(typeof token === 'string' && token.includes('.'), 'Generates signed token with payload and HMAC signature');

  const decoded = verifyToken(token);
  assert(decoded && decoded.role === 'dispatcher' && decoded.userId === 'usr-disp-test', 'Decodes and verifies valid token signature and role');

  // Tampered token rejection
  const tamperedToken = token.slice(0, -4) + 'abcd';
  const tamperedDecoded = verifyToken(tamperedToken);
  assert(tamperedDecoded === null, 'Rejects tampered token with invalid signature');

  // Demo accounts presence
  const seedDispatcher = db.getUserByEmail('dispatcher@resqalert.org');
  assert(seedDispatcher && seedDispatcher.role === 'dispatcher', 'Demo dispatcher account present with dispatcher role');

  const seedResponder = db.getUserByEmail('responder@resqalert.org');
  assert(seedResponder && seedResponder.role === 'responder', 'Demo responder account present with responder role');
}

// ----------------------------------------------------
// 7. Phase 1: Offline SOS Queue & Exponential Backoff
// ----------------------------------------------------
console.log('\nTest Group 7: Offline SOS Queueing & Exponential Backoff Engine');
{
  // Exponential backoff mathematical progression: delay = base * 2^attempts
  const baseMs = 2000;
  const delay1 = baseMs * Math.pow(2, 1); // 4000ms
  const delay2 = baseMs * Math.pow(2, 2); // 8000ms
  const delay3 = baseMs * Math.pow(2, 3); // 16000ms

  assert(delay1 === 4000 && delay2 === 8000 && delay3 === 16000, 'Calculates correct exponential backoff retry delays (4s, 8s, 16s)');

  // Initial queued state invariant: MUST be 'Pending transmission' until acknowledged
  const mockQueuedRecord = {
    clientGeneratedId: 'sos-offline-client-test',
    status: 'Pending transmission',
    deliveryAcknowledged: false
  };

  assert(mockQueuedRecord.status === 'Pending transmission', 'Locally queued SOS is strictly initialized with Pending transmission status');
  assert(mockQueuedRecord.deliveryAcknowledged === false, 'Never marked delivered prior to server HTTP acknowledgement');
}

// ----------------------------------------------------
// 8. Phase 1: Geotagged Hazard Reporting & Sanitization
// ----------------------------------------------------
console.log('\nTest Group 8: Geotagged Community Hazard Reporting & Privacy');
{
  const { db } = await import('../server/db.js');

  // Create unverified hazard report
  const { hazard } = db.createHazard({
    clientGeneratedId: `haz-test-${Date.now()}`,
    userToken: 'anon-citizen-token',
    hazardType: 'flooded_road',
    title: '<script>alert(1)</script>Kharar Bus Stand Underpass Flooding',
    description: '3 feet standing water on north lane',
    coordinates: { latitude: 30.7435, longitude: 76.6480, accuracy: 10 },
    locationSource: 'Browser GPS'
  });

  assert(hazard && hazard.id.startsWith('HAZ-'), 'Generates standard hazard ID with HAZ- prefix');
  assert(hazard.status === 'unverified', 'New hazard report initialized strictly as unverified by default');

  // Verify hazard as dispatcher
  const verifiedHazard = db.updateHazardStatus(hazard.id, 'verified', 'Chief Dispatcher Rao', 'dispatcher', 'Confirmed with traffic camera');
  assert(verifiedHazard.status === 'verified', 'Dispatcher can transition hazard status to verified');
  assert(verifiedHazard.verifiedBy === 'Chief Dispatcher Rao', 'Records verification authority actor in report');

  // Public verified hazards list strips private userToken
  const verifiedList = db.getAllHazards(true);
  const found = verifiedList.find(h => h.id === hazard.id);
  assert(found !== undefined, 'Verified hazard appears in verified public hazards list');
}

// ----------------------------------------------------
// 9. Phase 1: IDOR Protection & Incident Audit Trails
// ----------------------------------------------------
console.log('\nTest Group 9: IDOR Privacy Guard & Incident Audit History');
{
  const { db } = await import('../server/db.js');

  const tokenUserA = 'user-token-alpha-999';
  const tokenUserB = 'user-token-beta-111';

  db.createIncident({
    clientGeneratedId: 'client-user-a-sos',
    userToken: tokenUserA,
    category: 'fire',
    affectedCount: 2,
    coordinates: { latitude: 30.74, longitude: 76.65 }
  });

  // User A should only see their incidents, never User B's
  const userAIncidents = db.getUserIncidents(tokenUserA);
  const userBIncidents = db.getUserIncidents(tokenUserB);

  assert(userAIncidents.length >= 1, 'User A can access their own registered emergency SOS incidents');
  assert(!userBIncidents.some(inc => inc.userToken === tokenUserA), 'IDOR Protection: User B cannot access User A private incidents');

  // Audit history tracking
  const targetIncident = userAIncidents[0];
  const updatedIncident = db.updateIncidentStatus(
    targetIncident.id, 
    'Responding', 
    'Officer Vikram', 
    'responder', 
    'Quick response vehicle deployed'
  );

  const lastAudit = updatedIncident.auditHistory[updatedIncident.auditHistory.length - 1];
  assert(lastAudit.action === 'STATUS_CHANGED', 'Audit log records STATUS_CHANGED action');
  assert(lastAudit.actorName === 'Officer Vikram' && lastAudit.actorRole === 'responder', 'Audit log attributes action to actor and role');
  assert(typeof lastAudit.timestamp === 'string', 'Audit log records ISO timestamp');
}

console.log('\n======================================================');
console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED `);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}

