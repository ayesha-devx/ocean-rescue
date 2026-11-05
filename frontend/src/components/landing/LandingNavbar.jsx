import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const LandingNavbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = [
    { label: 'About', href: '#mission' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Capabilities', href: '#capabilities' },
    { label: 'Our Impact', href: '#impact' },
  ];

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <>
      <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(23,59,77,0.05)] border-b border-surface-container/60 transition-all">
        <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto h-18 sm:h-20 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 flex items-center justify-between gap-space-sm">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center gap-space-sm group">
            <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center p-1 border border-surface-container flex-shrink-0 group-hover:border-primary-container transition-colors">
              <svg viewBox="0 0 40 40" className="w-6 h-6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="28" cy="11" r="3.5" fill="#00C9C1" />
                <path d="M4 22C9 16 16 16 21 22C26 28 33 28 38 22" stroke="#087E8B" strokeWidth="3" strokeLinecap="round" />
                <path d="M6 28C10.5 22 17.5 22 22 28C26.5 34 33.5 34 38 28" stroke="#00C9C1" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-title-md text-title-md text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors">
                OceanRescue
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest mt-0.5 text-[10px]">
                Landing Overview
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 font-label-md text-label-md text-on-surface-variant">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(link.href);
                }}
                className="hover:text-primary transition-colors py-1 cursor-pointer font-medium"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/report-gear"
              className="text-primary hover:text-ocean-teal font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
              <span>Report Gear</span>
            </Link>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-space-xs sm:gap-space-sm">
            {/* NGO Login Button (Hidden on very narrow mobile, accessible via drawer & bottom bar) */}
            <Link
              to="/ngo/login"
              className="hidden sm:inline-flex items-center justify-center min-h-[40px] px-space-md py-space-xs font-label-md text-label-md text-primary bg-surface-container-low hover:bg-surface-container rounded-full transition-all border border-surface-container shadow-xs active:scale-[0.98]"
            >
              NGO Login
            </Link>

            {/* Profile Avatar / Quick Operations Access */}
            <Link to="/ngo/dashboard" title="Enter Operations Portal" className="relative group">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary-container/40 group-hover:ring-primary transition-all"
                src="/images/landing/profile.png"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuAT8_Te4x2Ltja9D8piIofoVuf4lDUXzGn5GJDqhxwR-4ZtdK03KIFMKor95F0vlxHUU_JgAAWB5N750uEqbwILIG3hrmdd1vAg1Yw5K0N_fdZuMjLDN_UnPO2EMZz3RqehG5Uivafspe6wPZRyG2ygeaa288KQ9Gikj3MVvp7-9YK_aQ4VA_hQoZjXCpL-U36B9leLq216NukqyJwcdzPFTSv1Pui8PrpcfgayzM7p6fEY4hUgjgmP';
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-container rounded-full ring-2 ring-white" />
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 flex items-center justify-center text-on-surface hover:text-primary transition-colors rounded-lg hover:bg-surface-container-low cursor-pointer lg:hidden"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Menu */}
          <div className="fixed top-16 right-0 w-72 max-w-[85vw] h-[calc(100vh-4rem)] bg-surface-container-lowest shadow-2xl border-l border-surface-container p-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-4">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant font-bold border-b border-surface-container pb-2">
                Navigation
              </span>
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('#hero');
                }}
                className="py-2 text-on-surface hover:text-primary font-title-md text-base flex items-center justify-between"
              >
                <span>Home</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </a>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(link.href);
                  }}
                  className="py-2 text-on-surface hover:text-primary font-title-md text-base flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              ))}

              <div className="h-[1px] bg-surface-container my-2" />

              <Link
                to="/report-gear"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 rounded-lg bg-primary-container text-on-primary-container font-label-md text-center font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add_location_alt</span>
                <span>Report Lost Gear</span>
              </Link>

              <Link
                to="/ngo/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 rounded-lg bg-surface-container-low text-primary font-label-md text-center font-bold tracking-wider uppercase hover:bg-surface-container transition-colors"
              >
                NGO Staff Login
              </Link>
            </div>

            <div className="pt-6 border-t border-surface-container flex flex-col gap-2">
              <Link
                to="/ngo/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">dashboard</span>
                <span>Open NGO Operations Portal</span>
              </Link>
              <p className="text-[11px] text-on-surface-variant font-mono">
                OceanRescue Platform v0.1.0
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LandingNavbar;
