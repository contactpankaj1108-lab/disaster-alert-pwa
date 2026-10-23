/**
 * server/db.js
 * Persistent file-backed database with atomic writes and thread-safe operations.
 * Manages users, emergency SOS incidents, hazard reports, and audit trails.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Hash password with PBKDF2 / scryptSync
 */
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

/**
 * Verify password with timingSafeEqual
 */
export function verifyPassword(password, hash, salt) {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const compBuf = Buffer.from(computedHash, 'hex');
    if (hashBuf.length !== compBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, compBuf);
  } catch {
    return false;
  }
}

// Default initial database state with demonstration accounts
function getDefaultData() {
  const dispatcherAuth = hashPassword('DispatchPass123!');
  const responderAuth = hashPassword('ResponderPass123!');

  return {
    users: [
      {
        id: 'usr-dispatcher-01',
        email: 'dispatcher@resqalert.org',
        name: 'Chief Dispatcher Rao',
        role: 'dispatcher',
        passwordHash: dispatcherAuth.hash,
        salt: dispatcherAuth.salt,
        createdAt: new Date('2026-09-01T08:00:00Z').toISOString()
      },
      {
        id: 'usr-responder-01',
        email: 'responder@resqalert.org',
        name: 'Officer Vikram (Quick Response Unit 1)',
        role: 'responder',
        passwordHash: responderAuth.hash,
        salt: responderAuth.salt,
        createdAt: new Date('2026-09-01T08:00:00Z').toISOString()
      }
    ],
    incidents: [
      {
        id: 'SOS-2026-DEMO-01',
        clientGeneratedId: 'client-sos-seed-01',
        userToken: 'token-demo-citizen-01',
        contactName: 'Aarav Sharma',
        contactPhone: '+91 98765 43210',
        category: 'flood',
        severity: 'high',
        affectedCount: 3,
        description: 'Rising water in basement, family stuck on ground floor. Power lines submerged.',
        coordinates: {
          latitude: 30.7499,
          longitude: 76.6411,
          accuracy: 12
        },
        locationSource: 'Browser GPS (High Accuracy)',
        locationCaptureTime: new Date(Date.now() - 3600000).toISOString(),
        status: 'Assigned', // Received, Assigned, Responding, Resolved
        assignedResponderId: 'usr-responder-01',
        assignedResponderName: 'Officer Vikram (Quick Response Unit 1)',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 1800000).toISOString(),
        auditHistory: [
          {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'SOS_RECEIVED',
            actorName: 'Aarav Sharma',
            actorRole: 'citizen',
            details: 'Emergency SOS incident registered by citizen'
          },
          {
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            action: 'STATUS_UPDATED',
            actorName: 'Chief Dispatcher Rao',
            actorRole: 'dispatcher',
            details: 'Assigned to Officer Vikram (Quick Response Unit 1). Status changed to Assigned.'
          }
        ]
      }
    ],
    hazards: [
      {
        id: 'HAZ-2026-DEMO-01',
        clientGeneratedId: 'client-haz-seed-01',
        userToken: 'token-demo-citizen-02',
        hazardType: 'flooded_road',
        title: 'Severe Waterlogging at Kharar Flyover Underpass',
        description: 'Underpass flooded with ~3.5 feet of water. Vehicles stalled. Traffic diverted.',
        coordinates: {
          latitude: 30.7420,
          longitude: 76.6495,
          accuracy: 15
        },
        locationSource: 'Browser GPS',
        locationCaptureTime: new Date(Date.now() - 7200000).toISOString(),
        photoUrl: null,
        status: 'verified', // 'unverified', 'verified', 'rejected', 'resolved'
        verifiedBy: 'Chief Dispatcher Rao',
        verifiedAt: new Date(Date.now() - 5400000).toISOString(),
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 5400000).toISOString(),
        auditHistory: [
          {
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            action: 'REPORT_SUBMITTED',
            actorName: 'Anonymous Citizen',
            actorRole: 'citizen',
            details: 'Hazard report submitted with status Unverified'
          },
          {
            timestamp: new Date(Date.now() - 5400000).toISOString(),
            action: 'REPORT_VERIFIED',
            actorName: 'Chief Dispatcher Rao',
            actorRole: 'dispatcher',
            details: 'Verified by local municipal traffic feed'
          }
        ]
      }
    ]
  };
}

/**
 * Thread-safe read of database file
 */
export function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getDefaultData();
      writeDb(initial);
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[DB Read Error]:', err);
    return getDefaultData();
  }
}

/**
 * Atomic write to database file using temp file replacement
 */
export function writeDb(data) {
  const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DB_FILE);
    return true;
  } catch (err) {
    console.error('[DB Write Error]:', err);
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {}
    return false;
  }
}

// ---------------------------------------------------------------------------
// Database API Methods
// ---------------------------------------------------------------------------

export const db = {
  // Users
  getUserByEmail(email) {
    const data = readDb();
    return data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  getUserById(id) {
    const data = readDb();
    const user = data.users.find((u) => u.id === id);
    if (!user) return null;
    const { passwordHash, salt, ...safeUser } = user;
    return safeUser;
  },

  getResponders() {
    const data = readDb();
    return data.users
      .filter((u) => u.role === 'responder')
      .map(({ passwordHash, salt, ...safeUser }) => safeUser);
  },

  // Incidents
  getAllIncidents(filters = {}) {
    const data = readDb();
    let incidents = [...data.incidents];

    if (filters.status && filters.status !== 'all') {
      incidents = incidents.filter((inc) => inc.status.toLowerCase() === filters.status.toLowerCase());
    }

    if (filters.category && filters.category !== 'all') {
      incidents = incidents.filter((inc) => inc.category.toLowerCase() === filters.category.toLowerCase());
    }

    if (filters.responderId) {
      incidents = incidents.filter((inc) => inc.assignedResponderId === filters.responderId);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase();
      incidents = incidents.filter((inc) =>
        inc.id.toLowerCase().includes(term) ||
        (inc.contactName && inc.contactName.toLowerCase().includes(term)) ||
        (inc.description && inc.description.toLowerCase().includes(term)) ||
        (inc.category && inc.category.toLowerCase().includes(term))
      );
    }

    // Sort by createdAt descending (newest first)
    incidents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return incidents;
  },

  getIncidentById(id) {
    const data = readDb();
    return data.incidents.find((inc) => inc.id === id) || null;
  },

  getIncidentByClientId(clientGeneratedId) {
    const data = readDb();
    return data.incidents.find((inc) => inc.clientGeneratedId === clientGeneratedId) || null;
  },

  getUserIncidents(userToken) {
    if (!userToken) return [];
    const data = readDb();
    return data.incidents
      .filter((inc) => inc.userToken === userToken)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  createIncident(incidentPayload) {
    const data = readDb();

    // Check idempotency via clientGeneratedId
    if (incidentPayload.clientGeneratedId) {
      const existing = data.incidents.find((inc) => inc.clientGeneratedId === incidentPayload.clientGeneratedId);
      if (existing) {
        return { incident: existing, isDuplicate: true };
      }
    }

    const nowIso = new Date().toISOString();
    const incidentId = incidentPayload.id || `SOS-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newIncident = {
      id: incidentId,
      clientGeneratedId: incidentPayload.clientGeneratedId || incidentId,
      userToken: incidentPayload.userToken || 'anonymous-token',
      contactName: incidentPayload.contactName || 'Anonymous',
      contactPhone: incidentPayload.contactPhone || null,
      category: incidentPayload.category || 'other',
      severity: incidentPayload.severity || 'high',
      affectedCount: Number(incidentPayload.affectedCount) || 1,
      description: incidentPayload.description || '',
      coordinates: {
        latitude: Number(incidentPayload.coordinates?.latitude),
        longitude: Number(incidentPayload.coordinates?.longitude),
        accuracy: incidentPayload.coordinates?.accuracy ? Number(incidentPayload.coordinates.accuracy) : null
      },
      locationSource: incidentPayload.locationSource || 'Browser Geolocation',
      locationCaptureTime: incidentPayload.locationCaptureTime || nowIso,
      status: 'Received', // Initial server status
      assignedResponderId: null,
      assignedResponderName: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      auditHistory: [
        {
          timestamp: nowIso,
          action: 'SOS_RECEIVED',
          actorName: incidentPayload.contactName || 'Citizen',
          actorRole: 'citizen',
          details: `Incident received by server. Category: ${incidentPayload.category}, People affected: ${incidentPayload.affectedCount}`
        }
      ]
    };

    data.incidents.push(newIncident);
    writeDb(data);
    return { incident: newIncident, isDuplicate: false };
  },

  updateIncidentStatus(id, newStatus, actorName, actorRole, note = '') {
    const data = readDb();
    const idx = data.incidents.findIndex((inc) => inc.id === id);
    if (idx === -1) return null;

    const incident = data.incidents[idx];
    const oldStatus = incident.status;
    const nowIso = new Date().toISOString();

    incident.status = newStatus;
    incident.updatedAt = nowIso;
    incident.auditHistory.push({
      timestamp: nowIso,
      action: 'STATUS_CHANGED',
      actorName: actorName || 'Authorized User',
      actorRole: actorRole || 'system',
      details: `Status transitioned from ${oldStatus} to ${newStatus}.${note ? ` Note: ${note}` : ''}`
    });

    data.incidents[idx] = incident;
    writeDb(data);
    return incident;
  },

  assignIncident(id, responderId, responderName, actorName, actorRole) {
    const data = readDb();
    const idx = data.incidents.findIndex((inc) => inc.id === id);
    if (idx === -1) return null;

    const incident = data.incidents[idx];
    const nowIso = new Date().toISOString();

    incident.assignedResponderId = responderId;
    incident.assignedResponderName = responderName;
    if (incident.status === 'Received') {
      incident.status = 'Assigned';
    }
    incident.updatedAt = nowIso;
    incident.auditHistory.push({
      timestamp: nowIso,
      action: 'ASSIGNED_RESPONDER',
      actorName: actorName || 'Dispatcher',
      actorRole: actorRole || 'dispatcher',
      details: `Incident assigned to ${responderName} (${responderId}). Status: ${incident.status}`
    });

    data.incidents[idx] = incident;
    writeDb(data);
    return incident;
  },

  // Hazards
  getAllHazards(onlyVerified = false) {
    const data = readDb();
    let hazards = [...data.hazards];
    if (onlyVerified) {
      hazards = hazards.filter((h) => h.status === 'verified');
    }
    hazards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return hazards;
  },

  getHazardById(id) {
    const data = readDb();
    return data.hazards.find((h) => h.id === id) || null;
  },

  createHazard(payload) {
    const data = readDb();

    // Check idempotency
    if (payload.clientGeneratedId) {
      const existing = data.hazards.find((h) => h.clientGeneratedId === payload.clientGeneratedId);
      if (existing) {
        return { hazard: existing, isDuplicate: true };
      }
    }

    const nowIso = new Date().toISOString();
    const hazardId = payload.id || `HAZ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const newHazard = {
      id: hazardId,
      clientGeneratedId: payload.clientGeneratedId || hazardId,
      userToken: payload.userToken || 'anonymous-token',
      hazardType: payload.hazardType || 'other',
      title: payload.title || 'Community Hazard Report',
      description: payload.description || '',
      coordinates: {
        latitude: Number(payload.coordinates?.latitude),
        longitude: Number(payload.coordinates?.longitude),
        accuracy: payload.coordinates?.accuracy ? Number(payload.coordinates.accuracy) : null
      },
      locationSource: payload.locationSource || 'Browser Geolocation',
      locationCaptureTime: payload.locationCaptureTime || nowIso,
      photoUrl: payload.photoUrl || null,
      status: 'unverified', // Default status: unverified
      verifiedBy: null,
      verifiedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
      auditHistory: [
        {
          timestamp: nowIso,
          action: 'REPORT_SUBMITTED',
          actorName: 'Community Contributor',
          actorRole: 'citizen',
          details: `Hazard report submitted for ${payload.hazardType}. Initial status: unverified.`
        }
      ]
    };

    data.hazards.push(newHazard);
    writeDb(data);
    return { hazard: newHazard, isDuplicate: false };
  },

  updateHazardStatus(id, newStatus, actorName, actorRole, note = '') {
    const data = readDb();
    const idx = data.hazards.findIndex((h) => h.id === id);
    if (idx === -1) return null;

    const hazard = data.hazards[idx];
    const oldStatus = hazard.status;
    const nowIso = new Date().toISOString();

    hazard.status = newStatus;
    hazard.updatedAt = nowIso;
    if (newStatus === 'verified') {
      hazard.verifiedBy = actorName;
      hazard.verifiedAt = nowIso;
    }

    hazard.auditHistory.push({
      timestamp: nowIso,
      action: 'HAZARD_STATUS_UPDATED',
      actorName: actorName || 'Authorized Reviewer',
      actorRole: actorRole || 'dispatcher',
      details: `Hazard status transitioned from ${oldStatus} to ${newStatus}.${note ? ` Note: ${note}` : ''}`
    });

    data.hazards[idx] = hazard;
    writeDb(data);
    return hazard;
  }
};
