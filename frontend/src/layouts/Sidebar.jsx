import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Cpu,
  Layers,
  Wind,
  AlertTriangle,
  Compass,
  FileText,
  Sliders,
  Database,
  CheckCircle2,
  Menu,
  X
} from 'lucide-react';

export const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
      activeMatches: ['/dashboard', '/']
    },
    {
      name: 'Ocean Map',
      path: '/ocean-map',
      icon: Map,
      badge: null,
      tag: 'GIS',
      activeMatches: ['/ocean-map']
    },
    {
      name: 'AI Detection',
      path: '/detection-review',
      icon: Cpu,
      badge: 'YOLOv8',
      activeMatches: ['/detection-review']
    },
    {
      name: 'Detection Details',
      path: '/detection-details',
      icon: Layers,
      badge: null,
      activeMatches: ['/detection-details']
    },
    {
      name: 'Drift Forecast',
      path: '/drift-forecast',
      icon: Wind,
      badge: null,
      activeMatches: ['/drift-forecast']
    },
    {
      name: 'Risk Assessment',
      path: '/risk-assessment',
      icon: AlertTriangle,
      badge: 'dot-red',
      activeMatches: ['/risk-assessment']
    },
    {
      name: 'Recovery Planning',
      path: '/recovery-planning',
      icon: Compass,
      badge: null,
      activeMatches: ['/recovery-planning']
    },
    {
      name: 'Mission Details',
      path: '/mission-details',
      icon: CheckCircle2,
      badge: null,
      activeMatches: ['/mission-details']
    },
    {
      name: 'Reports & Analytics',
      path: '/reports-analytics',
      icon: FileText,
      badge: null,
      activeMatches: ['/reports-analytics']
    },
    {
      name: 'Data Sources',
      path: '/data-sources',
      icon: Database,
      badge: null,
      activeMatches: ['/data-sources']
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Sliders,
      badge: null,
      activeMatches: ['/settings']
    }
  ];

  const isItemActive = (item) => {
    if (item.activeMatches) {
      return item.activeMatches.includes(location.pathname);
    }
    return location.pathname === item.path;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#071D33] border-r border-[#16465A] z-50 flex flex-col justify-between select-none transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 border-b border-[#16465A] bg-[#071D33]">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3 group">
                {/* Luminous Wave Emblem */}
                <div className="w-10 h-10 rounded-lg bg-[#0B2638] border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.25)] group-hover:scale-105 transition-transform">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.2"
                    viewBox="0 0 24 24"
                  >
                    <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                    <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                    <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"></path>
                  </svg>
                </div>
                <div>
                  <span className="font-display font-bold text-lg tracking-wider text-[#EAF6FF] block leading-tight">
                    Ocean<span className="text-[#00E5FF]">Rescue</span>
                  </span>
                  <span className="text-[9.5px] font-mono tracking-tight text-[#75E6DA] font-semibold block whitespace-nowrap mt-0.5">
                    Every Net Found. Every Life Saved.
                  </span>
                </div>
              </Link>
              {/* Close button for mobile */}
              <button
                className="lg:hidden p-1 rounded text-[#91A9BB] hover:text-[#EAF6FF]"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Operational status badge strip */}
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                OPERATIONAL v1.0
              </span>
              <span className="text-[#91A9BB] font-medium">YOLOv8-seg</span>
            </div>
          </div>

          {/* Tactical Engine Status Ribbon */}
          <div className="px-4 py-2 border-b border-[#16465A]/60 bg-[#061522]/60 flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#91A9BB] tracking-wider font-semibold">TACTICAL GIS ENGINE</span>
            <span className="text-[#00D6A3] flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3] animate-pulse"></span> ONLINE
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setMobileOpen && setMobileOpen(false)}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-r from-[#00E5FF]/20 via-[#00E5FF]/10 to-transparent border-l-[3px] border-[#00E5FF] text-[#EAF6FF] font-semibold shadow-[0_0_15px_rgba(0,229,255,0.12)] pl-[9px]'
                      : 'text-[#91A9BB] hover:text-[#EAF6FF] hover:bg-[#0B2638] hover:translate-x-0.5'
                  }`}
                  title={item.tooltip || item.name}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${active ? 'text-[#00E5FF] drop-shadow-[0_0_6px_rgba(0,229,255,0.6)]' : 'text-[#91A9BB] group-hover:text-[#00E5FF]'}`} />
                    <span>{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse"></span>
                    )}
                    {item.badge === 'YOLOv8' && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#103B50] text-[#00E5FF] border border-[#00E5FF]/30">
                        YOLOv8
                      </span>
                    )}
                    {item.badge === 'dot-red' && (
                      <span className="w-2 h-2 rounded-full bg-[#FF6B61] ring-2 ring-[#FF6B61]/30"></span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Telemetry & Model Footprint */}
          <div className="p-3.5 border-t border-[#16465A] bg-[#0B2638]/40">
            <div className="text-[11px] font-mono space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">MODEL ENGINE</span>
                <span className="text-[#00D6A3] flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3] inline-block"></span> YOLOv8s-seg
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">DATASET</span>
                <span className="text-[#EAF6FF] font-medium">SATELLITE & UAV FEED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#91A9BB]">LATENCY</span>
                <span className="text-[#00E5FF] font-medium">42 ms (TensorRT)</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-[#16465A]/60 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00D6A3] animate-pulse"></div>
              <p className="text-[10px] text-[#91A9BB] font-mono tracking-tight leading-tight">
                <span className="text-[#00D6A3] font-semibold">Active Operational Telemetry</span>
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
