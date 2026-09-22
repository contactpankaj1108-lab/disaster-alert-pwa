/**
 * validators.js
 * Input sanitization and coordinate validation utilities.
 * Protects Leaflet map canvas and mathematical algorithms from invalid/corrupt data.
 */

export function validateCoordinates(lat, lon) {
  const parsedLat = parseFloat(lat);
  const parsedLon = parseFloat(lon);

  if (isNaN(parsedLat) || isNaN(parsedLon)) {
    return {
      isValid: false,
      error: 'Coordinates must be valid decimal numbers.'
    };
  }

  if (parsedLat < -90 || parsedLat > 90) {
    return {
      isValid: false,
      error: 'Latitude must be between -90.0° and +90.0°.'
    };
  }

  if (parsedLon < -180 || parsedLon > 180) {
    return {
      isValid: false,
      error: 'Longitude must be between -180.0° and +180.0°.'
    };
  }

  return {
    isValid: true,
    latitude: parsedLat,
    longitude: parsedLon,
    error: null
  };
}

export function sanitizeText(input, maxLength = 100) {
  if (!input || typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').slice(0, maxLength);
}
