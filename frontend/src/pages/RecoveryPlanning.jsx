import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  Compass,
  Ship,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  RotateCw,
  Send,
  Info,
  Check,
  ShieldCheck,
  Clock,
  ArrowRight
} from 'lucide-react';

export const RecoveryPlanning = () => {
  const location = useLocation();
  const { observations, selectedObservation } = useObservations();

  const routeDetection = location.state?.detection;
  const routeTargetId = location.state?.targetId;

  const activeObs =
    (routeTargetId && observations.find((o) => o.id === routeTargetId)) ||
    (routeDetection && {
      id: routeTargetId || routeDetection.id || '#OR-2024-094',
      name: routeDetection.class_name === 'fishing_net' ? 'Derelict Fishing Net' : 'Derelict Marine Line',
      coords: routeDetection.hasGps && routeDetection.coords ? routeDetection.coords : null,
      hasGps: Boolean(routeDetection.hasGps && routeDetection.coords),
      riskScore: 92,
      isSimulated: Boolean(routeDetection.isSimulated),
    }) ||
    selectedObservation ||
    observations[0];

  const targetId = activeObs?.id?.startsWith('#') ? activeObs.id : `#${activeObs?.id || 'OR-2024-094'}`;
  const targetName = activeObs?.name || (activeObs?.class_name === 'fishing_net' ? 'Derelict Fishing Net' : 'Mooring Line');
  const isLocated = Boolean(activeObs?.hasGps && activeObs?.coords);
  const targetCoords = isLocated ? activeObs.coords : 'Coordinates Unavailable (Unlocated)';

  // Workflow state: 1 (Draft), 2 (Lead Review), 3 (Authorized), 4 (Dispatched)
  const [workflowStage, setWorkflowStage] = useState(1);
  const [selectedWaypoint, setSelectedWaypoint] = useState('Bravo'); // 'Alpha', 'Bravo', 'Charlie'
  const [activeRouteChannel, setActiveRouteChannel] = useState(1); // 1: Deep Channel, 2: Reef Shortcut
  const [operationTitle, setOperationTitle] = useState('OP-NET-094: Tavaru Acropora Safeguard Salvage');
  const [toastMessage, setToastMessage] = useState(null);

  // Map layer toggles
  const [layers, setLayers] = useState({
    route: true,
    drift: true,
    bathymetry: true,
    sanctuary: true,
  });

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleStageSelect = (stageNum) => {
    setWorkflowStage(stageNum);
    const names = ['Draft Dossier', 'Lead Review', 'Authorized Mission', 'Dispatched to Fleet'];
    showFeedback(`Mission workflow status set to Stage ${stageNum}: ${names[stageNum - 1]}`);
  };

  const handleSubmitAuthorization = () => {
    setWorkflowStage(2);
    showFeedback('Mission dossier #MP-2024-088 successfully submitted for Lead Engineer CE review & authorization!');
  };

  // Waypoints metadata
  const waypointsData = {
    Bravo: {
      name: 'Waypoint Bravo',
      badge: '★ RECOMMENDED',
      feasibility: '94% FEASIBILITY [SIMULATED]',
      transitDist: '16.4 NM',
      transitTime: '1h 12m',
      depth: '38m (Safe)',
      coralMargin: '1.2 NM Clearance',
      desc: 'Outer Reef Cut (+12h Drift)',
      eta: '15:45 UTC',
      isHazard: false
    },
    Alpha: {
      name: 'Waypoint Alpha',
      badge: 'OPTION 2',
      feasibility: '82% FEASIBILITY [SIMULATED]',
      transitDist: '22.1 NM',
      transitTime: '1h 38m',
      depth: '85m (Deep)',
      coralMargin: '4.8 NM (Swell 2.2m)',
      desc: 'Deep Pelagic Shelf (+6h Drift)',
      eta: '16:15 UTC',
      isHazard: false
    },
    Charlie: {
      name: 'Waypoint Charlie',
      badge: 'CRITICAL RISK',
      feasibility: '45% FEASIBILITY [SIMULATED]',
      transitDist: '12.8 NM',
      transitTime: '58m',
      depth: '< 4m (Hazard)',
      coralMargin: 'Imminent Snag',
      desc: 'Lagoon Fringe (+18h Horizon)',
      eta: '15:20 UTC',
      isHazard: true
    }
  };

  const currentWp = waypointsData[selectedWaypoint];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
          <span className="font-mono text-xs">{toastMessage}</span>
        </div>
      )}

      {/* UNLOCATED TARGET ADVISORY STRIP */}
      {!isLocated && (
        <div className="bg-[#0B2638] border border-[#FFB547]/50 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-lg">
          <div className="flex items-center gap-2.5 text-[#FFB547]">
            <AlertTriangle className="w-4 h-4 text-[#FFB547] shrink-0" />
            <span>
              <strong className="text-[#EAF6FF]">UNLOCATED TARGET ({targetId})</strong> — Physical coordinates are unavailable. Recovery waypoint transit and depth margins below are <strong>simulated reference paths</strong> based on Fijian Outer Channel Shoals.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/30 shrink-0 font-bold self-start sm:self-auto">
            SIMULATED ROUTE OPTIMIZATION
          </span>
        </div>
      )}

      {/* 1. ATMOSPHERIC RECOVERY COMMAND HERO */}
      <PageHero
        sector="Lau Basin & Tavaru Sector 4"
        title="Maritime Recovery Route Planner"
        subtitle="Multi-agent vessel routing, ROV intervention readiness, and bathymetric obstacle clearance optimization."
        badgeText="SIMULATED ROUTE MODEL"
        badgeVariant="cyan"
        stats={[
          {
            label: 'TARGET',
            value: targetId,
            highlightColor: 'text-[#00E5FF]',
            icon: <Compass className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'CLASSIFICATION',
            value: targetName,
            highlightColor: 'text-[#75E6DA]',
            icon: <Ship className="w-3.5 h-3.5 text-[#75E6DA]" />
          },
          {
            label: 'EST. TRANSIT',
            value: `${currentWp.transitTime} (${currentWp.transitDist})`,
            highlightColor: 'text-[#00D6A3]',
            icon: <Navigation className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'ASSIGNED CREW',
            value: 'Team Orca-3 (RV Pelagic)',
            highlightColor: 'text-[#EAF6FF]',
            icon: <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'CLEARANCE',
            value: '1.2 NM Coral Margin',
            highlightColor: 'text-[#FFB547]',
            icon: <Clock className="w-3.5 h-3.5 text-[#FFB547]" />
          }
        ]}
        actions={
          <div className="flex items-center gap-1 bg-[#0B2638] border border-[#16465A] p-1.5 rounded-xl flex-shrink-0 font-mono text-xs shadow-md">
            <button
              onClick={() => handleStageSelect(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                workflowStage === 1
                  ? 'bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'text-[#00D6A3] hover:bg-[#103B50]'
              }`}
            >
              <span>1. DRAFT {workflowStage === 1 ? '[ACTIVE]' : '✓'}</span>
            </button>

            <button
              onClick={() => handleStageSelect(2)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                workflowStage === 2
                  ? 'bg-[#00E5FF] text-[#061522] font-semibold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : workflowStage > 2
                  ? 'text-[#00D6A3] font-semibold hover:bg-[#103B50]'
                  : 'text-[#91A9BB] hover:bg-[#103B50]'
              }`}
            >
              <span>2. LEAD REVIEW {workflowStage === 2 ? '[ACTIVE]' : workflowStage > 2 ? '✓' : ''}</span>
            </button>

            <button
              onClick={() => handleStageSelect(3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                workflowStage === 3
                  ? 'bg-[#00E5FF] text-[#061522] font-semibold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : workflowStage > 3
                  ? 'text-[#00D6A3] font-semibold hover:bg-[#103B50]'
                  : 'text-[#91A9BB] hover:bg-[#103B50]'
              }`}
            >
              <span>3. AUTHORIZED {workflowStage === 3 ? '[ACTIVE]' : workflowStage > 3 ? '✓' : ''}</span>
            </button>

            <button
              onClick={() => handleStageSelect(4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                workflowStage === 4
                  ? 'bg-[#00E5FF] text-[#061522] font-semibold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                  : 'text-[#91A9BB] hover:bg-[#103B50]'
              }`}
            >
              <span>4. DISPATCHED</span>
            </button>
          </div>
        }
      />

      {/* 2. MAIN OPERATIONAL GRID (60% MAP & COMPARISON / 40% ACTION & PLAN) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: ~60% (7/12 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* A. RECOVERY OPERATIONS GIS MAP HUD */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl overflow-hidden relative shadow-lg">
            {/* Map Header bar */}
            <div className="p-3 bg-[#0B2638] border-b border-[#16465A] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-display text-sm text-[#EAF6FF] font-semibold">Tactical Intercept GIS Canvas</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#103B50] text-[#00E5FF] border border-[#16465A]">
                  ZOOM: 11.4x // EPSG:3857
                </span>
              </div>

              {/* GIS Layer Toggles */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <button
                  onClick={() => toggleLayer('route')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    layers.route ? 'bg-[#00E5FF] text-[#061522] font-semibold' : 'bg-[#0B2638] text-[#91A9BB]'
                  }`}
                >
                  Route
                </button>
                <button
                  onClick={() => toggleLayer('drift')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    layers.drift ? 'bg-[#00D6A3] text-[#061522] font-semibold' : 'bg-[#0B2638] text-[#91A9BB]'
                  }`}
                >
                  Drift +18h
                </button>
                <button
                  onClick={() => toggleLayer('bathymetry')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    layers.bathymetry ? 'bg-[#103B50] text-[#EAF6FF] border border-[#16465A]' : 'bg-[#0B2638] text-[#91A9BB]'
                  }`}
                >
                  Bathymetry
                </button>
                <button
                  onClick={() => toggleLayer('sanctuary')}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    layers.sanctuary ? 'bg-[#FF6B61]/20 text-[#FF6B61] border border-[#FF6B61]/40' : 'bg-[#0B2638] text-[#91A9BB]'
                  }`}
                >
                  Sanctuary Zone
                </button>
              </div>
            </div>

            {/* SVG Tactical Marine Chart Canvas */}
            <div className="relative w-full h-[460px] bg-[#040e17] overflow-hidden select-none">
              <svg className="w-full h-full" viewBox="0 0 800 460" preserveAspectRatio="none">
                <defs>
                  <pattern id="nautical-grid-rec" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1d2b39" strokeWidth="0.75" strokeDasharray="2 2" />
                  </pattern>
                  <pattern id="coral-hatch-rec" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#ffb4ab" strokeWidth="1.5" opacity="0.35" />
                  </pattern>
                  <radialGradient id="target-glow-rec" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffb4ab" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="100%" height="100%" fill="#061421" />
                <rect width="100%" height="100%" fill="url(#nautical-grid-rec)" />

                {/* Bathymetric Depth Contours */}
                {layers.bathymetry && (
                  <g>
                    <path d="M -20,120 Q 200,90 420,140 T 820,110" fill="none" stroke="#1d2b39" strokeWidth="1.5" />
                    <text x="20" y="115" fill="#849396" fontSize="9" className="font-mono">CONTOUR -120m (DEEP PELAGIC)</text>

                    <path d="M -20,240 Q 240,210 460,260 T 820,220" fill="none" stroke="#283644" strokeWidth="1.5" />
                    <text x="20" y="235" fill="#849396" fontSize="9" className="font-mono">CONTOUR -45m (SHELF BREAK)</text>

                    <path d="M 120,380 Q 340,320 540,340 T 820,300" fill="none" stroke="#3b494c" strokeWidth="2" />
                    <text x="140" y="375" fill="#50dbc8" fontSize="9" className="font-mono">CONTOUR -15m (REEF FRINGE)</text>
                  </g>
                )}

                {/* Tavaru Marine Reserve Zone A */}
                {layers.sanctuary && (
                  <g>
                    <path d="M 440,40 L 760,20 L 780,240 L 520,260 Z" fill="url(#coral-hatch-rec)" />
                    <path d="M 440,40 L 760,20 L 780,240 L 520,260 Z" fill="none" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="6 4" />
                    <rect x="450" y="48" width="230" height="24" rx="4" fill="#0B2638" opacity="0.9" />
                    <text x="460" y="64" fill="#ffb4ab" fontSize="10" fontWeight="600" letterSpacing="0.05em" className="font-mono">
                      TAVARU MARINE RESERVE [ZONE A - NO WAKE]
                    </text>
                  </g>
                )}

                {/* Lagrangian Net Drift Trajectory (+0h to +18h) */}
                {layers.drift && (
                  <g>
                    <path d="M 280,70 Q 360,110 440,165 T 570,220" fill="none" stroke="#ffb4ab" strokeWidth="3" strokeDasharray="4 4" />

                    {/* WP Alpha (+6h) */}
                    <circle
                      cx="360"
                      cy="118"
                      r="6"
                      fill={selectedWaypoint === 'Alpha' ? '#00E5FF' : '#12212e'}
                      stroke="#00e5ff"
                      strokeWidth="2"
                      className="cursor-pointer"
                      onClick={() => setSelectedWaypoint('Alpha')}
                    />
                    <text x="372" y="114" fill="#c3f5ff" fontSize="10" className="font-mono">WP ALPHA (+6h Drift)</text>
                    <text x="372" y="126" fill="#849396" fontSize="9" className="font-mono">Depth: 85m // Swell 2.2m</text>

                    {/* WP Bravo (Recommended, +12h) */}
                    <circle cx="440" cy="165" r="10" fill="#00e5ff" opacity="0.3" className="animate-ping" />
                    <circle
                      cx="440"
                      cy="165"
                      r="6"
                      fill={selectedWaypoint === 'Bravo' ? '#00E5FF' : '#00363d'}
                      stroke="#00e5ff"
                      strokeWidth="2"
                      className="cursor-pointer"
                      onClick={() => setSelectedWaypoint('Bravo')}
                    />
                    <rect x="455" y="152" width="170" height="32" rx="4" fill="#0B2638" stroke="#00e5ff" strokeWidth="1.5" />
                    <text x="462" y="167" fill="#00e5ff" fontSize="10" fontWeight="bold" className="font-mono">★ WP BRAVO (RECOMMENDED)</text>
                    <text x="462" y="179" fill="#50dbc8" fontSize="9" className="font-mono">ETA 15:45 UTC // Dep 38m</text>

                    {/* WP Charlie (+18h Fringe) */}
                    <circle
                      cx="570"
                      cy="220"
                      r="6"
                      fill={selectedWaypoint === 'Charlie' ? '#FF6B61' : '#690005'}
                      stroke="#ffb4ab"
                      strokeWidth="2"
                      className="cursor-pointer"
                      onClick={() => setSelectedWaypoint('Charlie')}
                    />
                    <text x="582" y="218" fill="#ffb4ab" fontSize="10" className="font-mono">WP CHARLIE (+18h Fringe)</text>
                    <text x="582" y="230" fill="#ffb4ab" fontSize="9" className="font-mono">DRAFT HAZARD: &lt;4m DEPTH</text>
                  </g>
                )}

                {/* Proposed Transit Routes */}
                {layers.route && (
                  <g>
                    {/* Route 1: Deep Water Channel (Cyan Polyline to Active Waypoint) */}
                    <path
                      d={
                        selectedWaypoint === 'Alpha'
                          ? 'M 120,400 L 190,320 L 260,200 L 360,118'
                          : selectedWaypoint === 'Charlie'
                          ? 'M 120,400 L 220,340 L 400,260 L 570,220'
                          : 'M 120,400 L 190,320 L 320,240 L 440,165'
                      }
                      fill="none"
                      stroke="#00e5ff"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Turn Waypoint 1 */}
                    <circle cx="190" cy="320" r="4" fill="#00e5ff" />
                    <text x="135" y="315" fill="#c3f5ff" fontSize="9" className="font-mono">CH-TURN 1 (032°T)</text>

                    {/* Turn Waypoint 2 */}
                    <circle cx="320" cy="240" r="4" fill="#00e5ff" />
                    <text x="270" y="232" fill="#c3f5ff" fontSize="9" className="font-mono">OUTER SHELF (048°T)</text>

                    {/* Alternative Route 2: Shallow Reef Shortcut */}
                    <path
                      d="M 120,400 Q 260,370 440,165"
                      fill="none"
                      stroke="#ffe8e5"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <text x="220" y="380" fill="#ffe8e5" opacity="0.8" fontSize="9" className="font-mono">
                      ALT ROUTE 2 (Shallow Shoals)
                    </text>
                  </g>
                )}

                {/* Staging Port: Lautoka Outer Station Pier 4 */}
                <circle cx="120" cy="400" r="8" fill="#00b1a0" />
                <circle cx="120" cy="400" r="14" fill="none" stroke="#00b1a0" strokeWidth="1" strokeDasharray="2 2" />
                <rect x="30" y="415" width="180" height="28" rx="4" fill="#0B2638" />
                <text x="40" y="430" fill="#50dbc8" fontSize="10" fontWeight="bold" className="font-mono">R/V PELAGIC SENTINEL</text>
                <text x="40" y="440" fill="#849396" fontSize="9" className="font-mono">Staging Pier 4 (17.3400° S)</text>

                {/* Current Target Marker: #OR-2024-094 */}
                <circle cx="280" cy="70" r="18" fill="url(#target-glow-rec)" />
                <circle cx="280" cy="70" r="7" fill="#93000a" stroke="#ffb4ab" strokeWidth="2" />
                <rect x="180" y="32" width="165" height="26" rx="4" fill="#0B2638" stroke="#ff6b61" strokeWidth="1" />
                <text x="188" y="45" fill="#ffb4ab" fontSize="10" fontWeight="bold" className="font-mono">TARGET FIX #OR-2024-094</text>
                <text x="188" y="55" fill="#bac9cc" fontSize="9" className="font-mono">17.2860° S, 178.4100° E</text>

                {/* Ocean Vector Compass Rose */}
                <g transform="translate(730, 400)">
                  <circle cx="0" cy="0" r="28" fill="#0B2638" stroke="#16465A" strokeWidth="1" />
                  <line x1="0" y1="-24" x2="0" y2="24" stroke="#3b494c" strokeWidth="1" />
                  <line x1="-24" y1="0" x2="24" y2="0" stroke="#3b494c" strokeWidth="1" />
                  <path d="M 0,-18 L -4,-8 L 0,-11 L 4,-8 Z" fill="#00e5ff" />
                  <text x="-3" y="-22" fill="#00e5ff" fontSize="8" fontWeight="bold" className="font-mono">N</text>
                  <text x="-16" y="14" fill="#849396" fontSize="8" className="font-mono">1.4 kts</text>
                  <text x="-18" y="24" fill="#50dbc8" fontSize="8" className="font-mono">SE Swell</text>
                </g>

                {/* Scale Bar */}
                <g transform="translate(30, 360)">
                  <line x1="0" y1="0" x2="92" y2="0" stroke="#d5e4f7" strokeWidth="2" />
                  <line x1="0" y1="-4" x2="0" y2="4" stroke="#d5e4f7" strokeWidth="2" />
                  <line x1="46" y1="-2" x2="46" y2="2" stroke="#d5e4f7" strokeWidth="1.5" />
                  <line x1="92" y1="-4" x2="92" y2="4" stroke="#d5e4f7" strokeWidth="2" />
                  <text x="0" y="-8" fill="#d5e4f7" fontSize="9" className="font-mono">0</text>
                  <text x="40" y="-8" fill="#d5e4f7" fontSize="9" className="font-mono">2.5 NM</text>
                  <text x="82" y="-8" fill="#d5e4f7" fontSize="9" className="font-mono">5.0 NM</text>
                </g>
              </svg>

              {/* Floating Map HUD Widgets */}
              <div className="absolute top-3 left-3 bg-[#0B2638]/90 border border-[#16465A] backdrop-blur p-2.5 rounded-lg flex flex-col gap-1 font-mono text-xs">
                <div className="flex items-center gap-1.5 text-[#EAF6FF]">
                  <span className="w-2 h-2 rounded-full bg-[#00D6A3] animate-pulse" />
                  <span>LIVE CURRENT: 1.4 kts @ 142° SE</span>
                </div>
                <div className="text-[#91A9BB] text-[10px]">WAVE SWELL: 1.6m // PERIOD: 8.4s</div>
              </div>

              <div className="absolute bottom-3 right-20 bg-[#0B2638]/90 border border-[#16465A] backdrop-blur px-2.5 py-1 rounded-lg font-mono text-xs text-[#00E5FF]">
                CURSOR: 17°18'42"S, 178°25'14"E
              </div>
            </div>
          </div>

          {/* B. CANDIDATE RECOVERY INTERCEPT COMPARISON */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-semibold text-[#EAF6FF]">Candidate Intercept Locations</h3>
                <p className="text-xs text-[#91A9BB]">Hydrodynamic drift solutions ranked by risk, sea room & transit clearance</p>
              </div>
              <span className="font-mono text-xs text-[#00D6A3] bg-[#0B2638] border border-[#16465A] px-2.5 py-1 rounded-lg">
                3 SOLUTIONS COMPUTED
              </span>
            </div>

            {/* Candidate Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {Object.entries(waypointsData).map(([key, wp]) => {
                const isSelected = selectedWaypoint === key;

                return (
                  <div
                    key={key}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                      isSelected
                        ? 'bg-[#103B50] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                        : 'bg-[#0B2638] border-[#16465A] hover:border-[#91A9BB]'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                            wp.isHazard
                              ? 'bg-[#FF6B61]/20 text-[#FF6B61]'
                              : isSelected
                              ? 'bg-[#00E5FF] text-[#061522]'
                              : 'bg-[#0B2638] text-[#91A9BB]'
                          }`}
                        >
                          {wp.badge}
                        </span>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            wp.isHazard ? 'text-[#FF6B61]' : 'text-[#00D6A3]'
                          }`}
                        >
                          {wp.feasibility}
                        </span>
                      </div>

                      <div className="font-display font-semibold text-sm text-[#EAF6FF]">{wp.name}</div>
                      <div className="font-mono text-[11px] text-[#91A9BB]">{wp.desc}</div>

                      <div className="space-y-1 pt-1 font-mono text-xs text-[#91A9BB]">
                        <div className="flex justify-between">
                          <span>Transit Distance:</span>
                          <strong className="text-[#EAF6FF]">{wp.transitDist}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Transit Time:</span>
                          <strong className="text-[#00D6A3]">{wp.transitTime}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Sea Depth:</span>
                          <strong className={wp.isHazard ? 'text-[#FF6B61]' : 'text-[#EAF6FF]'}>
                            {wp.depth}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Coral Margin:</span>
                          <strong className={wp.isHazard ? 'text-[#FF6B61]' : 'text-[#00E5FF]'}>
                            {wp.coralMargin}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedWaypoint(key);
                        showFeedback(`Switched intercept waypoint to ${wp.name} (Transit: ${wp.transitDist}).`);
                      }}
                      className={`w-full py-1.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-[#00E5FF] text-[#061522]'
                          : 'bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] border border-[#16465A]'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>SELECTED ROUTE</span>
                        </>
                      ) : (
                        <span>Switch Intercept</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ~40% (5/12 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* A. ROUTE PLANNER & VESSEL ASSIGNMENT */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-display text-sm font-semibold text-[#EAF6FF]">Vessel & Route Telemetry</h3>
              </div>
              <span className="font-mono text-xs text-[#00E5FF]">TRANSIT ID #TR-088</span>
            </div>

            {/* Vessel Selection Card */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-[#91A9BB] block uppercase">ASSIGNED SALVAGE VESSEL</span>
                  <div className="font-display font-bold text-sm text-[#EAF6FF]">R/V Pelagic Sentinel</div>
                  <p className="text-xs text-[#91A9BB]">24m Aluminum Catamaran • Shallow 1.2m Draft</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] border border-[#00D6A3]/30 font-mono text-[10px] font-semibold">
                  READY
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs text-[#91A9BB]">
                <div className="bg-[#071D33] p-2 rounded-lg border border-[#16465A]">
                  <span className="text-[10px] block text-[#91A9BB]">PAYLOAD WINCH</span>
                  <span className="text-[#EAF6FF]">Hydraulic 3.5 Ton</span>
                </div>
                <div className="bg-[#071D33] p-2 rounded-lg border border-[#16465A]">
                  <span className="text-[10px] block text-[#91A9BB]">INSPECTION ROV</span>
                  <span className="text-[#EAF6FF]">ROV-03 (150m tether)</span>
                </div>
              </div>
            </div>

            {/* Route Metrics Summary */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">Departure Staging Base:</span>
                <strong className="text-[#EAF6FF]">Lautoka Pier 4</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">Target Intercept Point:</span>
                <strong className="text-[#00E5FF]">WP {selectedWaypoint} ({currentWp.desc})</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">Planned Cruise Speed:</span>
                <strong className="text-[#EAF6FF]">14.0 kts (Twin Yanmar)</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">Calculated Transit Duration:</span>
                <strong className="text-[#00D6A3]">{currentWp.transitTime} (ETA: {currentWp.eta})</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">Safe Ebb Return Window:</span>
                <strong className="text-[#FFB547]">Prior to 18:30 UTC</strong>
              </div>
            </div>

            {/* Route Alternatives & Safety Checklist */}
            <div className="pt-2 border-t border-[#16465A] space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB] uppercase text-[10px]">SAFETY CLEARANCE GATES</span>
                <span className="text-[#00D6A3]">3 OF 3 VERIFIED</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                  <span className="text-[#EAF6FF] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                    Depth Draft Clearance (Min 18.2m)
                  </span>
                  <span className="text-[#00D6A3]">PASSED</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                  <span className="text-[#EAF6FF] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                    Wave/Swell Threshold (&lt; 2.5m ceiling)
                  </span>
                  <span className="text-[#00D6A3]">PASSED (1.6m)</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                  <span className="text-[#EAF6FF] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Sanctuary Permit Clearance
                  </span>
                  <span className="text-[#00E5FF]">#MPA-9921</span>
                </div>
              </div>
            </div>

            {/* Channel switch buttons */}
            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                onClick={() => {
                  setActiveRouteChannel(1);
                  showFeedback('Switched to Route 1: Deep Water Channel (Default Safe Draft).');
                }}
                className={`flex-1 py-1.5 rounded-lg border transition-all ${
                  activeRouteChannel === 1
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 font-semibold'
                    : 'bg-[#0B2638] text-[#91A9BB] border-[#16465A]'
                }`}
              >
                Route 1: Deep Channel {activeRouteChannel === 1 ? '(Active)' : ''}
              </button>
              <button
                onClick={() => {
                  setActiveRouteChannel(2);
                  showFeedback('Switched to Route 2: Direct Reef Shortcut (Requires high tide transit).');
                }}
                className={`flex-1 py-1.5 rounded-lg border transition-all ${
                  activeRouteChannel === 2
                    ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50 font-semibold'
                    : 'bg-[#0B2638] text-[#91A9BB] border-[#16465A]'
                }`}
              >
                Route 2: Reef Shortcut
              </button>
            </div>
          </div>

          {/* B. MISSION CONFIGURATION & FIELD PROTOCOL */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#00D6A3]" />
              <h3 className="font-display text-sm font-semibold text-[#EAF6FF]">Mission Configuration & Notes</h3>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-[#91A9BB] block mb-1 uppercase">OPERATION TITLE</label>
                <input
                  type="text"
                  value={operationTitle}
                  onChange={(e) => setOperationTitle(e.target.value)}
                  className="w-full bg-[#0B2638] text-[#EAF6FF] p-2 rounded-lg border border-[#16465A] focus:border-[#00E5FF] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-[#91A9BB] block mb-1 uppercase">FIELD SALVAGE CREW</label>
                  <div className="bg-[#0B2638] p-2 rounded-lg text-[#EAF6FF] border border-[#16465A] truncate">
                    Team Orca-3 (J. Vasconcelos)
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-[#91A9BB] block mb-1 uppercase">EST. DEPARTURE TIME</label>
                  <div className="bg-[#0B2638] p-2 rounded-lg text-[#00D6A3] border border-[#16465A]">
                    14:45 UTC (in ~13 mins)
                  </div>
                </div>
              </div>

              {/* Environmental Safety Alert Box */}
              <div className="bg-[#0B2638] border border-[#FF6B61]/30 p-3 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#FF6B61]">
                  <AlertTriangle className="w-4 h-4" />
                  <strong className="text-xs">CRITICAL FIELD CONSTRAINTS</strong>
                </div>
                <ul className="text-xs text-[#91A9BB] space-y-1 list-disc pl-4 leading-relaxed">
                  <li>
                    <strong className="text-[#EAF6FF]">Tethering Hazard:</strong> Derelict net has high float density. Free-diver entanglement hazard: ROV-03 grapple pass required before winch lock.
                  </li>
                  <li>
                    <strong className="text-[#EAF6FF]">Tidal Ebb Window:</strong> Outer pass begins rapid tidal drawdown at 17:15 UTC. All extraction equipment must clear outer reef before 18:30 UTC.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* C. OPERATIONAL ACTION BAR & SUBMISSION */}
          <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row gap-2.5 font-mono text-xs">
              <button
                onClick={() => showFeedback('Draft recovery plan saved locally to browser state.')}
                className="flex-1 py-2 px-3 rounded-lg bg-[#071D33] hover:bg-[#103B50] text-[#EAF6FF] border border-[#16465A] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Save Draft Plan</span>
              </button>

              <button
                onClick={() => showFeedback('Recalculating transit fuel burn and tide gate clearance window...')}
                className="py-2 px-3 rounded-lg bg-[#071D33] hover:bg-[#103B50] text-[#EAF6FF] border border-[#16465A] flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#75E6DA]" />
                <span>Recalculate</span>
              </button>
            </div>

            {/* Primary Glow Action Button */}
            <button
              onClick={handleSubmitAuthorization}
              className="w-full py-3 px-4 rounded-xl bg-[#00E5FF] text-[#061522] font-display text-xs uppercase tracking-wider font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.7)] transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit for Human Lead Authorization</span>
            </button>

            <p className="font-mono text-[10px] text-[#91A9BB] text-center leading-relaxed">
              OceanRescue Marine AI Decision-Support Pipeline • Salvage transit requires formal vessel master sign-off and on-scene environmental hazard risk assessment. Unvalidated route estimates are proposed/simulated and do not dispatch real vessels.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RecoveryPlanning;
