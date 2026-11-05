import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import EmptyState from '../../components/ngo/EmptyState';
import {
  resolveInitialIncidentId,
  setStoredIncidentId,
  clearStoredIncidentId,
} from '../../utils/incidentStorage';
import { getIncidentRisk, getRiskQueue } from '../../services/riskService';
import {
  getRecoveryMissions,
  createRecoveryMission,
  getRecoveryMissionStats,
} from '../../services/ngoService';
import { getLatestDriftForecast } from '../../services/driftService';

/**
 * Geographical Configuration for Ratnagiri Pilot Study Area
 */
const TARGET_SECTOR = 'Arabian Sea – Ratnagiri / Konkan Coast';
const PRIMARY_PORT = 'Mirkarwada Fishing Harbour, Ratnagiri';
const PRIMARY_PORT_COORDS = { lat: 16.99, lng: 73.30 };
const PILOT_STUDY_BOUNDARY = {
  bounds: [
    [16.85, 73.20],
    [17.10, 73.40],
  ],
  label: 'Pilot Study Boundary: Ratnagiri / Konkan Coast (16.85°–17.10° N, 73.20°–73.40° E)',
};

/**
 * Leaflet DivIcon for Mirkarwada Fishing Harbour Benchmark
 */
const pilotHarbourIcon = L.divIcon({
  className: 'custom-pilot-harbour-marker',
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 8px; background-color: #173B4D; border: 2px solid #00C9C1; box-shadow: 0 3px 8px rgba(23, 59, 77, 0.4); display: flex; align-items: center; justify-content: center; color: #00C9C1;">
        <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 2v20m0 0a8 8 0 01-8-8h2a6 6 0 0012 0h2a8 8 0 01-8 8zm0-16a3 3 0 100-6 3 3 0 000 6z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

/**
 * Leaflet DivIcon for Reported Gear Loss Coordinates
 */
function createReportedLossIcon() {
  return L.divIcon({
    className: 'custom-reported-loss-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -3px; border-radius: 9999px; background-color: rgba(0, 201, 193, 0.45); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #087E8B; border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(23, 59, 77, 0.4); display: flex; align-items: center; justify-content: center; color: white;">
          <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

/**
 * Leaflet DivIcon for Grounding Step
 */
function createGroundedStepIcon(stepNumber = 0) {
  return L.divIcon({
    className: 'custom-grounded-step-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -4px; border-radius: 9999px; background-color: rgba(225, 29, 72, 0.4); animation: ping 2s infinite;"></span>
        <div style="position: relative; width: 28px; height: 28px; border-radius: 9999px; background-color: #BE123C; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(190, 18, 60, 0.5); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; font-family: monospace;">
          ⚡${stepNumber}h
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Map controller to handle animated flight and bounding box fits
 */
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 11, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

/**
 * Screen 9 — Recovery Planning
 * Converted directly from Stitch designs (screen_9_recovery_planning)
 * Strictly conforms to Ratnagiri / Konkan Coast pilot study configuration.
 * Dynamically connected to verified incidents, risk prioritization, drift forecasting,
 * and persistent PostgreSQL recovery missions.
 */
export const RecoveryPlanning = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Selected incident resolution
  const [targetIncidentId, setTargetIncidentId] = useState(() =>
    resolveInitialIncidentId(searchParams, location.state)
  );
  const [targetIncidentData, setTargetIncidentData] = useState(null);
  const [loadingIncident, setLoadingIncident] = useState(false);

  // Verified incidents queue for incident selector dropdown
  const [verifiedIncidents, setVerifiedIncidents] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Latest drift forecast for the selected incident
  const [driftForecast, setDriftForecast] = useState(null);
  const [loadingDrift, setLoadingDrift] = useState(false);

  // Persistent recovery missions from database
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [selectedMission, setSelectedMission] = useState(null);
  const [missionStats, setMissionStats] = useState(null);

  // Notification message
  const [feedback, setFeedback] = useState(null);

  // Modal / Form state for creating a mission
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    region: TARGET_SECTOR,
    port: PRIMARY_PORT,
    targetDate: '',
    vessel: '',
    priority: 'HIGH',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // 1. Fetch verified incidents queue on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingQueue(true);
    getRiskQueue({ priority: 'all' })
      .then((data) => {
        if (!isMounted) return;
        const items = data?.items || [];
        setVerifiedIncidents(items);

        // If no incident is currently selected, default to #417 if present, or first item
        if (!targetIncidentId && items.length > 0) {
          const default417 = items.find((i) => i.report_id === 417);
          const initialId = default417 ? default417.report_id : items[0].report_id;
          setTargetIncidentId(initialId);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch verified incident queue for recovery planning:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingQueue(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch persistent recovery missions & stats from backend API on mount
  const fetchMissions = () => {
    setLoadingMissions(true);
    getRecoveryMissions({ page: 1, pageSize: 50 })
      .then((data) => {
        const items = data?.items || [];
        setMissions(items);
        if (items.length > 0 && !selectedMission) {
          setSelectedMission(items[0]);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch recovery missions from ledger:', err);
      })
      .finally(() => {
        setLoadingMissions(false);
      });

    getRecoveryMissionStats()
      .then((stats) => {
        setMissionStats(stats);
      })
      .catch((err) => {
        console.warn('Failed to fetch recovery mission stats:', err);
      });
  };

  useEffect(() => {
    fetchMissions();
  }, []);

  // 3. Sync targetIncidentId from searchParams or storage
  useEffect(() => {
    const resolved = resolveInitialIncidentId(searchParams, location.state);
    if (resolved && resolved !== targetIncidentId) {
      setTargetIncidentId(resolved);
    }
  }, [searchParams, location.state]);

  // 4. Fetch target incident risk metadata & drift forecast when targetIncidentId changes
  useEffect(() => {
    if (!targetIncidentId) {
      setTargetIncidentData(null);
      setDriftForecast(null);
      return;
    }
    setStoredIncidentId(targetIncidentId);

    // Update URL param if not matching
    const currentParam = searchParams.get('incidentId');
    if (String(currentParam) !== String(targetIncidentId)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('incidentId', String(targetIncidentId));
          return next;
        },
        { replace: true }
      );
    }

    let isMounted = true;
    setLoadingIncident(true);
    getIncidentRisk(targetIncidentId)
      .then((data) => {
        if (isMounted) {
          setTargetIncidentData(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch risk details for recovery incident:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingIncident(false);
      });

    setLoadingDrift(true);
    getLatestDriftForecast(targetIncidentId)
      .then((data) => {
        if (isMounted) {
          setDriftForecast(data);
        }
      })
      .catch((err) => {
        console.warn('Drift forecast query info:', err);
        if (isMounted) setDriftForecast(null);
      })
      .finally(() => {
        if (isMounted) setLoadingDrift(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetIncidentId]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Change selected incident handler
  const handleSelectIncident = (idStr) => {
    if (!idStr) {
      clearStoredIncidentId();
      setTargetIncidentId(null);
      setTargetIncidentData(null);
      setDriftForecast(null);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('incidentId');
          return next;
        },
        { replace: true }
      );
      return;
    }
    const newId = Number(idStr);
    setTargetIncidentId(newId);
  };

  // Helper to construct dynamic editable operational notes
  const generateDefaultNotes = (incident) => {
    if (!incident) return '';
    const gearLabel = (incident.gear_type || 'gear').charAt(0).toUpperCase() + (incident.gear_type || 'gear').slice(1).toLowerCase();
    const latStr = incident.latitude != null ? `${Number(incident.latitude).toFixed(4)}° N` : 'N/A';
    const lonStr = incident.longitude != null ? `${Number(incident.longitude).toFixed(4)}° E` : 'N/A';
    const scoreStr = incident.risk_score != null ? `${Number(incident.risk_score).toFixed(1)}/100` : 'N/A';
    const prioStr = incident.priority ? incident.priority.charAt(0).toUpperCase() + incident.priority.slice(1).toLowerCase() : 'High';

    return `Recovery planning for verified ${gearLabel} Incident #${incident.report_id || incident.id}. Reported location: ${latStr}, ${lonStr}. Risk priority: ${prioStr} (${scoreStr}). Departure reference: ${PRIMARY_PORT}. Review the latest drift forecast, environmental conditions, coastal restrictions, vessel availability and recovery window before approving deployment.`;
  };

  // Auto-fill form when create modal opens
  const handleOpenCreateModal = () => {
    const gearLabel = (targetIncidentData?.gear_type || 'Gear').charAt(0).toUpperCase() + (targetIncidentData?.gear_type || 'Gear').slice(1).toLowerCase();
    const defaultTitle = targetIncidentId
      ? `Ratnagiri ${gearLabel} Recovery – Incident #${targetIncidentId}`
      : 'Ratnagiri Recovery Operation';

    const defaultNotes = targetIncidentData
      ? generateDefaultNotes(targetIncidentData)
      : 'Recovery planning staged for Ratnagiri / Konkan Coast pilot study sector.';

    setFormData({
      name: defaultTitle,
      region: TARGET_SECTOR,
      port: PRIMARY_PORT,
      targetDate: '', // Kept empty until selected by user
      vessel: '', // Kept empty until selected by user (no fake vessel)
      priority: (targetIncidentData?.priority || 'HIGH').toUpperCase(),
      notes: defaultNotes,
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  // Suggest date helper (Next 48h Window / Tomorrow)
  const handleSuggestDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setFormData((prev) => ({
      ...prev,
      targetDate: `${yyyy}-${mm}-${dd}`,
    }));
    if (formErrors.targetDate) {
      setFormErrors((prev) => ({ ...prev, targetDate: null }));
    }
  };

  // Form submission & mission persistence
  const handleCreateMission = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Mission title is required';
    if (!formData.vessel.trim()) {
      errors.vessel = 'Assigned vessel or salvage unit is required (please enter a valid vessel name)';
    }
    if (!formData.targetDate) {
      errors.targetDate = 'Planned date window is required';
    } else {
      const selected = new Date(`${formData.targetDate}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        errors.targetDate = 'Planned date window cannot be in the past. Please select an upcoming operational date.';
      }
    }

    if (!targetIncidentId) {
      errors.name = 'Please select a verified incident before staging a mission';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setFormErrors({});

    try {
      const payload = {
        report_id: Number(targetIncidentId),
        title: formData.name.trim(),
        target_sector: formData.region,
        departure_port: formData.port,
        assigned_to: formData.vessel.trim(),
        scheduled_at: `${formData.targetDate}T08:00:00Z`,
        priority: formData.priority,
        operational_notes: formData.notes.trim(),
        status: 'planned',
      };

      const createdMission = await createRecoveryMission(payload);

      // Prepend newly created mission to missions list immediately
      setMissions((prev) => [createdMission, ...prev]);
      setSelectedMission(createdMission);
      setShowCreateModal(false);
      setFeedback({
        type: 'success',
        message: `Recovery mission "${createdMission.title}" created successfully and saved to operational database!`,
      });
    } catch (err) {
      console.error('Failed to create recovery mission:', err);
      setFormErrors({ submit: err.message || 'Failed to save mission. Please check inputs and retry.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Map center calculation
  const mapCenter = useMemo(() => {
    if (targetIncidentData?.latitude && targetIncidentData?.longitude) {
      return [targetIncidentData.latitude, targetIncidentData.longitude];
    }
    if (selectedMission?.incident_latitude && selectedMission?.incident_longitude) {
      return [selectedMission.incident_latitude, selectedMission.incident_longitude];
    }
    return [PRIMARY_PORT_COORDS.lat, PRIMARY_PORT_COORDS.lng];
  }, [targetIncidentData, selectedMission]);

  // Valid drift trajectory polyline points
  const validDriftPolyline = useMemo(() => {
    if (!driftForecast?.points) return [];
    return driftForecast.points
      .filter((p) => p.is_valid_drift)
      .map((p) => [p.latitude, p.longitude]);
  }, [driftForecast]);

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Operational Feedback Notification Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
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
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Operational Context Bar & View Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#087E8B] uppercase tracking-wider">
            <span>Operations</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#173B4D] font-semibold">Recovery Planning</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-2xl font-bold font-display text-[#173B4D] tracking-tight">
              Recovery Planning
            </h1>
            <span className="px-2 py-0.5 rounded bg-[#EAF7F7] text-[#087E8B] font-mono text-[11px] font-semibold">
              Ratnagiri Pilot Study
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl font-sans">
            Plan, orchestrate, and record ALDFG retrieval missions for the Arabian Sea – Ratnagiri / Konkan Coast sector. Staging assets depart from Mirkarwada Fishing Harbour.
          </p>
        </div>

        {/* Action Toolbar with Incident Selector & Create Mission Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Incident Selector Dropdown */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#D8ECEC] shadow-2xs">
            <span className="material-symbols-outlined text-[#087E8B] text-base">filter_center_focus</span>
            <label className="text-[10px] font-mono uppercase text-slate-500 font-bold">
              Target Incident:
            </label>
            <select
              value={targetIncidentId || ''}
              onChange={(e) => handleSelectIncident(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-[#173B4D] focus:outline-none cursor-pointer"
            >
              <option value="">Select Verified Incident...</option>
              {verifiedIncidents.map((inc) => (
                <option key={inc.report_id} value={inc.report_id}>
                  #{inc.report_id} — {(inc.gear_type || 'gear').toUpperCase()} (Risk {inc.risk_score != null ? Number(inc.risk_score).toFixed(1) : 'N/A'} • {inc.priority?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="h-9 px-4 rounded-lg bg-[#00C9C1] text-[#173B4D] text-xs font-bold font-display hover:bg-[#00b5ae] active:scale-[0.99] transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>+ Create Recovery Mission</span>
          </button>
        </div>
      </div>

      {/* Dynamic Summary Metric Cards (Database-driven) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Missions */}
        <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Total Missions
            </span>
            <span className="text-2xl font-bold font-mono text-[#173B4D] mt-1">
              {missionStats?.total_missions ?? missions.length}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Database Recorded</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF7F7] text-[#087E8B] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">assignment</span>
          </div>
        </div>

        {/* Planned */}
        <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Planned
            </span>
            <span className="text-2xl font-bold font-mono text-amber-600 mt-1">
              {missionStats?.planned ?? missions.filter((m) => (m.status || '').toLowerCase() === 'planned').length}
            </span>
            <span className="text-[10px] text-amber-600 mt-0.5">Staged For Deployment</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">schedule</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              In Progress
            </span>
            <span className="text-2xl font-bold font-mono text-[#087E8B] mt-1">
              {missionStats?.in_progress ?? missions.filter((m) => (m.status || '').toLowerCase() === 'in_progress').length}
            </span>
            <span className="text-[10px] text-[#087E8B] mt-0.5">Recovery Underway</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAF7F7] text-[#087E8B] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">directions_boat</span>
          </div>
        </div>

        {/* Successfully Recovered */}
        <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 font-bold tracking-wider">
              Successfully Recovered
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-700 mt-1">
              {missionStats?.successfully_recovered ??
                missions.filter((m) => ['successfully_recovered', 'completed', 'recovered'].includes((m.status || '').toLowerCase())).length}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5">Gear Retrieved Cleanly</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
        </div>
      </div>

      {/* Target Incident Staging Banner (Dynamically connected across modules) */}
      {targetIncidentId && (
        <section className="w-full bg-white p-4 rounded-xl border border-[#00C9C1] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-[#F2FAFA] to-white">
          <div className="flex items-start md:items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#EAF7F7] border border-[#00C9C1] flex items-center justify-center text-[#087E8B] shrink-0">
              <span className="material-symbols-outlined text-xl">anchor</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#087E8B]">
                  TARGET INCIDENT #{targetIncidentId}
                </span>
                {targetIncidentData && (
                  <>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-700">
                      {targetIncidentData.gear_type}
                    </span>
                    <span
                      className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                        targetIncidentData.priority === 'critical'
                          ? 'bg-rose-100 text-rose-700'
                          : targetIncidentData.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : targetIncidentData.priority === 'medium'
                          ? 'bg-teal-100 text-[#087E8B]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Priority: {targetIncidentData.priority} (
                      {targetIncidentData.risk_score != null
                        ? Number(targetIncidentData.risk_score).toFixed(1)
                        : 'N/A'}/100)
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      Location: {targetIncidentData.latitude?.toFixed(4)}° N, {targetIncidentData.longitude?.toFixed(4)}° E
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Verified
                    </span>
                  </>
                )}
                {loadingIncident && (
                  <span className="text-[10px] font-mono text-slate-400">Loading risk context...</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {targetIncidentData?.primary_reason ||
                  'Staged from Risk Prioritization queue for recovery planning and fleet deployment.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <Link
              to={`/ngo/risk-prioritization?incidentId=${targetIncidentId}`}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#D8ECEC] text-xs font-semibold text-[#087E8B] hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">assessment</span>
              <span>Risk Breakdown</span>
            </Link>
            <Link
              to={`/ngo/drift-forecasting?incidentId=${targetIncidentId}`}
              className="px-2.5 py-1 rounded-lg bg-white border border-[#D8ECEC] text-xs font-semibold text-[#087E8B] hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">air</span>
              <span>Drift Vector</span>
            </Link>
            <button
              onClick={() => handleSelectIncident('')}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Clear target incident"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </section>
      )}

      {/* Primary Split Architecture: Mission Queue & Config (40%) vs GIS Map Canvas (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Mission Queue and Planning Config Form */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-w-0">
          {/* Active & Draft Missions Queue */}
          <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#087E8B] text-base">
                  assignment_late
                </span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display">
                  Active &amp; Draft Missions
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {missions.length} RECORDED
              </span>
            </div>

            {/* Mission List or Empty State */}
            {loadingMissions ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#087E8B] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : missions.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  icon="sailing"
                  title="No recovery plans created yet."
                  description="Select a verified incident from the queue and click '+ Create Recovery Mission' to stage deployment assets from Mirkarwada Harbour."
                  actionText="+ Create First Mission"
                  actionOnClick={handleOpenCreateModal}
                  secondaryNote="Operational data integrity policy: No sample recovery plans are fabricated."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[520px] overflow-y-auto pr-1">
                {missions.map((msn) => {
                  const isSelected = selectedMission?.id === msn.id;
                  const displayId = `OR-MSN-${String(msn.id).padStart(3, '0')}`;
                  const title = msn.title || `Recovery Operation – Incident #${msn.report_id}`;
                  const gearType = (msn.incident_gear_type || targetIncidentData?.gear_type || 'Ghost Net').toUpperCase();
                  const departurePort = msn.departure_port || PRIMARY_PORT;
                  const vesselName = msn.assigned_to || msn.vessel || 'Unassigned Fleet';
                  const routeDistance = msn.selected_route_distance_km != null
                    ? `${Number(msn.selected_route_distance_km).toFixed(2)} km`
                    : 'Pending Route';
                  const creationDate = msn.created_at
                    ? new Date(msn.created_at).toLocaleDateString()
                    : 'Recent';

                  // Dynamic status badge styling
                  const statusRaw = (msn.status || 'planned').toLowerCase();
                  let statusBadge = {
                    label: 'Planned',
                    bg: 'bg-amber-50 text-amber-700 border-amber-200',
                    dot: 'bg-amber-500',
                  };
                  if (statusRaw === 'successfully_recovered' || statusRaw === 'recovered' || statusRaw === 'completed') {
                    statusBadge = {
                      label: 'Successfully Recovered',
                      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      dot: 'bg-emerald-500',
                    };
                  } else if (statusRaw === 'partially_recovered') {
                    statusBadge = {
                      label: 'Partially Recovered',
                      bg: 'bg-teal-50 text-teal-800 border-teal-200',
                      dot: 'bg-teal-500',
                    };
                  } else if (statusRaw === 'in_progress') {
                    statusBadge = {
                      label: 'In Progress',
                      bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
                      dot: 'bg-cyan-500 animate-pulse',
                    };
                  } else if (statusRaw === 'unsuccessful') {
                    statusBadge = {
                      label: 'Recovery Unsuccessful',
                      bg: 'bg-rose-50 text-rose-700 border-rose-200',
                      dot: 'bg-rose-500',
                    };
                  } else if (statusRaw === 'cancelled') {
                    statusBadge = {
                      label: 'Cancelled',
                      bg: 'bg-slate-100 text-slate-600 border-slate-300',
                      dot: 'bg-slate-400',
                    };
                  }

                  return (
                    <div
                      key={msn.id}
                      onClick={() => setSelectedMission(msn)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative shrink-0 flex flex-col gap-2.5 ${
                        isSelected
                          ? 'bg-[#F2FAFA] border-[#00C9C1] shadow-xs ring-1 ring-[#00C9C1]/40'
                          : 'bg-white border-[#D8ECEC] hover:bg-slate-50/80 hover:border-[#00C9C1]/50'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#00C9C1] rounded-l-xl"></div>
                      )}

                      {/* Header: Mission ID, Incident ID & Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-[#087E8B] tracking-tight">
                            {displayId}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            INC #{msn.report_id}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase bg-[#EAF7F7] text-[#087E8B] border border-[#00C9C1]/30">
                            {gearType}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold uppercase border flex items-center gap-1 shrink-0 ${statusBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                          <span>{statusBadge.label}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs font-bold text-[#173B4D] font-display line-clamp-1" title={title}>
                        {title}
                      </h3>

                      {/* Key recovery metadata grid */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 pt-2 border-t border-[#D8ECEC]/60">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-sm text-[#087E8B] shrink-0">directions_boat</span>
                          <span className="truncate" title={vesselName}>
                            <span className="text-slate-400 font-medium">Vessel:</span> <strong className="text-[#173B4D] font-semibold">{vesselName}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-sm text-[#087E8B] shrink-0">anchor</span>
                          <span className="truncate" title={departurePort}>
                            <span className="text-slate-400 font-medium">Harbour:</span> <strong className="text-[#173B4D] font-semibold">{departurePort.split(',')[0]}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-sm text-[#087E8B] shrink-0">alt_route</span>
                          <span className="truncate">
                            <span className="text-slate-400 font-medium">Route:</span> <strong className="text-[#173B4D] font-mono font-semibold">{routeDistance}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-sm text-[#087E8B] shrink-0">calendar_today</span>
                          <span className="truncate font-mono">
                            <span className="text-slate-400 font-medium">Created:</span> <span className="text-slate-600 font-medium">{creationDate}</span>
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8ECEC]/60 mt-0.5">
                        <Link
                          to={`/ngo/recovery-missions/${msn.id}/route-optimization`}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 px-3 rounded-lg bg-white border border-[#00C9C1] text-xs font-semibold text-[#087E8B] hover:bg-[#EAF7F7] active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-2xs"
                          title="Review or optimize route"
                        >
                          <span className="material-symbols-outlined text-sm text-[#087E8B]">alt_route</span>
                          <span>Optimize Route</span>
                        </Link>
                        <Link
                          to={`/ngo/recovery-missions/${msn.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="h-8 px-3 rounded-lg bg-[#173B4D] hover:bg-[#087E8B] active:scale-[0.98] text-white text-xs font-bold font-display transition-all flex items-center gap-1.5 shadow-xs"
                          title="View mission details & outcome tracking"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>View Details</span>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mission Staging Configuration Panel */}
          <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#087E8B] text-base">
                  settings_suggest
                </span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display">
                  Mission Staging Parameters
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#087E8B] font-semibold">
                {selectedMission ? `OR-MSN-${String(selectedMission.id).padStart(3, '0')}` : 'NO SELECTION'}
              </span>
            </div>

            {selectedMission ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Target Sector
                    </span>
                    <span className="font-semibold text-[#173B4D] mt-0.5 block truncate">
                      {selectedMission.target_sector || TARGET_SECTOR}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Staging Port
                    </span>
                    <span className="font-semibold text-[#173B4D] mt-0.5 block truncate">
                      {selectedMission.departure_port || PRIMARY_PORT}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#F2FAFA] border border-[#D8ECEC] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Assigned Salvage Vessel
                    </span>
                    <span className="text-xs font-bold text-[#173B4D] mt-0.5 block">
                      {selectedMission.assigned_to || selectedMission.vessel || 'Unassigned'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[#087E8B] text-xl">
                    directions_boat
                  </span>
                </div>

                <div className="p-2.5 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                    Planned Date Window
                  </span>
                  <span className="text-xs font-mono font-bold text-[#173B4D] mt-0.5 block">
                    {selectedMission.scheduled_at ? selectedMission.scheduled_at.split('T')[0] : 'Upcoming'}
                  </span>
                </div>

                {selectedMission.operational_notes && (
                  <div className="p-2.5 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                      Operational Salvage Notes
                    </span>
                    <p className="text-[11px] text-slate-700 mt-1 line-clamp-3 leading-relaxed">
                      {selectedMission.operational_notes}
                    </p>
                  </div>
                )}

                <div className="pt-2 grid grid-cols-2 gap-2 border-t border-[#D8ECEC]">
                  <Link
                    to={`/ngo/recovery-missions/${selectedMission.id}/route-optimization`}
                    className="h-9 rounded-lg bg-[#EAF7F7] border border-[#00C9C1] text-[#087E8B] font-display text-xs font-bold hover:bg-[#d5eded] transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base">alt_route</span>
                    <span>Route Optimization</span>
                  </Link>
                  <Link
                    to={`/ngo/recovery-missions/${selectedMission.id}`}
                    className="h-9 rounded-lg bg-[#00C9C1] text-[#173B4D] font-display text-xs font-bold hover:bg-[#00b5ae] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">track_changes</span>
                    <span>Recovery Tracking</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-6 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">
                  tune
                </span>
                <span className="text-xs font-semibold text-[#173B4D]">
                  Staging Engine Idle
                </span>
                <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                  Select a mission from the ledger or click "+ Create Recovery Mission" to stage departure from Mirkarwada Harbour.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tactical Navigational Corridor Leaflet GIS Map Canvas */}
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          <div className="bg-white rounded-xl p-4 border border-[#D8ECEC] shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#087E8B] text-base">explore</span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display">
                  Waypoints &amp; Tactical Navigational Corridor
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-mono font-bold">
                  ROUTE PLANNING PENDING
                </span>
              </div>
            </div>

            {/* Tactical Navigational Corridor Banner */}
            <div className="bg-[#F2FAFA] border border-[#D8ECEC] rounded-lg p-2.5 flex items-start gap-2.5 text-xs">
              <span className="material-symbols-outlined text-[#087E8B] text-base shrink-0 mt-0.5">info</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                <strong className="text-[#173B4D]">Corridor Clearance Protocol:</strong> Tactical marine routing between Mirkarwada Fishing Harbour (16.99° N, 73.30° E) and target coordinates will be finalized upon vessel departure. In accordance with operational integrity, no hypothetical corridors are fabricated.
              </p>
            </div>

            {/* Interactive Leaflet Map */}
            <div className="relative w-full h-[380px] rounded-lg overflow-hidden border border-[#D8ECEC] shadow-inner isolate z-0">
              <MapContainer
                center={mapCenter}
                zoom={11}
                scrollWheelZoom={true}
                className="w-full h-full"
                style={{ height: '380px', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController center={mapCenter} zoom={11} />

                {/* 1. Pilot Harbour Benchmark: Mirkarwada Fishing Harbour */}
                <Marker
                  position={[PRIMARY_PORT_COORDS.lat, PRIMARY_PORT_COORDS.lng]}
                  icon={pilotHarbourIcon}
                >
                  <Popup>
                    <div className="p-2 flex flex-col gap-1 text-xs max-w-xs font-sans">
                      <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold">
                        Primary Staging Harbour
                      </span>
                      <h4 className="font-bold text-[#173B4D] text-sm">{PRIMARY_PORT}</h4>
                      <span className="font-mono text-[11px] text-slate-500">
                        {PRIMARY_PORT_COORDS.lat.toFixed(4)}° N, {PRIMARY_PORT_COORDS.lng.toFixed(4)}° E
                      </span>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Ratnagiri, Maharashtra, India. Primary operational departure base for all pilot recovery missions.
                      </p>
                    </div>
                  </Popup>
                  <Tooltip direction="top" offset={[0, -28]}>
                    <span className="font-mono text-xs font-bold">Base: Mirkarwada Harbour</span>
                  </Tooltip>
                </Marker>

                {/* 2. Pilot Study Boundary Rectangle */}
                <Rectangle
                  bounds={PILOT_STUDY_BOUNDARY.bounds}
                  pathOptions={{
                    color: '#087E8B',
                    weight: 1.5,
                    dashArray: '5, 8',
                    fillColor: '#00C9C1',
                    fillOpacity: 0.04,
                  }}
                >
                  <Tooltip sticky>
                    <div className="font-mono text-xs">
                      {PILOT_STUDY_BOUNDARY.label}
                    </div>
                  </Tooltip>
                </Rectangle>

                {/* 3. Target Incident Reported Location */}
                {targetIncidentData?.latitude != null && targetIncidentData?.longitude != null && (
                  <Marker
                    position={[targetIncidentData.latitude, targetIncidentData.longitude]}
                    icon={createReportedLossIcon()}
                  >
                    <Popup>
                      <div className="p-2 flex flex-col gap-1 text-xs max-w-xs font-sans">
                        <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold">
                          Target Incident #{targetIncidentData.report_id || targetIncidentData.id}
                        </span>
                        <h4 className="font-bold text-[#173B4D] text-sm capitalize">
                          {targetIncidentData.gear_type || 'Fishing Gear'}
                        </h4>
                        <span className="font-mono text-[11px] text-slate-500">
                          {targetIncidentData.latitude.toFixed(4)}° N, {targetIncidentData.longitude.toFixed(4)}° E
                        </span>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-800">
                            Priority: {targetIncidentData.priority}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600">
                            Score: {targetIncidentData.risk_score != null ? Number(targetIncidentData.risk_score).toFixed(1) : 'N/A'}/100
                          </span>
                        </div>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -30]}>
                      <span className="font-mono text-xs font-bold">
                        Incident #{targetIncidentData.report_id} ({targetIncidentData.gear_type})
                      </span>
                    </Tooltip>
                  </Marker>
                )}

                {/* 4. Valid Drift Trajectory (if available) */}
                {validDriftPolyline.length > 1 && (
                  <Polyline
                    positions={validDriftPolyline}
                    pathOptions={{
                      color: '#F59E0B',
                      weight: 3,
                      dashArray: '4, 6',
                    }}
                  >
                    <Tooltip sticky>
                      <span className="font-mono text-xs">
                        Valid Hydrodynamic Drift Trajectory ({validDriftPolyline.length} steps)
                      </span>
                    </Tooltip>
                  </Polyline>
                )}

                {/* 5. Shoreline Grounding Marker (if grounding detected) */}
                {driftForecast?.grounding_detected && driftForecast?.grounding_location && (
                  <Marker
                    position={[
                      driftForecast.grounding_location.latitude,
                      driftForecast.grounding_location.longitude,
                    ]}
                    icon={createGroundedStepIcon(driftForecast.points?.findIndex((p) => !p.is_valid_drift) || 0)}
                  >
                    <Popup>
                      <div className="p-2 flex flex-col gap-1 text-xs max-w-xs font-sans">
                        <span className="text-[10px] font-mono text-rose-600 uppercase font-bold">
                          Shoreline Grounding Detected
                        </span>
                        <p className="text-[11px] text-slate-600">
                          Post-grounding steps excluded from water recovery trajectory. Gear grounded on Konkan coast.
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* Cross-Module Telemetry Integration Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Incident Triage
                </span>
                <span className="font-bold text-[#173B4D] text-[11px] mt-0.5 block truncate">
                  {targetIncidentData ? `#${targetIncidentData.report_id} (${targetIncidentData.gear_type})` : 'Idle'}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-semibold block">
                  {targetIncidentData ? 'Verified Report' : 'Select Incident'}
                </span>
              </div>

              <div className="p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Risk Prioritization
                </span>
                <span className="font-bold text-[#173B4D] text-[11px] mt-0.5 block">
                  {targetIncidentData?.risk_score != null
                    ? `${Number(targetIncidentData.risk_score).toFixed(1)}/100`
                    : 'N/A'}
                </span>
                <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold block">
                  Tier: {targetIncidentData?.priority || 'N/A'}
                </span>
              </div>

              <div className="p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Drift Trajectory
                </span>
                <span className="font-bold text-[#173B4D] text-[11px] mt-0.5 block truncate">
                  {driftForecast ? `${driftForecast.points_count} Vectors Computed` : 'Forecast Unavailable'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block truncate">
                  {driftForecast?.grounding_detected
                    ? 'Coastal Grounding'
                    : driftForecast
                    ? 'Hydrodynamic Drift Active'
                    : 'Generate in Forecasting'}
                </span>
              </div>

              <div className="p-2 rounded bg-[#F2FAFA] border border-[#D8ECEC]">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                  Environmental Data
                </span>
                <span className="font-bold text-[#173B4D] text-[11px] mt-0.5 block truncate">
                  {targetIncidentData?.wind_speed != null
                    ? `Wind: ${targetIncidentData.wind_speed} km/h`
                    : 'Ratnagiri Shelf Station'}
                </span>
                <span className="text-[10px] font-mono text-slate-500 block truncate">
                  {targetIncidentData?.environmental_source || 'Open-Meteo Marine'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Mission Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative z-[10000] bg-white rounded-2xl border border-[#D8ECEC] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-xl">add_circle</span>
                <div>
                  <h3 className="font-display font-bold text-base text-[#173B4D]">
                    Create Recovery Mission
                  </h3>
                  <span className="text-[11px] font-mono text-[#087E8B]">
                    Ratnagiri Pilot Study • Incident #{targetIncidentId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {formErrors.submit && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {formErrors.submit}
              </div>
            )}

            <form onSubmit={handleCreateMission} className="flex flex-col gap-3.5">
              {/* Mission Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Mission Designation / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ratnagiri Gillnet Recovery – Incident #417"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`h-9 px-3 rounded-lg border text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] ${
                    formErrors.name ? 'border-rose-400 bg-rose-50' : 'border-[#D8ECEC] bg-[#F2FAFA]'
                  }`}
                />
                {formErrors.name && (
                  <span className="text-[10px] text-rose-500">{formErrors.name}</span>
                )}
              </div>

              {/* Geographical Sector & Departure Port (Ratnagiri Configured) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Target Marine Sector *
                  </label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  >
                    <option value={TARGET_SECTOR}>{TARGET_SECTOR}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Departure Port *
                  </label>
                  <select
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  >
                    <option value={PRIMARY_PORT}>{PRIMARY_PORT}</option>
                  </select>
                </div>
              </div>

              {/* Vessel Assignment & Planned Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Assigned Vessel *
                  </label>
                  <input
                    type="text"
                    placeholder="Enter vessel name (e.g. Sagar Kanya, Sagar Sampada)"
                    value={formData.vessel}
                    onChange={(e) => setFormData({ ...formData, vessel: e.target.value })}
                    className={`h-9 px-3 rounded-lg border text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] ${
                      formErrors.vessel ? 'border-rose-400 bg-rose-50' : 'border-[#D8ECEC] bg-[#F2FAFA]'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400">
                    Manual entry for salvage fleet unit
                  </span>
                  {formErrors.vessel && (
                    <span className="text-[10px] text-rose-500">{formErrors.vessel}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                      Planned Date Window *
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggestDate}
                      className="text-[10px] font-mono text-[#087E8B] hover:underline"
                    >
                      Suggest Date
                    </button>
                  </div>
                  <input
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                    className={`h-9 px-3 rounded-lg border text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] ${
                      formErrors.targetDate ? 'border-rose-400 bg-rose-50' : 'border-[#D8ECEC] bg-[#F2FAFA]'
                    }`}
                  />
                  <span className="text-[9px] font-mono text-slate-400">
                    Must be upcoming operational date
                  </span>
                  {formErrors.targetDate && (
                    <span className="text-[10px] text-rose-500">{formErrors.targetDate}</span>
                  )}
                </div>
              </div>

              {/* Operational Salvage Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Operational Salvage Notes (Generated Summary)
                </label>
                <textarea
                  rows="3"
                  placeholder="Recovery gear requirements, diver safety protocols, winch specifications..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="p-2.5 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] leading-relaxed"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8ECEC]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg text-xs font-bold font-display bg-[#00C9C1] text-[#173B4D] hover:bg-[#00b5ae] transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-[#173B4D] border-t-transparent rounded-full animate-spin"></div>
                      <span>Persisting Mission...</span>
                    </>
                  ) : (
                    <span>Save Mission Plan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryPlanning;
