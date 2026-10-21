import React from 'react';

/**
 * StatusBadge Component
 * Displays system and mission indicators with OceanRescue tactical styling.
 */
export const StatusBadge = ({ status = 'ONLINE', variant = 'cyan' }) => {
  const variantStyles = {
    cyan: 'bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30',
    teal: 'bg-[#00D6A3]/10 text-[#00D6A3] border-[#00D6A3]/30',
    aqua: 'bg-[#75E6DA]/10 text-[#75E6DA] border-[#75E6DA]/30',
    warning: 'bg-[#FFB547]/10 text-[#FFB547] border-[#FFB547]/30',
    danger: 'bg-[#FF6B61]/10 text-[#FF6B61] border-[#FF6B61]/30',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
        variantStyles[variant] || variantStyles.cyan
      }`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-currentColor animate-pulse" />
      {status}
    </span>
  );
};

export default StatusBadge;
