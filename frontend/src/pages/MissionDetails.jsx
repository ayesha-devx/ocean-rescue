import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowRight,
  Video,
  FileText,
  Activity,
  Layers,
  Anchor,
  Radio,
  SlidersHorizontal,
  Plus
} from 'lucide-react';

export const MissionDetails = () => {
  // Mission state
  const [missionStatus, setMissionStatus] = useState('in_progress'); // 'planned', 'authorized', 'dispatched', 'en_route', 'in_progress', 'completed'
  const [outcomeClassification, setOutcomeClassification] = useState('full'); // 'full', 'partial', 'not_found', 'aborted'
  const [toastMessage, setToastMessage] = useState(null);
  const [quickNote, setQuickNote] = useState('');
  const [showRovModal, setShowRovModal] = useState(false);

  // Timeline events state
  const [timelineEvents, setTimelineEvents] = useState([
    {
      id: 1,
      title: 'ROV Grapple Hook Engaged',
      time: '16:15 UTC',
      desc: 'Tethered ROV-03 confirmed positive mechanical lock on headrope of monofilament net. Hydraulic tension stable at 1.8T. Beginning slow vertical retrieval hoist.',
      author: 'M. Chen (ROV Specialist)',
      highlight: true
    },
    {
      id: 2,
      title: 'On-Scene Visual Acquired',
      time: '15:58 UTC',
      desc: 'Sub-surface camera 4K feed confirmed target #OR-2024-094 entangled across limestone outcrop, clear of live coral heads. No megafauna entrapment detected on preliminary scan.',
      author: 'Dr. S. Nair (Bio Observer)',
      highlight: false
    },
    {
      id: 3,
      title: 'Arrived at Intercept Waypoint Bravo',
      time: '15:42 UTC',
      desc: 'Station-keeping dynamic positioning activated at 17.3105° S, 178.4350° E. Weather window confirmed stable. ROV pre-dive systems green.',
      author: 'Capt. J. Vosa (Vessel Master)',
      highlight: false
    },
    {
      id: 4,
      title: 'Vessel Dispatched from Staging Pier 4',
      time: '14:45 UTC',
      desc: 'Master authorized departure with 3 crew aboard. Transit speed maintained at 14.0 kts across open bay.',
      author: 'Capt. J. Vosa (Vessel Master)',
      highlight: false
    },
    {
      id: 5,
      title: 'Lead Authorized Mission Plan',
      time: '13:10 UTC',
      desc: 'Operational clearance signed off by Project Lead. Marine Sanctuary Authority notified of adjacent salvage path.',
      author: 'Operations Lead',
      highlight: false
    }
  ]);

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePostNote = (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;

    const newLog = {
      id: Date.now(),
      title: 'Tactical Field Observation',
      time: 'Just now',
      desc: quickNote.trim(),
      author: 'Field Operator (Console)',
      highlight: true
    };

    setTimelineEvents([newLog, ...timelineEvents]);
    setQuickNote('');
    showFeedback('Tactical field note logged into mission record.');
  };

  const handleCompleteMission = () => {
    setMissionStatus('completed');
    showFeedback('Mission #MP-2024-088 status updated to COMPLETED. Final telemetry archived.');
  };

  // Status mapping
  const stages = [
    { key: 'planned', num: '01', title: 'Planned', sub: '12:45 UTC • Auth Net' },
    { key: 'authorized', num: '02', title: 'Authorized', sub: '13:10 UTC • Ops Lead' },
    { key: 'dispatched', num: '03', title: 'Dispatched', sub: '14:45 UTC • Pier 4' },
    { key: 'en_route', num: '04', title: 'En Route', sub: 'Arrived 15:42 UTC' },
    { key: 'in_progress', num: '05', title: 'Recovery Active', sub: 'Grapple locked @ -28m' },
    { key: 'completed', num: '06', title: 'Completed', sub: 'Final verification' }
  ];

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF]" />
          <span className="font-mono text-xs">{toastMessage}</span>
        </div>
      )}

      {/* ROV Camera Modal Simulation */}
      {showRovModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B2638] border border-[#16465A] rounded-xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#00E5FF]" />
                <span className="font-display font-semibold text-sm text-[#EAF6FF]">
                  LIVE ROV-03 4K SUBSEA TELEMETRY FEED
                </span>
              </div>
              <button
                onClick={() => setShowRovModal(false)}
                className="text-[#91A9BB] hover:text-[#EAF6FF] text-xs font-mono px-2 py-1 bg-[#103B50] rounded"
              >
                Close ✕
              </button>
            </div>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5tQ_N-pcazLSksy0cZapVfxdhrtc1KJBRxdUxuaKNvyqx3PwC04_PZUb7H3jzXEqN15-zkcvP0lQwdtmQiIa9u266rWjI8PT_g1-rGLbC5wrKv4yMK_X5tMcbLe9BFj4khZ_oEZignz2uZNg3euy_gAVShqtv8mFwGX5NvOWiP8FjKMU2rA9b_HD4A3F-r-WdsKECDt9iz7BuCOICnVvUaQfDo7hWY-3LlMPuSVGoC0UZionzLUSD"
                alt="ROV Camera Feed"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#040e17]/80 backdrop-blur px-2.5 py-1 rounded font-mono text-[10px] text-[#00E5FF] flex items-center gap-1.5 border border-[#00E5FF]/30">
                <span className="w-2 h-2 rounded-full bg-[#FF6B61] animate-ping" />
                <span>REC • LIVE FEED</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between font-mono text-[11px] text-[#00E5FF] bg-[#040e17]/80 px-3 py-1 rounded">
                <span>DEPTH: -28.4m</span>
                <span>TENSION: 1.8T</span>
                <span>SST: 26.3°C</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. ATMOSPHERIC MISSION COMMAND HERO */}
      <PageHero
        sector="Lau Basin & Tavaru Sector 4"
        title="Mission Command Dossier // Operation Net-Retrieve"
        subtitle="Tactical multi-agent salvage execution, live subsea ROV telemetry, and chain-of-custody tracking for target #OR-2024-094."
        badgeText={missionStatus === 'completed' ? 'MISSION COMPLETED' : 'RECOVERY IN PROGRESS'}
        badgeVariant={missionStatus === 'completed' ? 'teal' : 'cyan'}
        stats={[
          {
            label: 'MISSION ID',
            value: '#MP-2024-088',
            highlightColor: 'text-[#00E5FF]',
            icon: <FileText className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'TARGET',
            value: '#OR-2024-094 (Gillnet ~45m)',
            highlightColor: 'text-[#75E6DA]',
            icon: <Layers className="w-3.5 h-3.5 text-[#75E6DA]" />
          },
          {
            label: 'INTERCEPT ASSET',
            value: 'R/V Pelagic Sentinel (Orca-3)',
            highlightColor: 'text-[#EAF6FF]',
            icon: <Ship className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'ROV TENSION',
            value: '1.8T (Depth -28.4m)',
            highlightColor: 'text-[#00D6A3]',
            icon: <Anchor className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'SEVERITY TIER',
            value: 'Tier 1 Critical (96/100)',
            highlightColor: 'text-[#FF6B61]',
            icon: <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B61]" />
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                const el = document.getElementById('quick-field-note');
                if (el) el.focus();
              }}
              className="px-3.5 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] text-xs font-mono transition-all flex items-center gap-1.5 border border-[#16465A] hover:border-[#00E5FF] shadow-md cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Add Field Note</span>
            </button>

            <button
              onClick={() => setShowRovModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] text-xs font-mono transition-all flex items-center gap-1.5 border border-[#16465A] hover:border-[#00D6A3] shadow-md cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-[#00D6A3]" />
              <span>Live ROV Feed</span>
            </button>

            <button
              onClick={handleCompleteMission}
              className="px-4 py-2 rounded-lg bg-[#00E5FF] text-[#061522] font-display text-xs uppercase tracking-wider font-bold transition-all shadow-[0_0_16px_rgba(0,229,255,0.35)] hover:shadow-[0_0_22px_rgba(0,229,255,0.6)] flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Mission</span>
            </button>
          </div>
        }
      />

      {/* 2. MISSION STAGE STEPPER (6 SEQUENTIAL PHASES) */}
      <section
        className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-2.5"
        data-purpose="mission-stage-stepper"
      >
        <div className="flex items-center justify-between pb-1 border-b border-[#16465A]">
          <span className="font-mono text-xs text-[#91A9BB] uppercase tracking-wider">
            Mission Lifecycle Progression
          </span>
          <span className="font-mono text-xs text-[#00D6A3]">
            {missionStatus === 'completed'
              ? 'Phase 6 of 6 complete • Mission Archived'
              : 'Phase 5 of 6 active • Station-Keeping @ 0.4 kts'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {stages.map((stg) => {
            const isCompletedStage =
              (missionStatus === 'completed') ||
              (stg.key === 'planned') ||
              (stg.key === 'authorized' && ['authorized', 'dispatched', 'en_route', 'in_progress'].includes(missionStatus)) ||
              (stg.key === 'dispatched' && ['dispatched', 'en_route', 'in_progress'].includes(missionStatus)) ||
              (stg.key === 'en_route' && ['en_route', 'in_progress'].includes(missionStatus));

            const isActiveStage =
              (stg.key === missionStatus) ||
              (stg.key === 'in_progress' && missionStatus === 'in_progress');

            return (
              <div
                key={stg.key}
                onClick={() => {
                  setMissionStatus(stg.key);
                  showFeedback(`Updated mission status to: ${stg.title}`);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isActiveStage
                    ? 'bg-[#103B50] border-[#00E5FF] ring-1 ring-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : isCompletedStage
                    ? 'bg-[#0B2638] border-[#16465A] text-[#91A9BB]'
                    : 'bg-[#0B2638]/50 border-[#16465A]/50 text-[#91A9BB]/50'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span>{stg.num}</span>
                  {isActiveStage ? (
                    <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
                  ) : isCompletedStage ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-[#91A9BB]/40" />
                  )}
                </div>

                <div className="mt-2">
                  <div
                    className={`font-display text-xs font-semibold ${
                      isActiveStage ? 'text-[#00E5FF]' : isCompletedStage ? 'text-[#EAF6FF]' : 'text-[#91A9BB]'
                    }`}
                  >
                    {stg.title}
                  </div>
                  <div className="font-mono text-[9px] text-[#91A9BB] truncate mt-0.5">{stg.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. MAIN ASYMMETRIC MULTI-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* LEFT COLUMN (GIS Map + Event Stream + Outcome Dossier) - 7 cols */}
        <div className="xl:col-span-7 flex flex-col space-y-4">
          {/* Tactical Geospatial Map HUD Panel */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl overflow-hidden shadow-lg flex flex-col">
            <div className="p-3 bg-[#0B2638] border-b border-[#16465A] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-[#EAF6FF] font-semibold uppercase">Tactical Intercept GIS Vector Canvas</span>
                <span className="text-[#91A9BB]">| WGS84 • 17°18'38" S, 178°26'06" E</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[#103B50] text-[#00E5FF]">Zoom 14.8x</span>
                <span className="px-2 py-0.5 rounded bg-[#103B50] text-[#00D6A3]">Bathymetry: -38m</span>
              </div>
            </div>

            {/* Geospatial Canvas with Data Map & Overlays */}
            <div className="relative w-full h-[410px] bg-[#040e17] overflow-hidden select-none">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 450">
                <defs>
                  <pattern id="tactical-grid-ms" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#16465A" strokeWidth="0.5" strokeDasharray="2 3" />
                  </pattern>
                  <linearGradient id="coralGlow-ms" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff6b61" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ff6b61" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                <rect width="100%" height="100%" fill="url(#tactical-grid-ms)" />

                {/* Bathymetric depth contour lines */}
                <path d="M-50,120 Q120,90 280,150 T600,140 T850,90" stroke="#00daf3" strokeWidth="1" strokeDasharray="3 4" opacity="0.3" fill="none" />
                <text x="710" y="85" fill="#849396" fontSize="9" className="font-mono">-15m CONTOUR</text>

                <path d="M-30,220 Q160,180 340,240 T720,210 T850,260" stroke="#00daf3" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.45" fill="none" />
                <text x="680" y="205" fill="#849396" fontSize="9" className="font-mono">-38m INTERCEPT CONTOUR</text>

                <path d="M-40,340 Q220,310 420,360 T780,310 T850,380" stroke="#00daf3" strokeWidth="1.4" opacity="0.25" fill="none" />
                <text x="720" y="305" fill="#849396" fontSize="9" className="font-mono">-120m SHELF</text>

                {/* Sanctuary Zone A */}
                <polygon points="460,40 760,30 780,240 520,220" fill="url(#coralGlow-ms)" stroke="#ff6b61" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x="480" y="65" fill="#ffb4ac" fontSize="10" fontWeight="bold" className="font-mono">SANCTUARY ZONE A (RESTRICTED)</text>
                <text x="480" y="80" fill="#bac9cc" fontSize="9" className="font-mono">500m Ecological Buffer Active</text>

                {/* Transit Breadcrumb Path from Lautoka Pier 4 */}
                <path d="M 60,390 Q 140,320 220,270 T 360,210" fill="none" stroke="#50dbc8" strokeWidth="2.5" strokeDasharray="6 4" />

                {/* Target Ghost Net Polygon Overlay */}
                <polygon points="360,205 390,215 385,235 350,225" fill="#ff6b61" fillOpacity="0.5" stroke="#ffb4ac" strokeWidth="1.5" />
                <circle cx="372" cy="220" r="28" stroke="#ff6b61" strokeWidth="1" strokeDasharray="3 3" opacity="0.8" className="animate-pulse" />

                {/* Vessel Dynamic Positioning Station-Keeping Circle */}
                <circle cx="360" cy="205" r="45" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4 2" opacity="0.6" />
                <circle cx="360" cy="205" r="4" fill="#00e5ff" />

                {/* ROV Tether line heading subsea */}
                <line x1="360" y1="205" x2="375" y2="218" stroke="#50dbc8" strokeWidth="2" />
              </svg>

              {/* Pins & Callout Badges */}
              <div className="absolute top-[165px] left-[320px] transform -translate-x-1/2 -translate-y-1/2">
                <div className="bg-[#0B2638]/95 backdrop-blur p-2.5 rounded-lg shadow-xl border-l-2 border-[#00E5FF] text-[#EAF6FF] border border-[#16465A]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#00E5FF] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
                    R/V Pelagic Sentinel
                  </div>
                  <div className="font-mono text-[10px] text-[#91A9BB] mt-0.5">
                    SOG: 0.4 kts • HDG: 168° • DP-Locked
                  </div>
                </div>
              </div>

              <div className="absolute top-[230px] left-[420px]">
                <div className="bg-[#0B2638]/95 backdrop-blur p-2.5 rounded-lg shadow-xl border-l-2 border-[#FF6B61] text-[#EAF6FF] border border-[#16465A]">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold text-[#FF6B61] uppercase">
                    <Anchor className="w-3 h-3 text-[#FF6B61]" />
                    TARGET: #OR-2024-094
                  </div>
                  <div className="font-mono text-[10px] text-[#91A9BB] mt-0.5">
                    Depth: -38.2m • Tension: 1.8T Lock
                  </div>
                </div>
              </div>

              {/* On-Map Telemetry HUD Widget */}
              <div className="absolute bottom-4 right-4 bg-[#0B2638]/95 border border-[#16465A] backdrop-blur p-3 rounded-xl shadow-xl max-w-xs">
                <div className="font-mono text-xs text-[#00E5FF] font-semibold uppercase mb-1.5 flex items-center justify-between">
                  <span>Station Oceanography</span>
                  <Activity className="w-3.5 h-3.5 text-[#00D6A3]" />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-[#91A9BB]">
                  <div>Drift: <span className="text-[#EAF6FF] font-bold">1.2 kts SSE</span></div>
                  <div>Swell: <span className="text-[#EAF6FF] font-bold">1.5m @ 8.2s</span></div>
                  <div>Temp: <span className="text-[#EAF6FF] font-bold">26.3°C</span></div>
                  <div>Ebb: <span className="text-[#FFB547] font-bold">Closes 18:30</span></div>
                </div>
              </div>
            </div>

            {/* Subsea Depth & Tension Graph Mini-Dock */}
            <div className="p-4 bg-[#071D33] grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-[#16465A] font-mono text-xs">
              <div className="bg-[#0B2638] p-3 rounded-lg border border-[#16465A]">
                <div className="flex items-center justify-between text-[#91A9BB]">
                  <span>ROV-03 DEPTH</span>
                  <span className="text-[#00D6A3] font-bold">-28.4 m</span>
                </div>
                <div className="w-full bg-[#103B50] h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#00D6A3] h-full rounded-full" style={{ width: '74%' }} />
                </div>
                <span className="text-[10px] text-[#91A9BB] mt-1 block">Target seabed depth: -38.2 m</span>
              </div>

              <div className="bg-[#0B2638] p-3 rounded-lg border border-[#16465A]">
                <div className="flex items-center justify-between text-[#91A9BB]">
                  <span>WINCH HYDRAULIC TENSION</span>
                  <span className="text-[#00E5FF] font-bold">1.8 Tons</span>
                </div>
                <div className="w-full bg-[#103B50] h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#00E5FF] h-full rounded-full" style={{ width: '51%' }} />
                </div>
                <span className="text-[10px] text-[#91A9BB] mt-1 block">Winch Max: 3.5 Tons</span>
              </div>

              <div className="bg-[#0B2638] p-3 rounded-lg border border-[#16465A]">
                <div className="flex items-center justify-between text-[#91A9BB]">
                  <span>SANCTUARY SEPARATION</span>
                  <span className="text-[#00D6A3] font-bold">1.20 NM</span>
                </div>
                <div className="w-full bg-[#103B50] h-2 rounded-full mt-2 overflow-hidden">
                  <div className="bg-[#00D6A3] h-full rounded-full" style={{ width: '85%' }} />
                </div>
                <span className="text-[10px] text-[#91A9BB] mt-1 block">Critical Buffer: 500m Safe</span>
              </div>
            </div>
          </section>

          {/* Chronological Event Stream & Field Updates */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00D6A3]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">Field Updates & Forensic Timeline</h2>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">{timelineEvents.length} logs verified • Auto-sync</span>
            </div>

            <div className="space-y-3 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#16465A]">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="relative">
                  <div
                    className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      evt.highlight
                        ? 'bg-[#00E5FF] border-[#00E5FF] shadow-[0_0_8px_rgba(0,229,255,0.8)]'
                        : 'bg-[#0B2638] border-[#91A9BB]'
                    }`}
                  >
                    <span className="w-1 h-1 rounded-full bg-[#061522]" />
                  </div>

                  <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-display font-semibold text-xs ${
                          evt.highlight ? 'text-[#00E5FF]' : 'text-[#EAF6FF]'
                        }`}
                      >
                        {evt.title}
                      </span>
                      <span className="font-mono text-[10px] text-[#91A9BB]">{evt.time}</span>
                    </div>
                    <p className="text-xs text-[#EAF6FF] leading-relaxed">{evt.desc}</p>
                    <div className="text-[10px] font-mono text-[#00D6A3] pt-0.5">Logged by: {evt.author}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Note Dispatcher */}
            <form onSubmit={handlePostNote} className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <input
                id="quick-field-note"
                type="text"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Type tactical field note or ROV observation timestamp..."
                className="w-full bg-[#0B2638] text-[#EAF6FF] placeholder-[#91A9BB] text-xs font-mono p-2.5 rounded-lg border border-[#16465A] focus:border-[#00E5FF] focus:outline-none"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2.5 bg-[#00D6A3] hover:bg-[#75E6DA] text-[#061522] font-display text-xs uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 flex-shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post Note</span>
              </button>
            </form>
          </section>

          {/* Recovery Outcome & Field Evidence Recording Dossier */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">Recovery Outcome & Evidence Dossier</h2>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">ISO 14001 / ALDFG Protocol</span>
            </div>

            {/* Outcome Selector */}
            <div>
              <label className="block font-mono text-[10px] text-[#91A9BB] mb-1.5 uppercase">
                Projected Mission Outcome Classification
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setOutcomeClassification('full')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    outcomeClassification === 'full'
                      ? 'bg-[#00E5FF] text-[#061522] font-bold shadow-[0_0_12px_rgba(0,229,255,0.3)]'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  Full Recovery
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeClassification('partial')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    outcomeClassification === 'partial'
                      ? 'bg-[#00E5FF] text-[#061522] font-bold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  Partial Recovery
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeClassification('not_found')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    outcomeClassification === 'not_found'
                      ? 'bg-[#00E5FF] text-[#061522] font-bold'
                      : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  Not Found
                </button>
                <button
                  type="button"
                  onClick={() => setOutcomeClassification('aborted')}
                  className={`px-3 py-2 rounded-lg transition-all ${
                    outcomeClassification === 'aborted'
                      ? 'bg-[#FF6B61] text-[#061522] font-bold'
                      : 'bg-[#0B2638] text-[#FF6B61] border border-[#FF6B61]/30'
                  }`}
                >
                  Aborted (Safety)
                </button>
              </div>
            </div>

            {/* Recovered Physical Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB] uppercase">Est. Dry Mass</div>
                <div className="text-base text-[#EAF6FF] font-bold mt-0.5">~380 kg</div>
                <div className="text-[10px] text-[#00D6A3]">1.2 T biofouled wet</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB] uppercase">Measured Length</div>
                <div className="text-base text-[#00E5FF] font-bold mt-0.5">45.2 m</div>
                <div className="text-[10px] text-[#91A9BB]">Monofilament mesh</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB] uppercase">Polymer Spec</div>
                <div className="text-base text-[#EAF6FF] font-bold mt-0.5">HDPE</div>
                <div className="text-[10px] text-[#00D6A3]">High recyclability</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB] uppercase">Bycatch Audit</div>
                <div className="text-base text-[#00D6A3] font-bold mt-0.5">0 MORT</div>
                <div className="text-[10px] text-[#00D6A3]">2 Lobsters freed</div>
              </div>
            </div>

            {/* Evidence Media Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative rounded-lg overflow-hidden aspect-video bg-[#040e17] border border-[#16465A] group">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5tQ_N-pcazLSksy0cZapVfxdhrtc1KJBRxdUxuaKNvyqx3PwC04_PZUb7H3jzXEqN15-zkcvP0lQwdtmQiIa9u266rWjI8PT_g1-rGLbC5wrKv4yMK_X5tMcbLe9BFj4khZ_oEZignz2uZNg3euy_gAVShqtv8mFwGX5NvOWiP8FjKMU2rA9b_HD4A3F-r-WdsKECDt9iz7BuCOICnVvUaQfDo7hWY-3LlMPuSVGoC0UZionzLUSD"
                  alt="ROV Subsea View"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#040e17]/80 text-[#00D6A3] font-mono text-[9px] flex items-center gap-1 border border-[#00D6A3]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" />
                  ROV-03 // HEADCAM 4K
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between font-mono text-[9px] text-[#00E5FF]">
                  <span>DEPTH: -28.4M</span>
                  <span>16:15:32 UTC</span>
                </div>
              </div>

              <div className="relative rounded-lg overflow-hidden aspect-video bg-[#040e17] border border-[#16465A] group">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBU_bHI719BJkfODkMFuCK9-BUfAPeE4r9EO8DGYgFRJ-QNgxK3mglth0u-eSveOqH-4RnbOixq-jtoAuXw-d9xzFHTiYgX2kSDALgbqKLAxi6wEs6eZOFVNDFUVbHLNFLx4hTXhjbzVrwMWDffeoAnoX1kdJ0DtZakhOnYaa5T0A4uVSwwjgeXdGxstwUnNb3qQbireSpcTWVZ1FTrGDZ2f_OeUgeIMzxnzAHPApN2QJ8m6l9JTtU-"
                  alt="Aft Deck Crane View"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#040e17]/80 text-[#00E5FF] font-mono text-[9px] flex items-center gap-1 border border-[#00E5FF]/30">
                  AFT DECK CRANE VIEW
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex justify-between font-mono text-[9px] text-[#91A9BB]">
                  <span>WINCH LOAD: 1.8T</span>
                  <span>HOLD: READY</span>
                </div>
              </div>
            </div>

            {/* Supervisor Sign-Off Field */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-[#91A9BB]">
                Operational compliance certified under Marine Environmental Salvage Regulation MES-401. Digital hash: <span className="font-mono text-[#00E5FF]">0x8F9B...D412</span>
              </div>
              <div className="px-3 py-1.5 rounded bg-[#103B50] text-[#00D6A3] font-mono font-semibold text-xs whitespace-nowrap border border-[#16465A]">
                SIGNATURE: DR. S. NAIR
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (Target Telemetry + Fleet Manifest + Action Center) - 5 cols */}
        <div className="xl:col-span-5 flex flex-col space-y-4">
          {/* Target Information Card */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">Target Intelligence & Telemetry</h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-mono text-xs font-bold border border-[#00E5FF]/30">
                YOLOv8: 94.2%
              </span>
            </div>

            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#91A9BB]">Gear Classification:</span>
                <span className="text-[#00D6A3] font-semibold">fishing_net (Derelict Gillnet)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A9BB]">Initial Fix:</span>
                <span className="text-[#EAF6FF]">17.2860° S, 178.4100° E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A9BB]">Current Fix:</span>
                <span className="text-[#00E5FF]">17.3105° S, 178.4350° E</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A9BB]">Cumulative Drift:</span>
                <span className="text-[#EAF6FF]">2.41 NM SSE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A9BB]">Estimated Age:</span>
                <span className="text-[#EAF6FF]">14 - 21 Days</span>
              </div>
            </div>

            {/* Environmental Conditions Grid */}
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB]">SWELL & PERIOD</div>
                <div className="text-base text-[#EAF6FF] font-bold mt-0.5">1.5m @ 8.2s</div>
                <div className="text-[10px] text-[#00D6A3]">Safe limit (&lt;2.2m)</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB]">SURFACE CURRENT</div>
                <div className="text-base text-[#EAF6FF] font-bold mt-0.5">1.3 kts</div>
                <div className="text-[10px] text-[#91A9BB]">Bearing 160° SSE</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB]">SEA TEMP</div>
                <div className="text-base text-[#EAF6FF] font-bold mt-0.5">26.3°C</div>
                <div className="text-[10px] text-[#00D6A3]">Nominal sensor band</div>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <div className="text-[10px] text-[#91A9BB]">TIDAL EBB WINDOW</div>
                <div className="text-base text-[#FFB547] font-bold mt-0.5">2h 15m</div>
                <div className="text-[10px] text-[#FFB547]">Slack water @ 18:30</div>
              </div>
            </div>

            <div className="bg-[#FF6B61]/15 border border-[#FF6B61]/30 rounded-lg p-2.5 flex items-start gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-[#FF6B61] flex-shrink-0 mt-0.5" />
              <div className="text-[#EAF6FF]">
                <strong className="text-[#FF6B61]">Ecological Threat Vector: </strong>
                Proximity to Tavaru Coral Sanctuary (1.20 NM). Retrieval within ebb window prevents gear drift across coral nursery reef crest.
              </div>
            </div>
          </section>

          {/* Team, Vessel & Operational Equipment Manifest */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Ship className="w-4 h-4 text-[#00D6A3]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">Vessel & Equipment Manifest</h2>
              </div>
              <span className="font-mono text-xs text-[#00D6A3]">Fleet Unit #03</span>
            </div>

            {/* Vessel Bio Card */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-display font-bold text-sm text-[#EAF6FF]">R/V Pelagic Sentinel</div>
                <div className="text-xs text-[#91A9BB]">24m Aluminum Catamaran • Call: VNZ-4891</div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs text-[#00E5FF] font-semibold">TEAM ORCA-3</div>
                <div className="text-[10px] text-[#00D6A3]">VHF Ch 16 / Starlink OK</div>
              </div>
            </div>

            {/* Crew Roles */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] font-medium">Capt. J. Vosa</span>
                <span className="text-[#91A9BB] text-[11px]">Vessel Master & DP Pilot</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] font-medium">M. Chen</span>
                <span className="text-[#91A9BB] text-[11px]">ROV Subsea Engineer</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] font-medium">Dr. S. Nair</span>
                <span className="text-[#91A9BB] text-[11px]">Marine Biologist & Bycatch Officer</span>
              </div>
            </div>

            {/* Hardware Checklist */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                  3.5T Hydraulic Net Winch
                </span>
                <span className="text-[#00D6A3] font-bold text-[10px]">ONLINE (1.8T LOAD)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Inspection ROV-03 (150m Tether)
                </span>
                <span className="text-[#00E5FF] font-bold text-[10px]">DEPLOYED @ -28M</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                  Biohazard HDPE Containment Bin
                </span>
                <span className="text-[#91A9BB] text-[10px]">DECK PREPPED</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0B2638] border border-[#16465A]">
                <span className="text-[#EAF6FF] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
                  Wildlife Disentanglement Kit
                </span>
                <span className="text-[#91A9BB] text-[10px]">STATIONED</span>
              </div>
            </div>
          </section>

          {/* Operational Command & Control Action Center */}
          <section className="bg-[#0B2638] border border-[#16465A] rounded-xl p-4 shadow-lg space-y-3">
            <h2 className="font-display font-semibold text-sm text-[#EAF6FF] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
              <span>Tactical Command Dispatch Actions</span>
            </h2>

            <button
              onClick={handleCompleteMission}
              className="w-full py-3 px-4 rounded-xl bg-[#00E5FF] text-[#061522] font-display text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,229,255,0.45)] hover:shadow-[0_0_30px_rgba(0,229,255,0.7)] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Complete Mission & Archive Report</span>
            </button>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                onClick={() => showFeedback('Status ping sent to R/V Pelagic Sentinel DP bridge.')}
                className="py-2 px-3 rounded-lg bg-[#071D33] hover:bg-[#103B50] text-[#EAF6FF] transition-colors flex items-center justify-center gap-1.5 border border-[#16465A]"
              >
                <RotateCw className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span>Update Status</span>
              </button>
              <button
                onClick={() => showFeedback('Initiated background optical sync with UAV telemetry gateway.')}
                className="py-2 px-3 rounded-lg bg-[#071D33] hover:bg-[#103B50] text-[#EAF6FF] transition-colors flex items-center justify-center gap-1.5 border border-[#16465A]"
              >
                <Activity className="w-3.5 h-3.5 text-[#00D6A3]" />
                <span>Upload Optical</span>
              </button>
            </div>

            <button
              onClick={() => showFeedback('Emergency abort protocol flagged. Operator standby.')}
              className="w-full py-2 px-3 rounded-lg bg-[#FF6B61]/15 hover:bg-[#FF6B61]/25 text-[#FF6B61] font-mono text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-[#FF6B61]/30"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Report Operational Issue / Safety Abort</span>
            </button>
          </section>
        </div>
      </div>

      {/* Operational Notice & Simulation Disclaimer */}
      <section className="bg-[#071D33] rounded-xl p-3.5 border border-[#16465A] flex items-start gap-3 text-[#91A9BB] text-xs leading-relaxed">
        <Info className="w-4 h-4 text-[#00E5FF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[#EAF6FF] font-semibold">Simulated Operational Dataset [Demo Run] — </span>
          Mission tracking reflects decision-support simulation protocols. Field actions, ROV telemetry, and sensor vectors represent synthesized scenario execution and do not dispatch actual vessels or provide live SOLAS navigation.
        </div>
      </section>
    </div>
  );
};

export default MissionDetails;
