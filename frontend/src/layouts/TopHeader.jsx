import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Clock, Bell, Menu, Check, Filter } from 'lucide-react';

export const TopHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [datum, setDatum] = useState('WGS84');
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [utcTime, setUtcTime] = useState(() => {
    const now = new Date();
    return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setUtcTime(`${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Dynamic route metadata matching Stitch
  const getRouteMeta = () => {
    switch (location.pathname) {
      case '/ocean-map':
        return {
          breadcrumbs: ['OceanRescue', 'Operations', 'Active Workspace'],
          title: 'Ocean GIS Map',
          badge: 'SIMULATED DATA'
        };
      case '/drift-forecast':
        return {
          breadcrumbs: ['OceanRescue', 'Tactical Operations', 'Drift Modeling'],
          title: 'Drift Forecast Engine',
          badge: 'SIMULATED DATA'
        };
      case '/risk-assessment':
        return {
          breadcrumbs: ['OceanRescue', 'Operations', 'Risk Scoring'],
          title: 'Risk Assessment Matrix',
          badge: 'SIMULATED DATA'
        };
      case '/recovery-planning':
        return {
          breadcrumbs: ['OceanRescue', 'Tactical Operations', 'Recovery Planning'],
          title: 'Recovery Route Planner',
          badge: 'SIMULATED DATA'
        };
      case '/detection-review':
        return {
          breadcrumbs: ['OceanRescue', 'Operations', 'Active Workspace'],
          title: 'AI Detection Review',
          badge: 'SIMULATED DATA'
        };
      case '/detection-details':
        return {
          breadcrumbs: ['OceanRescue', 'Tactical Operations', 'Target Analysis'],
          title: 'Detection Details',
          badge: 'SIMULATED DATA'
        };
      case '/mission-details':
        return {
          breadcrumbs: ['OceanRescue', 'Tactical Operations', 'Mission Management'],
          title: 'Mission Command Dossier',
          badge: 'SIMULATED DATA'
        };
      case '/reports-analytics':
        return {
          breadcrumbs: ['OceanRescue', 'Analytics', 'Environmental Reports'],
          title: 'Reports & Analytics',
          badge: 'SIMULATED DATA'
        };
      case '/settings':
        return {
          breadcrumbs: ['OceanRescue', 'Administration', 'System Configuration'],
          title: 'System Settings',
          badge: 'SIMULATED DATA'
        };
      case '/data-sources':
        return {
          breadcrumbs: ['OceanRescue', 'Tactical Operations', 'Telemetry Ingestion'],
          title: 'Data Sources & Telemetry',
          badge: 'SIMULATED DATA'
        };
      case '/dashboard':
      default:
        return {
          breadcrumbs: ['OceanRescue', 'Dashboard', 'Operational View'],
          title: 'Ocean Intelligence Dashboard',
          badge: 'SIMULATED DATA'
        };
    }
  };

  const meta = getRouteMeta();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    if (query.includes('setting') || query.includes('config') || query.includes('threshold') || query.includes('iou')) {
      navigate('/settings');
    } else if (query.includes('analytic') || query.includes('report') || query.includes('export') || query.includes('csv')) {
      navigate('/reports-analytics');
    } else if (query.includes('dossier') || query.includes('mission') || query.includes('mp-')) {
      navigate('/mission-details');
    } else if (query.includes('map') || query.includes('gis') || query.includes('bathymetry')) {
      navigate('/ocean-map');
    } else if (query.includes('drift') || query.includes('current') || query.includes('forecast')) {
      navigate('/drift-forecast');
    } else if (query.includes('risk') || query.includes('habitat') || query.includes('coral') || query.includes('matrix')) {
      navigate('/risk-assessment');
    } else if (query.includes('recovery') || query.includes('vessel') || query.includes('plan')) {
      navigate('/recovery-planning');
    } else if (query.includes('094') || query.includes('gillnet') || query.includes('net')) {
      navigate('/detection-details');
    } else if (query.includes('review') || query.includes('batch') || query.includes('uav')) {
      navigate('/detection-review');
    } else if (query.includes('data') || query.includes('telemetry') || query.includes('hycom') || query.includes('wind')) {
      navigate('/data-sources');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="h-16 px-4 md:px-6 lg:px-8 bg-[#071D33]/95 backdrop-blur border-b border-[#16465A] flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Left: Mobile Toggle & Breadcrumbs / Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg bg-[#0B2638] text-[#91A9BB] hover:text-[#EAF6FF] border border-[#16465A]"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col min-w-0">
          {/* Breadcrumb line */}
          <nav className="flex items-center gap-1.5 text-[11px] font-mono text-[#91A9BB] truncate">
            {meta.breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb}>
                {idx > 0 && <span className="text-[#16465A]">/</span>}
                <span
                  className={
                    idx === meta.breadcrumbs.length - 1
                      ? 'text-[#00E5FF] font-semibold'
                      : 'hover:text-[#EAF6FF]'
                  }
                >
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>

          {/* Title and Demo Badge */}
          <div className="flex items-center gap-2.5 mt-0.5">
            <h1 className="text-base md:text-lg font-display font-bold text-[#EAF6FF] tracking-tight whitespace-nowrap">
              {meta.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/10 text-[#FFB547] border border-[#FFB547]/30 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB547] animate-pulse"></span>
              {meta.badge}
            </span>
          </div>
        </div>
      </div>

      {/* Center Search & Quick Telemetry */}
      <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
        <form onSubmit={handleSearch} className="relative w-44 md:w-56 xl:w-64 h-9 flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, lat/lon..."
            className="w-full h-full bg-[#0B2638] border border-[#16465A] rounded-lg pl-8 pr-3 text-xs text-[#EAF6FF] placeholder-[#91A9BB] focus:outline-none focus:border-[#00E5FF] font-mono transition-colors"
          />
          <Search className="w-3.5 h-3.5 text-[#91A9BB] absolute left-2.5 pointer-events-none" />
        </form>

        <div
          className="h-9 px-3 rounded-lg bg-[#0B2638] border border-[#16465A] text-xs font-mono text-[#91A9BB] flex items-center gap-2 whitespace-nowrap shrink-0 hover:border-[#00E5FF]/40 transition-colors select-none"
          title="Coordinated Universal Time (UTC)"
        >
          <Clock className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
          <span>{utcTime}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D6A3] animate-pulse"></span>
        </div>
      </div>

      {/* Right Utilities & Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Coordinate Datum Switch */}
        <div className="h-9 flex items-center bg-[#0B2638] border border-[#16465A] rounded-lg p-0.5 text-[11px] font-mono">
          <button
            onClick={() => setDatum('WGS84')}
            className={`h-full px-2.5 rounded transition-colors ${
              datum === 'WGS84'
                ? 'bg-[#103B50] text-[#00E5FF] font-semibold'
                : 'text-[#91A9BB] hover:text-[#EAF6FF]'
            }`}
          >
            WGS84
          </button>
          <button
            onClick={() => setDatum('UTM')}
            className={`h-full px-2.5 rounded transition-colors ${
              datum === 'UTM'
                ? 'bg-[#103B50] text-[#00E5FF] font-semibold'
                : 'text-[#91A9BB] hover:text-[#EAF6FF]'
            }`}
          >
            UTM
          </button>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-[#0B2638] border border-[#16465A] text-[#91A9BB] hover:text-[#EAF6FF] hover:border-[#00E5FF]/40 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF6B61] ring-2 ring-[#0B2638]"></span>
          </button>

          {/* Quick Notifications Popup */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[#0B2638] border border-[#16465A] rounded-xl shadow-2xl p-3 z-50 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#16465A] text-[#EAF6FF] font-semibold">
                <span>Tactical Alerts</span>
                <span className="text-[10px] bg-[#FF6B61]/20 text-[#FF6B61] px-1.5 py-0.2 rounded">1 Critical</span>
              </div>
              <div className="py-2 space-y-2">
                <div
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/detection-details');
                  }}
                  className="p-2 rounded bg-[#071D33] border border-[#FF6B61]/40 hover:border-[#00E5FF] cursor-pointer transition-colors"
                >
                  <span className="text-[#FF6B61] font-bold block">#OR-2024-094 PROXIMITY</span>
                  <span className="text-[11px] text-[#91A9BB]">Within 380m of Tavaru Coral Nursery Reserve Zone A</span>
                </div>
                <div
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/data-sources');
                  }}
                  className="p-2 rounded bg-[#071D33] border border-[#16465A] hover:border-[#00E5FF] cursor-pointer transition-colors"
                >
                  <span className="text-[#75E6DA] font-bold block">HYCOM 1/12° Ingested</span>
                  <span className="text-[11px] text-[#91A9BB]">1,420 velocity vectors refreshed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-[#16465A]">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00E5FF]/30 to-[#103B50] border border-[#00E5FF]/50 flex items-center justify-center text-xs font-mono font-bold text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)] shrink-0">
            CE
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-semibold leading-tight text-[#EAF6FF]">Eng. Team Lead</div>
            <div className="text-[10px] font-mono text-[#91A9BB] leading-tight">Operations Admin</div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
