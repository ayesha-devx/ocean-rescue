import React from 'react';

/**
 * PageHero Component
 * Immersive tactical ocean banner with ambient caustics, plankton particles,
 * telemetry indicators, and primary action buttons.
 */
export const PageHero = ({
  sector = 'Lau Basin & Tavaru Sector 4',
  title,
  subtitle,
  badgeText,
  badgeVariant = 'cyan', // 'cyan', 'teal', 'amber', 'red'
  stats = [],
  actions = null,
  children
}) => {
  const badgeStyles = {
    cyan: 'bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.2)]',
    teal: 'bg-[#00D6A3]/15 text-[#00D6A3] border-[#00D6A3]/40 shadow-[0_0_10px_rgba(0,214,163,0.2)]',
    amber: 'bg-[#FFB547]/15 text-[#FFB547] border-[#FFB547]/40 shadow-[0_0_10px_rgba(255,181,71,0.2)]',
    red: 'bg-[#FF6B61]/15 text-[#FF6B61] border-[#FF6B61]/40 shadow-[0_0_10px_rgba(255,107,97,0.2)]'
  };

  const dotColors = {
    cyan: 'bg-[#00E5FF]',
    teal: 'bg-[#00D6A3]',
    amber: 'bg-[#FFB547]',
    red: 'bg-[#FF6B61]'
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#061522] via-[#082238] to-[#061522] border border-[#16465A] p-5 md:p-6 shadow-2xl">
      {/* Ambient Underwater Lighting & Caustics */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#00E5FF]/10 via-[#00D6A3]/5 to-transparent pointer-events-none" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00E5FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#00D6A3]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Floating Plankton Specks */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
        <circle cx="8%" cy="25%" r="1.5" fill="#00E5FF" className="animate-plankton-1" />
        <circle cx="22%" cy="65%" r="2" fill="#75E6DA" className="animate-plankton-2" />
        <circle cx="45%" cy="30%" r="1" fill="#00D6A3" className="animate-plankton-1" />
        <circle cx="68%" cy="75%" r="2" fill="#00E5FF" className="animate-plankton-2" />
        <circle cx="85%" cy="35%" r="1.5" fill="#75E6DA" className="animate-plankton-1" />
        <circle cx="92%" cy="60%" r="2" fill="#00D6A3" className="animate-plankton-2" />
      </svg>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            {badgeText && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyles[badgeVariant] || badgeStyles.cyan}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dotColors[badgeVariant] || dotColors.cyan} animate-pulse`} />
                {badgeText}
              </span>
            )}
            {sector && (
              <span className="text-[11px] font-mono text-[#91A9BB]">
                {sector}
              </span>
            )}
          </div>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-display font-bold text-[#EAF6FF] tracking-tight">
            {title}
          </h1>

          {subtitle && (
            <p className="text-xs md:text-sm font-mono text-[#91A9BB] max-w-3xl leading-relaxed">
              {subtitle}
            </p>
          )}

          {stats && stats.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2 md:gap-3 text-[11px] font-mono text-[#91A9BB]">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-[#0B2638]/80 px-2.5 py-1 rounded-md border border-[#16465A]">
                  {stat.icon}
                  <span>{stat.label}: <strong className={stat.highlightColor || 'text-[#EAF6FF]'}>{stat.value}</strong></span>
                </div>
              ))}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="relative z-10 mt-4 pt-4 border-t border-[#16465A]/60">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHero;
