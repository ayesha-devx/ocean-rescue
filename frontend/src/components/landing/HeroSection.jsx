import React from 'react';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
  return (
    <section id="hero" className="relative w-full pt-8 md:pt-12 lg:pt-16 pb-12 md:pb-18 lg:pb-24 px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 bg-surface-container-lowest overflow-hidden">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          
          {/* Left Column: Editorial Narrative & Action Triggers */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-start z-10">
            {/* Eyebrow Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-low shadow-xs mb-5 border border-surface-container/60">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <span className="font-label-sm uppercase tracking-widest text-secondary font-bold text-xs">
                Every Net Found · Every Life Saved
              </span>
            </div>

            {/* Main Headline in Playfair Display */}
            <h1 className="font-playfair text-4xl sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl text-on-surface tracking-tight mb-5 leading-[1.12]">
              Lost at Sea.<br />
              <span className="text-secondary italic font-medium">Never Out of Sight.</span>
            </h1>

            {/* Supporting Description */}
            <p className="font-jakarta font-body-md text-base sm:text-lg lg:text-xl text-on-surface-variant mb-8 md:mb-10 leading-relaxed max-w-2xl">
              Bringing AI, ocean intelligence, and geospatial telemetry together to locate lost fishing gear and guide smarter marine recovery efforts worldwide.
            </p>

            {/* Aligned CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <Link
                to="/report-gear"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm uppercase tracking-wider font-bold shadow-sm hover:opacity-95 hover:shadow-md active:scale-[0.99] transition-all cursor-pointer text-center"
              >
                <span>Report Lost Fishing Gear</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
              <a
                href="#mission"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('#mission')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="inline-flex items-center justify-center px-7 py-4 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs sm:text-sm uppercase tracking-wider font-semibold hover:bg-surface-container transition-colors cursor-pointer border border-surface-container/80 text-center"
              >
                Explore Our Mission
              </a>
            </div>
          </div>

          {/* Right Column: Framed High-Definition Marine Photographic Composition */}
          <div className="lg:col-span-6 xl:col-span-5 relative w-full mt-4 lg:mt-0">
            {/* Decorative Offset Teal/Aqua Framing Layer */}
            <div className="absolute -top-3 -right-2 md:-top-5 md:-right-5 w-full h-full bg-primary-container/20 rounded-3xl pointer-events-none transform translate-x-2 translate-y-2"></div>

            {/* Primary Photographic Container */}
            <div className="relative w-full h-[320px] sm:h-[360px] lg:h-[400px] rounded-3xl overflow-hidden shadow-xl bg-surface-container border border-surface-container/80">
              <img
                className="w-full h-full object-cover object-center"
                alt="Majestic sea turtle swimming over sunlit coral reef in pristine ocean water"
                src="/images/landing/hero-turtle-hd.jpg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/landing/hero-turtle.png';
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
