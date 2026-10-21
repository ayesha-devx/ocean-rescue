import React, { useState } from 'react';
import { PageHero } from '../components/PageHero';
import {
  Database,
  RefreshCw,
  Download,
  Share2,
  CheckCircle,
  AlertTriangle,
  Server,
  Activity,
  Layers,
  ArrowRight,
  Search,
  ExternalLink,
  ShieldCheck,
  Compass,
  Wind,
  Waves,
  Zap,
  Terminal
} from 'lucide-react';

export const DataSources = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('All');
  const [searchFilter, setSearchFilter] = useState('');
  const [triggerState, setTriggerState] = useState(false);
  const [cachePurged, setCachePurged] = useState(false);

  // Layer filters on spatial map
  const [mapLayers, setMapLayers] = useState({
    currents: true,
    winds: true,
    waves: false,
    bathymetry: true,
    sentinel: true,
    uav: false,
  });

  const toggleMapLayer = (key) => {
    setMapLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefreshFeeds = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 3000);
    }, 1200);
  };

  const handleTrigger = () => {
    setTriggerState(true);
    setTimeout(() => {
      setTriggerState(false);
    }, 2500);
  };

  const handlePurge = () => {
    setCachePurged(true);
    setTimeout(() => {
      setCachePurged(false);
    }, 2000);
  };

  const jobsData = [
    {
      id: '#JOB-8841',
      status: 'SUCCESS',
      type: 'success',
      time: '14:18:22 UTC',
      title: 'HYCOM NetCDF Subset Assimilated (GLBu0.08_93.0)',
      count: '1,420 vectors',
      exec: '4.8s',
      code: '200 OK',
    },
    {
      id: '#JOB-8840',
      status: 'SUCCESS',
      type: 'success',
      time: '14:00:15 UTC',
      title: 'ERA5 Gridded Atmosphere Ingestion (Copernicus CDS)',
      count: '640 cells',
      exec: '2.1s',
      code: '200 OK',
    },
    {
      id: '#JOB-8839',
      status: 'SUCCESS',
      type: 'success',
      time: '13:34:02 UTC',
      title: 'NOAA WW3 Spectral Wave Fields Synced',
      count: '320 wave nodes',
      exec: '1.7s',
      code: '200 OK',
    },
    {
      id: '#JOB-8838',
      status: 'WARNING',
      type: 'warning',
      time: '11:22:45 UTC',
      title: 'UAV M300 Video Frame Stream Degraded Latency (>450ms)',
      count: 'Edge Stream',
      exec: '0.8s',
      code: 'FALLBACK CACHE',
    },
  ];

  const filteredJobs = jobsData.filter((job) => {
    if (activeFilterTab === 'Success' && job.type !== 'success') return false;
    if (activeFilterTab === 'Warnings' && job.type !== 'warning') return false;
    if (activeFilterTab === 'Failures' && job.type !== 'failure') return false;
    if (searchFilter) {
      return (
        job.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        job.id.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1700px] mx-auto select-none font-sans">
      {/* 1. ATMOSPHERIC DATA SOURCES COMMAND HERO */}
      <PageHero
        sector="Lau Basin & Tavaru Sector 4"
        title="Data Sources & Environmental Telemetry"
        subtitle="Multi-source hydrodynamic assimilations, gridded atmospheric wind vectors, and edge UAV/ROV sensor payloads."
        badgeText="SIMULATED TELEMETRY HARNESS"
        badgeVariant="teal"
        stats={[
          {
            label: 'HYCOM 1/12°',
            value: '1,420 Vectors (Online)',
            highlightColor: 'text-[#00E5FF]',
            icon: <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
          },
          {
            label: 'ERA5 ATMOSPHERE',
            value: '640 Cells (Active)',
            highlightColor: 'text-[#00D6A3]',
            icon: <Wind className="w-3.5 h-3.5 text-[#00D6A3]" />
          },
          {
            label: 'WW3 WAVES',
            value: '320 Spectral Nodes',
            highlightColor: 'text-[#75E6DA]',
            icon: <Waves className="w-3.5 h-3.5 text-[#75E6DA]" />
          },
          {
            label: 'GEBCO BATHYMETRY',
            value: '15-ArcSec Gridded',
            highlightColor: 'text-[#EAF6FF]',
            icon: <Compass className="w-3.5 h-3.5 text-[#EAF6FF]" />
          },
          {
            label: 'NODE PIPELINES',
            value: '7 Total (5 Operational)',
            highlightColor: 'text-[#00E5FF]',
            icon: <Server className="w-3.5 h-3.5 text-[#00E5FF]" />
          }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <button
              onClick={() => alert('Synchronization verification: All NetCDF pipelines operational.')}
              className="px-3.5 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] border border-[#16465A] hover:border-[#00E5FF] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-[#00E5FF]" />
              <span>Sync Status</span>
            </button>

            <button
              onClick={() => alert('Exporting dataset telemetry catalog: oceanrescue_telemetry_catalog.csv')}
              className="px-3.5 py-2 rounded-lg bg-[#0B2638] hover:bg-[#103B50] text-[#EAF6FF] border border-[#16465A] hover:border-[#75E6DA] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#75E6DA]" />
              <span>Catalog CSV</span>
            </button>

            <button
              onClick={handleRefreshFeeds}
              disabled={isRefreshing}
              className={`px-4 py-2 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(0,229,255,0.4)] cursor-pointer ${
                refreshSuccess
                  ? 'bg-[#00D6A3] text-[#061522]'
                  : 'bg-[#00E5FF] hover:bg-[#75E6DA] text-[#061522]'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Assimilating...' : refreshSuccess ? 'Feeds Updated' : 'Refresh Feeds'}</span>
            </button>
          </div>
        }
      />

      {/* 2. SOURCE STATUS OVERVIEW (Compact Grid of 7 Ingestion Nodes) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="font-display font-semibold text-sm text-[#EAF6FF] flex items-center gap-2">
            <Server className="w-4 h-4 text-[#00E5FF]" />
            <span>Telemetry Ingestion Feeds &amp; Providers</span>
          </div>
          <span className="font-mono text-xs text-[#91A9BB]">7 NODES CONFIGURED // 5 OPERATIONAL</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {/* Card 1: HYCOM */}
          <div className="bg-[#0B2638] border border-[#16465A] hover:border-[#00E5FF]/40 rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">HYCOM GLBu0.08</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" /> LIVE - 14m
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Ocean Currents Reanalysis</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Pacific South Basin (1/12° Grid)</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Assimilated 3H</span>
              <span className="text-[#00D6A3]">99.4% OK</span>
            </div>
          </div>

          {/* Card 2: ERA5 */}
          <div className="bg-[#0B2638] border border-[#16465A] hover:border-[#00D6A3]/40 rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">ECMWF ERA5</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" /> LIVE - 32m
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Atmospheric &amp; Winds</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Lat 15°-20° S, Lon 175°-180° E</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Hourly Vector</span>
              <span className="text-[#00D6A3]">99.8% OK</span>
            </div>
          </div>

          {/* Card 3: WaveWatch III */}
          <div className="bg-[#0B2638] border border-[#16465A] hover:border-[#75E6DA]/40 rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">NOAA WW3</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3]" /> LIVE - 58m
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Spectral Wave Model</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Coral Sea &amp; Fiji Regional</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">6-Hourly Cycle</span>
              <span className="text-[#00D6A3]">98.2% OK</span>
            </div>
          </div>

          {/* Card 4: GEBCO 2024 */}
          <div className="bg-[#0B2638] border border-[#16465A] hover:border-[#EAF6FF]/40 rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">GEBCO 2024</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#103B50] text-[#75E6DA] text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#75E6DA]" /> CACHED
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">15-ArcSec Bathymetry</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Global High-Res Soundings</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Baseline Grid</span>
              <span className="text-[#EAF6FF]">100.0% OK</span>
            </div>
          </div>

          {/* Card 5: Sentinel-2 */}
          <div className="bg-[#0B2638] border border-[#16465A] hover:border-[#FFB547]/40 rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">Sentinel-2 / PS</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#FFB547]/20 text-[#FFB547] text-[9px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547]" /> DEMO (+6h)
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Satellite Multispectral</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Sector Bravo AOI Footprint</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Daily Overpass</span>
              <span className="text-[#FFB547]">84.1% Latent</span>
            </div>
          </div>

          {/* Card 6: ROV & Drone Payloads */}
          <div className="bg-[#0B2638] border border-[#16465A] rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">ROV / M300 UAV</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#103B50] text-[#91A9BB] text-[9px] font-bold flex items-center gap-1">
                  STANDBY
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Subsea Sonar &amp; 4K Cam</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">ROV-03 Docked (-28.4m lock)</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Edge Telemetry</span>
              <span className="text-[#91A9BB]">IDLE / ARMED</span>
            </div>
          </div>

          {/* Card 7: Artisanal AIS/VHF */}
          <div className="bg-[#0B2638] border border-[#16465A] rounded-lg p-3 shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-[#00E5FF] font-semibold">VHF / APRS Pilot</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#103B50] text-[#75E6DA] text-[9px] font-bold flex items-center gap-1">
                  SYNTHETIC
                </span>
              </div>
              <div className="font-display font-semibold text-[#EAF6FF] text-xs">Fisherman Reports</div>
              <p className="text-[11px] text-[#91A9BB] font-mono">Momi Bay Sighting Channel</p>
            </div>
            <div className="pt-2.5 mt-2 border-t border-[#16465A]/40 font-mono text-[10px] flex items-center justify-between">
              <span className="text-[#91A9BB]">Asynchronous</span>
              <span className="text-[#75E6DA]">SIM FEED</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ASSIMILATED OCEANOGRAPHIC & ATMOSPHERIC METRICS (6 Metrics Row) */}
      <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2 border-b border-[#16465A]/50">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-[#00D6A3]" />
            <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
              Assimilated Oceanographic &amp; Atmospheric Metrics
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded bg-[#FFB547]/10 text-[#FFB547] font-mono text-[11px] tracking-wider uppercase font-semibold border border-[#FFB547]/30">
            SIMULATED ENVIRONMENTAL ASSIMILATION DATASET
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 pt-3">
          {/* 1. Surface Current */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>SURFACE CURRENT</span>
              <span className="text-[#00E5FF]">HYCOM</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#00E5FF]">1.4</span>
              <span className="text-xs text-[#91A9BB]">kts</span>
            </div>
            <div className="mt-1 flex items-center gap-1 font-mono text-xs text-[#00D6A3]">
              <ArrowRight className="w-3.5 h-3.5 rotate-[165deg]" />
              <span>165° SSE (stab: 0.92)</span>
            </div>
          </div>

          {/* 2. Wind Velocity */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>WIND VELOCITY</span>
              <span className="text-[#00D6A3]">ERA5</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#00D6A3]">14.2</span>
              <span className="text-xs text-[#91A9BB]">kts</span>
            </div>
            <div className="mt-1 flex items-center gap-1 font-mono text-xs text-[#EAF6FF]">
              <Compass className="w-3.5 h-3.5 rotate-[135deg] text-[#00D6A3]" />
              <span>135° SE (Gust 18.5)</span>
            </div>
          </div>

          {/* 3. Wave Height */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>SIGNIFICANT WAVE</span>
              <span className="text-[#75E6DA]">WW3</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#EAF6FF]">1.8</span>
              <span className="text-xs text-[#91A9BB]">m</span>
            </div>
            <div className="mt-1 font-mono text-xs text-[#75E6DA] flex items-center gap-1">
              <Waves className="w-3.5 h-3.5" />
              <span>9.2s period (Sea State 4)</span>
            </div>
          </div>

          {/* 4. Sea Surface Temp */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>SEA SURFACE TEMP</span>
              <span className="text-[#FFB547]">MUR SST</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#FFB547]">26.4</span>
              <span className="text-xs text-[#91A9BB]">°C</span>
            </div>
            <div className="mt-1 font-mono text-xs text-[#FFB547] flex items-center gap-1">
              <span>Anomaly +0.3°C</span>
            </div>
          </div>

          {/* 5. Tidal State */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>TIDAL VECTOR</span>
              <span className="text-[#00E5FF]">NAO99</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#EAF6FF]">-0.8</span>
              <span className="text-xs text-[#91A9BB]">m</span>
            </div>
            <div className="mt-1 font-mono text-xs text-[#00E5FF] flex items-center gap-1">
              <span>Ebb (Slack @ 18:30 UTC)</span>
            </div>
          </div>

          {/* 6. Benthic Contour */}
          <div className="bg-[#071D33] p-3 rounded-lg border border-[#16465A]/50 shadow-sm">
            <div className="flex items-center justify-between text-[#91A9BB] font-mono text-[11px]">
              <span>BENTHIC CONTOUR</span>
              <span className="text-[#75E6DA]">GEBCO</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold text-[#75E6DA]">-76.4</span>
              <span className="text-xs text-[#91A9BB]">m</span>
            </div>
            <div className="mt-1 font-mono text-xs text-[#91A9BB] flex items-center gap-1">
              <span>Range: -42.0m to -120m</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. GEOSPATIAL COVERAGE MAP & API GATEWAY REGISTRY (Dual Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Map Viewport (~65% width) */}
        <div className="lg:col-span-8 bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#00E5FF]" />
              <span className="font-display font-semibold text-sm text-[#EAF6FF]">
                Spatial Footprint &amp; Sensor Layer Swath
              </span>
            </div>
            <span className="font-mono text-xs text-[#91A9BB]">
              BOUNDS: 17°10'S - 17°50'S | 178°00'E - 178°50'E
            </span>
          </div>

          {/* Interactive GIS Surface Canvas */}
          <div className="relative w-full h-[420px] bg-[#020b12] rounded-lg overflow-hidden border border-[#16465A] select-none">
            {/* SVG Map simulation */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 440">
              <defs>
                <radialGradient id="bathymetryDepthGrad" cx="50%" cy="45%" r="65%">
                  <stop offset="0%" stopColor="#020f1c" />
                  <stop offset="60%" stopColor="#061421" />
                  <stop offset="100%" stopColor="#0e1d2a" />
                </radialGradient>
                <pattern id="dsTacticalGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" opacity="0.15" stroke="#3b494c" strokeWidth="0.75" />
                </pattern>
                <marker id="dsCyanArrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse" viewBox="0 0 6 6">
                  <polygon points="0 0, 6 3, 0 6, 1.5 3" fill="#00E5FF" opacity="0.8" />
                </marker>
              </defs>

              {/* Background and grid */}
              <rect width="800" height="440" fill="url(#bathymetryDepthGrad)" />
              <rect width="800" height="440" fill="url(#dsTacticalGrid)" />

              {/* Bathymetry Contours */}
              {mapLayers.bathymetry && (
                <>
                  <path d="M-20,120 C180,90 280,240 460,210 C620,180 720,290 820,260" fill="none" opacity="0.35" stroke="#50dbc8" strokeDasharray="4,4" strokeWidth="1.2" />
                  <path d="M-20,200 C150,170 320,310 520,280 C680,250 750,360 820,340" fill="none" opacity="0.25" stroke="#50dbc8" strokeWidth="1.5" />
                  <path d="M-20,280 C110,250 260,380 480,360 C640,340 700,410 820,400" fill="none" opacity="0.2" stroke="#50dbc8" strokeWidth="1.5" />
                </>
              )}

              {/* Tavaru Sanctuary Zone A */}
              <polygon points="260,80 490,95 440,240 220,210" fill="rgba(255, 180, 171, 0.08)" stroke="#FF6B61" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8" />
              <text x="270" y="115" fill="#FF6B61" fontFamily="JetBrains Mono" fontSize="10" letterSpacing="1" opacity="0.8">
                RESERVE: TAVARU SANCTUARY [ZONE A]
              </text>

              {/* Sentinel Swath */}
              {mapLayers.sentinel && (
                <>
                  <polygon points="120,20 680,80 580,420 40,360" fill="rgba(0, 229, 255, 0.06)" stroke="#00E5FF" strokeWidth="1.5" />
                  <text x="140" y="50" fill="#00E5FF" fontFamily="JetBrains Mono" fontSize="10" opacity="0.7">
                    SENTINEL-2 MSI FOOTPRINT [AOI BRAVO]
                  </text>
                </>
              )}

              {/* HYCOM Currents */}
              {mapLayers.currents && (
                <g stroke="#00E5FF" strokeWidth="1.2" opacity="0.75" markerEnd="url(#dsCyanArrow)">
                  <line x1="80" y1="90" x2="90" y2="125" />
                  <line x1="160" y1="110" x2="170" y2="145" />
                  <line x1="240" y1="130" x2="250" y2="165" />
                  <line x1="340" y1="150" x2="350" y2="185" />
                  <line x1="430" y1="170" x2="440" y2="205" />
                  <line x1="530" y1="190" x2="540" y2="225" />
                  <line x1="620" y1="170" x2="630" y2="205" />
                  <line x1="710" y1="210" x2="720" y2="245" />
                  <line x1="180" y1="240" x2="190" y2="275" />
                  <line x1="310" y1="260" x2="320" y2="295" />
                  <line x1="410" y1="290" x2="420" y2="325" />
                  <line x1="510" y1="300" x2="520" y2="335" />
                </g>
              )}

              {/* Target Observation Pin: Net #OR-2024-094 */}
              <g transform="translate(375, 230)">
                <circle r="16" fill="none" stroke="#FF6B61" strokeWidth="1.5" className="animate-ping" />
                <circle r="6" fill="#FF6B61" stroke="#white" strokeWidth="1.5" />
                <line x1="10" y1="-10" x2="45" y2="-25" stroke="#FF6B61" strokeWidth="1" />
                <rect x="45" y="-38" width="135" height="24" rx="3" fill="#0B2638" stroke="#FF6B61" strokeWidth="0.8" />
                <text x="52" y="-22" fill="#FF6B61" fontFamily="JetBrains Mono" fontSize="10" fontWeight="bold">
                  NET #OR-2024-094
                </text>
              </g>

              {/* Stationed Vessel: R/V Pelagic Sentinel */}
              <g transform="translate(210, 170)">
                <polygon points="0,-7 6,7 -6,7" fill="#00D6A3" />
                <circle r="12" fill="none" stroke="#00D6A3" strokeDasharray="2,2" strokeWidth="1" />
                <text x="12" y="4" fill="#00D6A3" fontFamily="JetBrains Mono" fontSize="9">
                  R/V PELAGIC SENTINEL
                </text>
              </g>

              {/* Artisanal APRS Beacon Track */}
              <path d="M 520,370 Q 560,350 610,360 T 670,330" fill="none" stroke="#75E6DA" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
              <circle cx="670" cy="330" r="3.5" fill="#75E6DA" />
              <text x="590" y="325" fill="#91A9BB" fontFamily="JetBrains Mono" fontSize="9">APRS BOAT-12 (Sim)</text>
            </svg>

            {/* Floating HUD Overlays */}
            <div className="absolute top-3 left-3 bg-[#071D33]/90 backdrop-blur rounded p-2 text-xs space-y-1 shadow-md border-l-2 border-[#00E5FF]">
              <div className="font-mono text-xs text-[#00E5FF] font-bold flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                <span>DATUM: WGS-84 (EPSG:4326)</span>
              </div>
              <div className="font-mono text-[10px] text-[#91A9BB]">17°32'44.2" S, 178°22'18.9" E</div>
              <div className="text-[9px] text-[#00D6A3] font-mono">TILE SERVER: ACTIVE (42 FPS)</div>
            </div>

            <div className="absolute bottom-3 left-3 bg-[#071D33]/90 backdrop-blur rounded px-2.5 py-1 text-xs border border-[#16465A]">
              <span className="font-mono text-[10px] text-[#91A9BB]">
                Illustrative regional coverage footprint for oceanic sensor validation
              </span>
            </div>

            {/* Scale Bar HUD */}
            <div className="absolute bottom-3 right-3 bg-[#071D33]/90 backdrop-blur rounded p-2 text-right border border-[#16465A]">
              <div className="flex items-center justify-end gap-1 font-mono text-[9px] text-[#91A9BB]">
                <span>0</span>
                <span className="w-12 h-0.5 bg-[#91A9BB] block"></span>
                <span>5 NM</span>
              </div>
              <div className="text-[9px] font-mono text-[#00E5FF] mt-0.5">ZOOM LEVEL: 11.4x</div>
            </div>
          </div>

          {/* Layer Control Switches */}
          <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className="text-[#91A9BB] uppercase mr-1">Layer Filters:</span>

            <button
              onClick={() => toggleMapLayer('currents')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.currents
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Currents (HYCOM)</span>
            </button>

            <button
              onClick={() => toggleMapLayer('winds')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.winds
                  ? 'bg-[#00D6A3]/20 text-[#00D6A3] border border-[#00D6A3]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Wind Barbs (ERA5)</span>
            </button>

            <button
              onClick={() => toggleMapLayer('waves')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.waves
                  ? 'bg-[#75E6DA]/20 text-[#75E6DA] border border-[#75E6DA]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Wave Swell (WW3)</span>
            </button>

            <button
              onClick={() => toggleMapLayer('bathymetry')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.bathymetry
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Bathymetry Lines</span>
            </button>

            <button
              onClick={() => toggleMapLayer('sentinel')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.sentinel
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Sentinel Swath</span>
            </button>

            <button
              onClick={() => toggleMapLayer('uav')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition ${
                mapLayers.uav
                  ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'bg-[#071D33] text-[#91A9BB] border border-[#16465A]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>UAV Footprints</span>
            </button>
          </div>
        </div>

        {/* Right Column: API & Service Registry Cards (Col 4) */}
        <div className="lg:col-span-4 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-sm text-[#EAF6FF] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#00D6A3]" />
              <span>API &amp; Pipeline Gateway Registry</span>
            </h3>
            <span className="font-mono text-xs text-[#00D6A3]">4 ACTIVE SERVICES</span>
          </div>

          <div className="space-y-2.5 flex-1 flex flex-col justify-between font-mono text-xs">
            {/* Service 1 */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#EAF6FF]">
                  HYCOM OPeNDAP &amp; NetCDF NCSS
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="text-[11px] text-[#91A9BB] truncate">
                ENDPOINT: ncss/grid/GLBu0.08/expt_93.0
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#91A9BB] pt-1 border-t border-[#16465A]/40">
                <span>Rate: 12 req/min</span>
                <div className="flex gap-2">
                  <button onClick={() => alert('Ping: 42ms to HYCOM')} className="text-[#00E5FF] hover:underline">Ping API</button>
                  <button onClick={() => alert('Config: Read-only NetCDF')} className="text-[#EAF6FF] hover:underline">Config</button>
                </div>
              </div>
            </div>

            {/* Service 2 */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#EAF6FF]">
                  Copernicus Climate Data Store (CDS)
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="text-[11px] text-[#91A9BB] truncate">
                ENDPOINT: api.copernicus.eu/v1/era5
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#91A9BB] pt-1 border-t border-[#16465A]/40">
                <span>Queue: Nominal (0 pend)</span>
                <div className="flex gap-2">
                  <button onClick={() => alert('Ping: 78ms to Copernicus CDS')} className="text-[#00E5FF] hover:underline">Ping API</button>
                  <button onClick={() => alert('Config: ECMWF Hourly')} className="text-[#EAF6FF] hover:underline">Config</button>
                </div>
              </div>
            </div>

            {/* Service 3 */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#EAF6FF]">
                  PostGIS 16 Spatio-Temporal DB
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] text-[9px] font-bold">
                  CONNECTED
                </span>
              </div>
              <div className="text-[11px] text-[#91A9BB] truncate">
                HOST: db-oceanrescue.internal:5432
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#91A9BB] pt-1 border-t border-[#16465A]/40">
                <span>Pool: 8/30 Connections</span>
                <div className="flex gap-2">
                  <button onClick={() => alert('Schema: EPSG:4326 PostGIS geometry')} className="text-[#00E5FF] hover:underline">Inspect Schema</button>
                  <button onClick={() => alert('Vacuuming completed')} className="text-[#EAF6FF] hover:underline">Vacuum</button>
                </div>
              </div>
            </div>

            {/* Service 4 */}
            <div className="bg-[#0B2638] border border-[#16465A] p-3 rounded-lg shadow-sm space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[#EAF6FF]">
                  Local TensorRT Inference Gateway
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] text-[9px] font-bold">
                  HOT STANDBY
                </span>
              </div>
              <div className="text-[11px] text-[#91A9BB] truncate">
                PORT: 8501 gRPC | YOLOv8-seg FP16
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#91A9BB] pt-1 border-t border-[#16465A]/40">
                <span>Latency: 38ms tensor batch</span>
                <div className="flex gap-2">
                  <button onClick={() => alert('Latency: 38ms | Throughput: 26 fps')} className="text-[#00E5FF] hover:underline">Metrics</button>
                  <button onClick={() => alert('Inference worker warm-restarted')} className="text-[#EAF6FF] hover:underline">Restart</button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pipeline Trigger Card */}
          <div className="bg-[#103B50] border border-[#16465A] rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-display font-semibold text-xs text-[#EAF6FF]">Immediate Pipeline Trigger</div>
              <div className="font-mono text-[10px] text-[#91A9BB]">Force sync on next cron tick</div>
            </div>
            <button
              onClick={handleTrigger}
              className={`px-3 py-1.5 rounded font-mono text-xs font-semibold transition-all ${
                triggerState
                  ? 'bg-[#00E5FF] text-[#061522]'
                  : 'bg-[#00D6A3] text-[#061522] hover:bg-[#75E6DA]'
              }`}
            >
              {triggerState ? 'Triggered!' : 'Trigger Now'}
            </button>
          </div>
        </div>
      </div>

      {/* 5. TELEMETRY INGESTION & TRANSFORMATION FLOW (Step-by-step 5 stages) */}
      <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#00E5FF]" />
            <div>
              <h2 className="font-display font-semibold text-sm text-[#EAF6FF]">
                Telemetry Ingestion &amp; Transformation Flow
              </h2>
              <p className="text-xs text-[#91A9BB] font-mono">
                Step-by-step pipeline stages from external NetCDF endpoints to client geospatial dashboards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={handlePurge}
              className="px-3 py-1.5 rounded bg-[#103B50] hover:bg-[#16465A] text-[#91A9BB] hover:text-[#EAF6FF] border border-[#16465A] transition-all"
            >
              {cachePurged ? 'Cache Cleared' : 'Purge Cache'}
            </button>
            <button
              onClick={() => alert('Worker logs: Celery worker #1 running nominal at 24 jobs/hr')}
              className="px-3 py-1.5 rounded bg-[#103B50] hover:bg-[#16465A] text-[#00E5FF] border border-[#16465A] transition-all flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Worker Logs</span>
            </button>
          </div>
        </div>

        {/* 5 Stage Visual Linear Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {/* Stage 1 */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg shadow-sm hover:border-[#00E5FF]/40 transition-colors">
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[10px] text-[#00E5FF]">STAGE 01</span>
              <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
            </div>
            <div className="font-display font-semibold text-xs text-[#EAF6FF]">Raw External APIs</div>
            <p className="text-[11px] text-[#91A9BB] mt-1 font-mono leading-snug">
              Polls HYCOM, ERA5, WW3 NetCDF feeds via async HTTP.
            </p>
            <div className="mt-3 pt-2 border-t border-[#16465A]/40 font-mono text-[10px] space-y-0.5">
              <div className="text-[#00D6A3]">4/4 Feeds Connected</div>
              <div className="text-[#91A9BB]">Avg latency: 210 ms</div>
            </div>
          </div>

          {/* Stage 2 */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg shadow-sm hover:border-[#00E5FF]/40 transition-colors">
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[10px] text-[#00E5FF]">STAGE 02</span>
              <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
            </div>
            <div className="font-display font-semibold text-xs text-[#EAF6FF]">Celery Edge Worker</div>
            <p className="text-[11px] text-[#91A9BB] mt-1 font-mono leading-snug">
              Dispatches background extraction jobs via Redis message broker.
            </p>
            <div className="mt-3 pt-2 border-t border-[#16465A]/40 font-mono text-[10px] space-y-0.5">
              <div className="text-[#00D6A3]">Status: ACTIVE</div>
              <div className="text-[#91A9BB]">Throughput: 24 jobs/hr</div>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg shadow-sm hover:border-[#00E5FF]/40 transition-colors">
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[10px] text-[#00E5FF]">STAGE 03</span>
              <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
            </div>
            <div className="font-display font-semibold text-xs text-[#EAF6FF]">GeoJSON / NetCDF Validator</div>
            <p className="text-[11px] text-[#91A9BB] mt-1 font-mono leading-snug">
              Enforces schema integrity and spatial bounds checking.
            </p>
            <div className="mt-3 pt-2 border-t border-[#16465A]/40 font-mono text-[10px] space-y-0.5">
              <div className="text-[#00D6A3]">0 Schema Errors</div>
              <div className="text-[#91A9BB]">Pass Rate: 99.8%</div>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg shadow-sm hover:border-[#00E5FF]/40 transition-colors">
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[10px] text-[#00E5FF]">STAGE 04</span>
              <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
            </div>
            <div className="font-display font-semibold text-xs text-[#EAF6FF]">PostGIS Transform</div>
            <p className="text-[11px] text-[#91A9BB] mt-1 font-mono leading-snug">
              Projects vector coordinates into EPSG:4326 geometry indices.
            </p>
            <div className="mt-3 pt-2 border-t border-[#16465A]/40 font-mono text-[10px] space-y-0.5">
              <div className="text-[#00D6A3]">148 Geoms Indexed</div>
              <div className="text-[#91A9BB]">DB Buffer Latency: 12ms</div>
            </div>
          </div>

          {/* Stage 5 */}
          <div className="bg-[#071D33] border border-[#16465A] p-3 rounded-lg shadow-sm hover:border-[#00E5FF]/40 transition-colors">
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[10px] text-[#00E5FF]">STAGE 05</span>
              <span className="w-2 h-2 rounded-full bg-[#00D6A3]" />
            </div>
            <div className="font-display font-semibold text-xs text-[#EAF6FF]">Client GIS WebSocket</div>
            <p className="text-[11px] text-[#91A9BB] mt-1 font-mono leading-snug">
              Streams active vector changes to the live UI dashboard map.
            </p>
            <div className="mt-3 pt-2 border-t border-[#16465A]/40 font-mono text-[10px] space-y-0.5">
              <div className="text-[#00D6A3]">Stream: CONNECTED</div>
              <div className="text-[#91A9BB]">E2E Latency: 38 ms</div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. DATA QUALITY, FRESHNESS & INTEGRITY MATRIX (High-Density Table) */}
      <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-xl space-y-3 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00E5FF]" />
            <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">
              Data Quality, Freshness &amp; Provenance Matrix
            </h3>
          </div>
          <span className="font-mono text-xs text-[#91A9BB]">Showing 6 verified data pipelines</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-[#071D33] text-[#91A9BB] uppercase tracking-wider text-[11px] border-b border-[#16465A]">
                <th className="py-2.5 px-3">Source Feed</th>
                <th className="py-2.5 px-3">Data Domain</th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Ingestion Age</th>
                <th className="py-2.5 px-3">Spatial Resolution</th>
                <th className="py-2.5 px-3">Completeness</th>
                <th className="py-2.5 px-3">Quality Status</th>
                <th className="py-2.5 px-3">License &amp; Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16465A]/40 text-[12px]">
              {/* Row 1 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">HYCOM GLBu0.08</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Hydrodynamics (u, v velocity)</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-10-25 14:18</td>
                <td className="py-2.5 px-3 text-[#00D6A3] font-semibold">14m ago</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">1/12° (~9 km)</td>
                <td className="py-2.5 px-3 text-[#00D6A3]">99.8%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] font-bold text-[10px] border border-[#00D6A3]/30">
                    EXCELLENT
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">NOAA / US Navy Open Access</td>
              </tr>

              {/* Row 2 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">ERA5 Reanalysis</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Atmospheric Winds (u10, v10)</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-10-25 14:00</td>
                <td className="py-2.5 px-3 text-[#00D6A3] font-semibold">32m ago</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">0.25° (~28 km)</td>
                <td className="py-2.5 px-3 text-[#00D6A3]">100.0%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] font-bold text-[10px] border border-[#00D6A3]/30">
                    EXCELLENT
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">ECMWF Copernicus Open Data</td>
              </tr>

              {/* Row 3 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">WaveWatch III</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Sig Wave Height &amp; Period</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-10-25 13:34</td>
                <td className="py-2.5 px-3 text-[#00D6A3] font-semibold">58m ago</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">0.16° (~18 km)</td>
                <td className="py-2.5 px-3 text-[#00D6A3]">98.4%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#00D6A3]/20 text-[#00D6A3] font-bold text-[10px] border border-[#00D6A3]/30">
                    NOMINAL
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">NOAA NWS NCEP Operational</td>
              </tr>

              {/* Row 4 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">GEBCO 2024</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Global Bathymetric Elevation</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-06-15 00:00</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">Static (4 mo)</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">15 arc-sec (~450m)</td>
                <td className="py-2.5 px-3 text-[#75E6DA]">100.0%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-[10px] border border-[#00E5FF]/30">
                    VERIFIED
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">IHO-IOC GEBCO Consortium</td>
              </tr>

              {/* Row 5 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">UAV Optical Stream</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Orthomosaic Imagery (4K RGB)</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-10-25 11:20</td>
                <td className="py-2.5 px-3 text-[#FFB547]">3h 12m ago</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">1.2 cm/px GSD</td>
                <td className="py-2.5 px-3 text-[#FFB547]">92.5%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#FFB547]/20 text-[#FFB547] font-bold text-[10px] border border-[#FFB547]/30">
                    DELAYED
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">Field Mission Team Orca-3</td>
              </tr>

              {/* Row 6 */}
              <tr className="hover:bg-[#103B50]/40 transition-colors">
                <td className="py-2.5 px-3 text-[#00E5FF] font-semibold">Artisanal Reports</td>
                <td className="py-2.5 px-3 text-[#EAF6FF] font-sans">Community Sighting Telemetry</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">2024-10-25 08:45</td>
                <td className="py-2.5 px-3 text-[#75E6DA]">5h 47m ago</td>
                <td className="py-2.5 px-3 text-[#EAF6FF]">Point Fix (±50m)</td>
                <td className="py-2.5 px-3 text-[#91A9BB]">74.0%</td>
                <td className="py-2.5 px-3">
                  <span className="px-2 py-0.5 rounded bg-[#75E6DA]/20 text-[#75E6DA] font-bold text-[10px] border border-[#75E6DA]/30">
                    SYNTHETIC
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[#91A9BB] font-sans text-[11px]">Local Maritime VHF Pilot</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. RECENT INGESTION LOGS & AUDIT TRAIL */}
      <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-xl space-y-3 font-mono">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#00D6A3]" />
            <h3 className="font-display font-semibold text-sm text-[#EAF6FF]">Recent Ingestion Jobs &amp; Audit Trail</h3>
          </div>

          {/* Filter controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter jobs..."
                className="w-full bg-[#071D33] border border-[#16465A] rounded pl-8 pr-3 py-1 text-xs text-[#EAF6FF] placeholder-[#91A9BB] focus:outline-none focus:border-[#00E5FF]"
              />
              <Search className="w-3.5 h-3.5 text-[#91A9BB] absolute left-2.5 top-2" />
            </div>

            <div className="flex items-center gap-1 text-xs">
              {['All', 'Success', 'Warnings', 'Failures'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilterTab(tab)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeFilterTab === tab
                      ? 'bg-[#103B50] text-[#00E5FF] font-semibold border border-[#00E5FF]/40'
                      : 'text-[#91A9BB] hover:text-[#EAF6FF]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="space-y-1 text-[12px]">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded bg-[#071D33] border border-[#16465A]/40 hover:bg-[#103B50]/40 transition-colors gap-2"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    job.type === 'success'
                      ? 'bg-[#00D6A3]/20 text-[#00D6A3] border-[#00D6A3]/40'
                      : 'bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/40'
                  }`}
                >
                  {job.status}
                </span>
                <span className="text-[#91A9BB] text-[11px]">{job.time}</span>
                <span className="text-[#00E5FF] font-semibold">{job.id}</span>
                <span className="text-[#EAF6FF] font-sans">{job.title}</span>
              </div>
              <div className="flex items-center gap-4 text-[#91A9BB] text-[11px]">
                <span>{job.count}</span>
                <span>Exec: {job.exec}</span>
                <span className={job.type === 'success' ? 'text-[#00D6A3]' : 'text-[#FFB547]'}>
                  {job.code}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. DATA PROVENANCE, PROJECTIONS & RESPONSIBLE ACADEMIC USE */}
      <div className="bg-[#0B2638] border border-[#16465A] rounded-xl p-5 shadow-lg space-y-2">
        <div className="flex items-center gap-2 text-[#00E5FF]">
          <ShieldCheck className="w-4 h-4" />
          <h4 className="font-display font-semibold text-sm text-[#EAF6FF]">
            Data Provenance, Projections &amp; Responsible Operational Use
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 text-[#91A9BB] text-xs leading-relaxed font-mono">
          <div>
            <span className="text-[#00E5FF] uppercase font-semibold block mb-1">
              Spatial Reference Standards
            </span>
            All geospatial vectors and bounding polygons are transformed from EPSG:4326 (WGS84 datum) into EPSG:3857 (Web Mercator) for client screen rasterization. Benthic soundings reference mean sea level (MSL) per GEBCO 2024 specifications.
          </div>
          <div>
            <span className="text-[#00D6A3] uppercase font-semibold block mb-1">
              Open Data Licensing
            </span>
            Atmospheric and oceanic forcing vectors are incorporated under Copernicus Open Access and NOAA Public Domain terms. GEBCO bathymetric grids are attributed under IHO-IOC Consortium guidelines.
          </div>
          <div>
            <span className="text-[#FFB547] uppercase font-semibold block mb-1">
              Operational Disclaimer
            </span>
            This platform operates as an advanced decision-support research prototype. Telemetry and hydrographic vectors presented herein are simulated for demonstration purposes and must not be utilized for official SOLAS vessel navigation.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;
