/**
 * OceanRescue Lost Gear Incident Reporting Service
 *
 * Handles client-side validation and transmission of citizen / mariner
 * lost fishing gear reports to the OceanRescue backend API.
 *
 * If the backend server is offline or does not expose a report ingestion
 * endpoint, the service cleanly flags `isBackendConnected: false` so the
 * UI renders a truthful development / demo state rather than pretending
 * data was saved to a production database.
 */

import { API_BASE_URL } from './api.js';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
];

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];

export const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Validates coordinate ranges.
 * Latitude must be within [-90, 90].
 * Longitude must be within [-180, 180].
 */
export function validateCoordinates(latitude, longitude) {
  const errors = {};

  if (latitude === '' || latitude === null || latitude === undefined) {
    errors.latitude = 'Latitude coordinate is required';
  } else {
    const latNum = Number(latitude);
    if (isNaN(latNum)) {
      errors.latitude = 'Latitude must be a valid decimal number';
    } else if (latNum < -90 || latNum > 90) {
      errors.latitude = 'Latitude must be between -90.0000° and +90.0000°';
    }
  }

  if (longitude === '' || longitude === null || longitude === undefined) {
    errors.longitude = 'Longitude coordinate is required';
  } else {
    const lngNum = Number(longitude);
    if (isNaN(lngNum)) {
      errors.longitude = 'Longitude must be a valid decimal number';
    } else if (lngNum < -180 || lngNum > 180) {
      errors.longitude = 'Longitude must be between -180.0000° and +180.0000°';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates mobile number with country code support.
 */
export function validatePhoneNumber(phone) {
  if (!phone || !phone.trim()) {
    return { isValid: false, error: 'Mobile number is required with country code' };
  }
  const cleaned = phone.trim();
  const phoneRegex = /^\+?[0-9\s\-().]{7,25}$/;
  if (!phoneRegex.test(cleaned)) {
    return { isValid: false, error: 'Invalid mobile format. Please include country code (e.g. +91 9876543210).' };
  }
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { isValid: false, error: 'Mobile number must contain between 7 and 15 digits.' };
  }
  return { isValid: true, error: null };
}

/**
 * Validates optional email address.
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { isValid: true, error: null };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true, error: null };
}

/**
 * Validates an uploaded photo file against size and format requirements.
 */
export function validatePhotoFile(file) {
  if (!file) {
    return { isValid: true, error: null };
  }

  const fileType = (file.type || '').toLowerCase();
  const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();

  const isTypeValid =
    ALLOWED_IMAGE_TYPES.includes(fileType) ||
    ALLOWED_IMAGE_EXTENSIONS.includes(fileExt);

  if (!isTypeValid) {
    return {
      isValid: false,
      error: `Unsupported image format "${file.name}". Supported: PNG, JPG, WebP, or HEIC.`,
    };
  }

  if (file.size <= 0) {
    return {
      isValid: false,
      error: 'The selected image file is empty (0 bytes).',
    };
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `Image size (${sizeMb} MB) exceeds maximum allowed limit of 20 MB.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Formats decimal coordinates into a clear, unambiguous geographical string.
 * Returns null if either coordinate is empty, whitespace, non-numeric, or outside valid ranges.
 * e.g. 21.3069, -157.8583 -> "21.3069° N, 157.8583° W"
 */
export function formatCoordinatesDisplay(latitude, longitude) {
  if (
    latitude === '' ||
    latitude === null ||
    latitude === undefined ||
    String(latitude).trim() === '' ||
    longitude === '' ||
    longitude === null ||
    longitude === undefined ||
    String(longitude).trim() === ''
  ) {
    return null;
  }

  const latNum = Number(latitude);
  const lngNum = Number(longitude);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return null;
  }

  // Validate range bounds (-90 to +90 lat, -180 to +180 lng)
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
    return null;
  }

  const latHemisphere = latNum >= 0 ? 'N' : 'S';
  const lngHemisphere = lngNum >= 0 ? 'E' : 'W';

  return `${Math.abs(latNum).toFixed(4)}° ${latHemisphere}, ${Math.abs(lngNum).toFixed(4)}° ${lngHemisphere}`;
}

/**
 * Submit incident report to the backend if reachable.
 * Gracefully falls back to demo mode if backend is not available or endpoint is unmounted.
 */
export async function submitIncidentReport(formData, photoFile = null) {
  const isAnonymous = Boolean(formData.isAnonymous);

  const payload = {
    reporterType: formData.reporterRole || formData.reporterType || 'Commercial Fisherman',
    reporterName: isAnonymous ? '' : (formData.reporterName || '').trim(),
    reporterPhone: isAnonymous ? '' : (formData.reporterPhone || '').trim(),
    reporterEmail: isAnonymous ? '' : (formData.reporterEmail || '').trim() || null,
    reporterRole: formData.reporterRole || formData.reporterType || 'Vessel Owner',
    contactInfo: isAnonymous ? '' : (formData.contactInfo || '').trim(),
    isAnonymous,
    vesselName: formData.hasRegisteredVesselName === false ? 'No registered name' : (formData.vesselName || '').trim(),
    hasRegisteredVesselName: formData.hasRegisteredVesselName !== false,
    vesselRegistrationNumber: (formData.vesselRegistrationNumber || '').trim() || null,
    vesselType: formData.vesselType || 'Fishing Boat',
    homePort: (formData.homePort || '').trim() || null,
    gearType: formData.gearType,
    gearQuantity: formData.gearQuantity ? Math.max(1, parseInt(formData.gearQuantity, 10)) : 1,
    gearMarkings: (formData.gearMarkings || '').trim() || null,
    waterPosition: formData.waterPosition,
    estimatedSize: formData.estimatedSize,
    latitude: Number(formData.latitude),
    longitude: Number(formData.longitude),
    locationNotes: (formData.locationNotes || '').trim(),
    seaState: formData.seaState,
    wildlifeEntangled: formData.wildlifeEntangled,
    wildlifeDetails: (formData.wildlifeDetails || '').trim(),
    declarationConfirmed: Boolean(formData.declarationConfirmed),
    description: (formData.description || '').trim(),
    isDemoCoordinates: Boolean(formData.isDemoCoordinates),
    timestamp: new Date().toISOString(),
    // Extended Reporting Method & Telemetry (Stage 2)
    reportingMethod: formData.reportingMethod || (formData.locationType === 'estimated' ? 'manual' : 'gps'),
    locationType: formData.locationType || (formData.reportingMethod === 'manual' ? 'estimated' : 'exact'),
    locationUncertaintyRadiusM: formData.locationUncertaintyRadiusM !== undefined && formData.locationUncertaintyRadiusM !== null ? Number(formData.locationUncertaintyRadiusM) : null,
    lossDateTime: formData.lossDateTime || null,
    approximateArea: (formData.approximateArea || '').trim() || null,
    distanceFromCoastKm: formData.distanceFromCoastKm !== undefined && formData.distanceFromCoastKm !== null && formData.distanceFromCoastKm !== '' ? Number(formData.distanceFromCoastKm) : null,
    nearbyLandmark: (formData.nearbyLandmark || '').trim() || null,
    directionFromLandmark: (formData.directionFromLandmark || '').trim() || null,
  };

  // Build FormData if photo is present, otherwise JSON
  const endpoint = `${API_BASE_URL}/api/v1/reports`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    let body;
    let headers = { Accept: 'application/json' };

    if (photoFile) {
      const fd = new FormData();
      fd.append('photo', photoFile);
      fd.append('report', JSON.stringify(payload));
      body = fd;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        isBackendConnected: true,
        reportId: data.id,
        report: data,
        message: 'Report logged successfully with OceanRescue backend',
        payload,
      };
    } else {
      let errorMessage = `Server error (${res.status})`;
      try {
        const errorData = await res.json();
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((d) => `${d.loc ? d.loc.slice(-1)[0] + ': ' : ''}${d.msg}`)
              .join('; ');
          } else {
            errorMessage = String(errorData.detail);
          }
        }
      } catch {
        if (res.statusText) {
          errorMessage = `${errorMessage}: ${res.statusText}`;
        }
      }
      return {
        success: false,
        error: errorMessage,
        status: res.status,
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    let errorMsg =
      'The OceanRescue backend server is currently offline or unreachable on port 8000. Please ensure the backend is running.';
    if (err.name === 'AbortError') {
      errorMsg = 'Request timed out after 8 seconds. Please check your network connection and try again.';
    } else if (err.message && !err.message.includes('fetch')) {
      errorMsg = `Connection error: ${err.message}`;
    }
    return {
      success: false,
      error: errorMsg,
    };
  }
}
