import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  Wind,
  Waves,
  Compass,
  Layers,
  RotateCw,
  SlidersHorizontal,
  AlertTriangle,
  ArrowRight,
  Download,
  Printer,
  ShieldAlert,
  Info,
  CheckCircle2,
  Navigation,
  Crosshair,
  TrendingUp,
  Activity
} from 'lucide-react';

export const DriftForecast = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { observations, selectedObservation } = useObservations();

  const targetIdFromRoute = location.state?.targetId;
  const activeObs =
    (targetIdFromRoute && observations.find((o) => o.id === targetIdFromRoute)) ||
    selectedObservation ||
    observations[0];

  const targetId = activeObs?.id?.startsWith('#') ? activeObs.id : `#${activeObs?.id || 'OR-2024-094'}`;
  const targetName = (activeObs?.name || activeObs?.typeName || (activeObs?.class_name === 'fishing_net' ? 'GHOST GILLNET' : 'ROPE / LINE')).toUpperCase();
  const isLocated = Boolean(activeObs?.hasGps && activeObs?.coords);
  const targetCoords = isLocated ? activeObs.coords : 'UNLOCATED (GPS Fix Pending)';

  // State
  const [horizon, setHorizon] = useState('24h'); // '6h', '12h', '24h', '48h', 'custom'
  const [scenario, setScenario] = useState('A'); // 'A', 'B', 'C'
  const [toastMessage, setToastMessage] = useState(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Layer toggles
  const [layers, setLayers] = useState({
    currents: true,
    winds: true,
    contours: true,
    sanctuary: true,
  });

  const toggleOverlay = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
      showFeedback('Recalculated 500 stochastic tracer paths with updated HYCOM 1/12° oceanographic boundary conditions.');
    }, 800);
  };

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
              <strong className="text-[#EAF6FF]">UNLOCATED TARGET ({targetId})</strong> — This observation does not have GPS metadata from physical sensors. Trajectory below is a <strong>simulated reference demonstration</strong> based on Fijian Sector 04 boundary conditions.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/30 shrink-0 font-bold self-start sm:self-auto">
            SIMULATED DEMO MODEL
          </span>
        </div>
      )}

      {/* 1. ATMOSPHERIC DRIFT COMMAND HERO */}
      <PageHero
        sector="Lau Basin & Tavaru Sector 4"
        title="Lagrangian Drift Forecast Engine"
        subtitle="Runge-Kutta 4th Order stochastic particle dispersion modeling driven by HYCOM 1/12° hydrodynamics, ERA5 surface winds, and Stokes wave drift."
        badgeText="SIMULATED OCEANOGRAPHIC MODEL"
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
            icon: <Layers className="w-3.5 h-3.5 text-[#75E6DA]" />
          },
          {
            label: 'POSITION',
            value: targetCoords,
            highlightColor: isLocated ? 'text-[#EAF6FF]' : 'text-[#FFB547]',
            icon: <Navigation className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'DEPTH',
            value: '-14.2m [Simulated]',
            highlightColor: 'text-[#00D6A3]',
            icon: <Waves className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'RUN CONFIDENCE',
            value: '81.4% (Mod-High)',
            highlightColor: 'text-[#00D6A3]',
            icon: <Activity className="w-3.5 h-3.5 text-[#00D6A3]" />
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs text-[#EAF6FF] bg-[#0B2638] hover:bg-[#103B50] border border-[#16465A] hover:border-[#00E5FF] transition-all cursor-pointer shadow-md"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#00E5FF] ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'Running RK4...' : 'Recalculate Run'}</span>
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('scenario-drawer');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-mono text-xs text-[#EAF6FF] bg-[#0B2638] hover:bg-[#103B50] border border-[#16465A] hover:border-[#75E6DA] transition-all cursor-pointer shadow-md"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#75E6DA]" />
              <span>Compare Scenarios</span>
            </button>

            <Link
              to="/risk-assessment"
              state={{ targetId: activeObs?.id }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-display text-xs uppercase text-[#061522] bg-[#00E5FF] hover:bg-[#75E6DA] hover:shadow-[0_0_20px_rgba(0,229,255,0.45)] transition-all font-bold shadow-lg"
            >
              <span>Send to Risk Assessment</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        }
      />

      {/* TIME HORIZON & PARTICLE DISPERSAL PARAMETER BAR */}
      <section
        className="bg-[#071D33] border border-[#16465A] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3"
        data-purpose="horizon-switcher-bar"
      >
        {/* Horizon Switchers */}
        <div className="flex items-center gap-1 bg-[#0B2638] p-1 rounded-lg border border-[#16465A] font-mono text-xs">
          <button
            onClick={() => setHorizon('6h')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              horizon === '6h'
                ? 'font-semibold bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
            }`}
          >
            6 Hours (+6h)
          </button>
          <button
            onClick={() => setHorizon('12h')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              horizon === '12h'
                ? 'font-semibold bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
            }`}
          >
            12 Hours (+12h)
          </button>
          <button
            onClick={() => setHorizon('24h')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              horizon === '24h'
                ? 'font-semibold bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
            }`}
          >
            24 Hours (+24h) — ACTIVE
          </button>
          <button
            onClick={() => setHorizon('48h')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              horizon === '48h'
                ? 'font-semibold bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
            }`}
          >
            48 Hours (+48h)
          </button>
          <button
            onClick={() => setHorizon('custom')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              horizon === 'custom'
                ? 'font-semibold bg-[#00E5FF] text-[#061522] shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
            }`}
          >
            Custom (0-72h)
          </button>
        </div>

        {/* Micro-Parameters Pill Array */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B2638] border border-[#16465A] text-[#91A9BB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" />
            TRACERS: <strong className="text-[#EAF6FF]">500 PARTICLES</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B2638] border border-[#16465A] text-[#91A9BB]">
            DISPERSION: <strong className="text-[#00E5FF]">MONTE CARLO (ON)</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B2638] border border-[#16465A] text-[#91A9BB]">
            LEEWAY: <strong className="text-[#EAF6FF]">2.8% WIND DRAG</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B2638] border border-[#16465A] text-[#91A9BB]">
            STOKES DRIFT: <strong className="text-[#00D6A3]">WW3 ACTIVE</strong>
          </span>
        </div>
      </section>

      {/* PRIMARY TACTICAL SPLIT LAYOUT (65% MAP, 35% TELEMETRY) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT 65% (8/12 cols): Tactical Drift Ocean GIS Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-2">
          <div className="relative w-full rounded-xl bg-[#040e17] border border-[#16465A] overflow-hidden shadow-xl min-h-[640px] flex flex-col">
            {/* Floating Tactical Map Bar (Top Overlay) */}
            <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
              {/* Active Layer Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-[#071D33]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#16465A] shadow-lg font-mono text-[11px]">
                <span className="text-[#91A9BB] uppercase tracking-wider mr-1 text-[10px]">LAYERS:</span>
                <button
                  onClick={() => toggleOverlay('currents')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    layers.currents
                      ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-semibold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                  HYCOM Streamlines
                </button>
                <button
                  onClick={() => toggleOverlay('winds')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    layers.winds
                      ? 'bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/40 font-semibold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
                  ERA5 Wind Vectors
                </button>
                <button
                  onClick={() => toggleOverlay('contours')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    layers.contours
                      ? 'bg-[#00D6A3]/20 text-[#00D6A3] border border-[#00D6A3]/40 font-semibold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  Bathymetry (-100m)
                </button>
                <button
                  onClick={() => toggleOverlay('sanctuary')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${
                    layers.sanctuary
                      ? 'bg-[#FF6B61]/20 text-[#FF6B61] border border-[#FF6B61]/40 font-semibold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  Sanctuary Zone A
                </button>
              </div>

              {/* Compass & Heading Readout */}
              <div className="flex items-center gap-2 pointer-events-auto bg-[#071D33]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#16465A] font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-[#00E5FF]">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>HDG: 162° SSE</span>
                </div>
                <span className="text-[#16465A]">|</span>
                <div className="text-[#EAF6FF]">ZOOM: 1:25,000</div>
              </div>
            </div>

            {/* Tactical Vector Hydrodynamic Map SVG */}
            <div className="relative flex-1 w-full h-[620px] bg-[#05131f] overflow-hidden select-none" id="tactical-canvas">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 640" preserveAspectRatio="none">
                <defs>
                  {/* Grid Pattern */}
                  <pattern id="gisGrid-forecast" width="100" height="80" patternUnits="userSpaceOnUse">
                    <path d="M 100 0 L 0 0 0 80" fill="none" stroke="rgba(22, 70, 90, 0.35)" strokeWidth="0.75" strokeDasharray="2 3" />
                  </pattern>
                  {/* Coral Hazard Stripes */}
                  <pattern id="coralHazardStripes-forecast" width="16" height="16" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255, 107, 97, 0.45)" strokeWidth="5" />
                    <line x1="0" y1="0" x2="0" y2="16" stroke="rgba(255, 181, 71, 0.15)" strokeWidth="16" />
                  </pattern>
                  {/* Trajectory Gradient */}
                  <linearGradient id="driftTrajectoryGrad-forecast" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="1" />
                    <stop offset="45%" stopColor="#50dbc8" stopOpacity="0.95" />
                    <stop offset="85%" stopColor="#ffb547" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#ff6b61" stopOpacity="0.85" />
                  </linearGradient>
                  {/* Uncertainty Cone Glow */}
                  <radialGradient id="uncertaintyConeGlow-forecast" cx="65%" cy="60%" r="50%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#16b8a6" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.0" />
                  </radialGradient>
                  {/* Flow Markers */}
                  <marker id="cyanArrow-forecast" markerWidth="5" markerHeight="5" refX="6" refY="5" orient="auto-start-reverse" viewBox="0 0 10 10">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00e5ff" />
                  </marker>
                  <marker id="amberWindArrow-forecast" markerWidth="4" markerHeight="4" refX="5" refY="5" orient="auto" viewBox="0 0 10 10">
                    <path d="M 0 2 L 6 5 L 0 8 z" fill="#ffb547" opacity="0.6" />
                  </marker>
                </defs>

                {/* Base Coordinate Grid */}
                <rect width="100%" height="100%" fill="url(#gisGrid-forecast)" />

                {/* Coordinate Annotations */}
                <g fill="#849396" fontSize="9" opacity="0.7" className="font-mono">
                  <text x="18" y="75">17.2600°S</text>
                  <text x="18" y="155">17.2800°S</text>
                  <text x="18" y="235">17.3000°S</text>
                  <text x="18" y="315">17.3200°S</text>
                  <text x="18" y="395">17.3400°S</text>
                  <text x="18" y="475">17.3600°S</text>
                  <text x="18" y="555">17.3800°S</text>
                  <text x="120" y="625">178.3800°E</text>
                  <text x="280" y="625">178.4000°E</text>
                  <text x="440" y="625">178.4200°E</text>
                  <text x="600" y="625">178.4400°E</text>
                  <text x="760" y="625">178.4600°E</text>
                  <text x="900" y="625">178.4800°E</text>
                </g>

                {/* Bathymetry Contours Layer */}
                {layers.contours && (
                  <g fill="none" stroke="#16465A" strokeWidth="1.2" opacity="0.8">
                    <path d="M 0,220 C 180,240 310,190 480,270 C 650,350 820,310 1000,420" strokeDasharray="4 4" />
                    <text x="80" y="228" fill="#50dbc8" fontSize="8" opacity="0.6" className="font-mono">-100m Isobath</text>
                    
                    <path d="M 0,330 C 210,360 340,300 520,380 C 690,460 840,430 1000,530" />
                    <text x="90" y="342" fill="#50dbc8" fontSize="8" opacity="0.6" className="font-mono">-50m Isobath</text>
                    
                    <path d="M 320,580 C 420,490 560,450 710,480 C 850,510 930,460 1000,480" stroke="#00b1a0" strokeWidth="1.5" />
                    <text x="430" y="475" fill="#50dbc8" fontSize="8" opacity="0.9" className="font-mono">-20m Shelf Dropoff</text>
                  </g>
                )}

                {/* Tavaru Island & Barrier Reef */}
                <g id="coastline-features">
                  <path d="M 680,640 C 710,540 760,490 830,470 C 910,450 960,490 1000,480 L 1000,640 Z" fill="#0c2f3f" stroke="#50dbc8" strokeWidth="2" />
                  <text x="850" y="560" fill="#d5e4f7" fontSize="14" fontWeight="700" letterSpacing="1.5" className="font-display">TAVARU ISLAND</text>
                  <text x="850" y="578" fill="#849396" fontSize="9" className="font-mono">ELEV: +12m (UNINHABITED)</text>
                  <path d="M 540,640 C 560,530 620,440 740,410 C 830,390 910,400 980,380" fill="none" stroke="#ffb4ab" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
                </g>

                {/* Marine Sanctuary Zone A Polygon */}
                {layers.sanctuary && (
                  <g id="layer-sanctuary">
                    <polygon points="580,640 590,460 670,390 820,370 980,350 1000,350 1000,640" fill="url(#coralHazardStripes-forecast)" stroke="#ff6b61" strokeWidth="1.8" />
                    <rect x="680" y="325" width="280" height="38" rx="4" fill="#0B2638" stroke="#ff6b61" strokeWidth="1.2" />
                    <circle cx="695" cy="344" r="4" fill="#ff6b61" className="animate-ping" />
                    <circle cx="695" cy="344" r="3" fill="#ff6b61" />
                    <text x="710" y="339" fill="#ffb4ab" fontSize="11" fontWeight="700" className="font-display">TAVARU REEF MARINE RESERVE</text>
                    <text x="710" y="354" fill="#ffb4ac" fontSize="8.5" className="font-mono">CRITICAL SANCTUARY ZONE A • NO-TAKE MPA</text>
                  </g>
                )}

                {/* HYCOM Current Streamlines */}
                {layers.currents && (
                  <g fill="none" stroke="#00e5ff" strokeWidth="1.2" opacity="0.45">
                    <path
                      d="M 80,100 Q 220,180 340,320 T 560,580"
                      markerEnd="url(#cyanArrow-forecast)"
                      className="animate-current-flow"
                      strokeDasharray="8 6"
                    />
                    <path
                      d="M 180,60 Q 300,160 410,290 T 640,550"
                      markerEnd="url(#cyanArrow-forecast)"
                      className="animate-current-flow"
                      strokeDasharray="8 6"
                    />
                    <path
                      d="M 280,40 Q 380,140 480,260 T 730,510"
                      markerEnd="url(#cyanArrow-forecast)"
                      className="animate-current-flow"
                      strokeDasharray="8 6"
                    />
                    <path
                      d="M 380,20 Q 470,120 560,240 T 820,470"
                      markerEnd="url(#cyanArrow-forecast)"
                      className="animate-current-flow"
                      strokeDasharray="8 6"
                    />
                    <path
                      d="M 480,10 Q 560,110 650,220 T 910,430"
                      markerEnd="url(#cyanArrow-forecast)"
                      className="animate-current-flow"
                      strokeDasharray="8 6"
                    />
                  </g>
                )}

                {/* ERA5 Wind Field Vector Arrows */}
                {layers.winds && (
                  <g opacity="0.5" stroke="#ffb547" strokeWidth="1">
                    <line x1="160" y1="120" x2="190" y2="150" markerEnd="url(#amberWindArrow-forecast)" />
                    <line x1="320" y1="110" x2="350" y2="140" markerEnd="url(#amberWindArrow-forecast)" />
                    <line x1="500" y1="130" x2="530" y2="160" markerEnd="url(#amberWindArrow-forecast)" />
                    <line x1="220" y1="260" x2="250" y2="290" markerEnd="url(#amberWindArrow-forecast)" />
                    <line x1="420" y1="270" x2="450" y2="300" markerEnd="url(#amberWindArrow-forecast)" />
                    <line x1="300" y1="420" x2="330" y2="450" markerEnd="url(#amberWindArrow-forecast)" />
                    <text x="175" y="112" fill="#ffb547" fontSize="8" className="font-mono" opacity="0.8">WIND: 14.2 kts @ 135°</text>
                  </g>
                )}

                {/* Monte Carlo Uncertainty Cone Envelope */}
                <path
                  d="M 230,140 
                     C 280,170 330,220 405,295 
                     C 470,360 540,430 635,505 
                     C 670,530 690,560 705,595
                     L 540,595
                     C 505,540 450,470 375,390
                     C 310,320 260,250 220,170 Z"
                  fill="url(#uncertaintyConeGlow-forecast)"
                  stroke="rgba(0, 229, 255, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />

                {/* Projected Trajectory Line */}
                <path
                  d={
                    scenario === 'B'
                      ? 'M 225,145 C 275,190 365,270 435,340 C 510,410 560,450 610,500'
                      : scenario === 'C'
                      ? 'M 225,145 C 255,165 310,220 370,270 C 440,320 480,360 515,400'
                      : 'M 225,145 C 265,175 340,240 405,295 C 470,350 505,385 545,430'
                  }
                  fill="none"
                  stroke="url(#driftTrajectoryGrad-forecast)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d={
                    scenario === 'B'
                      ? 'M 225,145 C 275,190 365,270 435,340 C 510,410 560,450 610,500'
                      : scenario === 'C'
                      ? 'M 225,145 C 255,165 310,220 370,270 C 440,320 480,360 515,400'
                      : 'M 225,145 C 265,175 340,240 405,295 C 470,350 505,385 545,430'
                  }
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* Extended 24h to 48h Speculative Drift (Dashed) */}
                <path
                  d="M 545,430 C 585,475 625,520 670,565"
                  fill="none"
                  stroke="#ff6b61"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                  opacity="0.75"
                />

                {/* Directional Chevrons */}
                <polygon points="275,180 282,185 273,190" fill="#00e5ff" opacity="0.9" />
                <polygon points="358,252 365,257 356,262" fill="#50dbc8" opacity="0.9" />
                <polygon points="468,360 475,365 466,370" fill="#ffb547" opacity="0.9" />

                {/* Point of Closest Approach (PCA) Measurement Callout */}
                <g id="pca-measurement">
                  <line x1="505" y1="390" x2="615" y2="435" stroke="#ffb4ab" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="505" cy="390" r="3.5" fill="#ffb547" />
                  <circle cx="615" cy="435" r="3.5" fill="#ff6b61" />
                  <rect x="535" y="360" width="180" height="42" rx="4" fill="#0B2638" stroke="#ffb547" strokeWidth="1.2" />
                  <text x="545" y="376" fill="#ffb547" fontSize="9.5" fontWeight="700" className="font-display">POINT OF CLOSEST APPROACH</text>
                  <text x="545" y="392" fill="#ffffff" fontSize="9" className="font-mono">
                    Distance: <tspan fill="#ff6b61" fontWeight="700">290m</tspan> @ +19.5h
                  </text>
                </g>

                {/* WAYPOINT MARKERS */}
                {/* T0: Origin Fix (11:18 UTC) */}
                <g transform="translate(225, 145)">
                  <circle r="14" fill="none" stroke="#00e5ff" strokeWidth="1" opacity="0.4" className="animate-ping" />
                  <circle r="8" fill="#00e5ff" fillOpacity="0.25" stroke="#00e5ff" strokeWidth="2" />
                  <circle r="3.5" fill="#ffffff" />
                  <rect x="-85" y="-36" width="170" height="26" rx="4" fill="#0B2638" stroke="#00e5ff" strokeWidth="1" />
                  <text x="0" y="-23" fill="#c3f5ff" fontSize="9.5" fontWeight="700" textAnchor="middle" className="font-display">ORIGIN T0 (11:18 UTC)</text>
                  <text x="0" y="-12" fill="#50dbc8" fontSize="8" textAnchor="middle" className="font-mono">UAV SIGHTING VERIFIED</text>
                </g>

                {/* +6h Waypoint */}
                <g transform="translate(305, 210)">
                  <circle r="5" fill="#0B2638" stroke="#00e5ff" strokeWidth="1.8" />
                  <circle r="2" fill="#00e5ff" />
                  <rect x="12" y="-10" width="94" height="20" rx="3" fill="#0B2638" stroke="#16465A" strokeWidth="1" />
                  <text x="18" y="4" fill="#d5e4f7" fontSize="8.5" className="font-mono">+6h (17:18Z)</text>
                </g>

                {/* +12h Waypoint */}
                <g transform="translate(405, 295)">
                  <circle r="5" fill="#0B2638" stroke="#50dbc8" strokeWidth="1.8" />
                  <circle r="2" fill="#50dbc8" />
                  <rect x="14" y="-12" width="102" height="22" rx="3" fill="#0B2638" stroke="#16465A" strokeWidth="1" />
                  <text x="20" y="3" fill="#50dbc8" fontSize="8.5" className="font-mono">+12h (23:18Z)</text>
                </g>

                {/* +24h Waypoint (Current Target Horizon - High Prominence) */}
                <g transform="translate(545, 430)">
                  <circle r="18" fill="none" stroke="#ffb547" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle r="9" fill="#ffb547" fillOpacity="0.3" stroke="#ffb547" strokeWidth="2" />
                  <circle r="4" fill="#ffffff" />
                  <rect x="-140" y="16" width="165" height="46" rx="4" fill="#0B2638" stroke="#ffb547" strokeWidth="1.5" />
                  <text x="-132" y="32" fill="#ffb547" fontSize="10.5" fontWeight="700" className="font-display">+24h PREDICTED FIX</text>
                  <text x="-132" y="46" fill="#d5e4f7" fontSize="8.5" className="font-mono">17.3295°S, 178.4290°E</text>
                  <text x="-132" y="56" fill="#ff6b61" fontSize="7.5" className="font-mono">SPEED: 1.1 kts • UNC: ±860m</text>
                </g>

                {/* +48h Projected Waypoint */}
                <g transform="translate(670, 565)">
                  <circle r="6" fill="#0B2638" stroke="#ff6b61" strokeWidth="1.5" strokeDasharray="2 2" />
                  <circle r="2.5" fill="#ff6b61" />
                  <rect x="-115" y="-12" width="105" height="22" rx="3" fill="#0B2638" stroke="#ff6b61" strokeWidth="1" />
                  <text x="-108" y="2" fill="#ffb4ab" fontSize="8.5" className="font-mono">+48h (DIVERGENCE)</text>
                </g>

                {/* Map Scale Bar */}
                <g transform="translate(30, 580)">
                  <rect x="0" y="0" width="160" height="34" rx="4" fill="#0B2638" fillOpacity="0.85" stroke="#16465A" strokeWidth="1" />
                  <line x1="12" y1="18" x2="148" y2="18" stroke="#d5e4f7" strokeWidth="2" />
                  <line x1="12" y1="12" x2="12" y2="24" stroke="#d5e4f7" strokeWidth="1.5" />
                  <line x1="80" y1="14" x2="80" y2="22" stroke="#d5e4f7" strokeWidth="1.5" />
                  <line x1="148" y1="12" x2="148" y2="24" stroke="#d5e4f7" strokeWidth="1.5" />
                  <text x="12" y="10" fill="#849396" fontSize="7.5" className="font-mono">0</text>
                  <text x="74" y="10" fill="#849396" fontSize="7.5" className="font-mono">2.5 NM</text>
                  <text x="135" y="10" fill="#849396" fontSize="7.5" className="font-mono">5.0 NM</text>
                  <text x="45" y="29" fill="#50dbc8" fontSize="7" className="font-mono">DATUM: WGS84</text>
                </g>

                {/* Geographic North Compass Rose */}
                <g transform="translate(940, 65)">
                  <circle r="22" fill="#0B2638" fillOpacity="0.9" stroke="#16465A" strokeWidth="1.2" />
                  <polygon points="0,-16 5,-2 -5,-2" fill="#00e5ff" />
                  <polygon points="0,16 5,2 -5,2" fill="#849396" opacity="0.6" />
                  <text x="0" y="-18" fill="#00e5ff" fontSize="8.5" fontWeight="700" textAnchor="middle" className="font-display">N</text>
                  <text x="0" y="7" fill="#849396" fontSize="6.5" textAnchor="middle" className="font-mono">TRUE</text>
                </g>
              </svg>
            </div>

            {/* GIS Canvas Status Footbar */}
            <div className="bg-[#071D33] px-4 py-2 border-t border-[#16465A] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              <div className="flex items-center gap-3 text-[#91A9BB]">
                <span>GRID: <strong className="text-[#EAF6FF]">0.02° Ticks</strong></span>
                <span>PROJECTION: <strong className="text-[#EAF6FF]">EPSG:4326</strong></span>
                <span>MODEL PASS: <strong className="text-[#00D6A3]">11:32:04 UTC</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
                <span className="text-[#00D6A3] font-semibold">TARGET: +{horizon.toUpperCase()} HORIZON</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 35% (4/12 cols): Science, Hydrodynamics & Lagrangian Telemetry Drawer */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* 1. Sensitive Habitat Risk Alert Banner */}
          <div className="bg-[#0B2638] border border-[#FF6B61]/60 rounded-xl p-4 shadow-[0_0_16px_rgba(255,107,97,0.15)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B61] via-[#FFB547] to-[#FF6B61]" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B61]/20 border border-[#FF6B61] text-[#FF6B61] flex items-center justify-center flex-shrink-0 animate-pulse mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-sm text-[#FF6B61] font-bold tracking-tight">RESERVE STRANDING RISK</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#FF6B61]/20 text-[#FF6B61] font-bold uppercase border border-[#FF6B61]/40">
                    CRITICAL
                  </span>
                </div>
                <p className="text-xs text-[#EAF6FF] mt-1.5 leading-relaxed">
                  Modeled trajectory intersects the <strong>500m buffer zone</strong> of Tavaru Coral Sanctuary within <strong>19h 30m</strong> under current southeasterly swell and ebb tide conditions.
                </p>
                <div className="mt-3 pt-2.5 border-t border-[#FF6B61]/30 flex items-center justify-between font-mono text-xs">
                  <div>
                    <span className="text-[#91A9BB]">STRANDING PROB:</span>
                    <span className="text-[#FF6B61] font-bold ml-1">78.2%</span>
                  </div>
                  <div>
                    <span className="text-[#91A9BB]">VULNERABILITY:</span>
                    <span className="text-[#FFB547] font-bold ml-1">Live Acropora Corals</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Environmental Forcing Variables */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-1.5">
                <Waves className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="font-display text-sm text-[#EAF6FF] font-semibold">Environmental Forcing</h3>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">BLENDED REANALYSIS</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Metric 1: Surface Current */}
              <div className="bg-[#0B2638] p-2.5 rounded-lg border border-[#16465A] flex flex-col justify-between">
                <span className="font-mono text-[10px] text-[#91A9BB] uppercase tracking-wider">Surface Current</span>
                <div className="mt-1 font-mono text-lg text-[#00E5FF] font-bold">1.4 kts</div>
                <div className="font-mono text-[10px] text-[#91A9BB] flex items-center justify-between mt-1">
                  <span>Vector: 165° SSE</span>
                  <span className="text-[#75E6DA]">HYCOM 1/12°</span>
                </div>
              </div>

              {/* Metric 2: Wind Velocity */}
              <div className="bg-[#0B2638] p-2.5 rounded-lg border border-[#16465A] flex flex-col justify-between">
                <span className="font-mono text-[10px] text-[#91A9BB] uppercase tracking-wider">Wind Velocity</span>
                <div className="mt-1 font-mono text-lg text-[#FFB547] font-bold">14.2 kts</div>
                <div className="font-mono text-[10px] text-[#91A9BB] flex items-center justify-between mt-1">
                  <span>Vector: 135° SE</span>
                  <span className="text-[#FFB547]">ERA5 Reanalysis</span>
                </div>
              </div>

              {/* Metric 3: Wave Height */}
              <div className="bg-[#0B2638] p-2.5 rounded-lg border border-[#16465A] flex flex-col justify-between">
                <span className="font-mono text-[10px] text-[#91A9BB] uppercase tracking-wider">Wave Height (Hs)</span>
                <div className="mt-1 font-mono text-lg text-[#00D6A3] font-bold">1.8 m</div>
                <div className="font-mono text-[10px] text-[#91A9BB] flex items-center justify-between mt-1">
                  <span>Period: 9.2s</span>
                  <span className="text-[#00D6A3]">WW3 Model</span>
                </div>
              </div>

              {/* Metric 4: Sea Surface Temp */}
              <div className="bg-[#0B2638] p-2.5 rounded-lg border border-[#16465A] flex flex-col justify-between">
                <span className="font-mono text-[10px] text-[#91A9BB] uppercase tracking-wider">Sea Surface Temp</span>
                <div className="mt-1 font-mono text-lg text-[#EAF6FF] font-bold">26.4° C</div>
                <div className="font-mono text-[10px] text-[#91A9BB] flex items-center justify-between mt-1">
                  <span>Layer: Nominal</span>
                  <span className="text-[#00E5FF]">MUR Satellite</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Lagrangian Forecast Timeline */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 flex-1">
            <div className="flex items-center justify-between mb-3 border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#00D6A3]" />
                <h3 className="font-display text-sm text-[#EAF6FF] font-semibold">Lagrangian Waypoint Feed</h3>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">5 NODES</span>
            </div>

            <div className="space-y-2 font-mono text-xs">
              {/* Waypoint T0 */}
              <div className="p-2.5 rounded-lg bg-[#0B2638] border-l-2 border-[#00E5FF] flex flex-col gap-1 hover:bg-[#103B50]/50 transition-colors">
                <div className="flex items-center justify-between font-semibold text-[#00E5FF]">
                  <span>T+0h (11:18 UTC) — ORIGIN</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#00E5FF]/15 text-[#00E5FF] text-[10px]">±25m</span>
                </div>
                <div className="flex items-center justify-between text-[#91A9BB] text-[11px]">
                  <span className="text-[#EAF6FF]">17.2860° S, 178.4100° E</span>
                  <span>Speed: 0.0 kts</span>
                  <span className="text-[#00D6A3]">UAV Verified</span>
                </div>
              </div>

              {/* Waypoint T+6h */}
              <div className="p-2.5 rounded-lg bg-[#0B2638] border-l-2 border-[#00D6A3] flex flex-col gap-1 hover:bg-[#103B50]/50 transition-colors">
                <div className="flex items-center justify-between font-semibold text-[#00D6A3]">
                  <span>T+6h (17:18 UTC)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#103B50] text-[#91A9BB] text-[10px]">±180m</span>
                </div>
                <div className="flex items-center justify-between text-[#91A9BB] text-[11px]">
                  <span className="text-[#EAF6FF]">17.2942° S, 178.4155° E</span>
                  <span>Speed: 1.3 kts</span>
                  <span>Open Channel</span>
                </div>
              </div>

              {/* Waypoint T+12h */}
              <div className="p-2.5 rounded-lg bg-[#0B2638] border-l-2 border-[#00D6A3] flex flex-col gap-1 hover:bg-[#103B50]/50 transition-colors">
                <div className="flex items-center justify-between font-semibold text-[#00D6A3]">
                  <span>T+12h (23:18 UTC)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#103B50] text-[#91A9BB] text-[10px]">±420m</span>
                </div>
                <div className="flex items-center justify-between text-[#91A9BB] text-[11px]">
                  <span className="text-[#EAF6FF]">17.3080° S, 178.4210° E</span>
                  <span>Speed: 1.5 kts</span>
                  <span>Outer Shelf</span>
                </div>
              </div>

              {/* Waypoint T+24h (Critical) */}
              <div className="p-2.5 rounded-lg bg-[#103B50] border-l-2 border-[#FFB547] flex flex-col gap-1 shadow-sm">
                <div className="flex items-center justify-between font-bold text-[#FFB547]">
                  <span>T+24h (11:18 UTC+1) — PRIMARY FIX</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FFB547]/20 text-[#FFB547] text-[10px]">±860m</span>
                </div>
                <div className="flex items-center justify-between text-[#EAF6FF] text-[11px]">
                  <span className="font-semibold">17.3295° S, 178.4290° E</span>
                  <span>Speed: 1.1 kts</span>
                  <span className="text-[#FF6B61] font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B61]" />
                    Reef Alert
                  </span>
                </div>
              </div>

              {/* Waypoint T+48h */}
              <div className="p-2.5 rounded-lg bg-[#0B2638]/70 border-l-2 border-[#16465A] flex flex-col gap-1 hover:bg-[#0B2638] transition-colors">
                <div className="flex items-center justify-between text-[#91A9BB]">
                  <span>T+48h (11:18 UTC+2)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#0B2638] text-[#91A9BB] text-[10px]">±1,850m</span>
                </div>
                <div className="flex items-center justify-between text-[#91A9BB] text-[11px]">
                  <span>17.3620° S, 178.4410° E</span>
                  <span>Speed: 0.8 kts</span>
                  <span>Dispersion Zone</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Model Confidence & Uncertainty Disclosure Panel */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00E5FF]" />
              <span className="font-display text-sm text-[#EAF6FF] font-semibold">Model Provenance & Uncertainty</span>
            </div>
            <p className="text-xs text-[#91A9BB] leading-relaxed">
              Runge-Kutta 4th-Order integration with stochastic turbulent dispersion (random walk Brownian motion).
            </p>

            <div className="space-y-2 font-mono text-xs">
              <div>
                <div className="flex justify-between text-[#91A9BB] mb-1">
                  <span>Sub-surface drag uncertainty</span>
                  <span className="text-[#EAF6FF]">±14%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0B2638] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00E5FF]" style={{ width: '14%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#91A9BB] mb-1">
                  <span>Tidal phase boundary error</span>
                  <span className="text-[#EAF6FF]">±8%</span>
                </div>
                <div className="w-full h-1.5 bg-[#0B2638] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D6A3]" style={{ width: '8%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[#91A9BB] mb-1">
                  <span>Composite Run Confidence</span>
                  <span className="text-[#00D6A3] font-bold">81.4% (Mod-High)</span>
                </div>
                <div className="w-full h-1.5 bg-[#0B2638] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00D6A3]" style={{ width: '81.4%' }} />
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0B2638] border border-[#16465A] text-[10px] text-[#91A9BB] leading-relaxed">
              <strong className="text-[#FFB547]">DEMONSTRATION RUN:</strong> Lagrangian drift vectors are numerical estimations based on simulated oceanographic models and should not be used as sole navigational guidance.
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM TACTICAL ACTION & SCENARIO COMPARISON DRAWER */}
      <section
        className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-lg"
        id="scenario-drawer"
        data-purpose="scenario-comparison-drawer"
      >
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
          {/* Scenario Radio Cards */}
          <div className="flex-1">
            <div className="font-mono text-xs text-[#91A9BB] uppercase tracking-wider mb-2">
              Hydrodynamic Scenarios (Sensitivity Analysis)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Scenario A */}
              <button
                onClick={() => {
                  setScenario('A');
                  showFeedback('Switched to Scenario A: Baseline HYCOM current 1.4 kts + ERA5 wind 14.2 kts.');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  scenario === 'A'
                    ? 'bg-[#103B50] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] hover:border-[#91A9BB]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full font-display text-sm font-semibold text-[#EAF6FF]">
                    <span>Scenario A (Baseline)</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-mono text-[9px] uppercase">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-1.5">HYCOM current 1.4 kts + ERA5 wind 14.2 kts. Leeway 2.8%.</p>
                </div>
                <span className="font-mono text-xs text-[#FF6B61] font-semibold mt-2.5">
                  Stranding: 19.5h (Tavaru Reef)
                </span>
              </button>

              {/* Scenario B */}
              <button
                onClick={() => {
                  setScenario('B');
                  showFeedback('Switched to Scenario B: +20% Wind gale surge simulation.');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  scenario === 'B'
                    ? 'bg-[#103B50] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] hover:border-[#91A9BB]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full font-display text-sm font-semibold text-[#EAF6FF]">
                    <span>Scenario B (+20% Wind)</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#0B2638] text-[#91A9BB] font-mono text-[9px] uppercase">
                      Alternate
                    </span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-1.5">Gale surge simulation with increased surface wave Stokes drift.</p>
                </div>
                <span className="font-mono text-xs text-[#FFB547] font-semibold mt-2.5">
                  Accelerated Stranding: 14.8h
                </span>
              </button>

              {/* Scenario C */}
              <button
                onClick={() => {
                  setScenario('C');
                  showFeedback('Switched to Scenario C: Deep submerged net sinking to -35m bathymetric contour.');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  scenario === 'C'
                    ? 'bg-[#103B50] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] hover:border-[#91A9BB]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between w-full font-display text-sm font-semibold text-[#EAF6FF]">
                    <span>Scenario C (Deep Submerged)</span>
                    <span className="px-1.5 py-0.5 rounded bg-[#0B2638] text-[#91A9BB] font-mono text-[9px] uppercase">
                      Subsurface
                    </span>
                  </div>
                  <p className="text-xs text-[#91A9BB] mt-1.5">Ballasted gillnet sinking to -35m bathymetric current layer.</p>
                </div>
                <span className="font-mono text-xs text-[#00D6A3] font-semibold mt-2.5">
                  Clears Island East (+3.2 NM)
                </span>
              </button>
            </div>
          </div>

          {/* Action Export Group */}
          <div className="flex flex-wrap xl:flex-col justify-end gap-2.5 flex-shrink-0 xl:min-w-[240px]">
            <button
              onClick={() => showFeedback('Exporting NetCDF (.nc) trajectory file containing 500 tracer time-series.')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] border border-[#16465A] hover:border-[#00E5FF] text-xs font-mono text-[#EAF6FF] transition-all"
            >
              <Download className="w-4 h-4 text-[#00E5FF]" />
              <span>Export NetCDF Trajectory</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] border border-[#16465A] hover:border-[#00E5FF] text-xs font-mono text-[#EAF6FF] transition-all"
            >
              <Printer className="w-4 h-4 text-[#75E6DA]" />
              <span>Print Hydrodynamic Report</span>
            </button>

            <Link
              to="/recovery-planning"
              state={{
                detection: activeObs,
                targetId: activeObs?.id,
                source: activeObs?.isSimulated ? 'demo-detection' : 'live-detection',
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] font-display text-xs font-bold shadow-[0_0_16px_rgba(0,229,255,0.35)] transition-all uppercase"
            >
              <span>Send to Recovery Planning</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default DriftForecast;
