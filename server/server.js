/**
 * server/server.js
 * Express REST API for ResQAlert Phase 1:
 * - Emergency SOS creation & user request tracking (with IDOR protection)
 * - Role-Based Authority Command Dashboard & Incident Management
 * - Offline Idempotent SOS Queue Sync
 * - Geotagged Community Hazard Reporting & Dispatcher Review Pipeline
 */

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, verifyPassword } from './db.js';
import { generateToken, requireAuth, requireRole } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing with 5MB limit for optional photo uploads in base64
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ---------------------------------------------------------------------------
// Security & Rate Limiting Guard
// ---------------------------------------------------------------------------
const requestWindowMap = new Map();

function rateLimiter(maxRequests = 40, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const entry = requestWindowMap.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + windowMs;
    } else {
      entry.count++;
    }

    requestWindowMap.set(ip, entry);

    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending more transmissions.'
      });
    }

    next();
  };
}

// Coordinate validation helper
function isValidCoordinate(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number' || isNaN(lat) || isNaN(lon)) return false;
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// XSS text sanitization helper
function sanitize(str = '') {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
}

// ---------------------------------------------------------------------------
// 1. Authentication Endpoints
// ---------------------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. User not found.' });
  }

  const isMatch = verifyPassword(password, user.passwordHash, user.salt);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
  }

  const token = generateToken(user);
  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.getUserById(req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  res.json({ success: true, user });
});

// ---------------------------------------------------------------------------
// 2. Feature 1 & 3: Citizen Emergency SOS & Offline Queue Endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/sos
 * Idempotent SOS incident registration endpoint.
 * Returns 201 Created or 200 OK (if duplicate retry).
 */
app.post('/api/sos', rateLimiter(25, 60000), (req, res) => {
  const body = req.body || {};

  // Validate coordinates
  const lat = Number(body.coordinates?.latitude);
  const lon = Number(body.coordinates?.longitude);

  if (!isValidCoordinate(lat, lon)) {
    return res.status(400).json({
      error: 'Valid geographic coordinates (latitude between -90 and 90, longitude between -180 and 180) are required.'
    });
  }

  // Validate category
  const validCategories = ['trapped', 'medical emergency', 'flood', 'fire', 'other'];
  const category = (body.category || 'other').toLowerCase();
  if (!validCategories.includes(category)) {
    return res.status(400).json({
      error: `Invalid emergency category. Must be one of: ${validCategories.join(', ')}`
    });
  }

  const affectedCount = Math.max(1, parseInt(body.affectedCount, 10) || 1);

  const payload = {
    id: body.id ? sanitize(body.id) : undefined,
    clientGeneratedId: sanitize(body.clientGeneratedId || body.id),
    userToken: sanitize(body.userToken || 'anon-client'),
    contactName: sanitize(body.contactName) || 'Anonymous Citizen',
    contactPhone: sanitize(body.contactPhone) || null,
    category,
    severity: body.severity || 'high',
    affectedCount,
    description: sanitize(body.description),
    coordinates: {
      latitude: lat,
      longitude: lon,
      accuracy: body.coordinates?.accuracy ? Number(body.coordinates.accuracy) : null
    },
    locationSource: sanitize(body.locationSource) || 'Browser Geolocation',
    locationCaptureTime: body.locationCaptureTime || new Date().toISOString()
  };

  const { incident, isDuplicate } = db.createIncident(payload);

  return res.status(isDuplicate ? 200 : 201).json({
    success: true,
    isDuplicate,
    message: isDuplicate ? 'Incident previously acknowledged by server.' : 'Emergency SOS successfully transmitted to dispatch.',
    incident
  });
});

/**
 * GET /api/sos/my-requests
 * Returns only the citizen's own SOS requests via their persistent client userToken.
 * Prevents IDOR and strictly avoids exposing other citizens' sensitive emergency requests.
 */
app.get('/api/sos/my-requests', (req, res) => {
  const userToken = req.query.token;
  if (!userToken) {
    return res.status(400).json({ error: 'Client identification token is required.' });
  }

  const incidents = db.getUserIncidents(sanitize(userToken));
  res.json({
    success: true,
    incidents
  });
});

// ---------------------------------------------------------------------------
// 3. Feature 2: Authority Command Dashboard Endpoints (Protected RBAC)
// ---------------------------------------------------------------------------

/**
 * GET /api/authority/incidents
 * Accessible by Dispatchers and Responders.
 * Filter by status, category, responderId, and search term.
 */
app.get('/api/authority/incidents', requireAuth, requireRole(['dispatcher', 'responder']), (req, res) => {
  const { status, category, search, assignedToMe } = req.query;

  const filters = {
    status,
    category,
    search
  };

  // If a responder requests only their own assigned incidents
  if (req.user.role === 'responder' && assignedToMe === 'true') {
    filters.responderId = req.user.userId;
  }

  const incidents = db.getAllIncidents(filters);
  res.json({
    success: true,
    total: incidents.length,
    incidents
  });
});

/**
 * GET /api/authority/incidents/:id
 * Retrieve specific incident details including complete audit history.
 */
app.get('/api/authority/incidents/:id', requireAuth, requireRole(['dispatcher', 'responder']), (req, res) => {
  const incident = db.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }
  res.json({ success: true, incident });
});

/**
 * PATCH /api/authority/incidents/:id/status
 * Update incident status (Received, Assigned, Responding, Resolved).
 */
app.patch('/api/authority/incidents/:id/status', requireAuth, requireRole(['dispatcher', 'responder']), (req, res) => {
  const { status, note } = req.body || {};
  const validStatuses = ['Received', 'Assigned', 'Responding', 'Resolved'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  // If user is responder, verify they are assigned to this incident or allow status update with audit
  const incident = db.getIncidentById(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  if (req.user.role === 'responder' && incident.assignedResponderId && incident.assignedResponderId !== req.user.userId) {
    return res.status(403).json({
      error: 'Responders can only update incidents assigned to them.'
    });
  }

  const updated = db.updateIncidentStatus(
    req.params.id,
    status,
    req.user.name,
    req.user.role,
    sanitize(note)
  );

  res.json({
    success: true,
    message: `Incident status updated to ${status}.`,
    incident: updated
  });
});

/**
 * PATCH /api/authority/incidents/:id/assign
 * Assign an incident to a designated responder (Dispatcher only).
 */
app.patch('/api/authority/incidents/:id/assign', requireAuth, requireRole(['dispatcher']), (req, res) => {
  const { responderId } = req.body || {};
  if (!responderId) {
    return res.status(400).json({ error: 'responderId is required for assignment.' });
  }

  const responder = db.getUserById(responderId);
  if (!responder || responder.role !== 'responder') {
    return res.status(400).json({ error: 'Valid responder user ID required.' });
  }

  const updated = db.assignIncident(
    req.params.id,
    responder.id,
    responder.name,
    req.user.name,
    req.user.role
  );

  if (!updated) {
    return res.status(404).json({ error: 'Incident not found.' });
  }

  res.json({
    success: true,
    message: `Incident assigned to ${responder.name}.`,
    incident: updated
  });
});

/**
 * GET /api/authority/responders
 * List active responders for assignment selection.
 */
app.get('/api/authority/responders', requireAuth, requireRole(['dispatcher']), (req, res) => {
  const responders = db.getResponders();
  res.json({ success: true, responders });
});

// ---------------------------------------------------------------------------
// 4. Feature 4: Community Geotagged Hazard Reporting Endpoints
// ---------------------------------------------------------------------------

/**
 * POST /api/hazards
 * Citizen hazard report submission. Default status: unverified.
 */
app.post('/api/hazards', rateLimiter(25, 60000), (req, res) => {
  const body = req.body || {};

  const lat = Number(body.coordinates?.latitude);
  const lon = Number(body.coordinates?.longitude);

  if (!isValidCoordinate(lat, lon)) {
    return res.status(400).json({
      error: 'Valid geographic coordinates are required for hazard report.'
    });
  }

  const validTypes = ['flooded_road', 'damaged_building', 'blocked_road', 'fallen_tree', 'fire', 'other'];
  const hazardType = (body.hazardType || 'other').toLowerCase();
  if (!validTypes.includes(hazardType)) {
    return res.status(400).json({
      error: `Invalid hazard type. Must be one of: ${validTypes.join(', ')}`
    });
  }

  // Validate optional photo upload
  let safePhotoUrl = null;
  if (body.photoUrl) {
    if (typeof body.photoUrl === 'string' && body.photoUrl.startsWith('data:image/')) {
      // Validate photo size (approx ~2MB base64 is ~2.8MB characters)
      if (body.photoUrl.length > 3 * 1024 * 1024) {
        return res.status(400).json({ error: 'Attached photo exceeds 2MB limit.' });
      }
      safePhotoUrl = body.photoUrl;
    }
  }

  const payload = {
    id: body.id ? sanitize(body.id) : undefined,
    clientGeneratedId: sanitize(body.clientGeneratedId || body.id),
    userToken: sanitize(body.userToken || 'anon-client'),
    hazardType,
    title: sanitize(body.title) || `${hazardType.replace('_', ' ').toUpperCase()} Reported`,
    description: sanitize(body.description),
    coordinates: {
      latitude: lat,
      longitude: lon,
      accuracy: body.coordinates?.accuracy ? Number(body.coordinates.accuracy) : null
    },
    locationSource: sanitize(body.locationSource) || 'Browser Geolocation',
    locationCaptureTime: body.locationCaptureTime || new Date().toISOString(),
    photoUrl: safePhotoUrl
  };

  const { hazard, isDuplicate } = db.createHazard(payload);

  return res.status(isDuplicate ? 200 : 201).json({
    success: true,
    isDuplicate,
    message: isDuplicate
      ? 'Hazard report previously recorded.'
      : 'Hazard report submitted for verification. It will appear on the map once verified by dispatchers.',
    hazard
  });
});

/**
 * GET /api/hazards/verified
 * Public endpoint returning ONLY verified hazards for display on the interactive map.
 * Strips submitter privacy details.
 */
app.get('/api/hazards/verified', (req, res) => {
  const verified = db.getAllHazards(true);
  const safeHazards = verified.map((h) => ({
    id: h.id,
    hazardType: h.hazardType,
    title: h.title,
    description: h.description,
    coordinates: h.coordinates,
    locationSource: h.locationSource,
    locationCaptureTime: h.locationCaptureTime,
    photoUrl: h.photoUrl,
    status: h.status,
    verifiedBy: h.verifiedBy,
    verifiedAt: h.verifiedAt,
    updatedAt: h.updatedAt
  }));

  res.json({
    success: true,
    hazards: safeHazards
  });
});

/**
 * GET /api/authority/hazards
 * Authority view of all hazard reports including unverified and rejected.
 */
app.get('/api/authority/hazards', requireAuth, requireRole(['dispatcher', 'responder']), (req, res) => {
  const hazards = db.getAllHazards(false);
  res.json({ success: true, hazards });
});

/**
 * PATCH /api/authority/hazards/:id/status
 * Verify, reject, or resolve hazard reports (Dispatcher only).
 */
app.patch('/api/authority/hazards/:id/status', requireAuth, requireRole(['dispatcher']), (req, res) => {
  const { status, note } = req.body || {};
  const validStatuses = ['verified', 'rejected', 'resolved'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const updated = db.updateHazardStatus(
    req.params.id,
    status,
    req.user.name,
    req.user.role,
    sanitize(note)
  );

  if (!updated) {
    return res.status(404).json({ error: 'Hazard report not found.' });
  }

  res.json({
    success: true,
    message: `Hazard report status updated to ${status}.`,
    hazard: updated
  });
});

// Root API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'ResQAlert Emergency API',
    mode: 'Active'
  });
});

// Serve frontend in production when running standalone server.js
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  });

  app.listen(PORT, () => {
    console.log(`[ResQAlert Server] Listening on http://localhost:${PORT}`);
    console.log(`[ResQAlert Server] Demo Dispatcher: dispatcher@resqalert.org (DispatchPass123!)`);
    console.log(`[ResQAlert Server] Demo Responder: responder@resqalert.org (ResponderPass123!)`);
  });
}

export default app;
