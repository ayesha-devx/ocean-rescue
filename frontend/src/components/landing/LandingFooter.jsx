import React from 'react';
import { Link } from 'react-router-dom';

export const LandingFooter = () => {
  return (
    <footer className="w-full bg-surface-container-low mt-space-2xl px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-12 md:py-16 lg:py-20 border-t border-surface-container">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto flex flex-col gap-8 md:gap-10">
        {/* Logo and Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center p-1 border border-surface-container-high flex-shrink-0">
              <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="11" r="3.5" fill="#00C9C1" />
                <path d="M4 22C9 16 16 16 21 22C26 28 33 28 38 22" stroke="#087E8B" strokeWidth="3" strokeLinecap="round" />
                <path d="M6 28C10.5 22 17.5 22 22 28C26.5 34 33.5 34 38 28" stroke="#00C9C1" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-title-md text-xl sm:text-2xl text-on-surface font-bold">OceanRescue</span>
          </div>

          <p className="font-body-sm text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-xl">
            Harnessing ocean intelligence and AI to protect marine life by locating and recovering lost fishing gear.
          </p>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-6 gap-y-4 font-label-md text-sm text-on-surface-variant">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
          >
            Home
          </a>
          <a
            href="#mission"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#mission')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
          >
            About
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#capabilities')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
          >
            Capabilities
          </a>
          <a
            href="#impact"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#impact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
          >
            Our Impact
          </a>
          <Link
            to="/report-gear"
            className="hover:text-ocean-teal transition-colors py-1 text-primary font-bold"
          >
            Report Gear
          </Link>
          <Link
            to="/ngo/login"
            className="hover:text-primary transition-colors py-1 font-semibold"
          >
            NGO Login
          </Link>
          <Link
            to="/ngo/dashboard"
            className="hover:text-primary transition-colors py-1"
          >
            Portal
          </Link>
        </div>

        {/* Legal & Telemetry Metadata */}
        <div className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-surface-container/60">
          <p className="font-label-sm text-xs sm:text-sm text-on-surface-variant/70">
            © 2025 OceanRescue Alliance. All coordinates and recovery data verified.
          </p>
          <span className="font-label-sm text-xs sm:text-sm text-primary tracking-wider uppercase font-mono">
            Telemetry Level 0 // Clean Lat-Long Feeds
          </span>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
