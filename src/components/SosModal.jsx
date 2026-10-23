import React, { useState, useEffect } from 'react';
import { 
  AlertOctagon, 
  MapPin, 
  Users, 
  FileText, 
  Phone, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  X,
  Compass,
  Radio,
  Send
} from 'lucide-react';
import { submitSosRequest } from '../services/sosService';
import { getCurrentBrowserLocation } from '../services/locationService';
import { validateCoordinates, sanitizeText } from '../utils/validators';

const CATEGORIES = [
  { id: 'trapped', label: 'Trapped / Structural Collapse', icon: '🏚️', color: '#dc2626' },
  { id: 'medical emergency', label: 'Medical Emergency', icon: '🚑', color: '#ea580c' },
  { id: 'flood', label: 'Flash Flood / Rising Water', icon: '🌊', color: '#2563eb' },
  { id: 'fire', label: 'Active Fire / Smoke Inhalation', icon: '🔥', color: '#d97706' },
  { id: 'other', label: 'Other Life-Threatening Crisis', icon: '⚠️', color: '#475569' }
];

export default function SosModal({
  isOpen,
  onClose,
  initialLocation,
  isOnline = true,
  onSosSubmitted
}) {
  // Steps: 'form' -> 'confirm' -> 'result'
  const [step, setStep] = useState('form');

  // Form Fields
  const [contactName, setContactName] = useState(() => localStorage.getItem('resqalert_contact_name') || '');
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem('resqalert_contact_phone') || '');
  const [category, setCategory] = useState('trapped');
  const [affectedCount, setAffectedCount] = useState(1);
  const [description, setDescription] = useState('');

  // Location State
  const [coordinates, setCoordinates] = useState({
    latitude: initialLocation?.latitude || 30.7333,
    longitude: initialLocation?.longitude || 76.7794,
    accuracy: initialLocation?.accuracy || null
  });
  const [locationSource, setLocationSource] = useState(initialLocation?.source || 'Browser Geolocation');
  const [locationCaptureTime, setLocationCaptureTime] = useState(new Date().toLocaleTimeString());
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualLat, setManualLat] = useState(String(initialLocation?.latitude || '30.7333'));
  const [manualLon, setManualLon] = useState(String(initialLocation?.longitude || '76.7794'));
  const [coordError, setCoordError] = useState(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Sync initial location when opened
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
      setLocationCaptureTime(new Date().toLocaleTimeString());
      setStep('form');
      setSubmitError(null);
      setSubmissionResult(null);
    }
  }, [isOpen, initialLocation]);

  if (!isOpen) return null;

  // Trigger high-accuracy browser geolocation capture with consent
  const handleCapturePreciseGps = async () => {
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
      setLocationSource('Browser GPS (High Accuracy Triangulated)');
      setLocationCaptureTime(new Date().toLocaleTimeString());
      setManualMode(false);
    } else {
      setCoordError(result.error || 'Could not acquire GPS fix. Please enter coordinates manually.');
      setManualMode(true);
      setLocationSource('Manual Entry Required');
    }
    setIsCapturingGps(false);
  };

  // Handle manual coordinate changes with bounds checking
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
    setLocationCaptureTime(new Date().toLocaleTimeString());
    setCoordError(null);
    setManualMode(false);
  };

  // Proceed to Step 2: Final Confirmation
  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    setCoordError(null);

    // Validate coordinates
    const val = validateCoordinates(coordinates.latitude, coordinates.longitude);
    if (!val.isValid) {
      setCoordError(val.error);
      return;
    }

    // Persist contact details for user convenience
    if (contactName) localStorage.setItem('resqalert_contact_name', contactName);
    if (contactPhone) localStorage.setItem('resqalert_contact_phone', contactPhone);

    setStep('confirm');
  };

  // Step 2 Submission to Backend / Offline Queue
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const sosPayload = {
      contactName: sanitizeText(contactName, 80) || 'Anonymous Citizen',
      contactPhone: sanitizeText(contactPhone, 30) || null,
      category,
      affectedCount: Math.max(1, parseInt(affectedCount, 10) || 1),
      description: sanitizeText(description, 500),
      coordinates: {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        accuracy: coordinates.accuracy
      },
      locationSource,
      locationCaptureTime: new Date().toISOString()
    };

    try {
      const result = await submitSosRequest(sosPayload, isOnline);
      setSubmissionResult(result);
      setStep('result');
      if (onSosSubmitted) onSosSubmitted(result);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit SOS request.');
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
          boxShadow: '0 25px 50px -12px rgba(220, 38, 38, 0.35)',
          border: '2px solid #dc2626',
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
          aria-label="Close SOS Dialog"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div 
            style={{ 
              background: '#dc2626', 
              color: '#ffffff', 
              width: '42px', 
              height: '42px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)'
            }}
          >
            <AlertOctagon size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#991b1b', margin: 0 }}>
              EMERGENCY SOS BROADCAST
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
              Life Safety & Search/Rescue Transmission Form
            </p>
          </div>
        </div>

        {/* STEP 1: FORM INPUTS */}
        {step === 'form' && (
          <form onSubmit={handleProceedToConfirmation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            {/* Category Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', marginBottom: '0.4rem' }}>
                1. Select Emergency Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    style={{
                      background: category === cat.id ? '#fee2e2' : '#f8fafc',
                      border: category === cat.id ? `2px solid #dc2626` : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.6rem 0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                    <span style={{ fontSize: '0.78rem', fontWeight: category === cat.id ? '700' : '500', color: '#0f172a' }}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Affected People & Contact info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  <Users size={14} color="#dc2626" /> Number of People Affected *
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={affectedCount}
                  onChange={(e) => setAffectedCount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                  <User size={14} color="#2563eb" /> Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                <Phone size={14} color="#16a34a" /> Contact Phone / Callback Number
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '0.25rem' }}>
                <FileText size={14} color="#475569" /> Situation Description & Hazards
              </label>
              <textarea
                rows="2"
                placeholder="Describe your immediate danger, floor level, landmarks, injuries, or hazards..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.88rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Location Consent & Coordinates Display */}
            <div 
              style={{ 
                background: '#f8fafc', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                padding: '0.75rem' 
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>
                  <MapPin size={15} color="#dc2626" /> Geolocation Dispatch Coordinates
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Captured: {locationCaptureTime}
                </span>
              </div>

              {!manualMode ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a' }}>
                      {coordinates.latitude.toFixed(5)}°, {coordinates.longitude.toFixed(5)}°
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Source: <strong style={{ color: '#0284c7' }}>{locationSource}</strong> 
                      {coordinates.accuracy && ` (±${coordinates.accuracy}m)`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleCapturePreciseGps}
                      disabled={isCapturingGps}
                      style={{
                        background: '#e0f2fe',
                        border: '1px solid #7dd3fc',
                        color: '#0369a1',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Compass size={13} style={{ animation: isCapturingGps ? 'spin 1s linear infinite' : 'none' }} />
                      {isCapturingGps ? 'Querying GPS...' : 'Refresh GPS'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setManualMode(true)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        borderRadius: '6px',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Edit Coordinates
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Latitude (-90 to +90)</label>
                      <input
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Longitude (-180 to +180)</label>
                      <input
                        type="number"
                        step="any"
                        value={manualLon}
                        onChange={(e) => setManualLon(e.target.value)}
                        style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={() => setManualMode(false)}
                      style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyManualCoords}
                      style={{ background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Apply Coordinates
                    </button>
                  </div>
                </div>
              )}

              {coordError && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#dc2626', fontWeight: '600' }}>
                  ⚠️ {coordError}
                </div>
              )}
            </div>

            {/* Offline Transmission Notice */}
            {!isOnline && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '0.6rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Radio size={16} color="#d97706" />
                <div style={{ fontSize: '0.78rem', color: '#92400e' }}>
                  <strong>Device Currently Offline:</strong> Your SOS will be queued locally in high-priority IndexedDB and automatically transmitted to dispatch the instant connectivity is restored.
                </div>
              </div>
            )}

            {/* Next Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                Review & Confirm Broadcast
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: CRITICAL FINAL CONFIRMATION */}
        {step === 'confirm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#991b1b', fontWeight: '800', marginBottom: '0.25rem' }}>
                <AlertTriangle size={20} />
                CONFIRM EMERGENCY SOS TRANSMISSION
              </div>
              <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>
                You are about to transmit a high-priority distress call. Emergency dispatchers will be notified with your exact coordinates and affected person count.
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div><strong>Category:</strong> <span style={{ textTransform: 'capitalize' }}>{category}</span></div>
              <div><strong>People Affected:</strong> {affectedCount} individual(s)</div>
              <div><strong>Coordinates:</strong> {coordinates.latitude.toFixed(5)}°, {coordinates.longitude.toFixed(5)}°</div>
              <div><strong>Location Source:</strong> {locationSource}</div>
              <div><strong>Contact:</strong> {contactName || 'Anonymous'} {contactPhone ? `(${contactPhone})` : ''}</div>
              {description && <div><strong>Description:</strong> {description}</div>}
            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '0.6rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                ⚠️ {submitError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={isSubmitting}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.88rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                Back to Edit
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                style={{
                  background: isSubmitting ? '#991b1b' : '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '6px',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <Send size={16} />
                {isSubmitting ? 'Transmitting Distress Call...' : 'Confirm & Transmit SOS'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUBMISSION RESULT (ONLINE SERVER ACK OR OFFLINE QUEUE) */}
        {step === 'result' && submissionResult && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            {submissionResult.isQueuedOffline ? (
              <div>
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: '#fef3c7', 
                    color: '#d97706', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 1rem',
                    border: '3px solid #fde68a'
                  }}
                >
                  <Clock size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#b45309', marginBottom: '0.5rem' }}>
                  SOS QUEUED LOCALLY (PENDING TRANSMISSION)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#78350f', maxWidth: '420px', margin: '0 auto 1rem' }}>
                  {submissionResult.message}
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', margin: '0 auto 1.25rem', maxWidth: '380px', fontSize: '0.82rem' }}>
                  <div><strong>Draft Request ID:</strong> <code>{submissionResult.incident?.clientGeneratedId}</code></div>
                  <div><strong>Status:</strong> <span style={{ color: '#b45309', fontWeight: '700' }}>Pending transmission</span></div>
                  <div><strong>Notice:</strong> Will retry automatically when internet returns. You can also trigger manual retry from the top offline banner.</div>
                </div>
              </div>
            ) : (
              <div>
                <div 
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '50%', 
                    background: '#dcfce7', 
                    color: '#16a34a', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '0 auto 1rem',
                    border: '3px solid #bbf7d0'
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#15803d', marginBottom: '0.5rem' }}>
                  SOS TRANSMITTED & ACKNOWLEDGED
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#166534', maxWidth: '420px', margin: '0 auto 1rem' }}>
                  {submissionResult.message}
                </p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'left', margin: '0 auto 1.25rem', maxWidth: '380px', fontSize: '0.82rem' }}>
                  <div><strong>Confirmed Incident ID:</strong> <code>{submissionResult.incident?.id}</code></div>
                  <div><strong>Status:</strong> <span style={{ color: '#15803d', fontWeight: '700' }}>{submissionResult.incident?.status || 'Received'}</span></div>
                  <div><strong>Time Acknowledged:</strong> {new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.75rem',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Done / Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
