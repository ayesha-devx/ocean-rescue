import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const MobileBottomNav = () => {
  const location = useLocation();

  const handleScrollTo = (id) => {
    if (location.pathname === '/') {
      const el = document.querySelector(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav
      className="fixed bottom-0 w-full z-50 pb-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(23,59,77,0.06)] border-t border-surface-container/60 lg:hidden"
      data-active-classes="text-primary font-bold"
    >
      <div className="flex justify-around items-center h-16 px-space-xs">
        {/* Home */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            handleScrollTo('#hero');
          }}
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${
            location.pathname === '/' ? 'text-primary font-bold' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">waves</span>
          <span className="font-label-sm text-label-sm mt-0.5">Home</span>
        </a>

        {/* How Works */}
        <a
          href="#how-it-works"
          onClick={(e) => {
            e.preventDefault();
            handleScrollTo('#how-it-works');
          }}
          className="flex flex-col items-center justify-center w-16 h-12 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">radar</span>
          <span className="font-label-sm text-label-sm mt-0.5">How Works</span>
        </a>

        {/* Impact */}
        <a
          href="#impact"
          onClick={(e) => {
            e.preventDefault();
            handleScrollTo('#impact');
          }}
          className="flex flex-col items-center justify-center w-16 h-12 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">public</span>
          <span className="font-label-sm text-label-sm mt-0.5">Impact</span>
        </a>

        {/* Report Gear */}
        <Link
          to="/report-gear"
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${
            location.pathname === '/report-gear' ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">add_location_alt</span>
          <span className="font-label-sm text-label-sm mt-0.5">Report</span>
        </Link>

        {/* NGO Desk / Dashboard */}
        <Link
          to="/ngo/login"
          className={`flex flex-col items-center justify-center w-16 h-12 transition-colors ${
            location.pathname.startsWith('/ngo') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span className="material-symbols-outlined text-[22px]">shield_with_heart</span>
          <span className="font-label-sm text-label-sm mt-0.5">NGO Desk</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
