import React from 'react';

export const FeatureShowcaseSection = () => {
  return (
    <section id="capabilities" className="w-full bg-surface-container-lowest px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col mb-8 md:mb-12 max-w-4xl">
          <span className="font-label-md text-xs sm:text-sm text-secondary uppercase tracking-widest font-bold mb-2.5">
            System Capabilities
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-on-surface leading-tight font-semibold">
            Intelligent Marine Conservation Tech
          </h2>
        </div>

        {/* Feature Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 w-full">
          {/* Feature 01: Full Width Across Laptop */}
          <div className="md:col-span-2 bg-surface-container-low rounded-3xl p-8 sm:p-10 lg:p-12 shadow-xs flex flex-col justify-between gap-6 border border-surface-container/70 hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs sm:text-sm uppercase tracking-widest text-primary font-bold">
                01 // AI Vision
              </span>
              <span className="material-symbols-outlined text-primary text-[28px]">
                filter_center_focus
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8">
                <h3 className="font-title-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold mb-3">
                  AI-Based Fishing Gear Detection
                </h3>
                <p className="font-body-sm text-base sm:text-lg lg:text-xl text-on-surface-variant leading-relaxed max-w-4xl">
                  Proprietary object detection trained on diverse underwater optical and sonar imagery identifies nylon monofilament, trawl nets, and crab pots with confidence calibration.
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end justify-center self-start lg:self-center w-full">
                <div className="inline-flex items-center gap-2 text-primary font-label-sm text-xs sm:text-sm bg-surface-container-lowest px-4 py-2 rounded-xl border border-primary/20 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span className="font-medium">YOLOv8-Seg Computer Vision</span>
                </div>
                <div className="inline-flex items-center gap-2 text-secondary font-label-sm text-xs sm:text-sm bg-surface-container-lowest px-4 py-2 rounded-xl border border-secondary/20 shadow-xs">
                  <span className="material-symbols-outlined text-[18px]">category</span>
                  <span className="font-medium">Nets, Lines &amp; Crab Pots</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 02: Featured Ocean Teal Accent Panel */}
          <div className="md:col-span-2 bg-secondary text-on-secondary rounded-3xl p-8 sm:p-10 lg:p-12 shadow-xl flex flex-col gap-4 relative overflow-hidden border border-secondary/90">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs sm:text-sm uppercase tracking-widest text-primary-fixed font-bold">
                02 // GIS Platform
              </span>
              <span className="material-symbols-outlined text-primary-fixed text-[30px]">
                map
              </span>
            </div>
            <div>
              <h3 className="font-title-lg text-2xl sm:text-3xl lg:text-4xl text-on-secondary font-bold mb-3">
                Geospatial Incident Mapping
              </h3>
              <p className="font-body-sm text-base sm:text-lg lg:text-xl text-on-secondary/90 leading-relaxed max-w-4xl">
                Interactive coordinate mapping overlays international fishing boundaries, sanctuary zones, depth bathymetry, and high-frequency reporting clusters.
              </p>
            </div>
            <div className="mt-2 inline-flex items-center gap-2.5 text-primary-fixed font-label-sm text-xs sm:text-sm bg-black/20 self-start px-4 py-1.5 rounded-full border border-primary-fixed/25">
              <span>Continuous NOAA / Copernicus Bathymetry</span>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </div>
          </div>

          {/* Feature 03 */}
          <div className="bg-surface-container-low rounded-3xl p-7 sm:p-9 shadow-xs flex flex-col justify-between gap-4 border border-surface-container/70 hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs sm:text-sm uppercase tracking-widest text-primary font-bold">
                03 // Ocean Currents
              </span>
              <span className="material-symbols-outlined text-primary text-[26px]">air</span>
            </div>
            <div>
              <h3 className="font-title-lg text-xl sm:text-2xl text-on-surface font-bold mb-2.5">
                Hydrodynamic &amp; Weather Ingestion
              </h3>
              <p className="font-body-sm text-base sm:text-lg text-on-surface-variant leading-relaxed">
                Surface currents, tidal cycles, and sea-surface temperature data stream directly into models to predict how submerged obstacles shift under rough seas.
              </p>
            </div>
          </div>

          {/* Feature 04 */}
          <div className="bg-surface-container-low rounded-3xl p-7 sm:p-9 shadow-xs flex flex-col justify-between gap-4 border border-surface-container/70 hover:border-secondary/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs sm:text-sm uppercase tracking-widest text-secondary font-bold">
                04 // Trajectory Modeling
              </span>
              <span className="material-symbols-outlined text-secondary text-[26px]">waves</span>
            </div>
            <div>
              <h3 className="font-title-lg text-xl sm:text-2xl text-on-surface font-bold mb-2.5">
                Drift Forecasting &amp; Search-Area Bounds
              </h3>
              <p className="font-body-sm text-base sm:text-lg text-on-surface-variant leading-relaxed">
                Monte Carlo dispersion calculations estimate gear movement probability radii over 24 to 72 hours, optimizing search radiuses for volunteer and NGO vessels.
              </p>
            </div>
          </div>

          {/* Feature 05 */}
          <div className="md:col-span-2 bg-surface-container-low rounded-3xl p-8 sm:p-10 lg:p-12 shadow-xs flex flex-col gap-4 border border-surface-container/70 hover:border-primary/40 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-xs sm:text-sm uppercase tracking-widest text-primary font-bold">
                05 // Salvage Planning
              </span>
              <span className="material-symbols-outlined text-primary text-[26px]">
                assignment_turned_in
              </span>
            </div>
            <div>
              <h3 className="font-title-lg text-2xl sm:text-3xl lg:text-4xl text-on-surface font-bold mb-2.5">
                Risk-Based Recovery Prioritization
              </h3>
              <p className="font-body-sm text-base sm:text-lg lg:text-xl text-on-surface-variant leading-relaxed max-w-4xl">
                Sorts missions based on ecosystem vulnerability, proximity to shallow coral heads, depth limitations, and seasonal marine mammal migration corridors.
              </p>
            </div>
            <div className="mt-2 inline-flex items-center gap-2.5 text-primary font-label-sm text-xs sm:text-sm bg-surface-container-lowest self-start px-4 py-1.5 rounded-full border border-primary/20">
              <span>Dynamic Multi-Factor Ecological Risk Scoring</span>
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcaseSection;
