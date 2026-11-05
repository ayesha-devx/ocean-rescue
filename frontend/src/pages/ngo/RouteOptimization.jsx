import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import EmptyState from '../../components/ngo/EmptyState';
import { getRecoveryMissionById } from '../../services/ngoService';
import { getIncidentRisk } from '../../services/riskService';
import { getLatestDriftForecast } from '../../services/driftService';
import {
  optimizeMissionRoute,
  getMissionRoutes,
  selectMissionRoute,
  getRestrictedMarineZones,
} from '../../services/routeService';

/**
 * Standard Staging Harbours along the Konkan Coast Sector
 */
const HARBOUR_OPTIONS = [
  { name: 'Mirkarwada Fishing Harbour, Ratnagiri', lat: 16.99, lon: 73.30, tag: 'Primary Benchmark' },
  { name: 'Jaigad Port, Ratnagiri', lat: 17.30, lon: 73.22, tag: 'Northern Outpost' },
  { name: 'Vijaydurg Port, Sindhudurg', lat: 16.56, lon: 73.33, tag: 'Southern Deepwater' },
  { name: 'Malvan Fishing Harbour, Sindhudurg', lat: 16.05, lon: 73.46, tag: 'Sanctuary Staging' },
];

/**
 * Continental Coastline Contour Line (High-Water Shoreline approximation)
 */
const KONKAN_COASTLINE_POLYLINE = [
  [14.0, 74.32], [14.5, 74.28], [15.0, 73.85], [15.5, 73.76],
  [16.0, 73.52], [16.5, 73.36], [16.8, 73.30], [17.0, 73.32],
  [17.2, 73.23], [17.5, 73.18], [18.0, 73.02], [18.5, 72.90],
  [19.0, 72.82], [19.5, 72.76], [20.0, 72.70],
];

/**
 * Custom Leaflet DivIcon for Departure Harbour Benchmark
 */
const harbourMarkerIcon = L.divIcon({
  className: 'custom-harbour-marker',
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 30px; height: 30px; border-radius: 9px; background-color: #173B4D; border: 2.5px solid #00C9C1; box-shadow: 0 4px 10px rgba(23, 59, 77, 0.45); display: flex; align-items: center; justify-content: center; color: #00C9C1;">
        <svg style="width: 17px; height: 17px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 2v20m0 0a8 8 0 01-8-8h2a6 6 0 0012 0h2a8 8 0 01-8 8zm0-16a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

/**
 * Custom Leaflet DivIcon for Recovery Target Destination
 */
function createTargetMarkerIcon(isGrounding = false) {
  const bg = isGrounding ? '#BE123C' : '#087E8B';
  const ping = isGrounding ? 'rgba(225, 29, 72, 0.45)' : 'rgba(0, 201, 193, 0.45)';
  return L.divIcon({
    className: 'custom-target-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: ${ping}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 30px; height: 30px; border-radius: 9999px; background-color: ${bg}; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(23, 59, 77, 0.45); display: flex; align-items: center; justify-content: center; color: white;">
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
 * Distinguishable numbered waypoint icon for Primary (teal) vs Alternative (blue) corridors
 */
function createWaypointIcon(index, type = 'primary') {
  const isAlt = type === 'alternative';
  const bg = isAlt ? '#1E40AF' : '#173B4D';
  const border = isAlt ? '#60A5FA' : '#00C9C1';
  const label = isAlt ? `A${index}` : `P${index}`;
  return L.divIcon({
    className: 'custom-wp-marker',
    html: `
      <div style="width: 22px; height: 22px; border-radius: 9999px; background-color: ${bg}; border: 2px solid ${border}; color: white; font-size: 8px; font-weight: bold; font-family: monospace; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
        ${label}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/**
 * Evaluates whether two route candidates have genuinely distinct geometry and waypoints.
 * Never considers duplicate paths with identical endpoints as distinct.
 */
function areCandidateRoutesDistinct(r1, r2) {
  if (!r1 || !r2) return false;
  const w1 = r1.waypoints || [];
  const w2 = r2.waypoints || [];
  if (w1.length < 2 || w2.length < 2) return false;
  if (w1.length !== w2.length) return true;
  if (Math.abs(Number(r1.total_distance_km || 0) - Number(r2.total_distance_km || 0)) > 0.05) return true;
  for (let i = 0; i < w1.length; i++) {
    const latDiff = Math.abs(Number(w1[i].latitude) - Number(w2[i].latitude));
    const lonDiff = Math.abs(Number(w1[i].longitude) - Number(w2[i].longitude));
    if (latDiff > 0.0005 || lonDiff > 0.0005) {
      return true;
    }
  }
  return false;
}

/**
 * Dynamic map controller for auto-fitting route bounds
 */
function RouteMapBoundsController({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true, duration: 0.8 });
      } catch (e) {
        console.warn('Map fit bounds warning:', e);
      }
    }
  }, [bounds, map]);
  return null;
}

export const RouteOptimization = () => {
  const { missionId } = useParams();
  const navigate = useNavigate();

  // Primary Data States
  const [missionData, setMissionData] = useState(null);
  const [incidentRisk, setIncidentRisk] = useState(null);
  const [driftForecast, setDriftForecast] = useState(null);
  const [restrictedZones, setRestrictedZones] = useState([]);
  const [routesList, setRoutesList] = useState([]);
  // Authoritative Selected Route from Backend
  const [persistedRoute, setPersistedRoute] = useState(null);

  // Candidate routes for current calculation / inspection
  const [primaryCandidate, setPrimaryCandidate] = useState(null);
  const [alternativeCandidate, setAlternativeCandidate] = useState(null);
  const [selectedCandidateType, setSelectedCandidateType] = useState('primary'); // 'primary' or 'alternative'

  // Status & Feedback
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Configuration Form State
  const [targetMode, setTargetMode] = useState('incident_reported'); // 'incident_reported', 'drift_endpoint', 'grounding_point', 'custom'
  const [customTargetLat, setCustomTargetLat] = useState('');
  const [customTargetLon, setCustomTargetLon] = useState('');
  const [selectedHarbourName, setSelectedHarbourName] = useState(HARBOUR_OPTIONS[0].name);
  const [vesselSpeedKnots, setVesselSpeedKnots] = useState('12.0');
  const [avoidLand, setAvoidLand] = useState(true);
  const [avoidSanctuaries, setAvoidSanctuaries] = useState(true);
  const [coastalBufferKm, setCoastalBufferKm] = useState('1.5');
  const [incorporateCurrents, setIncorporateCurrents] = useState(true);
  const [showWaypointsList, setShowWaypointsList] = useState(false);

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Selected Harbour object
  const currentHarbour = useMemo(() => {
    const found = HARBOUR_OPTIONS.find((h) => h.name === selectedHarbourName);
    return found || HARBOUR_OPTIONS[0];
  }, [selectedHarbourName]);

  // 1. Load mission details, risk assessment, drift forecast, restricted zones, and existing routes
  useEffect(() => {
    let isMounted = true;
    if (!missionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    Promise.all([
      getRecoveryMissionById(missionId),
      getRestrictedMarineZones(),
      getMissionRoutes(missionId).catch(() => []),
    ])
      .then(async ([mission, zonesData, existingRoutes]) => {
        if (!isMounted) return;
        if (!mission) {
          setLoadError(`Recovery Mission "${missionId}" not found in operational database.`);
          setLoading(false);
          return;
        }

        setMissionData(mission);
        setRestrictedZones(zonesData?.features || []);
        setRoutesList(existingRoutes || []);

        // Pre-select departure port if matched
        if (mission.departure_port) {
          const matchedPort = HARBOUR_OPTIONS.find((h) => h.name.toLowerCase() === mission.departure_port.toLowerCase());
          if (matchedPort) setSelectedHarbourName(matchedPort.name);
        }

        // Authoritative Selected Route Restoration:
        // Reopen exact saved route without independently inferring from distance or ordering
        const selected = (existingRoutes || []).find((r) => r.is_selected);
        if (selected) {
          setPersistedRoute(selected);
          // Restore both corridors calculated for that specific version
          const verRoutes = (existingRoutes || []).filter((r) => r.version === selected.version);
          const pCand = verRoutes.find((r) => r.route_type === 'primary' || r.route_type === 'optimal');
          const aCand = verRoutes.find((r) => r.route_type === 'alternative');

          const primaryResolved = pCand || (selected.route_type !== 'alternative' ? selected : null);
          let altResolved = aCand || (selected.route_type === 'alternative' ? selected : null);

          // If alternative is identical to primary in geometry/distance, honestly discard duplicate
          if (primaryResolved && altResolved && !areCandidateRoutesDistinct(primaryResolved, altResolved)) {
            altResolved = null;
          }

          setPrimaryCandidate(primaryResolved);
          setAlternativeCandidate(altResolved);
          setSelectedCandidateType(selected.route_type === 'alternative' && altResolved ? 'alternative' : 'primary');
        } else if (existingRoutes && existingRoutes.length > 0) {
          setPersistedRoute(null);
          // No saved route yet; load latest calculated candidates
          const maxVer = Math.max(...existingRoutes.map((r) => r.version || 1));
          const verRoutes = existingRoutes.filter((r) => r.version === maxVer);
          const pCand = verRoutes.find((r) => r.route_type === 'primary' || r.route_type === 'optimal');
          const aCand = verRoutes.find((r) => r.route_type === 'alternative');

          const primaryResolved = pCand || existingRoutes[0];
          let altResolved = aCand || null;
          if (primaryResolved && altResolved && !areCandidateRoutesDistinct(primaryResolved, altResolved)) {
            altResolved = null;
          }

          setPrimaryCandidate(primaryResolved);
          setAlternativeCandidate(altResolved);
          setSelectedCandidateType('primary');
        } else {
          setPersistedRoute(null);
          setPrimaryCandidate(null);
          setAlternativeCandidate(null);
          setSelectedCandidateType('primary');
        }

        // Fetch linked incident risk metadata & drift forecast
        if (mission.report_id) {
          getIncidentRisk(mission.report_id)
            .then((risk) => isMounted && setIncidentRisk(risk))
            .catch((err) => console.warn('Risk query error:', err));

          getLatestDriftForecast(mission.report_id)
            .then((drift) => isMounted && setDriftForecast(drift))
            .catch((err) => console.warn('Drift query error:', err));
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Initial route optimization load error:', err);
          setLoadError(err.message || 'Failed to load mission data');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [missionId]);

  // Available target coordinates based on selected targetMode
  const resolvedTarget = useMemo(() => {
    if (!missionData) return null;

    if (targetMode === 'drift_endpoint' && driftForecast?.points?.length > 0) {
      const validPoints = driftForecast.points.filter((p) => p.is_valid_drift);
      const lastPoint = validPoints[validPoints.length - 1] || driftForecast.points[driftForecast.points.length - 1];
      return {
        type: 'drift_endpoint',
        lat: Number(lastPoint.latitude),
        lon: Number(lastPoint.longitude),
        label: `Drift Forecast Destination (+${lastPoint.step_index || 0}h)`,
        isGrounding: false,
      };
    }

    if (targetMode === 'grounding_point' && incidentRisk?.grounding_detected && incidentRisk?.grounding_location) {
      return {
        type: 'grounding_point',
        lat: Number(incidentRisk.grounding_location.latitude),
        lon: Number(incidentRisk.grounding_location.longitude),
        label: `Estimated Shoreline Grounding Point (+${incidentRisk.grounding_step || 0}h)`,
        isGrounding: true,
      };
    }

    if (targetMode === 'custom' && customTargetLat && customTargetLon) {
      return {
        type: 'custom',
        lat: Number(customTargetLat),
        lon: Number(customTargetLon),
        label: 'Officer Custom Coordinates',
        isGrounding: false,
      };
    }

    // Default: Incident reported location
    const repLat = missionData.incident_latitude != null ? missionData.incident_latitude : 16.98;
    const repLon = missionData.incident_longitude != null ? missionData.incident_longitude : 73.27;
    return {
      type: 'incident_reported',
      lat: Number(repLat),
      lon: Number(repLon),
      label: `Incident #${missionData.report_id} Reported Location`,
      isGrounding: false,
    };
  }, [missionData, targetMode, driftForecast, incidentRisk, customTargetLat, customTargetLon]);

  // Handle Calculate / Recalculate Route
  const handleCalculateRoute = async () => {
    if (!resolvedTarget || isNaN(resolvedTarget.lat) || isNaN(resolvedTarget.lon)) {
      setFeedback({
        type: 'error',
        message: 'Invalid recovery target coordinates. Please verify target coordinates before calculating.',
      });
      return;
    }

    setCalculating(true);
    setFeedback(null);

    const speedVal = vesselSpeedKnots ? parseFloat(vesselSpeedKnots) : null;
    const bufferVal = coastalBufferKm ? parseFloat(coastalBufferKm) : 1.5;

    const payload = {
      departure_port: currentHarbour.name,
      departure_lat: currentHarbour.lat,
      departure_lon: currentHarbour.lon,
      target_type: resolvedTarget.type,
      target_lat: resolvedTarget.lat,
      target_lon: resolvedTarget.lon,
      vessel_name: missionData?.assigned_to || 'Assigned Salvage Vessel',
      vessel_speed_knots: speedVal,
      constraints: {
        avoid_land: avoidLand,
        avoid_restricted_zones: avoidSanctuaries,
        coastal_buffer_km: bufferVal,
        marine_sanctuary_buffer_km: 1.5,
      },
      incorporate_environmental: incorporateCurrents,
    };

    try {
      const response = await optimizeMissionRoute(missionId, payload);

      if (response.status === 'no_feasible_route') {
        setFeedback({
          type: 'error',
          message: response.message || 'No feasible marine route found avoiding land and protected zones.',
        });
        return;
      }

      const pCandidate = response.primary_route || null;
      let aCandidate = response.alternative_route || null;
      if (pCandidate && aCandidate && !areCandidateRoutesDistinct(pCandidate, aCandidate)) {
        aCandidate = null;
      }

      setPrimaryCandidate(pCandidate);
      setAlternativeCandidate(aCandidate);
      setSelectedCandidateType('primary');
      // Do NOT touch persistedRoute! Previously saved route remains active until explicitly saved.

      // Prepend newly calculated routes to routesList
      const newItems = response.all_routes || [response.primary_route, response.alternative_route].filter(Boolean);
      setRoutesList((prev) => [...newItems, ...prev]);

      const altSummary = aCandidate
        ? `Both Primary (${pCandidate?.total_distance_km.toFixed(2)} km) and Alternative (${aCandidate?.total_distance_km.toFixed(2)} km) corridors evaluated.`
        : `Primary route evaluated (${pCandidate?.total_distance_km.toFixed(2)} km). No distinct feasible alternative corridor available.`;

      setFeedback({
        type: 'success',
        message: `Route calculation complete! ${altSummary} Version ${pCandidate?.version} persisted to history. Select a preferred candidate and click Save to confirm mission plan.`,
      });
    } catch (err) {
      console.error('Route calculation error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to calculate route. Please verify coordinates and try again.',
      });
    } finally {
      setCalculating(false);
    }
  };

  // Active route being inspected in map and analysis
  const activeRoute = useMemo(() => {
    if (selectedCandidateType === 'alternative') {
      return alternativeCandidate || primaryCandidate || persistedRoute;
    }
    return primaryCandidate || alternativeCandidate || persistedRoute;
  }, [selectedCandidateType, primaryCandidate, alternativeCandidate, persistedRoute]);

  // Route Deviation calculated dynamically using active route's actual geometry and Haversine direct distance
  const activeRouteDeviation = useMemo(() => {
    if (!activeRoute) return 0.0;
    const direct = Number(activeRoute.direct_distance_km || 0);
    const total = Number(activeRoute.total_distance_km || 0);
    if (direct > 0.01 && total >= direct) {
      return Number((((total - direct) / direct) * 100).toFixed(1));
    }
    if (activeRoute.route_deviation_pct != null) {
      return Number(Number(activeRoute.route_deviation_pct).toFixed(1));
    }
    return 0.0;
  }, [activeRoute]);

  const alternativeRoute = alternativeCandidate;

  // Authoritative flags: each card is ONLY marked ACTIVE SELECTED if it matches persistedRoute
  const isPrimarySaved = Boolean(persistedRoute && primaryCandidate && persistedRoute.id === primaryCandidate.id);
  const isAltSaved = Boolean(persistedRoute && alternativeCandidate && persistedRoute.id === alternativeCandidate.id);
  const isCurrentActiveSaved = Boolean(persistedRoute && activeRoute && persistedRoute.id === activeRoute.id);
  const isSavedActive = isCurrentActiveSaved;

  // Handle Save / Select Active Route
  const handleSaveSelectedRoute = async (routeToSave = null) => {
    const targetRoute = routeToSave || activeRoute;
    if (!targetRoute || !targetRoute.id) {
      setFeedback({
        type: 'error',
        message: 'No calculated route candidate available to save. Please calculate a route first.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const selected = await selectMissionRoute(missionId, targetRoute.id, {
        selected_by: 'Lead Operations Officer',
        notes: `Selected ${targetRoute.route_type.toUpperCase()} route (${targetRoute.total_distance_km.toFixed(2)} km). Verified clear of land and sanctuaries.`,
      });

      // Update authoritative saved route
      setPersistedRoute(selected);
      if (selected.route_type === 'alternative') {
        setAlternativeCandidate(selected);
        setSelectedCandidateType('alternative');
      } else {
        setPrimaryCandidate(selected);
        setSelectedCandidateType('primary');
      }

      // Update in routesList
      setRoutesList((prev) =>
        prev.map((r) => ({
          ...r,
          is_selected: r.id === selected.id,
          ...(r.id === selected.id ? selected : {}),
        }))
      );

      // Synchronize parent missionData
      setMissionData((prev) => ({
        ...prev,
        has_selected_route: true,
        selected_route_id: selected.id,
        selected_route_type: selected.route_type,
        selected_route_version: selected.version,
        selected_route_distance_km: selected.total_distance_km,
        selected_route_distance_nm: selected.total_distance_nm,
        selected_route_direct_distance_km: selected.direct_distance_km,
        selected_route_deviation_pct: selected.route_deviation_pct,
        selected_route_waypoints_count: selected.waypoint_count,
        selected_route_departure: selected.departure_port,
        selected_route_destination: selected.destination_target,
        selected_route_estimated_duration_formatted: selected.estimated_duration_formatted,
        selected_route_status: 'cleared',
      }));

      setFeedback({
        type: 'success',
        message: `Preferred route (${selected.route_type.toUpperCase()} - ${selected.total_distance_km.toFixed(2)} km, ${selected.waypoint_count} waypoints, Version ${selected.version}) saved as active tactical route for Mission OR-MSN-${String(missionData?.id || missionId).padStart(3, '0')}. Recovery plan synchronized!`,
      });
    } catch (err) {
      console.error('Route selection error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to save preferred route.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Switch between Shortest and Alternative route tabs
  const handleSelectRouteOption = (routeType) => {
    setSelectedCandidateType(routeType);
  };

  // Compute map bounding box to auto-fit
  const mapBounds = useMemo(() => {
    const pts = [];
    if (currentHarbour) pts.push([currentHarbour.lat, currentHarbour.lon]);
    if (resolvedTarget && !isNaN(resolvedTarget.lat)) pts.push([resolvedTarget.lat, resolvedTarget.lon]);
    if (primaryCandidate?.waypoints) {
      primaryCandidate.waypoints.forEach((w) => pts.push([w.latitude, w.longitude]));
    }
    if (alternativeCandidate?.waypoints) {
      alternativeCandidate.waypoints.forEach((w) => pts.push([w.latitude, w.longitude]));
    }
    return pts.length >= 2 ? pts : [[16.85, 73.20], [17.10, 73.40]];
  }, [currentHarbour, resolvedTarget, primaryCandidate, alternativeCandidate]);

  // Polyline coordinates for primary candidate route
  const primaryPolyline = useMemo(() => {
    if (!primaryCandidate?.waypoints) return [];
    return primaryCandidate.waypoints.map((w) => [w.latitude, w.longitude]);
  }, [primaryCandidate]);

  // Polyline coordinates for alternative candidate route
  const altPolyline = useMemo(() => {
    if (!alternativeCandidate?.waypoints) return [];
    return alternativeCandidate.waypoints.map((w) => [w.latitude, w.longitude]);
  }, [alternativeCandidate]);

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center gap-2 text-xs font-mono text-[#087E8B]">
          <span>Loading Route Optimization Subsystem...</span>
        </div>
        <div className="bg-white rounded-xl border border-[#D8ECEC] p-16 flex flex-col items-center justify-center gap-3 shadow-xs">
          <div className="w-9 h-9 border-3 border-[#087E8B] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-mono">Loading mission context and GIS boundary data...</span>
        </div>
      </div>
    );
  }

  if (loadError || !missionData) {
    return (
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Link
              to="/ngo/recovery-planning"
              className="text-[#087E8B] hover:text-[#00C9C1] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Recovery Planning</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">{missionId || 'Route Optimization'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D8ECEC] p-8 sm:p-12 shadow-xs">
          <EmptyState
            icon="explore_off"
            title="Recovery Mission Not Found"
            description={loadError || `No recovery mission matches ID "${missionId}". Please select a valid plan.`}
            actionText="Back to Recovery Planning"
            actionLink="/ngo/recovery-planning"
          />
        </div>
      </div>
    );
  }

  const displayId = `OR-MSN-${String(missionData.id || missionId).padStart(3, '0')}`;
  const gearType = (missionData.incident_gear_type || 'GEAR').toUpperCase();
  const priority = (missionData.priority || missionData.incident_priority || 'HIGH').toUpperCase();
  const riskScore = missionData.incident_risk_score != null ? Number(missionData.incident_risk_score).toFixed(1) : null;

  return (
    <div className="flex flex-col w-full gap-5">
      {/* Real-time Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Top Header Command Bar */}
      <div className="flex flex-col gap-2">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Link
              to="/ngo/recovery-planning"
              className="text-[#087E8B] hover:text-[#00C9C1] transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Recovery Planning</span>
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              to={`/ngo/recovery-missions/${missionData.id}`}
              className="text-slate-600 hover:text-[#087E8B] transition-colors font-semibold"
            >
              {displayId}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-[#173B4D] font-bold">Route Optimization</span>
          </div>

          {/* Route Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                persistedRoute
                  ? isCurrentActiveSaved
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : activeRoute
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {persistedRoute
                ? isCurrentActiveSaved
                  ? `ROUTE SAVED & ACTIVE (${persistedRoute.route_type.toUpperCase()} V${persistedRoute.version})`
                  : `VIEWING UNSAVED CANDIDATE (ACTIVE MISSION: ${persistedRoute.route_type.toUpperCase()} V${persistedRoute.version})`
                : activeRoute
                ? 'FEASIBLE ROUTE CALCULATED (UNSAVED)'
                : 'PENDING CALCULATION'}
            </span>
          </div>
        </div>

        {/* Title & Primary Action Ribbon */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#087E8B] uppercase font-bold tracking-wider">
                MISSION {displayId}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="text-xs font-mono text-slate-500 uppercase">INCIDENT #{missionData.report_id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold bg-[#EAF7F7] text-[#087E8B] border border-[#00C9C1]/40">
                {gearType}
              </span>
              <span className="px-2 py-0.2 rounded text-[10px] font-mono uppercase font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {priority} {riskScore ? `(${riskScore}/100)` : ''}
              </span>
            </div>
            <h1 className="text-2xl font-bold font-display text-[#173B4D] tracking-tight mt-0.5">
              Tactical Route Optimization
            </h1>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              GIS-driven A* pathfinding over marine corridors avoiding landmass, rocky shoals, and restricted marine sanctuaries.
            </p>
          </div>

          {/* Real Operational Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              id="back-to-mission-btn"
              onClick={() => navigate(`/ngo/recovery-missions/${missionData.id}`)}
              className="px-3 py-2 rounded-lg bg-white border border-[#D8ECEC] text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Mission</span>
            </button>

            <button
              type="button"
              id="calculate-route-btn"
              disabled={calculating}
              onClick={handleCalculateRoute}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.99] ${
                activeRoute
                  ? 'bg-white border border-[#087E8B] text-[#087E8B] hover:bg-[#F2FAFA]'
                  : 'bg-[#00C9C1] text-[#173B4D] hover:bg-[#00b5ae]'
              }`}
            >
              {calculating ? (
                <div className="w-4 h-4 border-2 border-[#173B4D] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-base">
                  {activeRoute ? 'refresh' : 'route'}
                </span>
              )}
              <span>{calculating ? 'Optimizing Route...' : activeRoute ? 'Recalculate Route' : 'Calculate Route'}</span>
            </button>

            <button
              type="button"
              id="save-route-btn"
              disabled={!activeRoute || saving || isCurrentActiveSaved}
              onClick={() => handleSaveSelectedRoute(activeRoute)}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all ${
                isCurrentActiveSaved
                  ? 'bg-emerald-600 text-white cursor-default'
                  : activeRoute
                  ? 'bg-[#087E8B] hover:bg-[#173B4D] text-white cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="material-symbols-outlined text-base">
                  {isCurrentActiveSaved ? 'check_circle' : 'bookmark_check'}
                </span>
              )}
              <span>{isCurrentActiveSaved ? `Saved & Active (${activeRoute?.route_type?.toUpperCase()})` : `Save ${activeRoute?.route_type?.toUpperCase() || 'Candidate'} Route`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Responsive Grid Layout (Bento Grid) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* ======================================================== */}
        {/* LEFT PANEL: Mission Config, Comparison, Analysis (5 Cols) */}
        {/* ======================================================== */}
        <div className="xl:col-span-5 flex flex-col gap-5">
          {/* Section A: Mission & Route Configuration Card */}
          <div className="bg-white rounded-xl p-4.5 border border-[#D8ECEC] shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-lg">tune</span>
                <h2 className="text-xs font-bold font-display text-[#173B4D] uppercase tracking-wider">
                  Operational Route Configuration
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">A* Spatial Graph</span>
            </div>

            {/* Target Coordinates Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                Recovery Target Destination
              </label>
              <div className="grid grid-cols-1 gap-1.5 text-xs">
                {/* 1. Reported Loss Location */}
                <label
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                    targetMode === 'incident_reported'
                      ? 'bg-[#F2FAFA] border-[#00C9C1] text-[#173B4D]'
                      : 'bg-white border-[#D8ECEC] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetMode"
                    value="incident_reported"
                    checked={targetMode === 'incident_reported'}
                    onChange={() => setTargetMode('incident_reported')}
                    className="mt-0.5 accent-[#00C9C1]"
                  />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-[#173B4D]">Reported Loss Coordinates</span>
                      <span className="text-[9px] font-mono px-1 rounded bg-slate-100 text-slate-600 uppercase font-bold">
                        Verified Intake
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#087E8B] mt-0.5">
                      {missionData.incident_latitude != null ? `${Number(missionData.incident_latitude).toFixed(4)}° N, ${Number(missionData.incident_longitude).toFixed(4)}° E` : '16.9800° N, 73.2700° E'}
                    </span>
                  </div>
                </label>

                {/* 2. Drift Forecast Endpoint (if available) */}
                {driftForecast && driftForecast.points?.length > 0 && (
                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      targetMode === 'drift_endpoint'
                        ? 'bg-[#F2FAFA] border-[#00C9C1] text-[#173B4D]'
                        : 'bg-white border-[#D8ECEC] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="drift_endpoint"
                      checked={targetMode === 'drift_endpoint'}
                      onChange={() => setTargetMode('drift_endpoint')}
                      className="mt-0.5 accent-[#00C9C1]"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-[#173B4D]">Drift Forecast Destination</span>
                        <span className="text-[9px] font-mono px-1 rounded bg-cyan-100 text-cyan-800 uppercase font-bold">
                          Lagrangian Model
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#087E8B] mt-0.5">
                        {driftForecast.points[driftForecast.points.length - 1]?.latitude.toFixed(4)}° N,{' '}
                        {driftForecast.points[driftForecast.points.length - 1]?.longitude.toFixed(4)}° E
                      </span>
                    </div>
                  </label>
                )}

                {/* 3. Estimated Grounding Point (if detected) */}
                {incidentRisk?.grounding_detected && incidentRisk?.grounding_location && (
                  <label
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      targetMode === 'grounding_point'
                        ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                        : 'bg-white border-[#D8ECEC] text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      value="grounding_point"
                      checked={targetMode === 'grounding_point'}
                      onChange={() => setTargetMode('grounding_point')}
                      className="mt-0.5 accent-rose-600"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-rose-800">
                          Estimated Coastal Grounding (+{incidentRisk.grounding_step}h)
                        </span>
                        <span className="text-[9px] font-mono px-1 rounded bg-rose-100 text-rose-800 uppercase font-bold">
                          Shore Contact
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-rose-700 mt-0.5">
                        {Number(incidentRisk.grounding_location.latitude).toFixed(4)}° N,{' '}
                        {Number(incidentRisk.grounding_location.longitude).toFixed(4)}° E
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 italic">
                        Clearly distinguished from reported loss coordinates.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Departure Staging Harbour Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="departure-harbour-select" className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                Departure Harbour Base
              </label>
              <select
                id="departure-harbour-select"
                value={selectedHarbourName}
                onChange={(e) => setSelectedHarbourName(e.target.value)}
                className="w-full text-xs bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg p-2 font-sans text-[#173B4D] focus:outline-none focus:border-[#00C9C1] cursor-pointer"
              >
                {HARBOUR_OPTIONS.map((h) => (
                  <option key={h.name} value={h.name}>
                    {h.name} ({h.lat.toFixed(2)}° N, {h.lon.toFixed(2)}° E) — {h.tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Vessel Speed Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="vessel-speed-input" className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                  Cruising Speed (knots)
                </label>
                <input
                  id="vessel-speed-input"
                  type="number"
                  min="1"
                  max="40"
                  step="0.5"
                  value={vesselSpeedKnots}
                  onChange={(e) => setVesselSpeedKnots(e.target.value)}
                  placeholder="e.g. 12.0"
                  className="w-full text-xs bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg p-2 font-mono text-[#173B4D] focus:outline-none focus:border-[#00C9C1]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="coastal-buffer-input" className="text-[11px] font-mono uppercase text-slate-600 font-bold">
                  Coastline Buffer (km)
                </label>
                <input
                  id="coastal-buffer-input"
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={coastalBufferKm}
                  onChange={(e) => setCoastalBufferKm(e.target.value)}
                  className="w-full text-xs bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg p-2 font-mono text-[#173B4D] focus:outline-none focus:border-[#00C9C1]"
                />
              </div>
            </div>

            {/* Constraints Toggles */}
            <div className="pt-2 border-t border-[#D8ECEC] flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                Operational Safety Constraints
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={avoidLand}
                    onChange={(e) => setAvoidLand(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#00C9C1]"
                  />
                  <span className="text-[11px]">Strict Land Collision Avoidance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={avoidSanctuaries}
                    onChange={(e) => setAvoidSanctuaries(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#00C9C1]"
                  />
                  <span className="text-[11px]">Bypass Marine Sanctuaries</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={incorporateCurrents}
                    onChange={(e) => setIncorporateCurrents(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#00C9C1]"
                  />
                  <span className="text-[11px]">Incorporate Ocean Currents (Open-Meteo / Copernicus)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section B: Route Comparison Panel (when routes exist) */}
          {(primaryCandidate || alternativeCandidate) && (
            <div className="bg-white rounded-xl p-4.5 border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#087E8B] text-lg">compare_arrows</span>
                  <h2 className="text-xs font-bold font-display text-[#173B4D] uppercase tracking-wider">
                    Route Feasibility Comparison
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[#087E8B] font-bold">
                  {alternativeCandidate ? '2 Corridors Evaluated' : '1 Corridor Evaluated'}
                </span>
              </div>

              {/* Side-by-side / Stacked Comparison Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Primary Route Card */}
                {primaryCandidate ? (
                  <div
                    id="primary-route-card"
                    onClick={() => handleSelectRouteOption('primary')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedCandidateType === 'primary'
                        ? 'bg-[#F2FAFA] border-[#00C9C1] shadow-2xs ring-1 ring-[#00C9C1]/50'
                        : 'bg-white border-[#D8ECEC] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B]"></span>
                        <span className="text-xs font-bold font-display text-[#173B4D]">
                          Primary Route (Shortest Feasible)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-emerald-100 text-emerald-800">
                          OPTIMAL PATH
                        </span>
                        {isPrimarySaved && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-emerald-600 text-white flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>
                            ACTIVE SELECTED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center py-1 bg-white/70 rounded-lg border border-[#D8ECEC]/60 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Total Distance</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {primaryCandidate.total_distance_km.toFixed(2)} km
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {primaryCandidate.total_distance_nm.toFixed(2)} NM
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Waypoints</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {primaryCandidate.waypoint_count} pts
                        </span>
                        <span className="text-[9px] font-mono text-[#087E8B]">A* Smoothed</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Travel Time</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {primaryCandidate.estimated_duration_formatted || 'Unavailable'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {primaryCandidate.vessel_speed_knots ? `@ ${primaryCandidate.vessel_speed_knots} kts` : 'speed missing'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
                        <span>Shortest Fairway • Clear of landmass</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {isPrimarySaved ? `Saved Version ${primaryCandidate.version}` : `Candidate Version ${primaryCandidate.version}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                    Primary route candidate pending calculation.
                  </div>
                )}

                {/* 2. Alternative Route Card (if available or empty state) */}
                {alternativeCandidate ? (
                  <div
                    id="alternative-route-card"
                    onClick={() => handleSelectRouteOption('alternative')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedCandidateType === 'alternative'
                        ? 'bg-[#F2FAFA] border-[#3B82F6] shadow-2xs ring-1 ring-[#3B82F6]/50'
                        : 'bg-white border-[#D8ECEC] hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span>
                        <span className="text-xs font-bold font-display text-[#173B4D]">
                          Alternative Route (Conservative Offshore)
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-blue-100 text-blue-800">
                          DEEPWATER BUFFER
                        </span>
                        {isAltSaved && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase font-bold bg-emerald-600 text-white flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[11px]">check_circle</span>
                            ACTIVE SELECTED
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center py-1 bg-white/70 rounded-lg border border-[#D8ECEC]/60 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Total Distance</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {alternativeCandidate.total_distance_km.toFixed(2)} km
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {alternativeCandidate.total_distance_nm.toFixed(2)} NM
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Waypoints</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {alternativeCandidate.waypoint_count} pts
                        </span>
                        <span className="text-[9px] font-mono text-blue-700">Wider Clearance</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Travel Time</span>
                        <span className="text-xs font-bold font-mono text-[#173B4D]">
                          {alternativeCandidate.estimated_duration_formatted || 'Unavailable'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          {alternativeCandidate.vessel_speed_knots ? `@ ${alternativeCandidate.vessel_speed_knots} kts` : 'speed missing'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-blue-600">shield</span>
                        <span>Offshore corridor • min 4.0 km coastal buffer</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {isAltSaved ? `Saved Version ${alternativeCandidate.version}` : `Candidate Version ${alternativeCandidate.version}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-dashed border-[#D8ECEC] bg-[#F8FAFC] flex items-start gap-2.5 text-xs text-slate-500">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0 mt-0.5">info</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-700">No distinct feasible alternative route available.</span>
                      <span className="text-[11px] text-slate-500 leading-relaxed">
                        The spatial graph search did not discover a separate navigable corridor that satisfies the conservative offshore clearance constraint (minimum 4.0 km coastal buffer) without intersecting land or protected sanctuary boundaries. All viable marine paths converge on the primary fairway.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Select & Save Button for Active Option */}
              <button
                type="button"
                id="select-active-option-btn"
                disabled={saving || isCurrentActiveSaved || !activeRoute}
                onClick={() => handleSaveSelectedRoute(activeRoute)}
                className={`w-full py-2.5 rounded-lg text-xs font-bold font-display flex items-center justify-center gap-2 shadow-xs transition-all ${
                  isCurrentActiveSaved
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                    : activeRoute
                    ? 'bg-[#00C9C1] hover:bg-[#00b5ae] text-[#173B4D] cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-[#173B4D] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-base">
                    {isCurrentActiveSaved ? 'check_circle' : 'bookmark_added'}
                  </span>
                )}
                <span>
                  {isCurrentActiveSaved
                    ? `Active Saved Route: ${activeRoute.route_type.toUpperCase()} (${activeRoute.total_distance_km.toFixed(2)} km) • Version ${activeRoute.version}`
                    : activeRoute
                    ? `Save ${activeRoute.route_type.toUpperCase()} Route as Mission Plan`
                    : 'Select a Route Candidate'}
                </span>
              </button>
            </div>
          )}

          {/* Section C: Route Analysis & Environmental Context Panel */}
          {activeRoute && (
            <div className="bg-white rounded-xl p-4.5 border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#087E8B] text-lg">analytics</span>
                  <h2 className="text-xs font-bold font-display text-[#173B4D] uppercase tracking-wider">
                    Route Analysis &amp; Data Telemetry
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWaypointsList(!showWaypointsList)}
                  className="text-[11px] font-mono text-[#087E8B] hover:text-[#173B4D] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showWaypointsList ? 'Hide Waypoints' : 'View Waypoints'}</span>
                  <span className="material-symbols-outlined text-sm">
                    {showWaypointsList ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {/* Analysis Metrics Table */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Departure Port</span>
                  <span className="font-bold text-[#173B4D] truncate block mt-0.5">{activeRoute.departure_port}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {activeRoute.departure_lat.toFixed(4)}° N, {activeRoute.departure_lon.toFixed(4)}° E
                  </span>
                </div>

                <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Recovery Target</span>
                  <span className="font-bold text-[#173B4D] truncate block mt-0.5">{activeRoute.destination_target}</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {activeRoute.destination_lat.toFixed(4)}° N, {activeRoute.destination_lon.toFixed(4)}° E
                  </span>
                </div>

                <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Direct Distance</span>
                  <span className="font-bold font-mono text-[#173B4D] block mt-0.5">
                    {activeRoute.direct_distance_km != null ? `${Number(activeRoute.direct_distance_km).toFixed(2)} km` : '0.00 km'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Straight line (Haversine)</span>
                </div>

                <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Route Deviation</span>
                  <span className="font-bold font-mono text-[#087E8B] block mt-0.5">
                    +{activeRouteDeviation.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">Coastline contour detour</span>
                </div>
              </div>

              {/* Environmental Telemetry Strip */}
              {activeRoute.environmental_context && (
                <div className="bg-[#F2FAFA] rounded-lg p-2.5 border border-[#D8ECEC] flex flex-col gap-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-[#087E8B] font-bold">
                      Environmental Telemetry Feed
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {activeRoute.environmental_context.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-[#173B4D] mt-0.5">
                    <span>
                      Current: <strong>{activeRoute.environmental_context.current_speed?.toFixed(2) || '0.20'} m/s</strong> ({activeRoute.environmental_context.current_direction?.toFixed(0) || '0'}°)
                    </span>
                    <span>
                      Wind: <strong>{activeRoute.environmental_context.wind_speed?.toFixed(1) || '1.5'} m/s</strong>
                    </span>
                  </div>
                  {activeRoute.environmental_context.observed_at && (
                    <span className="text-[10px] font-mono text-slate-500">
                      Telemetry observation timestamp: {new Date(activeRoute.environmental_context.observed_at).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              {/* Waypoints Breakdown Table (Collapsible) */}
              {showWaypointsList && (
                <div className="border border-[#D8ECEC] rounded-lg overflow-hidden mt-1">
                  <div className="bg-[#173B4D] text-white p-2 text-[10px] font-mono uppercase font-bold flex justify-between">
                    <span>Waypoints Telemetry Sequence</span>
                    <span>{activeRoute.waypoint_count} Points</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#F2FAFA] text-[10px] font-mono text-slate-500 uppercase border-b border-[#D8ECEC]">
                        <tr>
                          <th className="p-1.5 pl-2">#</th>
                          <th className="p-1.5">Coordinates</th>
                          <th className="p-1.5">Leg Dist</th>
                          <th className="p-1.5 pr-2">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#D8ECEC] font-mono text-[11px] text-[#173B4D]">
                        {activeRoute.waypoints.map((wp) => (
                          <tr key={wp.index} className="hover:bg-[#F2FAFA]">
                            <td className="p-1.5 pl-2 font-bold text-[#087E8B]">{wp.index}</td>
                            <td className="p-1.5">{wp.latitude.toFixed(4)}° N, {wp.longitude.toFixed(4)}° E</td>
                            <td className="p-1.5">{wp.distance_from_prev_km.toFixed(2)} km</td>
                            <td className="p-1.5 pr-2 font-bold">{wp.cumulative_distance_km.toFixed(2)} km</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Navigational Safety Disclaimer */}
              <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[10px] leading-relaxed flex items-start gap-1.5">
                <span className="material-symbols-outlined text-sm text-amber-700 shrink-0 mt-0.5">warning</span>
                <span>
                  <strong>Preliminary Decision-Support Route:</strong> Generated via A* spatial grid with admissible Haversine heuristic. Not certified for real-world nautical navigation without official maritime chart review, bathymetric sonar verification, and local port clearance.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Interactive Leaflet GIS Map (7 Cols)        */}
        {/* ======================================================== */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="bg-white rounded-xl p-3 border border-[#D8ECEC] shadow-xs flex flex-col gap-2">
            {/* Map Top Bar with Layer Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-base">map</span>
                <span className="text-xs font-bold font-display text-[#173B4D]">
                  Navigational Marine GIS Map
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  WGS84 EPSG:4326 • OpenStreetMap
                </span>
              </div>

              {/* Map Layer Legend Indicators */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#173B4D] border border-[#00C9C1]"></span>
                  <span>Harbour</span>
                </span>
                <span className="flex items-center gap-1 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#087E8B]"></span>
                  <span>Target</span>
                </span>
                <span className="flex items-center gap-1 text-[#087E8B] font-bold">
                  <span className="w-3 h-0.5 bg-[#087E8B]"></span>
                  <span>Primary (Shortest)</span>
                </span>
                {alternativeCandidate && (
                  <span className="flex items-center gap-1 text-blue-700 font-bold">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-[#1D4ED8]"></span>
                    <span>Alternative (Offshore)</span>
                  </span>
                )}
                <span className="flex items-center gap-1 text-slate-600">
                  <span className="w-2 h-2 rounded-full bg-[#173B4D] border border-[#00C9C1]"></span>
                  <span>P / ALT Waypoints</span>
                </span>
                <span className="flex items-center gap-1 text-amber-800">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-100 border border-amber-500"></span>
                  <span>Sanctuary (MPA)</span>
                </span>
              </div>
            </div>

            {/* Map Canvas Container */}
            <div className="relative w-full h-[540px] rounded-lg overflow-hidden border border-[#D8ECEC] shadow-inner bg-[#EBF4F6]">
              <MapContainer
                bounds={mapBounds}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full z-10"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <RouteMapBoundsController bounds={mapBounds} />

                {/* 1. Coastline Contour Polyline */}
                <Polyline
                  positions={KONKAN_COASTLINE_POLYLINE}
                  pathOptions={{
                    color: '#64748B',
                    weight: 2,
                    dashArray: '4, 4',
                    opacity: 0.7,
                  }}
                >
                  <Tooltip sticky>
                    <span className="text-[10px] font-mono font-bold text-slate-700">
                      Continental Coastline High-Water Contour
                    </span>
                  </Tooltip>
                </Polyline>

                {/* 2. Restricted Marine Protected Areas (Polygons) */}
                {restrictedZones.map((zone, idx) => {
                  if (zone.geometry?.type === 'Polygon') {
                    // Leaflet expects [lat, lon] instead of GeoJSON [lon, lat]
                    const latLngs = zone.geometry.coordinates[0].map((coord) => [coord[1], coord[0]]);
                    return (
                      <Polygon
                        key={zone.properties?.id || idx}
                        positions={latLngs}
                        pathOptions={{
                          color: '#D97706',
                          fillColor: '#F59E0B',
                          fillOpacity: 0.18,
                          weight: 2,
                          dashArray: '6, 6',
                        }}
                      >
                        <Popup>
                          <div className="p-1 font-sans text-xs">
                            <span className="text-[10px] font-mono uppercase font-bold text-amber-800 block">
                              Restricted Marine Protected Area
                            </span>
                            <span className="font-bold text-[#173B4D] text-sm block mt-0.5">
                              {zone.properties?.name || 'Malvan Marine Sanctuary'}
                            </span>
                            <span className="text-[11px] text-slate-600 block mt-1">
                              Designation: {zone.properties?.designation || 'Wildlife Sanctuary'}
                            </span>
                            {zone.properties?.area_km2 && (
                              <span className="text-[11px] text-slate-600 block">
                                Area: {zone.properties.area_km2} km²
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-rose-700 font-bold block mt-1">
                              Strict Navigational Avoidance Zone
                            </span>
                          </div>
                        </Popup>
                        <Tooltip sticky>
                          <span className="text-[10px] font-mono font-bold text-amber-900">
                            🛡️ {zone.properties?.name || 'Marine Protected Area'}
                          </span>
                        </Tooltip>
                      </Polygon>
                    );
                  }
                  return null;
                })}

                {/* 3. Alternative Route Polyline */}
                {altPolyline.length >= 2 && (
                  <Polyline
                    positions={altPolyline}
                    pathOptions={{
                      color: selectedCandidateType === 'alternative' ? '#2563EB' : '#60A5FA',
                      weight: selectedCandidateType === 'alternative' ? 5 : 3,
                      dashArray: selectedCandidateType === 'alternative' ? undefined : '8, 6',
                      opacity: selectedCandidateType === 'alternative' ? 0.95 : 0.65,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-blue-700 block">
                            Alternative Route (Conservative Offshore)
                          </span>
                          {isAltSaved && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono uppercase font-bold bg-emerald-600 text-white">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="font-bold font-mono text-[#173B4D] block mt-0.5">
                          {alternativeCandidate?.total_distance_km.toFixed(2)} km ({alternativeCandidate?.total_distance_nm.toFixed(2)} NM)
                        </span>
                        <span className="text-[11px] text-slate-600 block mt-0.5">
                          Waypoints: {alternativeCandidate?.waypoint_count} • {alternativeCandidate?.estimated_duration_formatted}
                        </span>
                        <span className="text-[10px] font-mono text-blue-700 font-bold block mt-1">
                          🛡️ Offshore buffer clearance fairway
                        </span>
                      </div>
                    </Popup>
                  </Polyline>
                )}

                {/* 4. Primary Optimized Route Polyline */}
                {primaryPolyline.length >= 2 && (
                  <Polyline
                    positions={primaryPolyline}
                    pathOptions={{
                      color: selectedCandidateType === 'primary' ? '#087E8B' : '#5EEAD4',
                      weight: selectedCandidateType === 'primary' ? 5 : 3,
                      dashArray: selectedCandidateType === 'primary' ? undefined : '6, 6',
                      opacity: selectedCandidateType === 'primary' ? 0.95 : 0.65,
                    }}
                  >
                    <Popup>
                      <div className="p-1 text-xs">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-[#087E8B] block">
                            Primary Optimized Route (Shortest Feasible)
                          </span>
                          {isPrimarySaved && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-mono uppercase font-bold bg-emerald-600 text-white">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="font-bold font-mono text-[#173B4D] text-sm block mt-0.5">
                          {primaryCandidate?.total_distance_km.toFixed(2)} km ({primaryCandidate?.total_distance_nm.toFixed(2)} NM)
                        </span>
                        <span className="text-[11px] text-slate-600 block mt-0.5">
                          Waypoints: {primaryCandidate?.waypoint_count} • {primaryCandidate?.estimated_duration_formatted}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-1">
                          ✓ Shortest admissible fairway clear of obstacles
                        </span>
                      </div>
                    </Popup>
                  </Polyline>
                )}

                {/* 5. Departure Harbour Benchmark Marker */}
                {currentHarbour && (
                  <Marker position={[currentHarbour.lat, currentHarbour.lon]} icon={harbourMarkerIcon}>
                    <Popup>
                      <div className="p-1 text-xs font-sans">
                        <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold block">
                          Departure Staging Base
                        </span>
                        <span className="font-bold text-[#173B4D] block mt-0.5">{currentHarbour.name}</span>
                        <span className="text-[11px] font-mono text-slate-500 block mt-1">
                          Coordinates: {currentHarbour.lat.toFixed(4)}° N, {currentHarbour.lon.toFixed(4)}° E
                        </span>
                      </div>
                    </Popup>
                    <Tooltip permanent direction="top" offset={[0, -28]}>
                      <span className="text-[10px] font-mono font-bold text-[#173B4D]">
                        ⚓ {currentHarbour.name.split(',')[0]}
                      </span>
                    </Tooltip>
                  </Marker>
                )}

                {/* 6. Recovery Target Marker */}
                {resolvedTarget && !isNaN(resolvedTarget.lat) && (
                  <Marker
                    position={[resolvedTarget.lat, resolvedTarget.lon]}
                    icon={createTargetMarkerIcon(resolvedTarget.isGrounding)}
                  >
                    <Popup>
                      <div className="p-1 text-xs font-sans">
                        <span className={`text-[10px] font-mono uppercase font-bold block ${resolvedTarget.isGrounding ? 'text-rose-700' : 'text-[#087E8B]'}`}>
                          {resolvedTarget.isGrounding ? '⚡ Coastal Grounding Target' : '🎯 Recovery Target Location'}
                        </span>
                        <span className="font-bold text-[#173B4D] block mt-0.5">{resolvedTarget.label}</span>
                        <span className="text-[11px] font-mono text-slate-600 block mt-1">
                          {resolvedTarget.lat.toFixed(4)}° N, {resolvedTarget.lon.toFixed(4)}° E
                        </span>
                      </div>
                    </Popup>
                    <Tooltip permanent direction="top" offset={[0, -28]}>
                      <span className="text-[10px] font-mono font-bold text-[#173B4D]">
                        {resolvedTarget.isGrounding ? '⚡ Grounding Point' : `🎯 Incident #${missionData.report_id}`}
                      </span>
                    </Tooltip>
                  </Marker>
                )}

                {/* 7. Intermediate Navigational Waypoint Markers for Primary Route */}
                {primaryCandidate?.waypoints &&
                  primaryCandidate.waypoints.slice(1, -1).map((wp) => (
                    <Marker
                      key={`primary-wp-${wp.index}`}
                      position={[wp.latitude, wp.longitude]}
                      icon={createWaypointIcon(wp.index, 'primary')}
                    >
                      <Popup>
                        <div className="p-1 text-xs font-mono">
                          <span className="font-bold text-[#087E8B] block">Primary Waypoint #{wp.index}</span>
                          <span className="text-[11px] text-[#173B4D] block">
                            {wp.latitude.toFixed(4)}° N, {wp.longitude.toFixed(4)}° E
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Leg Dist: {wp.distance_from_prev_km.toFixed(2)} km
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Cumulative: {wp.cumulative_distance_km.toFixed(2)} km ({wp.cumulative_distance_nm.toFixed(2)} NM)
                          </span>
                        </div>
                      </Popup>
                      <Tooltip sticky>
                        <span className="text-[9px] font-mono font-bold text-[#087E8B]">
                          P-{wp.index} ({wp.cumulative_distance_km.toFixed(1)} km)
                        </span>
                      </Tooltip>
                    </Marker>
                  ))}

                {/* 8. Intermediate Navigational Waypoint Markers for Alternative Route */}
                {alternativeCandidate?.waypoints &&
                  alternativeCandidate.waypoints.slice(1, -1).map((wp) => (
                    <Marker
                      key={`alt-wp-${wp.index}`}
                      position={[wp.latitude, wp.longitude]}
                      icon={createWaypointIcon(wp.index, 'alternative')}
                    >
                      <Popup>
                        <div className="p-1 text-xs font-mono">
                          <span className="font-bold text-blue-700 block">
                            Alternative Waypoint #{wp.index} (Offshore Corridor)
                          </span>
                          <span className="text-[11px] text-[#173B4D] block">
                            {wp.latitude.toFixed(4)}° N, {wp.longitude.toFixed(4)}° E
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-1">
                            Leg Dist: {wp.distance_from_prev_km.toFixed(2)} km
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Cumulative: {wp.cumulative_distance_km.toFixed(2)} km ({wp.cumulative_distance_nm.toFixed(2)} NM)
                          </span>
                          <span className="text-[10px] font-mono text-blue-700 font-bold block mt-0.5">
                            🛡️ Offshore coastal buffer corridor
                          </span>
                        </div>
                      </Popup>
                      <Tooltip sticky>
                        <span className="text-[9px] font-mono font-bold text-blue-700">
                          ALT-{wp.index} ({wp.cumulative_distance_km.toFixed(1)} km)
                        </span>
                      </Tooltip>
                    </Marker>
                  ))}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteOptimization;
