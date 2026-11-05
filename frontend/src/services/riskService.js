/**
 * OceanRescue Risk Prioritization API Service
 * Connects frontend to the multi-criteria risk assessment engine.
 */

import { API_BASE_URL } from './api';

const BASE = API_BASE_URL.replace(/\/+$/, '');

/**
 * Fetch the prioritized incident queue with filters, sorting, and search.
 * Only verified incidents are included in the queue.
 */
export async function getRiskQueue(filters = {}) {
  const params = new URLSearchParams();

  if (filters.priority && filters.priority !== 'all') {
    params.append('priority', filters.priority);
  }
  if (filters.gearType && filters.gearType !== 'all') {
    params.append('gear_type', filters.gearType);
  }
  if (filters.wildlife && filters.wildlife !== 'all') {
    params.append('wildlife', filters.wildlife);
  }
  if (filters.completeness && filters.completeness !== 'all') {
    params.append('completeness', filters.completeness);
  }
  if (filters.search && filters.search.trim()) {
    params.append('search', filters.search.trim());
  }
  if (filters.sortBy) {
    params.append('sort_by', filters.sortBy);
  }
  if (filters.sortOrder) {
    params.append('sort_order', filters.sortOrder);
  }

  const queryString = params.toString();
  const url = `${BASE}/api/v1/risk/queue${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch risk queue (${res.status})`);
  }

  return await res.json();
}

/**
 * Fetch detailed risk assessment for an incident.
 */
export async function getIncidentRisk(reportId) {
  const res = await fetch(`${BASE}/api/v1/risk/incident/${reportId}`, {
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
 * Calculate or recalculate risk assessment for an incident with optional custom weights.
 */
export async function evaluateIncidentRisk(reportId, customWeights = null) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };

  if (customWeights) {
    options.body = JSON.stringify({ custom_weights: customWeights });
  }

  const res = await fetch(`${BASE}/api/v1/risk/evaluate/${reportId}`, options);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Evaluation failed: ${res.status}`);
  }

  return await res.json();
}

/**
 * Fetch the active default risk scoring weights and documentation metadata.
 */
export async function getRiskWeights() {
  const res = await fetch(`${BASE}/api/v1/risk/weights`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch risk weights (${res.status})`);
  }

  return await res.json();
}
