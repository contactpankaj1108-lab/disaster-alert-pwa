import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  AlertTriangle, 
  Compass, 
  Send, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon 
} from 'lucide-react';
import { submitHazardReport } from '../services/hazardService';
import { getCurrentBrowserLocation } from '../services/locationService';
import { validateCoordinates, sanitizeText } from '../utils/validators';

const HAZARD_TYPES = [
  { id: 'flooded_road', label: 'Flooded Road / Waterlogging', icon: '🌊', color: '#2563eb' },
  { id: 'damaged_building', label: 'Damaged Building / Debris', icon: '🏚️', color: '#dc2626' },
  { id: 'blocked_road', label: 'Blocked Road / Landslide', icon: '🚧', color: '#d97706' },
  { id: 'fallen_tree', label: 'Fallen Tree / Powerline', icon: '🪵', color: '#16a34a' },
  { id: 'fire', label: 'Active Fire / Smoke Risk', icon: '🔥', color: '#ea580c' },
  { id: 'other', label: 'Other Dangerous Obstacle', icon: '⚠️', color: '#475569' }
];

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function HazardReportModal({
  isOpen,
  onClose,
  initialLocation,
  isOnline = true,
  onHazardReported
}) {
  const [hazardType, setHazardType] = useState('flooded_road');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Coordinates
  const [coordinates, setCoordinates] = useState({
    latitude: initialLocation?.latitude || 30.7333,
    longitude: initialLocation?.longitude || 76.7794,
    accuracy: initialLocation?.accuracy || null
  });
  const [locationSource, setLocationSource] = useState(initialLocation?.source || 'Browser Geolocation');
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState(String(initialLocation?.latitude || '30.7333'));
  const [manualLon, setManualLon] = useState(String(initialLocation?.longitude || '76.7794'));
  const [coordError, setCoordError] = useState(null);

  // Photo Upload State
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoError, setPhotoError] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isOpen && initialLocation) {
      setCoordinates({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
        accuracy: initialLocation.accuracy || null
      });
      setManualLat(String(initialLocation.latitude));
      setManualLon(String(initialLocation.longitude));
      setLocationSource(initialLocation.source || 'Browser Geolocation');
      setSubmitResult(null);
      setSubmitError(null);
      setPhotoError(null);
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  // Handle Photo Selection with Strict File Validation
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    setPhotoError(null);
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setPhotoError('Invalid image format. Only JPEG, PNG, and WebP are supported.');
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setPhotoError(`Photo size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 2 MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      setPhotoDataUrl(loadEvt.target.result);
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureGps = async () => {
    setIsCapturingGps(true);
    setCoordError(null);
    const result = await getCurrentBrowserLocation();
    if (result.success && result.location) {
      setCoordinates({
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        accuracy: result.location.accuracy
      });
      setManualLat(String(result.location.latitude));
      setManualLon(String(result.location.longitude));
      setLocationSource('Browser GPS (High Accuracy)');
      setManualMode(false);
    } else {
      setCoordError(result.error || 'GPS unavailable. Please enter coordinates manually.');
      setManualMode(true);
    }
    setIsCapturingGps(false);
  };

  const handleApplyManualCoords = () => {
    const val = validateCoordinates(manualLat, manualLon);
    if (!val.isValid) {
      setCoordError(val.error);
      return;
    }
    setCoordinates({
      latitude: val.latitude,
      longitude: val.longitude,
      accuracy: null
    });
    setLocationSource('Manual Coordinate Entry');
    setCoordError(null);
    setManualMode(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const val = validateCoordinates(coordinates.latitude, coordinates.longitude);
    if (!val.isValid) {
      setCoordError(val.error);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      hazardType,
      title: sanitizeText(title, 100) || `${hazardType.replace('_', ' ').toUpperCase()} Reported`,
      description: sanitizeText(description, 500),
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy
      },
      locationSource,
      photoUrl: photoDataUrl
    };

    try {
      const res = await submitHazardReport(payload, isOnline);
      setSubmitResult(res);
      if (onHazardReported) onHazardReported(res);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit hazard report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#475569'
          }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div 
            style={{ 
              background: '#d97706', 
              color: '#ffffff', 
              width: '40px', 
              height: '40px', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center'
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Report Local Hazard
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
              Geotagged community incident reporting for road & environmental hazards
            </p>
          </div>
        </div>

        {submitResult ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div 
              style={{ 
                width: '54px', 
                height: '54px', 
                borderRadius: '50%', 
                background: submitResult.isQueuedOffline ? '#fef3c7' : '#dcfce7', 
                color: submitResult.isQueuedOffline ? '#d97706' : '#16a34a', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 1rem'
              }}
            >
              {submitResult.isQueuedOffline ? <Clock size={30} /> : <CheckCircle2 size={30} />}
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>
              {submitResult.isQueuedOffline ? 'Report Saved to Offline Queue' : 'Report Submitted for Review'}
            </h3>

            <p style={{ fontSize: '0.82rem', color: '#475569', maxWidth: '420px', margin: '0 auto 1rem' }}>
              {submitResult.message}
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', margin: '0 auto 1.25rem', maxWidth: '380px', fontSize: '0.8rem' }}>
              <div><strong>Report ID:</strong> <code>{submitResult.hazard?.id || submitResult.hazard?.clientGeneratedId}</code></div>
              <div><strong>Initial Status:</strong> <span style={{ fontWeight: '700', color: '#b45309' }}>Unverified</span></div>
              <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#64748b' }}>
                * All community reports undergo verification by emergency dispatchers before being plotted on the public emergency map.
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.5rem',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            
            {/* Hazard Category Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.35rem' }}>
                Hazard Category *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.45rem' }}>
                {HAZARD_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setHazardType(type.id)}
                    style={{
                      background: hazardType === type.id ? '#fef3c7' : '#f8fafc',
                      border: hazardType === type.id ? '2px solid #d97706' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.5rem 0.4rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.2rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{type.icon}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: hazardType === type.id ? '700' : '500', color: '#0f172a' }}>
                      {type.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Landmark */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                Short Location / Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kharar Highway Underpass Flooded"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                Detailed Observation *
              </label>
              <textarea
                rows="2"
                required
                placeholder="Describe water depth, traffic blockage, live powerlines, or alternative route advice..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.85rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Geolocation Section */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '700', color: '#0f172a' }}>
                  <MapPin size={15} color="#d97706" /> Hazard Coordinates
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Source: {locationSource}
                </span>
              </div>

              {!manualMode ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                    {coordinates.latitude.toFixed(5)}°, {coordinates.longitude.toFixed(5)}°
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={handleCaptureGps}
                      disabled={isCapturingGps}
                      style={{
                        background: '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        color: '#0369a1',
                        borderRadius: '4px',
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}
                    >
                      <Compass size={12} style={{ animation: isCapturingGps ? 'spin 1s linear infinite' : 'none' }} /> GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        borderRadius: '4px',
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={manualLon}
                      onChange={(e) => setManualLon(e.target.value)}
                      style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => setManualMode(false)}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyManualCoords}
                      style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.25rem 0.55rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {coordError && (
                <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: '600' }}>
                  ⚠️ {coordError}
                </div>
              )}
            </div>

            {/* Optional Photo Attachment */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                <Camera size={14} color="#0284c7" /> Optional Evidence Photo (Max 2 MB, JPEG/PNG/WebP)
              </label>
              
              {!photoDataUrl ? (
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoSelect}
                    style={{ fontSize: '0.8rem', width: '100%' }}
                  />
                  {photoError && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: '#dc2626' }}>
                      ⚠️ {photoError}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  <img
                    src={photoDataUrl}
                    alt="Hazard Preview"
                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                  <div style={{ flex: 1, fontSize: '0.78rem', color: '#15803d', fontWeight: '600' }}>
                    ✓ Photo attached
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoDataUrl(null)}
                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                ⚠️ {submitError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.55rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  background: '#d97706',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.35rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 3px 10px rgba(217, 119, 6, 0.3)'
                }}
              >
                <Send size={15} />
                {isSubmitting ? 'Submitting Report...' : 'Submit Hazard Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
