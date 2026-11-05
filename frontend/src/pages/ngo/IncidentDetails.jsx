import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import EmptyState from '../../components/ngo/EmptyState';
import { getReportById, updateReportStatus } from '../../services/ngoService';
import {
  runReportInference,
  getDetectionsByReport,
  confirmDetection,
  rejectDetection,
} from '../../services/detectionService';
import { API_BASE_URL } from '../../services/api';
import { setStoredIncidentId } from '../../utils/incidentStorage';

/**
 * Screen 4 — Incident Details & Verification Review
 * Converted directly from Stitch designs (screen_4_incident_details_review)
 * Connected to live FastAPI + PostgreSQL backend.
 * Conforms strictly to Requirement 9: No fictional or fabricated sample records.
 */
export const IncidentDetails = () => {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [detections, setDetections] = useState([]);
  const [runningAi, setRunningAi] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [reviewingId, setReviewingId] = useState(null);
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    detection: null,
    reason: '',
    reviewer: 'NGO Field Officer',
    submitting: false,
  });

  const loadIncident = async () => {
    if (!id || isNaN(Number(id))) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getReportById(Number(id));
      setIncident(data);
      if (data?.id) {
        if (data.status === 'verified') {
          setStoredIncidentId(data.id);
        }
        try {
          const dets = await getDetectionsByReport(data.id);
          setDetections(dets || []);
        } catch (e) {
          console.warn('Failed to fetch linked detections:', e.message);
        }
      }
    } catch (err) {
      console.warn('Failed to load incident record:', err.message);
      setIncident(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!incident) return;
    try {
      setUpdating(true);
      const updated = await updateReportStatus(incident.id, newStatus, `Status updated via NGO Incident Review`);
      setIncident(updated);
      setStatusMessage(`Incident successfully marked as ${newStatus}.`);
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleRunAi = async () => {
    if (!incident?.id) return;
    try {
      setRunningAi(true);
      setAiMessage('');
      const res = await runReportInference(incident.id);
      const updatedDets = await getDetectionsByReport(incident.id);
      setDetections(updatedDets || []);
      setIncident((prev) => ({
        ...prev,
        ai_detections_count: updatedDets?.length || res.detections_count || prev.ai_detections_count,
      }));
      setAiMessage(`AI Detection complete: ${res.detections_count} candidate target(s) identified.`);
      setTimeout(() => setAiMessage(''), 6000);
    } catch (err) {
      alert(`AI inference failed: ${err.message}`);
    } finally {
      setRunningAi(false);
    }
  };

  const handleConfirmDetection = async (det) => {
    try {
      setReviewingId(det.id);
      setDetectionFeedback('');
      const updated = await confirmDetection(det.id, {
        reviewedBy: 'NGO Field Officer',
        reviewNotes: 'Confirmed actual fishing gear presence.',
      });
      setDetections((prev) => prev.map((d) => (d.id === det.id ? updated : d)));
      setDetectionFeedback(`AI Detection #${det.id} confirmed as verified gear presence.`);
      setTimeout(() => setDetectionFeedback(''), 5000);
    } catch (err) {
      alert(`Confirm action failed: ${err.message}`);
    } finally {
      setReviewingId(null);
    }
  };

  const handleOpenRejectModal = (det) => {
    setRejectModal({
      isOpen: true,
      detection: det,
      reason: '',
      reviewer: 'NGO Field Officer',
      submitting: false,
    });
  };

  const handleSubmitReject = async () => {
    if (!rejectModal.detection) return;
    try {
      setRejectModal((prev) => ({ ...prev, submitting: true }));
      const updated = await rejectDetection(rejectModal.detection.id, {
        reviewedBy: rejectModal.reviewer || 'NGO Field Officer',
        reviewNotes: rejectModal.reason || 'Flagged as false positive detection.',
      });
      setDetections((prev) =>
        prev.map((d) => (d.id === rejectModal.detection.id ? updated : d))
      );
      setDetectionFeedback(`AI Detection #${rejectModal.detection.id} flagged as false positive.`);
      setRejectModal({
        isOpen: false,
        detection: null,
        reason: '',
        reviewer: 'NGO Field Officer',
        submitting: false,
      });
      setTimeout(() => setDetectionFeedback(''), 5000);
    } catch (err) {
      alert(`Rejection failed: ${err.message}`);
      setRejectModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="material-symbols-outlined text-[#087E8B] text-4xl animate-spin mb-2">
          progress_activity
        </span>
        <span className="text-xs font-mono text-slate-500">Querying PostGIS incident telemetry...</span>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col w-full gap-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Link
            to="/ngo/incidents"
            className="text-[#087E8B] hover:text-[#00C9C1] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Incidents</span>
          </Link>
          <span>/</span>
          <span className="text-[#173B4D] font-semibold">{id ? `Record #${id}` : 'Incident Inspection'}</span>
        </div>

        <div className="bg-white rounded-xl border border-[#D8ECEC] p-6 sm:p-12 shadow-xs">
          <EmptyState
            icon="find_in_page"
            title={id ? `Incident Record #${id} Not Found` : 'No Incident Report Selected'}
            description={
              id
                ? `No cataloged incident record matches the identifier "${id}". Select a verified target from the operational incident ledger.`
                : 'Select an incident from the Incident Management queue to inspect coordinates, review field media, and confirm retrieval status.'
            }
            actionText="View Incident Queue"
            actionLink="/ngo/incidents"
            secondaryNote="Operational data integrity policy: No sample incident records are fabricated."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <Link
            to="/ngo/incidents"
            className="text-[#087E8B] hover:text-[#00C9C1] transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Incidents</span>
          </Link>
          <span>/</span>
          <span className="text-[#173B4D] font-bold">Incident #{incident.id}</span>
          <span>/</span>
          <span className="text-slate-400 capitalize">{incident.gear_type}</span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Current Status:</span>
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase bg-[#EAF7F7] text-[#087E8B] border border-[#D8ECEC]">
            {incident.status}
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {detectionFeedback && (
        <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-teal-600">verified</span>
          <span>{detectionFeedback}</span>
        </div>
      )}

      {/* Main Inspection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Incident Details & Field Media */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-6 shadow-xs flex flex-col gap-5">
            <div className="flex items-start justify-between pb-4 border-b border-[#D8ECEC]">
              <div>
                <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold tracking-wider">
                  Operational ALDFG Target
                </span>
                <h1 className="text-xl font-bold font-display text-[#173B4D] mt-0.5 capitalize">
                  {incident.gear_type.replace('_', ' ')} Sighting #{incident.id}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Reported: {new Date(incident.reported_at).toLocaleString()}
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {incident.status !== 'verified' && (
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('verified')}
                    className="px-3 py-1.5 rounded-lg bg-[#00C9C1] text-[#173B4D] text-xs font-bold hover:bg-[#00b5ae] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span>
                    <span>Verify Incident</span>
                  </button>
                )}
                {incident.status === 'verified' && (
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('scheduled_recovery')}
                    className="px-3 py-1.5 rounded-lg bg-[#087E8B] text-white text-xs font-bold hover:bg-[#075E63] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">anchor</span>
                    <span>Schedule Salvage</span>
                  </button>
                )}
                {incident.status === 'verified' && (
                  <>
                    <Link
                      to={`/ngo/map?selected=${incident.id}`}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] text-[#087E8B] hover:bg-[#F2FAFA] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">map</span>
                      <span>View on Map</span>
                    </Link>
                    <Link
                      to={`/ngo/drift-forecasting?incidentId=${incident.id}`}
                      state={{ incident, incidentId: incident.id }}
                      onClick={() => setStoredIncidentId(incident.id)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] text-amber-700 hover:bg-[#F2FAFA] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">explore</span>
                      <span>Model Drift</span>
                    </Link>
                  </>
                )}
                {incident.status !== 'resolved' && (
                  <button
                    disabled={updating}
                    onClick={() => handleStatusChange('resolved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                    <span>Mark Cleared</span>
                  </button>
                )}
              </div>
            </div>

            {/* Reporting Information & Provenance Section */}
            <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#087E8B] text-lg">
                    assignment_turned_in
                  </span>
                  <span className="text-xs font-mono uppercase text-[#087E8B] font-bold tracking-wider">
                    Reporting Provenance &amp; Fix Quality
                  </span>
                </div>
                {/* Method Pill */}
                <div className="flex items-center gap-2">
                  {incident.reporting_method === 'manual' || incident.location_type === 'estimated' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-amber-600">map</span>
                      <span>Manual Location Report</span>
                    </span>
                  ) : incident.reporting_method === 'gps' || incident.location_type === 'exact' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-sky-600">my_location</span>
                      <span>GPS-Based Report</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-slate-500">history</span>
                      <span>Legacy Telemetry</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {/* Reporting Method */}
                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                    Reporting Method
                  </span>
                  <span className="font-semibold text-[#173B4D] capitalize">
                    {incident.reporting_method ? `${incident.reporting_method.toUpperCase()} Intake` : 'Legacy / Unspecified'}
                  </span>
                </div>

                {/* Location Fix Type */}
                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                    Location Fix Type
                  </span>
                  <span className="font-semibold text-[#173B4D] capitalize">
                    {incident.location_type === 'estimated'
                      ? 'Estimated (Non-GPS)'
                      : incident.location_type === 'exact'
                      ? 'Exact GPS Waypoint'
                      : 'Legacy Observation'}
                  </span>
                </div>

                {/* Uncertainty Radius */}
                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                    Assumed Search Radius
                  </span>
                  <span className="font-semibold text-[#173B4D]">
                    {incident.location_uncertainty_radius_m
                      ? `±${incident.location_uncertainty_radius_m >= 1000 ? (incident.location_uncertainty_radius_m / 1000).toFixed(1) + ' km' : Math.round(incident.location_uncertainty_radius_m) + ' meters'}`
                      : incident.location_type === 'exact' || incident.reporting_method === 'gps'
                      ? 'Exact GPS Fix'
                      : 'Unspecified'}
                  </span>
                  {incident.location_uncertainty_radius_m && (
                    <span className="text-[9px] text-slate-500 block mt-0.5 font-normal">
                      Planning assumption; not scientifically verified
                    </span>
                  )}
                </div>

                {/* Loss Date / Time */}
                {incident.loss_date_time && (
                  <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                      Loss Date &amp; Time
                    </span>
                    <span className="font-semibold text-[#173B4D]">
                      {new Date(incident.loss_date_time).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Nearby Landmark */}
                {incident.nearby_landmark && (
                  <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                      Referenced Landmark
                    </span>
                    <span className="font-semibold text-[#173B4D]">
                      {incident.nearby_landmark}
                      {incident.direction_from_landmark ? ` (${incident.direction_from_landmark})` : ''}
                    </span>
                  </div>
                )}

                {/* Distance From Coast */}
                {incident.distance_from_coast_km !== null && incident.distance_from_coast_km !== undefined && (
                  <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                    <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block mb-0.5">
                      Distance from Coast
                    </span>
                    <span className="font-semibold text-[#173B4D]">
                      ~{incident.distance_from_coast_km} km off shore
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fisherman & Vessel Dossier Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Reporter Contact Information */}
              <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">person</span>
                    <span className="text-xs font-mono uppercase text-[#087E8B] font-bold">
                      Fisherman / Reporter Information
                    </span>
                  </div>
                  {incident.declaration_confirmed && (
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">verified</span>
                      <span>Declaration Signed</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Full Name</span>
                    <strong className="text-[#173B4D]">{incident.reporter_name || 'Anonymous / Unrecorded'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Reporter Role</span>
                    <span className="text-[#173B4D] font-medium">{incident.reporter_role || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Mobile Phone</span>
                    {incident.reporter_phone ? (
                      <a href={`tel:${incident.reporter_phone}`} className="text-[#087E8B] font-mono font-bold hover:underline">
                        {incident.reporter_phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">None provided</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Email Address</span>
                    {incident.reporter_email ? (
                      <a href={`mailto:${incident.reporter_email}`} className="text-[#087E8B] font-mono hover:underline truncate block">
                        {incident.reporter_email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">None provided</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 2: Vessel Specifications */}
              <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">directions_boat</span>
                    <span className="text-xs font-mono uppercase text-[#087E8B] font-bold">
                      Vessel &amp; Craft Details
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-[#F2FAFA] px-2 py-0.5 rounded border border-[#D8ECEC]">
                    {incident.vessel_type || 'Fishing Craft'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Boat / Vessel Name</span>
                    <strong className="text-[#173B4D]">
                      {incident.has_registered_vessel_name === false
                        ? 'No registered name'
                        : incident.vessel_name || 'Traditional / Unnamed'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Craft Registry #</span>
                    <span className="font-mono text-[#173B4D]">{incident.vessel_registration_number || 'Unregistered'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Vessel Classification</span>
                    <span className="text-[#173B4D]">{incident.vessel_type || 'Fishing Boat'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Harbour / Home Port</span>
                    <span className="text-[#173B4D]">{incident.home_port || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Gear Details, Markings & Quantity Card */}
            <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] shadow-2xs flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#087E8B] text-base">phishing</span>
                  <span className="text-xs font-mono uppercase text-[#087E8B] font-bold">
                    Gear Specifications &amp; Identifying Markings
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold bg-[#F2FAFA] text-[#075E63] px-2.5 py-0.5 rounded border border-[#D8ECEC]">
                  Lost Quantity: {incident.gear_quantity || 1} unit(s)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Category</span>
                  <strong className="text-[#173B4D] capitalize">{incident.gear_type.replace(/_/g, ' ')}</strong>
                </div>
                <div className="p-2 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Estimated Mass/Size</span>
                  <span className="text-[#173B4D]">{incident.estimated_size || 'Not recorded'}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Water Position</span>
                  <span className="text-[#173B4D]">{incident.water_position || 'Submerged / Drifting'}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Sea State at Loss</span>
                  <span className="text-[#173B4D]">{incident.sea_state || 'Moderate chop'}</span>
                </div>
              </div>

              {incident.gear_markings && (
                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 text-xs">
                  <span className="text-[10px] font-mono text-amber-800 uppercase font-bold block mb-0.5">
                    Distinct Identification &amp; Surface Markings
                  </span>
                  <span className="text-[#173B4D] font-medium">{incident.gear_markings}</span>
                </div>
              )}
            </div>

            {/* Geographical Coordinates Card */}
            <div className="p-4 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold">
                WGS84 Geographical Coordinates
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-bold text-[#173B4D]">
                  {Math.abs(incident.latitude).toFixed(6)}° {incident.latitude >= 0 ? 'N' : 'S'}, {Math.abs(incident.longitude).toFixed(6)}° {incident.longitude >= 0 ? 'E' : 'W'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-500">EPSG:4326 PostGIS Point</span>
                  <Link
                    to={`/ngo/map?selected=${incident.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-[#D8ECEC] text-xs font-mono font-semibold text-[#087E8B] hover:bg-[#F2FAFA] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                    <span>Map View</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Field Notes & Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-600 font-bold uppercase">
                Field Observation Notes &amp; Description
              </span>
              <div className="p-4 rounded-xl bg-slate-50 border border-[#D8ECEC] text-xs text-[#173B4D] whitespace-pre-line leading-relaxed">
                {incident.description || 'No descriptive field notes were submitted with this incident.'}
              </div>
            </div>

            {/* Evidence Image and AI Detection Controls */}
            {incident.image_url && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-600 font-bold uppercase">
                    Uploaded Evidence Photo
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={runningAi}
                      onClick={handleRunAi}
                      className="px-3 py-1.5 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <span className={`material-symbols-outlined text-sm ${runningAi ? 'animate-spin' : ''}`}>
                        {runningAi ? 'sync' : 'auto_fix_high'}
                      </span>
                      <span>{runningAi ? 'Analyzing...' : 'Run YOLOv8 AI'}</span>
                    </button>
                    <Link
                      to="/ngo/ai-detection"
                      state={{ report: incident, autoRun: true }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-[#D8ECEC] hover:bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm text-[#087E8B]">open_in_new</span>
                      <span>Review Screen</span>
                    </Link>
                  </div>
                </div>

                {aiMessage && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                    <span>{aiMessage}</span>
                  </div>
                )}

                <div className="rounded-xl overflow-hidden border border-[#D8ECEC] max-w-md bg-slate-100 shadow-2xs">
                  <img
                    src={
                      incident.image_url.startsWith('http://') || incident.image_url.startsWith('https://')
                        ? incident.image_url
                        : `${API_BASE_URL.replace(/\/+$/, '')}${incident.image_url.startsWith('/') ? '' : '/'}${incident.image_url}`
                    }
                    alt={`Incident ${incident.id} Evidence`}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Subsystems Telemetry Linked Records */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-3">
            <h3 className="text-sm font-bold font-display text-[#173B4D]">
              Subsystem Linkages
            </h3>

            <div className="flex flex-col gap-2 text-xs">
              <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">
                      filter_center_focus
                    </span>
                    <span className="text-slate-700 font-medium">AI YOLO Detections</span>
                  </div>
                  <span className="font-mono font-bold text-[#173B4D]">
                    {detections.length || incident.ai_detections_count}
                  </span>
                </div>

                {/* Render genuine detections list if available */}
                {detections.length > 0 ? (
                  <div className="pt-2 border-t border-[#D8ECEC]/60 space-y-2">
                    {detections.map((det) => {
                      const isPending = !det.review_status || det.review_status === 'pending';
                      const isConfirmed = det.review_status === 'confirmed';
                      const isRejected = det.review_status === 'rejected';

                      return (
                        <div
                          key={det.id}
                          className="p-3 rounded-lg bg-white border border-[#D8ECEC] flex flex-col gap-2 font-mono text-[11px] shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#173B4D] capitalize flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isConfirmed
                                    ? 'bg-emerald-500'
                                    : isRejected
                                    ? 'bg-rose-500'
                                    : 'bg-amber-500'
                                }`}
                              ></span>
                              {det.detected_class.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-[#087E8B] bg-[#EAF7F7] px-1.5 py-0.5 rounded border border-[#D8ECEC]">
                              {(Number(det.confidence) * 100).toFixed(1)}%
                            </span>
                          </div>

                          {/* Review Status Badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 uppercase font-semibold">
                              Review Status:
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                                isConfirmed
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : isRejected
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {isConfirmed
                                  ? 'verified'
                                  : isRejected
                                  ? 'cancel'
                                  : 'hourglass_empty'}
                              </span>
                              <span>{det.review_status || 'pending'}</span>
                            </span>
                          </div>

                          {/* Review Details if reviewed */}
                          {!isPending && (
                            <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 flex flex-col gap-0.5">
                              <div className="flex justify-between text-slate-500">
                                <span>Reviewed by:</span>
                                <span className="font-medium text-[#173B4D]">
                                  {det.reviewed_by || 'NGO Officer'}
                                </span>
                              </div>
                              {det.reviewed_at && (
                                <div className="flex justify-between text-slate-500">
                                  <span>Date:</span>
                                  <span>{new Date(det.reviewed_at).toLocaleDateString()}</span>
                                </div>
                              )}
                              {det.review_notes && (
                                <p className="italic text-slate-600 bg-slate-50 p-1.5 rounded mt-1 border border-slate-200/60 leading-tight">
                                  "{det.review_notes}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Review Actions if Pending */}
                          {isPending && (
                            <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#D8ECEC]/60">
                              <button
                                type="button"
                                disabled={reviewingId === det.id}
                                onClick={() => handleConfirmDetection(det)}
                                className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  {reviewingId === det.id ? 'sync' : 'check'}
                                </span>
                                <span>Confirm</span>
                              </button>
                              <button
                                type="button"
                                disabled={reviewingId === det.id}
                                onClick={() => handleOpenRejectModal(det)}
                                className="px-2 py-1.5 rounded bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">
                                  close
                                </span>
                                <span>Reject</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#D8ECEC]/60 text-[11px] text-slate-500 text-center py-2">
                    No AI detections recorded for this incident yet. Click "Run YOLOv8 AI" above to scan.
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">
                      explore
                    </span>
                    <span className="text-slate-700 font-medium">Drift Forecast Vectors</span>
                  </div>
                  <span className="font-mono font-bold text-[#173B4D]">
                    {incident.drift_forecasts_count}
                  </span>
                </div>
                {incident.drift_forecasts_count > 0 ? (
                  <div className="flex items-center justify-between pt-1 border-t border-[#D8ECEC]/60 text-[11px] font-mono">
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Trajectory Active</span>
                    </span>
                    <Link
                      to={`/ngo/drift-forecasting?incidentId=${incident.id}`}
                      state={{ incident, incidentId: incident.id }}
                      onClick={() => setStoredIncidentId(incident.id)}
                      className="text-[#087E8B] hover:underline font-bold"
                    >
                      Inspect Envelope &rarr;
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1 border-t border-[#D8ECEC]/60 text-[11px] font-mono">
                    <span className="text-slate-400">Awaiting Advection Run</span>
                    <Link
                      to={`/ngo/drift-forecasting?incidentId=${incident.id}`}
                      state={{ incident, incidentId: incident.id }}
                      onClick={() => setStoredIncidentId(incident.id)}
                      className="text-[#087E8B] hover:underline font-bold"
                    >
                      Calculate &rarr;
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#087E8B] text-base">
                    sailing
                  </span>
                  <span className="text-slate-700">Recovery Missions</span>
                </div>
                <span className="font-mono font-bold text-[#173B4D]">
                  {incident.recovery_missions_count}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#087E8B] text-base">
                      waves
                    </span>
                    <span className="text-slate-700 font-medium">Environmental Telemetry</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    Open-Meteo
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#D8ECEC]/60 text-[11px] font-mono">
                  <span className="text-slate-500">Loss: {incident.latitude?.toFixed(2)}°N, {incident.longitude?.toFixed(2)}°E</span>
                  <Link
                    to={`/ngo/environmental-intelligence?incidentId=${incident.id}`}
                    state={{ incident, incidentId: incident.id }}
                    className="text-[#087E8B] hover:underline font-bold"
                  >
                    Inspect Telemetry &rarr;
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#D8ECEC] flex flex-col gap-2">
              <Link
                to={`/ngo/environmental-intelligence?incidentId=${incident.id}`}
                state={{ incident, incidentId: incident.id }}
                className="w-full py-2 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-center text-xs font-semibold text-[#087E8B] transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">waves</span>
                <span>Inspect Environmental Telemetry</span>
              </Link>
              <Link
                to={`/ngo/drift-forecasting?incidentId=${incident.id}`}
                state={{ incident, incidentId: incident.id }}
                onClick={() => setStoredIncidentId(incident.id)}
                className="w-full py-2 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-center text-xs font-semibold text-[#087E8B] transition-colors"
              >
                Model Drift Trajectory
              </Link>
              <Link
                to="/ngo/recovery-planning"
                className="w-full py-2 rounded-lg bg-[#00C9C1] hover:bg-[#00b5ae] text-center text-xs font-bold text-[#173B4D] transition-colors"
              >
                Stage Recovery Mission
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* False Positive Explanation Modal */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#D8ECEC] max-w-md w-full p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">flag</span>
                <h3 className="font-bold text-[#173B4D] text-base">
                  Flag False Positive Detection
                </h3>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRejectModal({
                    isOpen: false,
                    detection: null,
                    reason: '',
                    reviewer: 'NGO Field Officer',
                    submitting: false,
                  })
                }
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
                <p className="font-semibold">
                  Rejecting Detection #{rejectModal.detection?.id} (
                  {rejectModal.detection?.detected_class?.replace(/_/g, ' ')})
                </p>
                <p className="text-[11px] mt-0.5 text-rose-700">
                  Note: Rejecting this individual detection will NOT clear or alter the incident report itself.
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">Reviewing Officer</label>
                <input
                  type="text"
                  value={rejectModal.reviewer}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reviewer: e.target.value }))
                  }
                  className="px-3 py-2 rounded-lg border border-[#D8ECEC] focus:ring-2 focus:ring-[#00C9C1] text-xs font-mono"
                  placeholder="Officer Name / Call Sign"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-700">
                  Explanation / Triage Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="px-3 py-2 rounded-lg border border-[#D8ECEC] focus:ring-2 focus:ring-[#00C9C1] text-xs leading-relaxed"
                  placeholder="e.g., Natural kelp stipe formation, reef shadow, or boat anchor mooring line."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D8ECEC]">
              <button
                type="button"
                disabled={rejectModal.submitting}
                onClick={() =>
                  setRejectModal({
                    isOpen: false,
                    detection: null,
                    reason: '',
                    reviewer: 'NGO Field Officer',
                    submitting: false,
                  })
                }
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejectModal.submitting}
                onClick={handleSubmitReject}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {rejectModal.submitting ? 'sync' : 'verified_user'}
                </span>
                <span>{rejectModal.submitting ? 'Saving...' : 'Confirm False Positive'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetails;
