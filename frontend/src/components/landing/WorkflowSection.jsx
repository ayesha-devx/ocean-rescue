import React from 'react';
import { Link } from 'react-router-dom';

export const WorkflowSection = () => {
  const steps = [
    {
      number: '1',
      badgeClass: 'bg-primary-container text-on-primary-container',
      icon: 'add_location',
      iconColor: 'text-primary',
      title: 'Report Lost Gear',
      description:
        'Fishermen, recreational mariners, and divers submit gear type, loss timestamp, GPS coordinates, and optional water photos through our rapid web intake.',
      actionLink: '/report-gear',
      actionLabel: 'Submit Intake Report',
    },
    {
      number: '2',
      badgeClass: 'bg-surface-container-lowest text-secondary shadow-sm border border-secondary/20',
      icon: 'verified',
      iconColor: 'text-secondary',
      title: 'Verify The Report',
      description:
        'Authorized NGO teams review incident inputs, confirm sea conditions, eliminate duplicate alerts, and establish initial threat tier ratings.',
      actionLink: '/ngo/incidents',
      actionLabel: 'View NGO Incident Queue',
    },
    {
      number: '3',
      badgeClass: 'bg-surface-container-lowest text-primary shadow-sm border border-primary/20',
      icon: 'memory',
      iconColor: 'text-primary',
      title: 'Detect and Analyze',
      description:
        'Computer vision algorithms analyze drone surveys, satellite passes, and side-scan sonar feeds to classify net density and composition.',
      actionLink: '/ngo/ai-detection',
      actionLabel: 'AI Detection Review',
    },
    {
      number: '4',
      badgeClass: 'bg-surface-container-lowest text-secondary shadow-sm border border-secondary/20',
      icon: 'timeline',
      iconColor: 'text-secondary',
      title: 'Forecast and Prioritize',
      description:
        'Hydrodynamic ocean drift simulations model probable movement corridors using live tidal, current, and wind feeds to forecast recovery zones.',
      actionLink: '/ngo/drift-forecasting',
      actionLabel: 'Drift Trajectory Model',
    },
    {
      number: '5',
      badgeClass: 'bg-primary text-on-primary shadow-sm',
      icon: 'sailing',
      iconColor: 'text-primary',
      title: 'Plan Recovery',
      description:
        'Offshore recovery vessels receive waypoint coordinates, bathymetric depth profiles, and safe lift plans to retrieve the gear cleanly.',
      actionLink: '/ngo/recovery-planning',
      actionLabel: 'Recovery Operations',
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-surface-container-low px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-16 md:py-20 lg:py-28 flex flex-col">
      <div className="max-w-7xl 2xl:max-w-[1440px] mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col mb-10 md:mb-14 max-w-4xl">
          <span className="font-label-md text-xs sm:text-sm text-secondary uppercase tracking-widest font-bold mb-2.5">
            Operational Workflow
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl lg:text-5xl text-on-surface leading-tight font-semibold">
            From Detection to Retrieval
          </h2>
          <p className="font-jakarta text-base sm:text-lg lg:text-xl text-on-surface-variant mt-3 leading-relaxed">
            Five coordinated stages ensuring no lost net continues its destructive path.
          </p>
        </div>

        {/* 5-Stage Responsive Pipeline Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-6 w-full">
          {steps.map((step, idx) => (
            <div
              key={step.number}
              className="relative flex flex-col justify-between bg-surface-container-lowest p-6 sm:p-7 rounded-3xl shadow-xs border border-surface-container/70 hover:shadow-lg hover:border-primary-container/80 transition-all group"
            >
              <div>
                {/* Step Top Bar: Number & Chevron Indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm transition-transform group-hover:scale-105 ${step.badgeClass}`}
                  >
                    {step.number}
                  </div>
                  <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
                    Stage 0{step.number}
                  </span>
                </div>

                {/* Step Title & Icon */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`material-symbols-outlined text-[22px] ${step.iconColor}`}>
                    {step.icon}
                  </span>
                  <h3 className="font-title-lg text-base sm:text-lg text-on-surface font-bold leading-snug">
                    {step.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              {/* Action Link Button */}
              <div className="pt-3 border-t border-surface-container/60">
                <Link
                  to={step.actionLink}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-secondary hover:text-primary transition-colors group-hover:underline"
                >
                  <span>{step.actionLabel}</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
