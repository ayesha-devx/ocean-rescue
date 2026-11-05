import React from 'react';

/**
 * Reusable bathymetric wave SVG transition divider
 * Preserves the exact SVG path and geometry from Google Stitch export
 */
export const WaveDivider = ({ type = 'whiteToIce', className = '' }) => {
  if (type === 'whiteToIce') {
    return (
      <div className={`w-full overflow-hidden leading-none bg-surface-container-lowest text-surface-container-low -mb-1 ${className}`}>
        <svg
          className="relative block w-full h-8 sm:h-10 md:h-12"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
          aria-hidden="true"
        >
          <path
            d="M0,0 C150,90 350,-40 500,40 C650,120 900,20 1200,60 L1200,120 L0,120 Z"
            fill="currentColor"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden leading-none bg-surface-container-low text-surface-container-lowest -mb-1 ${className}`}>
      <svg
        className="relative block w-full h-8 sm:h-10 md:h-12"
        preserveAspectRatio="none"
        viewBox="0 0 1200 120"
        aria-hidden="true"
      >
        <path
          d="M0,60 C300,120 600,0 900,80 C1050,120 1150,40 1200,20 L1200,120 L0,120 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
};

export default WaveDivider;
