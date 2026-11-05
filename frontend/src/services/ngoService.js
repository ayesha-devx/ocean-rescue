/**
 * OceanRescue NGO API Client
 * Centralized service connecting the React frontend to the FastAPI + PostgreSQL backend.
 */

import { API_BASE_URL } from './api';

const BASE = API_BASE_URL.replace(/\/+$/, '');

/**
 * Retrieve the current cryptographic JWT token from browser storage.
 */
export function getNgoAuthToken() {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem('oceanrescue_ngo_token') ||
    localStorage.getItem('oceanrescue_ngo_token') ||
    null
  );
}

/**
 * Build trusted authorization headers.
 * Sends Bearer <token> strictly from cryptographically signed JWT sessions.
 * Never sends forged client-side role headers.
 */
export function getNgoAuthHeaders() {
  const token = getNgoAuthToken();
  const headers = { Accept: 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Authenticate an NGO operator against the backend and store the signed JWT session.
 */
export async function loginNgoUser({
  operatorId = 'officer.maritime@oceanrescue.org',
  password = 'oceanrescue-demo',
  role = 'Field Recovery Specialist',
  agency = 'Ghost Diving & Marine Alliance',
} = {}) {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      operator_id: operatorId,
      password: password,
      role: role,
      agency: agency,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Authentication failed: ${res.status}`);
  }
  const data = await res.json();
  if (typeof window !== 'undefined' && data.access_token) {
    sessionStorage.setItem('oceanrescue_ngo_token', data.access_token);
    sessionStorage.setItem('oceanrescue_ngo_user', JSON.stringify(data.user));
    localStorage.setItem('oceanrescue_ngo_token', data.access_token);
    localStorage.setItem('oceanrescue_ngo_user', JSON.stringify(data.user));
  }
  return data;
}

/**
 * Clear the current NGO operator session.
 */
export function logoutNgoUser() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('oceanrescue_ngo_token');
    sessionStorage.removeItem('oceanrescue_ngo_user');
    localStorage.removeItem('oceanrescue_ngo_token');
    localStorage.removeItem('oceanrescue_ngo_user');
  }
}

/**
 * Fetch live NGO dashboard statistics.
 */
export async function getDashboardStats() {
  const res = await fetch(`${BASE}/api/v1/dashboard/stats`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch paginated gear reports with optional filtering.
 */
export async function getReports({
  status = null,
  gearType = null,
  reportingMethod = null,
  locationType = null,
  search = null,
  page = 1,
  pageSize = 20,
} = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status.toLowerCase());
  if (gearType && gearType !== 'ALL') params.append('gear_type', gearType.toLowerCase());
  if (reportingMethod && reportingMethod !== 'ALL') params.append('reporting_method', reportingMethod.toLowerCase());
  if (locationType && locationType !== 'ALL') params.append('location_type', locationType.toLowerCase());
  if (search && search.trim()) params.append('search', search.trim());
  params.append('page', page);
  params.append('page_size', pageSize);

  const res = await fetch(`${BASE}/api/v1/reports?${params.toString()}`, {
    headers: getNgoAuthHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch a single incident report by ID.
 */
export async function getReportById(reportId) {
  const res = await fetch(`${BASE}/api/v1/reports/${reportId}`, {
    headers: getNgoAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Update report status (e.g. reported -> verified -> in_review -> resolved).
 */
export async function updateReportStatus(reportId, newStatus, notes = '') {
  const res = await fetch(`${BASE}/api/v1/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getNgoAuthHeaders(),
    },
    body: JSON.stringify({ status: newStatus, notes }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch spatial report coordinates in GeoJSON format.
 */
export async function getReportsGeoJSON(status = null) {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status.toLowerCase());

  const res = await fetch(`${BASE}/api/v1/reports/map/geojson?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch latest environmental telemetry observation (optionally filtered by reportId).
 */
export async function getLatestEnvironmentalObservation(reportId = null) {
  const url = reportId
    ? `${BASE}/api/v1/environmental-observations/latest?report_id=${encodeURIComponent(reportId)}`
    : `${BASE}/api/v1/environmental-observations/latest`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    return null;
  }
  return await res.json();
}

/**
 * Query live Open-Meteo environmental telemetry on-demand and persist to database.
 */
export async function queryLiveEnvironmentalTelemetry({
  latitude = 16.99,
  longitude = 73.30,
  target_time = null,
  force_simulation = false,
  report_id = null,
} = {}) {
  const res = await fetch(`${BASE}/api/v1/environmental-observations/query-live`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      latitude,
      longitude,
      target_time,
      force_simulation,
      report_id,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Environmental query failed (${res.status})`);
  }
  return await res.json();
}


/**
 * Fetch recovery missions list.
 */
export async function getRecoveryMissions({ status = null, page = 1, pageSize = 20 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status.toLowerCase());
  params.append('page', page);
  params.append('page_size', pageSize);

  const res = await fetch(`${BASE}/api/v1/recovery-missions?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Create a new recovery mission.
 */
export async function createRecoveryMission(payload) {
  const res = await fetch(`${BASE}/api/v1/recovery-missions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch a single recovery mission by ID.
 */
export async function getRecoveryMissionById(id) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Update parameters for an existing recovery mission by ID.
 */
export async function updateRecoveryMission(id, payload) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Mission update failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Delete a recovery mission by ID.
 */
export async function deleteRecoveryMission(id) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return false;
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return true;
}

/**
 * Fetch dynamic summary statistics for recovery missions directly from the database.
 */
export async function getRecoveryMissionStats() {
  const res = await fetch(`${BASE}/api/v1/recovery-missions/stats`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch recovery mission stats (${res.status})`);
  }
  return await res.json();
}

/**
 * Start recovery operation for a planned mission (transitions status to in_progress).
 */
export async function startRecoveryOperation(id) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/start`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Starting recovery operation failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Upload optional evidence photograph for a recovery mission.
 */
export async function uploadRecoveryEvidence(id, photoFile) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  const formData = new FormData();
  formData.append('photo', photoFile);

  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/evidence`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Evidence upload failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Submit recovery outcome (Successfully Recovered, Partially Recovered, Recovery Unsuccessful).
 * Supports optional notes, officer name, and optional evidence photo file.
 */
export async function submitRecoveryOutcome(id, { outcome, notes = '', submitted_by = 'Lead Recovery Officer', photoFile = null, evidence_url = null } = {}) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  let res;
  if (photoFile) {
    const formData = new FormData();
    formData.append('outcome', outcome);
    if (notes) formData.append('notes', notes);
    if (submitted_by) formData.append('submitted_by', submitted_by);
    formData.append('photo', photoFile);

    res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/outcomes`, {
      method: 'POST',
      body: formData,
    });
  } else {
    res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/outcomes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        outcome,
        notes,
        submitted_by,
        evidence_url,
      }),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to submit recovery outcome (${res.status})`);
  }
  return await res.json();
}

/**
 * Retrieve outcome history for a recovery mission (newest first).
 */
export async function getRecoveryOutcomes(id) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/outcomes`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch recovery outcomes (${res.status})`);
  }
  return await res.json();
}

/**
 * Submit an authorized correction for a previously recorded recovery outcome.
 * Requires a mandatory correction reason and authorized officer certification.
 * Appends an audit entry to the ledger while preserving all historical outcomes.
 */
export async function correctRecoveryOutcome(id, { outcome, correction_reason, notes, submitted_by, evidence_url, photoFile }) {
  const numericId = typeof id === 'string' && id.startsWith('OR-MSN-')
    ? parseInt(id.replace('OR-MSN-', ''), 10)
    : Number(id);

  let res;
  if (photoFile) {
    const formData = new FormData();
    formData.append('outcome', outcome);
    formData.append('correction_reason', correction_reason);
    if (notes) formData.append('notes', notes);
    if (submitted_by) formData.append('submitted_by', submitted_by);
    formData.append('photo', photoFile);

    res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/corrections`, {
      method: 'POST',
      headers: {
        'X-Officer-Role': submitted_by || 'Lead Recovery Officer',
      },
      body: formData,
    });
  } else {
    res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/corrections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Officer-Role': submitted_by || 'Lead Recovery Officer',
      },
      body: JSON.stringify({
        outcome,
        correction_reason,
        notes,
        submitted_by,
        evidence_url,
      }),
    });
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to correct recovery outcome (${res.status})`);
  }
  return await res.json();
}

