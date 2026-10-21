import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useObservations } from '../context/ObservationContext';
import { PageHero } from '../components/PageHero';
import {
  BarChart3,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Waves,
  ShieldAlert,
  Compass,
  FileSpreadsheet,
  FileCode,
  FileText,
  Activity
} from 'lucide-react';

export const ReportsAnalytics = () => {
  const { observations: sessionObservations } = useObservations();

  // Filter & interaction state
  const [dateRange, setDateRange] = useState('30d');
  const [classFilter, setClassFilter] = useState('all');
  const [heatmapActive, setHeatmapActive] = useState(true);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showFeedback = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showFeedback('Session observations and demo dataset synchronized.');
    }, 600);
  };

  // Structured demonstration observations (clearly labeled as simulated dataset)
  const demoObservations = [
    {
      id: 'OR-2024-094',
      type: 'Fishing Net',
      category: 'fishing_net',
      spec: 'Ghost Gillnet (~45m)',
      confidence: 94.2,
      coords: '17°48\'32"S, 177°06\'14"E',
      riskScore: 9.6,
      tier: 'Critical',
      status: 'Biologist Confirmed',
      drift: '1.4 kts @ 165° SSE (Simulated)',
      date: '2024-10-24',
      daysAgo: 1
    },
    {
      id: 'OR-2024-089',
      type: 'Rope / Line',
      category: 'rope_line',
      spec: 'Mooring Line (~82m)',
      confidence: 89.6,
      coords: '17°48\'24"S, 177°05\'58"E',
      riskScore: 7.8,
      tier: 'High',
      status: 'Biologist Confirmed',
      drift: '0.9 kts @ 170° S (Simulated)',
      date: '2024-10-24',
      daysAgo: 1
    },
    {
      id: 'OR-2024-072',
      type: 'Fishing Net',
      category: 'fishing_net',
      spec: 'Fishnet Scrap (~12m)',
      confidence: 71.3,
      coords: '17°49\'02"S, 177°06\'45"E',
      riskScore: 5.4,
      tier: 'Medium',
      status: 'Automated Review',
      drift: '0.6 kts @ 185° S (Simulated)',
      date: '2024-10-20',
      daysAgo: 5
    },
    {
      id: 'OR-2024-101',
      type: 'Rope / Line',
      category: 'rope_line',
      spec: 'Polypropylene Cord (~30m)',
      confidence: 91.0,
      coords: '17°47\'55"S, 177°07\'10"E',
      riskScore: 4.1,
      tier: 'Low',
      status: 'Monitored',
      drift: '1.2 kts @ 160° SSE (Simulated)',
      date: '2024-10-12',
      daysAgo: 13
    },
    {
      id: 'OR-2024-065',
      type: 'Trap / Buoy',
      category: 'trap_buoy',
      spec: 'Derelict Crab Pot Line',
      confidence: 84.5,
      coords: '17°48\'12"S, 177°06\'28"E',
      riskScore: 6.8,
      tier: 'Medium',
      status: 'Biologist Confirmed',
      drift: '0.8 kts @ 175° S (Simulated)',
      date: '2024-09-28',
      daysAgo: 27
    },
    {
      id: 'OR-2024-048',
      type: 'Fishing Net',
      category: 'fishing_net',
      spec: 'Trawl Codend Mesh (~22m)',
      confidence: 76.8,
      coords: '17°49\'35"S, 177°05\'40"E',
      riskScore: 8.2,
      tier: 'High',
      status: 'Biologist Confirmed',
      drift: '1.1 kts @ 168° SSE (Simulated)',
      date: '2024-08-20',
      daysAgo: 66
    },
    {
      id: 'OR-2024-033',
      type: 'Rope / Line',
      category: 'rope_line',
      spec: 'Heavy Hawser Segment (~55m)',
      confidence: 82.1,
      coords: '17°47\'18"S, 177°08\'05"E',
      riskScore: 3.8,
      tier: 'Low',
      status: 'Monitored',
      drift: '0.5 kts @ 190° S (Simulated)',
      date: '2024-04-15',
      daysAgo: 193
    }
  ];

  // Map live session observations from ObservationContext
  const liveSessionRecords = sessionObservations
    .filter((o) => !o.isSimulated)
    .map((obs) => ({
      id: obs.id,
      type: obs.class_name === 'fishing_net' ? 'Fishing Net' : 'Rope / Line',
      category: obs.class_name || 'fishing_net',
      spec: obs.bbox_xyxy ? `Live Ingest BBox [${obs.bbox_xyxy.map(Math.round).join(', ')}]` : 'Optical Live Ingestion',
      confidence: obs.confidencePercent ?? (obs.confidence != null ? +(obs.confidence * 100).toFixed(1) : 94.2),
      coords: obs.hasGps && obs.coords ? obs.coords : 'Unlocated (GPS Required)',
      riskScore: 8.8,
      tier: 'Critical',
      status: obs.reviewStatus === 'confirmed' ? 'Verified [Session]' : obs.reviewStatus === 'flagged' ? 'Flagged [Session]' : obs.reviewStatus === 'rejected' ? 'Rejected [Session]' : 'Pending Review',
      drift: obs.hasGps ? (obs.currentDrift || '1.4 kts @ 165° SSE') : 'N/A (Unlocated)',
      date: obs.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      daysAgo: 0,
      isLive: true,
      rawObservation: obs,
    }));

  const observations = [...liveSessionRecords, ...demoObservations];

  // Functional multi-criteria filtering
  const filteredRecords = observations.filter((item) => {
    // 1. Date Range
    if (dateRange === '7d' && item.daysAgo > 7) return false;
    if (dateRange === '30d' && item.daysAgo > 30) return false;
    if (dateRange === '90d' && item.daysAgo > 90) return false;

    // 2. Class Filter
    if (classFilter !== 'all' && item.category !== classFilter) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.id.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        item.spec.toLowerCase().includes(q) ||
        item.coords.toLowerCase().includes(q) ||
        item.tier.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Client-side export handlers (transparently labeled)
  const exportAsCSV = () => {
    const headers = [
      'Observation ID',
      'Target Class',
      'Specification',
      'Confidence (%)',
      'Coordinates (WGS84)',
      'Risk Score (0-10)',
      'Severity Tier',
      'Verification Status',
      'Estimated Drift',
      'Detection Date',
      'Data Mode'
    ];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.type,
      `"${r.spec}"`,
      r.confidence,
      `"${r.coords}"`,
      r.riskScore,
      r.tier,
      `"${r.status}"`,
      `"${r.drift}"`,
      r.date,
      '"SIMULATED / DEMO"'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `oceanrescue_simulated_report_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
    showFeedback(`Exported ${filteredRecords.length} simulated observations as CSV.`);
  };

  const exportAsJSON = () => {
    const payload = {
      datasetNotice: 'TACTICAL OBSERVATION DATASET — OceanRescue Maritime Intelligence',
      generatedAt: new Date().toISOString(),
      filterApplied: { dateRange, classFilter, searchQuery },
      recordCount: filteredRecords.length,
      baselineValidation: {
        model: 'YOLOv8s-seg (Preliminary Research Baseline)',
        subsetSize: 110,
        boxPrecision: 0.468,
        boxRecall: 0.370,
        boxMap50: 0.353,
        maskPrecision: 0.396,
        maskRecall: 0.317,
        maskMap50: 0.286,
        validationNotice: 'Preliminary results from 110-image validation subset; not field-validated.'
      },
      records: filteredRecords
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataStr);
    link.setAttribute('download', `oceanrescue_simulated_report_${dateRange}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportDropdownOpen(false);
    showFeedback(`Exported ${filteredRecords.length} simulated observations as JSON.`);
  };

  const handlePrint = () => {
    setExportDropdownOpen(false);
    // Allow React state to flush and close dropdown menu before calling browser print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto select-none print:p-0 print:space-y-4 print:max-w-none">
      {/* Toast Notification (Hidden on Print) */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B50] border border-[#00E5FF] text-[#EAF6FF] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in print:hidden">
          <CheckCircle2 className="w-5 h-5 text-[#00E5FF] flex-shrink-0" />
          <span className="font-mono text-xs">{toastMessage}</span>
        </div>
      )}

      {/* 0. OFFICIAL EXECUTIVE DOSSIER HEADER (PRINT-ONLY) */}
      <header className="hidden print:block pb-3 mb-4 border-b-2 border-slate-900 print-break-avoid">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-sky-800 font-bold">
              OceanRescue Marine Intelligence Platform • Spatial Telemetry Unit
            </div>
            <h1 className="text-xl font-bold font-sans text-slate-950 tracking-tight mt-1">
              ALDFG DETECTION &amp; HYDRODYNAMIC THREAT DOSSIER
            </h1>
            <p className="text-xs text-slate-700 font-mono mt-0.5">
              Consolidated Marine Debris Analytics, Lagrangian Drift Vectors, and YOLOv8-seg Baseline Verification
            </p>
          </div>
          <div className="text-right font-mono text-[9pt] space-y-0.5 border-l-2 border-slate-300 pl-3">
            <div><span className="text-slate-600">CLASSIFICATION:</span> <strong className="text-emerald-800">OPERATIONAL INTELLIGENCE</strong></div>
            <div><span className="text-slate-600">GENERATED:</span> <strong className="text-slate-950">{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC</strong></div>
            <div><span className="text-slate-600">DATA WINDOW:</span> <strong className="text-slate-950">{dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : dateRange === '90d' ? 'Last Quarter (90 Days)' : 'Trailing 12 Months'}</strong></div>
            <div><span className="text-slate-600">ACTIVE FILTER:</span> <strong className="text-slate-950">{classFilter === 'all' ? 'All Classes' : classFilter} ({filteredRecords.length} records)</strong></div>
          </div>
        </div>
      </header>

      {/* 1. ATMOSPHERIC REPORTS COMMAND HERO (Screen Only) */}
      <div className="print:hidden">
        <PageHero
          sector="Lau Basin & Tavaru Sector 4"
          title="Reports & Analytics // Marine Intelligence"
          subtitle="Consolidated ALDFG debris analytics, synthetic threat density, temporal trends, and preliminary YOLOv8-seg evaluation metrics."
          badgeText="SIMULATED DATASET [DEMO RUN]"
          badgeVariant="cyan"
          stats={[
            {
              label: 'DATA WINDOW',
              value: dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : dateRange === '90d' ? 'Last Quarter (90d)' : '12 Months',
              highlightColor: 'text-[#00E5FF]',
              icon: <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
            },
            {
              label: 'CLASS FILTER',
              value: classFilter === 'all' ? 'All Classes' : classFilter,
              highlightColor: 'text-[#75E6DA]',
              icon: <Filter className="w-3.5 h-3.5 text-[#75E6DA]" />
            },
            {
              label: 'OBSERVATIONS',
              value: `${filteredRecords.length} Records`,
              highlightColor: 'text-[#00D6A3]',
              icon: <BarChart3 className="w-3.5 h-3.5 text-[#00D6A3]" />
            },
            {
              label: 'AI MEAN CONFIDENCE',
              value: '88.4%',
              highlightColor: 'text-[#EAF6FF]',
              icon: <TrendingUp className="w-3.5 h-3.5 text-[#00E5FF]" />
            }
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Date Range Selector */}
              <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
                <Calendar className="w-4 h-4 text-[#00E5FF]" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-transparent text-[#EAF6FF] focus:outline-none cursor-pointer"
                >
                  <option value="7d" className="bg-[#0B2638]">Last 7 Days (Demo Window)</option>
                  <option value="30d" className="bg-[#0B2638]">Last 30 Days (Demo Month)</option>
                  <option value="90d" className="bg-[#0B2638]">Last Quarter (90 Days)</option>
                  <option value="1y" className="bg-[#0B2638]">Trailing 12 Months</option>
                </select>
              </div>

              {/* Target Class Filter */}
              <div className="flex items-center gap-2 bg-[#0B2638] border border-[#16465A] px-3 py-1.5 rounded-lg text-xs font-mono shadow-sm">
                <Filter className="w-3.5 h-3.5 text-[#00D6A3]" />
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-transparent text-[#EAF6FF] focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#0B2638]">All Target Classes</option>
                  <option value="fishing_net" className="bg-[#0B2638]">Fishing Nets (fishing_net)</option>
                  <option value="rope_line" className="bg-[#0B2638]">Ropes & Lines (rope_line)</option>
                  <option value="trap_buoy" className="bg-[#0B2638]">Traps & Buoys (trap_buoy)</option>
                </select>
              </div>

              {/* Export Dropdown */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                  className="flex items-center gap-2 bg-[#103B50] hover:bg-[#16465A] border border-[#16465A] hover:border-[#00E5FF] px-3.5 py-2 rounded-lg text-xs font-mono text-[#EAF6FF] transition-all cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5 text-[#00D6A3]" />
                  <span>Export Report ▼</span>
                </button>

                {exportDropdownOpen && (
                  <div
                    data-purpose="export-dropdown-menu"
                    className="absolute right-0 mt-1 w-64 bg-[#0B2638] border border-[#16465A] rounded-xl shadow-2xl z-50 p-2 font-mono text-xs space-y-1"
                  >
                    <div className="px-2 py-1 text-[10px] text-[#91A9BB] uppercase border-b border-[#16465A]">
                      Client-Side Demo Export ({filteredRecords.length} rows)
                    </div>
                    <button
                      type="button"
                      onClick={exportAsCSV}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#103B50] text-[#EAF6FF] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#00E5FF]" />
                        CSV Records
                      </span>
                      <span className="text-[#91A9BB] text-[10px]">.csv</span>
                    </button>
                    <button
                      type="button"
                      onClick={exportAsJSON}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#103B50] text-[#EAF6FF] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#00D6A3]" />
                        JSON Dataset
                      </span>
                      <span className="text-[#00D6A3] text-[10px]">.json</span>
                    </button>
                    <button
                      type="button"
                      onClick={handlePrint}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#103B50] text-[#EAF6FF] flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FFB547]" />
                        Print / Save as PDF
                      </span>
                      <span className="text-[#FFB547] text-[10px]">Browser Print</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Refresh Dataset Button */}
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-[#00E5FF] text-[#061522] font-display text-xs px-4 py-2 rounded-lg hover:bg-[#75E6DA] transition-all font-bold uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          }
        >
          {/* Sub-bar: Telemetry Filters & Simulation Notice */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[#91A9BB] uppercase text-[10px]">Simulated Feeds:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#91A9BB]">Sensor Model:</span>
                <span className="bg-[#0B2638] px-2 py-0.5 rounded text-[#00E5FF] border border-[#16465A]">Simulated Optical UAV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#91A9BB]">Tiers:</span>
                <span className="bg-[#0B2638] px-2 py-0.5 rounded text-[#00D6A3] border border-[#16465A]">All Tiers (T1–T4)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#91A9BB]">Review State:</span>
                <span className="bg-[#0B2638] px-2 py-0.5 rounded text-[#EAF6FF] border border-[#16465A]">Simulated Review Pool</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D6A3] animate-pulse" />
              <span className="text-[#00D6A3] text-[11px] tracking-wider uppercase font-semibold">
                SIMULATED TELEMETRY FEED
              </span>
            </div>
          </div>
        </PageHero>
      </div>

      {/* 2. KPI METRICS ROW (6 METRICS, HONESTLY LABELED) */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2 print-break-avoid" data-purpose="kpi-metrics-row">
        {/* Metric 1 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Observations [Sim]</span>
            <span className="text-[#00E5FF] font-bold">●</span>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#EAF6FF]">148</div>
            <div className="text-[10px] text-[#91A9BB] font-mono">110 Benchmark + 38 Demo</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#00E5FF] h-full w-full" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Fishing Nets [Sim]</span>
            <span className="text-[#00D6A3] font-bold">●</span>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#00D6A3]">89</div>
            <div className="text-[10px] text-[#00D6A3] font-mono">60.1% of simulated targets</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#00D6A3] h-full w-[60%]" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Ropes / Lines [Sim]</span>
            <span className="text-[#00E5FF] font-bold">●</span>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#EAF6FF]">59</div>
            <div className="text-[10px] text-[#91A9BB] font-mono">39.9% of simulated targets</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#00E5FF] h-full w-[40%]" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Simulated Verified</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00D6A3]" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#00D6A3]">112</div>
            <div className="text-[10px] text-[#00D6A3] font-mono">Simulated review pool</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#00D6A3] h-full w-[76%]" />
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Rejected / Glare [Sim]</span>
            <span className="text-[#FF6B61] font-bold">✕</span>
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#FF6B61]">24</div>
            <div className="text-[10px] text-[#FF6B61] font-mono">16.2% synthetic negatives</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#FF6B61] h-full w-[16%]" />
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-xl flex flex-col justify-between shadow-md">
          <div className="flex items-center justify-between font-mono text-xs text-[#91A9BB]">
            <span className="uppercase text-[10px]">Critical Tier [Sim]</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547]" />
          </div>
          <div className="my-2">
            <div className="font-display text-2xl font-bold text-[#FFB547]">27</div>
            <div className="text-[10px] text-[#FFB547] font-mono">18.2% high-risk priority</div>
          </div>
          <div className="w-full bg-[#0B2638] h-1 rounded-full overflow-hidden">
            <div className="bg-[#FFB547] h-full w-[18%]" />
          </div>
        </div>
      </section>

      {/* 3. MAIN GRID (BALANCED 7 COLS & 5 COLS) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start print:grid-cols-1 print:gap-3">
        {/* LEFT COLUMN (7 cols) */}
        <div className="xl:col-span-7 flex flex-col space-y-4 print:space-y-3">
          {/* YOLOv8-seg Preliminary Baseline Validation Panel */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  YOLOv8-seg Preliminary Baseline Validation
                </h2>
              </div>
              <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#0B2638] text-[#00E5FF] border border-[#16465A]">
                IoU=0.5 | Preliminary Research Baseline
              </span>
            </div>

            {/* Academic Baseline Notice */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#00D6A3] shrink-0 mt-0.5" />
              <p className="text-xs text-[#91A9BB] leading-relaxed">
                <strong className="text-[#00D6A3]">Validation Benchmark Notice: </strong>
                These preliminary results come from a small 110-image ALDFG benchmark validation subset (IoU=0.5) and do not represent production or field-validated operational performance. Physical oceanic ground-truthing is required prior to operational salvage deployment.
              </p>
            </div>

            {/* Box vs Mask Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
              {/* Bounding Box Metrics */}
              <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#16465A]">
                  <span className="text-[#00E5FF] font-semibold flex items-center gap-1.5">
                    Bounding Box Telemetry
                  </span>
                  <span className="text-[10px] text-[#91A9BB]">110 Val Subset</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Box Precision</span>
                      <span className="text-[#EAF6FF] font-bold">46.8%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00E5FF] h-full" style={{ width: '46.8%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Box Recall</span>
                      <span className="text-[#EAF6FF] font-bold">37.0%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00E5FF] h-full" style={{ width: '37%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Box mAP50</span>
                      <span className="text-[#00E5FF] font-bold">35.3%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00E5FF] h-full" style={{ width: '35.3%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Instance Mask Metrics */}
              <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-[#16465A]">
                  <span className="text-[#00D6A3] font-semibold flex items-center gap-1.5">
                    Instance Mask Telemetry
                  </span>
                  <span className="text-[10px] text-[#91A9BB]">110 Val Subset</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Mask Precision</span>
                      <span className="text-[#EAF6FF] font-bold">39.6%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00D6A3] h-full" style={{ width: '39.6%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Mask Recall</span>
                      <span className="text-[#EAF6FF] font-bold">31.7%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00D6A3] h-full" style={{ width: '31.7%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[#91A9BB] mb-1">
                      <span>Mask mAP50</span>
                      <span className="text-[#00D6A3] font-bold">28.6%</span>
                    </div>
                    <div className="w-full bg-[#103B50] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#00D6A3] h-full" style={{ width: '28.6%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Geospatial Hotspot & Density Analysis Map */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#00E5FF]" />
                  <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                    Geospatial Hotspot &amp; Density Analysis
                  </h2>
                </div>
                <p className="text-xs text-[#91A9BB] font-mono">Tavaru Barrier Reef Sector (Simulated GIS Demonstration Canvas)</p>
              </div>

              {/* Toggles (Hidden on Print) */}
              <div className="flex items-center gap-2 font-mono text-xs print:hidden">
                <button
                  type="button"
                  onClick={() => setHeatmapActive(!heatmapActive)}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 cursor-pointer ${
                    heatmapActive ? 'bg-[#00E5FF] text-[#061522] font-bold' : 'bg-[#0B2638] text-[#91A9BB] border border-[#16465A]'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${heatmapActive ? 'bg-[#061522]' : 'bg-[#91A9BB]'}`} />
                  Heatmap {heatmapActive ? 'ON' : 'OFF'}
                </button>
                <span className="px-2.5 py-1 rounded bg-[#0B2638] text-[#EAF6FF] border border-[#16465A]">
                  Simulated Pins (2)
                </span>
                <span className="px-2.5 py-1 rounded bg-[#0B2638] text-[#00D6A3] border border-[#16465A]">
                  Sanctuary Zone A
                </span>
              </div>
            </div>

            {/* Tactical Ocean Map Visualizer */}
            <div className="relative w-full h-72 rounded-xl bg-[#040e17] overflow-hidden border border-[#16465A] print:h-64">
              <svg className="absolute inset-0 w-full h-full opacity-65 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="tacticalGrid-rpt" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#16465A" strokeWidth="0.75" strokeDasharray="2 3" />
                  </pattern>
                  <radialGradient id="heatGlow1-rpt" cx="45%" cy="35%" r="35%">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.5" />
                    <stop offset="40%" stopColor="#50dbc8" stopOpacity="0.3" />
                    <stop offset="80%" stopColor="#00daf3" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#061421" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="heatGlow2-rpt" cx="72%" cy="65%" r="28%">
                    <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#93000a" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#061421" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect width="100%" height="100%" fill="url(#tacticalGrid-rpt)" />

                {/* Depth Contours */}
                <path d="M -20,120 Q 180,60 320,150 T 600,100 T 900,160" fill="none" stroke="#16465A" strokeWidth="1.5" />
                <path d="M -20,200 Q 220,160 400,240 T 750,210 T 950,260" fill="none" stroke="#16465A" strokeDasharray="4 4" strokeWidth="1" />

                {/* Heatmap Blobs */}
                {heatmapActive && (
                  <g>
                    <circle cx="45%" cy="38%" r="140" fill="url(#heatGlow1-rpt)" />
                    <circle cx="72%" cy="62%" r="110" fill="url(#heatGlow2-rpt)" />
                  </g>
                )}

                {/* Marine Sanctuary Zone A */}
                <polygon points="120,40 380,30 460,180 210,210" fill="#00D6A3" fillOpacity="0.1" stroke="#00D6A3" strokeWidth="1.5" strokeDasharray="6 3" />
                <text x="135" y="65" fill="#00D6A3" fontSize="10" className="font-mono">
                  Marine Sanctuary Zone A [Strict Protection - Simulated]
                </text>
              </svg>

              {/* Coordinate Corner Ticks */}
              <div className="absolute top-2 left-3 font-mono text-[10px] text-[#91A9BB]">17°48'30"S / 177°06'12"E [Simulated Center]</div>
              <div className="absolute top-2 right-3 font-mono text-[10px] text-[#91A9BB]">Tavaru Passage Reef Sector</div>
              <div className="absolute bottom-2 left-3 font-mono text-[10px] text-[#91A9BB]">Datum: WGS84 | Simulated Depth: -42m to -120m</div>

              {/* Pin 1: #OR-2024-094 */}
              <div className="absolute top-[34%] left-[44%] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer" title="Simulated Pin #OR-2024-094">
                <span className="w-6 h-6 rounded-full bg-[#FF6B61]/40 animate-ping absolute" />
                <div className="w-7 h-7 rounded-full bg-[#FF6B61] text-[#061522] flex items-center justify-center font-bold text-xs shadow-lg">
                  !
                </div>
              </div>

              {/* Pin 2: #OR-2024-089 */}
              <div className="absolute top-[62%] left-[71%] transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer" title="Simulated Pin #OR-2024-089">
                <span className="w-5 h-5 rounded-full bg-[#00E5FF]/40 animate-pulse absolute" />
                <div className="w-6 h-6 rounded-full bg-[#00E5FF] text-[#061522] flex items-center justify-center font-bold text-xs shadow-lg">
                  ⚓
                </div>
              </div>
            </div>
          </section>

          {/* Temporal Detection Trends Chart */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#16465A] pb-2">
              <div>
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  Temporal Detection Trends (30-Day Simulated Run)
                </h2>
                <p className="text-xs text-[#91A9BB] font-mono">Class frequency aggregation grouped by observation week</p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="flex items-center gap-1.5 text-[#00D6A3]">
                  <span className="w-2.5 h-2.5 rounded bg-[#00D6A3]" /> Fishing Net [Sim]
                </span>
                <span className="flex items-center gap-1.5 text-[#00E5FF]">
                  <span className="w-2.5 h-2.5 rounded bg-[#00E5FF]" /> Rope / Line [Sim]
                </span>
                <span className="flex items-center gap-1.5 text-[#FF6B61]">
                  <span className="w-3 h-0.5 bg-[#FF6B61]" /> Critical Trend
                </span>
              </div>
            </div>

            {/* SVG Time-Series Chart */}
            <div className="bg-[#0B2638] border border-[#16465A] p-4 rounded-xl space-y-2">
              <div className="relative h-40 w-full">
                <svg className="w-full h-full" viewBox="0 0 560 160" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" x2="560" y1="40" y2="40" stroke="#16465A" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" x2="560" y1="80" y2="80" stroke="#16465A" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="0" x2="560" y1="120" y2="120" stroke="#16465A" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Week 1 */}
                  <rect x="50" y="88" width="22" height="72" rx="2" fill="#00D6A3" />
                  <rect x="76" y="112" width="22" height="48" rx="2" fill="#00E5FF" />

                  {/* Week 2 */}
                  <rect x="180" y="65" width="22" height="95" rx="2" fill="#00D6A3" />
                  <rect x="206" y="98" width="22" height="62" rx="2" fill="#00E5FF" />

                  {/* Week 3 */}
                  <rect x="310" y="45" width="22" height="115" rx="2" fill="#00D6A3" />
                  <rect x="336" y="85" width="22" height="75" rx="2" fill="#00E5FF" />

                  {/* Week 4 (Peak) */}
                  <rect x="440" y="30" width="22" height="130" rx="2" fill="#00D6A3" />
                  <rect x="466" y="65" width="22" height="95" rx="2" fill="#00E5FF" />

                  {/* Critical Risk Trend Curve Overlay */}
                  <path d="M 63,125 Q 193,105 323,75 T 453,42" fill="none" stroke="#FF6B61" strokeWidth="2.5" />
                  <circle cx="63" cy="125" r="3.5" fill="#FF6B61" />
                  <circle cx="193" cy="105" r="3.5" fill="#FF6B61" />
                  <circle cx="323" cy="75" r="3.5" fill="#FF6B61" />
                  <circle cx="453" cy="42" r="3.5" fill="#FF6B61" />
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div className="grid grid-cols-4 text-center font-mono text-[11px] text-[#91A9BB] pt-1 border-t border-[#16465A]">
                <div>W1: Sep 25 - Oct 01</div>
                <div>W2: Oct 02 - Oct 08</div>
                <div>W3: Oct 09 - Oct 15</div>
                <div>W4: Oct 16 - Oct 25 <span className="text-[#00D6A3] font-bold">(Peak Demo)</span></div>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (5 cols) */}
        <div className="xl:col-span-5 flex flex-col space-y-4 print:space-y-3">
          {/* Gear Types & Risk Distribution */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00D6A3]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  Gear Types &amp; Risk Distribution
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">SIMULATED SAMPLES</span>
            </div>

            {/* Gear Typologies */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2.5 font-mono text-xs">
              <div className="text-[10px] text-[#91A9BB] uppercase tracking-wider">Classified ALDFG Typologies [Simulated]</div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#EAF6FF]">Derelict Gillnet (Nylon/Monofilament)</span>
                    <span className="text-[#00D6A3] font-bold">45% (67 obs)</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00D6A3] h-full" style={{ width: '45%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#EAF6FF]">Mooring Lines &amp; Longlines</span>
                    <span className="text-[#00E5FF] font-bold">28% (41 obs)</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00E5FF] h-full" style={{ width: '28%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#EAF6FF]">Trawl Mesh / Codends</span>
                    <span className="text-[#00E5FF] font-bold">15% (22 obs)</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#00E5FF]/80 h-full" style={{ width: '15%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#EAF6FF]">Polypropylene Cordage Bundles</span>
                    <span className="text-[#91A9BB] font-bold">12% (18 obs)</span>
                  </div>
                  <div className="w-full bg-[#103B50] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#16465A] h-full" style={{ width: '12%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Severity Spectrum */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-xl space-y-2 font-mono text-xs">
              <div className="text-[10px] text-[#91A9BB] uppercase tracking-wider">Risk Severity Spectrum [Simulated]</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#071D33] p-2.5 rounded-lg border-l-2 border-[#FF6B61] border border-[#16465A]">
                  <span className="text-[#FF6B61] text-[11px]">Tier 1: Critical</span>
                  <div className="text-base font-bold text-[#EAF6FF] mt-0.5">9 Targets</div>
                </div>
                <div className="bg-[#071D33] p-2.5 rounded-lg border-l-2 border-[#FFB547] border border-[#16465A]">
                  <span className="text-[#FFB547] text-[11px]">Tier 2: High</span>
                  <div className="text-base font-bold text-[#EAF6FF] mt-0.5">18 Targets</div>
                </div>
                <div className="bg-[#071D33] p-2.5 rounded-lg border-l-2 border-[#00E5FF] border border-[#16465A]">
                  <span className="text-[#00E5FF] text-[11px]">Tier 3: Moderate</span>
                  <div className="text-base font-bold text-[#EAF6FF] mt-0.5">42 Targets</div>
                </div>
                <div className="bg-[#071D33] p-2.5 rounded-lg border-l-2 border-[#00D6A3] border border-[#16465A]">
                  <span className="text-[#00D6A3] text-[11px]">Tier 4: Low</span>
                  <div className="text-base font-bold text-[#EAF6FF] mt-0.5">79 Targets</div>
                </div>
              </div>
            </div>
          </section>

          {/* Mission Status Breakdown & Drift Summary */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  Mission Status &amp; Drift Modeling
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#00D6A3]">DEMO DRIFT ENGINE</span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <span className="text-[#91A9BB] text-[10px] block uppercase">SIMULATED MISSIONS</span>
                <span className="text-base font-bold text-[#00D6A3]">4 In Progress (Demo)</span>
                <span className="text-[10px] text-[#91A9BB] block">12 Scheduled Queue</span>
              </div>
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg">
                <span className="text-[#91A9BB] text-[10px] block uppercase">SIMULATED DRIFT SOG</span>
                <span className="text-base font-bold text-[#00E5FF]">1.32 kts</span>
                <span className="text-[10px] text-[#91A9BB] block">Dominant: 165° SSE (Sim)</span>
              </div>
            </div>
          </section>

          {/* Synthesized Algorithmic Insights */}
          <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
            <div className="flex items-center justify-between border-b border-[#16465A] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                  Synthesized Algorithmic Insights
                </h2>
              </div>
              <span className="font-mono text-[10px] text-[#91A9BB]">Simulated Heuristics</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg space-y-1">
                <div className="font-semibold text-[#00D6A3] flex items-center gap-1.5">
                  <Waves className="w-3.5 h-3.5" />
                  <span>Reef Stranding Convergence</span>
                </div>
                <p className="text-[#91A9BB] leading-relaxed">
                  Simulated hydrodynamic modeling indicates 64% of synthetic drifting debris converges toward the northern barrier reef pocket within 48h under simulated tidal swells.
                </p>
              </div>

              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg space-y-1">
                <div className="font-semibold text-[#00E5FF] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Caustic Lighting Artifacts</span>
                </div>
                <p className="text-[#91A9BB] leading-relaxed">
                  Validation analysis indicates false rejections clustered between 0–5m depth due to underwater sun caustics fragmenting preliminary YOLOv8 segmentation masks.
                </p>
              </div>

              <div className="bg-[#0B2638] border border-[#16465A] p-2.5 rounded-lg space-y-1">
                <div className="font-semibold text-[#FFB547] flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Simulated Decision-Support Triage</span>
                </div>
                <p className="text-[#91A9BB] leading-relaxed">
                  Decision-support prototype demonstrates automated triage-to-authorization routing to evaluate operator workflow efficiency before field deployment.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY / OBSERVATION RECORDS TABLE */}
      <section className="bg-[#071D33] border border-[#16465A] rounded-xl p-4 shadow-md space-y-3 print-break-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#16465A] pb-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#00E5FF]" />
            <div>
              <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                Observation Telemetry &amp; Verification Feed
              </h2>
              <span className="font-mono text-[10px] text-[#91A9BB]">
                Showing {filteredRecords.length} of {observations.length} Target Records ({liveSessionRecords.length} Live Session Ingested)
              </span>
            </div>
          </div>

          <div className="relative w-full sm:w-72 print:hidden">
            <Search className="w-3.5 h-3.5 text-[#91A9BB] absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter ID, class, coordinates..."
              className="w-full bg-[#0B2638] border border-[#16465A] text-[#EAF6FF] text-xs font-mono rounded-lg pl-8 pr-3 py-1.5 placeholder-[#91A9BB] focus:outline-none focus:border-[#00E5FF]"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#0B2638] text-[#91A9BB] text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 rounded-l-lg">Observation ID</th>
                <th className="py-2.5 px-2">Class</th>
                <th className="py-2.5 px-2">Confidence</th>
                <th className="py-2.5 px-2">Coordinates (WGS84)</th>
                <th className="py-2.5 px-2">Risk Score</th>
                <th className="py-2.5 px-2">Verification</th>
                <th className="py-2.5 px-3 rounded-r-lg text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16465A]">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-[#0B2638]/60 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold flex items-center gap-1.5 text-[#EAF6FF]">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.tier === 'Critical'
                              ? 'bg-[#FF6B61]'
                              : item.tier === 'High'
                              ? 'bg-[#FFB547]'
                              : 'bg-[#00D6A3]'
                          }`}
                        />
                        <span>#{item.id}</span>
                        {item.isLive && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40 font-semibold">
                            SESSION
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="px-2 py-0.5 rounded bg-[#0B2638] text-[#EAF6FF] text-[11px] border border-[#16465A]">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[#00D6A3] font-semibold">{item.confidence}%</td>
                    <td className="py-3 px-2 text-[#91A9BB] text-[11px]">{item.coords}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          item.tier === 'Critical'
                            ? 'bg-[#FF6B61]/20 text-[#FF6B61]'
                            : item.tier === 'High'
                            ? 'bg-[#FFB547]/20 text-[#FFB547]'
                            : 'bg-[#00D6A3]/20 text-[#00D6A3]'
                        }`}
                      >
                        {item.riskScore} / 10
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1 text-[#00D6A3] text-[10px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right print:hidden">
                      <Link
                        to="/detection-details"
                        state={{
                          detection: item.rawObservation,
                          obsId: item.id,
                          annotatedImage: item.rawObservation?.annotatedImage,
                          reviewStatus: item.rawObservation?.reviewStatus,
                          isDemo: !item.isLive,
                        }}
                        className="text-[#00E5FF] hover:underline text-[11px]"
                      >
                        Inspect Target →
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#91A9BB] font-mono text-xs">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <Info className="w-5 h-5 text-[#91A9BB]" />
                      <span>No matching simulated observations found.</span>
                      <span className="text-[11px] text-[#16465A]">Try selecting a wider date range or clearing the search query.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Operational Decision-Support Disclaimer */}
      <section className="bg-[#071D33] p-3.5 rounded-xl border border-[#16465A] flex items-start gap-3 text-[#91A9BB] text-xs leading-relaxed print-break-avoid">
        <Info className="w-4 h-4 text-[#00E5FF] flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-[#EAF6FF] font-semibold">Operational Decision-Support Notice — </span>
          The YOLOv8-seg model is a preliminary baseline trained on a 110-image ALDFG benchmark subset. Drift predictions, risk scores, vessel missions, and telemetry feeds are synthetic simulation models. Ground-truth verification required prior to live maritime salvage.
        </div>
      </section>
    </div>
  );
};

export default ReportsAnalytics;
