import React from 'react';
import { 
  Radar, 
  MapPin, 
  Wind, 
  Compass, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Database,
  Sliders,
  Shield
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';

export const Home = () => {
  const themeTokens = [
    { name: 'Background', hex: '#061522', class: 'bg-[#061522]' },
    { name: 'Navigation', hex: '#071D33', class: 'bg-[#071D33]' },
    { name: 'Cards', hex: '#0B2638', class: 'bg-[#0B2638]' },
    { name: 'Elevated Surfaces', hex: '#103B50', class: 'bg-[#103B50]' },
    { name: 'Borders', hex: '#16465A', class: 'bg-[#16465A]' },
    { name: 'Electric Cyan', hex: '#00E5FF', class: 'bg-[#00E5FF]' },
    { name: 'Aqua', hex: '#75E6DA', class: 'bg-[#75E6DA]' },
    { name: 'Teal', hex: '#00D6A3', class: 'bg-[#00D6A3]' },
    { name: 'Primary Text', hex: '#EAF6FF', class: 'bg-[#EAF6FF]' },
    { name: 'Secondary Text', hex: '#91A9BB', class: 'bg-[#91A9BB]' },
  ];

  const plannedScreens = [
    { id: 'gis', name: 'Ocean Intelligence GIS Dashboard', icon: Radar, count: 'Live Map' },
    { id: 'ai-detection', name: 'AI Detection Review', icon: Cpu, count: 'YOLOv8' },
    { id: 'detection-details', name: 'Detection Details', icon: Layers, count: 'Telemetry' },
    { id: 'drift-forecast', name: 'Drift Forecast', icon: Wind, count: 'Simulation' },
    { id: 'interactive-map', name: 'Interactive Ocean Map', icon: MapPin, count: 'Bathymetry' },
    { id: 'telemetry', name: 'Data Sources & Environmental Telemetry', icon: Database, count: 'NOAA / Copernicus' },
    { id: 'mission-status', name: 'Mission Details & Status', icon: Compass, count: 'Tactical' },
    { id: 'recovery-planning', name: 'Recovery Planning', icon: Shield, count: 'Optimization' },
    { id: 'risk-assessment', name: 'Risk Assessment', icon: CheckCircle2, count: 'Sensitive Areas' },
    { id: 'settings', name: 'Settings & System Configuration', icon: Sliders, count: 'Config' },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0B2638] via-[#071D33] to-[#0B2638] border border-[#16465A] p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-[#00E5FF] uppercase bg-[#00E5FF]/10 px-3 py-1 rounded-full border border-[#00E5FF]/20">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
              Phase 1 Frontend Setup Active
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge status="VITE + REACT RUNNING" variant="teal" />
              <StatusBadge status="TAILWIND CONFIGURED" variant="cyan" />
            </div>
          </div>

          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-[#EAF6FF] mb-3">
            OceanRescue Marine Intelligence Dashboard
          </h1>
          <p className="text-[#91A9BB] max-w-3xl text-sm md:text-base leading-relaxed">
            AI-Driven Geospatial Intelligence for Detection, Drift Forecasting, and Retrieval Optimization of Abandoned, Lost or otherwise Discarded Fishing Gear (ALDFG).
          </p>
        </div>
      </div>

      {/* Theme Verification Matrix */}
      <section className="bg-[#0B2638] rounded-xl border border-[#16465A] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#16465A]">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#EAF6FF]">
              Design System & Color Tokens
            </h2>
            <p className="text-xs text-[#91A9BB] font-mono">
              OceanRescue verified palette tokens according to Stitch specification
            </p>
          </div>
          <span className="text-xs font-mono text-[#75E6DA] bg-[#103B50] px-2.5 py-1 rounded border border-[#16465A]">
            10/10 Tokens Mapped
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {themeTokens.map((token) => (
            <div
              key={token.name}
              className="p-3 rounded-lg bg-[#071D33] border border-[#16465A] flex flex-col gap-2 hover:border-[#00E5FF]/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-6 h-6 rounded-md border border-[#16465A] shadow-inner"
                  style={{ backgroundColor: token.hex }}
                />
                <span className="text-[10px] font-mono text-[#91A9BB]">{token.hex}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-[#EAF6FF] truncate">{token.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Planned Screens Catalog for Phase 2 */}
      <section className="bg-[#0B2638] rounded-xl border border-[#16465A] p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#16465A]">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#EAF6FF]">
              Exported Stitch Screens Target Architecture
            </h2>
            <p className="text-xs text-[#91A9BB] font-mono">
              Ready for conversion in subsequent phases
            </p>
          </div>
          <span className="text-xs font-mono text-[#00E5FF] bg-[#103B50] px-2.5 py-1 rounded border border-[#16465A]">
            10 Screens Queued
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {plannedScreens.map((screen, idx) => {
            const Icon = screen.icon;
            return (
              <div
                key={screen.id}
                className="p-4 rounded-lg bg-[#071D33] border border-[#16465A] flex items-center justify-between hover:bg-[#103B50]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#103B50] border border-[#16465A] flex items-center justify-center text-[#00E5FF]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#EAF6FF]">{screen.name}</h3>
                    <p className="text-[11px] font-mono text-[#91A9BB]">{screen.count}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#75E6DA] bg-[#0B2638] px-2 py-0.5 rounded border border-[#16465A]">
                  #{idx + 1}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Home;
