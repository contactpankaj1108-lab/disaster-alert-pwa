/**
 * server/auth.js
 * Cryptographic authentication and role-based access control (RBAC).
 * Generates and validates HMAC-SHA256 signed session tokens with timestamps.
 */

import crypto from 'node:crypto';
import { db } from './db.js';

// Secret key from environment variable or secure fallback
const SESSION_SECRET = process.env.SESSION_SECRET || 'resqalert-dev-session-secret-key-32chars!!';
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Creates an HMAC-SHA256 signature for a payload string
 */
function signPayload(payloadStr) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(payloadStr).digest('hex');
}

/**
 * Generates a signed token: base64(payload).signature
 */
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    exp: Date.now() + TOKEN_TTL_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a token and returns decoded payload if valid and not expired
 */
export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadB64, signature] = parts;
  const expectedSignature = signPayload(payloadB64);

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr);

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Express Middleware: Require valid authentication
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing or malformed Bearer token.'
    });
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      error: 'Invalid or expired session token. Please log in again.'
    });
  }

  // Attach verified user payload
  req.user = decoded;
  next();
}

/**
 * Express Middleware: Require specific role(s)
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
}
