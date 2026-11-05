/**
/**
 * OceanRescue Route Optimization API Client
 * Centralized service connecting the React frontend to the FastAPI + PostGIS routing engine.
 */

import { API_BASE_URL } from './api';

const BASE = API_BASE_URL.replace(/\/+$/, '');

function parseNumericMissionId(id) {
  if (typeof id === 'string' && id.startsWith('OR-MSN-')) {
    return parseInt(id.replace('OR-MSN-', ''), 10);
  }
  return Number(id);
}

/**
 * Execute A* route optimization for a recovery mission.
 */
export async function optimizeMissionRoute(missionId, payload = {}) {
  const numericId = parseNumericMissionId(missionId);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/routes/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Route calculation failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch all calculated routes and previous versions for a recovery mission.
 */
export async function getMissionRoutes(missionId) {
  const numericId = parseNumericMissionId(missionId);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/routes`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch routes (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch single route by ID for a recovery mission.
 */
export async function getMissionRouteById(missionId, routeId) {
  const numericId = parseNumericMissionId(missionId);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/routes/${routeId}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch route (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch currently active selected route for a recovery mission.
 */
export async function getSelectedMissionRoute(missionId) {
  const numericId = parseNumericMissionId(missionId);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/routes/selected`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    return null;
  }
  return await res.json();
}

/**
 * Select active preferred route and synchronize with recovery_missions.planned_route.
 */
export async function selectMissionRoute(missionId, routeId, { selected_by = 'Lead Operations Officer', notes = null } = {}) {
  const numericId = parseNumericMissionId(missionId);
  const res = await fetch(`${BASE}/api/v1/recovery-missions/${numericId}/routes/${routeId}/select`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      selected_by,
      notes,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Route selection failed (${res.status})`);
  }
  return await res.json();
}

/**
 * Fetch designated restricted marine sanctuaries GeoJSON for map display.
 */
export async function getRestrictedMarineZones() {
  const res = await fetch(`${BASE}/api/v1/routes/restricted-zones`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    return { type: 'FeatureCollection', features: [] };
  }
  return await res.json();
}
