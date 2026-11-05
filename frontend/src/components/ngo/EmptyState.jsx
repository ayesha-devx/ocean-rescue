import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState Component
 *
 * Provides a clean, modern, Stitch-styled empty state for screens and tables
 * where no live data records currently exist.
 * Conforms strictly to Requirement 9: No fictional or fabricated sample data.
 */
export const EmptyState = ({
  icon = 'inbox',
  title = 'No Data Available',
  description = 'No active records or telemetry feeds are available at this time.',
  actionText,
  actionLink,
  onAction,
  secondaryNote,
  className = '',
}) => {
  return (
    <div
      className={`rounded-xl bg-white border border-[#D8ECEC] p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#F2FAFA] border border-[#D8ECEC] text-[#087E8B] flex items-center justify-center mb-4 shadow-2xs">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>

      <h3 className="text-lg font-bold text-[#173B4D] font-display tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6 font-sans">
        {description}
      </p>

      {actionText && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLink ? (
            <Link
              to={actionLink}
              className="px-4 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#00C9C1]"
            >
              <span>{actionText}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="px-4 py-2 rounded-lg bg-[#00C9C1] hover:bg-[#087E8B] text-[#173B4D] hover:text-white font-semibold text-xs tracking-wider uppercase transition-all shadow-xs flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#00C9C1] cursor-pointer"
            >
              <span>{actionText}</span>
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          ) : null}
        </div>
      )}

      {secondaryNote && (
        <span className="text-[11px] font-mono text-slate-400 mt-4 block">
          {secondaryNote}
        </span>
      )}
    </div>
  );
};

export default EmptyState;
