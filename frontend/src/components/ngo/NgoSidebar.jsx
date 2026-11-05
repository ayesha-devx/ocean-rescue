import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';

/**
 * Stitch-inspired NGO Sidebar
 * Implements clean, modern light-theme navigation for the conservation operations platform.
 */
export const NgoSidebar = ({ mobileOpen, setMobileOpen }) => {
  const location = useLocation();

  // Extract missionId from pathname if navigating within recovery missions
  const missionMatch = location.pathname.match(/\/ngo\/recovery-missions\/([^/]+)/);
  const currentUrlMissionId = missionMatch && missionMatch[1] !== 'route-optimization' ? missionMatch[1] : null;

  const [activeMissionId, setActiveMissionId] = React.useState(() => {
    return currentUrlMissionId || sessionStorage.getItem('oceanrescue_active_mission_id') || '57';
  });

  React.useEffect(() => {
    if (currentUrlMissionId && currentUrlMissionId !== 'route-optimization') {
      setActiveMissionId(currentUrlMissionId);
      sessionStorage.setItem('oceanrescue_active_mission_id', currentUrlMissionId);
    }
  }, [currentUrlMissionId]);

  const navItems = [
    { label: 'Overview', path: '/ngo/dashboard', icon: 'dashboard' },
    { label: 'Incidents', path: '/ngo/incidents', icon: 'assignment' },
    { label: 'Verified Map', path: '/ngo/map', icon: 'map' },
    { label: 'AI Detection', path: '/ngo/ai-detection', icon: 'filter_center_focus' },
    {
      label: 'Environmental Intelligence',
      path: '/ngo/environmental-intelligence',
      icon: 'air',
    },
    { label: 'Drift Forecasting', path: '/ngo/drift-forecasting', icon: 'explore' },
    { label: 'Risk Prioritization', path: '/ngo/risk-prioritization', icon: 'warning' },
    { label: 'Recovery Planning', path: '/ngo/recovery-planning', icon: 'anchor' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#D8ECEC] z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(23,59,77,0.04)] transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-[#D8ECEC]">
            <Link
              to="/ngo/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 min-w-0 group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] flex items-center justify-center p-1 flex-shrink-0 group-hover:border-[#00C9C1] transition-colors">
                <img
                  src="/images/landing/logo.png"
                  alt="OceanRescue"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuBiwCiH06fMn1uqRKe2HOv7TxijbrJvJHiyvnbGdcORIZTniyGNFyQyZhewjnLWSdtuFXeKY4hgTBmpbgbWko235ifJPAriAs0M3-XemI8nCwDmo1grIxOEzuCr306t3m4aizpnRlWbZVQFU8LcmpxXa6-KbppKhUTz7slgLB0_RGgY3xj4ITbOLC8wZ_kArx3ieSbEalAZ4p15nlcNPFGqP_h9du6Mk4mH9SYtIN-wDTh4KfPy-Wwm';
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display text-base font-bold text-[#173B4D] truncate group-hover:text-[#087E8B] transition-colors leading-tight">
                  OceanRescue
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#087E8B] font-semibold truncate">
                  Operations Portal
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-lg text-slate-500 hover:text-[#173B4D] hover:bg-[#F2FAFA] lg:hidden"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Section: Report Management */}
          <div className="px-4 pt-3 pb-1">
            <span className="font-mono text-[10px] uppercase text-slate-500 font-bold tracking-wider">
              Report Management
            </span>
          </div>

          <div className="px-2 mb-1">
            <NavLink
              to="/ngo/reports"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#F2FAFA] text-[#087E8B] font-semibold border-l-4 border-[#00C9C1] shadow-2xs'
                    : 'text-slate-600 hover:bg-[#F2FAFA] hover:text-[#173B4D]'
                }`
              }
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  location.pathname === '/ngo/reports' ? 'text-[#087E8B]' : 'text-slate-500'
                }`}
              >
                folder_shared
              </span>
              <span className="truncate">All Reports</span>
            </NavLink>
          </div>

          {/* Section Heading */}
          <div className="px-4 pt-2 pb-1 border-t border-[#D8ECEC]/60">
            <span className="font-mono text-[10px] uppercase text-slate-500 font-bold tracking-wider">
              Mission Systems
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/ngo/dashboard' && location.pathname.startsWith(item.path));

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#F2FAFA] text-[#087E8B] font-semibold border-l-4 border-[#00C9C1] shadow-2xs'
                      : 'text-slate-600 hover:bg-[#F2FAFA] hover:text-[#173B4D]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isActive ? 'text-[#087E8B]' : 'text-slate-500'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}

            {/* Indented Sub-items under Recovery Planning */}
            <div className="pl-6 pr-1 pt-0.5 space-y-0.5">
              {/* 2. Route Optimization */}
              <NavLink
                to={`/ngo/recovery-missions/${activeMissionId}/route-optimization`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  location.pathname.includes('/route-optimization')
                    ? 'bg-[#EAF7F7] text-[#087E8B] font-semibold border-l-2 border-[#00C9C1] shadow-2xs'
                    : 'text-slate-500 hover:bg-[#F2FAFA] hover:text-[#173B4D]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">alt_route</span>
                <span className="truncate">Route Optimization</span>
              </NavLink>

              {/* 3. Recovery Tracking */}
              <NavLink
                to={`/ngo/recovery-missions/${activeMissionId}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  location.pathname.startsWith('/ngo/recovery-missions') && !location.pathname.includes('/route-optimization')
                    ? 'bg-[#EAF7F7] text-[#087E8B] font-semibold border-l-2 border-[#00C9C1] shadow-2xs'
                    : 'text-slate-500 hover:bg-[#F2FAFA] hover:text-[#173B4D]'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">track_changes</span>
                <span className="truncate">Recovery Tracking</span>
              </NavLink>
            </div>
          </nav>
        </div>

        {/* Bottom Utility & Profile Strip */}
        <div className="border-t border-[#D8ECEC] p-2 bg-white space-y-1">
          <Link
            to="/report-gear"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-[#F2FAFA] hover:text-[#087E8B] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-[#087E8B]">
              add_location_alt
            </span>
            <span className="truncate">Public Intake Form</span>
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-[#F2FAFA] hover:text-[#087E8B] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">
              arrow_back
            </span>
            <span className="truncate">Back to Public Site</span>
          </Link>

          {/* Operator Chip */}
          <div className="mt-2 p-2.5 rounded-xl bg-[#F2FAFA] border border-[#D8ECEC] flex items-center justify-between gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-[#087E8B] text-white flex items-center justify-center font-bold text-xs">
                  OP
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#00C9C1] ring-2 ring-white" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[#173B4D] truncate">
                  NGO Officer
                </span>
                <span className="font-mono text-[9px] text-slate-500 truncate">
                  Field Operations
                </span>
              </div>
            </div>

            <Link
              to="/ngo/login"
              title="Sign Out"
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

export default NgoSidebar;
