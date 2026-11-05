import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * Stitch-inspired NGO Top Header Bar
 */
export const NgoHeader = ({ onMenuClick }) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white border-b border-[#D8ECEC] z-30 px-4 sm:px-6 flex items-center justify-between shadow-[0_1px_4px_rgba(23,59,77,0.02)]">
      {/* Left: Mobile Menu & Sector Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-1.5 rounded-lg text-slate-600 hover:text-[#173B4D] hover:bg-[#F2FAFA] lg:hidden focus:outline-none focus:ring-2 focus:ring-[#00C9C1]"
          aria-label="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-slate-600 font-mono text-xs">
          <span className="material-symbols-outlined text-[18px] text-[#087E8B]">
            satellite_alt
          </span>
          <span className="uppercase text-[#087E8B] font-semibold tracking-wider">
            Sector 04-NW
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-[#173B4D] font-medium hidden md:inline">
            ALDFG Sentinel Telemetry
          </span>
        </div>
      </div>

      {/* Right: Search, Quick Action, System Badge, Avatar */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="relative hidden md:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-slate-400 pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reports, coordinates, tags..."
            className="w-56 lg:w-64 h-9 pl-9 pr-3 rounded-lg bg-[#F2FAFA] border border-[#D8ECEC] text-xs text-[#173B4D] placeholder:text-slate-400 focus:outline-none focus:border-[#00C9C1] focus:bg-white transition-all"
          />
        </div>

        {/* Public Report Button */}
        <Link
          to="/report-gear"
          className="h-8 px-3 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-2xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#00C9C1]"
        >
          <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
          <span className="hidden sm:inline">Intake Report</span>
        </Link>

        {/* System Online Badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F2FAFA] border border-[#D8ECEC] text-[10px] font-mono uppercase text-[#087E8B] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span>Active Operations</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-[#D8ECEC] hidden sm:block" />

        {/* User Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#087E8B] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#00C9C1]/30">
            OP
          </div>
        </div>
      </div>
    </header>
  );
};

export default NgoHeader;
