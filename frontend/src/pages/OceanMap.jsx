import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  Layers,
  Compass,
  Maximize2,
  Plus,
  Minus,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  Crosshair,
  ShieldAlert,
  AlertTriangle,
  Waves,
  Wind,
  Activity,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Check,
  Radio,
  Cpu,
  ArrowRight
} from 'lucide-react';

export const OceanMap = () => {
  const navigate = useNavigate();
  const {
    observations,
    locatedObservations,
    unlocatedObservations,
    selectedObservationId,
    setSelectedObservationId,
    selectedObservation,
  } = useObservations();

  const selectedTargetId = selectedObservationId || 'OR-2024-094';
  const setSelectedTargetId = setSelectedObservationId;

  // Filter state
  const [targetFilter, setTargetFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [temporalFilter, setTemporalFilter] = useState('24h');
  const [minConf, setMinConf] = useState(70);

  // Basemap style: hydro, sar, dark
  const [basemap, setBasemap] = useState('hydro');
  const [activeTool, setActiveTool] = useState(null); // 'ruler', 'polygon', 'utm'

  // Map layer toggle states
  const [layers, setLayers] = useState({
    detections: true,
    drift: true,
    sanctuary: true,
    currents: true,
    winds: false,
    waves: false,
    bathymetry: true,
  });

  // Map zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [toastMessage, setToastMessage] = useState(null);

  // Fallback demo targets data
  const targetsData = {
    'OR-2024-094': {
      id: 'OR-2024-094',
      name: 'GHOST GILLNET • 45m',
      type: 'fishing_net',
      typeName: 'Ghost Gillnet (45m)',
      confidence: 94.2,
      riskScore: 96,
      severity: 'critical',
      coords: '17.2860° S, 178.4100° E',
      utmCoords: 'Zone 60S 649821E 8088450N',
      currentDrift: '1.4 kts @ 165° SSE (Simulated)',
      depth: '-38.4m Depth (Simulated)',
      localDepth: '-42.1 m',
      timeToStranding: 'Est. 8h 40m',
      strandingPercent: 84,
      estArea: '340 m²',
      sector: 'Tavaru Nursery Sector 4',
      warning:
        'CRITICAL IMPACT WARNING: Drifting southward along shelf boundary toward Tavaru Marine Reserve Zone A. High entanglement risk to endangered green sea turtles & shallow Acropora reef structures.',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
      cx: 420,
      cy: 290
    },
    'OR-2024-089': {
      id: 'OR-2024-089',
      name: 'MOORING ROPE • 80m',
      type: 'rope_line',
      typeName: 'Mooring Line (80m)',
      confidence: 89.6,
      riskScore: 78,
      severity: 'high',
      coords: '17.2841° S, 178.4012° E',
      utmCoords: 'Zone 60S 648910E 8088620N',
      currentDrift: '0.9 kts @ 170° S (Simulated)',
      depth: '-28.0m Depth (Simulated)',
      localDepth: '-32.5 m',
      timeToStranding: 'Est. 14h 20m',
      strandingPercent: 62,
      estArea: '160 m²',
      sector: 'Western Channel Shoals',
      warning:
        'HIGH THREAT ADVISORY: Heavy poly-synthetic hawser drifting toward artisanal navigation corridor. Risk of propeller fouling and seafloor scouring.',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBtHN0aQp_cDKWLH5c2ePgRxNfrR1GoXfnl9BjQnastQWWaxhG-3QvoFyV-9vcDjcNESbY5kI4Qf3TidJV_PvBd11n9a8lpaqWkglaZZfXNhntN9Bd2uFe-3a36n9E3Lcaji7W8VolMZG8MVAayl_0Ca_J7vL74mejPp8CvL3LqSDVm61m1WZrA178cl32yHbcSZN1lxTFBRPufDMoJ24lAW52i6Wgu55D1c-gILDAoLJr8I-hWDpDd',
      cx: 240,
      cy: 480
    },
    'OR-2024-072': {
      id: 'OR-2024-072',
      name: 'FISHNET SCRAP • 12m',
      type: 'fishing_net',
      typeName: 'Fishnet scrap (12m)',
      confidence: 71.3,
      riskScore: 54,
      severity: 'medium',
      coords: '17.2910° S, 178.3980° E',
      utmCoords: 'Zone 60S 648550E 8087850N',
      currentDrift: '0.6 kts @ 185° S (Simulated)',
      depth: '-64.5m Depth (Simulated)',
      localDepth: '-68.2 m',
      timeToStranding: 'Est. 28h 10m',
      strandingPercent: 38,
      estArea: '48 m²',
      sector: 'Pelagic Outer Shelf',
      warning:
        'MONITORED TARGET: Fragmented netting buoyant at intermediate depth. Currently tracking south along open trench with low habitat impact vector.',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
      cx: 1010,
      cy: 210
    }
  };

  const activeSelected =
    observations.find((o) => o.id === selectedObservationId) ||
    selectedObservation ||
    observations[0] ||
    targetsData['OR-2024-094'];

  const selectedTarget = {
    id: activeSelected.id,
    name: activeSelected.name || (activeSelected.class_name === 'fishing_net' ? 'Ghost Gillnet' : 'Mooring Line'),
    type: activeSelected.class_name || activeSelected.type || 'fishing_net',
    typeName: activeSelected.typeName || (activeSelected.class_name === 'fishing_net' ? 'Ghost Gillnet' : 'Mooring Line'),
    confidence: activeSelected.confidencePercent ?? (activeSelected.confidence != null ? +(activeSelected.confidence * 100).toFixed(1) : 94.2),
    riskScore: activeSelected.riskScore || (activeSelected.isSimulated ? 96 : 82),
    severity: activeSelected.severity || 'high',
    hasGps: Boolean(activeSelected.hasGps && activeSelected.coords),
    coords: activeSelected.hasGps && activeSelected.coords ? activeSelected.coords : 'Coordinates Unavailable (GPS Required)',
    utmCoords: activeSelected.utmCoords || (activeSelected.hasGps ? 'Zone 60S' : 'Datum Fix Pending'),
    currentDrift: activeSelected.hasGps ? (activeSelected.currentDrift || '1.4 kts @ 165° SSE (Simulated)') : 'Simulated Drift N/A (Requires GPS Fix)',
    depth: activeSelected.depth || '-14.2m Sub-surface (Simulated)',
    localDepth: activeSelected.localDepth || (activeSelected.hasGps ? '-42.1 m' : 'Bathymetry N/A'),
    timeToStranding: activeSelected.hasGps ? (activeSelected.timeToStranding || 'Est. 8h 40m') : 'Trajectory N/A',
    strandingPercent: activeSelected.hasGps ? (activeSelected.strandingPercent || 84) : 0,
    estArea: activeSelected.estArea || (activeSelected.bbox_xyxy ? `${Math.round(Math.abs(activeSelected.bbox_xyxy[2] - activeSelected.bbox_xyxy[0]) * Math.abs(activeSelected.bbox_xyxy[3] - activeSelected.bbox_xyxy[1]))} px²` : '340 m²'),
    sector: activeSelected.sector || 'Unlocated Pelagic Stream',
    warning: activeSelected.warning || (activeSelected.hasGps ? 'High potential entanglement risk to shallow reef structures.' : 'Target lacks geographic coordinates. Ingested from 2D optical frame without GPS/INS payload telemetry.'),
    image: activeSelected.annotatedImage || activeSelected.image || activeSelected.rawImage || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
    reviewStatus: activeSelected.reviewStatus || 'pending',
    isSimulated: Boolean(activeSelected.isSimulated),
    rawObservation: activeSelected,
  };

  const toggleLayer = (key) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto select-none font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
          <span className="font-mono text-xs">{toastMessage}</span>
        </div>
      )}

      {/* 1. CINEMATIC PAGE HERO BANNER */}
      <PageHero
        title="Marine Intelligence GIS Ocean Map"
        subtitle="High-resolution ocean spatial analysis with dynamic hydrodynamic currents, bathymetric contours, and georeferenced YOLOv8 target telemetry."
        sector="Lau Basin & Tavaru Coral Nursery Sector 4"
        badgeText="TACTICAL GIS ENGINE"
        badgeVariant="cyan"
        stats={[
          {
            icon: <Activity className="w-3.5 h-3.5 text-[#00D6A3]" />,
            label: 'HYCOM 1/12° SST',
            value: '1.42 kts @ 162° SSE',
            highlightColor: 'text-[#EAF6FF]'
          },
          {
            icon: <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />,
            label: 'TARGETS INGESTED',
            value: '148 Active',
            highlightColor: 'text-[#00E5FF]'
          },
          {
            icon: <ShieldAlert className="w-3.5 h-3.5 text-[#FF6B61]" />,
            label: 'HABITAT GEOFENCE',
            value: 'Tavaru Reserve [RESTRICTED]',
            highlightColor: 'text-[#FF6B61]'
          }
        ]}
        actions={
          <>
            <button
              onClick={() => {
                setSelectedTargetId('OR-2024-094');
                setZoomLevel(1.2);
                showFeedback('Centered on #OR-2024-094 critical target.');
              }}
              className="px-3.5 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522] font-display font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-[#061522]" />
              <span>Focus Critical Target</span>
            </button>
            <Link
              to="/detection-review"
              className="px-3.5 py-2 rounded-xl bg-[#103B50] hover:bg-[#16465A] text-[#EAF6FF] font-display font-semibold text-xs flex items-center gap-2 border border-[#16465A] transition-all"
            >
              <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>AI Detection Review</span>
            </Link>
          </>
        }
      >
        {/* Integrated Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Target Class Filter */}
            <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg">
              <span className="text-[#91A9BB] uppercase text-[10px]">Target:</span>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                className="bg-transparent text-[#00E5FF] font-semibold focus:outline-none cursor-pointer border-0 p-0 pr-1 text-xs"
              >
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="all">All Targets (148)</option>
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="fishing_net">fishing_net (Ghost Net)</option>
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="rope_line">rope_line (Mooring / Tow)</option>
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="trap_buoy">trap_buoy (Derelict)</option>
              </select>
            </div>

            {/* Risk Level Selector */}
            <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg">
              <span className="text-[#91A9BB] uppercase text-[10px]">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-transparent text-[#FF6B61] font-semibold focus:outline-none cursor-pointer border-0 p-0 pr-1 text-xs"
              >
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="all">All Tiers (0-100)</option>
                <option className="bg-[#0B2638] text-[#FF6B61]" value="critical">Critical & High (75-100)</option>
                <option className="bg-[#0B2638] text-[#00D6A3]" value="medium">Medium (50-74)</option>
                <option className="bg-[#0B2638] text-[#91A9BB]" value="low">Low (&lt;50)</option>
              </select>
            </div>

            {/* Observation Window */}
            <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg">
              <span className="text-[#91A9BB] uppercase text-[10px]">Window:</span>
              <select
                value={temporalFilter}
                onChange={(e) => setTemporalFilter(e.target.value)}
                className="bg-transparent text-[#75E6DA] font-semibold focus:outline-none cursor-pointer border-0 p-0 pr-1 text-xs"
              >
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="24h">Last 24 Hours</option>
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="7d">Past 7 Days</option>
                <option className="bg-[#0B2638] text-[#EAF6FF]" value="30d">Trailing 30 Days</option>
              </select>
            </div>

            {/* Confidence Slider */}
            <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg">
              <span className="text-[#91A9BB] uppercase text-[10px]">Min Conf:</span>
              <span className="text-[#00E5FF] font-bold">{minConf}%</span>
              <input
                type="range"
                min="50"
                max="99"
                value={minConf}
                onChange={(e) => setMinConf(Number(e.target.value))}
                className="w-16 accent-[#00E5FF] h-1.5 bg-[#103B50] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-500/10 text-[#FFB547] border border-[#FFB547]/30 px-2 py-0.5 rounded-full">
              SIMULATED TELEMETRY DATASET
            </span>
          </div>
        </div>
      </PageHero>

      {/* UNLOCATED OBSERVATIONS TRAY (Requirement 6: Never fabricate coords; show in unlocated list) */}
      {unlocatedObservations.length > 0 && (
        <section
          className="w-full bg-[#071D33] border border-[#FFB547]/40 px-4 py-3 rounded-xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono"
          data-purpose="unlocated-observations-tray"
        >
          <div className="flex items-center gap-2.5 text-[#FFB547]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#FFB547] animate-pulse" />
            <span>
              <strong className="text-[#EAF6FF]">UNLOCATED OBSERVATIONS ({unlocatedObservations.length})</strong> — Targets detected from 2D optical frames without GPS telemetry. Coordinates are never fabricated; select a target to inspect payload details:
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {unlocatedObservations.map((obs) => {
              const isSelected = selectedObservationId === obs.id || activeSelected?.id === obs.id;
              return (
                <button
                  key={obs.id}
                  onClick={() => {
                    setSelectedObservationId(obs.id);
                    showFeedback(`Focused on unlocated observation ${obs.id}. Review details in right drawer.`);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#00E5FF] text-[#061522] font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                      : 'bg-[#0B2638] text-[#75E6DA] hover:bg-[#103B50] border border-[#16465A]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" />
                  <span>{obs.id}</span>
                  <span className="text-[10px] opacity-75">
                    ({obs.class_name || 'detection'} • {(obs.confidencePercent ?? (obs.confidence * 100)).toFixed(1)}%)
                  </span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#103B50] text-[#91A9BB] border border-[#16465A]">
                    {obs.reviewStatus || 'pending'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* MAIN GIS INTERFACE WORKSPACE (VIEWPORT & HUD) */}
      <section
        className="relative w-full h-[calc(100vh-14rem)] min-h-[640px] rounded-xl overflow-hidden bg-[#040e17] border border-[#16465A] shadow-2xl flex flex-col lg:flex-row"
        data-purpose="gis-map-workspace"
      >
        {/* PRIMARY INTERACTIVE GEOSPATIAL MAP CANVAS */}
        <div className="relative flex-1 h-full w-full overflow-hidden bg-[#040e17]" id="map-viewport">
          {/* Interactive SVG Bathymetric Canvas & Geospatial Vectors */}
          <svg
            className="absolute inset-0 w-full h-full cursor-crosshair transition-transform duration-300"
            viewBox="0 0 1200 800"
            preserveAspectRatio="none"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: '50% 50%',
              filter: basemap === 'sar' ? 'grayscale(80%) contrast(140%)' : basemap === 'dark' ? 'brightness(70%) hue-rotate(180deg)' : 'none'
            }}
          >
            <defs>
              {/* Nautical Grid */}
              <pattern id="nautical-grid-ocean" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#0e2433" strokeWidth="0.75" strokeDasharray="2 3" />
                <circle cx="80" cy="80" r="1.5" fill="#16465a" />
              </pattern>
              {/* Reef Hatch Fill */}
              <pattern id="reef-hatch-ocean" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="16" stroke="#00b1a0" strokeWidth="1.5" strokeOpacity="0.35" />
              </pattern>
              {/* Coral Sanctuary Hazard Hatch */}
              <pattern id="sanctuary-hatch-ocean" width="12" height="12" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="12" stroke="#ff6b61" strokeWidth="1.2" strokeOpacity="0.3" />
              </pattern>
              {/* Glow Filters */}
              <filter id="glow-cyan-ocean" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-red-ocean" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Chevron Drift Marker */}
              <marker id="cyan-chevron-ocean" markerWidth="6" markerHeight="6" refX="5" refY="5" orient="auto-start-reverse" viewBox="0 0 10 10">
                <path d="M 0 1 L 6 5 L 0 9" fill="none" stroke="#00e5ff" strokeWidth="2" />
              </marker>
            </defs>

            {/* Base Coordinate Grid Layer */}
            <rect width="100%" height="100%" fill="url(#nautical-grid-ocean)" />

            {/* Bathymetric Contours Layer */}
            {layers.bathymetry && (
              <g id="layer-bathymetry" className="transition-opacity duration-300">
                {/* Deep Trench & Shelf Contours */}
                <path d="M-50,650 C200,620 320,540 450,560 C620,580 750,420 850,380 C980,340 1100,280 1250,260" fill="none" stroke="#0B2638" strokeWidth="22" strokeOpacity="0.6" />
                <path d="M-50,600 C220,570 340,490 480,520 C640,540 780,380 880,330 C1020,290 1120,240 1250,220" fill="none" stroke="#103B50" strokeWidth="6" strokeDasharray="8 4" />
                <text x="500" y="515" fill="#16465A" fontSize="9" letterSpacing="2" className="font-mono">-120m CONTOUR</text>
                
                <path d="M-50,520 C180,480 300,410 420,440 C580,460 700,310 820,270 C940,230 1050,170 1250,150" fill="none" stroke="#134760" strokeWidth="3" />
                <text x="320" y="420" fill="#1a5573" fontSize="9" letterSpacing="2" className="font-mono">-60m BATHYMETRIC</text>
                
                <path d="M-50,440 C150,390 260,330 380,350 C520,380 640,240 760,200 C880,160 990,110 1250,90" fill="none" stroke="#1b6082" strokeWidth="2" strokeDasharray="4 3" />
                <text x="660" y="220" fill="#2c789e" fontSize="9" letterSpacing="2" className="font-mono">-30m SHELF</text>
                
                {/* Shallow Lagoon Reef Formation (Tavaru Reef) */}
                <path d="M 680,260 C 720,220 810,210 880,240 C 940,270 960,340 920,410 C 870,490 770,520 700,470 C 640,430 630,320 680,260 Z" fill="#0B2638" fillOpacity="0.75" stroke="#1d6b8b" strokeWidth="2" />
                <path d="M 710,290 C 740,250 800,245 850,270 C 890,290 910,340 880,390 C 840,450 770,470 720,440 C 675,410 680,330 710,290 Z" fill="url(#reef-hatch-ocean)" stroke="#00b1a0" strokeWidth="1.5" />
              </g>
            )}

            {/* Coral Sanctuary Zone Layer */}
            {layers.sanctuary && (
              <g id="layer-sanctuaries">
                <rect x="640" y="190" width="310" height="320" rx="8" fill="none" stroke="#00b1a0" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.7" />
                <text x="655" y="212" fill="#50dbc8" fontSize="11" fontWeight="600" letterSpacing="1" className="font-display">TAVARU REEF MARINE RESERVE</text>
                <text x="655" y="226" fill="#849396" fontSize="9" className="font-mono">Zone A • Critical Live Acropora Coral Nursery</text>
                
                {/* Shallow Lagoon Sanctuary Hazard Stranding Point */}
                <circle cx="890" cy="460" r="65" fill="url(#sanctuary-hatch-ocean)" stroke="#ff6b61" strokeWidth="1" strokeOpacity="0.5" />
                <text x="835" y="540" fill="#ffb4ab" fontSize="9" className="font-mono">Shallow Lagoon Sanctuary</text>
              </g>
            )}

            {/* Dynamic Hydrodynamic Currents Layer */}
            {layers.currents && (
              <g id="layer-currents" fill="none" stroke="#00E5FF" strokeWidth="1.8" strokeOpacity="0.45">
                <path d="M100,180 Q300,220 480,260 T860,360" strokeDasharray="8 14" className="animate-current-flow" />
                <path d="M140,240 Q340,290 520,320 T900,430" strokeDasharray="6 12" className="animate-current-flow-slow" />
                <path d="M80,320 Q280,360 460,400 T820,510" strokeDasharray="8 14" className="animate-current-flow" />
                <path d="M120,400 Q320,440 500,470 T860,590" strokeDasharray="6 12" className="animate-current-flow-slow" />
              </g>
            )}

            {/* ERA5 Wind Stress Layer (Optional Toggle) */}
            {layers.winds && (
              <g id="layer-winds" fill="none" stroke="#FFB547" strokeWidth="1" strokeOpacity="0.4">
                <line x1="200" y1="120" x2="230" y2="150" strokeDasharray="3 3" />
                <line x1="400" y1="140" x2="430" y2="170" strokeDasharray="3 3" />
                <line x1="600" y1="180" x2="630" y2="210" strokeDasharray="3 3" />
                <line x1="300" y1="280" x2="330" y2="310" strokeDasharray="3 3" />
                <line x1="500" y1="320" x2="530" y2="350" strokeDasharray="3 3" />
                <text x="210" y="115" fill="#FFB547" fontSize="8" className="font-mono">WIND 12kt E</text>
              </g>
            )}

            {/* Wave & Swell Height (WW3) Layer */}
            {layers.waves && (
              <g id="layer-waves" fill="none" stroke="#75E6DA" strokeWidth="0.8" strokeOpacity="0.3">
                <circle cx="500" cy="300" r="120" strokeDasharray="5 5" />
                <circle cx="500" cy="300" r="220" strokeDasharray="5 5" />
                <text x="500" y="295" fill="#75E6DA" fontSize="9" className="font-mono">SWELL Hs: 1.8m</text>
              </g>
            )}

            {/* Lagrangian Projected Drift Vectors */}
            {layers.drift && (
              <g id="layer-drift-vectors">
                {/* Historical Vector (Trailing 12h) */}
                <path d="M 280,140 Q 340,210 420,290" fill="none" stroke="#849396" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
                <circle cx="280" cy="140" r="3" fill="#849396" />
                <text x="240" y="135" fill="#849396" fontSize="8" className="font-mono">-12h Initial SAR Fix</text>
                
                {/* Active Predicted Vector (+6h, +12h, +24h) */}
                <path
                  d="M 420,290 C 510,380 590,420 720,410 C 780,405 830,420 870,445"
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth="2.5"
                  filter="url(#glow-cyan-ocean)"
                  markerEnd="url(#cyan-chevron-ocean)"
                />
                
                {/* Projection Checkpoints */}
                <circle cx="530" cy="375" r="4" fill="#00e5ff" />
                <text x="540" y="372" fill="#c3f5ff" fontSize="9" fontWeight="bold" className="font-mono">+6h (0.8 kts)</text>
                
                <circle cx="630" cy="415" r="4" fill="#00e5ff" />
                <text x="640" y="430" fill="#c3f5ff" fontSize="9" fontWeight="bold" className="font-mono">+12h (1.1 kts)</text>
                
                <circle cx="760" cy="408" r="4" fill="#ffb4ac" />
                <text x="765" y="398" fill="#ff6b61" fontSize="9" fontWeight="bold" className="font-mono">+24h IMPACT ZONE</text>
              </g>
            )}

            {/* TARGET DETECTIONS (Interactive Pins) */}
            {layers.detections && (
              <g id="layer-detections">
                {/* TARGET 1: OR-2024-094 (CRITICAL / SELECTED) */}
                <g
                  className="cursor-pointer group"
                  onClick={() => setSelectedTargetId('OR-2024-094')}
                >
                  <circle cx="420" cy="290" r="34" fill="#93000a" fillOpacity="0.2">
                    <animate attributeName="r" values="24;38;24" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="420" cy="290" r="22" fill="none" stroke="#ff6b61" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="420" cy="290" r="12" fill="#ffb4ab" fillOpacity="0.4" stroke="#ff6b61" strokeWidth="2" filter="url(#glow-red-ocean)" />
                  <circle cx="420" cy="290" r="4" fill="#ffffff" />
                  
                  {/* Crosshairs */}
                  <line x1="420" y1="266" x2="420" y2="278" stroke="#ff6b61" strokeWidth="2" />
                  <line x1="420" y1="302" x2="420" y2="314" stroke="#ff6b61" strokeWidth="2" />
                  <line x1="396" y1="290" x2="408" y2="290" stroke="#ff6b61" strokeWidth="2" />
                  <line x1="432" y1="290" x2="444" y2="290" stroke="#ff6b61" strokeWidth="2" />
                  
                  {/* Label HUD Tag */}
                  <g transform="translate(438, 258)">
                    <rect width="144" height="44" rx="4" fill="#0B2638" fillOpacity="0.95" stroke="#ff6b61" strokeWidth={selectedTargetId === 'OR-2024-094' ? '2' : '1'} />
                    <text x="8" y="15" fill="#ffb4ac" fontSize="10" fontWeight="bold" className="font-mono">OR-2024-094 [96/100]</text>
                    <text x="8" y="27" fill="#c3f5ff" fontSize="8.5" className="font-mono">GHOST GILLNET • 45m</text>
                    <text x="8" y="38" fill="#50dbc8" fontSize="8" className="font-mono">Conf: 94.2% • Stranding Risk</text>
                  </g>
                </g>

                {/* TARGET 2: OR-2024-089 (Amber / Synthetic Rope Line) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(240, 480)"
                  onClick={() => setSelectedTargetId('OR-2024-089')}
                >
                  <circle cx="0" cy="0" r="16" fill="#71f8e4" fillOpacity="0.15" />
                  <circle cx="0" cy="0" r="8" fill="#00b1a0" fillOpacity="0.5" stroke="#50dbc8" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
                  <g transform="translate(14, -14)">
                    <rect width="130" height="34" rx="3" fill="#0B2638" fillOpacity="0.9" stroke={selectedTargetId === 'OR-2024-089' ? '#00E5FF' : '#3b494c'} strokeWidth="1" />
                    <text x="6" y="14" fill="#50dbc8" fontSize="9" fontWeight="600" className="font-mono">OR-2024-089 [78/100]</text>
                    <text x="6" y="26" fill="#bac9cc" fontSize="8" className="font-mono">Mooring Line 80m (89.6%)</text>
                  </g>
                </g>

                {/* TARGET 3: OR-2024-072 (Low Hazard Fragment) */}
                <g
                  className="cursor-pointer group"
                  transform="translate(1010, 210)"
                  onClick={() => setSelectedTargetId('OR-2024-072')}
                >
                  <circle cx="0" cy="0" r="6" fill="#00e5ff" fillOpacity="0.4" stroke="#00daf3" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="2" fill="#ffffff" />
                  <g transform="translate(12, -10)">
                    <rect width="120" height="30" rx="3" fill="#0B2638" fillOpacity="0.85" stroke={selectedTargetId === 'OR-2024-072' ? '#00E5FF' : '#3b494c'} strokeWidth="1" />
                    <text x="6" y="13" fill="#9cf0ff" fontSize="8.5" className="font-mono">OR-2024-072 [54/100]</text>
                    <text x="6" y="23" fill="#849396" fontSize="7.5" className="font-mono">Fishnet scrap (71.3%)</text>
                  </g>
                </g>

                {/* DEPLOYED ROV ASSET TRACKER */}
                <g transform="translate(360, 410)">
                  <polygon points="0,-9 7,8 -7,8" fill="#00e5ff" stroke="#061421" strokeWidth="1.5" />
                  <circle cx="0" cy="0" r="14" fill="none" stroke="#00e5ff" strokeWidth="1" strokeDasharray="2 2" />
                  <g transform="translate(12, 6)">
                    <rect width="112" height="22" rx="2" fill="#0B2638" fillOpacity="0.95" stroke="#00e5ff" strokeWidth="0.75" />
                    <text x="6" y="14" fill="#00e5ff" fontSize="8" fontWeight="bold" className="font-mono">PELAGIC-ROV-02 • 1.2kt</text>
                  </g>
                </g>
              </g>
            )}
          </svg>

          {/* FLOATING HUD BAR (TOP-LEFT RETICLE TELEMETRY) */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
            <div className="bg-[#0B2638]/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#16465A] shadow-lg pointer-events-auto flex items-center gap-4 text-[#EAF6FF]">
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-[#00E5FF]" />
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] text-[#91A9BB] uppercase">Target Fix</span>
                  <span className="font-mono text-xs text-[#00E5FF] font-semibold tracking-wide">
                    {selectedTarget.coords}
                  </span>
                </div>
              </div>
              <div className="w-px h-6 bg-[#16465A]" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-[#91A9BB] uppercase">Local Depth</span>
                <span className="font-mono text-xs text-[#00D6A3] font-bold">{selectedTarget.localDepth}</span>
              </div>
              <div className="w-px h-6 bg-[#16465A] hidden sm:block" />
              <div className="hidden sm:flex flex-col">
                <span className="font-mono text-[9px] text-[#91A9BB] uppercase">Sensor Pass</span>
                <span className="font-mono text-xs text-[#00E5FF] font-semibold">Sentinel-2 SAR (11:04Z)</span>
              </div>
            </div>

            {/* FLOATING LAYER CONTROL PANEL */}
            <div className="bg-[#071D33]/95 backdrop-blur-md p-3 rounded-xl border border-[#16465A] shadow-xl w-60 pointer-events-auto">
              <div className="flex items-center justify-between pb-2 mb-2 bg-[#103B50]/40 rounded-lg px-2 py-1">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span className="font-display text-xs font-semibold uppercase tracking-wider text-[#EAF6FF]">GIS Overlays</span>
                </div>
                <span className="font-mono text-[9px] text-[#00E5FF]">
                  {Object.values(layers).filter(Boolean).length} Active
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.detections}
                      onChange={() => toggleLayer('detections')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>AI Detections (YOLOv8)</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#FF6B61]" />
                </label>

                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.drift}
                      onChange={() => toggleLayer('drift')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>Drift Vectors (Lagrangian)</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                </label>

                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.sanctuary}
                      onChange={() => toggleLayer('sanctuary')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>Protected Coral Sanctuaries</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
                </label>

                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.currents}
                      onChange={() => toggleLayer('currents')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>HYCOM Ocean Currents</span>
                  </span>
                  <span className="font-mono text-[9px] text-[#91A9BB]">1.4 kt</span>
                </label>

                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#91A9BB] hover:text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.winds}
                      onChange={() => toggleLayer('winds')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>ERA5 Wind Stress Vectors</span>
                  </span>
                  <span className="font-mono text-[9px] text-[#FFB547]">12 kt E</span>
                </label>

                <label className="flex items-center justify-between hover:bg-[#103B50]/30 px-2 py-1 rounded cursor-pointer transition-colors">
                  <span className="flex items-center gap-2 text-[#91A9BB] hover:text-[#EAF6FF]">
                    <input
                      type="checkbox"
                      checked={layers.waves}
                      onChange={() => toggleLayer('waves')}
                      className="rounded bg-[#103B50] border-0 text-[#00E5FF] focus:ring-0 w-3.5 h-3.5 accent-[#00E5FF]"
                    />
                    <span>Wave & Swell Height (WW3)</span>
                  </span>
                  <span className="font-mono text-[9px] text-[#75E6DA]">1.8 m</span>
                </label>
              </div>
            </div>
          </div>

          {/* FLOATING TACTICAL MEASUREMENT & BASEMAP TOOLS (TOP-RIGHT) */}
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <div className="bg-[#0B2638]/90 backdrop-blur px-2 py-1 rounded-lg border border-[#16465A] shadow-lg flex items-center gap-1 font-mono text-[11px]">
              <button
                onClick={() => {
                  setActiveTool(activeTool === 'ruler' ? null : 'ruler');
                  showFeedback('Ruler Mode: Click two points to measure geodesic nautical distance.');
                }}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTool === 'ruler' ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
                }`}
                title="Measure Distance"
              >
                <span>Ruler</span>
              </button>
              <button
                onClick={() => {
                  setActiveTool(activeTool === 'polygon' ? null : 'polygon');
                  showFeedback('Polygon Mode: Trace hazard perimeter to calculate area in km².');
                }}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTool === 'polygon' ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50]'
                }`}
                title="Polygon Area Tool"
              >
                <span>Polygon</span>
              </button>
              <button
                onClick={() => {
                  showFeedback('Coordinate Datum: UTM Zone 60S (Fiji Northern Archipelago)');
                }}
                className="px-2.5 py-1 rounded text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#103B50] transition-colors"
                title="Spatial Projection"
              >
                <span>UTM 60S</span>
              </button>
            </div>

            <div className="bg-[#0B2638]/90 backdrop-blur p-1 rounded-lg border border-[#16465A] shadow-lg flex items-center gap-1 font-mono text-[10px]">
              <button
                onClick={() => setBasemap('hydro')}
                className={`px-2 py-1 rounded transition-colors ${
                  basemap === 'hydro' ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
              >
                Hydro
              </button>
              <button
                onClick={() => setBasemap('sar')}
                className={`px-2 py-1 rounded transition-colors ${
                  basemap === 'sar' ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
              >
                SAR
              </button>
              <button
                onClick={() => setBasemap('dark')}
                className={`px-2 py-1 rounded transition-colors ${
                  basemap === 'dark' ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'text-[#91A9BB] hover:text-[#EAF6FF]'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          {/* BOTTOM-LEFT: SCALE BAR & TRUE NORTH COMPASS */}
          <div className="absolute bottom-4 left-4 z-10 flex items-end gap-3 pointer-events-none">
            {/* True North Dial */}
            <div className="w-10 h-10 rounded-full bg-[#0B2638]/90 border border-[#16465A] backdrop-blur shadow-lg flex items-center justify-center pointer-events-auto">
              <div className="relative flex flex-col items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-[#00E5FF] leading-none">N</span>
                <div className="w-0.5 h-3.5 bg-gradient-to-b from-[#00E5FF] via-[#00E5FF] to-transparent mt-0.5" />
              </div>
            </div>

            {/* Nautical Scale Bar */}
            <div className="bg-[#0B2638]/90 border border-[#16465A] backdrop-blur px-3 py-1.5 rounded-lg shadow-lg pointer-events-auto flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono text-[#91A9BB] leading-none gap-6">
                <span>0</span>
                <span>2.5 nm</span>
                <span>5.0 nm (9.26 km)</span>
              </div>
              <div className="w-36 h-1 bg-[#103B50] rounded-full overflow-hidden flex">
                <div className="w-1/2 h-full bg-[#00E5FF]" />
                <div className="w-1/2 h-full bg-[#16465A]" />
              </div>
            </div>
          </div>

          {/* BOTTOM-RIGHT: ZOOM & RECENTER CONTROLS */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
              className="w-8 h-8 rounded-lg bg-[#0B2638]/90 border border-[#16465A] backdrop-blur hover:bg-[#103B50] text-[#EAF6FF] flex items-center justify-center shadow-lg transition-colors"
              title="Zoom In"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.15))}
              className="w-8 h-8 rounded-lg bg-[#0B2638]/90 border border-[#16465A] backdrop-blur hover:bg-[#103B50] text-[#EAF6FF] flex items-center justify-center shadow-lg transition-colors"
              title="Zoom Out"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                showFeedback('Map viewport recentered to active Fijian ALDFG cluster.');
              }}
              className="w-8 h-8 rounded-lg bg-[#0B2638]/90 border border-[#16465A] backdrop-blur hover:bg-[#103B50] text-[#00E5FF] flex items-center justify-center shadow-lg transition-colors"
              title="Fit to Active Cluster"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT-HAND COLLAPSIBLE INSPECTION DRAWER (SELECTED OBSERVATION HUD) */}
        <div
          className="w-full lg:w-96 min-w-[340px] max-w-full lg:max-w-[400px] bg-[#071D33] border-t lg:border-t-0 lg:border-l border-[#16465A] flex flex-col z-20 shadow-2xl overflow-y-auto"
          data-purpose="selected-observation-hud"
        >
          {/* Drawer Header Bar */}
          <div className="p-4 bg-[#0B2638] border-b border-[#16465A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${selectedTarget.severity === 'critical' ? 'bg-[#FF6B61] animate-ping' : 'bg-[#00E5FF]'}`} />
              <div className="flex flex-col">
                <span className="font-mono text-[10px] text-[#91A9BB] uppercase">Observation Target</span>
                <span className="font-display text-sm text-[#EAF6FF] font-bold tracking-wide">
                  {selectedTarget.id}
                </span>
              </div>
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                selectedTarget.severity === 'critical'
                  ? 'bg-[#FF6B61]/20 text-[#FF6B61] border border-[#FF6B61]/30'
                  : 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30'
              }`}
            >
              CRITICAL {selectedTarget.riskScore}/100
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1">
            {/* YOLOv8 Inference Segmentation Preview Thumbnail */}
            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-[#040e17] border border-[#16465A] group shadow-inner">
              <img
                src={selectedTarget.image}
                alt="Tactical ROV view of ghost fishing net entangled with submerged coral reef"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#040e17] via-transparent to-transparent opacity-80" />

              {/* Watermark Tag */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-[#040e17]/85 backdrop-blur px-2 py-0.5 rounded font-mono text-[9px] text-[#00E5FF] border border-[#00E5FF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                <span>YOLOv8s-seg [{selectedTarget.confidence}% CONF]</span>
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#EAF6FF] font-semibold bg-[#040e17]/80 px-2 py-0.5 rounded border border-[#16465A]">
                  {selectedTarget.sector}
                </span>
                <span className="text-[#00D6A3] bg-[#040e17]/80 px-2 py-0.5 rounded border border-[#16465A]">
                  Est Net: {selectedTarget.estArea}
                </span>
              </div>
            </div>

            {/* Telemetry Data Matrix */}
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#91A9BB] uppercase tracking-wider">Spatial Telemetry</span>
                <span className="text-[#00E5FF]">DATUM: WGS84</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                  <span className="block text-[9px] text-[#91A9BB]">CLASSIFICATION</span>
                  <span className="font-semibold text-[#75E6DA] truncate block">{selectedTarget.typeName}</span>
                </div>
                <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                  <span className="block text-[9px] text-[#91A9BB]">MODEL CONFIDENCE</span>
                  <span className="font-bold text-[#00D6A3]">{selectedTarget.confidence}% (Validated)</span>
                </div>
                <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                  <span className="block text-[9px] text-[#91A9BB]">COORDINATES</span>
                  <span className="text-[11px] text-[#EAF6FF]">{selectedTarget.coords}</span>
                </div>
                <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                  <span className="block text-[9px] text-[#91A9BB]">CURRENT DRIFT</span>
                  <span className="text-[11px] text-[#EAF6FF]">{selectedTarget.currentDrift}</span>
                </div>
              </div>
            </div>

            {/* Threat & Reef Impact Gauge */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#91A9BB] uppercase">Time to Reef Stranding</span>
                <span className="text-[#FF6B61] font-bold">{selectedTarget.timeToStranding}</span>
              </div>
              <div className="w-full bg-[#103B50] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00D6A3] via-[#00E5FF] to-[#FF6B61] rounded-full"
                  style={{ width: `${selectedTarget.strandingPercent}%` }}
                />
              </div>
              <div className="p-2.5 rounded-lg bg-[#FF6B61]/10 border border-[#FF6B61]/25 text-[#FF6B61] text-[11px] leading-relaxed">
                <span className="font-bold">CRITICAL IMPACT WARNING: </span>
                {selectedTarget.warning}
              </div>
            </div>

            {/* Depth Profile Sparkline Card */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span className="text-[#91A9BB] uppercase">Sub-surface Bathymetry Profile</span>
                <span className="text-[#00E5FF]">{selectedTarget.depth}</span>
              </div>
              <div className="h-12 w-full">
                <svg className="w-full h-full" viewBox="0 0 200 50" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="depth-fade-ocean" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00daf3" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00daf3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,15 Q30,10 60,25 T120,38 T160,28 T200,45 L200,50 L0,50 Z" fill="url(#depth-fade-ocean)" />
                  <path d="M0,15 Q30,10 60,25 T120,38 T160,28 T200,45" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
                  <circle cx="120" cy="38" r="3" fill="#ff6b61" />
                </svg>
              </div>
              <div className="flex justify-between font-mono text-[9px] text-[#91A9BB]">
                <span>Surface (0m)</span>
                <span>Fix ({selectedTarget.depth})</span>
                <span>Seabed (-120m)</span>
              </div>
            </div>
          </div>

          {/* Action Button Dock */}
          <div className="p-4 bg-[#0B2638] border-t border-[#16465A] space-y-2 mt-auto">
            <button
              onClick={() => {
                navigate('/recovery-planning', {
                  state: {
                    detection: selectedTarget.rawObservation,
                    targetId: selectedTarget.id,
                    source: selectedTarget.isSimulated ? 'demo-detection' : 'live-detection',
                  },
                });
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#00E5FF] text-[#061522] font-display text-xs font-bold uppercase tracking-wider shadow-lg hover:shadow-[0_0_20px_rgba(0,229,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Add to Recovery Mission</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/detection-details"
                state={{
                  detection: selectedTarget.rawObservation,
                  obsId: selectedTarget.id,
                  annotatedImage: selectedTarget.image,
                  reviewStatus: selectedTarget.reviewStatus,
                  isDemo: selectedTarget.isSimulated,
                }}
                className="py-2 px-3 rounded-lg bg-[#103B50] hover:bg-[#16465A] text-[#00E5FF] text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect Crop</span>
              </Link>
              <Link
                to="/drift-forecast"
                state={{
                  targetId: selectedTarget.id,
                }}
                className="py-2 px-3 rounded-lg bg-[#103B50] hover:bg-[#16465A] text-[#00D6A3] text-xs font-mono transition-colors flex items-center justify-center gap-1.5"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Drift Sim</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default OceanMap;
