import React from 'react';

export const MissionSection = () => {
  return (
    <section id="mission" className="w-full bg-surface-container-lowest px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col mb-6 md:mb-8 max-w-4xl">
          <span className="font-label-md text-xs sm:text-sm text-secondary uppercase tracking-widest font-bold mb-2.5">
            Our Unified Platform
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-on-surface leading-tight font-semibold">
            Turning Ocean Intelligence Into Action
          </h2>
        </div>

        {/* Narrative */}
        <p className="font-jakarta font-body-md text-base sm:text-lg lg:text-xl text-on-surface-variant mb-10 md:mb-12 leading-relaxed max-w-4xl">
          OceanRescue connects lost-gear reporting, AI-assisted computer vision, hydrodynamic forecasting, and safe maritime dispatch in one centralized decision-support suite for marine protectors.
        </p>

        {/* Editorial Asymmetrical Photographic Card with Aqua Frame */}
        <div className="relative w-full">
          {/* Subtle offset hairline accent frame */}
          <div className="absolute -inset-2 sm:-inset-3 bg-primary-container/20 rounded-3xl transform -rotate-1 pointer-events-none"></div>

          <div className="relative bg-surface-container rounded-3xl overflow-hidden shadow-xl border border-surface-container/80">
            <div className="w-full h-[320px] sm:h-[360px] lg:h-[400px] bg-surface-container-high overflow-hidden">
              <img
                className="w-full h-full object-cover object-center"
                alt="Conservation marine biology research ship at sea with oceanographic equipment deployed"
                src="/images/landing/research-vessel-hd.jpg"
                loading="lazy"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/images/landing/research-vessel.png';
                }}
              />
            </div>
            <div className="p-4 sm:p-6 bg-surface-container-lowest border-t border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5 max-w-3xl">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">sailing</span>
                  <span className="font-label-sm text-xs sm:text-sm text-secondary font-bold uppercase tracking-wider">
                    Field Verification Fleet
                  </span>
                </div>
                <p className="font-body-sm text-sm sm:text-base md:text-lg text-on-surface-variant leading-relaxed">
                  Empowering certified divers and NGO partner fleets with verified sub-surface telemetry before launching recovery vessels.
                </p>
              </div>
              <span className="font-label-sm text-xs sm:text-sm text-outline font-mono bg-surface-container-low px-3.5 py-2 rounded-xl border border-surface-container self-start lg:self-center flex-shrink-0">
                Lat 21.3069° N // Lon 157.8583° W
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionSection;
