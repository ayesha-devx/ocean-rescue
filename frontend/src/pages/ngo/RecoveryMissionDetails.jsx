import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import EmptyState from '../../components/ngo/EmptyState';
import {
  getRecoveryMissionById,
  updateRecoveryMission,
  startRecoveryOperation,
  submitRecoveryOutcome,
  correctRecoveryOutcome,
  getRecoveryOutcomes,
} from '../../services/ngoService';
import { getSelectedMissionRoute } from '../../services/routeService';

/**
 * Screen 10 — Recovery Mission Details & Outcome Tracking
 * OceanRescue NGO Platform
 * Completely removes obsolete clearance checklist and provides
 * simple, dynamic, accountable Recovery Outcome Tracking.
 */

// Port coordinates for Mirkarwada Fishing Harbour, Ratnagiri
const PRIMARY_PORT_COORDS = [16.99, 73.30];

// Custom Leaflet Icons
const harbourIcon = L.divIcon({
  className: 'custom-harbour-marker',
  html: `
    <div style="width: 28px; height: 28px; border-radius: 8px; background-color: #173B4D; border: 2px solid #00C9C1; box-shadow: 0 3px 8px rgba(23, 59, 77, 0.4); display: flex; align-items: center; justify-content: center; color: #00C9C1;">
      <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 2v20m0 0a8 8 0 01-8-8h2a6 6 0 0012 0h2a8 8 0 01-8 8zm0-16a3 3 0 100-6 3 3 0 000 6z" />
      </svg>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const incidentIcon = L.divIcon({
  className: 'custom-incident-marker',
  html: `
    <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
      <span style="position: absolute; inset: -2px; border-radius: 9999px; background-color: rgba(244, 63, 94, 0.4); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
      <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; background-color: #E11D48; border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(225, 29, 72, 0.5); display: flex; align-items: center; justify-content: center; color: white;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

const getStatusBadge = (status) => {
  const s = (status || 'planned').toLowerCase();
  switch (s) {
    case 'successfully_recovered':
    case 'recovered':
    case 'completed':
      return {
        label: 'Successfully Recovered',
        cls: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
        icon: 'check_circle',
      };
    case 'partially_recovered':
      return {
        label: 'Partially Recovered',
        cls: 'bg-teal-50 text-teal-800 border-teal-300',
        dot: 'bg-teal-500',
        icon: 'timelapse',
      };
    case 'in_progress':
      return {
        label: 'In Progress',
        cls: 'bg-cyan-50 text-cyan-800 border-cyan-300',
        dot: 'bg-cyan-500 animate-pulse',
        icon: 'directions_boat',
      };
    case 'unsuccessful':
      return {
        label: 'Recovery Unsuccessful',
        cls: 'bg-rose-50 text-rose-800 border-rose-300',
        dot: 'bg-rose-500',
        icon: 'cancel',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        cls: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
        icon: 'block',
      };
    case 'planned':
    default:
      return {
        label: 'Planned',
        cls: 'bg-amber-50 text-amber-800 border-amber-300',
        dot: 'bg-amber-500',
        icon: 'schedule',
      };
  }
};

export const RecoveryMissionDetails = () => {
  const { id } = useParams();

  const [missionData, setMissionData] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [outcomeHistory, setOutcomeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Operation start state
  const [isStartingOp, setIsStartingOp] = useState(false);

  // Recovery Outcome Form / Modal State
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [isSubmittingOutcome, setIsSubmittingOutcome] = useState(false);
  const [outcomeData, setOutcomeData] = useState({
    outcome: 'successfully_recovered',
    notes: '',
    submitted_by: 'Lead Recovery Officer',
    confirmed: false,
  });
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);
  const [outcomeErrors, setOutcomeErrors] = useState({});

  // Authorized Recovery Outcome Correction State
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);
  const [correctionData, setCorrectionData] = useState({
    outcome: 'partially_recovered',
    correction_reason: '',
    notes: '',
    submitted_by: 'Lead Recovery Officer',
    confirmed: false,
  });
  const [correctionEvidenceFile, setCorrectionEvidenceFile] = useState(null);
  const [correctionEvidencePreview, setCorrectionEvidencePreview] = useState(null);
  const [correctionErrors, setCorrectionErrors] = useState({});

  // View Certified Record Modal State
  const [showViewRecordModal, setShowViewRecordModal] = useState(false);

  // Edit Parameters Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    target_sector: 'Arabian Sea – Ratnagiri / Konkan Coast',
    departure_port: 'Mirkarwada Fishing Harbour, Ratnagiri',
    assigned_to: '',
    target_date: '',
    operational_notes: '',
  });
  const [editErrors, setEditErrors] = useState({});

  // Auto-dismiss notification after 6 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Load mission details, route, and outcome history
  const loadMissionData = async () => {
    if (!id || id === 'none' || id === 'undefined') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);

      const data = await getRecoveryMissionById(id);
      setMissionData(data);

      // Load active selected route if any
      try {
        const route = await getSelectedMissionRoute(id);
        setSelectedRoute(route);
      } catch (e) {
        console.warn('Could not fetch selected route for mission:', e);
      }

      // Load outcome history
      try {
        const outcomes = await getRecoveryOutcomes(id);
        setOutcomeHistory(outcomes || []);
      } catch (e) {
        console.warn('Could not fetch outcome history for mission:', e);
      }
    } catch (err) {
      console.error('Failed to fetch recovery mission details:', err);
      setFetchError(err.message || 'Mission not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissionData();
  }, [id]);

  // 1. Action: Start Recovery Operation (Planned -> In Progress)
  const handleStartOperation = async () => {
    if (isStartingOp) return;
    setIsStartingOp(true);
    setFeedback(null);

    try {
      const updated = await startRecoveryOperation(id);
      setMissionData(updated);
      setFeedback({
        type: 'success',
        message: `Recovery operation started! Mission status updated to IN PROGRESS. Fleet is mobilized.`,
      });
    } catch (err) {
      console.error('Failed to start recovery operation:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to start recovery operation.',
      });
    } finally {
      setIsStartingOp(false);
    }
  };

  // 2. Open Recovery Outcome Modal
  const handleOpenOutcomeModal = () => {
    setOutcomeData({
      outcome: 'successfully_recovered',
      notes: '',
      submitted_by: 'Lead Recovery Officer',
      confirmed: false,
    });
    setEvidenceFile(null);
    setEvidencePreview(null);
    setOutcomeErrors({});
    setShowOutcomeModal(true);
  };

  // Handle Evidence Photo file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setEvidenceFile(null);
      setEvidencePreview(null);
      return;
    }

    // Validate size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setOutcomeErrors((prev) => ({
        ...prev,
        file: `Evidence photo (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`,
      }));
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setOutcomeErrors((prev) => ({
        ...prev,
        file: 'Only JPG, PNG, and WebP image formats are supported.',
      }));
      return;
    }

    setOutcomeErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
    setEvidenceFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setEvidencePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 3. Submit Recovery Outcome (Active missions only)
  const handleSubmitOutcome = async (e) => {
    e.preventDefault();
    if (isSubmittingOutcome) return;

    const curStatus = (missionData?.status || '').toLowerCase();
    if (curStatus === 'successfully_recovered') {
      setOutcomeErrors({
        submit: 'This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required.',
      });
      return;
    }

    const errors = {};
    if (!outcomeData.outcome) {
      errors.outcome = 'Please select a recovery result option.';
    }
    if (!outcomeData.confirmed) {
      errors.confirmed = 'Please confirm that this outcome reflects the actual physical operation.';
    }

    if (Object.keys(errors).length > 0) {
      setOutcomeErrors(errors);
      return;
    }

    setIsSubmittingOutcome(true);
    setOutcomeErrors({});
    setFeedback(null);

    try {
      const updatedMission = await submitRecoveryOutcome(id, {
        outcome: outcomeData.outcome,
        notes: outcomeData.notes.trim(),
        submitted_by: outcomeData.submitted_by.trim() || 'Lead Recovery Officer',
        photoFile: evidenceFile,
      });

      setMissionData(updatedMission);
      setShowOutcomeModal(false);

      // Refresh outcomes history
      const refreshedOutcomes = await getRecoveryOutcomes(id).catch(() => []);
      setOutcomeHistory(refreshedOutcomes || []);

      setFeedback({
        type: 'success',
        message: `Recovery outcome successfully recorded! Mission and linked Incident #${updatedMission.report_id} updated.`,
      });
    } catch (err) {
      console.error('Failed to submit recovery outcome:', err);
      setOutcomeErrors({
        submit: err.message || 'Failed to submit recovery outcome. Please check entries and try again.',
      });
    } finally {
      setIsSubmittingOutcome(false);
    }
  };

  // 4. Open Authorized Outcome Correction Modal
  const handleOpenCorrectionModal = () => {
    const curStatus = (missionData?.status || '').toLowerCase();
    const defaultCorrected = curStatus === 'successfully_recovered' ? 'partially_recovered' : 'successfully_recovered';
    setCorrectionData({
      outcome: defaultCorrected,
      correction_reason: '',
      notes: '',
      submitted_by: 'Lead Recovery Officer',
      confirmed: false,
    });
    setCorrectionEvidenceFile(null);
    setCorrectionEvidencePreview(null);
    setCorrectionErrors({});
    setShowCorrectionModal(true);
  };

  // Handle Correction Evidence Photo
  const handleCorrectionFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCorrectionEvidenceFile(null);
      setCorrectionEvidencePreview(null);
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setCorrectionErrors((prev) => ({
        ...prev,
        file: `Evidence photo (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`,
      }));
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setCorrectionErrors((prev) => ({
        ...prev,
        file: 'Only JPG, PNG, and WebP image formats are supported.',
      }));
      return;
    }

    setCorrectionErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
    setCorrectionEvidenceFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setCorrectionEvidencePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 5. Submit Authorized Recovery Outcome Correction
  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    if (isSubmittingCorrection) return;

    const errors = {};
    if (!correctionData.correction_reason || !correctionData.correction_reason.trim()) {
      errors.correction_reason = 'Correction reason is mandatory. Detail the audit reason for this revision.';
    } else if (correctionData.correction_reason.trim().length < 3) {
      errors.correction_reason = 'Correction reason must be at least 3 characters.';
    }
    if (!correctionData.outcome) {
      errors.outcome = 'Please select a corrected recovery outcome.';
    }
    if (!correctionData.confirmed) {
      errors.confirmed = 'Please certify that you are an authorized NGO officer authorizing this revision.';
    }

    if (Object.keys(errors).length > 0) {
      setCorrectionErrors(errors);
      return;
    }

    setIsSubmittingCorrection(true);
    setCorrectionErrors({});
    setFeedback(null);

    try {
      const updatedMission = await correctRecoveryOutcome(id, {
        outcome: correctionData.outcome,
        correction_reason: correctionData.correction_reason.trim(),
        notes: correctionData.notes.trim(),
        submitted_by: correctionData.submitted_by.trim() || 'Lead Recovery Officer',
        photoFile: correctionEvidenceFile,
      });

      setMissionData(updatedMission);
      setShowCorrectionModal(false);

      // Refresh outcomes history
      const refreshedOutcomes = await getRecoveryOutcomes(id).catch(() => []);
      setOutcomeHistory(refreshedOutcomes || []);

      setFeedback({
        type: 'success',
        message: `Recovery outcome corrected successfully! Audit revision appended to ledger and linked incident synchronized.`,
      });
    } catch (err) {
      console.error('Failed to submit outcome correction:', err);
      setCorrectionErrors({
        submit: err.message || 'Failed to submit recovery outcome correction. Please check entries and retry.',
      });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Open Edit Parameters Modal
  const handleOpenEditModal = () => {
    const rawDate = missionData?.scheduled_at ? missionData.scheduled_at.split('T')[0] : '';
    setEditFormData({
      title: missionData?.title || '',
      target_sector: missionData?.target_sector || 'Arabian Sea – Ratnagiri / Konkan Coast',
      departure_port: missionData?.departure_port || 'Mirkarwada Fishing Harbour, Ratnagiri',
      assigned_to: missionData?.assigned_to || missionData?.vessel || '',
      target_date: rawDate || new Date().toISOString().split('T')[0],
      operational_notes: missionData?.operational_notes || '',
    });
    setEditErrors({});
    setShowEditModal(true);
  };

  // Save edited parameters
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (isSavingEdit) return;

    const errors = {};
    if (!editFormData.title.trim()) errors.title = 'Mission designation cannot be empty';
    if (!editFormData.assigned_to.trim()) errors.assigned_to = 'Assigned vessel is required';
    if (!editFormData.target_date) errors.target_date = 'Planned date is required';

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setIsSavingEdit(true);
    setEditErrors({});

    try {
      const updated = await updateRecoveryMission(id, {
        title: editFormData.title.trim(),
        target_sector: editFormData.target_sector.trim(),
        departure_port: editFormData.departure_port.trim(),
        assigned_to: editFormData.assigned_to.trim(),
        target_date: editFormData.target_date,
        operational_notes: editFormData.operational_notes.trim(),
      });
      setMissionData(updated);
      setShowEditModal(false);
      setFeedback({
        type: 'success',
        message: 'Mission parameters updated and saved successfully.',
      });
    } catch (err) {
      console.error('Failed to update mission parameters:', err);
      setEditErrors({
        submit: err.message || 'Failed to update mission parameters.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col w-full gap-6">
        <div className="flex items-center gap-2 text-xs font-mono text-[#087E8B]">
          <span>Loading recovery mission telemetry...</span>
        </div>
        <div className="bg-white rounded-xl border border-[#D8ECEC] p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#087E8B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!missionData && (fetchError || !id)) {
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
            <span className="text-slate-500 font-semibold">{id || 'Mission Details'}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#D8ECEC] p-6 sm:p-12 shadow-xs">
          <EmptyState
            icon="find_in_page"
            title={id ? `Recovery Mission "${id}" Not Found` : 'No Recovery Mission Selected'}
            description={
              id
                ? `No operational recovery plan matches the identifier "${id}". Select an active mission from the Recovery Planning ledger.`
                : 'Please select a recovery mission from the Recovery Planning dashboard.'
            }
            actionText="View Recovery Planning"
            actionLink="/ngo/recovery-planning"
          />
        </div>
      </div>
    );
  }

  const displayId = `OR-MSN-${String(missionData?.id || id).padStart(3, '0')}`;
  const statusBadge = getStatusBadge(missionData?.status);
  const statusRaw = (missionData?.status || 'planned').toLowerCase();
  const isConcluded = ['successfully_recovered', 'partially_recovered', 'unsuccessful'].includes(statusRaw);
  const isInProgress = statusRaw === 'in_progress';
  const isPlanned = statusRaw === 'planned';
  const userRole = localStorage.getItem('oceanrescue_user_role') || 'ngo_officer';
  const isAuthorizedOfficer = ['ngo_officer', 'admin', 'coordinator', 'response_team', 'recovery_lead', 'officer'].includes(userRole.toLowerCase());

  const incidentLat = missionData?.incident_latitude ?? 16.985;
  const incidentLon = missionData?.incident_longitude ?? 73.285;
  const mapCenter = [
    (PRIMARY_PORT_COORDS[0] + incidentLat) / 2,
    (PRIMARY_PORT_COORDS[1] + incidentLon) / 2,
  ];

  // Route polyline coordinates for Leaflet
  let routePositions = [];
  if (selectedRoute?.route_geojson?.coordinates) {
    routePositions = selectedRoute.route_geojson.coordinates.map(([lon, lat]) => [lat, lon]);
  } else if (missionData?.route_geojson?.coordinates) {
    routePositions = missionData.route_geojson.coordinates.map(([lon, lat]) => [lat, lon]);
  } else {
    // Default 2-point direct line
    routePositions = [PRIMARY_PORT_COORDS, [incidentLat, incidentLon]];
  }

  return (
    <div className="flex flex-col w-full gap-6">
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
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Breadcrumb Navigation & Top Toolbar */}
      <div className="flex flex-col gap-2">
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
            <span className="text-slate-500 font-semibold">{displayId}</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#173B4D] font-bold">Outcome Tracking</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono uppercase font-bold border flex items-center gap-1.5 ${statusBadge.cls}`}>
              <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
              <span>{statusBadge.label}</span>
            </span>
          </div>
        </div>

        {/* Main Title & Action Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold font-display text-[#173B4D] tracking-tight">
                {missionData?.title || `Recovery Operation – Incident #${missionData?.report_id}`}
              </h1>
              <button
                onClick={handleOpenEditModal}
                className="p-1 text-slate-400 hover:text-[#087E8B] hover:bg-slate-100 rounded-lg transition-colors"
                title="Edit parameters"
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Incident #{missionData?.report_id} • {(missionData?.incident_gear_type || 'Ghost Net').toUpperCase()} • Staged from {missionData?.departure_port || 'Mirkarwada Fishing Harbour, Ratnagiri'}
            </p>
          </div>

          {/* Dynamic Action Buttons Based on Mission Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/ngo/recovery-missions/${id}/route-optimization`}
              className="px-3.5 py-2 rounded-lg bg-white border border-[#D8ECEC] text-xs font-bold text-[#087E8B] hover:bg-slate-50 hover:border-[#00C9C1] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              <span>Route Optimization</span>
            </Link>

            {isPlanned && (
              <button
                onClick={handleStartOperation}
                disabled={isStartingOp}
                className="px-4 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#00b5ae] text-[#173B4D] text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.99]"
              >
                {isStartingOp ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#173B4D] border-t-transparent rounded-full animate-spin"></div>
                    <span>Mobilizing Fleet...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                    <span>Start Recovery Operation</span>
                  </>
                )}
              </button>
            )}

            {isInProgress && (
              <button
                onClick={handleOpenOutcomeModal}
                className="px-4 py-2 rounded-lg bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.99]"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                <span>Update Recovery Outcome</span>
              </button>
            )}

            {isConcluded && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowViewRecordModal(true)}
                  className="px-3.5 py-2 rounded-lg bg-white border border-[#D8ECEC] hover:border-[#087E8B] text-xs font-bold text-[#173B4D] hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-2xs"
                  title="View certified recovery record"
                >
                  <span className="material-symbols-outlined text-base text-[#087E8B]">verified</span>
                  <span>View Recovery Record</span>
                </button>

                {isAuthorizedOfficer && (
                  <button
                    onClick={handleOpenCorrectionModal}
                    className="px-3.5 py-2 rounded-lg bg-[#F2FAFA] border border-amber-300 hover:border-amber-500 text-xs font-bold text-amber-900 hover:bg-amber-50 transition-all flex items-center gap-1.5 shadow-2xs"
                    title="Submit an authorized outcome correction with mandatory audit reason"
                  >
                    <span className="material-symbols-outlined text-base text-amber-600">edit_note</span>
                    <span>Correct Recovery Outcome</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bento Grid: Left Column Details & Map (8 Cols) vs Right Column Outcome Tracking (4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column (8 Cols): Mission Info, Recovery Info, Route Map */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          {/* Section 1: Mission & Recovery Operational Details Grid */}
          <div className="bg-white rounded-xl p-5 border border-[#D8ECEC] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-lg">info</span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display">
                  Mission &amp; Recovery Intelligence
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#087E8B] font-bold">
                INCIDENT #{missionData?.report_id}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#F2FAFA] rounded-lg p-3 border border-[#D8ECEC] flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Mission ID
                </span>
                <span className="text-xs font-mono font-bold text-[#173B4D] mt-1">{displayId}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Created {missionData?.created_at ? new Date(missionData.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <div className="bg-[#F2FAFA] rounded-lg p-3 border border-[#D8ECEC] flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Gear Classification
                </span>
                <span className="text-xs font-bold text-[#173B4D] mt-1 uppercase">
                  {missionData?.incident_gear_type || 'Ghost Net'}
                </span>
                <span className="text-[10px] text-[#087E8B] font-mono mt-0.5">
                  Priority: {missionData?.priority || 'HIGH'}
                </span>
              </div>

              <div className="bg-[#F2FAFA] rounded-lg p-3 border border-[#D8ECEC] flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Assigned Vessel
                </span>
                <span className="text-xs font-bold text-[#173B4D] mt-1 truncate" title={missionData?.assigned_to || missionData?.vessel}>
                  {missionData?.assigned_to || missionData?.vessel || 'Unassigned Fleet'}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5">Salvage Unit</span>
              </div>

              <div className="bg-[#F2FAFA] rounded-lg p-3 border border-[#D8ECEC] flex flex-col justify-between">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Recovery Harbour
                </span>
                <span className="text-xs font-bold text-[#173B4D] mt-1 truncate" title={missionData?.departure_port}>
                  {(missionData?.departure_port || 'Mirkarwada Fishing Harbour').split(',')[0]}
                </span>
                <span className="text-[10px] font-mono text-[#087E8B] mt-0.5">16.99° N, 73.30° E</span>
              </div>
            </div>

            {/* Target Location & Operational Coordinates */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg border border-[#D8ECEC] text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-[#087E8B]">place</span>
                <span className="text-slate-600">
                  Reported Incident Location: <strong className="font-mono text-[#173B4D]">{incidentLat.toFixed(4)}° N, {incidentLon.toFixed(4)}° E</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                <span>Sector: <strong>{missionData?.target_sector || 'Arabian Sea – Ratnagiri Outer Sector'}</strong></span>
              </div>
            </div>
          </div>

          {/* Section 2: Selected Route & Navigational Corridor with Leaflet Map */}
          <div className="bg-white rounded-xl p-5 border border-[#D8ECEC] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-lg">alt_route</span>
                <h2 className="text-sm font-bold text-[#173B4D] font-display">
                  Persisted Tactical Recovery Route
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {missionData?.selected_route_type === 'alternative' ? 'Conservative Offshore Corridor' : 'Primary Fairway'}
                </span>
                <Link
                  to={`/ngo/recovery-missions/${id}/route-optimization`}
                  className="text-xs font-bold text-[#087E8B] hover:underline flex items-center gap-1"
                >
                  <span>Edit in Optimizer</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Route Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">Route Distance</span>
                <span className="text-sm font-bold font-mono text-[#173B4D] mt-0.5 block">
                  {missionData?.selected_route_distance_km != null ? `${Number(missionData.selected_route_distance_km).toFixed(2)} km` : '3.38 km'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {missionData?.selected_route_distance_nm != null ? `${Number(missionData.selected_route_distance_nm).toFixed(2)} NM` : '1.83 NM'}
                </span>
              </div>

              <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">Waypoints</span>
                <span className="text-sm font-bold font-mono text-[#173B4D] mt-0.5 block">
                  {missionData?.selected_route_waypoints_count || (missionData?.selected_route_type === 'alternative' ? 5 : 2)} pts
                </span>
                <span className="text-[10px] font-mono text-[#087E8B]">A* Smoothed</span>
              </div>

              <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">Direct Endpoint</span>
                <span className="text-sm font-bold font-mono text-[#173B4D] mt-0.5 block">
                  {missionData?.selected_route_direct_distance_km != null ? `${Number(missionData.selected_route_direct_distance_km).toFixed(2)} km` : '3.38 km'}
                </span>
                <span className="text-[10px] font-mono text-slate-400">Haversine</span>
              </div>

              <div className="bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold block">Route Deviation</span>
                <span className="text-sm font-bold font-mono text-[#087E8B] mt-0.5 block">
                  +{Number(missionData?.selected_route_deviation_pct ?? (missionData?.selected_route_type === 'alternative' ? 12.7 : 0.0)).toFixed(1)}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">Geometry-derived</span>
              </div>
            </div>

            {/* Interactive Leaflet Map for Persisted Route */}
            <div className="w-full h-[280px] rounded-xl overflow-hidden border border-[#D8ECEC] relative shadow-inner">
              <MapContainer
                center={mapCenter}
                zoom={12}
                scrollWheelZoom={false}
                style={{ width: '100%', height: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Harbour Marker */}
                <Marker position={PRIMARY_PORT_COORDS} icon={harbourIcon}>
                  <Popup>
                    <div className="font-sans text-xs">
                      <strong>Mirkarwada Fishing Harbour</strong><br />
                      Departure base (16.99° N, 73.30° E)
                    </div>
                  </Popup>
                </Marker>

                {/* Target Incident Marker */}
                <Marker position={[incidentLat, incidentLon]} icon={incidentIcon}>
                  <Popup>
                    <div className="font-sans text-xs">
                      <strong>Target Incident #{missionData?.report_id}</strong><br />
                      {(missionData?.incident_gear_type || 'Ghost Net').toUpperCase()}<br />
                      ({incidentLat.toFixed(4)}° N, {incidentLon.toFixed(4)}° E)
                    </div>
                  </Popup>
                </Marker>

                {/* Persisted Route Polyline */}
                {routePositions.length >= 2 && (
                  <Polyline
                    positions={routePositions}
                    pathOptions={{
                      color: missionData?.selected_route_type === 'alternative' ? '#087E8B' : '#00C9C1',
                      weight: 4,
                      opacity: 0.9,
                      dashArray: missionData?.selected_route_type === 'alternative' ? '6, 6' : undefined,
                    }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

          {/* Section 3: Operational Notes */}
          {missionData?.operational_notes && (
            <div className="bg-white rounded-xl p-5 border border-[#D8ECEC] shadow-xs flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-base">notes</span>
                <h3 className="text-xs font-mono font-bold text-slate-600 uppercase">
                  Operational Salvage Notes
                </h3>
              </div>
              <p className="text-xs text-slate-700 bg-[#F2FAFA] p-3.5 rounded-lg border border-[#D8ECEC] leading-relaxed">
                {missionData.operational_notes}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (4 Cols): Recovery Outcome Tracking & Outcome History */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          {/* Outcome Status Card */}
          <div className="bg-white p-5 rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-xl">
                  {statusBadge.icon}
                </span>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold tracking-wider">
                    Recovery Workflow
                  </span>
                  <h2 className="text-sm font-bold text-[#173B4D] font-display">
                    Recovery Outcome Tracking
                  </h2>
                </div>
              </div>
            </div>

            {/* Current workflow stage overview */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">
                Current Operational State
              </span>
              <div className={`p-3.5 rounded-xl border ${statusBadge.cls} flex items-center gap-3`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/70 shadow-2xs`}>
                  <span className="material-symbols-outlined text-lg">{statusBadge.icon}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold leading-tight">{statusBadge.label}</span>
                  <span className="text-[10px] opacity-80 mt-0.5">
                    {isPlanned && 'Mission plan established; ready to mobilize retrieval crew.'}
                    {isInProgress && 'Salvage crew deployed at sea; awaiting operational result.'}
                    {isConcluded && 'Operation concluded and recorded in ledger.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Workflow Action CTA */}
            {isPlanned && (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleStartOperation}
                  disabled={isStartingOp}
                  className="w-full py-2.5 rounded-lg text-xs font-bold font-display bg-[#00C9C1] hover:bg-[#00b5ae] text-[#173B4D] flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-base">directions_boat</span>
                  <span>Start Recovery Operation</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  Transitions status to <strong>In Progress</strong> when salvage fleet departs Mirkarwada.
                </p>
              </div>
            )}

            {isInProgress && (
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleOpenOutcomeModal}
                  className="w-full py-2.5 rounded-lg text-xs font-bold font-display bg-[#087E8B] hover:bg-[#066570] text-white flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  <span>Update Recovery Outcome</span>
                </button>
                <p className="text-[11px] text-slate-500 text-center">
                  Record actual physical recovery result following operation at sea.
                </p>
              </div>
            )}

            {isConcluded && (
              <div className="pt-2 flex flex-col gap-2.5">
                {statusRaw === 'successfully_recovered' && (
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex items-start gap-2 leading-relaxed">
                    <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
                    <span>
                      This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required.
                    </span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowViewRecordModal(true)}
                    className="w-full py-2 rounded-lg text-xs font-bold font-display bg-white border border-[#D8ECEC] hover:border-[#087E8B] text-[#173B4D] hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-base text-[#087E8B]">verified</span>
                    <span>View Recovery Record</span>
                  </button>
                  {isAuthorizedOfficer ? (
                    <button
                      onClick={handleOpenCorrectionModal}
                      className="w-full py-2 rounded-lg text-xs font-bold font-display bg-[#F2FAFA] border border-amber-300 hover:border-amber-500 text-amber-900 hover:bg-amber-50 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-base text-amber-600">edit_note</span>
                      <span>Correct Recovery Outcome</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic text-center py-1">
                      Outcome corrections require authorized NGO officer permissions.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section: Recovery Outcome History & Ledger Records */}
          <div className="bg-white p-5 rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-lg">history</span>
                <h3 className="text-sm font-bold text-[#173B4D] font-display">
                  Recovery Outcome History
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {outcomeHistory.length} RECORD{outcomeHistory.length !== 1 ? 'S' : ''}
              </span>
            </div>

            {outcomeHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-slate-300 text-3xl">assignment_late</span>
                <span>No recovery outcomes submitted yet.</span>
                <span className="text-[11px] text-slate-400">
                  After the operation, click "Update Recovery Outcome" to certify results.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {outcomeHistory.map((rec, index) => {
                  const b = getStatusBadge(rec.outcome);
                  const isCorrection = Boolean(rec.is_correction);
                  return (
                    <div
                      key={rec.id || index}
                      className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                        isCorrection
                          ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                          : 'bg-[#F2FAFA] border-[#D8ECEC]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border flex items-center gap-1 ${b.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>
                            <span>{b.label}</span>
                          </span>
                          {isCorrection ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">edit_calendar</span>
                              <span>OFFICER CORRECTION</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">check</span>
                              <span>ORIGINAL OUTCOME</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {rec.submitted_at ? new Date(rec.submitted_at).toLocaleString() : 'Just now'}
                        </span>
                      </div>

                      {/* Display Audit Correction Reason if this is a correction */}
                      {isCorrection && (
                        <div className="p-2.5 rounded-lg bg-amber-100/70 border border-amber-200 text-xs text-amber-900 flex flex-col gap-1">
                          <div className="flex items-center gap-1 font-mono font-bold text-[10px] uppercase text-amber-800">
                            <span className="material-symbols-outlined text-xs">flag</span>
                            <span>Mandatory Correction Reason:</span>
                          </div>
                          <p className="font-medium text-xs leading-relaxed italic">
                            "{rec.correction_reason || 'Administrative correction authorized by recovery officer.'}"
                          </p>
                          {rec.original_outcome_id && (
                            <span className="text-[10px] font-mono text-amber-700">
                              Linked Original Outcome Record #{rec.original_outcome_id}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>
                          {isCorrection ? 'Corrected by: ' : 'Submitted by: '}
                          <strong className="text-[#173B4D]">{rec.submitted_by || 'Officer'}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Record #{rec.id || (outcomeHistory.length - index)}
                        </span>
                      </div>

                      {rec.notes && (
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-[#D8ECEC]/80 leading-relaxed">
                          {rec.notes}
                        </p>
                      )}

                      {rec.evidence_url && (
                        <div className="mt-1">
                          <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block mb-1">
                            Evidence Photograph:
                          </span>
                          <a
                            href={rec.evidence_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-[#D8ECEC] hover:opacity-95 transition-opacity max-h-40"
                          >
                            <img
                              src={rec.evidence_url}
                              alt="Recovered gear evidence"
                              className="w-full h-36 object-cover bg-slate-100"
                            />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Update Recovery Outcome Modal / Form */}
      {showOutcomeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative z-[10000] bg-white rounded-2xl border border-[#D8ECEC] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF7F7] text-[#087E8B] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">task_alt</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#173B4D]">
                    Update Recovery Outcome
                  </h3>
                  <span className="text-[11px] font-mono text-[#087E8B]">
                    MISSION {displayId} • INCIDENT #{missionData?.report_id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOutcomeModal(false)}
                disabled={isSubmittingOutcome}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Error banner */}
            {outcomeErrors.submit && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{outcomeErrors.submit}</span>
              </div>
            )}

            {/* Blocked Submission Notice for already successfully recovered missions */}
            {statusRaw === 'successfully_recovered' && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
                <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">lock</span>
                <div>
                  <strong className="font-bold text-xs block mb-0.5">Duplicate Outcome Submission Blocked:</strong>
                  This mission has already been successfully recovered. A new outcome cannot be submitted unless an authorized correction is required.
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitOutcome} className="flex flex-col gap-4">
              {/* Recovery Result Radio Group */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Recovery Result *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'successfully_recovered',
                      label: 'Successfully Recovered',
                      desc: 'Fishing gear completely retrieved and safely hauled aboard salvage vessel.',
                      icon: 'check_circle',
                      color: 'border-emerald-300 bg-emerald-50/40 text-emerald-900',
                    },
                    {
                      id: 'partially_recovered',
                      label: 'Partially Recovered',
                      desc: 'Portion of gear retrieved (e.g., float line or main netting); fragment remains.',
                      icon: 'timelapse',
                      color: 'border-teal-300 bg-teal-50/40 text-teal-900',
                    },
                    {
                      id: 'unsuccessful',
                      label: 'Recovery Unsuccessful',
                      desc: 'Gear could not be located, sea conditions aborted dive, or gear snagged permanently.',
                      icon: 'cancel',
                      color: 'border-rose-300 bg-rose-50/40 text-rose-900',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        statusRaw === 'successfully_recovered'
                          ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                          : outcomeData.outcome === opt.id
                          ? `${opt.color} ring-1 ring-[#00C9C1] shadow-2xs cursor-pointer`
                          : 'border-[#D8ECEC] bg-white hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recoveryOutcome"
                        value={opt.id}
                        disabled={statusRaw === 'successfully_recovered'}
                        checked={outcomeData.outcome === opt.id}
                        onChange={(e) => setOutcomeData({ ...outcomeData, outcome: e.target.value })}
                        className="mt-0.5 accent-[#00C9C1]"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                          <span className="text-xs font-bold text-[#173B4D]">{opt.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {opt.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {outcomeErrors.outcome && (
                  <span className="text-[10px] text-rose-500">{outcomeErrors.outcome}</span>
                )}
              </div>

              {/* Recovery Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Recovery Operational Notes (Optional)
                </label>
                <textarea
                  rows="3"
                  disabled={statusRaw === 'successfully_recovered'}
                  placeholder="Describe operational observations, gear weight, underwater conditions, marine life interactions, or reasons for partial retrieval..."
                  value={outcomeData.notes}
                  onChange={(e) => setOutcomeData({ ...outcomeData, notes: e.target.value })}
                  className="p-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
                ></textarea>
              </div>

              {/* Optional Evidence Photograph Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Evidence Photograph (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    disabled={statusRaw === 'successfully_recovered'}
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleFileChange}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#D8ECEC] file:bg-[#EAF7F7] file:text-xs file:font-bold file:text-[#087E8B] hover:file:bg-[#d8eded] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  {evidenceFile && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      {(evidenceFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </div>
                {outcomeErrors.file && (
                  <span className="text-[10px] text-rose-500">{outcomeErrors.file}</span>
                )}
                {evidencePreview && (
                  <div className="mt-1 relative w-32 h-24 rounded-lg overflow-hidden border border-[#D8ECEC]">
                    <img
                      src={evidencePreview}
                      alt="Upload Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <span className="text-[10px] text-slate-400">
                  Supported formats: JPG, PNG, WebP (Max 10MB). Evidence is optional.
                </span>
              </div>

              {/* Authorizing Officer */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Certifying NGO Officer *
                </label>
                <input
                  type="text"
                  disabled={statusRaw === 'successfully_recovered'}
                  value={outcomeData.submitted_by}
                  onChange={(e) => setOutcomeData({ ...outcomeData, submitted_by: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] disabled:opacity-60 disabled:cursor-not-allowed"
                  required
                />
              </div>

              {/* Confirmation Requirement */}
              <div className="p-3 rounded-xl bg-slate-50 border border-[#D8ECEC] flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="confirm-outcome-checkbox"
                  disabled={statusRaw === 'successfully_recovered'}
                  checked={outcomeData.confirmed}
                  onChange={(e) => setOutcomeData({ ...outcomeData, confirmed: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-[#00C9C1] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <label htmlFor="confirm-outcome-checkbox" className={`text-xs text-slate-700 leading-snug ${statusRaw === 'successfully_recovered' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  I confirm that this recovery outcome reflects the actual physical operation conducted at sea and certify the recorded details into the permanent mission ledger.
                </label>
              </div>
              {outcomeErrors.confirmed && (
                <span className="text-[10px] text-rose-500">{outcomeErrors.confirmed}</span>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8ECEC]">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  disabled={isSubmittingOutcome}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {statusRaw === 'successfully_recovered' ? 'Close' : 'Cancel'}
                </button>
                {statusRaw !== 'successfully_recovered' && (
                  <button
                    type="submit"
                    disabled={isSubmittingOutcome || !outcomeData.confirmed}
                    className={`px-4 py-2 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all ${
                      outcomeData.confirmed && !isSubmittingOutcome
                        ? 'bg-[#00C9C1] text-[#173B4D] hover:bg-[#00b5ae] cursor-pointer active:scale-[0.99]'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmittingOutcome ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#173B4D] border-t-transparent rounded-full animate-spin"></div>
                        <span>Submitting Outcome...</span>
                      </>
                    ) : (
                      <span>Submit Recovery Outcome</span>
                    )}
                  </button>
                )}
                {statusRaw === 'successfully_recovered' && isAuthorizedOfficer && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowOutcomeModal(false);
                      handleOpenCorrectionModal();
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold font-display bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit_note</span>
                    <span>Go to Correct Recovery Outcome</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Correct Recovery Outcome Modal */}
      {showCorrectionModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative z-[10000] bg-white rounded-2xl border border-amber-300 shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">edit_note</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#173B4D]">
                    Correct Recovery Outcome
                  </h3>
                  <span className="text-[11px] font-mono text-amber-700">
                    MISSION {displayId} • INCIDENT #{missionData?.report_id} • AUDIT REVISION
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                disabled={isSubmittingCorrection}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Audit Notice */}
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <span className="material-symbols-outlined text-amber-700 text-base shrink-0 mt-0.5">policy</span>
              <div>
                <strong>Immutable Audit Trail:</strong> All previous recovery entries are permanently preserved. Submitting a correction creates an append-only audit record linked to the previous outcome.
              </div>
            </div>

            {/* Error banner */}
            {correctionErrors.submit && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{correctionErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCorrection} className="flex flex-col gap-4">
              {/* Mandatory Correction Reason */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-700 font-bold flex items-center justify-between">
                  <span>Mandatory Audit Correction Reason *</span>
                  <span className="text-amber-700 font-normal normal-case">Required for NGO compliance</span>
                </label>
                <textarea
                  rows="3"
                  placeholder="Detail the operational or administrative reason for this correction (e.g. secondary inspection revealed remaining net fragments, incorrect outcome selected during maritime dispatch)..."
                  value={correctionData.correction_reason}
                  onChange={(e) => setCorrectionData({ ...correctionData, correction_reason: e.target.value })}
                  className="p-3 rounded-lg border border-amber-300 bg-amber-50/30 text-xs text-[#173B4D] focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed placeholder:text-slate-400"
                  required
                ></textarea>
                {correctionErrors.correction_reason && (
                  <span className="text-[10px] text-rose-500 font-semibold">{correctionErrors.correction_reason}</span>
                )}
              </div>

              {/* Corrected Outcome Radio Group */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Corrected Recovery Result *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'successfully_recovered',
                      label: 'Successfully Recovered',
                      desc: 'Gear fully retrieved and safely hauled aboard salvage vessel.',
                      icon: 'check_circle',
                      color: 'border-emerald-300 bg-emerald-50/40 text-emerald-900',
                    },
                    {
                      id: 'partially_recovered',
                      label: 'Partially Recovered',
                      desc: 'Portion of gear retrieved; fragments or submerged netting remains.',
                      icon: 'timelapse',
                      color: 'border-teal-300 bg-teal-50/40 text-teal-900',
                    },
                    {
                      id: 'unsuccessful',
                      label: 'Recovery Unsuccessful',
                      desc: 'Gear could not be salvaged, snagged on reef, or dive aborted.',
                      icon: 'cancel',
                      color: 'border-rose-300 bg-rose-50/40 text-rose-900',
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        correctionData.outcome === opt.id
                          ? `${opt.color} ring-1 ring-amber-500 shadow-2xs`
                          : 'border-[#D8ECEC] bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctionOutcome"
                        value={opt.id}
                        checked={correctionData.outcome === opt.id}
                        onChange={(e) => setCorrectionData({ ...correctionData, outcome: e.target.value })}
                        className="mt-0.5 accent-amber-600"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                          <span className="text-xs font-bold text-[#173B4D]">{opt.label}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                          {opt.desc}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                {correctionErrors.outcome && (
                  <span className="text-[10px] text-rose-500">{correctionErrors.outcome}</span>
                )}
              </div>

              {/* Revised Operational Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Revised Operational Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Additional context or notes regarding this revised recovery result..."
                  value={correctionData.notes}
                  onChange={(e) => setCorrectionData({ ...correctionData, notes: e.target.value })}
                  className="p-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] leading-relaxed"
                ></textarea>
              </div>

              {/* Optional Evidence Photograph Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Updated Evidence Photograph (Optional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleCorrectionFileChange}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#D8ECEC] file:bg-[#EAF7F7] file:text-xs file:font-bold file:text-[#087E8B] hover:file:bg-[#d8eded] cursor-pointer"
                  />
                  {correctionEvidenceFile && (
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      {(correctionEvidenceFile.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  )}
                </div>
                {correctionErrors.file && (
                  <span className="text-[10px] text-rose-500">{correctionErrors.file}</span>
                )}
                {correctionEvidencePreview && (
                  <div className="mt-1 relative w-32 h-24 rounded-lg overflow-hidden border border-[#D8ECEC]">
                    <img
                      src={correctionEvidencePreview}
                      alt="Upload Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Authorizing Officer */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Authorizing Officer Identity *
                </label>
                <input
                  type="text"
                  value={correctionData.submitted_by}
                  onChange={(e) => setCorrectionData({ ...correctionData, submitted_by: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  required
                />
              </div>

              {/* Confirmation Requirement */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="confirm-correction-checkbox"
                  checked={correctionData.confirmed}
                  onChange={(e) => setCorrectionData({ ...correctionData, confirmed: e.target.checked })}
                  className="mt-0.5 w-4 h-4 accent-amber-600 cursor-pointer"
                />
                <label htmlFor="confirm-correction-checkbox" className="text-xs text-slate-700 leading-snug cursor-pointer">
                  I certify as an authorized NGO officer that this correction is authentic, accurate, and reflects verified operational telemetry.
                </label>
              </div>
              {correctionErrors.confirmed && (
                <span className="text-[10px] text-rose-500">{correctionErrors.confirmed}</span>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8ECEC]">
                <button
                  type="button"
                  onClick={() => setShowCorrectionModal(false)}
                  disabled={isSubmittingCorrection}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionData.confirmed || !correctionData.correction_reason.trim()}
                  className={`px-4 py-2 rounded-lg text-xs font-bold font-display flex items-center gap-1.5 shadow-xs transition-all ${
                    correctionData.confirmed && correctionData.correction_reason.trim() && !isSubmittingCorrection
                      ? 'bg-amber-500 text-white hover:bg-amber-600 cursor-pointer active:scale-[0.99]'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSubmittingCorrection ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Recording Audit Revision...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified</span>
                      <span>Submit Authorized Correction</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Certified Recovery Record Modal */}
      {showViewRecordModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative z-[10000] bg-white rounded-2xl border border-[#D8ECEC] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#173B4D]">
                    Certified Recovery Record
                  </h3>
                  <span className="text-[11px] font-mono text-[#087E8B]">
                    MISSION {displayId} • INCIDENT #{missionData?.report_id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowViewRecordModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Current Final Status Card */}
            <div className="p-4 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                  Current Certified Outcome
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border flex items-center gap-1.5 ${statusBadge.cls}`}>
                  <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`}></span>
                  <span>{statusBadge.label}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#D8ECEC]/80">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Incident ID</span>
                  <span className="font-bold text-[#173B4D]">#{missionData?.report_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Gear Category</span>
                  <span className="font-bold text-[#173B4D]">{(missionData?.incident_gear_type || 'Ghost Net').toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Deployment Base</span>
                  <span className="font-bold text-[#173B4D]">{missionData?.departure_port || 'Mirkarwada'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Salvage Vessel</span>
                  <span className="font-bold text-[#173B4D]">{missionData?.assigned_to || missionData?.vessel || 'Vessel Team'}</span>
                </div>
              </div>
            </div>

            {/* Latest Outcome Details */}
            {outcomeHistory.length > 0 && (
              <div className="p-4 rounded-xl bg-white border border-[#D8ECEC] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                    Latest Ledger Entry (Record #{outcomeHistory[0]?.id || 1})
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {outcomeHistory[0]?.submitted_at ? new Date(outcomeHistory[0].submitted_at).toLocaleString() : ''}
                  </span>
                </div>
                <div className="text-xs text-slate-700">
                  Certified By: <strong className="text-[#173B4D]">{outcomeHistory[0]?.submitted_by || 'Officer'}</strong>
                </div>
                {outcomeHistory[0]?.notes && (
                  <p className="text-xs text-slate-600 bg-[#F2FAFA] p-2.5 rounded-lg border border-[#D8ECEC]/60 leading-relaxed italic">
                    "{outcomeHistory[0].notes}"
                  </p>
                )}
                {outcomeHistory[0]?.evidence_url && (
                  <div className="mt-1">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block mb-1">
                      Evidence Image:
                    </span>
                    <a
                      href={outcomeHistory[0].evidence_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-[#D8ECEC] max-h-36"
                    >
                      <img
                        src={outcomeHistory[0].evidence_url}
                        alt="Evidence"
                        className="w-full h-32 object-cover"
                      />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Ledger Audit Summary */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Total Audit Records: <strong className="text-[#173B4D] font-mono">{outcomeHistory.length}</strong>
              </span>
              <span className="text-amber-800 font-semibold">
                Corrections Logged: <strong className="font-mono">{outcomeHistory.filter(o => o.is_correction).length}</strong>
              </span>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#D8ECEC]">
              {isAuthorizedOfficer ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowViewRecordModal(false);
                    handleOpenCorrectionModal();
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold text-amber-800 hover:bg-amber-50 border border-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm text-amber-600">edit_note</span>
                  <span>Correct Outcome</span>
                </button>
              ) : (
                <div></div>
              )}
              <button
                type="button"
                onClick={() => setShowViewRecordModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#087E8B] hover:bg-[#066570] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Parameters Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative z-[10000] bg-white rounded-2xl border border-[#D8ECEC] shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4 animate-in fade-in duration-150 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#EAF7F7] text-[#087E8B] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">edit_note</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-[#173B4D]">
                    Edit Mission Parameters
                  </h3>
                  <span className="text-[11px] font-mono text-[#087E8B]">
                    MISSION {displayId} • INCIDENT #{missionData?.report_id || id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={isSavingEdit}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {editErrors.submit && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{editErrors.submit}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Mission Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Target Sector
                  </label>
                  <input
                    type="text"
                    value={editFormData.target_sector}
                    onChange={(e) => setEditFormData({ ...editFormData, target_sector: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Departure Port
                  </label>
                  <input
                    type="text"
                    value={editFormData.departure_port}
                    onChange={(e) => setEditFormData({ ...editFormData, departure_port: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Assigned Vessel *
                  </label>
                  <input
                    type="text"
                    value={editFormData.assigned_to}
                    onChange={(e) => setEditFormData({ ...editFormData, assigned_to: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                    Planned Date *
                  </label>
                  <input
                    type="date"
                    value={editFormData.target_date}
                    onChange={(e) => setEditFormData({ ...editFormData, target_date: e.target.value })}
                    className="h-9 px-3 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1]"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                  Operational Salvage Notes
                </label>
                <textarea
                  rows="3"
                  value={editFormData.operational_notes}
                  onChange={(e) => setEditFormData({ ...editFormData, operational_notes: e.target.value })}
                  className="p-2.5 rounded-lg border border-[#D8ECEC] bg-[#F2FAFA] text-xs text-[#173B4D] focus:outline-none focus:ring-1 focus:ring-[#00C9C1] leading-relaxed"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#D8ECEC]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-lg text-xs font-bold font-display bg-[#00C9C1] text-[#173B4D] hover:bg-[#00b5ae] transition-colors"
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecoveryMissionDetails;
