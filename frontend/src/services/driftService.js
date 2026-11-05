/**
 * OceanRescue Drift Forecasting API Service
 * Connects frontend to the Lagrangian drift calculation and environmental intelligence subsystem.
 */

import { API_BASE_URL } from './api';

const BASE = API_BASE_URL.replace(/\/+$/, '');

/**
 * Fetch verified incidents eligible for drift forecasting.
 */
export async function getEligibleVerifiedIncidents() {
  const res = await fetch(`${BASE}/api/v1/drift-forecasts/eligible-incidents`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch validated marine environmental conditions for coordinates.
 */
export async function getMarineConditions(lat, lon, targetTime = null, forceSimulation = false) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    force_simulation: forceSimulation ? 'true' : 'false',
  });
  if (targetTime) {
    params.append('target_time', typeof targetTime === 'string' ? targetTime : targetTime.toISOString());
  }

  const res = await fetch(`${BASE}/api/v1/drift-forecasts/environmental-conditions?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}


/**
 * Execute drift forecast calculation and persist trajectory in PostGIS.
 */
export async function generateDriftForecast({
  report_id,
  duration_hours = 24,
  time_step_hours = 1,
  windage = 0.0,
  force_simulation = false,
}) {
  const res = await fetch(`${BASE}/api/v1/drift-forecasts/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      report_id,
      duration_hours,
      time_step_hours,
      windage,
      force_simulation,
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Drift forecast generation failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch latest saved drift forecast trajectory for an incident.
 * Returns null if no forecast has been calculated yet.
 */
export async function getLatestDriftForecast(reportId) {
  const res = await fetch(`${BASE}/api/v1/drift-forecasts/latest/${reportId}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch all saved trajectory step points for an incident.
 */
export async function getDriftPointsByReport(reportId) {
  const res = await fetch(`${BASE}/api/v1/drift-forecasts/by-report/${reportId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${res.status}`);
  }
  return await res.json();
}

/**
 * Delete forecast vectors for an incident.
 */
export async function clearDriftForecast(reportId) {
  const res = await fetch(`${BASE}/api/v1/drift-forecasts/by-report/${reportId}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to clear drift forecast: ${res.status}`);
  }
  return true;
}
