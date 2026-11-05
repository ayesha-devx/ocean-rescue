/**
 * Utility for persisting and resolving selected incident context across OceanRescue modules.
 * Implements deterministic selection priority:
 * 1. Valid incidentId in URL query parameters takes priority.
 * 2. Valid incident context passed through React Router navigation state.
 * 3. Last explicitly selected incident restored from sessionStorage / localStorage.
 * 4. null (No incident selected — does not silently default to arbitrary incident).
 */

const STORAGE_KEY = 'oceanrescue_selected_incident_id';

/**
 * Retrieves the stored incident ID from sessionStorage or localStorage.
 * @returns {number|null}
 */
export function getStoredIncidentId() {
  try {
    const val = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (val !== null && val !== undefined && val !== '') {
      const num = Number(val);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  } catch (err) {
    console.warn('Storage read warning:', err);
  }
  return null;
}

/**
 * Persists the selected incident ID to both sessionStorage and localStorage.
 * @param {number|string|null} id
 */
export function setStoredIncidentId(id) {
  try {
    if (id !== null && id !== undefined && id !== '') {
      const num = Number(id);
      if (!isNaN(num) && num > 0) {
        sessionStorage.setItem(STORAGE_KEY, String(num));
        localStorage.setItem(STORAGE_KEY, String(num));
        return;
      }
    }
    clearStoredIncidentId();
  } catch (err) {
    console.warn('Storage write warning:', err);
  }
}

/**
 * Clears the persisted selected incident ID from storage.
 */
export function clearStoredIncidentId() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Storage clear warning:', err);
  }
}

/**
 * Resolves the active incident ID using the deterministic selection policy.
 * @param {URLSearchParams} searchParams
 * @param {object|null} locationState
 * @returns {number|null}
 */
export function resolveInitialIncidentId(searchParams, locationState) {
  // 1. URL Query Parameter
  if (searchParams) {
    const param = searchParams.get('incidentId');
    if (param !== null && param !== undefined && param !== '') {
      const num = Number(param);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  // 2. React Router Navigation State
  if (locationState) {
    const stateId = locationState.incidentId || locationState.incident?.id;
    if (stateId !== null && stateId !== undefined && stateId !== '') {
      const num = Number(stateId);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  // 3. Persisted Storage
  const stored = getStoredIncidentId();
  if (stored !== null && stored > 0) {
    return stored;
  }

  // 4. No incident selected
  return null;
}
