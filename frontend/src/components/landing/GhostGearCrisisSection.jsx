import React from 'react';

export const GhostGearCrisisSection = () => {
  return (
    <section className="w-full bg-surface-container-low px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col mb-6 md:mb-8 max-w-4xl">
          <span className="font-label-md text-xs sm:text-sm text-secondary uppercase tracking-widest font-bold mb-2.5">
            The Ghost Gear Crisis
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-on-surface leading-tight font-semibold">
            Silent Hazards Beneath the Surface
          </h2>
        </div>

        {/* Editorial Narrative */}
        <p className="font-jakarta font-body-md text-base sm:text-lg lg:text-xl text-on-surface-variant mb-10 md:mb-12 leading-relaxed max-w-4xl">
          Abandoned, lost, and discarded fishing gear (ALDFG) creates perpetual hazards beneath the surface. When lost at sea, synthetic monofilament and heavy industrial nets drift for decades—indiscriminately ensnaring marine life, stripping delicate coral reefs, and degrading into persistent microplastics. Proactive geospatial tracking turns silent aquatic threats into coordinated recovery missions.
        </p>

        {/* High-Definition Photographic Display with Offset Card */}
        <div className="relative w-full">
          {/* Main Ghost Gear Photo */}
          <div className="w-full h-[320px] sm:h-[360px] lg:h-[400px] rounded-3xl overflow-hidden shadow-xl bg-surface-container relative border border-surface-container/80">
            <img
              className="w-full h-full object-cover object-center"
              alt="Submerged abandoned ghost fishing net entangling coral shelf underwater"
              src="/images/landing/ghost-net-hazard-hd.jpg"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/landing/ghost-net-hazard.png';
              }}
            />
            {/* Subtle scrim overlay to ensure the hazard badge stands out */}
            <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 via-transparent to-black/30 pointer-events-none"></div>

            <div className="absolute top-4 left-4 sm:top-6 sm:left-6 bg-error text-on-error font-label-sm text-xs uppercase px-3.5 py-1.5 rounded-lg shadow-sm font-bold tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              <span>Unrecovered ALDFG Hazard</span>
            </div>
          </div>

          {/* Accent Offset Coral Recovery Card */}
          <div className="relative -mt-6 sm:-mt-8 mx-4 sm:mx-8 bg-surface-container-lowest p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col gap-2 border border-surface-container max-w-2xl z-10">
            <div className="flex items-center gap-2.5 text-primary">
              <span className="material-symbols-outlined text-[22px]">crisis_alert</span>
              <span className="font-title-md text-base sm:text-lg text-on-surface font-bold">
                Targeted Extraction
              </span>
            </div>
            <p className="font-body-sm text-xs sm:text-sm md:text-base text-on-surface-variant leading-relaxed">
              Without precise coordinates and current drift intelligence, recovery divers spend days searching empty waters. OceanRescue models drift pathways to eliminate the guesswork.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GhostGearCrisisSection;
