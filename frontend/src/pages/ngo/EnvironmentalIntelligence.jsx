import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import EmptyState from '../../components/ngo/EmptyState';
import {
  getReportById,
  getLatestEnvironmentalObservation,
  queryLiveEnvironmentalTelemetry,
} from '../../services/ngoService';
import { getEligibleVerifiedIncidents } from '../../services/driftService';
import {
  getStoredIncidentId,
  setStoredIncidentId,
  clearStoredIncidentId,
} from '../../utils/incidentStorage';

/**
 * Benchmark operational sectors along the Konkan Coast & Eastern Arabian Sea.
 */
const OPERATIONAL_SECTORS = [
  {
    id: 'mirkarwada',
    name: 'Sector 01: Mirkarwada Fishing Harbour, Ratnagiri',
    lat: 16.99,
    lon: 73.30,
    type: 'Coastal Pilot Harbour',
  },
  {
    id: 'ratnagiri_offshore',
    name: 'Sector 02: Ratnagiri Offshore Continental Shelf',
    lat: 17.02,
    lon: 73.15,
    type: 'Pelagic Trawling Grounds',
  },
  {
    id: 'malvan',
    name: 'Sector 03: Malvan Marine Sanctuary (Sindhudurg)',
    lat: 16.06,
    lon: 73.46,
    type: 'Sensitive Marine Protected Area',
  },
  {
    id: 'mumbai_shelf',
    name: 'Sector 04: Mumbai Outer Continental Shelf',
    lat: 18.95,
    lon: 72.65,
    type: 'Deep Commercial Shipping Corridor',
  },
  {
    id: 'custom',
    name: 'Custom WGS84 Coordinates',
    lat: 16.99,
    lon: 73.30,
    type: 'User Specified Coordinates',
  },
];

/**
 * Formats coordinates into readable WGS84 format.
 */
const formatCoordinates = (lat, lon) => {
  if (lat === undefined || lon === undefined || lat === null || lon === null) return 'N/A';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(Number(lat)).toFixed(4)}° ${latDir}, ${Math.abs(Number(lon)).toFixed(4)}° ${lonDir}`;
};

/**
 * Formats gear type slug into capitalized string.
 */
const formatGearType = (gear) => {
  if (!gear) return 'Unknown Gear';
  return gear.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

/**
 * Calculates great-circle Haversine distance in kilometers.
 */
function calcDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
  const R = 6371; // km
  const dLat = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLon = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((Number(lat1) * Math.PI) / 180) *
      Math.cos((Number(lat2) * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Screen 6 — Environmental Intelligence
 * Integrates real Open-Meteo Marine & Weather APIs.
 * Supports incident-specific telemetry inspection and sector-wide regional baseline monitoring.
 */
export const EnvironmentalIntelligence = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Determine initial incidentId from search parameters or router state
  const incidentIdFromUrl = searchParams.get('incidentId');
  const incidentFromState = location.state?.incident || null;
  const initialIncidentId = incidentIdFromUrl
    ? Number(incidentIdFromUrl)
    : location.state?.incidentId
    ? Number(location.state.incidentId)
    : incidentFromState
    ? incidentFromState.id
    : null;

  // Selected incident state
  const [selectedIncidentId, setSelectedIncidentId] = useState(initialIncidentId);
  const [selectedIncident, setSelectedIncident] = useState(incidentFromState);
  const [eligibleIncidents, setEligibleIncidents] = useState([]);
  const [loadingIncident, setLoadingIncident] = useState(false);
  const activeReportIdRef = useRef(initialIncidentId);

  // Sector and coordinate selection
  const [selectedSectorId, setSelectedSectorId] = useState('mirkarwada');
  const [customLat, setCustomLat] = useState(16.99);
  const [customLon, setCustomLon] = useState(73.30);
  const [activeLayers, setActiveLayers] = useState({
    currents: true,
    winds: true,
    waves: true,
    bathymetry: false,
  });

  const [latestObs, setLatestObs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Load eligible verified incidents list for selector
  useEffect(() => {
    async function loadIncidents() {
      try {
        const incidents = await getEligibleVerifiedIncidents();
        setEligibleIncidents(incidents || []);
      } catch (err) {
        console.warn('Failed to load eligible incidents:', err.message);
      }
    }
    loadIncidents();
  }, []);

  // 2. Fetch or sync selected incident details
  useEffect(() => {
    async function syncIncident() {
      if (!selectedIncidentId) {
        setSelectedIncident(null);
        return;
      }
      // If we already have the incident in state matching the ID, retain it
      if (selectedIncident && selectedIncident.id === selectedIncidentId) {
        return;
      }
      try {
        setLoadingIncident(true);
        const data = await getReportById(selectedIncidentId);
        if (data) {
          setSelectedIncident(data);
        }
      } catch (err) {
        console.warn(`Failed to fetch incident #${selectedIncidentId}:`, err.message);
        setSelectedIncident(null);
      } finally {
        setLoadingIncident(false);
      }
    }
    syncIncident();
  }, [selectedIncidentId]);

  // 3. Load initial or updated telemetry
  useEffect(() => {
    async function loadTelemetry() {
      const targetId = selectedIncidentId ? Number(selectedIncidentId) : null;
      activeReportIdRef.current = targetId;

      // Clear existing telemetry immediately to prevent displaying stale cross-incident data
      setLatestObs(null);

      try {
        setLoading(true);
        if (targetId) {
          // Incident-specific mode: ONLY accept telemetry that explicitly belongs to this incident
          const data = await getLatestEnvironmentalObservation(targetId);
          if (activeReportIdRef.current === targetId) {
            if (data && Number(data.report_id) === targetId) {
              setLatestObs(data);
            } else {
              // No telemetry recorded yet specifically for this incident
              setLatestObs(null);
            }
          }
        } else {
          // Sector-wide regional baseline mode: load most recent general observation
          const data = await getLatestEnvironmentalObservation(null);
          if (activeReportIdRef.current === null) {
            setLatestObs(data);
          }
        }
      } catch (err) {
        console.warn('Environmental telemetry initial query error:', err.message);
      } finally {
        if (activeReportIdRef.current === targetId) {
          setLoading(false);
        }
      }
    }
    loadTelemetry();
  }, [selectedIncidentId]);

  // Compute active target coordinates based on incident or sector selection
  const currentSector = OPERATIONAL_SECTORS.find((s) => s.id === selectedSectorId) || OPERATIONAL_SECTORS[0];
  const targetLat = selectedIncident
    ? selectedIncident.latitude
    : selectedSectorId === 'custom'
    ? parseFloat(customLat) || 16.99
    : currentSector.lat;
  const targetLon = selectedIncident
    ? selectedIncident.longitude
    : selectedSectorId === 'custom'
    ? parseFloat(customLon) || 73.30
    : currentSector.lon;

  // Handle incident selector change
  const handleSelectIncident = async (incId) => {
    setErrorMessage('');
    setActionMessage('');

    if (!incId) {
      activeReportIdRef.current = null;
      setSelectedIncidentId(null);
      setSelectedIncident(null);
      setLatestObs(null);
      clearStoredIncidentId();
      setSearchParams({});
      setSelectedSectorId('mirkarwada');
      return;
    }

    const numId = Number(incId);
    activeReportIdRef.current = numId;
    setSelectedIncidentId(numId);
    setStoredIncidentId(numId);
    setSearchParams({ incidentId: numId });
    setLatestObs(null);

    const match = eligibleIncidents.find((i) => i.id === numId);
    if (match) {
      setSelectedIncident(match);
    } else {
      try {
        setLoadingIncident(true);
        const fetched = await getReportById(numId);
        if (activeReportIdRef.current === numId) {
          setSelectedIncident(fetched);
        }
      } catch (err) {
        console.warn('Could not load incident details:', err.message);
      } finally {
        if (activeReportIdRef.current === numId) {
          setLoadingIncident(false);
        }
      }
    }
  };

  // Handle on-demand live telemetry query
  const handleQueryLiveTelemetry = async (forceSim = false) => {
    try {
      setRefreshing(true);
      setErrorMessage('');
      setActionMessage('');

      const targetReportId = selectedIncident ? selectedIncident.id : null;
      const queryLat = selectedIncident ? selectedIncident.latitude : targetLat;
      const queryLon = selectedIncident ? selectedIncident.longitude : targetLon;

      const data = await queryLiveEnvironmentalTelemetry({
        latitude: queryLat,
        longitude: queryLon,
        force_simulation: forceSim,
        report_id: targetReportId,
      });

      if (activeReportIdRef.current === targetReportId) {
        setLatestObs(data);
        setActionMessage(
          selectedIncident
            ? `Live telemetry successfully retrieved and persisted for Incident #${selectedIncident.id} (Record #${data.id}).`
            : `Live telemetry successfully retrieved and persisted to database (Record #${data.id}).`
        );
        setTimeout(() => setActionMessage(''), 6000);
      }
    } catch (err) {
      console.error('Live telemetry query failed:', err);
      setErrorMessage(err.message || 'Failed to query environmental telemetry.');
    } finally {
      setRefreshing(false);
    }
  };

  const toggleLayer = (layer) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Determine coordinate alignment between selected incident and latest observation
  const coordinateAlignment = useMemo(() => {
    if (!selectedIncident || !latestObs) {
      return { isMatch: false, distKm: 0, description: '' };
    }
    const dist = calcDistanceKm(
      selectedIncident.latitude,
      selectedIncident.longitude,
      latestObs.latitude,
      latestObs.longitude
    );
    if (dist < 0.1) {
      return {
        isMatch: true,
        distKm: dist,
        description: `Coordinates aligned with Incident #${selectedIncident.id} loss location (${dist === 0 ? 'Exact match' : `${dist} km offset`})`,
      };
    }
    return {
      isMatch: false,
      distKm: dist,
      description: `Telemetry reading is offset ${dist} km from Incident #${selectedIncident.id} coordinates (${formatCoordinates(selectedIncident.latitude, selectedIncident.longitude)})`,
    };
  }, [selectedIncident, latestObs]);

  // Determine status badge color and text
  const getStatusBadge = (obs) => {
    if (!obs) return { label: 'Sensor Feeds Standby', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    const statusMsg = obs.status_message || '';
    if (statusMsg.includes('Live API') || statusMsg.includes('real_data')) {
      return { label: 'Live API Response Retrieved', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    }
    if (statusMsg.includes('Partial')) {
      return { label: 'Partial Environmental Data', color: 'bg-blue-100 text-blue-800 border-blue-300' };
    }
    if (statusMsg.includes('Historical')) {
      return { label: 'Historical Data Retrieved', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    }
    if (statusMsg.includes('Simulation') || statusMsg.includes('simulation')) {
      return { label: 'Simulation Mode (Coastal Land Mask)', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    return { label: 'Telemetry Stream Active', color: 'bg-teal-100 text-teal-800 border-teal-300' };
  };

  const badge = getStatusBadge(latestObs);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* 1. Command Header & Telemetry Filter Bar */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-[#D8ECEC] shadow-xs">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span className="text-slate-500 uppercase">Operations</span>
            <span>/</span>
            <span className="text-[#087E8B] font-semibold uppercase">Environmental Intelligence</span>
            {selectedIncident && (
              <>
                <span>/</span>
                <span className="text-[#173B4D] font-bold">Incident #{selectedIncident.id}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#173B4D] tracking-tight">
            Environmental Intelligence
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Real-time hydrodynamic surface current vectors, 10m atmospheric winds, and wave telemetry
            intersecting coastal Maharashtra and Eastern Arabian Sea ALDFG study sectors.
          </p>
        </div>

        {/* Region & Live Query Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {!selectedIncident && (
            <div className="flex items-center gap-2 bg-[#F2FAFA] border border-[#D8ECEC] px-3 py-1.5 rounded-lg text-xs font-mono">
              <span className="material-symbols-outlined text-[#087E8B] text-[18px]">explore</span>
              <select
                value={selectedSectorId}
                onChange={(e) => setSelectedSectorId(e.target.value)}
                className="bg-transparent text-[#173B4D] font-semibold focus:outline-none cursor-pointer max-w-[260px] truncate"
              >
                {OPERATIONAL_SECTORS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => handleQueryLiveTelemetry(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#087E8B] hover:bg-[#173B4D] text-white text-xs font-mono font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>
              {refreshing
                ? 'Retrieving API...'
                : selectedIncident
                ? `Fetch Telemetry for #${selectedIncident.id}`
                : 'Fetch Live Telemetry'}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Selected Incident Section (Requirement 1, 2, 4, 5, 6) */}
      <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#D8ECEC] gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              selectedIncident
                ? 'bg-[#EAF7F7] border border-[#00C9C1] text-[#087E8B]'
                : 'bg-slate-100 border border-slate-300 text-slate-600'
            }`}>
              <span className="material-symbols-outlined text-lg">
                {selectedIncident ? 'target' : 'public'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#087E8B] font-bold">
                  {selectedIncident ? 'Selected Incident' : 'Telemetry Scope'}
                </span>
                {selectedIncident && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedIncident.status}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold font-display text-[#173B4D]">
                {selectedIncident
                  ? `Incident #${selectedIncident.id} (${formatGearType(selectedIncident.gear_type)})`
                  : 'Sector-wide telemetry — No incident selected'}
              </h2>
            </div>
          </div>

          {/* Action Links & Incident Selector Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {selectedIncident && (
              <>
                <Link
                  to={`/ngo/incidents/${selectedIncident.id}`}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] hover:bg-slate-50 text-xs font-mono font-semibold text-[#087E8B] transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span>View Details</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
                <Link
                  to={`/ngo/drift-forecasting?incidentId=${selectedIncident.id}`}
                  state={{ incident: selectedIncident, incidentId: selectedIncident.id }}
                  className="px-3 py-1.5 rounded-lg bg-[#00C9C1] hover:bg-[#00b5ae] text-xs font-mono font-bold text-[#173B4D] transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span>Model Drift</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </>
            )}

            {/* Incident Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F2FAFA] border border-[#D8ECEC] px-2.5 py-1.5 rounded-lg text-xs font-mono">
              <span className="text-slate-500 font-semibold text-[11px]">Select Incident:</span>
              <select
                value={selectedIncidentId || ''}
                onChange={(e) => handleSelectIncident(e.target.value)}
                className="bg-transparent text-[#173B4D] font-bold focus:outline-none cursor-pointer max-w-[220px] truncate"
              >
                <option value="">Sector-wide (No incident selected)</option>
                {eligibleIncidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    #{inc.id} • {formatGearType(inc.gear_type)} ({inc.latitude?.toFixed(2)}°, {inc.longitude?.toFixed(2)}°)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Incident Metadata Strip (When Selected) */}
        {selectedIncident ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#F2FAFA] p-4 rounded-xl border border-[#D8ECEC] text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Incident ID &amp; Gear</span>
              <span className="font-bold text-base text-[#173B4D] mt-0.5">
                #{selectedIncident.id}
              </span>
              <span className="text-[11px] text-slate-600 capitalize">
                {formatGearType(selectedIncident.gear_type)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Reported Coordinates</span>
              <span className="font-bold text-sm text-[#087E8B] mt-0.5">
                {formatCoordinates(selectedIncident.latitude, selectedIncident.longitude)}
              </span>
              <span className="text-[10px] text-slate-400">
                WGS84 Reported Loss Point
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Verification Status</span>
              <span className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-max bg-emerald-50 text-emerald-800 border border-emerald-200">
                {selectedIncident.status}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                Reported: {new Date(selectedIncident.reported_at).toLocaleDateString()}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Telemetry Association</span>
              <span className={`mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-max ${
                coordinateAlignment.isMatch
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}>
                {coordinateAlignment.isMatch ? 'Incident Location Aligned' : 'Nearby Grid Offset'}
              </span>
              <span className="text-[10px] text-slate-500 mt-0.5 truncate" title={coordinateAlignment.description}>
                {coordinateAlignment.description || 'Target coordinates active'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-slate-500 text-base shrink-0 mt-0.5">
              info
            </span>
            <div className="leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-700 block">
                Sector-wide Regional Baseline Active
              </span>
              <p className="mt-0.5 text-slate-600">
                Viewing regional environmental baseline across the Konkan maritime study area. No fisherman incident is currently selected.
                To inspect incident-specific marine currents and atmospheric winds, choose an incident from the dropdown above or navigate directly from an incident details page.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Coordinate Form (if custom sector selected and no incident chosen) */}
      {!selectedIncident && selectedSectorId === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-white border border-[#D8ECEC] text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase">Latitude:</span>
            <input
              type="number"
              step="0.001"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-28 px-2 py-1 bg-[#F2FAFA] border border-[#D8ECEC] rounded-md text-[#173B4D] font-bold"
            />
            <span className="text-slate-400">° N</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold uppercase">Longitude:</span>
            <input
              type="number"
              step="0.001"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              className="w-28 px-2 py-1 bg-[#F2FAFA] border border-[#D8ECEC] rounded-md text-[#173B4D] font-bold"
            />
            <span className="text-slate-400">° E</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Konkan study bounds: 14.0°–20.0° N, 68.0°–74.0° E
          </span>
        </div>
      )}

      {/* Notifications Bar */}
      {actionMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{actionMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-mono text-rose-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Layer Toggle Strip & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => toggleLayer('currents')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayers.currents
                ? 'bg-[#00C9C1] text-[#173B4D] border-[#00C9C1] font-bold shadow-2xs'
                : 'bg-[#F2FAFA] text-slate-600 border-[#D8ECEC] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">air</span>
            <span>Ocean Currents</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('winds')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayers.winds
                ? 'bg-[#00C9C1] text-[#173B4D] border-[#00C9C1] font-bold shadow-2xs'
                : 'bg-[#F2FAFA] text-slate-600 border-[#D8ECEC] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">storm</span>
            <span>10m Surface Wind</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLayer('waves')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeLayers.waves
                ? 'bg-[#00C9C1] text-[#173B4D] border-[#00C9C1] font-bold shadow-2xs'
                : 'bg-[#F2FAFA] text-slate-600 border-[#D8ECEC] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">water</span>
            <span>Significant Swell</span>
          </button>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold ${badge.color}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span className="uppercase text-[11px]">{badge.label}</span>
        </div>
      </div>

      {/* Main Environmental Telemetry Viewport Canvas */}
      <div className="bg-white rounded-xl border border-[#D8ECEC] p-6 sm:p-10 shadow-xs min-h-[420px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 font-mono text-xs gap-3">
            <span className="material-symbols-outlined text-4xl text-[#087E8B] animate-spin">
              autorenew
            </span>
            <span>Querying active telemetry feeds...</span>
          </div>
        ) : latestObs ? (
          <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
            {/* Header info: Explicit Telemetry Record ID vs Incident ID, Valid Time vs Retrieval Time */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-[#D8ECEC] gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EAF7F7] text-[#087E8B] border border-[#D8ECEC]">
                    Environmental Telemetry Record ID: #{latestObs.id}
                  </span>
                  {selectedIncident ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-[#173B4D] border border-slate-300">
                      Associated Incident: #{selectedIncident.id}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-slate-50 text-slate-600 border border-slate-200">
                      Scope: Sector-wide Regional Baseline
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#173B4D] font-display mt-0.5">
                  Provider: {latestObs.source || 'Open-Meteo Marine / Weather APIs'}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-600">
                  <span>
                    Telemetry Grid Coordinates: <strong className="text-[#173B4D]">{formatCoordinates(latestObs.latitude, latestObs.longitude)}</strong>
                  </span>
                  {selectedIncident && (
                    <span className={coordinateAlignment.isMatch ? "text-emerald-700 font-semibold" : "text-amber-700 font-semibold"}>
                      • {coordinateAlignment.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp Breakdown: Environmental Data Valid Time vs API Retrieval Time */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-end gap-1.5 text-left sm:text-right font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Data Valid Time (Model Forecast):
                  </span>
                  <span className="text-xs font-bold text-[#173B4D]">
                    {new Date(latestObs.observed_at).toLocaleString()}
                  </span>
                </div>
                <div className="pt-1 border-t border-[#D8ECEC]/60 sm:border-0 sm:pt-0">
                  <span className="text-[10px] text-slate-400 uppercase font-medium block">
                    API Ingestion / Retrieval Time:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {latestObs.retrieved_at ? new Date(latestObs.retrieved_at).toLocaleString() : 'Live Synchronous Polling'}
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              {/* Ocean Current */}
              <div className="p-4 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 font-bold mb-1">
                    <span>Ocean Current</span>
                    <span className="material-symbols-outlined text-[16px] text-[#087E8B]">air</span>
                  </div>
                  <div className="text-2xl font-bold text-[#173B4D] mt-1">
                    {latestObs.current_speed !== null ? `${Number(latestObs.current_speed).toFixed(2)} m/s` : 'N/A'}
                  </div>
                  <span className="text-xs text-slate-500">
                    {latestObs.current_speed !== null ? `≈ ${(Number(latestObs.current_speed) * 1.94384).toFixed(2)} knots` : ''}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#D8ECEC]/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Flow Direction</span>
                  <span className="font-bold text-[#173B4D]">{latestObs.current_direction || 0}°</span>
                </div>
              </div>

              {/* 10m Surface Wind */}
              <div className="p-4 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 font-bold mb-1">
                    <span>10m Surface Wind</span>
                    <span className="material-symbols-outlined text-[16px] text-[#087E8B]">storm</span>
                  </div>
                  <div className="text-2xl font-bold text-[#173B4D] mt-1">
                    {latestObs.wind_speed !== null ? `${Number(latestObs.wind_speed).toFixed(2)} m/s` : 'N/A'}
                  </div>
                  <span className="text-xs text-slate-500">
                    {latestObs.wind_speed !== null ? `≈ ${(Number(latestObs.wind_speed) * 1.94384).toFixed(2)} knots` : ''}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#D8ECEC]/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>From Direction</span>
                  <span className="font-bold text-[#173B4D]">{latestObs.wind_direction || 0}°</span>
                </div>
              </div>

              {/* Significant Wave */}
              <div className="p-4 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] uppercase text-slate-500 font-bold mb-1">
                    <span>Significant Swell</span>
                    <span className="material-symbols-outlined text-[16px] text-[#087E8B]">water</span>
                  </div>
                  <div className="text-2xl font-bold text-[#173B4D] mt-1">
                    {latestObs.wave_height !== null ? `${Number(latestObs.wave_height).toFixed(2)} m` : 'N/A'}
                  </div>
                  <span className="text-xs text-slate-500">
                    {latestObs.wave_height !== null ? 'Surface wave amplitude' : 'Wave height unavailable'}
                  </span>
                </div>
                <div className="mt-3 pt-2 border-t border-[#D8ECEC]/60 flex items-center justify-between text-[11px] text-slate-600">
                  <span>Unit Convention</span>
                  <span className="font-bold text-[#173B4D]">WMO Standard (m)</span>
                </div>
              </div>
            </div>

            {/* Observation Notes & Validation Status */}
            {latestObs.status_message && (
              <div className="p-3.5 rounded-lg bg-[#EAF7F7] border border-[#00C9C1]/40 text-xs font-mono text-[#173B4D] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#087E8B] text-[18px] shrink-0 mt-0.5">
                  info
                </span>
                <span className="leading-relaxed">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-[#087E8B] block">Validation Status</span>
                  {latestObs.status_message}
                </span>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon="air"
            title="Environmental Data Feeds Not Connected"
            description="Live hydrodynamic current vectors, satellite sea-surface temperatures, and meteorological buoy feeds require an active telemetry stream or database observation log."
            actionText={selectedIncident ? `Query Telemetry for Incident #${selectedIncident.id}` : "Query Live Telemetry for Pilot Harbour"}
            actionOnClick={() => handleQueryLiveTelemetry(false)}
            secondaryNote="Strict scientific protocol: No fabricated ocean currents or weather measurements are generated."
          />
        )}
      </div>

      {/* Sensor Channel Status Grid — Truthful Statuses */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Open-Meteo Marine API */}
        <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-slate-500 uppercase font-semibold">Open-Meteo Marine API</span>
            <span className={latestObs && latestObs.current_speed !== null ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold'}>
              {latestObs && latestObs.current_speed !== null ? 'Live Active' : 'Standby'}
            </span>
          </div>
          <div className="text-sm font-bold text-[#173B4D] font-display">
            Copernicus Global Ocean 1/12°
          </div>
          <p className="text-xs text-slate-500 mt-1">Surface hydrodynamic current velocities (u/v) &amp; wave heights</p>
        </div>

        {/* Open-Meteo Weather API */}
        <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-slate-500 uppercase font-semibold">Open-Meteo Weather API</span>
            <span className={latestObs && latestObs.wind_speed !== null ? 'text-emerald-700 font-bold' : 'text-amber-600 font-bold'}>
              {latestObs && latestObs.wind_speed !== null ? 'Live Active' : 'Standby'}
            </span>
          </div>
          <div className="text-sm font-bold text-[#173B4D] font-display">
            10m Atmospheric Boundary Layer
          </div>
          <p className="text-xs text-slate-500 mt-1">Wind vectors used for gear leeway advection calculations</p>
        </div>

        {/* Copernicus Marine (CMEMS) - Truthfully documented as Alternative/Tested */}
        <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono mb-1">
            <span className="text-slate-500 uppercase font-semibold">Copernicus Marine Direct</span>
            <span className="text-slate-500 font-semibold text-[11px]">Optional / Tested</span>
          </div>
          <div className="text-sm font-bold text-[#173B4D] font-display">Secondary NetCDF Archive</div>
          <p className="text-xs text-slate-500 mt-1">
            Prior NetCDF test files had masked/null uo/vo nearshore values; Open-Meteo is primary.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalIntelligence;
