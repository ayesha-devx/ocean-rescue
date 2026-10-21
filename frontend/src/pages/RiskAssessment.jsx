import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  Download,
  Filter,
  Search,
  ChevronDown,
  ArrowRight,
  Info,
  Radio,
  Eye,
  Activity,
  Check,
  TrendingUp,
  MapPin,
  Anchor
} from 'lucide-react';

export const RiskAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { observations, updateObservationReview, selectedObservationId, setSelectedObservationId } = useObservations();

  // State
  const [selectedTargetId, setSelectedTargetIdState] = useState(
    location.state?.targetId || selectedObservationId || 'OR-2024-094'
  );

  const setSelectedTargetId = (id) => {
    setSelectedTargetIdState(id);
    setSelectedObservationId(id);
  };

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'critical', 'high', 'pending'
  const [searchFilter, setSearchFilter] = useState('');
  const [sortOption, setSortOption] = useState('risk-desc');
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [biologistApproved, setBiologistApproved] = useState({
    'OR-2024-094': false,
    'OR-2024-089': true,
    'OR-2024-072': false,
    'OR-2024-101': false,
  });

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRecompute = () => {
    setIsRecomputing(true);
    setTimeout(() => {
      setIsRecomputing(false);
      showFeedback('Risk Matrix recalculation completed. 148 targets reassessed against updated ebb tide velocity vectors.');
    }, 700);
  };

  const handleApprove = (id) => {
    setBiologistApproved((prev) => ({ ...prev, [id]: true }));
    updateObservationReview(id, 'confirmed');
    showFeedback(`Verification logged: Target #${id} approved by Marine Biologist on duty (Updated in session store).`);
  };

  // Observations data
  const baseTargets = [
    {
      id: 'OR-2024-094',
      name: 'Ghost Gillnet (~45m)',
      type: 'Ghost Gillnet',
      extent: '~45m extent, 340m²',
      coords: '17.2860° S, 178.4100° E',
      confidence: 94.2,
      drift: '1.4 kts @ 165° SSE',
      riskScore: 96,
      tier: 'Tier 1 Critical',
      severityClass: 'critical',
      status: 'Pending Sign-off',
      waterDepth: '-18.4m (Lagoon approach)',
      submergedDepth: '1.2m below sea surface',
      vectorThreat: 'Direct Reef Ingress in 19.5h',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBtHN0aQp_cDKWLH5c2ePgRxNfrR1GoXfnl9BjQnastQWWaxhG-3QvoFyV-9vcDjcNESbY5kI4Qf3TidJV_PvBd11n9a8lpaqWkglaZZfXNhntN9Bd2uFe-3a36n9E3Lcaji7W8VolMZG8MVAayl_0Ca_J7vL74mejPp8CvL3LqSDVm61m1WZrA178cl32yHbcSZN1lxTFBRPufDMoJ24lAW52i6Wgu55D1c-gILDAoLJr8I-hWDpDd',
      scores: {
        habitat: 98,
        entanglement: 95,
        drift: 92,
        mass: 98,
      },
      mapPos: { left: '360px', top: '152px' }
    },
    {
      id: 'OR-2024-089',
      name: 'Rope / Mooring Line (~82m)',
      type: 'Mooring Line',
      extent: '~82m extent, 160m²',
      coords: '17.2841° S, 178.4012° E',
      confidence: 89.6,
      drift: '0.9 kts @ 170° S',
      riskScore: 78,
      tier: 'Tier 2 High',
      severityClass: 'high',
      status: 'Verified',
      waterDepth: '-28.0m (Western Channel)',
      submergedDepth: '3.5m below surface',
      vectorThreat: 'Enters Shipping Channel in 14h',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
      scores: {
        habitat: 76,
        entanglement: 82,
        drift: 74,
        mass: 80,
      },
      mapPos: { left: '240px', top: '110px' }
    },
    {
      id: 'OR-2024-072',
      name: 'Fishnet Scrap (~12m)',
      type: 'Fishnet scrap',
      extent: '~12m extent, 48m²',
      coords: '17.2910° S, 178.3980° E',
      confidence: 71.3,
      drift: '0.6 kts @ 185° S',
      riskScore: 54,
      tier: 'Tier 3 Medium',
      severityClass: 'medium',
      status: 'Automated',
      waterDepth: '-64.5m (Outer Trench)',
      submergedDepth: '5.0m below surface',
      vectorThreat: 'Slow Pelagic Drift Southward',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBtHN0aQp_cDKWLH5c2ePgRxNfrR1GoXfnl9BjQnastQWWaxhG-3QvoFyV-9vcDjcNESbY5kI4Qf3TidJV_PvBd11n9a8lpaqWkglaZZfXNhntN9Bd2uFe-3a36n9E3Lcaji7W8VolMZG8MVAayl_0Ca_J7vL74mejPp8CvL3LqSDVm61m1WZrA178cl32yHbcSZN1lxTFBRPufDMoJ24lAW52i6Wgu55D1c-gILDAoLJr8I-hWDpDd',
      scores: {
        habitat: 48,
        entanglement: 60,
        drift: 50,
        mass: 55,
      },
      mapPos: { left: '160px', top: '260px' }
    },
    {
      id: 'OR-2024-101',
      name: 'Polypropylene Cord (~30m)',
      type: 'Polypropylene cord',
      extent: '~30m extent, 65m²',
      coords: '17.3105° S, 178.4350° E',
      confidence: 91.0,
      drift: '1.2 kts @ 160° SSE',
      riskScore: 41,
      tier: 'Tier 4 Low',
      severityClass: 'low',
      status: 'Monitored',
      waterDepth: '-92.0m (Deep Ocean Floor)',
      submergedDepth: '12.0m below surface',
      vectorThreat: 'Deep Oceanic Dispersion',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBFcqulbxW3gdOZbMGOFT9xJZOm_1bv9s0Y9DK-VciIGnos4gExkHYEXvoyH7I6jOBorQAwYsqj0F18MflB8jhaqhcicFmTqRdkE6YyfcnFZ2of0NNA4QkK6JTNHOfOdfV4MoawStkXGl8_3gVamEJvt-DulqglsjtyBggnYF6BqFwDmmWDQTj54EEHnZTtrVaue8SFESVW5GDnh5cp3LIDXurRhJJGBfm2gnqT53I5pnnnOp616APS',
      scores: {
        habitat: 35,
        entanglement: 45,
        drift: 42,
        mass: 40,
      },
      mapPos: { left: '640px', top: '290px' }
    }
  ];

  // Combine live observations from ObservationContext with baseline demo targets
  const liveTargets = observations
    .filter((o) => !o.isSimulated)
    .map((obs) => ({
      id: obs.id,
      name: obs.name || (obs.class_name === 'fishing_net' ? 'Ghost Gillnet (Live)' : 'Rope / Line (Live)'),
      type: obs.class_name === 'fishing_net' ? 'Ghost Gillnet' : 'Rope / Line',
      extent: obs.bbox_xyxy ? `BBox [${obs.bbox_xyxy.map(Math.round).join(', ')}]` : '~35m extent',
      coords: obs.hasGps && obs.coords ? obs.coords : 'Unlocated (GPS Required)',
      confidence: obs.confidencePercent ?? (obs.confidence != null ? +(obs.confidence * 100).toFixed(1) : 94.2),
      drift: obs.hasGps ? (obs.currentDrift || '1.4 kts @ 165° SSE') : 'N/A (Unlocated)',
      riskScore: obs.riskScore || 88,
      tier: 'Tier 1 Critical',
      severityClass: 'critical',
      status: obs.reviewStatus === 'confirmed' ? 'Verified' : 'Pending Sign-off',
      waterDepth: 'Pelagic Stream',
      submergedDepth: 'Sub-surface Ingest',
      vectorThreat: obs.hasGps ? 'Direct Reef Ingress' : 'Unlocated (Spatial Model Pending)',
      image: obs.annotatedImage || obs.rawImage || obs.image,
      scores: {
        habitat: 92,
        entanglement: 94,
        drift: 80,
        mass: 86,
      },
      mapPos: { left: '320px', top: '140px' },
      isLive: true,
      rawObservation: obs,
    }));

  const targets = [...liveTargets, ...baseTargets];

  const selectedTarget = targets.find((t) => t.id === selectedTargetId) || targets[0];

  // Filtering
  const filteredTargets = targets.filter((item) => {
    if (activeTab === 'critical' && item.severityClass !== 'critical') return false;
    if (activeTab === 'high' && item.severityClass !== 'high') return false;
    if (activeTab === 'pending' && biologistApproved[item.id]) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
          <span className="font-mono text-xs">{toastMessage}</span>
        </div>
      )}

      {/* 1. ATMOSPHERIC RISK COMMAND HERO */}
      <PageHero
        sector="Lau Basin & Tavaru Sector 4"
        title="Marine Environmental Risk Assessment Matrix"
        subtitle="Multi-factor ecological severity modeling, coral reef vulnerability indexing, and prioritized maritime recovery dispatch."
        badgeText="SIMULATED RISK MODEL"
        badgeVariant="amber"
        stats={[
          {
            label: 'ASSESSED TARGETS',
            value: '148 (+12 today)',
            highlightColor: 'text-[#00E5FF]',
            icon: <Radio className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'TIER 1 CRITICAL',
            value: '09 Immediate',
            highlightColor: 'text-[#FF6B61]',
            icon: <ShieldAlert className="w-3.5 h-3.5 text-[#FF6B61]" />
          },
          {
            label: 'HABITAT THREAT',
            value: 'Tavaru Sanctuary Zone A',
            highlightColor: 'text-[#FFB547]',
            icon: <AlertOctagon className="w-3.5 h-3.5 text-[#FFB547]" />
          },
          {
            label: 'SIGNOFFS',
            value: '04 Pending Review',
            highlightColor: 'text-[#00D6A3]',
            icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleRecompute}
              disabled={isRecomputing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0B2638] text-[#EAF6FF] hover:text-[#00E5FF] hover:bg-[#103B50] border border-[#16465A] hover:border-[#00E5FF] transition-all font-mono text-xs shadow-md cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 text-[#00E5FF] ${isRecomputing ? 'animate-spin' : ''}`} />
              <span>{isRecomputing ? 'Computing...' : 'Recompute Matrix'}</span>
            </button>

            <button
              onClick={() => showFeedback('Exporting Batch GeoJSON feature collection (148 assessed targets with risk weights)...')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00E5FF] text-[#061522] font-display text-xs tracking-wider font-bold shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:shadow-[0_0_22px_rgba(0,229,255,0.6)] transition-all uppercase cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>BATCH EXPORT GEOJSON</span>
            </button>
          </div>
        }
      />

      {/* TELEMETRY COUNTERS / METRIC ARRAY (5 METRICS) */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-purpose="risk-metrics-row">
        {/* Metric 1: Assessed Observations */}
        <div className="bg-[#0B2638] border border-[#16465A] p-3.5 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[11px]">Assessed Targets</span>
            <Radio className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#EAF6FF] tracking-tight">148</span>
            <span className="font-mono text-xs text-[#00D6A3]">+12 today</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A9BB] font-mono truncate">
            89 Ghost Nets • 59 Mooring Lines
          </div>
        </div>

        {/* Metric 2: Critical Threat Tier */}
        <div className="bg-[#0B2638] border border-[#FF6B61]/40 p-3.5 rounded-xl flex flex-col justify-between relative overflow-hidden shadow-md">
          <div className="absolute -right-6 -bottom-6 w-16 h-16 bg-[#FF6B61]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="text-[#FF6B61] uppercase tracking-wider font-semibold text-[11px]">Tier 1: Critical</span>
            <span className="w-2 h-2 rounded-full bg-[#FF6B61] animate-ping" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#FF6B61] tracking-tight">09</span>
            <span className="font-mono text-xs text-[#FF6B61] bg-[#FF6B61]/15 px-1.5 py-0.5 rounded">Score 85–100</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A9BB] font-mono truncate">
            Immediate intervention required
          </div>
        </div>

        {/* Metric 3: High Risk Tier */}
        <div className="bg-[#0B2638] border border-[#16465A] p-3.5 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="text-[#FFB547] uppercase tracking-wider font-semibold text-[11px]">Tier 2: High Risk</span>
            <AlertTriangle className="w-4 h-4 text-[#FFB547]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#FFB547] tracking-tight">18</span>
            <span className="font-mono text-xs text-[#FFB547] bg-[#FFB547]/20 px-1.5 py-0.5 rounded">Score 65–84</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A9BB] font-mono truncate">
            Active drift to sanctuary
          </div>
        </div>

        {/* Metric 4: Medium & Low Risk */}
        <div className="bg-[#0B2638] border border-[#16465A] p-3.5 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[11px]">Tier 3 & 4: Nominal</span>
            <CheckCircle2 className="w-4 h-4 text-[#00D6A3]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#00D6A3] tracking-tight">121</span>
            <span className="font-mono text-xs text-[#91A9BB]">Score &lt;65</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A9BB] font-mono truncate">
            Monitored / Pelagic open ocean
          </div>
        </div>

        {/* Metric 5: Urgent Biologist Review */}
        <div className="bg-[#0B2638] border border-[#16465A] p-3.5 rounded-xl flex flex-col justify-between col-span-2 lg:col-span-1 shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[#00E5FF] font-semibold text-[11px]">Biologist Review</span>
            <Activity className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-[#00E5FF] tracking-tight">04</span>
            <span className="font-mono text-xs text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded">Pending</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A9BB] font-mono truncate">
            Awaiting manual confirmation
          </div>
        </div>
      </section>

      {/* MAIN CENTER GRID: LEFT GIS MAP & QUEUE (60%), RIGHT TARGET DOSSIER (40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Tactical GIS Map & Ranked Queue (7/12 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Map Container with Bathymetry, Vector Drift & Overlays */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl overflow-hidden flex flex-col shadow-md relative">
            {/* Top Map Header Bar */}
            <div className="px-4 py-2.5 bg-[#0B2638] border-b border-[#16465A] flex flex-wrap items-center justify-between gap-2 text-[#EAF6FF]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-display text-sm font-semibold tracking-wide">Pelagic Risk Overlay</span>
                <span className="font-mono text-[11px] text-[#91A9BB] bg-[#103B50] px-2 py-0.5 rounded border border-[#16465A]">
                  17°17'09.6" S, 178°24'36.0" E
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">Heatmap: ON</span>
                <span className="px-2 py-0.5 rounded bg-[#103B50] text-[#00D6A3]">Habitats: 3</span>
                <span className="px-2 py-0.5 rounded bg-[#FF6B61]/20 text-[#FF6B61] border border-[#FF6B61]/30">Vector Intersect: 1</span>
              </div>
            </div>

            {/* Tactical Interactive Map Canvas (Pure SVG + Pin Overlays) */}
            <div className="relative w-full h-[410px] bg-[#040e17] overflow-hidden select-none">
              <svg className="absolute inset-0 w-full h-full opacity-65 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="riskGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#16465A" strokeWidth="0.75" strokeDasharray="2 3" />
                  </pattern>
                  <pattern id="coralHatch-risk" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="12" stroke="#ffb4ab" strokeWidth="2" opacity="0.35" />
                  </pattern>
                  <pattern id="turtleHatch-risk" width="10" height="10" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#75E6DA" strokeWidth="1.5" opacity="0.25" />
                  </pattern>
                </defs>

                <rect width="100%" height="100%" fill="url(#riskGrid)" />

                {/* Bathymetric Isobaths */}
                <path d="M-10,340 C140,310 260,390 420,330 C580,270 720,380 900,320" fill="none" stroke="#16465A" strokeWidth="1" />
                <text x="18" y="348" fill="#849396" fontSize="9" className="font-mono">-200m ISOBATH</text>

                <path d="M-10,240 C160,200 280,260 480,210 C620,170 780,220 900,180" fill="none" stroke="#16465A" strokeWidth="1.2" strokeDasharray="4 4" />
                <text x="24" y="244" fill="#849396" fontSize="9" className="font-mono">-100m ISOBATH</text>

                <path d="M-10,130 C120,110 220,180 380,140 C520,100 680,150 900,100" fill="none" stroke="#00daf3" strokeWidth="1" opacity="0.3" />
                <text x="24" y="126" fill="#00daf3" fontSize="9" opacity="0.7" className="font-mono">-50m SHELF EDGE</text>

                {/* Whale Migration Channel */}
                <path d="M0,280 C260,260 520,320 850,290 L850,380 C500,410 260,360 0,390 Z" fill="#00daf3" fillOpacity="0.08" stroke="#00daf3" strokeWidth="1" strokeOpacity="0.4" />
                <text x="440" y="340" fill="#c3f5ff" fontSize="10" letterSpacing="0.08em" className="font-mono">WHALE MIGRATION CORRIDOR (PELAGIC)</text>

                {/* Turtle Corridor */}
                <polygon points="120,50 320,30 380,140 190,170" fill="url(#turtleHatch-risk)" stroke="#75E6DA" strokeWidth="1.5" strokeDasharray="5 3" />
                <text x="140" y="75" fill="#75E6DA" fontSize="10" fontWeight="600" className="font-mono">TURTLE CORRIDOR (ZONE B)</text>

                {/* Tavaru Sanctuary Zone A */}
                <polygon points="460,70 710,50 780,200 520,230" fill="url(#coralHatch-risk)" stroke="#ffb4ab" strokeWidth="2" strokeDasharray="6 4" />
                <polygon points="440,55 730,35 805,215 500,250" fill="none" stroke="#ffb4ab" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <text x="510" y="90" fill="#ffb4ab" fontSize="11" fontWeight="bold" className="font-mono">SANCTUARY ZONE A (ACROPORA NURSERY)</text>
                <text x="530" y="105" fill="#ffb4ab" fontSize="9" opacity="0.8" className="font-mono">500m Precautionary Buffer Line</text>

                {/* Drift Vector Forecast for Selected Target */}
                <path d="M370,165 Q450,155 560,145" fill="none" stroke="#ff6b61" strokeWidth="2.5" strokeDasharray="4 3" />
                <circle cx="560" cy="145" r="7" fill="#93000a" stroke="#ffb4ab" strokeWidth="2" />
                <circle cx="560" cy="145" r="14" fill="none" stroke="#ffb4ab" strokeWidth="1" opacity="0.6" />
                <text x="575" y="142" fill="#ffb4ab" fontSize="10" fontWeight="bold" className="font-mono">PROJECTED REEF IMPACT: +19.5h</text>
                <text x="575" y="156" fill="#bac9cc" fontSize="9" className="font-mono">Depth: -3.2m crest • 1.4 kts SSE</text>
              </svg>

              {/* Interactive Target Pins Pinned on Map */}
              {targets.map((tgt) => {
                const isSelected = selectedTargetId === tgt.id;
                return (
                  <div
                    key={tgt.id}
                    onClick={() => setSelectedTargetId(tgt.id)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                    style={{ left: tgt.mapPos.left, top: tgt.mapPos.top }}
                  >
                    {isSelected && (
                      <span className="absolute -inset-3 rounded-full bg-[#FF6B61]/25 animate-ping" />
                    )}
                    <div
                      className={`relative w-7 h-7 rounded-full border-2 flex items-center justify-center font-mono font-bold text-xs shadow-lg transition-transform group-hover:scale-110 ${
                        tgt.severityClass === 'critical'
                          ? 'bg-[#FF6B61]/30 border-[#FF6B61] text-[#FF6B61]'
                          : tgt.severityClass === 'high'
                          ? 'bg-[#FFB547]/30 border-[#FFB547] text-[#FFB547]'
                          : tgt.severityClass === 'medium'
                          ? 'bg-[#00D6A3]/30 border-[#00D6A3] text-[#00D6A3]'
                          : 'bg-[#00E5FF]/30 border-[#00E5FF] text-[#00E5FF]'
                      }`}
                    >
                      {tgt.riskScore}
                    </div>

                    {/* Target Callout Tag */}
                    <div
                      className={`${
                        isSelected ? 'block' : 'hidden group-hover:block'
                      } absolute left-8 -top-3 bg-[#0B2638]/95 border border-[#16465A] backdrop-blur px-2.5 py-1 rounded shadow-xl text-left whitespace-nowrap z-30`}
                    >
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#EAF6FF]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tgt.severityClass === 'critical' ? 'bg-[#FF6B61] animate-pulse' : 'bg-[#00E5FF]'
                          }`}
                        />
                        <span>#{tgt.id} [{tgt.tier}]</span>
                      </div>
                      <div className="font-mono text-[10px] text-[#91A9BB]">
                        {tgt.name} • {tgt.drift}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Floating Map Legend (Bottom Left) */}
              <div className="absolute bottom-3 left-3 bg-[#071D33]/95 border border-[#16465A] backdrop-blur p-2.5 rounded-lg shadow-xl max-w-xs space-y-1.5 font-mono text-[10px]">
                <div className="flex items-center justify-between text-[#EAF6FF] font-bold uppercase tracking-wider text-[11px] pb-1 border-b border-[#16465A]">
                  <span>Threat Severity Legend</span>
                  <span className="text-[#91A9BB] font-normal">WGS84</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B61]" />
                    <span className="text-[#EAF6FF]">Critical (&gt;85)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB547]" />
                    <span className="text-[#EAF6FF]">High (65–84)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00D6A3]" />
                    <span className="text-[#EAF6FF]">Medium (40–64)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF]" />
                    <span className="text-[#EAF6FF]">Low (&lt;40)</span>
                  </div>
                </div>
              </div>

              {/* Drift Trajectory Notification Overlay (Bottom Right) */}
              <div className="absolute bottom-3 right-3 bg-[#FF6B61]/20 border border-[#FF6B61]/50 text-[#FF6B61] backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 shadow font-mono text-[11px]">
                <AlertOctagon className="w-4 h-4 animate-pulse" />
                <span className="font-bold">INTERSECT DETECTED: #OR-2024-094 enters Coral Sanctuary in 19.5h</span>
              </div>
            </div>
          </div>

          {/* Bottom Left: Ranked ALDFG Observation Queue Table */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-sm space-y-3">
            {/* Filter Tabs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#16465A]">
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                    activeTab === 'all'
                      ? 'bg-[#00E5FF] text-[#061522]'
                      : 'bg-[#0B2638] text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  All Assessed (148)
                </button>
                <button
                  onClick={() => setActiveTab('critical')}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                    activeTab === 'critical'
                      ? 'bg-[#FF6B61] text-[#061522]'
                      : 'bg-[#0B2638] text-[#FF6B61] hover:bg-[#FF6B61]/20'
                  }`}
                >
                  Critical (09)
                </button>
                <button
                  onClick={() => setActiveTab('high')}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                    activeTab === 'high'
                      ? 'bg-[#FFB547] text-[#061522]'
                      : 'bg-[#0B2638] text-[#FFB547] hover:bg-[#FFB547]/20'
                  }`}
                >
                  High (18)
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1 rounded-lg transition-colors font-semibold ${
                    activeTab === 'pending'
                      ? 'bg-[#00E5FF] text-[#061522]'
                      : 'bg-[#0B2638] text-[#00E5FF] hover:bg-[#00E5FF]/20'
                  }`}
                >
                  Pending Review (04)
                </button>
              </div>

              {/* Search & Sort */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#91A9BB] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filter target ID or type..."
                    className="bg-[#0B2638] border border-[#16465A] text-[#EAF6FF] text-xs rounded-lg pl-8 pr-2.5 py-1.5 placeholder-[#91A9BB] focus:outline-none focus:border-[#00E5FF] font-mono w-44"
                  />
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="bg-[#0B2638] border border-[#16465A] text-[#91A9BB] font-mono text-xs rounded-lg py-1.5 px-2 focus:outline-none focus:border-[#00E5FF] cursor-pointer"
                >
                  <option value="risk-desc">Sort: Risk Score (High → Low)</option>
                  <option value="coral">Sort: Distance to Coral</option>
                  <option value="conf">Sort: YOLOv8 Confidence</option>
                </select>
              </div>
            </div>

            {/* Granular Queue Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#0B2638] text-[#91A9BB] text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-lg">Target ID & Class</th>
                    <th className="py-2.5 px-2">Coordinates</th>
                    <th className="py-2.5 px-2">YOLOv8</th>
                    <th className="py-2.5 px-2">Drift Vector</th>
                    <th className="py-2.5 px-2">Risk Score</th>
                    <th className="py-2.5 px-2">Verification</th>
                    <th className="py-2.5 px-3 rounded-r-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16465A]">
                  {filteredTargets.map((row) => {
                    const isSelected = selectedTargetId === row.id;
                    const isApproved = biologistApproved[row.id];

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedTargetId(row.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#103B50]/60 border-l-4 border-[#00E5FF]'
                            : 'hover:bg-[#0B2638]/60'
                        }`}
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold flex items-center gap-1.5 text-[#EAF6FF]">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                row.severityClass === 'critical' ? 'bg-[#FF6B61]' : 'bg-[#00E5FF]'
                              }`}
                            />
                            <span>#{row.id}</span>
                          </div>
                          <div className="text-[11px] text-[#91A9BB] font-normal">{row.name}</div>
                        </td>
                        <td className="py-3 px-2 text-[11px] text-[#91A9BB] whitespace-nowrap">
                          {row.coords}
                        </td>
                        <td className="py-3 px-2">
                          <span className="text-[#00D6A3] font-semibold">{row.confidence}%</span>
                        </td>
                        <td className="py-3 px-2 text-[11px] text-[#EAF6FF]">
                          {row.drift}
                        </td>
                        <td className="py-3 px-2">
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                              row.severityClass === 'critical'
                                ? 'bg-[#FF6B61]/20 text-[#FF6B61]'
                                : row.severityClass === 'high'
                                ? 'bg-[#FFB547]/20 text-[#FFB547]'
                                : 'bg-[#00D6A3]/20 text-[#00D6A3]'
                            }`}
                          >
                            <span>{row.riskScore} / 100</span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          {isApproved ? (
                            <span className="text-[#00D6A3] text-[10px] font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approved</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#00E5FF]/15 text-[#00E5FF] text-[10px] font-semibold whitespace-nowrap">
                              Pending Sign-off
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-block px-2 py-1 rounded font-bold text-[10px] tracking-wider uppercase ${
                              isSelected
                                ? 'bg-[#00E5FF] text-[#061522]'
                                : 'bg-[#103B50] text-[#EAF6FF] hover:bg-[#16465A]'
                            }`}
                          >
                            {isSelected ? 'SELECTED' : 'INSPECT'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Target Detailed Risk Dossier (5/12 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Dossier Header Card: Target Banner & Hazard Rating */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B61]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg text-[#EAF6FF] font-bold">#{selectedTarget.id}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#FF6B61] text-[#061522]">
                    {selectedTarget.tier.toUpperCase()}
                  </span>
                </div>
                <p className="font-mono text-xs text-[#FF6B61] mt-0.5 tracking-wide">
                  {selectedTarget.name.toUpperCase()} ({selectedTarget.extent})
                </p>
              </div>

              {/* Overall Composite Risk Gauge Widget */}
              <div className="text-right">
                <div className="font-display text-3xl text-[#FF6B61] font-bold leading-none">
                  {selectedTarget.riskScore}
                  <span className="text-xs font-normal text-[#91A9BB]">/100</span>
                </div>
                <div className="font-mono text-[9px] text-[#FF6B61] uppercase font-bold tracking-wider mt-1">
                  RISK INDEX SCORE
                </div>
              </div>
            </div>

            {/* Detection Imagery Thumbnail & Status Bar */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="col-span-1 relative rounded-xl overflow-hidden aspect-video bg-[#040e17] border border-[#16465A]">
                <img
                  src={selectedTarget.image}
                  alt="High-resolution aerial view of submerged ghost net"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 bg-[#040e17]/85 text-[#00E5FF] font-mono text-[9px] px-1.5 py-0.5 rounded border border-[#00E5FF]/30">
                  YOLO {selectedTarget.confidence}%
                </div>
              </div>

              {/* Rapid Vital Matrix */}
              <div className="col-span-2 flex flex-col justify-between font-mono text-[11px] text-[#91A9BB] space-y-1">
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span className="text-[#EAF6FF] font-medium">{selectedTarget.coords}</span>
                </div>
                <div className="flex justify-between">
                  <span>Water Depth:</span>
                  <span className="text-[#EAF6FF] font-medium">{selectedTarget.waterDepth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Submerged Depth:</span>
                  <span className="text-[#EAF6FF] font-medium">{selectedTarget.submergedDepth}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vector Threat:</span>
                  <span className="text-[#FF6B61] font-bold">{selectedTarget.vectorThreat}</span>
                </div>
              </div>
            </div>

            {/* Biologist Review Alert Bar */}
            <div className="bg-[#0B2638] border border-[#00E5FF]/30 rounded-lg p-2.5 flex items-center justify-between text-[#EAF6FF] font-mono text-xs">
              <div className="flex items-center gap-2">
                {biologistApproved[selectedTarget.id] ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#00D6A3]" />
                    <span className="text-[#00D6A3] font-semibold">Approved by Marine Biologist on duty</span>
                  </>
                ) : (
                  <>
                    <RotateCw className="w-4 h-4 text-[#00E5FF] animate-spin" />
                    <span>Marine Biologist Sign-Off Pending</span>
                  </>
                )}
              </div>

              {!biologistApproved[selectedTarget.id] && (
                <button
                  onClick={() => handleApprove(selectedTarget.id)}
                  className="px-3 py-1 rounded bg-[#00E5FF] text-[#061522] font-bold hover:bg-[#75E6DA] transition-colors"
                >
                  APPROVE
                </button>
              )}
            </div>
          </div>

          {/* Scientific Multi-Factor Risk Decomposition Card */}
          <div className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <h2 className="font-display text-sm text-[#EAF6FF] font-semibold">Algorithmic Risk Formulation</h2>
              <span className="font-mono text-[10px] text-[#91A9BB]">Weighted Sum (Σ = 1.0)</span>
            </div>

            {/* 4 Weighted Components with Progress Bars & Explanations */}
            <div className="space-y-3 font-mono text-xs">
              {/* Factor 1: Habitat Proximity Index (35%) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#EAF6FF] font-bold">1. Habitat Proximity Index (Weight: 35%)</span>
                  <span className="text-[#FF6B61] font-bold">{selectedTarget.scores.habitat} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B2638] overflow-hidden">
                  <div className="h-full bg-[#FF6B61] rounded-full" style={{ width: `${selectedTarget.scores.habitat}%` }} />
                </div>
                <p className="text-[11px] text-[#91A9BB] leading-relaxed">
                  Target trajectory intersects the 500m perimeter of Tavaru Sanctuary Coral Nursery within &lt;20 hours.
                </p>
              </div>

              {/* Factor 2: Entanglement Hazard (25%) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#EAF6FF] font-bold">2. Entanglement Hazard (Weight: 25%)</span>
                  <span className="text-[#FF6B61] font-bold">{selectedTarget.scores.entanglement} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B2638] overflow-hidden">
                  <div className="h-full bg-[#FF6B61] rounded-full" style={{ width: `${selectedTarget.scores.entanglement}%` }} />
                </div>
                <p className="text-[11px] text-[#91A9BB] leading-relaxed">
                  Monofilament gillnet with leadline sinkers; lethal risk to Acropora branch coral structure & Green Sea Turtles.
                </p>
              </div>

              {/* Factor 3: Hydrodynamic Drift Exposure (20%) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#EAF6FF] font-bold">3. Hydrodynamic Drift Exposure (Weight: 20%)</span>
                  <span className="text-[#FFB547] font-bold">{selectedTarget.scores.drift} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B2638] overflow-hidden">
                  <div className="h-full bg-[#FFB547] rounded-full" style={{ width: `${selectedTarget.scores.drift}%` }} />
                </div>
                <p className="text-[11px] text-[#91A9BB] leading-relaxed">
                  Surface current of 1.4 kts aligned with spring ebb tide pushing directly onto shallow reef crest (-3.2m depth).
                </p>
              </div>

              {/* Factor 4: Persistence & Structural Mass (20%) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#EAF6FF] font-bold">4. Mass & Polyamide Longevity (Weight: 20%)</span>
                  <span className="text-[#FF6B61] font-bold">{selectedTarget.scores.mass} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#0B2638] overflow-hidden">
                  <div className="h-full bg-[#FF6B61] rounded-full" style={{ width: `${selectedTarget.scores.mass}%` }} />
                </div>
                <p className="text-[11px] text-[#91A9BB] leading-relaxed">
                  Synthetic non-biodegradable nylon mesh estimated at {selectedTarget.extent} with severe biofouling & ghost-fishing looping.
                </p>
              </div>
            </div>

            {/* Environmental Threat Context & Receptors */}
            <div className="pt-2 border-t border-[#16465A] space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[#91A9BB] font-semibold">
                Vulnerable Biological Receptors
              </div>
              <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
                <div className="bg-[#0B2638] p-2 rounded-lg border border-[#16465A]">
                  <div className="text-[#FF6B61] font-bold text-sm">94%</div>
                  <div className="text-[#EAF6FF] mt-0.5">Acropora Coral</div>
                  <div className="text-[9px] text-[#91A9BB]">Smothering</div>
                </div>
                <div className="bg-[#0B2638] p-2 rounded-lg border border-[#16465A]">
                  <div className="text-[#FF6B61] font-bold text-sm">88%</div>
                  <div className="text-[#EAF6FF] mt-0.5">Hawksbill Turtle</div>
                  <div className="text-[9px] text-[#91A9BB]">Rookery Snag</div>
                </div>
                <div className="bg-[#0B2638] p-2 rounded-lg border border-[#16465A]">
                  <div className="text-[#FFB547] font-bold text-sm">62%</div>
                  <div className="text-[#EAF6FF] mt-0.5">Artisanal Vessel</div>
                  <div className="text-[9px] text-[#91A9BB]">Propeller Fouling</div>
                </div>
              </div>

              {/* Measured vs Estimated Notation */}
              <div className="bg-[#0B2638] px-3 py-2 rounded-lg text-[10px] font-mono text-[#91A9BB] border border-[#16465A] leading-normal">
                <span className="text-[#00D6A3] font-semibold">MEASURED:</span> Optical UAV GSD 1.2cm/px, RTK GPS Fix.<br />
                <span className="text-[#00E5FF] font-semibold">ESTIMATED:</span> Hydrodynamic Lagrangian Drift + IUCN Coral Sensitivity Weights.
              </div>
            </div>

            {/* Primary Decision-Support Action CTA Buttons */}
            <div className="pt-2 border-t border-[#16465A] space-y-2">
              <Link
                to="/recovery-planning"
                state={{
                  detection: selectedTarget.rawObservation,
                  targetId: selectedTarget.id,
                  source: selectedTarget.isLive ? 'live-detection' : 'demo-detection',
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#00E5FF] text-[#061522] font-display text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_28px_rgba(0,229,255,0.7)] transition-all uppercase tracking-wider text-center"
              >
                <span>DISPATCH TO RECOVERY PLANNING</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/detection-details"
                  state={{
                    detection: selectedTarget.rawObservation,
                    obsId: selectedTarget.id,
                    annotatedImage: selectedTarget.image,
                    reviewStatus: biologistApproved[selectedTarget.id] ? 'confirmed' : 'pending',
                    isDemo: !selectedTarget.isLive,
                  }}
                  className="py-2 px-3 rounded-lg bg-[#0B2638] text-[#EAF6FF] hover:text-[#00E5FF] hover:bg-[#103B50] font-mono text-xs flex items-center justify-center gap-1.5 transition-colors text-center border border-[#16465A]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Detection Details</span>
                </Link>
                <Link
                  to="/drift-forecast"
                  state={{ targetId: selectedTarget.id }}
                  className="py-2 px-3 rounded-lg bg-[#0B2638] text-[#EAF6FF] hover:text-[#00E5FF] hover:bg-[#103B50] font-mono text-xs flex items-center justify-center gap-1.5 transition-colors text-center border border-[#16465A]"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Drift Forecast</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operational Heuristic Disclaimer */}
      <section className="bg-[#071D33] p-3.5 rounded-xl border border-[#16465A] flex items-start gap-3 text-[#91A9BB] text-xs leading-relaxed">
        <Info className="w-4 h-4 text-[#00E5FF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[#EAF6FF] font-semibold">Decision-Support Simulation Notice: </span>
          Risk scoring represents an algorithmic heuristic for operational ALDFG salvage prioritization. Models synthesized from simulated Pacific hydrological currents and synthetic neural network inferences do not guarantee exact in-situ biological impact or replace physical diver safety protocols.
        </div>
      </section>
    </div>
  );
};

export default RiskAssessment;
