import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import EmptyState from '../../components/ngo/EmptyState';
import {
  getEligibleVerifiedIncidents,
  getMarineConditions,
  generateDriftForecast,
  getLatestDriftForecast,
} from '../../services/driftService';
import { getReportById } from '../../services/ngoService';
import {
  getStoredIncidentId,
  setStoredIncidentId,
  clearStoredIncidentId,
  resolveInitialIncidentId,
} from '../../utils/incidentStorage';

/**
 * Primary project study boundary for Eastern Arabian Sea / Konkan Shelf (Maharashtra & Goa, India).
 * Coordinates: 14.0° N to 20.0° N, 68.0° E to 74.0° E
 */
const STUDY_BOUNDARY = {
  name: 'Eastern Arabian Sea / Konkan Shelf',
  bounds: [
    [14.0, 68.0],
    [20.0, 74.0],
  ],
};

/**
 * Benchmark pilot coordinates for Mirkarwada Fishing Harbour, Ratnagiri, Maharashtra, India.
 */
const PILOT_COORDINATES = {
  lat: 16.99,
  lng: 73.30,
  name: 'Mirkarwada Fishing Harbour',
  region: 'Ratnagiri, Maharashtra, India',
};


/**
 * Format coordinates to readable degrees with hemisphere indicator.
 */
function formatCoordinates(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) return 'N/A';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lon).toFixed(6)}° ${lonDir}`;
}

/**
 * Direction in degrees to cardinal string (e.g. 180 -> S, 225 -> SW).
 */
function degreesToCardinal(deg) {
  if (deg === null || deg === undefined) return 'N/A';
  const val = Math.floor((deg / 22.5) + 0.5);
  const arr = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return arr[val % 16];
}

/**
 * Scientific windage factor presets by gear type (fraction of 10m wind velocity transferred to leeway).
 * Corresponds to backend DEFAULT_GEAR_WINDAGE in drift_service.py.
 */
const RECOMMENDED_GEAR_WINDAGE = {
  gillnet: 2.5,
  trawl: 1.5,
  longline: 2.0,
  traps: 0.0,
  pot: 0.0,
  fad: 4.0,
  purse_seine: 2.5,
  other: 2.0,
};

function getRecommendedWindage(gearType, isSubmerged) {
  if (isSubmerged) return 0.0;
  const gt = (gearType || '').toLowerCase();
  for (const [key, val] of Object.entries(RECOMMENDED_GEAR_WINDAGE)) {
    if (gt.includes(key)) return val;
  }
  return 2.5;
}

/**
 * Leaflet DivIcon for Original Reported Loss Location.
 */
function createReportedLossIcon() {
  return L.divIcon({
    className: 'custom-reported-loss-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -3px; border-radius: 9999px; background-color: rgba(0, 201, 193, 0.4); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background-color: #087E8B; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(23, 59, 77, 0.4); display: flex; align-items: center; justify-content: center; color: white;">
          <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

/**
 * Leaflet DivIcon for Forecast Position Steps.
 */
function createForecastStepIcon(isTerminal = false, stepNumber = 0) {
  if (isTerminal) {
    return L.divIcon({
      className: 'custom-terminal-step-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
          <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(245, 158, 11, 0.5); animation: ping 1.8s infinite;"></span>
          <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #D97706; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(217, 119, 6, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; font-family: monospace;">
            ${stepNumber}h
          </div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });
  }

  return L.divIcon({
    className: 'custom-intermediate-step-marker',
    html: `
      <div style="position: relative; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 14px; height: 14px; border-radius: 9999px; background-color: #F59E0B; border: 2px solid #FFFFFF; box-shadow: 0 2px 5px rgba(245, 158, 11, 0.4); display: flex; align-items: center; justify-content: center;">
          <div style="width: 4px; height: 4px; border-radius: 9999px; background-color: #78350F;"></div>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

/**
 * Leaflet DivIcon for Estimated Shoreline Grounding.
 */
function createGroundedStepIcon(stepNumber = 0) {
  return L.divIcon({
    className: 'custom-grounded-step-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(225, 29, 72, 0.4); animation: ping 2s infinite;"></span>
        <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background-color: #BE123C; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(190, 18, 60, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; font-family: monospace;">
          ⚡${stepNumber}h
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

/**
 * Leaflet DivIcon for Hypothetical Post-Grounding Projections.
 */
function createHypotheticalStepIcon(stepNumber = 0) {
  return L.divIcon({
    className: 'custom-hypothetical-step-marker',
    html: `
      <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 12px; height: 12px; border-radius: 9999px; background-color: #E2E8F0; border: 1.5px dashed #94A3B8; display: flex; align-items: center; justify-content: center;">
          <div style="width: 4px; height: 4px; border-radius: 9999px; background-color: #64748B;"></div>
        </div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });
}

/**
 * Leaflet DivIcon for Mirkarwada Pilot Harbour Benchmark.
 */
const pilotHarbourIcon = L.divIcon({
  className: 'custom-pilot-harbour-marker',
  html: `
    <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 26px; height: 26px; border-radius: 8px; background-color: #173B4D; border: 2px solid #00C9C1; box-shadow: 0 3px 6px rgba(23, 59, 77, 0.35); display: flex; align-items: center; justify-content: center; color: #00C9C1;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v20m0 0a8 8 0 01-8-8h2a6 6 0 0012 0h2a8 8 0 01-8 8zm0-16a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

/**
 * Map controller to handle animated flight and bounding box fits.
 */
function MapController({ flyTarget, boundsTarget }) {
  const map = useMap();

  useEffect(() => {
    if (flyTarget && flyTarget.length === 2 && !isNaN(flyTarget[0]) && !isNaN(flyTarget[1])) {
      map.flyTo(flyTarget, 12, { duration: 1.2 });
    }
  }, [flyTarget, map]);

  useEffect(() => {
    if (boundsTarget && boundsTarget.length > 0) {
      map.fitBounds(boundsTarget, { padding: [50, 50], maxZoom: 14 });
    }
  }, [boundsTarget, map]);

  return null;
}

/**
 * Screen 7 — Drift Forecasting Module
 * Connects verified incidents with Open-Meteo Marine environmental intelligence
 * and computes Lagrangian advection drift trajectories over time.
 */
export const DriftForecasting = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Active incident ID ref for cancelling/ignoring stale async responses
  const activeIncidentIdRef = useRef(null);

  // State
  const [eligibleIncidents, setEligibleIncidents] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(() =>
    resolveInitialIncidentId(searchParams, location.state)
  );
  const [selectedIncident, setSelectedIncident] = useState(
    location.state?.incident &&
    location.state.incident.id === resolveInitialIncidentId(searchParams, location.state)
      ? location.state.incident
      : null
  );

  const [durationHours, setDurationHours] = useState(24);
  const [windage, setWindage] = useState(2.5); // %
  const [forceSimulation, setForceSimulation] = useState(false);

  // Environmental conditions state
  const [envConditions, setEnvConditions] = useState(null);
  const [loadingEnv, setLoadingEnv] = useState(false);

  // Forecast computation & persistence state
  const [forecastSummary, setForecastSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [incidentErrorMessage, setIncidentErrorMessage] = useState('');

  // Map state
  const [flyTarget, setFlyTarget] = useState([PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]);
  const [boundsTarget, setBoundsTarget] = useState(null);

  // 1. Load eligible verified incidents with deterministic selection policy:
  // (1) URL search params (?incidentId=...)
  // (2) Navigation location state
  // (3) Restored from persistent storage (sessionStorage/localStorage)
  // (4) null ("No incident selected" state — NEVER silently default to #292 or arbitrary incident)
  const loadEligibleIncidents = async () => {
    try {
      const data = await getEligibleVerifiedIncidents();
      const list = data || [];
      setEligibleIncidents(list);

      const targetId = resolveInitialIncidentId(searchParams, location.state);

      if (targetId) {
        const match = list.find((i) => i.id === Number(targetId));
        if (match) {
          activeIncidentIdRef.current = match.id;
          setSelectedIncidentId(match.id);
          setSelectedIncident(match);
          setStoredIncidentId(match.id);
          setIncidentErrorMessage('');
          if (searchParams.get('incidentId') !== String(match.id)) {
            setSearchParams({ incidentId: match.id }, { replace: true });
          }
        } else {
          // If not in eligible verified list, verify if it exists and why it's not eligible
          try {
            const report = await getReportById(targetId);
            if (report) {
              if (report.status === 'verified') {
                setEligibleIncidents((prev) => [report, ...prev.filter((p) => p.id !== report.id)]);
                activeIncidentIdRef.current = report.id;
                setSelectedIncidentId(report.id);
                setSelectedIncident(report);
                setStoredIncidentId(report.id);
                setIncidentErrorMessage('');
                if (searchParams.get('incidentId') !== String(report.id)) {
                  setSearchParams({ incidentId: report.id }, { replace: true });
                }
              } else {
                activeIncidentIdRef.current = null;
                setSelectedIncidentId(null);
                setSelectedIncident(null);
                clearStoredIncidentId();
                setIncidentErrorMessage(
                  `Incident #${targetId} is currently "${report.status}". Drift forecasting requires an approved "verified" incident. Please select a verified incident.`
                );
                if (searchParams.get('incidentId')) {
                  setSearchParams({}, { replace: true });
                }
              }
            } else {
              activeIncidentIdRef.current = null;
              setSelectedIncidentId(null);
              setSelectedIncident(null);
              clearStoredIncidentId();
              setIncidentErrorMessage(`Incident #${targetId} was not found in the operational database. Please select a valid incident.`);
              if (searchParams.get('incidentId')) {
                setSearchParams({}, { replace: true });
              }
            }
          } catch (err) {
            activeIncidentIdRef.current = null;
            setSelectedIncidentId(null);
            setSelectedIncident(null);
            clearStoredIncidentId();
            setIncidentErrorMessage(`Incident #${targetId} is unavailable or invalid. Please select a verified incident.`);
            if (searchParams.get('incidentId')) {
              setSearchParams({}, { replace: true });
            }
          }
        }
      } else {
        // No incident selected — show clear unselected state without fallback
        activeIncidentIdRef.current = null;
        setSelectedIncidentId(null);
        setSelectedIncident(null);
        setIncidentErrorMessage('');
      }
    } catch (err) {
      console.warn('Failed to fetch eligible verified incidents:', err.message);
    }
  };

  useEffect(() => {
    loadEligibleIncidents();
  }, [searchParams.get('incidentId')]);

  // 2. When selected incident changes, load environmental conditions & existing forecast
  useEffect(() => {
    if (!selectedIncidentId) {
      activeIncidentIdRef.current = null;
      setSelectedIncident(null);
      setEnvConditions(null);
      setForecastSummary(null);
      return;
    }

    const currentInc = eligibleIncidents.find((i) => i.id === Number(selectedIncidentId));
    if (currentInc) {
      activeIncidentIdRef.current = currentInc.id;
      setSelectedIncident(currentInc);
      setFlyTarget([currentInc.latitude, currentInc.longitude]);

      // Initialize windage from gear configuration
      const rec = getRecommendedWindage(currentInc.gear_type, currentInc.submerged);
      setWindage(rec);

      // Load conditions and forecast for currentInc.id
      loadConditions(currentInc.id, currentInc.latitude, currentInc.longitude, currentInc.reported_at, forceSimulation);
      loadExistingForecast(currentInc.id);
    }
  }, [selectedIncidentId, eligibleIncidents, forceSimulation]);

  const loadConditions = async (incidentId, lat, lon, targetTime, isSim) => {
    try {
      setLoadingEnv(true);
      setErrorMessage('');
      const data = await getMarineConditions(lat, lon, targetTime, isSim);
      if (activeIncidentIdRef.current === incidentId) {
        setEnvConditions(data);
      }
    } catch (err) {
      if (activeIncidentIdRef.current === incidentId) {
        console.warn('Failed to load marine conditions:', err.message);
        setErrorMessage(`Environmental telemetry unavailable: ${err.message}`);
      }
    } finally {
      if (activeIncidentIdRef.current === incidentId) {
        setLoadingEnv(false);
      }
    }
  };

  const loadExistingForecast = async (reportId) => {
    try {
      const saved = await getLatestDriftForecast(reportId);
      if (activeIncidentIdRef.current === reportId) {
        if (saved && Number(saved.report_id) === Number(reportId) && saved.points && saved.points.length > 0) {
          setForecastSummary(saved);
          if (saved.windage !== undefined && saved.windage !== null) {
            setWindage(Number((saved.windage * 100).toFixed(1)));
          }
          fitMapToTrajectory(saved);
        } else {
          setForecastSummary(null);
        }
      }
    } catch (err) {
      if (activeIncidentIdRef.current === reportId) {
        setForecastSummary(null);
      }
    }
  };

  // Handle explicit user selection from dropdown
  const handleSelectIncident = (incId) => {
    setErrorMessage('');
    setStatusMessage('');
    setIncidentErrorMessage('');

    if (!incId) {
      activeIncidentIdRef.current = null;
      setSelectedIncidentId(null);
      setSelectedIncident(null);
      setForecastSummary(null);
      setEnvConditions(null);
      clearStoredIncidentId();
      setSearchParams({}, { replace: true });
      return;
    }

    const numId = Number(incId);
    activeIncidentIdRef.current = numId;
    setSelectedIncidentId(numId);
    setStoredIncidentId(numId);
    setSearchParams({ incidentId: numId }, { replace: true });

    // Instantly reset telemetry and forecast to prevent displaying stale cross-incident data
    setEnvConditions(null);
    setForecastSummary(null);

    const match = eligibleIncidents.find((i) => i.id === numId);
    if (match) {
      setSelectedIncident(match);
      setFlyTarget([match.latitude, match.longitude]);
      const rec = getRecommendedWindage(match.gear_type, match.submerged);
      setWindage(rec);
      loadConditions(match.id, match.latitude, match.longitude, match.reported_at, forceSimulation);
      loadExistingForecast(match.id);
    }
  };

  // 3. Fit map to include both reported origin and all forecast points
  const fitMapToTrajectory = (summary) => {
    if (!summary || !summary.points || summary.points.length === 0) return;
    const bounds = summary.points.map((pt) => [pt.latitude, pt.longitude]);
    bounds.push([summary.start_latitude, summary.start_longitude]);
    bounds.push([PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]);
    setBoundsTarget(bounds);
  };

  // 4. Handle generate or regenerate forecast
  const handleGenerateForecast = async () => {
    if (!selectedIncident) return;
    try {
      setCalculating(true);
      setErrorMessage('');
      setStatusMessage('');

      const res = await generateDriftForecast({
        report_id: selectedIncident.id,
        duration_hours: durationHours,
        time_step_hours: 1,
        windage: windage / 100.0,
        force_simulation: forceSimulation,
      });

      setForecastSummary(res);
      setStatusMessage(
        `Drift trajectory calculated: ${res.points_count} positions saved across ${res.duration_hours}h (${
          res.simulation_mode ? 'Simulated Model' : 'Live Environmental Telemetry'
        }).`
      );
      fitMapToTrajectory(res);
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (err) {
      console.error('Forecast calculation failed:', err);
      setErrorMessage(err.message || 'Failed to generate drift trajectory.');
    } finally {
      setCalculating(false);
    }
  };

  // Trajectory polyline coordinates: active offshore drift vs hypothetical post-grounding projection
  const { activePolylineCoords, hypotheticalPolylineCoords } = useMemo(() => {
    if (!forecastSummary || !forecastSummary.points || forecastSummary.points.length === 0) {
      return { activePolylineCoords: [], hypotheticalPolylineCoords: [] };
    }
    const origin = [forecastSummary.start_latitude, forecastSummary.start_longitude];
    const groundingStep = forecastSummary.grounding_detected ? forecastSummary.grounding_step : null;

    const active = [origin];
    const hypothetical = [];

    forecastSummary.points.forEach((pt) => {
      const coord = [pt.latitude, pt.longitude];
      if (groundingStep !== null && groundingStep !== undefined) {
        if (pt.step_index <= groundingStep) {
          active.push(coord);
        }
        if (pt.step_index >= groundingStep) {
          hypothetical.push(coord);
        }
      } else {
        active.push(coord);
      }
    });

    return { activePolylineCoords: active, hypotheticalPolylineCoords: hypothetical };
  }, [forecastSummary]);

  return (
    <div className="flex flex-col w-full gap-6 ocean-leaflet-map">
      {/* Operational Breadcrumb & Header Context */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span className="uppercase text-[#087E8B] font-semibold">Operations</span>
            <span>/</span>
            <span className="text-slate-400">Hydrodynamic Forecasting</span>
            <span>/</span>
            <span className="text-[#173B4D] font-bold">Lagrangian Particle Advection</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#173B4D] tracking-tight">
              Drift Forecasting
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF7F7] border border-[#00C9C1]/40 text-[#087E8B] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#087E8B]"></span>
              <span>Lagrangian Advection V2.1</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Estimate the geographic dispersal corridor of confirmed fishing gear from reported loss coordinates
            driven by ocean surface current vectors.
          </p>
        </div>

        {/* Global Controls & Incident Selector */}
        <div className="flex flex-wrap items-center gap-2.5 p-2 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs font-mono">
            <span className="material-symbols-outlined text-[#087E8B] text-[16px]">verified</span>
            <select
              value={selectedIncidentId || ''}
              onChange={(e) => handleSelectIncident(e.target.value)}
              className="bg-transparent text-[#173B4D] font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Select an incident...</option>
              {eligibleIncidents.map((inc) => (
                <option key={inc.id} value={inc.id}>
                  Incident #{inc.id} — {inc.gear_type.replace(/_/g, ' ').toUpperCase()} ({inc.latitude.toFixed(2)}°, {inc.longitude.toFixed(2)}°)
                </option>
              ))}
            </select>
          </div>

          {/* Duration Buttons */}
          <div className="flex items-center gap-1 bg-[#F2FAFA] p-1 rounded-lg border border-[#D8ECEC] text-xs font-mono">
            {[6, 12, 24, 48].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationHours(d)}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  durationHours === d
                    ? 'bg-[#00C9C1] text-[#173B4D] font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-[#173B4D]'
                }`}
              >
                {d}h
              </button>
            ))}
          </div>

          {/* Re-center button */}
          <button
            type="button"
            onClick={() => {
              if (selectedIncident) {
                setFlyTarget([selectedIncident.latitude, selectedIncident.longitude]);
              } else {
                setFlyTarget([PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]);
              }
            }}
            title="Recenter on Incident Origin"
            className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-[#087E8B] text-xs font-mono flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">my_location</span>
            <span>Origin</span>
          </button>
        </div>
      </div>

      {/* Advisory Notice */}
      <div className="p-3.5 rounded-xl bg-[#F2FAFA] border border-[#00C9C1]/30 text-xs flex items-start gap-3 shadow-2xs">
        <span className="material-symbols-outlined text-[#087E8B] text-lg mt-0.5 flex-shrink-0">
          info
        </span>
        <div className="flex flex-col gap-0.5 leading-relaxed text-[#173B4D]">
          <span className="font-bold font-mono uppercase text-[11px] text-[#087E8B] tracking-wider">
            Important Scientific Estimation Notice
          </span>
          <p className="text-slate-600 text-xs">
            Calculated trajectories represent an estimate of possible pelagic movement using ocean surface advection
            dynamics. <strong>A forecast is an operational estimate, not proof of actual gear location at sea.</strong> Real recovery requires field validation, search sensors, and visual confirmation.
          </p>
        </div>
      </div>

      {/* Success / Status Message */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2 shadow-2xs">
          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Incident Ineligible / Not Found Warning */}
      {incidentErrorMessage && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-700 text-base">warning</span>
            <span className="font-mono">{incidentErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectIncident('')}
            className="underline font-bold text-xs hover:text-amber-950 cursor-pointer font-mono"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => {
              if (selectedIncident) {
                loadConditions(selectedIncident.id, selectedIncident.latitude, selectedIncident.longitude, selectedIncident.reported_at, forceSimulation);
              }
            }}
            className="underline font-bold text-xs hover:text-amber-950 cursor-pointer"
          >
            Retry Telemetry
          </button>
        </div>
      )}

      {/* Main 12-Column Simulation Viewport Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area (8 cols): Trajectory Map Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative w-full h-[560px] rounded-xl overflow-hidden border border-[#D8ECEC] bg-white shadow-xs">
            {!selectedIncident ? (
              <div className="w-full h-full flex items-center justify-center p-6 bg-white">
                <EmptyState
                  icon="explore"
                  title="No Incident Selected"
                  description="Select an approved incident from the verified incidents dropdown to inspect its reported coordinates and compute hydrodynamic drift trajectory envelopes."
                  actionText="Review Incident Queue"
                  actionLink="/ngo/incidents"
                  secondaryNote="Operational protocol: Only verified incident targets can be modeled."
                />
              </div>
            ) : (
              <>
                <MapContainer
                  center={[selectedIncident.latitude, selectedIncident.longitude]}
                  zoom={11}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                  style={{ minHeight: '560px' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapController flyTarget={flyTarget} boundsTarget={boundsTarget} />

                  {/* 1. Pilot Harbour Benchmark */}
                  <Marker
                    position={[PILOT_COORDINATES.lat, PILOT_COORDINATES.lng]}
                    icon={pilotHarbourIcon}
                  >
                    <Popup>
                      <div className="p-2.5 flex flex-col gap-1 text-xs max-w-xs font-sans">
                        <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold">
                          Pilot Harbour Base
                        </span>
                        <h4 className="font-bold text-[#173B4D] text-sm">{PILOT_COORDINATES.name}</h4>
                        <span className="font-mono text-[11px] text-slate-500">
                          {PILOT_COORDINATES.lat.toFixed(4)}° N, {PILOT_COORDINATES.lng.toFixed(4)}° E
                        </span>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -28]}>
                      <span className="font-mono text-xs">Pilot Base: Mirkarwada</span>
                    </Tooltip>
                  </Marker>

                  {/* 1. Project Study Boundary Overlay */}
                  <Rectangle

                    bounds={STUDY_BOUNDARY.bounds}
                    pathOptions={{
                      color: '#087E8B',
                      weight: 1.5,
                      dashArray: '5, 8',
                      fillColor: '#00C9C1',
                      fillOpacity: 0.03,
                    }}
                  >
                    <Tooltip sticky>
                      <div className="font-mono text-xs">
                        <span className="font-bold text-[#087E8B] block">{STUDY_BOUNDARY.name}</span>
                        <span className="text-[10px] text-slate-500">Bounding Box: 14.0°–20.0° N, 68.0°–74.0° E</span>
                      </div>
                    </Tooltip>
                  </Rectangle>


                  {/* 2. Reported Loss Origin Marker */}
                  <Marker
                    position={[selectedIncident.latitude, selectedIncident.longitude]}
                    icon={createReportedLossIcon()}
                  >
                    <Popup>
                      <div className="p-3 flex flex-col gap-2 text-xs max-w-xs font-sans">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#D8ECEC]">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#EAF7F7] text-[#087E8B]">
                            Reported Loss Location
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-700">
                            {selectedIncident.status}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold font-display text-sm text-[#173B4D] capitalize">
                            Incident #{selectedIncident.id} ({selectedIncident.gear_type.replace(/_/g, ' ')})
                          </h4>
                          <span className="text-slate-500 font-mono text-[11px]">
                            Reported: {new Date(selectedIncident.reported_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC] font-mono text-[11px] text-[#173B4D]">
                          {formatCoordinates(selectedIncident.latitude, selectedIncident.longitude)}
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          Initial starting coordinate for trajectory integration.
                        </span>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -32]}>
                      <span className="font-mono text-xs font-bold text-[#087E8B]">
                        Reported Loss: #{selectedIncident.id}
                      </span>
                    </Tooltip>
                  </Marker>

                  {/* 3. Predicted Drift Trajectory Polylines */}
                  {activePolylineCoords.length > 1 && (
                    <Polyline
                      positions={activePolylineCoords}
                      color="#D97706"
                      weight={3.5}
                      dashArray="6, 8"
                      opacity={0.9}
                    />
                  )}
                  {hypotheticalPolylineCoords.length > 1 && (
                    <Polyline
                      positions={hypotheticalPolylineCoords}
                      color="#94A3B8"
                      weight={2.5}
                      dashArray="3, 6"
                      opacity={0.65}
                    />
                  )}

                  {/* 4. Forecast Step Position Markers */}
                  {forecastSummary &&
                    forecastSummary.points &&
                    forecastSummary.points.map((pt, idx) => {
                      // Skip step 0 since it overlaps with the Reported Loss origin marker
                      if (pt.step_index === 0) return null;
                      const isGrounded = forecastSummary.grounding_detected && pt.step_index === forecastSummary.grounding_step;
                      const isPostGrounding = forecastSummary.grounding_detected && pt.step_index > forecastSummary.grounding_step;
                      const isTerminal = !forecastSummary.grounding_detected && idx === forecastSummary.points.length - 1;

                      let icon;
                      if (isGrounded) {
                        icon = createGroundedStepIcon(pt.step_index);
                      } else if (isPostGrounding) {
                        icon = createHypotheticalStepIcon(pt.step_index);
                      } else {
                        icon = createForecastStepIcon(isTerminal, pt.step_index);
                      }

                      return (
                        <Marker
                          key={pt.id || idx}
                          position={[pt.latitude, pt.longitude]}
                          icon={icon}
                        >
                          <Popup>
                            <div className="p-3 flex flex-col gap-2 text-xs max-w-xs font-sans">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#D8ECEC]">
                                <span className={`font-mono font-bold text-xs ${
                                  isGrounded ? 'text-rose-700' : isPostGrounding ? 'text-slate-500' : 'text-amber-700'
                                }`}>
                                  {isGrounded ? `⚡ Grounding Contact #${pt.step_index}` : isPostGrounding ? `Hypothetical #${pt.step_index}` : `Forecast Step #${pt.step_index}`} (+{pt.step_index}h)
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                    isPostGrounding
                                      ? 'bg-slate-100 text-slate-600 border border-slate-300'
                                      : isGrounded
                                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                        : pt.simulation_mode
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-teal-50 text-teal-800 border border-teal-200'
                                  }`}
                                >
                                  {isPostGrounding ? 'Hypothetical' : isGrounded ? 'Landfall' : pt.simulation_mode ? 'Simulated' : 'Real Telemetry'}
                                </span>
                              </div>

                              {isGrounded && (
                                <div className="p-2 rounded bg-rose-50 border border-rose-300 font-mono text-[10px] text-rose-900 font-bold uppercase tracking-wider text-center">
                                  ESTIMATED GROUNDING — PELAGIC DRIFT CEASES
                                </div>
                              )}

                              {isPostGrounding && (
                                <div className="p-2 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700 font-bold uppercase tracking-wider text-center">
                                  HYPOTHETICAL POST-GROUNDING AUDIT PROJECTION
                                </div>
                              )}

                              {isTerminal && (
                                <div className="p-2 rounded bg-amber-50 border border-amber-300 font-mono text-[10px] text-amber-900 font-bold uppercase tracking-wider text-center">
                                  PROTOTYPE ESTIMATE — NOT CONFIRMED GEAR LOCATION
                                </div>
                              )}

                                <div className="space-y-1 font-mono text-[11px] text-slate-700">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Drift Status:</span>
                                    <span className={`font-semibold uppercase text-[10px] ${
                                      isGrounded ? 'text-rose-700 font-bold' : isPostGrounding ? 'text-slate-500' : 'text-emerald-700'
                                    }`}>
                                      {pt.drift_status ? pt.drift_status.replace(/_/g, ' ') : (isGrounded ? 'Grounded' : isPostGrounding ? 'Hypothetical' : 'Active Drift')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Timestamp:</span>
                                    <span className="font-semibold text-[#173B4D]">
                                      {new Date(pt.forecast_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">
                                      {isPostGrounding ? 'Hypothetical Disp:' : 'Displacement:'}
                                    </span>
                                    <span className="font-semibold text-[#087E8B]">{pt.distance_km} km</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Ocean Current:</span>
                                    <span className="font-semibold">{pt.current_speed} m/s ({pt.current_direction}°)</span>
                                  </div>
                                  {pt.wind_speed !== null && pt.wind_speed !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">10m Wind:</span>
                                      <span className="font-semibold">{pt.wind_speed} m/s (from {pt.wind_direction}°)</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Wind-Driven Leeway:</span>
                                    <span className="font-semibold text-cyan-800">
                                      {pt.leeway_speed !== undefined && pt.leeway_speed !== null
                                        ? `${pt.leeway_speed} m/s (${pt.leeway_direction}°)`
                                        : `${((pt.wind_speed || 0) * (forecastSummary?.windage || 0.025)).toFixed(3)} m/s`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-0.5 border-t border-[#D8ECEC]">
                                    <span className="text-slate-700 font-semibold">Combined Surface Drift:</span>
                                    <span className="font-bold text-[#173B4D]">
                                      {pt.drift_speed !== undefined && pt.drift_speed !== null
                                        ? `${pt.drift_speed} m/s (${pt.drift_direction}°)`
                                        : `${pt.current_speed} m/s`}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Drift Components (u, v):</span>
                                    <span>u: {pt.drift_u !== undefined ? pt.drift_u : pt.current_u} • v: {pt.drift_v !== undefined ? pt.drift_v : pt.current_v} m/s</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Coastal Boundary:</span>
                                    <span className={isGrounded ? "text-rose-700 font-bold" : pt.boundary_contained ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                                      {isGrounded ? "Shoreline Grounding" : pt.boundary_contained ? "Within Bounds" : "Exceeded Bounds"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Risk Metric:</span>
                                    <span className="font-semibold text-amber-700">
                                      {pt.risk_score !== null && pt.risk_score !== undefined ? `${pt.risk_score} / 100` : 'N/A (Grounded)'}
                                    </span>
                                  </div>
                                </div>

                              <div className="p-1.5 rounded bg-[#F2FAFA] border border-[#D8ECEC] font-mono text-[10px] text-slate-600 truncate">
                                {formatCoordinates(pt.latitude, pt.longitude)}
                              </div>

                              {isGrounded && (
                                <p className="text-[10px] text-rose-700 italic">
                                  Preserved model coordinates at shoreline intersection. Grounding estimate only — does not confirm physical recovery.
                                </p>
                              )}
                              {isPostGrounding && (
                                <p className="text-[10px] text-slate-500 italic">
                                  Retained for audit. Particle drift terminates upon shoreline contact.
                                </p>
                              )}
                            </div>
                          </Popup>
                          <Tooltip direction="top" offset={[0, -14]}>
                            <span className="font-mono text-[10px]">
                              {isGrounded
                                ? `+${pt.step_index}h: ESTIMATED GROUNDING (${formatCoordinates(pt.latitude, pt.longitude)})`
                                : isPostGrounding
                                  ? `+${pt.step_index}h: [Hypothetical] (${formatCoordinates(pt.latitude, pt.longitude)})`
                                  : `+${pt.step_index}h: ${pt.distance_km}km (${formatCoordinates(pt.latitude, pt.longitude)})`}
                            </span>
                          </Tooltip>
                        </Marker>
                      );
                    })}

                </MapContainer>

                {/* Floating Glassmorphism Map Legend */}
                <div className="absolute bottom-4 right-4 z-[1000] p-3 rounded-xl bg-white/95 backdrop-blur-md border border-[#D8ECEC] shadow-md text-xs font-mono flex flex-col gap-2 max-w-[280px]">
                  <div className="flex items-center justify-between pb-1 border-b border-[#D8ECEC]">
                    <span className="font-bold text-[#173B4D] uppercase text-[10px] tracking-wider">
                      Drift Vector Legend
                    </span>
                    <span className="w-2 h-2 rounded-full bg-[#00C9C1]"></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#087E8B] border border-white shadow-2xs flex-shrink-0"></div>
                    <span className="text-[11px] text-[#173B4D] font-medium leading-tight">
                      Reported Loss (Mariner GPS)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-0.5 border-t-2 border-dashed border-amber-600 flex-shrink-0"></div>
                    <span className="text-[11px] text-amber-800 font-medium leading-tight">
                      Valid Drift Trajectory (Offshore)
                    </span>
                  </div>

                  {forecastSummary?.grounding_detected && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#BE123C] border border-white flex-shrink-0"></div>
                        <span className="text-[11px] text-rose-800 font-medium leading-tight">
                          Estimated Shoreline Contact
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-slate-400 flex-shrink-0"></div>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          Post-Grounding (Hypothetical)
                        </span>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-white flex-shrink-0"></div>
                    <span className="text-[11px] text-slate-700 leading-tight">
                      Forecast Step ({durationHours}h Envelope)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#173B4D] border border-[#00C9C1] flex-shrink-0 flex items-center justify-center text-cyan-300">
                      <span className="material-symbols-outlined text-[10px]">anchor</span>
                    </div>
                    <span className="text-[11px] text-slate-700 leading-tight">
                      Mirkarwada Pilot Harbour
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-5 h-2.5 border border-dashed border-[#087E8B] bg-[#00C9C1]/20 rounded-xs flex-shrink-0"></div>
                    <span className="text-[11px] text-slate-700 leading-tight">
                      Study Boundary (14°–20° N)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Trajectory Calculation Summary Metrics */}
          {forecastSummary && (
            <div className="flex flex-col gap-3">
              {/* Primary Hydro-Meteorological Drift Calculation Metrics (Audit-Aligned) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-xs text-xs font-mono">
                {/* 1. 10m Surface Wind */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-cyan-800">air</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">10m Surface Wind</span>
                  </div>
                  <span className="text-xl font-bold font-display text-cyan-900 mt-1">
                    {forecastSummary.wind_speed_avg !== null && forecastSummary.wind_speed_avg !== undefined
                      ? `${forecastSummary.wind_speed_avg} m/s`
                      : '0.00 m/s'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    From {forecastSummary.wind_direction_avg !== null && forecastSummary.wind_direction_avg !== undefined
                      ? `${forecastSummary.wind_direction_avg}° (${degreesToCardinal(forecastSummary.wind_direction_avg)})`
                      : 'N/A'} • {((forecastSummary.wind_speed_avg || 0) * 1.94384).toFixed(1)} kts
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">Environmental input</span>
                </div>

                {/* 2. Windage Factor */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-teal-600">tune</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Windage Factor</span>
                  </div>
                  <span className="text-xl font-bold font-display text-teal-800 mt-1">
                    {((forecastSummary.windage !== undefined && forecastSummary.windage !== null ? forecastSummary.windage : (windage / 100)) * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Ratio: {(forecastSummary.windage !== undefined && forecastSummary.windage !== null ? forecastSummary.windage : (windage / 100)).toFixed(4)}
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">
                    {forecastSummary.windage === 0 ? 'Submerged (no windage)' : 'Wind coupling factor'}
                  </span>
                </div>

                {/* 3. Wind-Driven Leeway */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#087E8B]">sailing</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Wind-Driven Leeway</span>
                  </div>
                  <span className="text-xl font-bold font-display text-[#087E8B] mt-1">
                    {(forecastSummary.leeway_speed_avg !== undefined && forecastSummary.leeway_speed_avg !== null
                      ? forecastSummary.leeway_speed_avg
                      : (forecastSummary.wind_speed_avg || 0) * (forecastSummary.windage || 0.025)
                    ).toFixed(3)} m/s
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Heading {forecastSummary.leeway_direction_avg !== undefined && forecastSummary.leeway_direction_avg !== null
                      ? `${forecastSummary.leeway_direction_avg}° (${degreesToCardinal(forecastSummary.leeway_direction_avg)})`
                      : 'downwind'}
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">Wind × Windage factor</span>
                </div>

                {/* 4. Ocean Current Speed */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#087E8B]">waves</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Ocean Current Speed</span>
                  </div>
                  <span className="text-xl font-bold font-display text-[#087E8B] mt-1">
                    {forecastSummary.current_speed_avg !== null && forecastSummary.current_speed_avg !== undefined
                      ? `${forecastSummary.current_speed_avg}`
                      : '0.00'} m/s
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Flow {forecastSummary.current_direction_avg !== null && forecastSummary.current_direction_avg !== undefined
                      ? `${forecastSummary.current_direction_avg}° (${degreesToCardinal(forecastSummary.current_direction_avg)})`
                      : 'N/A'} • {((forecastSummary.current_speed_avg || 0) * 1.94384).toFixed(1)} kts
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">Hydrodynamic advection</span>
                </div>

                {/* 5. Combined Surface Drift Speed */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#173B4D]">explore</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Combined Drift Speed</span>
                  </div>
                  <span className="text-xl font-bold font-display text-[#173B4D] mt-1">
                    {(forecastSummary.combined_drift_speed_avg !== undefined && forecastSummary.combined_drift_speed_avg !== null
                      ? forecastSummary.combined_drift_speed_avg
                      : (forecastSummary.current_speed_avg || 0)
                    ).toFixed(3)} m/s
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(((forecastSummary.combined_drift_speed_avg !== undefined && forecastSummary.combined_drift_speed_avg !== null
                      ? forecastSummary.combined_drift_speed_avg
                      : (forecastSummary.current_speed_avg || 0))) * 1.94384).toFixed(2)} kts
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">Net vector resultant</span>
                </div>

                {/* 6. Combined Drift Direction */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px] text-[#173B4D]">navigation</span>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Combined Drift Bearing</span>
                  </div>
                  <span className="text-xl font-bold font-display text-[#173B4D] mt-1">
                    {forecastSummary.combined_drift_direction_avg !== undefined && forecastSummary.combined_drift_direction_avg !== null
                      ? `${forecastSummary.combined_drift_direction_avg}°`
                      : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {forecastSummary.combined_drift_direction_avg !== undefined && forecastSummary.combined_drift_direction_avg !== null
                      ? degreesToCardinal(forecastSummary.combined_drift_direction_avg)
                      : 'N/A'} • atan2(u_drift, v_drift)
                  </span>
                  <span className="text-[9px] text-slate-400 italic mt-0.5">True movement track</span>
                </div>
              </div>

              {/* Secondary Trajectory Scope & Coastal Status Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-[#D8ECEC] shadow-xs text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">
                    {forecastSummary.grounding_detected ? 'Valid Drift Distance' : 'Total Drift Distance'}
                  </span>
                  <span className="text-lg font-bold font-display text-[#173B4D] mt-0.5">
                    {forecastSummary.total_path_distance_km ? `${forecastSummary.total_path_distance_km} km` : `${forecastSummary.total_displacement_km} km`}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {forecastSummary.grounding_detected
                      ? `To grounding • Net: ${forecastSummary.net_displacement_km} km`
                      : `Path arc • Net: ${forecastSummary.net_displacement_km || forecastSummary.total_displacement_km} km`}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Coastal / Boundary</span>
                  <span className={`text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded w-max ${
                    forecastSummary.grounding_detected
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : forecastSummary.boundary_contained
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-300'
                  }`}>
                    {forecastSummary.grounding_detected ? 'Estimated Grounding' : forecastSummary.boundary_contained ? 'Contained' : 'Exceeded'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {forecastSummary.grounding_detected
                      ? `Step #${forecastSummary.grounding_step} (+${forecastSummary.valid_drift_duration_hours || forecastSummary.grounding_step}h) • ${forecastSummary.valid_points_count || (forecastSummary.grounding_step + 1)}/${forecastSummary.points_count} valid`
                      : forecastSummary.boundary_contained
                        ? 'Konkan Shelf (14°–20°N)'
                        : `Exited at step #${forecastSummary.boundary_exit_step}`}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Trajectory Scope</span>
                  <span className="text-lg font-bold font-display text-[#173B4D] mt-0.5">
                    {forecastSummary.duration_hours || durationHours}h Envelope
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {forecastSummary.valid_points_count || forecastSummary.points_count} valid / {forecastSummary.points_count} total steps (1h interval)
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">DataSource Mode</span>
                  <span className={`text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded w-max ${
                    forecastSummary.simulation_mode
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {forecastSummary.simulation_mode ? 'Simulation' : 'Real Open-Meteo'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate mt-0.5" title={forecastSummary.source}>
                    {forecastSummary.source}
                  </span>
                </div>
              </div>

              {/* Expandable Scientific Formula & Vector Breakdown Banner */}
              <div className="bg-[#F2FAFA] border border-[#D8ECEC] rounded-xl p-3.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                  className="w-full flex items-center justify-between text-left text-[#173B4D] hover:text-[#087E8B] font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">functions</span>
                    <span>Scientific Drift Formulation &amp; Vector Calculation Pipeline</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#087E8B]">
                    <span>{showFormulaDetails ? 'Hide Scientific Formulation' : 'View Formula & Vector Pipeline'}</span>
                    <span className="material-symbols-outlined text-sm">
                      {showFormulaDetails ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                </button>

                {showFormulaDetails && (
                  <div className="mt-3 pt-3 border-t border-[#D8ECEC] space-y-3 text-slate-700 leading-relaxed">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded bg-white border border-[#D8ECEC]">
                        <span className="font-bold text-[#087E8B] block text-[11px] mb-1">
                          1. Wind-Driven Leeway Speed
                        </span>
                        <div className="font-mono bg-slate-50 p-1.5 rounded text-[11px] text-[#173B4D] border border-slate-200 mb-1">
                          V_leeway = V_wind_10m × Windage
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Couples 10m surface wind to gear freeboard. E.g. 1.55 m/s × 0.025 (2.5%) = <strong>0.03875 m/s</strong> (≈0.039 m/s).
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-white border border-[#D8ECEC]">
                        <span className="font-bold text-[#087E8B] block text-[11px] mb-1">
                          2. Meteorological Wind Direction
                        </span>
                        <div className="font-mono bg-slate-50 p-1.5 rounded text-[11px] text-[#173B4D] border border-slate-200 mb-1">
                          θ_downwind = (θ_wind_from + 180°) % 360°
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Wind FROM 356° pushes gear downwind toward <strong>176° (South-Southeast)</strong>, opposing northward current.
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-white border border-[#D8ECEC]">
                        <span className="font-bold text-[#087E8B] block text-[11px] mb-1">
                          3. Vector Summation &amp; Advection
                        </span>
                        <div className="font-mono bg-slate-50 p-1.5 rounded text-[11px] text-[#173B4D] border border-slate-200 mb-1">
                          u_drift = u_current + u_leeway<br/>
                          v_drift = v_current + v_leeway
                        </div>
                        <p className="text-[10px] text-slate-600">
                          Combined velocity: V_drift = √(u_drift² + v_drift²). Direction: θ = (atan2(u_drift, v_drift) + 360°) % 360°.
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-cyan-50/70 border border-cyan-200 text-[11px] text-cyan-950">
                      <strong>Incident #{selectedIncident?.id} Physics Trace:</strong> Ocean Current is {forecastSummary.current_speed_avg} m/s at {forecastSummary.current_direction_avg}°; 10m Wind is {forecastSummary.wind_speed_avg} m/s from {forecastSummary.wind_direction_avg}° producing {(forecastSummary.leeway_speed_avg !== undefined && forecastSummary.leeway_speed_avg !== null ? forecastSummary.leeway_speed_avg : ((forecastSummary.wind_speed_avg || 0) * (forecastSummary.windage || 0.025))).toFixed(3)} m/s leeway toward {forecastSummary.leeway_direction_avg !== undefined ? `${forecastSummary.leeway_direction_avg}°` : 'downwind'}. Resultant combined drift is {(forecastSummary.combined_drift_speed_avg !== undefined && forecastSummary.combined_drift_speed_avg !== null ? forecastSummary.combined_drift_speed_avg : (forecastSummary.current_speed_avg || 0)).toFixed(3)} m/s bearing {forecastSummary.combined_drift_direction_avg !== undefined ? `${forecastSummary.combined_drift_direction_avg}°` : 'N/A'}.
                    </div>
                  </div>
                )}
              </div>

              {/* Grounding Advisory Callout when Landfall is Predicted */}
              {forecastSummary.grounding_detected && (
                <div className="p-3.5 rounded-xl bg-rose-50/90 border border-rose-200 text-xs font-mono text-rose-950 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-rose-700 text-base shrink-0 mt-0.5">
                    warning
                  </span>
                  <div className="leading-relaxed">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-rose-900 block">
                        Estimated Grounding Advisory — Incident #{selectedIncident?.id}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-900 text-[9px] font-bold">
                        Step #{forecastSummary.grounding_step} (+{forecastSummary.valid_drift_duration_hours || forecastSummary.grounding_step}h)
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">
                      Estimated shoreline intersection detected at step #{forecastSummary.grounding_step} ({forecastSummary.valid_drift_duration_hours || forecastSummary.grounding_step}h post-loss).
                      Pelagic ocean drift ceases at this coastal contact point. Later numerical points (steps #{forecastSummary.grounding_step + 1}–{forecastSummary.points_count - 1}) are retained as unconstrained hypothetical audit projections and are not displayed as valid offshore drift.
                    </p>
                    <p className="mt-1 text-[11px] text-slate-600">
                      <strong className="text-slate-800">Model Limitation &amp; Qualification:</strong> Coastline boundary utilizes a regional 1D linear approximation of the Konkan coast. Local micro-bathymetry, tidal refloating, and breaking surf dynamics are not modeled. Grounding prediction is an automated decision-support estimate and does not confirm actual physical recovery or gear condition.
                    </p>
                  </div>
                </div>
              )}

              {/* Scientific Limitations & Trajectory Qualification Disclaimer */}
              <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs font-mono text-amber-950 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-700 text-base shrink-0 mt-0.5">
                  info
                </span>
                <div className="leading-relaxed">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-900 block">
                    Scientific Protocol &amp; Prototype Drift Qualifications
                  </span>
                  <p className="mt-0.5 text-slate-700">
                    {forecastSummary.limitations || (
                      "Prototype drift estimate combining Open-Meteo surface currents with downwind leeway. " +
                      "Positions designate high-probability dispersal corridors, not guaranteed recovery coordinates. " +
                      "Stokes drift and bathymetric friction are not explicitly modeled."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Area (4 cols): Target Inspection & Simulation Controls */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Selected Incident Telemetry Card */}
          {selectedIncident && (
            <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#087E8B] font-bold">
                  Target Inspection
                </span>
                <Link
                  to={`/ngo/incidents/${selectedIncident.id}`}
                  className="text-xs text-[#087E8B] hover:text-[#00C9C1] font-semibold flex items-center gap-0.5"
                >
                  <span>Record #{selectedIncident.id}</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </Link>
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Gear Type:</span>
                  <span className="font-bold text-[#173B4D] capitalize">
                    {selectedIncident.gear_type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinates:</span>
                  <span className="font-semibold text-[#173B4D]">
                    {formatCoordinates(selectedIncident.latitude, selectedIncident.longitude)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reported Date:</span>
                  <span className="font-semibold">
                    {new Date(selectedIncident.reported_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Status:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {selectedIncident.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Environmental Telemetry Panel */}
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#087E8B] text-base">waves</span>
                <h3 className="text-xs font-mono uppercase tracking-wider text-[#173B4D] font-bold">
                  Marine Environmental Input
                </h3>
              </div>
              {loadingEnv && (
                <span className="material-symbols-outlined text-sm text-[#087E8B] animate-spin">sync</span>
              )}
            </div>

            {envConditions ? (
              <div className="space-y-3 text-xs font-mono text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Data Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      envConditions.mode === 'simulation'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {envConditions.data_status || (envConditions.mode === 'simulation' ? 'Simulation Mode' : 'Live API Response')}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Data Source:</span>
                  <span className="font-semibold text-[#173B4D] truncate max-w-[190px]" title={envConditions.source}>
                    {envConditions.source}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Observation Time:</span>
                  <span className="font-semibold">
                    {envConditions.observation_time
                      ? new Date(envConditions.observation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'N/A'}
                  </span>
                </div>

                {/* Ocean Current Box */}
                <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Ocean Current:</span>
                    <span className="font-bold text-[#087E8B] text-sm">
                      {envConditions.current_velocity !== null ? `${envConditions.current_velocity} m/s` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Knots Equivalent:</span>
                    <span className="font-semibold text-slate-800">
                      {envConditions.current_velocity_knots !== null ? `${envConditions.current_velocity_knots} kts` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Flow Direction:</span>
                    <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                      <span>{envConditions.current_direction}°</span>
                      <span className="text-slate-500">({degreesToCardinal(envConditions.current_direction)})</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-[#D8ECEC]/60">
                    <span>Components (u, v):</span>
                    <span>u: {envConditions.current_u} • v: {envConditions.current_v} m/s</span>
                  </div>
                </div>

                {/* 10m Wind & Waves Box */}
                <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">10m Surface Wind:</span>
                    <span className="font-bold text-cyan-800 text-sm">
                      {envConditions.wind_speed !== null && envConditions.wind_speed !== undefined ? `${envConditions.wind_speed} m/s` : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Knots Equivalent:</span>
                    <span className="font-semibold text-slate-800">
                      {envConditions.wind_speed_knots !== null && envConditions.wind_speed_knots !== undefined ? `${envConditions.wind_speed_knots} kts` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">From Direction:</span>
                    <span className="font-semibold text-[#173B4D] flex items-center gap-1">
                      <span>{envConditions.wind_direction !== null && envConditions.wind_direction !== undefined ? `${envConditions.wind_direction}°` : 'N/A'}</span>
                      <span className="text-slate-500">({degreesToCardinal(envConditions.wind_direction)})</span>
                    </span>
                  </div>
                  {envConditions.wave_height !== null && envConditions.wave_height !== undefined && (
                    <div className="flex justify-between items-center text-[11px] text-slate-600 pt-1 border-t border-[#D8ECEC]/60">
                      <span>Significant Swell:</span>
                      <span className="font-bold text-[#173B4D]">{envConditions.wave_height} m</span>
                    </div>
                  )}
                </div>

                {/* Windage, Leeway & Resultant Drift Preview Box */}
                <div className="p-3 rounded-lg bg-[#EAF7F7] border border-[#00C9C1]/40 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Active Windage:</span>
                    <span className="font-bold text-[#173B4D] text-xs">{windage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Est. Leeway Speed:</span>
                    <span className="font-bold text-[#087E8B]">
                      {envConditions.wind_speed !== null && envConditions.wind_speed !== undefined
                        ? `${(envConditions.wind_speed * (windage / 100)).toFixed(3)} m/s`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-[#00C9C1]/30">
                    <span>Leeway Heading:</span>
                    <span>
                      {envConditions.wind_direction !== null && envConditions.wind_direction !== undefined
                        ? `${(envConditions.wind_direction + 180) % 360}° (${degreesToCardinal((envConditions.wind_direction + 180) % 360)}) [Downwind]`
                        : 'N/A'}
                    </span>
                  </div>
                </div>


                {/* Simulation Mode Toggle Button */}
                <div className="pt-2 border-t border-[#D8ECEC]/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Force Synthetic Model:</span>
                  <button
                    type="button"
                    onClick={() => setForceSimulation(!forceSimulation)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      forceSimulation
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-white border border-[#D8ECEC] text-slate-600 hover:bg-[#F2FAFA]'
                    }`}
                  >
                    {forceSimulation ? 'SIMULATION ON' : 'AUTO (Live API)'}
                  </button>
                </div>

                {selectedIncident && (
                  <div className="pt-2 border-t border-[#D8ECEC]/60 flex justify-end">
                    <Link
                      to={`/ngo/environmental-intelligence?incidentId=${selectedIncident.id}`}
                      state={{ incident: selectedIncident, incidentId: selectedIncident.id }}
                      className="text-[11px] font-mono text-[#087E8B] hover:text-[#00C9C1] font-semibold flex items-center gap-1"
                    >
                      <span>Inspect in Environmental Intelligence</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-500 font-mono">
                {loadingEnv ? 'Querying Open-Meteo marine currents...' : 'Select an incident to query environmental telemetry.'}
              </div>
            )}
          </div>

          {/* Simulation Parameter Controls */}
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              Simulation Parameters
            </h3>

            <div className="space-y-4 text-xs font-mono text-slate-700">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-slate-500">Surface Windage Factor:</span>
                  <span className="font-semibold text-[#173B4D]">{windage}%</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="5.0"
                  step="0.5"
                  value={windage}
                  onChange={(e) => setWindage(parseFloat(e.target.value))}
                  className="w-full accent-[#00C9C1] cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  0.0% (submerged gear) • 2.5% (floating nets)
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setWindage(0.0)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      windage === 0.0
                        ? 'bg-[#087E8B] text-white border-[#087E8B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Submerged (0.0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindage(1.5)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      windage === 1.5
                        ? 'bg-[#087E8B] text-white border-[#087E8B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Trawl (1.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindage(2.5)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      windage === 2.5
                        ? 'bg-[#087E8B] text-white border-[#087E8B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Floating Net (2.5%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWindage(4.0)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      windage === 4.0
                        ? 'bg-[#087E8B] text-white border-[#087E8B]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    FAD (4.0%)
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-[#D8ECEC]/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration Target:</span>
                  <span className="font-bold text-[#173B4D]">{durationHours} Hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Interval:</span>
                  <span className="font-semibold text-slate-700">1 Hour Step</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Coordinate Transform:</span>
                  <span className="font-semibold text-slate-700">WGS84 Spherical</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D8ECEC]">
              <button
                type="button"
                disabled={!selectedIncident || calculating}
                onClick={handleGenerateForecast}
                className="w-full py-2.5 px-3 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <span className={`material-symbols-outlined text-sm ${calculating ? 'animate-spin' : ''}`}>
                  {calculating ? 'sync' : 'explore'}
                </span>
                <span>
                  {calculating
                    ? 'Integrating Vectors...'
                    : forecastSummary
                    ? 'Regenerate Forecast'
                    : 'Calculate Drift Trajectory'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriftForecasting;
