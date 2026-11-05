import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredIncidentId,
  setStoredIncidentId,
  clearStoredIncidentId,
  resolveInitialIncidentId,
} from './incidentStorage.js';

// Setup Mock Storage for Node environment
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.sessionStorage = new MockStorage();
globalThis.localStorage = new MockStorage();

test('Incident Selection Priority & Persistence Suite', async (t) => {
  t.beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  await t.test('1. Priority 1: URL Query parameter ?incidentId=607 takes absolute precedence', () => {
    // Even if storage has #292 and location state has #417:
    setStoredIncidentId(292);
    const locationState = { incidentId: 417 };
    const searchParams = new URLSearchParams('incidentId=607');

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, 607, 'Should resolve 607 from URL query param');
  });

  await t.test('2. Priority 2: React Router location state takes precedence when URL param is absent', () => {
    // Storage has #292, but user navigated from an incident page with state #417
    setStoredIncidentId(292);
    const locationState = { incident: { id: 417 } };
    const searchParams = new URLSearchParams('');

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, 417, 'Should resolve 417 from navigation state');
  });

  await t.test('3. Priority 3 (Browser Refresh): Restores explicitly selected #607 from storage when URL has no query param', () => {
    // User selected incident #607 in UI, persisting to storage
    setStoredIncidentId(607);

    // Browser refreshes at /ngo/drift-forecasting without query params
    const searchParams = new URLSearchParams('');
    const locationState = null;

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, 607, 'Must restore #607 from storage on refresh, NOT #292');
  });

  await t.test('4. Priority 3 (Browser Refresh): Restores explicitly selected #417 from storage', () => {
    // User selected incident #417
    setStoredIncidentId(417);

    // Browser refreshes
    const searchParams = new URLSearchParams('');
    const locationState = null;

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, 417, 'Must restore #417 from storage on refresh');
  });

  await t.test('5. Priority 4: No incident selected returns null (Never silently defaults to #292)', () => {
    // Brand new user or cleared storage
    clearStoredIncidentId();
    const searchParams = new URLSearchParams('');
    const locationState = null;

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, null, 'Must return null so UI shows "No incident selected" state, not #292');
  });

  await t.test('6. Direct URL Access: Opening /ngo/drift-forecasting?incidentId=607 directly', () => {
    const searchParams = new URLSearchParams('incidentId=607');
    const locationState = null;

    const resolved = resolveInitialIncidentId(searchParams, locationState);
    assert.equal(resolved, 607, 'Direct URL access must select #607');
  });

  await t.test('7. Clearing selection purges storage and restores null state', () => {
    setStoredIncidentId(607);
    assert.equal(getStoredIncidentId(), 607);

    clearStoredIncidentId();
    assert.equal(getStoredIncidentId(), null, 'Storage must be completely cleared');

    const resolved = resolveInitialIncidentId(new URLSearchParams(''), null);
    assert.equal(resolved, null, 'Must return null after clearing');
  });

  await t.test('8. Robustness: Rejects invalid, non-numeric, or negative query params', () => {
    const searchParamsNaN = new URLSearchParams('incidentId=invalid_slug');
    assert.equal(resolveInitialIncidentId(searchParamsNaN, null), null);

    const searchParamsZero = new URLSearchParams('incidentId=0');
    assert.equal(resolveInitialIncidentId(searchParamsZero, null), null);

    const searchParamsNegative = new URLSearchParams('incidentId=-100');
    assert.equal(resolveInitialIncidentId(searchParamsNegative, null), null);
  });
});
