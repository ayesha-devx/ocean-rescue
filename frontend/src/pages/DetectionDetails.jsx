import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  Clock,
  Plane,
  CheckCircle,
  Flag,
  XCircle,
  PlusCircle,
  Compass,
  Cpu,
  MapPin,
  Map,
  Send,
  AlertTriangle,
  RotateCcw,
  History,
  FileCheck,
  ArrowRight,
  Info,
  ShieldCheck,
  Activity
} from 'lucide-react';

export const DetectionDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { observations, selectedObservation, updateObservationReview } = useObservations();

  const routeDetection = location.state?.detection;
  const routeObsId = location.state?.obsId;

  // Resolve active observation from:
  // 1. Matched observation by routeObsId in shared store
  // 2. Synthesized object from routeDetection
  // 3. Current selectedObservation from ObservationContext
  // 4. Fallback to first demo observation (OR-2024-094)
  const activeObs =
    (routeObsId && observations.find((o) => o.id === routeObsId)) ||
    (routeDetection && {
      id: routeObsId || (routeDetection.id ?? `#DET-LIVE-${(routeDetection.detection_index ?? 0) + 1}`),
      class_name: routeDetection.class_name || 'fishing_net',
      confidence: routeDetection.confidence,
      confidencePercent: routeDetection.confidence != null ? +(routeDetection.confidence * 100).toFixed(1) : 94.2,
      bbox_xyxy: routeDetection.bbox_xyxy,
      segmentation_polygon: routeDetection.segmentation_polygon,
      has_mask: routeDetection.has_mask,
      hasGps: false,
      coords: null,
      reviewStatus: location.state?.reviewStatus || 'pending',
      annotatedImage: location.state?.annotatedImage,
      rawImage: location.state?.rawImage,
      imageFilename: location.state?.imageFilename || routeDetection.imageFilename,
      isSimulated: false,
      timestamp: new Date().toISOString(),
    }) ||
    selectedObservation ||
    observations[0];

  const isLive = activeObs && !activeObs.isSimulated;
  const isDemo = !isLive;

  // Aliases for forensic and telemetry sections
  const realDetection = isLive ? activeObs : (routeDetection || null);
  const realAnnotatedImage = activeObs?.annotatedImage || location.state?.annotatedImage || null;
  const realRawImage = activeObs?.rawImage || location.state?.rawImage || null;

  // HUD interaction toggles
  const [maskActive, setMaskActive] = useState(true);
  const [bboxActive, setBboxActive] = useState(true);
  const [causticActive, setCausticActive] = useState(false);
  const [maskOpacity, setMaskOpacity] = useState(85);
  const [activePass, setActivePass] = useState(3);
  const [reviewState, setReviewState] = useState(activeObs?.reviewStatus || 'pending');
  const [missionAdded, setMissionAdded] = useState(false);

  // Sync reviewState when activeObs changes
  useEffect(() => {
    if (activeObs?.reviewStatus) {
      setReviewState(activeObs.reviewStatus);
    }
  }, [activeObs?.id, activeObs?.reviewStatus]);

  const handleReviewAction = (status) => {
    setReviewState(status);
    if (activeObs?.id) {
      updateObservationReview(activeObs.id, status);
    }
  };

  const targetId = activeObs?.id?.startsWith('#') ? activeObs.id : `#${activeObs?.id || 'OR-2024-094'}`;
  const className = activeObs?.class_name || 'fishing_net';
  const confidenceScore =
    activeObs?.confidencePercent != null
      ? activeObs.confidencePercent
      : activeObs?.confidence != null
      ? (activeObs.confidence * 100).toFixed(1)
      : '94.2';

  // Area calculation in pixels (never fake physical m² from uncalibrated 2D pixels alone)
  const pixelFootprint = activeObs?.bbox_xyxy
    ? Math.round(
        Math.abs(activeObs.bbox_xyxy[2] - activeObs.bbox_xyxy[0]) *
        Math.abs(activeObs.bbox_xyxy[3] - activeObs.bbox_xyxy[1])
      )
    : null;

  const displayImage =
    activeObs?.annotatedImage ||
    activeObs?.image ||
    activeObs?.rawImage ||
    location.state?.annotatedImage ||
    location.state?.rawImage ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDTFeEMAeZTVM6fy0sT6Rx5sTjgCLEhITyePsDwchT8WiOsDn_lAM8k_IRQ2_QEcknPAf9afM72V81Y8RwSf_K9E0zaM1dtJlCGRxh5r_SNDOgetXjEeIFLpWO74DROj1JXVLlXuaWHoYU3VNkDjQtQ2KeoIujvSn8BmvN5gXORz9Oi9LZ-CshQ28RD3q-51Fm0kqFczVnyVvCmDycFr_TsKOAKAt6eEAZbuHihP7fW_tQbnl40Hpsj";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1700px] mx-auto select-none font-sans">
      {/* Informational banner when viewing demo baseline archive */}
      {isDemo && (
        <div className="bg-[#0B2638] border border-[#00E5FF]/40 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-lg">
          <div className="flex items-center gap-2.5 text-[#75E6DA]">
            <Info className="w-4 h-4 text-[#00E5FF] shrink-0" />
            <span>
              <strong className="text-[#00E5FF]">ARCHIVE REFERENCE (DEMO FRAME {targetId})</strong> — Displaying static reference archive dataset. To inspect live YOLOv8-seg predictions, run inference from AI Detection Review.
            </span>
          </div>
          <Link
            to="/ai-detection"
            className="text-[#00E5FF] hover:underline flex items-center gap-1 shrink-0 font-bold self-end sm:self-auto"
          >
            <span>Open AI Detection Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* 1. TOP FORENSIC BANNER / TACTICAL STATUS STRIP */}
      <PageHero
        title={`Target Analysis Dossier — ${targetId}`}
        subtitle={`${className === 'fishing_net' ? 'Ghost Gillnet (~45m span)' : 'Synthetic Mooring Line'} • Confidence: ${confidenceScore}% • Target verification and forensic audit breakdown.`}
        sector="Tavaru Reef Reserve Marine Sector"
        badgeText={isLive ? 'FASTAPI LIVE DETECTION' : 'ARCHIVE REFERENCE TARGET'}
        badgeVariant={isLive ? 'teal' : 'cyan'}
        stats={[
          {
            icon: <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />,
            label: 'CLASSIFICATION',
            value: className,
            highlightColor: 'text-[#00E5FF]'
          },
          {
            icon: <ShieldCheck className="w-3.5 h-3.5 text-[#00D6A3]" />,
            label: 'CONFIDENCE',
            value: `${confidenceScore}%`,
            highlightColor: 'text-[#00D6A3]'
          },
          {
            icon: <FileCheck className="w-3.5 h-3.5 text-[#FFB547]" />,
            label: 'VERIFICATION',
            value: reviewState.toUpperCase(),
            highlightColor: reviewState === 'confirmed' ? 'text-[#00D6A3]' : 'text-[#FFB547]'
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleReviewAction('confirmed')}
              title="Confirm detection (Updates review status in session store)"
              className={`px-3.5 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                reviewState === 'confirmed'
                  ? 'bg-[#00D6A3] text-[#061522]'
                  : 'bg-[#00D6A3]/20 hover:bg-[#00D6A3] text-[#00D6A3] hover:text-[#061522] border border-[#00D6A3]/40'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{reviewState === 'confirmed' ? 'Verified' : 'Confirm'}</span>
            </button>

            <button
              onClick={() => handleReviewAction('flagged')}
              title="Flag anomaly in current session store"
              className={`px-3.5 py-2 rounded-xl font-display text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                reviewState === 'flagged'
                  ? 'bg-[#FFB547] text-[#061522]'
                  : 'bg-[#103B50] hover:bg-[#16465A] text-[#FFB547] border border-[#FFB547]/30'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>{reviewState === 'flagged' ? 'Flagged' : 'Flag'}</span>
            </button>

            <button
              onClick={() => handleReviewAction('rejected')}
              title="Dismiss detection in current session store"
              className={`px-3.5 py-2 rounded-xl font-display text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                reviewState === 'rejected'
                  ? 'bg-[#FF6B61] text-white'
                  : 'bg-[#FF6B61]/20 hover:bg-[#FF6B61] text-[#FF6B61] hover:text-white border border-[#FF6B61]/40'
              }`}
            >
              <XCircle className="w-4 h-4" />
              <span>{reviewState === 'rejected' ? 'Dismissed' : 'Reject'}</span>
            </button>

            {missionAdded ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMissionAdded(false)}
                  className="px-3.5 py-2 rounded-xl font-display text-xs font-bold uppercase bg-[#00D6A3] text-[#061522] flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Click to remove from session queue"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>In Queue</span>
                </button>
                <button
                  onClick={() =>
                    navigate('/recovery-planning', {
                      state: {
                        detection: activeObs,
                        targetId: targetId,
                        source: isLive ? 'live-detection' : 'demo-detection',
                      },
                    })
                  }
                  className="px-3 py-2 rounded-xl font-display text-xs font-bold uppercase bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] flex items-center gap-1.5 cursor-pointer transition shadow-[0_0_15px_rgba(0,229,255,0.3)]"
                >
                  <span>Open Planner</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setMissionAdded(true)}
                className="px-4 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add to Recovery Queue</span>
              </button>
            )}
          </div>
        }
      />

      {/* 2. MAIN MULTI-PANE TACTICAL LAYOUT: 8 COLS INSPECTION / 4 COLS TELEMETRY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Primary Multi-Modal Viewer & Forensic Ledger (Col 8) */}
        <section className="lg:col-span-8 flex flex-col gap-6" data-purpose="forensic-viewport-stack">
          {/* Multi-Modal Image Canvas Container */}
          <div className="bg-[#0B2638] rounded-xl border border-[#16465A] overflow-hidden shadow-2xl relative flex flex-col">
            {/* Canvas Top Toolbar */}
            <div className="px-4 py-2.5 bg-[#071D33] border-b border-[#16465A] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[#00E5FF] uppercase tracking-wider font-bold">
                  Multi-Spectral Optical Telemetry
                </span>
                <span className="text-[#16465A]">•</span>
                <span className="text-[#EAF6FF] font-semibold">
                  {realDetection ? `INGESTION: ${targetId}` : 'STREAM #094-CAM01 (Archive)'}
                </span>
              </div>

              {/* Viewport Interactive HUD Toggles */}
              <div className="flex items-center gap-1 bg-[#061522] p-1 rounded border border-[#16465A]">
                <button
                  onClick={() => setMaskActive(!maskActive)}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    maskActive
                      ? 'bg-[#00E5FF] text-[#061522]'
                      : 'bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${maskActive ? 'bg-[#061522]' : 'bg-[#91A9BB]'}`} />
                  Mask {maskActive ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={() => setBboxActive(!bboxActive)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    bboxActive
                      ? 'bg-[#00E5FF] text-[#061522]'
                      : 'bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  BBox
                </button>

                <button
                  onClick={() => setCausticActive(!causticActive)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                    causticActive
                      ? 'bg-[#00E5FF] text-[#061522]'
                      : 'bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  Caustic Filter
                </button>

                <div className="hidden sm:flex items-center gap-2 px-2 border-l border-[#16465A]">
                  <span className="text-[10px] text-[#91A9BB]">ALPHA</span>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={maskOpacity}
                    onChange={(e) => setMaskOpacity(Number(e.target.value))}
                    className="w-16 accent-[#00E5FF] cursor-pointer"
                  />
                  <span className="text-[#00E5FF] text-[11px] w-8">{maskOpacity}%</span>
                </div>

                <button
                  onClick={() => {
                    setMaskActive(true);
                    setBboxActive(true);
                    setCausticActive(false);
                    setMaskOpacity(85);
                  }}
                  className="p-1 rounded text-[#91A9BB] hover:text-[#00E5FF] cursor-pointer"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* The Primary Visual Scrim & Image Canvas */}
            <div className="relative w-full aspect-[16/10] bg-[#020b12] overflow-hidden select-none group">
              {/* Image Preview */}
              <img
                src={displayImage}
                alt={className}
                className={`w-full h-full object-contain bg-[#020b12] transition-all duration-700 ${
                  causticActive ? 'contrast-125 saturate-150 brightness-95' : ''
                }`}
              />

              {/* Tactical HUD Reticle & Overlay (SVG Layer) */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-200"
                viewBox="0 0 1000 625"
                fill="none"
              >
                <defs>
                  <pattern id="tacticalGridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00E5FF" strokeOpacity="0.12" strokeWidth="0.4" />
                  </pattern>
                </defs>

                {/* Tactical Grid */}
                <rect width="1000" height="625" fill="url(#tacticalGridPattern)" />

                {/* Corner HUD L-Frames */}
                <path d="M 20 40 L 20 20 L 40 20" stroke="#00E5FF" strokeOpacity="0.6" strokeWidth="2" />
                <path d="M 980 40 L 980 20 L 960 20" stroke="#00E5FF" strokeOpacity="0.6" strokeWidth="2" />
                <path d="M 20 585 L 20 605 L 40 605" stroke="#00E5FF" strokeOpacity="0.6" strokeWidth="2" />
                <path d="M 980 585 L 980 605 L 960 605" stroke="#00E5FF" strokeOpacity="0.6" strokeWidth="2" />

                {/* Autonomous Target Crosshair Reticle (Rotating) */}
                <g className="animate-spin origin-[680px_240px]" style={{ animationDuration: '24s' }}>
                  <circle cx="680" cy="240" r="48" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="8 6" opacity="0.6" />
                  <circle cx="680" cy="240" r="54" stroke="#75E6DA" strokeWidth="0.8" opacity="0.3" />
                </g>
                <line x1="660" y1="240" x2="700" y2="240" stroke="#00E5FF" strokeWidth="1.5" />
                <line x1="680" y1="220" x2="680" y2="260" stroke="#00E5FF" strokeWidth="1.5" />

                {/* Machine Learning Bounding Box (Only rendered if no pre-annotated image from backend) */}
                {!activeObs?.annotatedImage && bboxActive && (
                  <g>
                    <rect x="310" y="295" width="585" height="260" rx="4" fill="none" stroke="#00E5FF" strokeOpacity="0.9" strokeWidth="1.5" />
                    <rect x="310" y="273" width="220" height="22" rx="2" fill="#00E5FF" fillOpacity="0.95" />
                    <text x="316" y="288" fill="#061522" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700">
                      TARGET: {className.toUpperCase()} {confidenceScore}%
                    </text>
                  </g>
                )}
              </svg>

              {/* Floating Tactical HUD Readout Cards over Video Feed */}
              <div className="absolute top-4 left-4 p-2.5 bg-[#061522]/90 backdrop-blur-md rounded-lg shadow-xl flex flex-col gap-1 font-mono text-xs border border-[#16465A] max-w-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                  <span className="text-[#00E5FF] font-semibold">
                    {targetId}: {className.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-[#91A9BB] leading-tight">
                  {activeObs?.hasGps && activeObs.coords ? (
                    <span>{activeObs.coords} {activeObs.isSimulated ? '[SIMULATED DEMO DATA]' : ''}</span>
                  ) : (
                    <span className="text-[#FF6B61]">
                      Coordinates Unavailable — Not inferred from image pixels alone. GPS/telemetry required.
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#75E6DA] pt-1 border-t border-[#16465A]/50">
                  <span>
                    BBOX: {activeObs?.bbox_xyxy ? `[${activeObs.bbox_xyxy.map((v) => Math.round(v)).join(', ')}]` : '[1420, 830, 410, 290]'}
                  </span>
                  <span>
                    {isLive
                      ? activeObs?.has_mask
                        ? `${activeObs.segmentation_polygon?.length || 0} pts polygon`
                        : 'BBox only'
                      : 'EST AREA: 14.8 m² [DEMO]'}
                  </span>
                </div>
              </div>

              {/* Bottom Left Status Badges */}
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                <span className="px-2.5 py-1 rounded bg-[#061522]/85 backdrop-blur text-[#00E5FF] font-mono text-xs border border-[#00E5FF]/30">
                  {isLive ? 'POLYMER: SENSOR PAYLOAD REQUIRED' : 'MESH GAUGE: 120mm MONOFILAMENT [SIMULATED DEMO DATA]'}
                </span>
                <span className="px-2.5 py-1 rounded bg-[#061522]/85 backdrop-blur text-[#FFB547] font-mono text-xs border border-[#FFB547]/30 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {isLive ? 'VISUAL ANOMALY DETECTED' : 'REEF ENTANGLEMENT [SIMULATED DEMO DATA]'}
                </span>
              </div>

              {/* Bottom Right TensorRT Badge */}
              <div className="absolute bottom-4 right-4 bg-[#061522]/85 backdrop-blur-md rounded-lg p-2 font-mono text-[10px] text-[#91A9BB] text-right hidden sm:block border border-[#16465A]">
                <span className="text-[#00D6A3] font-bold">
                  {isLive ? 'YOLOv8-seg Live OpenCV Output' : 'CUDA TensorRT FP16 (Demo)'}
                </span><br />
                {isLive ? 'Live 2D Image Inference' : 'Inference: 14.2ms • GSD: 1.2cm'}
              </div>
            </div>

            {/* Frame Calibration Micro-bar */}
            <div className="p-3 bg-[#071D33] border-t border-[#16465A] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-[#91A9BB]">
              <div className="flex items-center gap-2">
                <span className="text-[#EAF6FF] font-semibold">
                  {isLive ? 'INPUT BAND:' : 'SPECTRAL CHANNELS:'}
                </span>
                <span className="px-2 py-0.5 rounded bg-[#103B50] text-[#00E5FF] border border-[#16465A]">
                  {isLive ? 'RGB 3-CHANNEL OPTICAL' : 'RGB + NIR-850nm [SIMULATED DEMO DATA]'}
                </span>
                {!isLive && (
                  <span className="px-2 py-0.5 rounded bg-[#103B50] text-[#EAF6FF] border border-[#16465A]">
                    CHL-A FLUOR
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[11px]">
                {isLive ? (
                  <span className="text-[#91A9BB] italic">
                    External optical calibration &amp; SNR telemetry unavailable in image payload
                  </span>
                ) : (
                  <>
                    <span>SNR: <strong className="text-[#00D6A3]">28.4 dB [SIMULATED]</strong></span>
                    <span>POLARIZATION: <strong className="text-[#00E5FF]">LINEAR 45° [SIMULATED]</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub-panel: Multi-Frame Temporal Chrono-Comparison Sequence */}
          <div className="bg-[#0B2638] rounded-xl p-5 border border-[#16465A] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold text-sm text-[#EAF6FF] flex items-center gap-2">
                    <History className="w-4 h-4 text-[#00E5FF]" />
                    Temporal Sequence Drone Passes
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30 font-bold">
                    SIMULATED DEMO DATA
                  </span>
                </div>
                <p className="text-xs text-[#91A9BB] font-mono mt-0.5">
                  Synthetic multi-pass comparison sequence demonstrating temporal registration workflow (Single-image inference currently active).
                </p>
              </div>
              <span className="font-mono text-xs text-[#00D6A3] bg-[#103B50] px-2.5 py-1 rounded border border-[#16465A]">
                DELTA CONFIDENCE: +2.4% (DEMO)
              </span>
            </div>

            {/* 4 Chrono-Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
              {/* Pass 1 */}
              <div
                onClick={() => setActivePass(1)}
                className={`rounded-lg p-2 flex flex-col gap-1.5 cursor-pointer border transition ${
                  activePass === 1
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/50'
                }`}
              >
                <div className="relative aspect-video rounded overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkOdDwik0x6s4DZLZd5227SkKAa04S3TFFOIWk_fzTOicZsYBHLp-2cQh-LZtfCOq3pFmI6bBt5YjWrjHz-lwA24jwilB9WRu1BSb0HowSruVJCHD8qkxm2HRYxvxDIXcqP-eHbJBCY515RuXaJIlj_n35AlDYNob-yatvRFjil4PpGU2pwQ1KN2IXL2qh8YaSW6jvTH6j0qBXy2wqDdXG17Or0n7w0CQ-wFqKQb-W3GmMM_SeX1bK"
                    alt="Drone Pass 1"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#061522]/80 font-mono text-[9px] text-[#EAF6FF]">
                    PASS 1
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#91A9BB] px-0.5">
                  <span>08:30 UTC</span>
                  <span>81.4%</span>
                </div>
              </div>

              {/* Pass 2 */}
              <div
                onClick={() => setActivePass(2)}
                className={`rounded-lg p-2 flex flex-col gap-1.5 cursor-pointer border transition ${
                  activePass === 2
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/50'
                }`}
              >
                <div className="relative aspect-video rounded overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmNNx3C7tx6boh5lWusia36R-BKKDqDjXGYzl1uNJ-NwBTrsWttbWq2Mg_fKYRX6dBMoS6vLMGfsu_O8uJjZkJlKl6Nl3dCyo_B7lcRdsRhPVHC1bGoWMJcfBthaAjAlxJGp1R1QGcJizCVm2Yadirj0qd8KsfAPdfAaHWE93n7wl6D8TViUJOmmCu41tYtgWIx5k133dpiKAeKgZIx5d8_n6LDh4lheIic1LGYvzgU_RoCtOWKMLF"
                    alt="Drone Pass 2"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#061522]/80 font-mono text-[9px] text-[#EAF6FF]">
                    PASS 2
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#91A9BB] px-0.5">
                  <span>09:45 UTC</span>
                  <span className="text-[#00D6A3]">89.8%</span>
                </div>
              </div>

              {/* Current Pass 3 (Active Focus) */}
              <div
                onClick={() => setActivePass(3)}
                className={`rounded-lg p-2 flex flex-col gap-1.5 cursor-pointer border transition shadow-[0_0_15px_rgba(0,229,255,0.25)] ${
                  activePass === 3
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#00E5FF]/60 hover:bg-[#103B50]/50'
                }`}
              >
                <div className="relative aspect-video rounded overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuC1156F2LeJaV5tHK6rMH9oQRmaKNA_PGo0FtKZtpFMRrPEYFNWqCO3cUZBBmG3rmCOOz-jEWAbRclyyGmJ1JU09AxdxNzzeg8-ex5vC3HY9sZg3A9AjD2Ztl4sS5r59AWZ4CpZB_wyLZ4gZ-n70WV3OYFHpOFG-mmjFnmHFASA9weF_1xC-vo_dUruZmRsHCN9B7i9TsXWVATeiUjMYEDgO_W2yYTJNHo2jesh_7FZYcfzWI3VByKu"
                    alt="Drone Pass 3"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#00E5FF] text-[#061522] font-mono text-[9px] font-bold">
                    CURRENT
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#00E5FF] px-0.5 font-bold">
                  <span>11:18 UTC</span>
                  <span>94.2%</span>
                </div>
              </div>

              {/* Synthetic IR View */}
              <div
                onClick={() => setActivePass(4)}
                className={`rounded-lg p-2 flex flex-col gap-1.5 cursor-pointer border transition ${
                  activePass === 4
                    ? 'bg-[#103B50] border-[#00E5FF]'
                    : 'bg-[#071D33] border-[#16465A] hover:bg-[#103B50]/50'
                }`}
              >
                <div className="relative aspect-video rounded overflow-hidden">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkeSkvU8tLBJ_BgChopOsbpXJUaFMMYbX_5AzHWSHWbQmuncdZd1JiHTJpDLEmDurMzmdvmgP83csT4mrSOVUnjmBfLy_LY3iXhEaiI07fE1nlMMZ4tVKYM8QkWhXuk9eL5LCrhdiTQkdaCMyLv2yP6lddMIY0OZ-OcroOSjqsQ0oqAnfWOnrQZC13jOcyq5iGv0bcn4m7eIZ-9S5E1BjEy_YS1Go9uQ0mg-HME7AafJO14GSziCiN"
                    alt="Synth-IR scan"
                    className="w-full h-full object-cover filter hue-rotate-90"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-[#061522]/80 font-mono text-[9px] text-[#00D6A3]">
                    SYNTH-IR
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-[10px] text-[#91A9BB] px-0.5">
                  <span>ALIGNED</span>
                  <span className="text-[#00D6A3] font-bold">SPEC MATCH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Verification Audit Trail & Forensic Event Ledger */}
          <div className="bg-[#0B2638] rounded-xl p-5 border border-[#16465A] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#00D6A3]" />
                <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  Forensic Telemetry &amp; Ingestion Audit Trail
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30 font-bold">
                SIMULATED DEMO DATA
              </span>
            </div>

            <p className="text-xs text-[#91A9BB] font-mono -mt-2">
              Demonstration event ledger modeling UAV data relay and Lagrangian drift handoff. Live database audit logging requires backend persistence service.
            </p>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#16465A]">
              {/* Event 1 */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#00D6A3] ring-4 ring-[#0B2638]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#00E5FF]">11:18:42 UTC</span>
                    <span className="font-mono text-xs text-[#EAF6FF] font-semibold">Optical Frame Ingestion</span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-0.5 font-mono">
                    Telemetry feed ingested via autonomous UAV Flight #094 optical relay station at 24.2 Mbps.
                  </p>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#00E5FF] ring-4 ring-[#0B2638]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#00E5FF]">11:18:43 UTC</span>
                    <span className="font-mono text-xs text-[#EAF6FF] font-semibold">Inference Engine Execution</span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-0.5 font-mono">
                    YOLOv8s-seg engine completed polygon segmentation in 14.2ms. Net boundary identified.
                  </p>
                </div>
              </div>

              {/* Event 3 */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#75E6DA] ring-4 ring-[#0B2638]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#00E5FF]">11:20:15 UTC</span>
                    <span className="font-mono text-xs text-[#EAF6FF] font-semibold">Lagrangian Hydrodynamic Drift Initialization</span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-0.5 font-mono">
                    Simulated +48h trajectory initialized. Anchor entanglement index: 0.92 (High snag stability).
                  </p>
                </div>
              </div>

              {/* Event 4 */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#FF6B61] ring-4 ring-[#0B2638] animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#FF6B61]">11:22:04 UTC</span>
                    <span className="font-mono text-xs text-[#FF6B61] font-semibold">Critical Threat Index Triggered</span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-0.5 font-mono">
                    Target within 380m of Tavaru Coral Nursery Reserve Zone A. Automatic escalation dispatched.
                  </p>
                </div>
              </div>

              {/* Event 5: Pending Sign-off */}
              <div className="relative flex items-start gap-3">
                <span className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#FFB547] ring-4 ring-[#0B2638]" />
                <div className="min-w-0 flex-1 bg-[#071D33] p-3 rounded-lg border border-[#16465A] flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs text-[#EAF6FF] font-bold uppercase tracking-wider block">
                      Awaiting Marine Biologist Sign-Off
                    </span>
                    <p className="text-xs text-[#91A9BB] font-mono">Review required before dispatching ROV retrieval vessel.</p>
                  </div>
                  <span className="font-mono text-xs text-[#00E5FF] bg-[#103B50] px-2.5 py-1 rounded border border-[#16465A]">
                    QUEUE: P1
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Telemetry & Spatial Context (Col 4) */}
        <aside className="lg:col-span-4 flex flex-col gap-6" data-purpose="telemetry-sidebar">
          {/* Card 1: Geospatial & Hydrodynamic Context */}
          <div className="bg-[#0B2638] rounded-xl p-5 border border-[#16465A] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">Geospatial Context</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30 font-bold">
                SIMULATED DEMO DATA
              </span>
            </div>

            <div className="bg-[#071D33] rounded-lg p-3 flex flex-col gap-2 font-mono text-xs border border-[#16465A]/60">
              <div className="flex flex-col gap-1 pb-1.5 border-b border-[#16465A]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[#91A9BB]">GEOGRAPHIC COORDINATES</span>
                  <span className="text-[#FF6B61] font-semibold text-[11px]">
                    {realDetection ? 'Unavailable' : '17.2860° S, 178.4100° E (Demo)'}
                  </span>
                </div>
                {realDetection && (
                  <p className="text-[10px] text-[#91A9BB] italic leading-tight">
                    Coordinates Unavailable — Not inferred from image pixels alone. GPS/telemetry required.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">BATHYMETRY DEPTH</span>
                <span className="text-[#75E6DA] font-semibold">
                  {realDetection ? 'Unavailable (Sensor Needed)' : '-14.2 m (Shelf Drop - Demo)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">SST (SEA TEMP)</span>
                <span className="text-[#EAF6FF]">
                  {realDetection ? 'Unavailable (Sensor Needed)' : '26.4 °C (Demo)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">CURRENT VECTOR</span>
                <span className="text-[#EAF6FF]">
                  {realDetection ? 'Unavailable (Drift Ingest Needed)' : '1.4 kts @ 165° SSE (Demo)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">SWELL / WAVE (WW3)</span>
                <span className="text-[#EAF6FF]">
                  {realDetection ? 'Unavailable (Buoy Ingest Needed)' : '1.8 m @ 9.0s (Demo)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">TIDAL PHASE</span>
                <span className="text-[#EAF6FF]">
                  {realDetection ? 'Unavailable (Tide Model Needed)' : 'Ebb (-0.4m MLLW) (Demo)'}
                </span>
              </div>
            </div>

            {/* Proximity Callout */}
            <div className="p-3 rounded-lg bg-[#FFB547]/10 border border-[#FFB547]/30 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-[#FFB547] flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-[#FFB547] font-bold uppercase">Sensitive Habitat Proximity</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/40">
                    SIMULATED DEMO DATA
                  </span>
                </div>
                <p className="text-xs text-[#91A9BB] font-mono mt-1 leading-relaxed">
                  {realDetection ? (
                    'True proximity calculation to coral nurseries or marine sanctuaries requires georeferenced spatial anchoring (GPS EXIF or UAV flight telemetry).'
                  ) : (
                    'Demo target is simulated at 380m up-current from Tavaru Marine Reserve Coral Sanctuary Zone A.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: AI Model Provenance & Bounding Metrics */}
          <div className="bg-[#0B2638] rounded-xl p-5 border border-[#16465A] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#00D6A3]" />
                <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">Model Provenance</h3>
              </div>
              <span className="font-mono text-xs text-[#00D6A3] bg-[#103B50] px-2 py-0.5 rounded border border-[#16465A]">
                {isLive ? 'LIVE YOLOv8' : 'ARCHIVE v0.8-SEG'}
              </span>
            </div>

            <div className="space-y-2 font-mono text-xs text-[#91A9BB]">
              <div className="flex items-center justify-between py-1 bg-[#071D33] px-2.5 rounded border border-[#16465A]/40">
                <span>Architecture</span>
                <span className="text-[#00E5FF] font-semibold">YOLOv8s-seg</span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#071D33] px-2.5 rounded border border-[#16465A]/40">
                <span>Runtime Pipeline</span>
                <span className="text-[#EAF6FF]">
                  {isLive ? 'FastAPI Baseline (PyTorch/OpenCV)' : 'TensorRT FP16 (CUDA 12.2 Demo)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#071D33] px-2.5 rounded border border-[#16465A]/40">
                <span>Area Footprint</span>
                <div className="text-right">
                  <span className="text-[#00D6A3] font-bold">
                    {pixelFootprint ? `~${pixelFootprint.toLocaleString()} px²` : 'Unavailable'}
                  </span>
                  <span className="block text-[10px] text-[#91A9BB]">
                    Physical Area: Unavailable without depth/scale calibration
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between py-1 bg-[#071D33] px-2.5 rounded border border-[#16465A]/40">
                <span>Polymer Signature</span>
                <div className="text-right">
                  <span className="text-[#FFB547] text-[11px]">
                    {isLive ? 'Unavailable (Spectrometer Needed)' : 'HDPE / Monofilament (Demo)'}
                  </span>
                  <span className="block text-[10px] text-[#91A9BB]">
                    {isLive ? 'Not inferred by computer vision' : 'Simulated FTIR match 88.1%'}
                  </span>
                </div>
              </div>

              {/* Bounding Coordinates */}
              <div className="bg-[#061522] p-2 rounded text-[10px] text-[#91A9BB] border border-[#16465A]/50">
                <span className="text-[#75E6DA] uppercase block font-semibold mb-0.5">
                  Raw Bounding Box (Pixels)
                </span>
                {activeObs?.bbox_xyxy ? (
                  `[ymin: ${Math.round(activeObs.bbox_xyxy[1])}, xmin: ${Math.round(activeObs.bbox_xyxy[0])}, ymax: ${Math.round(activeObs.bbox_xyxy[3])}, xmax: ${Math.round(activeObs.bbox_xyxy[2])}]`
                ) : (
                  '[ymin: 420, xmin: 310, ymax: 880, xmax: 950] (Demo Reference)'
                )}
              </div>

              {/* Multi-Class Probability Bar Distribution */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#EAF6FF] font-semibold uppercase">
                    {isLive ? 'Live Class Probabilities' : 'Archive Class Probabilities'}
                  </span>
                  <span className="text-[10px] text-[#91A9BB] font-mono">
                    {isLive ? '2 Trained Classes' : 'Demo Record'}
                  </span>
                </div>

                {isLive ? (
                  <>
                    {/* Detected Class (Primary) */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className={`font-semibold ${className === 'fishing_net' ? 'text-[#00E5FF]' : 'text-[#FFB547]'}`}>
                          {className} (Selected Target)
                        </span>
                        <span className={`font-bold ${className === 'fishing_net' ? 'text-[#00E5FF]' : 'text-[#FFB547]'}`}>
                          {confidenceScore}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#103B50] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${className === 'fishing_net' ? 'bg-[#00E5FF]' : 'bg-[#FFB547]'}`}
                          style={{ width: `${Math.min(100, Math.max(5, Number(confidenceScore)))}%` }}
                        />
                      </div>
                    </div>

                    {/* Alternate Trained Class */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#91A9BB]">
                          {className === 'fishing_net' ? 'rope_line' : 'fishing_net'} (Alternate Trained Class)
                        </span>
                        <span className="text-[#91A9BB]">&lt; Threshold (0.25)</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#103B50] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#16465A] rounded-full"
                          style={{ width: `${Math.max(4, Math.min(25, 100 - Number(confidenceScore)))}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-[#91A9BB] font-mono leading-tight pt-1">
                      Trained model classes: <strong className="text-[#00E5FF]">fishing_net (0)</strong> and <strong className="text-[#FFB547]">rope_line (1)</strong>. Nonexistent third-party classes have been purged from this report.
                    </p>
                  </>
                ) : (
                  <>
                    {/* Demo Archive Mode */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#00E5FF] font-semibold">fishing_net (Gillnet)</span>
                        <span className="text-[#00E5FF] font-bold">94.2%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#103B50] rounded-full overflow-hidden">
                        <div className="h-full bg-[#00E5FF] rounded-full" style={{ width: '94.2%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-[#FFB547] font-semibold">rope_line / mooring</span>
                        <span className="text-[#FFB547]">4.6%</span>
                      </div>
                      <div className="w-full h-1.5 bg-[#103B50] rounded-full overflow-hidden">
                        <div className="h-full bg-[#FFB547] rounded-full" style={{ width: '4.6%' }} />
                      </div>
                    </div>

                    <p className="text-[10px] text-[#91A9BB] font-mono leading-tight pt-1">
                      Archive baseline reference detection distribution on Demo Frame #094.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: GIS Location Preview & Mission Dispatch */}
          <div className="bg-[#0B2638] rounded-xl p-5 border border-[#16465A] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">GIS Spatial Preview</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/30 font-bold">
                SIMULATED DEMO DATA
              </span>
            </div>

            {/* Static GIS Map Location Card */}
            <div
              onClick={() => navigate('/ocean-map')}
              className="w-full h-44 bg-cover bg-center rounded-lg relative overflow-hidden shadow-inner group cursor-pointer border border-[#16465A]"
              style={{
                backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDQqE_FKvRSw0HbzeIIilB_qGMYPXU6ZpeR3gIHFBYd8L9hNJV4mxPNTM-PyxG526n-gyyByiKIfQT0TqkSQOYntrWIdxr1y5eyLbZ_yjcq1QsaU-5xEucsSeaxKe77jPu9EhONZ9GISdsbCsYjGTfjCZHk9iICcoqowZxvoAw8rG29w0FOxxUKR6e0w0P4OMcGuD0KdMoL-fQHoz127Uk4Qv_LGfdmSGV-7xyOfmxmyyffE1f9c1Df')`,
              }}
            >
              <div className="absolute inset-0 bg-[#061522]/40 group-hover:bg-[#061522]/20 transition-colors" />

              {/* Reticle at target location */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                <div className="w-8 h-8 rounded-full border-2 border-[#00E5FF] bg-[#00E5FF]/20 flex items-center justify-center animate-ping" />
                <span className="px-2 py-0.5 rounded bg-[#061522]/90 text-[#00E5FF] font-mono text-[10px] -mt-2 shadow-md border border-[#00E5FF]/40">
                  {targetId}
                </span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-[#061522]/85 backdrop-blur px-2.5 py-1 rounded text-[10px] font-mono text-[#91A9BB] border border-[#16465A]">
                <span>HARBOR: 14.8 NM (SIMULATED)</span>
                <span className="text-[#00D6A3]">TRANSIT: 52 MIN</span>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <Link
                to="/ocean-map"
                className="w-full py-2.5 px-3 rounded bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] text-center font-display text-xs font-semibold transition-colors flex items-center justify-center gap-2 border border-[#16465A]"
              >
                <Map className="w-4 h-4 text-[#00E5FF]" />
                <span>Open in Tactical Ocean Map</span>
              </Link>

              <button
                onClick={() => {
                  navigate('/recovery-planning', {
                    state: {
                      detection: activeObs,
                      targetId: targetId,
                      source: isLive ? 'live-detection' : 'demo-detection',
                    },
                  });
                }}
                className="w-full py-2.5 px-3 rounded bg-[#00E5FF] text-[#061522] font-display text-xs font-bold uppercase tracking-wider text-center shadow-lg hover:bg-[#75E6DA] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Dispatch to Recovery Planner</span>
              </button>
              <span className="text-[10px] font-mono text-[#91A9BB] text-center">
                Session workflow • Transfers target context to Recovery Planning
              </span>
            </div>

            {/* Academic Disclaimer Footnote */}
            <div className="p-2.5 rounded bg-[#071D33] text-[11px] text-[#91A9BB] leading-relaxed flex items-start gap-2 border border-[#16465A]/40 font-mono">
              <AlertTriangle className="w-4 h-4 text-[#FFB547] flex-shrink-0 mt-0.5" />
              <span>
                <strong>SCIENTIFIC INTEGRITY NOTICE</strong> — YOLOv8-seg performs visual classification and polygon mask generation. Oceanographic conditions, bathymetry, and geographic coordinates require physical sensor fusion.
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DetectionDetails;
