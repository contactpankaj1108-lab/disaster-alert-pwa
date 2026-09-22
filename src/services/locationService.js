/**
 * locationService.js
 * 100% Software-based location provider using the browser's native Geolocation API.
 * Adheres to privacy standards: coordinates are kept client-side and never logged to external analytics.
 */

export const DEFAULT_LOCATION = {
  city: 'Chandigarh, India',
  latitude: 30.7333,
  longitude: 76.7794,
  accuracy: null,
  source: 'Default Pre-configured'
};

export const FALLBACK_CITIES = [
  { name: 'Chandigarh, India', latitude: 30.7333, longitude: 76.7794 },
  { name: 'New Delhi, India', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Mumbai, India', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Kolkata, India', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Bengaluru, India', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Chennai, India', latitude: 13.0827, longitude: 80.2707 },
  { name: 'London, UK', latitude: 51.5074, longitude: -0.1278 },
  { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'San Francisco, USA', latitude: 37.7749, longitude: -122.4194 }
];

/**
 * Check current Permission status via the Permissions API
 */
export async function getGeolocationPermissionState() {
  if (!navigator.permissions || !navigator.permissions.query) {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted' | 'denied' | 'prompt'
  } catch {
    return 'prompt';
  }
}

/**
 * Request device location via browser Geolocation API
 */
export function getCurrentBrowserLocation() {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({
        success: false,
        error: 'Geolocation is not supported by your browser.',
        permissionState: 'denied',
        location: DEFAULT_LOCATION
      });
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,      // 10 second timeout
      maximumAge: 60000    // Accept cached position within 60 seconds
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        // Attempt lightweight reverse geocoding to resolve a city name
        let cityName = `Lat: ${latitude.toFixed(3)}°, Lon: ${longitude.toFixed(3)}°`;
        
        try {
          if (navigator.onLine) {
            // Free, public BigDataCloud client-side reverse-geocode (no API key needed)
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
              { signal: AbortSignal.timeout(3000) }
            );
            if (res.ok) {
              const data = await res.json();
              const place = data.locality || data.city || data.principalSubdivision || '';
              const country = data.countryName || '';
              if (place) {
                cityName = country ? `${place}, ${country}` : place;
              }
            }
          }
        } catch {
          // If network reverse geocode fails or is offline, keep formatted coordinates
        }

        resolve({
          success: true,
          permissionState: 'granted',
          location: {
            city: cityName,
            latitude,
            longitude,
            accuracy: Math.round(accuracy),
            source: 'Browser GPS / Network'
          }
        });
      },
      (error) => {
        let msg = 'Unknown geolocation error.';
        let perm = 'prompt';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Switched to fallback location.';
            perm = 'denied';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location signal unavailable. Switched to fallback location.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Switched to fallback location.';
            break;
        }

        resolve({
          success: false,
          error: msg,
          permissionState: perm,
          location: {
            ...DEFAULT_LOCATION,
            source: 'Fallback (Permission Denied/Unavailable)'
          }
        });
      },
      options
    );
  });
}
