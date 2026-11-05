import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  predictImage,
  getModelInfo,
  runReportInference,
  getDetectionsByReport,
  listDetections,
  confirmDetection,
  rejectDetection,
  reviewDetection,
  ALLOWED_MIME_TYPES,
} from '../../services/detectionService';
import { API_BASE_URL } from '../../services/api';
import EmptyState from '../../components/ngo/EmptyState';

/**
 * Screen 5 — AI Detection Review & Approval Workflow
 * Fully connected to FastAPI + PostgreSQL backend and YOLOv8-seg model.
 * 
 * Capabilities:
 * - Persistent detection review status (pending, confirmed, rejected)
 * - Filtering by review status, target class, and incident ID
 * - Real-time review actions: Confirm Gear Presence & Flag False Positive
 * - Optical inspection viewport with bbox coordinates, mask contours, and model telemetry
 * - Standalone file inference sandbox and report inference execution
 */
export const AiDetectionReview = () => {
  const location = useLocation();
  const incomingReport = location.state?.report;
  const targetDetectionId = location.state?.targetDetectionId;

  // Review Queue State
  const [detections, setDetections] = useState([]);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterIncidentId, setFilterIncidentId] = useState(incomingReport?.id ? String(incomingReport.id) : '');

  // Model & Inference Workspace State
  const fileInputRef = useRef(null);
  const [activeReport, setActiveReport] = useState(incomingReport || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showAnnotated, setShowAnnotated] = useState(true);
  const [runningInference, setRunningInference] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

  // Review Actions & Feedback State
  const [reviewingId, setReviewingId] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    detection: null,
    reason: '',
    reviewer: 'NGO Field Officer',
    submitting: false,
  });

  // Fetch live YOLO model metadata
  useEffect(() => {
    async function loadModelMetadata() {
      try {
        const info = await getModelInfo();
        setModelInfo(info);
      } catch (err) {
        console.warn('Could not query model metadata:', err.message);
      }
    }
    loadModelMetadata();
  }, []);

  // Fetch detections list from FastAPI backend based on active filters
  const loadDetectionsList = async (reportIdFilter, statusFilter, classFilter) => {
    try {
      setLoadingList(true);
      const params = {
        pageSize: 50,
      };
      if (reportIdFilter && !isNaN(Number(reportIdFilter))) {
        params.reportId = Number(reportIdFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.reviewStatus = statusFilter;
      }
      if (classFilter && classFilter !== 'all') {
        params.detectedClass = classFilter;
      }

      const res = await listDetections(params);
      const items = res?.items || [];
      setDetections(items);

      // Select target detection if requested, or keep existing, or default to first
      if (targetDetectionId) {
        const found = items.find((d) => d.id === Number(targetDetectionId));
        if (found) setSelectedDetection(found);
        else if (items.length > 0) setSelectedDetection(items[0]);
      } else if (items.length > 0) {
        setSelectedDetection((prev) => {
          if (!prev) return items[0];
          const matched = items.find((d) => d.id === prev.id);
          return matched || items[0];
        });
      } else {
        setSelectedDetection(null);
      }
    } catch (err) {
      console.warn('Failed to fetch detections list:', err.message);
      setActionFeedback({
        type: 'error',
        message: `Failed to load detections: ${err.message}`,
      });
    } finally {
      setLoadingList(false);
    }
  };

  // Trigger list load when filters change
  useEffect(() => {
    loadDetectionsList(filterIncidentId, filterStatus, filterClass);
  }, [filterStatus, filterClass, filterIncidentId]);

  // Handle incoming report navigation or autoRun
  useEffect(() => {
    if (incomingReport?.image_url) {
      setActiveReport(incomingReport);
      const fullUrl = incomingReport.image_url.startsWith('http://') || incomingReport.image_url.startsWith('https://')
        ? incomingReport.image_url
        : `${API_BASE_URL.replace(/\/+$/, '')}${incomingReport.image_url.startsWith('/') ? '' : '/'}${incomingReport.image_url}`;

      setImagePreview(fullUrl);

      if (location.state?.autoRun) {
        setRunningInference(true);
        runReportInference(incomingReport.id)
          .then((reportRes) => {
            const data = reportRes.inference_summary || reportRes;
            if (reportRes.saved_detections) {
              data.saved_detections = reportRes.saved_detections;
            }
            setDetectionResult(data);
            setShowAnnotated(true);
            loadDetectionsList(incomingReport.id, filterStatus, filterClass);
          })
          .catch((err) => {
            setActionFeedback({
              type: 'error',
              message: err.message || 'Failed to execute inference on incident photo.',
            });
          })
          .finally(() => setRunningInference(false));
      }
    }
  }, [incomingReport, location.state]);

  // When selectedDetection changes, update optical viewport preview
  useEffect(() => {
    if (selectedDetection && !selectedFile) {
      if (selectedDetection.incident_image_url) {
        const fullUrl = selectedDetection.incident_image_url.startsWith('http://') || selectedDetection.incident_image_url.startsWith('https://')
          ? selectedDetection.incident_image_url
          : `${API_BASE_URL.replace(/\/+$/, '')}${selectedDetection.incident_image_url.startsWith('/') ? '' : '/'}${selectedDetection.incident_image_url}`;
        setImagePreview(fullUrl);
      }
      setActiveReport({
        id: selectedDetection.report_id,
        title: selectedDetection.incident_title,
        gear_type: selectedDetection.incident_gear_type || 'fishing_gear',
      });
      // Clear manual file
      setSelectedFile(null);
    }
  }, [selectedDetection]);

  // Handle manual file selection for standalone inference testing
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }

    setActiveReport(null);
    setSelectedDetection(null);
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
    setDetectionResult(null);
    setActionFeedback(null);
    setShowAnnotated(true);
  };

  // Run YOLOv8-seg neural inference
  const handleRunInference = async () => {
    if (!selectedFile && !activeReport?.id) return;

    setRunningInference(true);
    setActionFeedback(null);

    try {
      let data;
      if (selectedFile) {
        data = await predictImage(selectedFile, null);
      } else if (activeReport?.id) {
        const reportRes = await runReportInference(activeReport.id);
        data = reportRes.inference_summary || reportRes;
        if (reportRes.saved_detections) {
          data.saved_detections = reportRes.saved_detections;
        }
        // Refresh queue to include newly saved detections
        await loadDetectionsList(activeReport.id, filterStatus, filterClass);
      }
      setDetectionResult(data);
      setShowAnnotated(true);
      setActionFeedback({
        type: 'success',
        message: `Inference complete: ${data.detection_count || 0} target(s) identified.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Inference failed on selected imagery.',
      });
    } finally {
      setRunningInference(false);
    }
  };

  const handleClearImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedFile(null);
    setImagePreview(null);
    setDetectionResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Confirm Gear Presence action
  const handleConfirmDetection = async (det) => {
    if (!det?.id) return;
    try {
      setReviewingId(det.id);
      setActionFeedback(null);

      const updated = await confirmDetection(det.id, {
        reviewedBy: 'NGO Field Officer',
        reviewNotes: 'Confirmed actual abandoned fishing gear presence.',
      });

      // Update state immediately after backend confirms
      setDetections((prev) => prev.map((d) => (d.id === det.id ? updated : d)));
      if (selectedDetection?.id === det.id) {
        setSelectedDetection(updated);
      }

      setActionFeedback({
        type: 'success',
        message: `AI Detection #${det.id} (${det.detected_class.replace(/_/g, ' ')}) confirmed as verified gear presence.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Failed to confirm detection: ${err.message}`,
      });
    } finally {
      setReviewingId(null);
    }
  };

  // Open False Positive Modal
  const handleOpenRejectModal = (det) => {
    setRejectModal({
      isOpen: true,
      detection: det,
      reason: '',
      reviewer: 'NGO Field Officer',
      submitting: false,
    });
  };

  // Submit False Positive Rejection
  const handleSubmitReject = async () => {
    if (!rejectModal.detection?.id) return;
    try {
      setRejectModal((prev) => ({ ...prev, submitting: true }));
      setActionFeedback(null);

      const updated = await rejectDetection(rejectModal.detection.id, {
        reviewedBy: rejectModal.reviewer || 'NGO Field Officer',
        reviewNotes: rejectModal.reason || 'Flagged as false positive detection.',
      });

      // Update state immediately after backend confirms
      setDetections((prev) =>
        prev.map((d) => (d.id === rejectModal.detection.id ? updated : d))
      );
      if (selectedDetection?.id === rejectModal.detection.id) {
        setSelectedDetection(updated);
      }

      setActionFeedback({
        type: 'success',
        message: `AI Detection #${rejectModal.detection.id} flagged as false positive.`,
      });

      setRejectModal({
        isOpen: false,
        detection: null,
        reason: '',
        reviewer: 'NGO Field Officer',
        submitting: false,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Failed to flag false positive: ${err.message}`,
      });
      setRejectModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Re-open / Reset to Pending
  const handleResetToPending = async (det) => {
    if (!det?.id) return;
    try {
      setReviewingId(det.id);
      setActionFeedback(null);

      const updated = await reviewDetection(det.id, {
        reviewStatus: 'pending',
        reviewedBy: 'NGO Field Officer',
        reviewNotes: 'Review status reset to pending for re-evaluation.',
      });

      setDetections((prev) => prev.map((d) => (d.id === det.id ? updated : d)));
      if (selectedDetection?.id === det.id) {
        setSelectedDetection(updated);
      }

      setActionFeedback({
        type: 'success',
        message: `AI Detection #${det.id} reset to pending review.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: `Failed to reset review status: ${err.message}`,
      });
    } finally {
      setReviewingId(null);
    }
  };

  // Computed summary metrics
  const totalCount = detections.length;
  const pendingCount = detections.filter((d) => d.review_status === 'pending').length;
  const confirmedCount = detections.filter((d) => d.review_status === 'confirmed').length;
  const rejectedCount = detections.filter((d) => d.review_status === 'rejected').length;

  const formatClassName = (name) => {
    if (!name) return 'Target Gear';
    return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Header & Mission Context */}
      <div className="bg-white p-5 rounded-xl border border-[#D8ECEC] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
              <span className="uppercase text-[#087E8B] font-semibold">NGO Operations</span>
              <span>/</span>
              <span className="text-[#173B4D] font-medium">AI Triage</span>
              {activeReport && (
                <>
                  <span>/</span>
                  <Link
                    to={`/ngo/incidents/${activeReport.id}`}
                    className="text-[#087E8B] font-bold hover:underline"
                  >
                    Incident #{activeReport.id}
                  </Link>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold font-display text-[#173B4D] tracking-tight">
              AI Detection Review &amp; Approval
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Review AI-generated fishing gear detections from the YOLOv8-seg model. Confirm verified
              abandoned fishing nets and ropes or flag false positives with full database persistence.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => loadDetectionsList(filterIncidentId, filterStatus, filterClass)}
              disabled={loadingList}
              className="px-3 py-2 rounded-lg bg-white border border-[#D8ECEC] hover:bg-[#F2FAFA] text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh detections from database"
            >
              <span className={`material-symbols-outlined text-[16px] ${loadingList ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>Refresh</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              <span>Upload Imagery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Action / Error Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">
              {actionFeedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-slate-500 hover:text-slate-800 cursor-pointer ml-3"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Metric Counters Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`p-4 rounded-xl border bg-white cursor-pointer transition-all hover:border-[#087E8B] ${
            filterStatus === 'all' ? 'border-[#087E8B] ring-2 ring-[#087E8B]/10' : 'border-[#D8ECEC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">
              Total Detections
            </span>
            <span className="material-symbols-outlined text-slate-400 text-lg">
              filter_center_focus
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-[#173B4D]">{totalCount}</div>
          <span className="text-[10px] text-slate-500">Persistent database records</span>
        </div>

        <div
          onClick={() => setFilterStatus('pending')}
          className={`p-4 rounded-xl border bg-white cursor-pointer transition-all hover:border-amber-500 ${
            filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-[#D8ECEC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-700 uppercase font-bold">
              Pending Review
            </span>
            <span className="material-symbols-outlined text-amber-500 text-lg">
              hourglass_empty
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-900">{pendingCount}</div>
          <span className="text-[10px] text-amber-700">Awaiting officer triage</span>
        </div>

        <div
          onClick={() => setFilterStatus('confirmed')}
          className={`p-4 rounded-xl border bg-white cursor-pointer transition-all hover:border-emerald-600 ${
            filterStatus === 'confirmed' ? 'border-emerald-600 ring-2 ring-emerald-600/10' : 'border-[#D8ECEC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-emerald-700 uppercase font-bold">
              Confirmed Gear
            </span>
            <span className="material-symbols-outlined text-emerald-600 text-lg">
              verified
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-900">{confirmedCount}</div>
          <span className="text-[10px] text-emerald-700">Verified net / rope presence</span>
        </div>

        <div
          onClick={() => setFilterStatus('rejected')}
          className={`p-4 rounded-xl border bg-white cursor-pointer transition-all hover:border-rose-500 ${
            filterStatus === 'rejected' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-[#D8ECEC]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-rose-700 uppercase font-bold">
              False Positives
            </span>
            <span className="material-symbols-outlined text-rose-500 text-lg">
              cancel
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-900">{rejectedCount}</div>
          <span className="text-[10px] text-rose-700">Flagged non-gear targets</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#D8ECEC] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-mono uppercase text-slate-500 font-bold mr-1">Status:</span>
          {[
            { id: 'all', label: 'All Detections' },
            { id: 'pending', label: 'Pending' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'rejected', label: 'False Positives' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-[#173B4D] text-white shadow-2xs'
                  : 'bg-[#F2FAFA] hover:bg-[#EAF7F7] text-slate-700 border border-[#D8ECEC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Class Filter & Incident ID Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono uppercase text-slate-500 font-bold">Class:</span>
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs font-mono text-[#173B4D] focus:ring-2 focus:ring-[#00C9C1] cursor-pointer"
            >
              <option value="all">All Classes</option>
              <option value="fishing_net">Fishing Net</option>
              <option value="rope_line">Rope &amp; Line</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono uppercase text-slate-500 font-bold">Incident #:</span>
            <input
              type="text"
              value={filterIncidentId}
              onChange={(e) => setFilterIncidentId(e.target.value)}
              placeholder="e.g. 156"
              className="w-24 px-2.5 py-1.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs font-mono text-[#173B4D] focus:ring-2 focus:ring-[#00C9C1]"
            />
            {filterIncidentId && (
              <button
                type="button"
                onClick={() => setFilterIncidentId('')}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear incident filter"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main 12-Column Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Filterable Detection Review Queue */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC] mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-lg">
                  checklist_rtl
                </span>
                <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[#173B4D]">
                  Review Ledger ({detections.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Click target to inspect
              </span>
            </div>

            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                <span className="material-symbols-outlined text-[#087E8B] text-3xl animate-spin">
                  progress_activity
                </span>
                <span className="text-xs font-mono">Querying detection records...</span>
              </div>
            ) : detections.length > 0 ? (
              <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                {detections.map((det) => {
                  const isSelected = selectedDetection?.id === det.id;
                  const isPending = det.review_status === 'pending';
                  const isConfirmed = det.review_status === 'confirmed';
                  const isRejected = det.review_status === 'rejected';

                  return (
                    <div
                      key={det.id}
                      onClick={() => setSelectedDetection(det)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isSelected
                          ? 'bg-[#F2FAFA] border-[#087E8B] shadow-xs ring-1 ring-[#087E8B]'
                          : 'bg-white border-[#D8ECEC] hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Top Bar: Incident Link & Status Chip */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="material-symbols-outlined text-[#087E8B] text-base flex-shrink-0">
                            fmd_bad
                          </span>
                          <Link
                            to={`/ngo/incidents/${det.report_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-xs text-[#173B4D] hover:text-[#087E8B] hover:underline truncate"
                          >
                            {det.incident_title || `Incident #${det.report_id}`}
                          </Link>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 border flex-shrink-0 ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {isConfirmed ? 'verified' : isRejected ? 'cancel' : 'hourglass_empty'}
                          </span>
                          <span>{det.review_status}</span>
                        </span>
                      </div>

                      {/* Middle: Target Class & Confidence */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-[#173B4D] flex items-center gap-1.5 capitalize">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isConfirmed
                                ? 'bg-emerald-500'
                                : isRejected
                                ? 'bg-rose-500'
                                : 'bg-amber-500'
                            }`}
                          ></span>
                          {formatClassName(det.detected_class)}
                        </span>
                        <span className="font-bold text-[#087E8B] bg-[#EAF7F7] px-2 py-0.5 rounded border border-[#D8ECEC]">
                          {det.confidence_percent !== undefined
                            ? `${det.confidence_percent}%`
                            : `${(Number(det.confidence) * 100).toFixed(1)}%`}
                        </span>
                      </div>

                      {/* BBox & Polygon Geometry Indicator */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#D8ECEC]/60">
                        <span>
                          {det.polygon && Array.isArray(det.polygon) && det.polygon.length > 0
                            ? `Mask: ${det.polygon.length} pts`
                            : det.bbox
                            ? 'Bounding Box'
                            : 'AI Sighting'}
                        </span>
                        <span>#{det.id}</span>
                      </div>

                      {/* Review details if reviewed */}
                      {!isPending && (
                        <div className="pt-1.5 border-t border-slate-100 text-[10px] text-slate-600 flex flex-col gap-0.5">
                          <div className="flex justify-between text-slate-500">
                            <span>Officer:</span>
                            <span className="font-medium text-[#173B4D]">
                              {det.reviewed_by || 'NGO Officer'}
                            </span>
                          </div>
                          {det.review_notes && (
                            <p className="italic text-slate-600 bg-slate-50 p-1.5 rounded mt-0.5 border border-slate-200/60 leading-tight">
                              "{det.review_notes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Quick Review Actions */}
                      {isPending && (
                        <div
                          className="grid grid-cols-2 gap-2 pt-2 border-t border-[#D8ECEC]/60"
                          onClick={(e) => e.stopPropagation()}
                        >
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
              <EmptyState
                icon="filter_center_focus"
                title="No AI Detections Found"
                description={
                  filterStatus !== 'all' || filterClass !== 'all' || filterIncidentId
                    ? 'No detections match your active status, class, or incident filters. Try clearing filters to inspect all records.'
                    : 'No AI detections have been saved to the PostgreSQL database yet. Upload field imagery or run YOLO inference on an incident report to begin.'
                }
                actionText={filterStatus !== 'all' || filterClass !== 'all' || filterIncidentId ? 'Reset Filters' : 'Upload Field Imagery'}
                onAction={() => {
                  if (filterStatus !== 'all' || filterClass !== 'all' || filterIncidentId) {
                    setFilterStatus('all');
                    setFilterClass('all');
                    setFilterIncidentId('');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                secondaryNote="Zero synthetic records: All detections represent real model inference results."
                className="w-full border-none shadow-none p-4"
              />
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Optical Inspection Viewport & Review Action Card */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Media Viewport */}
          <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8ECEC] mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono uppercase font-bold text-[#173B4D]">
                  Field Optical Viewport
                </span>
                {selectedFile ? (
                  <span className="text-[10px] font-mono text-slate-500 bg-[#F2FAFA] px-2 py-0.5 rounded border border-[#D8ECEC]">
                    {selectedFile.name} (Standalone Upload)
                  </span>
                ) : selectedDetection ? (
                  <span className="text-[10px] font-mono text-[#087E8B] bg-[#EAF7F7] px-2 py-0.5 rounded border border-[#D8ECEC] font-bold">
                    Incident #{selectedDetection.report_id} Target #{selectedDetection.id}
                  </span>
                ) : activeReport ? (
                  <span className="text-[10px] font-mono text-[#087E8B] bg-[#EAF7F7] px-2 py-0.5 rounded border border-[#D8ECEC] font-bold">
                    Incident #{activeReport.id} Evidence Photo
                  </span>
                ) : null}

                {detectionResult?.annotated_image_b64 && (
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowAnnotated(!showAnnotated)}
                      className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EAF7F7] text-[#087E8B] hover:bg-[#00C9C1] hover:text-[#173B4D] border border-[#D8ECEC] transition-colors cursor-pointer"
                    >
                      {showAnnotated ? 'Show Raw Photo' : 'Show YOLOv8 Overlay'}
                    </button>
                  </div>
                )}
              </div>

              {(selectedFile || imagePreview) && (
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Viewport Content */}
            <div className="flex-1 flex flex-col items-center justify-center">
              {imagePreview ? (
                <div className="w-full flex flex-col items-center">
                  <div className="relative rounded-lg overflow-hidden border border-[#D8ECEC] max-h-[460px] bg-slate-900 shadow-inner flex items-center justify-center w-full">
                    <img
                      src={
                        showAnnotated && detectionResult?.annotated_image_b64
                          ? `data:image/jpeg;base64,${detectionResult.annotated_image_b64}`
                          : imagePreview
                      }
                      alt="Field optical inspection target"
                      className="max-h-[460px] w-auto object-contain"
                      onLoad={(e) => {
                        setImgNaturalSize({
                          width: e.target.naturalWidth,
                          height: e.target.naturalHeight,
                        });
                      }}
                    />

                    {/* SVG Bounding Box and Polygon Mask Overlay (if bbox / polygon present and raw photo visible) */}
                    {selectedDetection &&
                      !detectionResult?.annotated_image_b64 &&
                      imgNaturalSize.width > 0 &&
                      (selectedDetection.bbox || selectedDetection.polygon) && (
                        <svg
                          className="absolute inset-0 w-full h-full pointer-events-none"
                          viewBox={`0 0 ${imgNaturalSize.width} ${imgNaturalSize.height}`}
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Segmentation Polygon */}
                          {selectedDetection.polygon &&
                            Array.isArray(selectedDetection.polygon) &&
                            selectedDetection.polygon.length > 2 && (
                              <polygon
                                points={selectedDetection.polygon
                                  .map((pt) => `${pt[0]},${pt[1]}`)
                                  .join(' ')}
                                fill={
                                  selectedDetection.review_status === 'confirmed'
                                    ? 'rgba(16, 185, 129, 0.35)'
                                    : selectedDetection.review_status === 'rejected'
                                    ? 'rgba(244, 63, 94, 0.35)'
                                    : 'rgba(0, 201, 193, 0.35)'
                                }
                                stroke={
                                  selectedDetection.review_status === 'confirmed'
                                    ? '#10B981'
                                    : selectedDetection.review_status === 'rejected'
                                    ? '#F43F5E'
                                    : '#00C9C1'
                                }
                                strokeWidth="2.5"
                              />
                            )}

                          {/* Bounding Box */}
                          {selectedDetection.bbox &&
                            Array.isArray(selectedDetection.bbox) &&
                            selectedDetection.bbox.length === 4 && (
                              <rect
                                x={selectedDetection.bbox[0]}
                                y={selectedDetection.bbox[1]}
                                width={selectedDetection.bbox[2] - selectedDetection.bbox[0]}
                                height={selectedDetection.bbox[3] - selectedDetection.bbox[1]}
                                fill="none"
                                stroke={
                                  selectedDetection.review_status === 'confirmed'
                                    ? '#10B981'
                                    : selectedDetection.review_status === 'rejected'
                                    ? '#F43F5E'
                                    : '#00C9C1'
                                }
                                strokeWidth="2.5"
                                strokeDasharray="4 2"
                              />
                            )}
                        </svg>
                      )}

                    {runningInference && (
                      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                        <span className="material-symbols-outlined text-3xl animate-spin text-[#00C9C1]">
                          progress_activity
                        </span>
                        <span className="font-mono text-xs text-[#00C9C1] font-bold">
                          Executing YOLOv8-Seg Inference (Agnostic NMS &amp; Retina Masks)...
                        </span>
                      </div>
                    )}

                    {showAnnotated && detectionResult?.annotated_image_b64 && !runningInference && (
                      <span className="absolute bottom-2 left-2 bg-[#173B4D]/85 backdrop-blur-xs text-[#00C9C1] text-[10px] font-mono font-bold px-2.5 py-1 rounded border border-[#00C9C1]/30 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00C9C1] animate-pulse"></span>
                        YOLOv8-Seg Overlay Active
                      </span>
                    )}

                    {selectedDetection && !detectionResult?.annotated_image_b64 && (
                      <span className="absolute bottom-2 left-2 bg-[#173B4D]/85 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-2.5 py-1 rounded border border-white/20 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#00C9C1]"></span>
                        Database Vector Geometry ({formatClassName(selectedDetection.detected_class)})
                      </span>
                    )}
                  </div>

                  {/* Manual Inference Trigger for current image */}
                  {(selectedFile || activeReport?.id) && (
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleRunInference}
                        disabled={runningInference}
                        className="px-4 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <span
                          className={`material-symbols-outlined text-[16px] ${
                            runningInference ? 'animate-spin' : ''
                          }`}
                        >
                          {runningInference ? 'sync' : 'auto_fix_high'}
                        </span>
                        <span>
                          {runningInference ? 'Analyzing Photo...' : 'Re-Run YOLOv8-Seg Inference'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon="filter_center_focus"
                  title="No Optical Imagery Selected"
                  description="Select a detection candidate from the Review Ledger on the left, or upload field imagery to inspect with the YOLOv8-seg neural pipeline."
                  actionText="Select Field Imagery"
                  onAction={() => fileInputRef.current?.click()}
                  secondaryNote="Verified inference only: All confidence scores originate from genuine neural post-processing."
                  className="w-full border-none shadow-none p-4"
                />
              )}
            </div>
          </div>

          {/* Selected Detection Details & Review Decision Panel */}
          {selectedDetection ? (
            <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-start justify-between pb-3 border-b border-[#D8ECEC]">
                <div>
                  <span className="text-[10px] font-mono text-[#087E8B] uppercase font-bold tracking-wider">
                    Target Inspection Telemetry
                  </span>
                  <h3 className="text-lg font-bold font-display text-[#173B4D]">
                    {formatClassName(selectedDetection.detected_class)} #{selectedDetection.id}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/ngo/incidents/${selectedDetection.report_id}`}
                    className="px-2.5 py-1 rounded-lg bg-[#EAF7F7] hover:bg-[#00C9C1] hover:text-[#173B4D] text-[#087E8B] text-xs font-mono font-bold transition-colors flex items-center gap-1"
                  >
                    <span>Incident #{selectedDetection.report_id}</span>
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                </div>
              </div>

              {/* Status and Telemetry Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Review Status
                  </span>
                  <span
                    className={`font-bold uppercase text-[11px] ${
                      selectedDetection.review_status === 'confirmed'
                        ? 'text-emerald-700'
                        : selectedDetection.review_status === 'rejected'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {selectedDetection.review_status}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Confidence
                  </span>
                  <span className="font-bold text-[#087E8B] text-[11px]">
                    {selectedDetection.confidence_percent !== undefined
                      ? `${selectedDetection.confidence_percent}%`
                      : `${(Number(selectedDetection.confidence) * 100).toFixed(1)}%`}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Architecture
                  </span>
                  <span className="font-bold text-[#173B4D] text-[11px] truncate block">
                    {selectedDetection.model_name || 'yolov8s-seg'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC]">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Spatial Mask
                  </span>
                  <span className="font-bold text-[#173B4D] text-[11px]">
                    {selectedDetection.polygon && Array.isArray(selectedDetection.polygon)
                      ? `${selectedDetection.polygon.length} pts`
                      : 'Bounding Box'}
                  </span>
                </div>
              </div>

              {/* Bounding Box Coordinates info */}
              {selectedDetection.bbox && Array.isArray(selectedDetection.bbox) && (
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 flex items-center justify-between">
                  <span className="text-slate-500">Bounding Box [x1, y1, x2, y2]:</span>
                  <span className="font-bold text-[#173B4D]">
                    [{selectedDetection.bbox.map((v) => Math.round(v)).join(', ')}]
                  </span>
                </div>
              )}

              {/* Review History / Notes if already reviewed */}
              {selectedDetection.review_status !== 'pending' && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-500">Reviewing Officer:</span>
                    <span className="font-bold text-[#173B4D]">
                      {selectedDetection.reviewed_by || 'NGO Field Officer'}
                    </span>
                  </div>
                  {selectedDetection.reviewed_at && (
                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-500">Review Timestamp:</span>
                      <span>{new Date(selectedDetection.reviewed_at).toLocaleString()}</span>
                    </div>
                  )}
                  {selectedDetection.review_notes && (
                    <div className="pt-1 text-slate-700 italic border-t border-slate-200">
                      Notes: "{selectedDetection.review_notes}"
                    </div>
                  )}
                </div>
              )}

              {/* NGO Review Decision Action Buttons */}
              <div className="pt-2 border-t border-[#D8ECEC] flex flex-col gap-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">
                  Official NGO Triage Action:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={reviewingId === selectedDetection.id || selectedDetection.review_status === 'confirmed'}
                    onClick={() => handleConfirmDetection(selectedDetection)}
                    className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {reviewingId === selectedDetection.id ? 'sync' : 'verified'}
                    </span>
                    <span>
                      {selectedDetection.review_status === 'confirmed'
                        ? 'Presence Confirmed'
                        : 'Confirm Gear Presence'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={reviewingId === selectedDetection.id || selectedDetection.review_status === 'rejected'}
                    onClick={() => handleOpenRejectModal(selectedDetection)}
                    className="py-2.5 px-4 rounded-lg bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      cancel
                    </span>
                    <span>
                      {selectedDetection.review_status === 'rejected'
                        ? 'Flagged as False Positive'
                        : 'Flag False Positive'}
                    </span>
                  </button>
                </div>

                {/* Re-open / Reset to Pending option for reviewed detections */}
                {selectedDetection.review_status !== 'pending' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={reviewingId === selectedDetection.id}
                      onClick={() => handleResetToPending(selectedDetection)}
                      className="text-xs text-slate-500 hover:text-[#087E8B] font-mono underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">history</span>
                      <span>Re-open / Reset Review to Pending</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Model Status Card if no detection selected */
            <div className="bg-white rounded-xl border border-[#D8ECEC] p-5 shadow-xs">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center justify-between">
                <span>YOLOv8 Model Status</span>
                {modelInfo?.loaded ? (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    OPERATIONAL
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-bold">CHECKING...</span>
                )}
              </h3>

              <div className="space-y-2.5 text-xs font-mono text-slate-700">
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Architecture:</span>
                  <span className="font-semibold text-[#173B4D]">
                    {modelInfo?.model_name || 'yolov8s-seg-trashcan'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Compute Device:</span>
                  <span className="font-semibold text-[#173B4D] uppercase">
                    {modelInfo?.device || 'cpu'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Confidence Cutoff:</span>
                  <span className="font-semibold text-[#087E8B]">
                    {modelInfo ? `${(modelInfo.confidence_threshold * 100).toFixed(0)}%` : '25%'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Trained Classes:</span>
                  <span className="font-semibold text-[#087E8B] text-right">
                    {modelInfo?.classes
                      ? Object.values(modelInfo.classes).join(', ')
                      : 'fishing_net, rope_line'}
                  </span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Agnostic NMS:</span>
                  <span className="font-semibold text-emerald-700">Enabled (cross-class)</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-[#D8ECEC]/60">
                  <span className="text-slate-500">Retina Masks:</span>
                  <span className="font-semibold text-emerald-700">High-Res Contours</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Flag False Positive Explanation Modal */}
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
                  {formatClassName(rejectModal.detection?.detected_class)})
                </p>
                <p className="text-[11px] mt-0.5 text-rose-700">
                  Note: Rejecting this detection will NOT clear or mark the incident report as resolved.
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
                  Reason for False Positive (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) =>
                    setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
                  }
                  className="px-3 py-2 rounded-lg border border-[#D8ECEC] focus:ring-2 focus:ring-[#00C9C1] text-xs leading-relaxed"
                  placeholder="e.g., Natural kelp stipe shadow, rock reef formation, or anchor mooring line."
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

export default AiDetectionReview;
