import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  TrendingUp,
  AlertOctagon,
  Wind,
  Anchor,
  Compass,
  Maximize2,
  Minimize2,
  RotateCcw,
  Plus,
  Minus,
  Check,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Waves,
  ShieldAlert,
  Activity,
  Radio,
  Navigation,
  Layers,
  Cpu,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Droplets,
  Calendar
} from 'lucide-react';
import { useObservations } from '../context/ObservationContext';

export const GisDashboard = () => {
  const navigate = useNavigate();
  const { observations, setSelectedObservationId } = useObservations();

  // Map layer toggle states
  const [layers, setLayers] = useState({
    detections: true,
    drift: true,
    risk: true,
    bathymetry: true,
    currents: true,
  });

  // Map zoom and fullscreen states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState('OR-2024-094');
  const [dispatchedTargets, setDispatchedTargets] = useState({ 'OR-2024-094': false });
  const [sortOption, setSortOption] = useState('Risk Score ↓');

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleZoom = (delta) => {
    setZoomLevel((prev) => Math.min(Math.max(0.7, prev + delta), 1.8));
  };

  const toggleDispatch = (id) => {
    setDispatchedTargets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectObservation = (id) => {
    setSelectedTarget(id);
    if (setSelectedObservationId) {
      setSelectedObservationId(id);
    }
  };

  // Base observation list combined with context observations
  const priorityList = useMemo(() => {
    const defaultList = [
      {
        id: 'OR-2024-094',
        class_name: 'fishing_net',
        typeName: 'Ghost Gillnet (~45m span)',
        confidence: 0.942,
        riskScore: 96,
        severity: 'critical',
        coords: '17.286° S, 178.410° E',
        drift: 'SSE at 1.4 kts towards shallow reef crest',
        rationale: 'Immediate entanglement hazard to live Acropora coral colonies and green sea turtle nesting transit corridor.',
        depth: '-14m',
        heading: 'SSE 162°',
        badge: 'CRITICAL RISK 96/100'
      },
      {
        id: 'OR-2024-089',
        class_name: 'rope_line',
        typeName: 'Synthetic Mooring Line (~80m)',
        confidence: 0.896,
        riskScore: 68,
        severity: 'medium',
        coords: '17.341° S, 178.502° E',
        drift: 'S at 0.9 kts within coastal eddy',
        rationale: 'Semi-submerged navigation propeller hazard for local artisanal craft; stable coastal circulation.',
        depth: '-28m',
        heading: 'S 175°',
        badge: 'MEDIUM RISK 68/100'
      },
      {
        id: 'OR-2024-082',
        class_name: 'fishing_net',
        typeName: 'Trawl Net Bundle (~30m)',
        confidence: 0.910,
        riskScore: 88,
        severity: 'high',
        coords: '17.219° S, 178.384° E',
        drift: 'SSE at 1.1 kts along outer shelf',
        rationale: 'Near reserve northern pass; direct threat to manta ray foraging zone and coral shelf boundary.',
        depth: '-32m',
        heading: 'SSE 158°',
        badge: 'HIGH RISK 88/100'
      },
      {
        id: 'OR-2024-072',
        class_name: 'fishing_net',
        typeName: 'Fishnet Scrap Fragment (~12m)',
        confidence: 0.713,
        riskScore: 54,
        severity: 'medium',
        coords: '17.291° S, 178.398° E',
        drift: 'S at 0.6 kts along open trench',
        rationale: 'Fragmented netting buoyant at intermediate depth. Currently tracking south along open trench with low habitat impact.',
        depth: '-64m',
        heading: 'S 185°',
        badge: 'MONITORED 54/100'
      }
    ];

    // Check if there are live added observations in context that are not in default list
    if (observations && observations.length > 0) {
      const liveOnly = observations.filter(
        (o) => !defaultList.some((d) => d.id === o.id)
      );
      if (liveOnly.length > 0) {
        const formattedLive = liveOnly.map((o) => ({
          id: o.id,
          class_name: o.class_name || 'fishing_net',
          typeName: o.typeName || o.name || 'Live YOLOv8 Detection',
          confidence: o.confidence || 0.88,
          riskScore: o.riskScore || 75,
          severity: o.severity || (o.riskScore > 80 ? 'critical' : 'high'),
          coords: o.coords || 'Coordinates Pending GPS',
          drift: o.currentDrift || 'Projected S at 1.2 kts',
          rationale: o.warning || 'Live observation committed from YOLOv8 aerial review.',
          depth: o.depth || '-20m',
          heading: 'SSE 165°',
          badge: `${(o.severity || 'HIGH').toUpperCase()} ${o.riskScore || 75}/100`
        }));
        return [...formattedLive, ...defaultList];
      }
    }

    return defaultList;
  }, [observations]);

  // Sorted observations based on dropdown
  const sortedList = useMemo(() => {
    const list = [...priorityList];
    if (sortOption === 'Risk Score ↓') {
      return list.sort((a, b) => b.riskScore - a.riskScore);
    }
    if (sortOption === 'Time Detected') {
      return list;
    }
    if (sortOption === 'Proximity to Reef') {
      return list.sort((a, b) => (a.severity === 'critical' ? -1 : 1));
    }
    return list;
  }, [priorityList, sortOption]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1740px] mx-auto select-none font-sans antialiased">
      {/* 1. ATMOSPHERIC OCEAN COMMAND HERO */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#061522] via-[#082238] to-[#061522] border border-[#16465A] p-5 md:p-6 shadow-2xl">
        {/* Ambient Underwater Lighting & Caustics */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00E5FF]/10 via-[#00D6A3]/5 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#00D6A3]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Floating Underwater Plankton Particles */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <circle cx="8%" cy="25%" r="1.5" fill="#00E5FF" className="animate-plankton-1" />
          <circle cx="22%" cy="65%" r="2" fill="#75E6DA" className="animate-plankton-2" />
          <circle cx="45%" cy="30%" r="1" fill="#00D6A3" className="animate-plankton-1" />
          <circle cx="68%" cy="75%" r="2" fill="#00E5FF" className="animate-plankton-2" />
          <circle cx="85%" cy="35%" r="1.5" fill="#75E6DA" className="animate-plankton-1" />
          <circle cx="92%" cy="60%" r="2" fill="#00D6A3" className="animate-plankton-2" />
        </svg>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Hero Title & Telemetry Specs */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                ACTIVE MARITIME SECTOR
              </span>
              <span className="text-[11px] font-mono text-[#91A9BB]">
                Lau Basin &amp; Tavaru Coral Reserve Sector 4
              </span>
            </div>

            <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-[#EAF6FF] tracking-tight flex items-center gap-3">
              <span>Ocean Intelligence Command</span>
              <span className="hidden sm:inline-block text-xs font-mono font-normal px-2.5 py-1 rounded-md bg-[#103B50]/60 border border-[#16465A] text-[#75E6DA]">
                WGS84 • 17.286° S, 178.410° E
              </span>
            </h1>

            <p className="text-xs md:text-sm font-mono text-[#91A9BB] max-w-3xl leading-relaxed">
              Hydrodynamic Lagrangian drift forecasting integrated with YOLOv8-seg aerial surveillance. Real-time habitat geofencing protecting critical Acropora coral nurseries and marine turtle corridors.
            </p>

            {/* Live Operational Ribbon */}
            <div className="pt-2 flex flex-wrap items-center gap-2 md:gap-4 text-[11px] font-mono text-[#91A9BB]">
              <div className="flex items-center gap-1.5 bg-[#0B2638]/80 px-2.5 py-1 rounded-md border border-[#16465A]">
                <Activity className="w-3.5 h-3.5 text-[#00D6A3]" />
                <span>HYCOM 1/12° SST: <strong className="text-[#EAF6FF]">1.42 kts @ 162° SSE</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0B2638]/80 px-2.5 py-1 rounded-md border border-[#16465A]">
                <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>RADAR INGEST: <strong className="text-[#00E5FF]">SENTINEL-2 / UAV</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#0B2638]/80 px-2.5 py-1 rounded-md border border-[#16465A]">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FF6B61]" />
                <span>GEOFENCE: <strong className="text-[#FF6B61]">1 PROXIMITY ALERT</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/detection-review"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#00D6A3] text-[#061522] font-display font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.35)] hover:shadow-[0_0_25px_rgba(0,229,255,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-[#061522]" />
              <span>Run AI Detection</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#061522]" />
            </Link>

            <Link
              to="/ocean-map"
              className="px-4 py-2.5 rounded-xl bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] font-display font-semibold text-xs flex items-center gap-2 border border-[#16465A] hover:border-[#00E5FF]/40 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#00E5FF]" />
              <span>Full Ocean GIS Map</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. KPI SUMMARY CARDS (4 CLEAN METRICS) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-purpose="kpi-metrics-row">
        {/* Metric 1: Total Detections */}
        <div className="group relative overflow-hidden rounded-xl bg-[#0B2638] border border-[#16465A] hover:border-[#00E5FF]/60 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00E5FF]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#91A9BB]">
              <span className="font-semibold tracking-wider">TOTAL DETECTIONS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/30">
                YOLOv8-seg
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-display font-bold text-[#EAF6FF] tracking-tight">
                148
              </span>
              <span className="text-xs font-mono font-semibold text-[#00D6A3] flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" /> +12 past 24h
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#91A9BB] font-mono leading-tight">
            Accumulated visual detections from Sentinel-2 &amp; aerial UAV passes.
          </p>
        </div>

        {/* Metric 2: High-Risk Detections */}
        <div className="group relative overflow-hidden rounded-xl bg-[#0B2638] border border-[#16465A] hover:border-[#FF6B61]/60 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF6B61] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#FF6B61]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#91A9BB]">
              <span className="font-semibold tracking-wider text-[#FF6B61]">HIGH-RISK HAZARDS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FF6B61]/15 text-[#FF6B61] border border-[#FF6B61]/40 animate-pulse">
                Action Required
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-display font-bold text-[#FF6B61] tracking-tight">
                09
              </span>
              <span className="text-xs font-mono font-medium text-[#FF6B61]/90">
                Immediate threat
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#91A9BB] font-mono leading-tight">
            Tavaru coral nursery zone &amp; sea turtle transit corridor proximity.
          </p>
        </div>

        {/* Metric 3: Active Drift Forecasts */}
        <div className="group relative overflow-hidden rounded-xl bg-[#0B2638] border border-[#16465A] hover:border-[#00E5FF]/60 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00E5FF]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#91A9BB]">
              <span className="font-semibold tracking-wider">DRIFT FORECASTS</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                48h Projected
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-display font-bold text-[#00E5FF] tracking-tight">
                24
              </span>
              <span className="text-xs font-mono text-[#75E6DA]">
                Lagrangian vectors
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#91A9BB] font-mono leading-tight">
            Active hydrodynamic simulations driven by HYCOM &amp; tidal models.
          </p>
        </div>

        {/* Metric 4: Recovery Priorities */}
        <div className="group relative overflow-hidden rounded-xl bg-[#0B2638] border border-[#16465A] hover:border-[#FFB547]/60 transition-all duration-300 p-5 shadow-lg flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFB547] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#FFB547]/5 rounded-full pointer-events-none group-hover:scale-125 transition-transform" />

          <div>
            <div className="flex items-center justify-between text-xs font-mono text-[#91A9BB]">
              <span className="font-semibold tracking-wider">RECOVERY PRIORITIES</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#FFB547]/15 text-[#FFB547] border border-[#FFB547]/40">
                2 Vessels Ready
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <span className="text-3xl md:text-4xl font-display font-bold text-[#FFB547] tracking-tight">
                05
              </span>
              <span className="text-xs font-mono text-[#91A9BB]">
                Assigned in queue
              </span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-[#91A9BB] font-mono leading-tight">
            Ready for tactical salvage dispatch and vessel route assignment.
          </p>
        </div>
      </section>

      {/* 3. MAIN MIDDLE SPLIT: GIS OCEAN MAP (Col 8) + PRIORITY OBSERVATIONS (Col 4) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="gis-map-and-priority-panel">
        {/* Ocean GIS Map Centerpiece */}
        <div
          className={`lg:col-span-8 bg-[#0B2638] border border-[#16465A] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative transition-all ${
            isFullscreen ? 'fixed inset-4 z-50 bg-[#061522]' : ''
          }`}
        >
          {/* Map Top Toolbar with Glowing Controls */}
          <div className="p-3.5 bg-[#071D33]/95 border-b border-[#16465A] flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Layer Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-[#91A9BB] mr-1 font-semibold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-[#00E5FF]" /> LAYERS:
              </span>

              <label
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition select-none text-[11px] font-mono ${
                  layers.detections
                    ? 'bg-[#103B50] border-[#00E5FF]/50 text-[#EAF6FF] shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] text-[#91A9BB] hover:border-[#16465A]/80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers.detections}
                  onChange={() => toggleLayer('detections')}
                  className="rounded border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 bg-[#061522]"
                />
                <span>YOLOv8 Targets</span>
              </label>

              <label
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition select-none text-[11px] font-mono ${
                  layers.drift
                    ? 'bg-[#103B50] border-[#00E5FF]/50 text-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] text-[#91A9BB]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers.drift}
                  onChange={() => toggleLayer('drift')}
                  className="rounded border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 bg-[#061522]"
                />
                <span>Drift Vectors</span>
              </label>

              <label
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition select-none text-[11px] font-mono ${
                  layers.risk
                    ? 'bg-[#103B50] border-[#FF6B61]/50 text-[#FF6B61] shadow-[0_0_8px_rgba(255,107,97,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] text-[#91A9BB]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers.risk}
                  onChange={() => toggleLayer('risk')}
                  className="rounded border-[#16465A] text-[#FF6B61] focus:ring-0 w-3.5 h-3.5 bg-[#061522]"
                />
                <span>Reef Reserve</span>
              </label>

              <label
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition select-none text-[11px] font-mono ${
                  layers.bathymetry
                    ? 'bg-[#103B50] border-[#75E6DA]/40 text-[#75E6DA]'
                    : 'bg-[#0B2638] border-[#16465A] text-[#91A9BB]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers.bathymetry}
                  onChange={() => toggleLayer('bathymetry')}
                  className="rounded border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 bg-[#061522]"
                />
                <span>Depth Contours</span>
              </label>

              <label
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border cursor-pointer transition select-none text-[11px] font-mono ${
                  layers.currents
                    ? 'bg-[#103B50] border-[#00D6A3]/50 text-[#00D6A3] shadow-[0_0_8px_rgba(0,214,163,0.2)]'
                    : 'bg-[#0B2638] border-[#16465A] text-[#91A9BB]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={layers.currents}
                  onChange={() => toggleLayer('currents')}
                  className="rounded border-[#16465A] text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 bg-[#061522]"
                />
                <span className="flex items-center gap-1">
                  <Waves className="w-3 h-3 text-[#00D6A3]" /> Currents
                </span>
              </label>
            </div>

            {/* HUD Coordinate / Depth Telemetry */}
            <div className="hidden xl:flex items-center gap-3 font-mono text-[10px] text-[#91A9BB] bg-[#061522]/90 px-3 py-1.5 rounded-lg border border-[#16465A]">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                <span className="text-[#00E5FF] font-semibold">TARGET:</span> 17.2860° S, 178.4100° E
              </span>
              <span className="text-[#16465A]">|</span>
              <span className="text-[#75E6DA]">DEPTH: -38.4m</span>
              <span className="text-[#16465A]">|</span>
              <span className="text-[#91A9BB]">FLOW: 1.42 kts @ 162°</span>
            </div>
          </div>

          {/* Interactive Marine Map Canvas */}
          <div className="relative flex-1 min-h-[540px] bg-[#04101B] bg-hydro-grid overflow-hidden flex flex-col justify-between p-6 select-none">
            {/* Deep Water Radial Caustic Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_35%,_rgba(0,229,255,0.06),_transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_65%,_rgba(0,214,163,0.05),_transparent_60%)] pointer-events-none" />

            {/* Transform container for zoom */}
            <div
              className="absolute inset-0 transition-transform duration-300 origin-center"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {/* Bathymetric Depth SVG Lines Background */}
              {layers.bathymetry && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50">
                  <path d="M-100,200 Q200,80 500,220 T1100,180" fill="none" stroke="#16465A" strokeDasharray="4,4" strokeWidth="1.2" />
                  <text x="60" y="160" fill="#75E6DA" fontFamily="JetBrains Mono" fontSize="8" opacity="0.6">-20m Shelf</text>

                  <path d="M-50,320 Q240,240 540,360 T1150,310" fill="none" stroke="#16465A" strokeWidth="1.5" />
                  <text x="80" y="290" fill="#75E6DA" fontFamily="JetBrains Mono" fontSize="8" opacity="0.6">-50m Contour</text>

                  <path d="M-20,440 Q300,380 620,480 T1200,430" fill="none" stroke="#103B50" strokeWidth="1.2" />
                  <text x="120" y="420" fill="#75E6DA" fontFamily="JetBrains Mono" fontSize="8" opacity="0.6">-100m Dropoff</text>

                  <path d="M50,120 Q350,60 700,140 T1300,100" fill="none" stroke="#16465A" strokeDasharray="3,5" strokeWidth="0.8" />
                  <text x="180" y="90" fill="#75E6DA" fontFamily="JetBrains Mono" fontSize="8" opacity="0.6">-200m Deep Trench</text>
                </svg>
              )}

              {/* Animated Current Streamlines (Living Water Effect) */}
              {layers.currents && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <linearGradient id="currentCyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.1" />
                      <stop offset="50%" stopColor="#00E5FF" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#00D6A3" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>

                  {/* Flowing current vectors across the basin toward SSE */}
                  <path
                    d="M 60,380 C 220,360 320,310 460,330 C 600,350 720,420 880,390"
                    fill="none"
                    stroke="url(#currentCyanGrad)"
                    strokeWidth="1.8"
                    strokeDasharray="8,16"
                    className="animate-current-flow"
                  />
                  <path
                    d="M 80,240 C 240,210 340,170 480,190 C 620,210 740,270 900,250"
                    fill="none"
                    stroke="url(#currentCyanGrad)"
                    strokeWidth="1.4"
                    strokeDasharray="6,14"
                    className="animate-current-flow-slow"
                  />
                  <path
                    d="M 120,490 C 280,470 380,440 540,460 C 680,480 800,530 940,510"
                    fill="none"
                    stroke="url(#currentCyanGrad)"
                    strokeWidth="1.2"
                    strokeDasharray="6,12"
                    className="animate-current-flow"
                  />
                  <path
                    d="M 30,120 C 200,90 320,80 460,110 C 600,140 760,160 920,130"
                    fill="none"
                    stroke="url(#currentCyanGrad)"
                    strokeWidth="1"
                    strokeDasharray="5,15"
                    className="animate-current-flow-slow"
                  />
                </svg>
              )}

              {/* Vector Layer: Reserve Polygons & Lagrangian Drift Tracks */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="driftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B61" stopOpacity="0.95" />
                    <stop offset="35%" stopColor="#FFB547" stopOpacity="0.85" />
                    <stop offset="70%" stopColor="#00E5FF" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#75E6DA" stopOpacity="0.3" />
                  </linearGradient>
                  <marker id="gisArrow" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto-start-reverse" viewBox="0 0 10 10">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#00E5FF" />
                  </marker>
                </defs>

                {/* Risk Zones: Tavaru Reef Marine Reserve */}
                {layers.risk && (
                  <>
                    <polygon
                      points="340,140 680,180 760,360 480,410 320,310"
                      fill="rgba(255, 107, 97, 0.08)"
                      stroke="#FF6B61"
                      strokeWidth="1.8"
                      strokeDasharray="6,4"
                      className="drop-shadow-[0_0_8px_rgba(255,107,97,0.3)]"
                    />
                    <text x="440" y="210" fill="#FF6B61" fontFamily="JetBrains Mono" fontSize="11" fontWeight="600" opacity="0.9">
                      Tavaru Reef Marine Reserve
                    </text>
                    <text x="440" y="226" fill="#91A9BB" fontFamily="JetBrains Mono" fontSize="9">
                      Critical Coral Nursery Zone [RESTRICTED]
                    </text>

                    {/* Secondary Zone B */}
                    <circle cx="210" cy="380" r="85" fill="rgba(0, 229, 255, 0.04)" stroke="#16B8A6" strokeWidth="1.2" strokeDasharray="4,4" />
                    <text x="165" y="385" fill="#16B8A6" fontFamily="JetBrains Mono" fontSize="10">
                      ZONE B: SHALLOW LAGOON
                    </text>
                  </>
                )}

                {/* Drift Trajectory Curve for OR-094 */}
                {layers.drift && (
                  <>
                    <path
                      d="M 520,270 C 580,290 630,340 690,440"
                      fill="none"
                      stroke="url(#driftGradient)"
                      strokeWidth="2.5"
                      strokeDasharray="6,3"
                      markerEnd="url(#gisArrow)"
                      className="drop-shadow-[0_0_6px_rgba(0,229,255,0.4)]"
                    />
                    <circle cx="585" cy="315" r="4" fill="#FFB547" stroke="#061522" strokeWidth="1.5" />
                    <text x="595" y="318" fill="#FFB547" fontFamily="JetBrains Mono" fontSize="9">+12h (1.4kts)</text>

                    <circle cx="635" cy="365" r="4" fill="#00E5FF" stroke="#061522" strokeWidth="1.5" />
                    <text x="645" y="368" fill="#00E5FF" fontFamily="JetBrains Mono" fontSize="9">+24h (1.2kts)</text>

                    <circle cx="675" cy="420" r="4" fill="#75E6DA" stroke="#061522" strokeWidth="1.5" />
                    <text x="685" y="423" fill="#75E6DA" fontFamily="JetBrains Mono" fontSize="9">+48h Projected</text>
                  </>
                )}
              </svg>

              {/* Detection Markers */}
              {layers.detections && (
                <>
                  {/* Detection 1: OR-2024-094 (Primary Critical Target) */}
                  <div
                    onClick={() => handleSelectObservation('OR-2024-094')}
                    className="absolute top-[260px] left-[510px] pointer-events-auto cursor-pointer group z-20"
                  >
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-[#FF6B61]/25 pulse-ring pointer-events-none" />
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-[#FF6B61]/20 pulse-ring-delayed pointer-events-none" />
                    <div className="relative w-4 h-4 rounded-full bg-[#FF6B61] border-2 border-white shadow-[0_0_15px_#FF6B61] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>

                    {/* Tooltip HUD Tag */}
                    <div className="absolute left-6 -top-10 w-56 bg-[#071D33]/95 border border-[#FF6B61]/70 rounded-xl p-2.5 text-xs backdrop-blur-md shadow-2xl transition-transform group-hover:scale-105">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-[#FF6B61] font-bold font-display tracking-wide">#OR-2024-094</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#FF6B61]/20 text-[#FF6B61] font-semibold border border-[#FF6B61]/40">
                          CRITICAL 96/100
                        </span>
                      </div>
                      <div className="text-[10px] text-[#EAF6FF] font-mono mt-1 font-medium">Ghost Gillnet (~45m span)</div>
                      <div className="text-[9px] text-[#75E6DA] font-mono mt-0.5">Depth: 14m • Heading: SSE 162°</div>
                      <div className="mt-2 pt-1.5 border-t border-[#16465A] flex items-center justify-between text-[9px] font-mono text-[#00E5FF]">
                        <span>Click to Inspect Target</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>

                  {/* Detection 2: OR-2024-089 */}
                  <div
                    onClick={() => handleSelectObservation('OR-2024-089')}
                    className="absolute top-[180px] left-[260px] pointer-events-auto cursor-pointer group z-10"
                  >
                    <div className="relative w-3.5 h-3.5 rounded-full bg-[#FFB547] border border-white shadow-[0_0_10px_#FFB547]" />
                    <div className="absolute left-5 -top-3 px-2 py-0.5 rounded-md bg-[#071D33]/95 border border-[#FFB547]/50 text-[10px] font-mono text-[#EAF6FF] whitespace-nowrap shadow-lg">
                      #OR-089 • rope_line (89.6%)
                    </div>
                  </div>

                  {/* Detection 3: OR-2024-072 */}
                  <div
                    onClick={() => handleSelectObservation('OR-2024-072')}
                    className="absolute top-[370px] left-[320px] pointer-events-auto cursor-pointer group z-10"
                  >
                    <div className="relative w-3 h-3 rounded-full bg-[#00D6A3] border border-white shadow-[0_0_8px_#00D6A3]" />
                    <div className="absolute left-4 -top-2 px-1.5 py-0.5 rounded-md bg-[#071D33]/90 border border-[#16465A] text-[9px] font-mono text-[#91A9BB] whitespace-nowrap">
                      #OR-072 • 71.3%
                    </div>
                  </div>

                  {/* Detection 4: OR-2024-082 */}
                  <div
                    onClick={() => handleSelectObservation('OR-2024-082')}
                    className="absolute top-[170px] left-[610px] pointer-events-auto cursor-pointer group z-10"
                  >
                    <div className="relative w-3.5 h-3.5 rounded-full bg-[#FF6B61] border border-white shadow-[0_0_10px_#FF6B61]" />
                    <div className="absolute left-5 -top-3 px-2 py-0.5 rounded-md bg-[#071D33]/95 border border-[#FF6B61]/50 text-[10px] font-mono text-[#FF6B61] whitespace-nowrap shadow-lg">
                      #OR-082 • fishing_net (91.0%)
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Map Header Overlay Badges */}
            <div className="relative z-10 flex items-start justify-between flex-wrap gap-2">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#071D33]/90 border border-[#16465A] backdrop-blur-md shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></span>
                  <span className="text-xs font-mono font-medium text-[#EAF6FF]">
                    SECTOR: LAU BASIN &amp; TAVARU REEF CORRIDOR
                  </span>
                </div>
                <div className="mt-1 text-[10px] font-mono text-[#75E6DA] pl-1">
                  RADAR FREQUENCY: 1.2 GHz • SATELLITE: SENTINEL-2 / UAV SYNC
                </div>
              </div>

              <div className="bg-amber-500/10 border border-[#FFB547]/40 text-[#FFB547] px-3 py-1 rounded-lg text-[10px] font-mono font-medium tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547] animate-pulse"></span>
                <span>SIMULATED DATASET RUN</span>
              </div>
            </div>

            {/* Map Bottom Controls & Floating Legend */}
            <div className="relative z-10 flex items-end justify-between pt-20 flex-wrap gap-3">
              {/* Scale Bar & Nautical Compass */}
              <div className="flex items-center gap-4 bg-[#071D33]/90 border border-[#16465A] backdrop-blur-md px-3.5 py-2 rounded-xl text-[10px] font-mono shadow-xl">
                <div className="flex items-center gap-1.5 border-r border-[#16465A] pr-3">
                  <Compass className="w-4 h-4 text-[#00E5FF] animate-wave-sway" />
                  <span className="font-bold text-[#EAF6FF]">N</span>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-[#91A9BB] mb-0.5">
                    <span>0</span>
                    <span>5 km</span>
                    <span>10 km</span>
                  </div>
                  <div className="h-1.5 w-28 border-b-2 border-l-2 border-r-2 border-[#00E5FF] flex rounded-sm overflow-hidden">
                    <div className="w-1/2 bg-[#00E5FF]/40"></div>
                    <div className="w-1/2 bg-[#00E5FF]/90"></div>
                  </div>
                </div>
              </div>

              {/* Compact Map Legend */}
              <div className="hidden sm:flex items-center gap-3.5 bg-[#071D33]/90 border border-[#16465A] backdrop-blur-md px-3.5 py-2 rounded-xl text-[10px] font-mono shadow-xl">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B61] inline-block shadow-[0_0_6px_#FF6B61]"></span>
                  <span className="text-[#91A9BB]">Ghost Net (High)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB547] inline-block"></span>
                  <span className="text-[#91A9BB]">Rope Line</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-[#00E5FF] inline-block border-t border-dashed"></span>
                  <span className="text-[#91A9BB]">Lagrangian Drift</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 border border-dashed border-[#FF6B61] bg-[#FF6B61]/20 inline-block"></span>
                  <span className="text-[#91A9BB]">Reserve Geofence</span>
                </div>
              </div>

              {/* Floating Zoom & Fullscreen Controls */}
              <div className="flex flex-col gap-1.5 bg-[#071D33]/90 border border-[#16465A] rounded-xl p-1.5 backdrop-blur-md shadow-xl">
                <button
                  onClick={() => handleZoom(0.15)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#103B50] text-[#EAF6FF] hover:bg-[#00E5FF] hover:text-[#061522] transition-colors text-sm font-bold"
                  title="Zoom In"
                  aria-label="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleZoom(-0.15)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#103B50] text-[#EAF6FF] hover:bg-[#00E5FF] hover:text-[#061522] transition-colors text-sm font-bold"
                  title="Zoom Out"
                  aria-label="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF] transition-colors"
                  title="Reset Zoom"
                  aria-label="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#103B50] text-[#91A9BB] hover:text-[#EAF6FF] transition-colors"
                  title="Toggle Fullscreen"
                  aria-label="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Priority Observations Panel */}
        <div
          className="lg:col-span-4 bg-[#0B2638] border border-[#16465A] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl"
          data-purpose="priority-observations-panel"
        >
          {/* Panel Header */}
          <div className="p-4 border-b border-[#16465A] bg-[#071D33]/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-display font-bold text-[#EAF6FF] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-[#FF6B61]" />
                Priority Hazards
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FF6B61]/20 text-[#FF6B61] border border-[#FF6B61]/40">
                {sortedList.length} QUEUED
              </span>
            </div>

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="bg-[#103B50] border border-[#16465A] rounded-lg text-[11px] font-mono text-[#EAF6FF] py-1 px-2.5 focus:outline-none focus:border-[#00E5FF] cursor-pointer"
            >
              <option>Risk Score ↓</option>
              <option>Time Detected</option>
              <option>Proximity to Reef</option>
            </select>
          </div>

          {/* Observations Card List */}
          <div className="p-4 space-y-3 overflow-y-auto max-h-[540px]">
            {sortedList.map((obs) => {
              const isSelected = selectedTarget === obs.id;
              const isDispatched = !!dispatchedTargets[obs.id];
              const isCritical = obs.severity === 'critical';
              const isHigh = obs.severity === 'high';

              return (
                <div
                  key={obs.id}
                  onClick={() => handleSelectObservation(obs.id)}
                  className={`p-3.5 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#103B50]/60 border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                      : 'bg-[#071D33]/60 border-[#16465A] hover:border-[#00E5FF]/40 hover:bg-[#071D33]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-[#00E5FF]">
                        #{obs.id}
                      </span>
                      <p className="text-sm font-semibold text-[#EAF6FF] mt-0.5 leading-tight">
                        {obs.typeName}
                      </p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap border ${
                        isCritical
                          ? 'bg-[#FF6B61]/20 text-[#FF6B61] border-[#FF6B61]/40'
                          : isHigh
                          ? 'bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/40'
                          : 'bg-[#00D6A3]/20 text-[#00D6A3] border-[#00D6A3]/40'
                      }`}
                    >
                      {obs.badge}
                    </span>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono text-[#91A9BB] bg-[#061522]/70 p-2 rounded-lg border border-[#16465A]/50">
                    <div>
                      <span className="text-[10px] text-[#91A9BB] block">CONFIDENCE</span>
                      <span className="text-[#EAF6FF] font-semibold">
                        {(obs.confidence * 100).toFixed(1)}% (YOLOv8)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#91A9BB] block">COORDINATES</span>
                      <span className="text-[#EAF6FF] truncate block">
                        {obs.coords}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-[#16465A]/40">
                      <span className="text-[10px] text-[#75E6DA] block">DRIFT VECTOR</span>
                      <span className="text-[#EAF6FF]">
                        {obs.drift}
                      </span>
                    </div>
                  </div>

                  {/* Risk Rationale */}
                  <p className="mt-2 text-xs text-[#91A9BB] leading-relaxed line-clamp-2">
                    <strong className={isCritical ? 'text-[#FF6B61]' : isHigh ? 'text-[#FFB547]' : 'text-[#75E6DA]'}>
                      Risk:
                    </strong>{' '}
                    {obs.rationale}
                  </p>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#16465A]/40">
                    <Link
                      to="/detection-details"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectObservation(obs.id);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,229,255,0.25)]"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDispatch(obs.id);
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-mono border transition-all ${
                        isDispatched
                          ? 'bg-[#00D6A3]/20 border-[#00D6A3] text-[#00D6A3] font-semibold'
                          : 'bg-[#103B50] border-[#16465A] text-[#EAF6FF] hover:bg-[#16465A]'
                      }`}
                    >
                      {isDispatched ? '✓ Task Assigned' : 'Dispatch Task'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Operational Decision Support Note */}
          <div className="p-3 bg-[#071D33] border-t border-[#16465A] text-[10px] font-mono text-[#91A9BB] text-center leading-normal">
            * Detections and risk indexes are algorithmic estimations generated for operational decision support.
          </div>
        </div>
      </section>

      {/* 4. BOTTOM ANALYTICS ROW: 3 EQUAL COLUMN CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6" data-purpose="bottom-telemetry-and-analytics">
        {/* Card 1: AI Detection Overview (YOLOv8 Distribution) */}
        <div className="bg-[#0B2638] border border-[#16465A] rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16465A]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-xs font-mono font-bold text-[#EAF6FF] tracking-wide uppercase">
                  AI Detection Distribution
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/30">
                YOLOv8s-seg
              </span>
            </div>

            {/* Distribution breakdown */}
            <div className="mt-4 space-y-3 font-mono">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#EAF6FF] font-medium">fishing_net</span>
                  <span className="text-[#00E5FF] font-bold">68% (101 items)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#103B50] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00D6A3] rounded-full" style={{ width: '68%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#EAF6FF] font-medium">rope_line</span>
                  <span className="text-[#75E6DA] font-bold">32% (47 items)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#103B50] overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#75E6DA] to-[#00E5FF] rounded-full" style={{ width: '32%' }}></div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#071D33]/70 border border-[#16465A] text-center font-mono">
              <div>
                <div className="text-[10px] text-[#91A9BB]">Mean Confidence</div>
                <div className="text-sm font-bold text-[#EAF6FF] mt-0.5">88.4% mAP50</div>
              </div>
              <div>
                <div className="text-[10px] text-[#91A9BB]">Avg Inference Latency</div>
                <div className="text-sm font-bold text-[#00E5FF] mt-0.5">42 ms / frame</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#16465A]/60 flex items-center justify-between text-[11px] text-[#91A9BB] font-mono">
            <span>Orthoimagery &amp; UAV dataset</span>
            <Link to="/detection-review" className="text-[#00E5FF] hover:underline flex items-center gap-1 font-semibold">
              Inspect Pipeline →
            </Link>
          </div>
        </div>

        {/* Card 2: Oceanographic & Environmental Conditions */}
        <div className="bg-[#0B2638] border border-[#16465A] rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16465A]">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-[#00D6A3] animate-wave-sway" />
                <h3 className="text-xs font-mono font-bold text-[#EAF6FF] tracking-wide uppercase">
                  Environmental Conditions
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#103B50] text-[#00D6A3] border border-[#00D6A3]/30">
                HYCOM / NOAA
              </span>
            </div>

            {/* Telemetry Rows */}
            <div className="mt-4 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between py-1 border-b border-[#16465A]/40">
                <span className="text-[#91A9BB] flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-[#00E5FF] rotate-[162deg]" />
                  Sea Surface Current:
                </span>
                <span className="text-[#EAF6FF] font-semibold">1.42 kts @ 162° SSE</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#16465A]/40">
                <span className="text-[#91A9BB] flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-[#75E6DA]" />
                  Wind Vector:
                </span>
                <span className="text-[#EAF6FF] font-semibold">14.5 kts (Trade Wind ENE)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#16465A]/40">
                <span className="text-[#91A9BB] flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5 text-[#91A9BB]" />
                  Significant Wave Height:
                </span>
                <span className="text-[#EAF6FF] font-semibold">1.8 m (Period 7.2s)</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#16465A]/40">
                <span className="text-[#91A9BB] flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[#00D6A3]" />
                  Water Temperature:
                </span>
                <span className="text-[#00E5FF] font-semibold">24.6°C (Tropical shelf)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#91A9BB] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#B8A4FF]" />
                  Tide State:
                </span>
                <span className="text-[#EAF6FF] font-semibold">Ebb tide (-0.4m below datum)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#16465A]/60 flex items-center justify-between text-[11px] font-mono text-[#91A9BB]">
            <span>NOAA WaveWatch III &amp; HYCOM</span>
            <Link to="/drift-forecast" className="text-[#00E5FF] hover:underline flex items-center gap-1 font-semibold">
              Drift Model →
            </Link>
          </div>
        </div>

        {/* Card 3: Recent Activity & Audit Timeline */}
        <div className="bg-[#0B2638] border border-[#16465A] rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#16465A]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-xs font-mono font-bold text-[#EAF6FF] tracking-wide uppercase">
                  Operational Audit Log
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#00D6A3] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3] animate-pulse"></span> LIVE FEED
              </span>
            </div>

            {/* Activity Timeline List */}
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#00E5FF] mt-1 flex-shrink-0 shadow-[0_0_6px_#00E5FF]" />
                <div>
                  <p className="text-[#EAF6FF] text-[11px] leading-tight">
                    Drift trajectory updated for <span className="text-[#00E5FF] font-bold">#OR-2024-094</span> based on ebb current vector.
                  </p>
                  <span className="text-[10px] text-[#91A9BB]">12m ago • Lagrangian Engine</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#00D6A3] mt-1 flex-shrink-0 shadow-[0_0_6px_#00D6A3]" />
                <div>
                  <p className="text-[#EAF6FF] text-[11px] leading-tight">
                    YOLOv8 inference completed on UAV Survey Batch #42 (3 nets, 1 rope line identified).
                  </p>
                  <span className="text-[10px] text-[#91A9BB]">34m ago • Edge Inference</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#B8A4FF] mt-1 flex-shrink-0 shadow-[0_0_6px_#B8A4FF]" />
                <div>
                  <p className="text-[#EAF6FF] text-[11px] leading-tight">
                    Observation <span className="text-[#B8A4FF]">OR-2024-081</span> marked verified by marine GIS analyst.
                  </p>
                  <span className="text-[10px] text-[#91A9BB]">1h ago • Analyst Lead</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#FF6B61] mt-1 flex-shrink-0 shadow-[0_0_6px_#FF6B61]" />
                <div>
                  <p className="text-[#EAF6FF] text-[11px] leading-tight">
                    High-risk proximity threshold alert triggered on <span className="text-[#FF6B61] font-medium">Tavaru Reef Reserve</span>.
                  </p>
                  <span className="text-[10px] text-[#91A9BB]">2h ago • Automated Geofence</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#16465A]/60 flex items-center justify-between text-[11px] font-mono text-[#91A9BB]">
            <span className="text-[#00D6A3] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SYSTEM 100% ONLINE
            </span>
            <Link to="/data-sources" className="text-[#00E5FF] hover:underline flex items-center gap-0.5 font-semibold">
              Full Log →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GisDashboard;
