import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Cpu,
  RefreshCw,
  Eye,
  Check,
  X,
  Flag,
  Share2,
  Download,
  Info,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Server,
  FileImage,
  ShieldCheck,
  ShieldAlert,
  Image as ImageIcon,
  MapPin,
  Activity
} from 'lucide-react';
import { getModelInfo, predictImage, API_BASE_URL } from '../services/detectionService';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';

export const AiDetectionReview = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const {
    addObservation,
    updateObservationReview,
    setSelectedObservationId,
    setCurrentInference
  } = useObservations();

  // Model & Backend status
  const [modelInfo, setModelInfo] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Active viewing mode: 'live' (uploaded/sample via FastAPI) vs 'demo' (archive frame #094)
  const [viewMode, setViewMode] = useState('demo');
  const [activeFrameId, setActiveFrameId] = useState('demo-094');

  // Display toggles
  const [showAnnotated, setShowAnnotated] = useState(true); // show backend-rendered OpenCV image vs raw uploaded
  const [showBboxes, setShowBboxes] = useState(true);
  const [showMasks, setShowMasks] = useState(true);
  const [maskAlpha, setMaskAlpha] = useState(65);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Live prediction states
  const [selectedFile, setSelectedFile] = useState(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState(null);
  const [annotatedPreviewUrl, setAnnotatedPreviewUrl] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isInferring, setIsInferring] = useState(false);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Review states for detections (targetId -> 'pending' | 'confirmed' | 'rejected' | 'flagged')
  const [reviewStates, setReviewStates] = useState({});
  const [notes, setNotes] = useState(
    'Candidate target(s) detected. Human verification is required before any recovery action.'
  );
  const [isPushingGis, setIsPushingGis] = useState(false);
  const [pushedToGis, setPushedToGis] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Initial health and model-info check
  const fetchBackendMetadata = async () => {
    try {
      const info = await getModelInfo();
      setModelInfo(info);
      setBackendOnline(info.loaded);
      setBackendError(info.error || null);
    } catch (err) {
      setBackendOnline(false);
      setBackendError(err.message || 'Cannot reach FastAPI backend on port 8000.');
    }
  };

  useEffect(() => {
    fetchBackendMetadata();
  }, []);

  // 2. Inference execution handler
  const executeInference = async (file) => {
    if (!file) return;
    setIsInferring(true);
    setUploadError(null);

    const startTime = performance.now();
    try {
      const data = await predictImage(file);
      const elapsed = Math.round(performance.now() - startTime);
      setInferenceLatencyMs(elapsed);

      const annotatedUrl = data.annotated_image_b64 ? `data:image/jpeg;base64,${data.annotated_image_b64}` : null;
      setPredictionResult(data);
      setAnnotatedPreviewUrl(annotatedUrl);

      // Reset reviewStates so old detections from previous images do not linger
      setReviewStates({});

      // Update analyst notes based on detection count
      const initialNotes = data.detection_count === 0
        ? 'Zero ALDFG targets detected above the confidence threshold. Human review is optional; no recovery action is indicated by this model result alone.'
        : 'Candidate target(s) detected. Human verification is required before any recovery action.';

      setNotes(initialNotes);

      // Update current inference in shared store
      setCurrentInference({
        predictionResult: data,
        rawPreviewUrl: URL.createObjectURL(file),
        annotatedPreviewUrl: annotatedUrl,
        activeFrameId: file.name,
        notes: initialNotes,
        timestamp: new Date().toISOString(),
      });

      setViewMode('live');
      showToast(
        data.detection_count > 0
          ? `Inference complete: ${data.detection_count} target(s) detected (${elapsed} ms).`
          : `Inference complete: 0 targets detected (${elapsed} ms).`
      );
    } catch (err) {
      setUploadError(err.message || 'Prediction failed.');
      showToast(`Error: ${err.message}`);
    } finally {
      setIsInferring(false);
    }
  };

  // 3. User file selection handler
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setActiveFrameId(file.name);
    setRawPreviewUrl(URL.createObjectURL(file));
    executeInference(file);

    // Reset input so same file can be re-selected if desired
    e.target.value = '';
  };

  // 4. Sample image loader (fetches from public/samples)
  const handleLoadSample = async (samplePath, sampleName) => {
    try {
      setIsInferring(true);
      setUploadError(null);
      setActiveFrameId(sampleName);

      const res = await fetch(samplePath);
      if (!res.ok) throw new Error(`Could not load sample file (${res.status})`);
      const blob = await res.blob();
      const file = new File([blob], sampleName, { type: 'image/jpeg' });

      setSelectedFile(file);
      setRawPreviewUrl(URL.createObjectURL(file));
      await executeInference(file);
    } catch (err) {
      setUploadError(`Failed to load sample: ${err.message}`);
      setIsInferring(false);
    }
  };

  // 5. Reset back to archive demo frame
  const handleSelectDemoFrame = () => {
    setViewMode('demo');
    setActiveFrameId('demo-094');
    setUploadError(null);
    setReviewStates({});
    setNotes('Candidate target(s) detected. Human verification is required before any recovery action.');
    showToast('Switched to Demo Archive Frame #094.');
  };

  // 6. Target action handler
  const handleAction = (targetKey, action) => {
    setReviewStates((prev) => ({
      ...prev,
      [targetKey]: prev[targetKey] === action ? 'pending' : action,
    }));
  };

  const handlePushToGis = () => {
    setIsPushingGis(true);

    if (viewMode === 'live' && predictionResult?.detections?.length > 0) {
      // Add each reviewed detection to shared state as an observation
      let firstObsId = null;
      predictionResult.detections.forEach((d) => {
        const targetKey = `LIVE-${d.detection_index}`;
        const currentStatus = reviewStates[targetKey] || 'pending';
        const cleanFrame = (activeFrameId || 'frame').replace(/\.[^/.]+$/, '').replace(/^sample_/, '');
        const obsId = `OBS-${cleanFrame}-${d.detection_index + 1}`;
        if (!firstObsId) firstObsId = obsId;

        const observation = {
          id: obsId,
          name: d.class_name === 'fishing_net' ? `Ghost Gillnet (${cleanFrame})` : `Rope Line (${cleanFrame})`,
          typeName: d.class_name === 'fishing_net' ? 'Ghost Netting' : 'Mooring / Tow Line',
          class_name: d.class_name,
          confidence: d.confidence,
          confidencePercent: +(d.confidence * 100).toFixed(1),
          bbox_xyxy: d.bbox_xyxy,
          segmentation_polygon: d.segmentation_polygon || [],
          has_mask: d.has_mask,
          imageFilename: activeFrameId || 'uploaded_frame.jpg',
          rawImage: rawPreviewUrl,
          annotatedImage: annotatedPreviewUrl,
          image: annotatedPreviewUrl || rawPreviewUrl,
          reviewStatus: currentStatus, // Requirement 3: update review status correctly
          notes,
          timestamp: new Date().toISOString(),
          hasGps: false, // Requirement 6: NEVER fabricate coordinates from an image!
          coords: null,
          utmCoords: 'Uncalibrated (No GPS Payload)',
          depth: 'Unavailable (Requires depth sensor)',
          currentDrift: 'Requires GPS & Hydrodynamic Ingest',
          riskScore: Math.round(d.confidence * (d.class_name === 'fishing_net' ? 90 : 75)),
          severity: d.confidence > 0.8 ? 'critical' : d.confidence > 0.5 ? 'high' : 'medium',
          estArea: `${Math.round(Math.abs(d.bbox_xyxy[2] - d.bbox_xyxy[0]) * Math.abs(d.bbox_xyxy[3] - d.bbox_xyxy[1]))} px²`,
          sector: 'Unlocated Ingestion (Pending Calibration)',
          warning: `Visual detection from YOLOv8-seg. Status: ${currentStatus.toUpperCase()}. Awaiting spatial georeferencing payload.`,
          isSimulated: false,
          source: `FastAPI YOLOv8-seg (${activeFrameId})`
        };

        addObservation(observation);
      });

      if (firstObsId) {
        setSelectedObservationId(firstObsId);
      }

      setTimeout(() => {
        setIsPushingGis(false);
        setPushedToGis(true);
        showToast('Observations pushed to Ocean Map as unlocated targets (No GPS). Navigating...');
        setTimeout(() => {
          navigate('/ocean-map');
        }, 900);
      }, 600);
      return;
    }

    if (viewMode === 'live' && (!predictionResult || predictionResult.detection_count === 0)) {
      setIsPushingGis(false);
      showToast('No detections in current image to push to Ocean Map.');
      return;
    }

    // Fallback for demo archive mode: sync review status of demo targets
    if (viewMode === 'demo') {
      if (reviewStates['OR-094']) {
        updateObservationReview('OR-2024-094', reviewStates['OR-094']);
      }
      if (reviewStates['OR-089']) {
        updateObservationReview('OR-2024-089', reviewStates['OR-089']);
      }
      setSelectedObservationId('OR-2024-094');

      setTimeout(() => {
        setIsPushingGis(false);
        setPushedToGis(true);
        showToast('Demo target reviews synchronized with Ocean Map. Navigating...');
        setTimeout(() => {
          navigate('/ocean-map');
        }, 900);
      }, 500);
    }
  };

  // Export predictions as GeoJSON / JSON
  const handleExportJson = () => {
    const exportData = {
      source: viewMode === 'live' ? 'FastAPI YOLOv8-seg Inference' : 'Archive Demo Frame',
      image: activeFrameId,
      timestamp: new Date().toISOString(),
      modelInfo: modelInfo || { model: 'YOLOv8s-seg' },
      detections: viewMode === 'live' ? predictionResult?.detections || [] : 'archive_demo_detections',
      notes,
      reviewStates
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `oceanrescue_detection_${activeFrameId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Exported detection annotations as JSON.');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1700px] mx-auto select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in font-mono text-xs">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* 1. TOP CONSOLE HEADER & BACKEND STATUS */}
      <PageHero
        title="AI Detection & Review Pipeline"
        subtitle={`YOLOv8-seg neural baseline for marine debris segmentation, instance classification (fishing_net & rope_line), and human analyst verification.`}
        sector="Sentinel-2 Optical & UAV Airborne Payload Sync"
        badgeText={backendOnline ? 'FASTAPI ENGINE ONLINE' : 'FASTAPI DISCONNECTED'}
        badgeVariant={backendOnline ? 'teal' : 'red'}
        stats={[
          {
            icon: <Server className="w-3.5 h-3.5 text-[#00E5FF]" />,
            label: 'ENDPOINT',
            value: API_BASE_URL,
            highlightColor: 'text-[#00E5FF]'
          },
          {
            icon: <Cpu className="w-3.5 h-3.5 text-[#00D6A3]" />,
            label: 'DEVICE',
            value: modelInfo?.device?.toUpperCase() || 'CPU / PYTORCH',
            highlightColor: 'text-[#00D6A3]'
          },
          {
            icon: <Activity className="w-3.5 h-3.5 text-[#75E6DA]" />,
            label: 'INFERENCE SPEED',
            value: inferenceLatencyMs !== null ? `${inferenceLatencyMs} ms` : 'Standby',
            highlightColor: 'text-[#EAF6FF]'
          }
        ]}
        actions={
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] px-4 py-2.5 rounded-xl font-display text-xs font-semibold tracking-wider transition border border-[#00E5FF]/40 flex items-center gap-2 cursor-pointer shadow-lg"
              title="Upload JPG, JPEG, PNG, or WebP"
            >
              <UploadCloud className="w-4 h-4 text-[#00E5FF]" />
              <span>Upload Image</span>
            </button>

            <button
              onClick={() => {
                if (selectedFile) {
                  executeInference(selectedFile);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={isInferring}
              className="bg-gradient-to-r from-[#00E5FF] to-[#00D6A3] hover:opacity-95 text-[#061522] px-4 py-2.5 rounded-xl font-display text-xs font-bold tracking-wider transition shadow-[0_0_20px_rgba(0,229,255,0.35)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-[#061522] ${isInferring ? 'animate-spin' : ''}`} />
              <span>{isInferring ? 'Inferring...' : 'Run YOLOv8-seg'}</span>
            </button>
          </>
        }
      >
        {/* Backend / Upload Notices if present */}
        {backendError && (
          <div className="p-3 rounded-lg bg-[#FF6B61]/15 border border-[#FF6B61]/40 flex items-start justify-between gap-3 text-xs font-mono text-[#FF6B61]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Backend Notice: {backendError}</span>
            </div>
            <button
              onClick={fetchBackendMetadata}
              className="px-2.5 py-1 rounded bg-[#FF6B61]/25 hover:bg-[#FF6B61]/40 text-white transition cursor-pointer font-bold"
            >
              Retry Connection
            </button>
          </div>
        )}

        {uploadError && (
          <div className="p-3 rounded-lg bg-[#FF6B61]/15 border border-[#FF6B61]/40 flex items-center justify-between gap-2 text-xs font-mono text-[#FF6B61]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Validation Warning: {uploadError}</span>
            </div>
            <button onClick={() => setUploadError(null)} className="text-white hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
      </PageHero>

      {/* 2. TWO-COLUMN WORKSPACE: LEFT CV INSPECTION & RIGHT HUMAN REVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: CV Inspection Canvas & Sensor Playback (Col 8) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Top Image Interaction Bar */}
          <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
            {/* Target Selector Dropdown / Pills */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-0.5 font-mono text-[11px]">
              <span className="text-[#91A9BB] uppercase text-[10px] mr-1">Input Source:</span>

              {/* Uploaded File Pill (if active) */}
              {selectedFile && (
                <button
                  onClick={() => setViewMode('live')}
                  className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                    viewMode === 'live' && activeFrameId === selectedFile.name
                      ? 'bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm'
                      : 'bg-[#071D33] text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  <FileImage className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>{selectedFile.name} (Uploaded)</span>
                </button>
              )}

              {/* 1-Click Real Dataset Samples */}
              <button
                onClick={() => handleLoadSample('/samples/sample_rope_line.jpg', 'vid_000003_frame10.jpg')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  activeFrameId === 'vid_000003_frame10.jpg'
                    ? 'bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm font-semibold'
                    : 'bg-[#071D33] text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
                title="Underwater frame with real rope_line detection"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
                <span>Sample: Rope Line (vid_003)</span>
              </button>

              <button
                onClick={() => handleLoadSample('/samples/sample_clear_seabed.jpg', 'vid_000002_frame23.jpg')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  activeFrameId === 'vid_000002_frame23.jpg'
                    ? 'bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/40 shadow-sm font-semibold'
                    : 'bg-[#071D33] text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
                title="Seabed frame with 0 detections (empty state demo)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" />
                <span>Sample: Clear Seabed (0 Targets)</span>
              </button>

              {/* Demo Archive Frame */}
              <button
                onClick={handleSelectDemoFrame}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  viewMode === 'demo'
                    ? 'bg-[#103B50] text-[#75E6DA] border border-[#75E6DA]/40 shadow-sm font-semibold'
                    : 'bg-[#071D33] text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
              >
                <span>Demo Frame #094 (Archive)</span>
              </button>
            </div>

            {/* Toggles & Opacity HUD */}
            <div className="flex items-center gap-3">
              {/* Output Mode Switcher: Annotated vs Raw */}
              {viewMode === 'live' && annotatedPreviewUrl && (
                <button
                  onClick={() => setShowAnnotated(!showAnnotated)}
                  className={`px-2 py-1 rounded font-mono text-[10px] uppercase font-bold border transition cursor-pointer ${
                    showAnnotated
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50'
                      : 'bg-[#071D33] text-[#91A9BB] border-[#16465A]'
                  }`}
                  title="Toggle between backend-generated OpenCV annotated image and raw image"
                >
                  {showAnnotated ? 'Annotated (FastAPI)' : 'Raw Image'}
                </button>
              )}

              {/* Bbox toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[#91A9BB] hover:text-[#EAF6FF] font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={showBboxes}
                  onChange={(e) => setShowBboxes(e.target.checked)}
                  className="rounded bg-[#071D33] border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>BBoxes</span>
              </label>

              {/* Masks toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer text-[#91A9BB] hover:text-[#EAF6FF] font-mono text-[11px]">
                <input
                  type="checkbox"
                  checked={showMasks}
                  onChange={(e) => setShowMasks(e.target.checked)}
                  className="rounded bg-[#071D33] border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Polygons</span>
              </label>

              {/* Zoom HUD */}
              <div className="flex items-center bg-[#071D33] border border-[#16465A] rounded-lg p-0.5">
                <button
                  onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.1))}
                  className="p-1 text-[#91A9BB] hover:text-[#00E5FF] rounded cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] px-1 text-[#EAF6FF]">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.1))}
                  className="p-1 text-[#91A9BB] hover:text-[#00E5FF] rounded cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-[#91A9BB] hover:text-[#00E5FF] rounded ml-0.5 cursor-pointer"
                  title="Reset Frame"
                >
                  <Target className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Main High-Res Image Viewer with CV Overlays */}
          <div className="relative bg-[#061522] border border-[#16465A] rounded-xl overflow-hidden aspect-[16/10] shadow-2xl group cursor-crosshair">
            {/* Loading Indicator Overlay */}
            {isInferring && (
              <div className="absolute inset-0 bg-[#061522]/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-[#16465A] border-t-[#00E5FF] animate-spin" />
                  <Cpu className="w-6 h-6 text-[#00E5FF] absolute inset-0 m-auto" />
                </div>
                <div className="font-mono text-xs text-[#00E5FF] font-semibold tracking-wider uppercase animate-pulse">
                  Executing YOLOv8-seg Inference on FastAPI (Port 8000)...
                </div>
                <div className="font-mono text-[10px] text-[#91A9BB]">
                  TensorRT FP16 / PyTorch CUDA or CPU execution
                </div>
              </div>
            )}

            {/* Background Image: LIVE ANNOTATED vs LIVE RAW vs DEMO */}
            <div
              className="absolute inset-0 bg-contain bg-no-repeat bg-center transition-transform duration-300 origin-center"
              style={{
                backgroundImage:
                  viewMode === 'live'
                    ? showAnnotated && annotatedPreviewUrl
                      ? `url('${annotatedPreviewUrl}')`
                      : `url('${rawPreviewUrl}')`
                    : `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCOk_WulaRlTiCcQmqsetl9Z8jCCWQ3PMD7KLzrxcdSprKMN-v5fRn69sL_J1kzWNHRUs5OhmkMFtmsmTgevnA0Z_Yp92T4vWOOwhTb1m7w9x7-W_sut9Sf_-w1PhudYQ1ww1hRbrlIxTQr_xnbvA-61LToJXv04ngzJ2PEpIYM1xfuYBuuJblzdbvj0YfGOogbKxz3Yl17mj_b8uBErstX-kRxEqzyWWawWl76UoU7VYhlBGe-tQDI')`,
                transform: `scale(${zoomLevel})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#061522]/60 via-transparent to-[#061522]/20 pointer-events-none" />
            </div>

            {/* Geospatial Overlay Grid & Dimensions */}
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
              <div className="flex items-start justify-between font-mono text-[10px] text-[#75E6DA]/80">
                <div className="flex items-center gap-2 bg-[#061522]/80 backdrop-blur px-2.5 py-1 rounded border border-[#16465A]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" />
                  <span>
                    {viewMode === 'live'
                      ? `LIVE PREDICTION: ${activeFrameId}`
                      : 'UAV 4K RGB SENSOR • 3840×2160 PX • DEMO FRAME'}
                  </span>
                </div>
                <div className="bg-[#061522]/80 backdrop-blur px-2.5 py-1 rounded border border-[#16465A]">
                  <span>
                    {viewMode === 'live'
                      ? 'COORDINATES: None (Not inferred from pixels)'
                      : 'LAT 17°17\'09.6"S LON 178°24\'36.0"E (Demo)'}
                  </span>
                </div>
              </div>

              {/* Center Sight Reticle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <svg className="w-16 h-16 text-[#00E5FF]" fill="none" stroke="currentColor" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" strokeDasharray="3 3" strokeWidth="1" />
                  <line strokeWidth="1" x1="32" x2="32" y1="4" y2="20" />
                  <line strokeWidth="1" x1="32" x2="32" y1="44" y2="60" />
                  <line strokeWidth="1" x1="4" x2="20" y1="32" y2="32" />
                  <line strokeWidth="1" x1="44" x2="60" y1="32" y2="32" />
                </svg>
              </div>

              <div className="flex items-end justify-between font-mono text-[10px] text-[#91A9BB]">
                <div className="bg-[#061522]/80 backdrop-blur px-2.5 py-1 rounded border border-[#16465A] flex items-center gap-3">
                  <span>FRAME: {activeFrameId}</span>
                  <span className="text-[#00D6A3]">
                    {viewMode === 'live'
                      ? `TARGETS: ${predictionResult?.detection_count ?? 0}`
                      : 'TARGETS: 2 (Demo Archive)'}
                  </span>
                </div>
                <div className="bg-[#061522]/80 backdrop-blur px-2.5 py-1 rounded border border-[#16465A] text-[#00E5FF]">
                  <span>ENGINE: YOLOv8-seg (FastAPI)</span>
                </div>
              </div>
            </div>

            {/* DEMO MODE SVG OVERLAYS (Shown only when viewing archive frame #094) */}
            {viewMode === 'demo' && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-300 origin-center"
                style={{ transform: `scale(${zoomLevel})` }}
                preserveAspectRatio="none"
                viewBox="0 0 1000 625"
              >
                {/* Target 1 Polygon */}
                {showMasks && (
                  <polygon
                    points="560,190 620,180 710,210 760,280 740,360 670,390 580,370 540,290 530,220"
                    fill="#00E5FF"
                    fillOpacity="0.25"
                    stroke="#00E5FF"
                    strokeWidth="2"
                  />
                )}
                {showBboxes && (
                  <rect
                    x="520"
                    y="170"
                    width="250"
                    height="230"
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                )}
                {/* Target 2 Path */}
                {showMasks && (
                  <path
                    d="M 240,410 Q 310,380 410,430 T 540,470 T 630,510"
                    fill="none"
                    stroke="#FFB547"
                    strokeWidth="4"
                    opacity="0.6"
                  />
                )}
                {showBboxes && (
                  <rect
                    x="230"
                    y="370"
                    width="410"
                    height="155"
                    fill="none"
                    stroke="#FFB547"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                )}
              </svg>
            )}

            {/* LIVE MODE FLOATING TAGS */}
            {viewMode === 'live' && predictionResult && predictionResult.detection_count > 0 && (
              <div className="absolute top-12 left-6 z-20 pointer-events-auto">
                <div className="bg-[#071D33]/90 border border-[#00E5FF]/60 backdrop-blur px-3 py-1.5 rounded-lg shadow-xl flex items-center gap-2 font-mono text-xs">
                  <span className="w-2 h-2 rounded-full bg-[#00D6A3] animate-pulse" />
                  <span className="text-[#00E5FF] font-bold">
                    FastAPI Detection: {predictionResult.detections[0].class_name} (
                    {(predictionResult.detections[0].confidence * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Upload & Drag-Drop Tile Strip */}
          <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl flex flex-col gap-2.5 shadow-md">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-[#91A9BB] uppercase tracking-wider font-semibold">
                Image Source Carousel &amp; Upload
              </span>
              <span className="text-[#00E5FF]">FastAPI Endpoint: /api/v1/predict</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Tile 1: Rope Line Sample */}
              <div
                onClick={() => handleLoadSample('/samples/sample_rope_line.jpg', 'sample_rope_line.jpg')}
                className={`p-2 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  activeFrameId === 'sample_rope_line.jpg'
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/60'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#00E5FF] font-bold">Sample A</span>
                  <span className="text-[#FFB547]">rope_line</span>
                </div>
                <div className="text-[11px] text-[#EAF6FF] font-mono mt-1 truncate">sample_rope_line.jpg</div>
                <div className="text-[9px] text-[#91A9BB] font-mono mt-0.5">Real Underwater Frame</div>
              </div>

              {/* Tile 2: Clear Seabed Sample */}
              <div
                onClick={() => handleLoadSample('/samples/sample_clear_seabed.jpg', 'sample_clear_seabed.jpg')}
                className={`p-2 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  activeFrameId === 'sample_clear_seabed.jpg'
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/60'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#00E5FF] font-bold">Sample B</span>
                  <span className="text-[#00D6A3]">0 Targets</span>
                </div>
                <div className="text-[11px] text-[#EAF6FF] font-mono mt-1 truncate">sample_clear_seabed.jpg</div>
                <div className="text-[9px] text-[#91A9BB] font-mono mt-0.5">Empty State Verification</div>
              </div>

              {/* Tile 3: Archive Demo Frame */}
              <div
                onClick={handleSelectDemoFrame}
                className={`p-2 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  viewMode === 'demo'
                    ? 'bg-[#103B50] border-[#75E6DA]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/60'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-[#75E6DA] font-bold">Archive Demo</span>
                  <span className="text-[#91A9BB]">Static #094</span>
                </div>
                <div className="text-[11px] text-[#EAF6FF] font-mono mt-1 truncate">Survey_Flight_094.jpg</div>
                <div className="text-[9px] text-[#91A9BB] font-mono mt-0.5">Historical UI Reference</div>
              </div>

              {/* Tile 4: Custom Upload Trigger */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg border border-dashed border-[#00E5FF]/40 bg-[#071D33] hover:bg-[#103B50]/60 transition cursor-pointer flex flex-col items-center justify-center text-center"
              >
                <UploadCloud className="w-5 h-5 text-[#00E5FF]" />
                <span className="font-mono text-[10px] text-[#EAF6FF] mt-1 font-bold">Upload Local File</span>
                <span className="font-mono text-[8px] text-[#91A9BB]">JPG, PNG, WebP (&lt; 20MB)</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Telemetry & Human Review Verification Panel (Col 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Summary Box */}
          <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl shadow-lg">
            <div className="flex items-center justify-between pb-2 bg-[#071D33]/60 rounded px-2.5 py-1.5 border border-[#16465A]/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-display font-semibold text-[#EAF6FF] text-sm">
                  {viewMode === 'live' ? 'FastAPI Prediction Output' : 'Inference Summary (Demo)'}
                </span>
              </div>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold border ${
                  viewMode === 'live'
                    ? predictionResult?.detection_count > 0
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30'
                      : 'bg-[#00D6A3]/20 text-[#00D6A3] border-[#00D6A3]/30'
                    : 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30'
                }`}
              >
                {viewMode === 'live'
                  ? `${predictionResult?.detection_count ?? 0} TARGETS DETECTED`
                  : '2 TARGETS DETECTED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="bg-[#071D33] p-2.5 rounded-lg border border-[#16465A]/60 flex flex-col">
                <span className="font-mono text-[#91A9BB] text-[10px]">AVG MODEL CONFIDENCE</span>
                <span className="font-mono text-[#EAF6FF] text-[20px] font-bold leading-tight mt-1">
                  {viewMode === 'live'
                    ? predictionResult?.detections?.length
                      ? `${(
                          (predictionResult.detections.reduce((acc, d) => acc + d.confidence, 0) /
                            predictionResult.detections.length) *
                          100
                        ).toFixed(1)}%`
                      : 'N/A (0 Targets)'
                    : '91.9%'}
                </span>
                <span className="text-[10px] text-[#00D6A3] mt-0.5 font-mono">
                  {viewMode === 'live'
                    ? `Threshold: ${predictionResult?.confidence_threshold ?? 0.25}`
                    : 'High Certainty (>85%)'}
                </span>
              </div>

              <div className="bg-[#071D33] p-2.5 rounded-lg border border-[#16465A]/60 flex flex-col">
                <span className="font-mono text-[#91A9BB] text-[10px]">GEOLOCATION INFERENCE</span>
                <span className="font-mono text-[#91A9BB] text-[14px] font-bold leading-tight mt-1">
                  NONE
                </span>
                <span className="text-[10px] text-[#91A9BB] mt-0.5 font-mono">Not inferred from pixels</span>
              </div>
            </div>
          </div>

          {/* DYNAMIC REAL DETECTIONS SECTION (LIVE MODE) */}
          {viewMode === 'live' && predictionResult && (
            <>
              {predictionResult.detection_count === 0 ? (
                /* Empty state when 0 targets detected */
                <div className="bg-[#0B2638] border border-[#16465A] p-6 rounded-xl shadow-lg flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#00D6A3]/10 border border-[#00D6A3]/40 flex items-center justify-center text-[#00D6A3]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#EAF6FF]">
                      Zero ALDFG Targets Detected
                    </h3>
                    <p className="text-xs text-[#91A9BB] font-mono mt-1 max-w-xs leading-relaxed">
                      The YOLOv8-seg model evaluated this image against classes &quot;fishing_net&quot; and &quot;rope_line&quot; and found no candidate debris above the confidence threshold ({predictionResult.confidence_threshold || 0.25}).
                    </p>
                  </div>
                  <div className="font-mono text-[10px] text-[#00D6A3] bg-[#071D33] px-3 py-1.5 rounded-lg border border-[#16465A]">
                    Standard Nominal Water / Non-Debris Seabed
                  </div>
                </div>
              ) : (
                /* Real detection cards */
                predictionResult.detections.map((d, idx) => {
                  const targetKey = `LIVE-${d.detection_index}`;
                  const isConfirmed = reviewStates[targetKey] === 'confirmed';
                  const isRejected = reviewStates[targetKey] === 'rejected';
                  const isFlagged = reviewStates[targetKey] === 'flagged';

                  return (
                    <div
                      key={targetKey}
                      className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl shadow-lg flex flex-col gap-3 relative overflow-hidden"
                    >
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          d.class_name === 'fishing_net' ? 'bg-[#00E5FF]' : 'bg-[#FFB547]'
                        }`}
                      />
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono px-2 py-0.5 rounded font-bold text-[10px] border ${
                              d.class_name === 'fishing_net'
                                ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40'
                                : 'bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/40'
                            }`}
                          >
                            TARGET #{idx + 1}: {d.class_name.toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono text-[#91A9BB] text-[10px]">
                          Class ID: {d.class_id}
                        </span>
                      </div>

                      {/* Confidence Gauge Bar */}
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-[#91A9BB]">Model Confidence</span>
                          <span className="text-[#00E5FF] font-bold">
                            {(d.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00E5FF] h-full rounded-full transition-all duration-500"
                            style={{ width: `${(d.confidence * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>

                      {/* Telemetry Data Grid */}
                      <div className="bg-[#071D33] p-2.5 rounded-lg grid grid-cols-2 gap-y-2 gap-x-3 font-mono text-[11px] border border-[#16465A]/50">
                        <div>
                          <span className="text-[#91A9BB] text-[10px] block">BOUNDING BOX (PX)</span>
                          <span className="text-[#EAF6FF]">
                            [{d.bbox_xyxy.map((v) => Math.round(v)).join(', ')}]
                          </span>
                        </div>
                        <div>
                          <span className="text-[#91A9BB] text-[10px] block">MASK GEOMETRY</span>
                          <span className="text-[#00D6A3] font-semibold">
                            {d.has_mask ? `${d.segmentation_polygon.length} polygon pts` : 'None (BBox only)'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[#91A9BB] text-[10px] block">GEOLOCATION</span>
                          <span className="text-[#91A9BB] text-[10px]">
                            None (Not inferred from image pixels alone)
                          </span>
                        </div>
                      </div>

                      {/* Review State and Actions */}
                      <div className="pt-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-[#91A9BB] uppercase">Human Review Status:</span>
                          <span className="text-[#FFB547] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547] animate-pulse" />
                            {isConfirmed
                              ? 'VERIFIED'
                              : isRejected
                              ? 'REJECTED'
                              : isFlagged
                              ? 'FLAGGED'
                              : 'PENDING VERIFICATION'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            onClick={() => handleAction(targetKey, 'confirmed')}
                            className={`px-2 py-1.5 rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                              isConfirmed
                                ? 'bg-[#00D6A3] text-[#061522]'
                                : 'bg-[#00D6A3]/20 hover:bg-[#00D6A3] text-[#00D6A3] hover:text-[#061522]'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                          <button
                            onClick={() => handleAction(targetKey, 'rejected')}
                            className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                              isRejected
                                ? 'bg-[#FF6B61] text-white'
                                : 'bg-[#103B50] hover:bg-[#16465A] text-[#91A9BB] hover:text-[#EAF6FF]'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                          <button
                            onClick={() => handleAction(targetKey, 'flagged')}
                            className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                              isFlagged
                                ? 'bg-[#FFB547] text-[#061522]'
                                : 'bg-[#103B50] hover:bg-[#16465A] text-[#FFB547]'
                            }`}
                          >
                            <Flag className="w-3.5 h-3.5" />
                            <span>Flag</span>
                          </button>
                        </div>

                        {/* Navigation link to Detection Details */}
                        <div className="pt-1 border-t border-[#16465A] text-right">
                          <button
                            onClick={() => {
                              const cleanFrame = (activeFrameId || 'frame').replace(/\.[^/.]+$/, '').replace(/^sample_/, '');
                              const obsId = `OBS-${cleanFrame}-${d.detection_index + 1}`;
                              navigate('/detection-details', {
                                state: {
                                  detection: d,
                                  obsId,
                                  annotatedImage: annotatedPreviewUrl,
                                  rawImage: rawPreviewUrl,
                                  disclaimer: predictionResult.disclaimer,
                                  reviewStatus: reviewStates[targetKey] || 'pending',
                                  imageFilename: activeFrameId,
                                  notes,
                                },
                              });
                            }}
                            className="font-mono text-[11px] text-[#00E5FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect in Detection Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* FALLBACK DEMO CARDS (Shown only in DEMO mode) */}
          {viewMode === 'demo' && (
            <>
              {/* TARGET CARD 1: Fishing Net */}
              <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl shadow-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF]" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-[#00E5FF]/20 text-[#00E5FF] px-2 py-0.5 rounded font-bold text-[10px] border border-[#00E5FF]/40">
                      TARGET #1 [DEMO]
                    </span>
                    <Link
                      to="/detection-details"
                      className="font-mono text-[#EAF6FF] text-xs font-bold hover:text-[#00E5FF] underline"
                    >
                      #OR-094
                    </Link>
                  </div>
                  <span className="font-mono text-[#91A9BB] text-[10px]">Class: fishing_net</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#91A9BB]">Model Confidence</span>
                    <span className="text-[#00E5FF] font-bold">94.2%</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: '94.2%' }} />
                  </div>
                </div>

                <div className="bg-[#071D33] p-2.5 rounded-lg grid grid-cols-2 gap-y-2 gap-x-3 font-mono text-[11px] border border-[#16465A]/50">
                  <div>
                    <span className="text-[#91A9BB] text-[10px] block">BOUNDING BOX</span>
                    <span className="text-[#EAF6FF]">[1420, 830, 410, 290]</span>
                  </div>
                  <div>
                    <span className="text-[#91A9BB] text-[10px] block">SURFACE AREA</span>
                    <span className="text-[#00E5FF] font-semibold">14.8 m² est.</span>
                  </div>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleAction('OR-094', 'confirmed')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-094'] === 'confirmed'
                          ? 'bg-[#00D6A3] text-[#061522]'
                          : 'bg-[#00D6A3]/20 hover:bg-[#00D6A3] text-[#00D6A3] hover:text-[#061522]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleAction('OR-094', 'rejected')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-094'] === 'rejected'
                          ? 'bg-[#FF6B61] text-white'
                          : 'bg-[#103B50] hover:bg-[#16465A] text-[#91A9BB]'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction('OR-094', 'flagged')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-094'] === 'flagged'
                          ? 'bg-[#FFB547] text-[#061522]'
                          : 'bg-[#103B50] hover:bg-[#16465A] text-[#FFB547]'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Flag</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#16465A] text-right">
                    <button
                      onClick={() =>
                        navigate('/detection-details', {
                          state: {
                            isDemo: true,
                            detection: {
                              detection_index: 0,
                              class_id: 0,
                              class_name: 'fishing_net',
                              confidence: 0.942,
                              bbox_xyxy: [1420, 830, 1830, 1120],
                              segmentation_polygon: [],
                              has_mask: false,
                            },
                          },
                        })
                      }
                      className="font-mono text-[11px] text-[#00E5FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect in Detection Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* TARGET CARD 2: Rope Line */}
              <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl shadow-lg flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFB547]" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono bg-[#FFB547]/20 text-[#FFB547] px-2 py-0.5 rounded font-bold text-[10px] border border-[#FFB547]/40">
                      TARGET #2 [DEMO]
                    </span>
                    <span className="font-mono text-[#EAF6FF] text-xs font-semibold">#OR-089</span>
                  </div>
                  <span className="font-mono text-[#91A9BB] text-[10px]">Class: rope_line</span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-[#91A9BB]">Model Confidence</span>
                    <span className="text-[#FFB547] font-bold">89.6%</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#FFB547] h-full rounded-full" style={{ width: '89.6%' }} />
                  </div>
                </div>

                <div className="bg-[#071D33] p-2.5 rounded-lg grid grid-cols-2 gap-y-2 gap-x-3 font-mono text-[11px] border border-[#16465A]/50">
                  <div>
                    <span className="text-[#91A9BB] text-[10px] block">BOUNDING BOX</span>
                    <span className="text-[#EAF6FF]">[980, 1240, 620, 110]</span>
                  </div>
                  <div>
                    <span className="text-[#91A9BB] text-[10px] block">LENGTH ESTIMATE</span>
                    <span className="text-[#FFB547] font-semibold">~82.4 meters</span>
                  </div>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleAction('OR-089', 'confirmed')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-089'] === 'confirmed'
                          ? 'bg-[#00D6A3] text-[#061522]'
                          : 'bg-[#00D6A3]/20 hover:bg-[#00D6A3] text-[#00D6A3] hover:text-[#061522]'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => handleAction('OR-089', 'rejected')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-089'] === 'rejected'
                          ? 'bg-[#FF6B61] text-white'
                          : 'bg-[#103B50] hover:bg-[#16465A] text-[#91A9BB]'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction('OR-089', 'flagged')}
                      className={`px-2 py-1.5 rounded font-mono text-[11px] flex items-center justify-center gap-1 transition cursor-pointer ${
                        reviewStates['OR-089'] === 'flagged'
                          ? 'bg-[#FFB547] text-[#061522]'
                          : 'bg-[#103B50] hover:bg-[#16465A] text-[#FFB547]'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Flag</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-[#16465A] text-right">
                    <button
                      onClick={() =>
                        navigate('/detection-details', {
                          state: {
                            isDemo: true,
                            detection: {
                              detection_index: 1,
                              class_id: 1,
                              class_name: 'rope_line',
                              confidence: 0.896,
                              bbox_xyxy: [980, 1240, 1600, 1350],
                              segmentation_polygon: [],
                              has_mask: false,
                            },
                          },
                        })
                      }
                      className="font-mono text-[11px] text-[#FFB547] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect in Detection Details</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Human Analyst Annotation & Dispatch Section */}
          <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-xs text-[#EAF6FF]">Analyst Field Notes</span>
              <span className="font-mono text-[10px] text-[#91A9BB]">Operator: CE-Lead</span>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Annotate reef context, depth hazards, or recovery equipment recommendations..."
              className="w-full bg-[#071D33] border border-[#16465A] rounded-lg p-2.5 text-xs text-[#EAF6FF] placeholder-[#91A9BB]/50 focus:outline-none focus:border-[#00E5FF] resize-none font-mono"
            />

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handlePushToGis}
                disabled={isPushingGis}
                className={`w-full py-2.5 rounded-lg font-display text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                  pushedToGis
                    ? 'bg-[#00D6A3] text-[#061522] font-bold'
                    : 'bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] font-bold shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                }`}
              >
                {isPushingGis ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synchronizing Shared Observations...</span>
                  </>
                ) : pushedToGis ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Pushed to Ocean Map • Redirecting...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Commit Review &amp; Push to Ocean Map</span>
                  </>
                )}
              </button>

              <Link
                to="/ocean-map"
                className="w-full bg-[#103B50] hover:bg-[#16465A] text-[#75E6DA] py-2 rounded-lg font-mono text-[11px] flex items-center justify-center gap-2 transition border border-[#16465A] cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>View Observations on Ocean Map →</span>
              </Link>

              <button
                onClick={handleExportJson}
                className="w-full bg-[#071D33] hover:bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF] py-2 rounded-lg font-mono text-[11px] flex items-center justify-center gap-2 transition border border-[#16465A]/60 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Export YOLOv8 JSON Labels (.json)</span>
              </button>
            </div>
          </div>

          {/* Backend Disclaimer & Academic Notice */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#00D6A3] shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-mono text-[#EAF6FF] text-[10px] font-bold">FastAPI Baseline Disclaimer</span>
              <p className="text-[11px] text-[#91A9BB] leading-tight mt-0.5 font-mono">
                {predictionResult?.disclaimer ||
                  'Detections are visual candidate predictions from preliminary YOLOv8-seg. Geographic coordinates are never inferred from image pixels alone. Ground-truth review required.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiDetectionReview;
