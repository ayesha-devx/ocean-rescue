import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Public Mariner Portal — Reporting Method Selector
 * Presents the two distinct reporting workflows:
 * 1. GPS-Based Reporting (for saved onboard GPS waypoints)
 * 2. Manual Location Reporting (interactive map picker without GPS)
 */
export const ReportSelectorPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#EBF6F5] via-[#E0F0EF] to-[#EAF6F5] text-[#071B2B] font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 mb-10 pb-4 border-b border-[#B4D9D7]">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#B4D9D7] p-1.5 flex items-center justify-center shadow-xs">
              <img src="/images/landing/logo.png" alt="OceanRescue" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-playfair text-xl font-bold text-[#071B2B] tracking-tight">OceanRescue</span>
              <span className="font-mono text-[11px] font-bold text-[#075E63] tracking-wider uppercase">
                Mariner Intake Portal
              </span>
            </div>
          </Link>

          <Link
            to="/"
            className="px-3.5 py-2 rounded-lg bg-white border border-[#B4D9D7] hover:bg-slate-50 text-xs font-semibold text-[#071B2B] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px] text-[#075E63]">arrow_back</span>
            <span>Back to Home</span>
          </Link>
        </header>

        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAF6F5] text-[#075E63] border border-[#B4D9D7] text-xs font-mono font-bold uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
            Report Lost Fishing Gear
          </div>
          <h1 className="text-3xl sm:text-4xl font-playfair font-bold text-[#071B2B] tracking-tight mb-3">
            Select Your Reporting Method
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Every piece of reported lost gear helps prevent ghost fishing and directs targeted NGO retrieval missions. Choose how you would like to specify the location.
          </p>
        </div>

        {/* Dual Method Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Card 1: GPS-Based Reporting */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#B4D9D7] hover:border-[#00D5D2] transition-all shadow-lg hover:shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mb-5 group-hover:bg-[#00D5D2]/20 transition-colors">
                <span className="material-symbols-outlined text-3xl text-sky-700">my_location</span>
              </div>

              <span className="text-[10px] font-mono uppercase font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full inline-block mb-2">
                Exact Coordinates
              </span>

              <h2 className="text-xl font-bold font-display text-[#071B2B] mb-2 group-hover:text-[#075E63] transition-colors">
                GPS-Based Reporting
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                For mariners who recorded exact coordinates on an onboard chartplotter, GPS device, or marine smartphone app while at sea.
              </p>

              <ul className="text-xs text-slate-700 space-y-2 mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Enter saved latitude and longitude</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Provides high-precision salvage positioning</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Categorized as an Exact GPS Waypoint</span>
                </li>
              </ul>
            </div>

            <Link
              to="/report-gear/gps"
              className="w-full py-3 px-4 rounded-xl bg-[#075E63] hover:bg-[#0B2D42] text-white text-xs font-bold uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Use GPS-Based Reporting</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {/* Card 2: Manual Location Reporting */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#B4D9D7] hover:border-[#F59E0B] transition-all shadow-lg hover:shadow-xl flex flex-col justify-between group">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mb-5 group-hover:bg-amber-100 transition-colors">
                <span className="material-symbols-outlined text-3xl text-amber-700">explore</span>
              </div>

              <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block mb-2">
                No GPS Equipment Required
              </span>

              <h2 className="text-xl font-bold font-display text-[#071B2B] mb-2 group-hover:text-amber-800 transition-colors">
                Manual Location Reporting
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                You do not need GPS hardware or a smartphone while fishing. After returning to shore, answer simple guided questions and mark the loss area on an interactive map.
              </p>

              <ul className="text-xs text-slate-700 space-y-2 mb-6 font-medium">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Select location on an interactive coastal map</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Documented search uncertainty radius</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">check_circle</span>
                  <span>Landmarks &amp; distance questions are optional</span>
                </li>
              </ul>
            </div>

            <Link
              to="/report-gear/manual"
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider text-center transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>I Don't Have GPS Coordinates</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="text-center text-xs text-slate-500 flex items-center justify-center">
          <span>Both reporting methods enter the verified NGO conservation retrieval queue.</span>
        </div>
      </div>
    </div>
  );
};

export default ReportSelectorPage;

