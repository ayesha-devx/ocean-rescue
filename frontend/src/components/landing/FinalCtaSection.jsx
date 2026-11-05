import React from 'react';
import { Link } from 'react-router-dom';

export const FinalCtaSection = () => {
  return (
    <section className="w-full bg-surface-container-lowest px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Asymmetric Banner Enclosure */}
        <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl bg-surface-container border border-surface-container/60">
          {/* Background Ambient Photo */}
          <div className="relative h-[320px] sm:h-[360px] lg:h-[400px] w-full">
            <img
              className="w-full h-full object-cover object-center"
              alt="Deep blue and azure ocean aerial perspective with clean rolling waves"
              src="/images/landing/ocean-aerial-cta-hd.jpg"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/landing/ocean-aerial-cta.png';
              }}
            />
            {/* Gradient Scrim for readable text */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#173B4D]/95 via-[#173B4D]/60 to-transparent"></div>

            {/* Floating Card Content Inside */}
            <div className="absolute inset-0 p-6 sm:p-8 lg:p-10 flex flex-col justify-end text-white">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-primary-container text-on-primary-container font-label-sm text-xs font-bold uppercase mb-2.5 shadow-xs">
                <span className="material-symbols-outlined text-[15px]">flag</span>
                <span>Join the Alliance</span>
              </div>

              <h2 className="font-playfair text-2xl sm:text-3xl lg:text-4xl text-white font-medium leading-[1.18] mb-2 max-w-3xl">
                Help Us Bring Lost Gear Back Into Sight.
              </h2>

              <p className="font-jakarta font-body-sm text-xs sm:text-sm lg:text-base text-white/90 leading-relaxed mb-5 max-w-2xl">
                Every report helps build a clearer picture of lost fishing gear and supports prioritized, timely recovery missions.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 max-w-lg">
                <Link
                  to="/report-gear"
                  className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-3 px-6 rounded-xl bg-primary-container text-on-primary-container font-label-md text-xs sm:text-sm uppercase tracking-wider font-bold shadow-md hover:opacity-95 active:scale-[0.99] transition-all text-center"
                >
                  <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                  <span>Report Lost Fishing Gear</span>
                </Link>
                <a
                  href="#how-it-works"
                  onClick={(e) => {
                    e.preventDefault();
                    document.querySelector('#how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center justify-center w-full sm:w-auto py-3 px-6 rounded-xl bg-white/20 backdrop-blur-md text-white font-label-md text-xs sm:text-sm uppercase tracking-wider font-semibold hover:bg-white/30 transition-all border border-white/25 text-center"
                >
                  Learn About OceanRescue
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
