import React from 'react';

/**
 * Shared SVG wrapper for PeakUp-styled social media icons.
 *
 * @param {Object} props
 * @param {string} props.ariaLabel
 * @param {string|number} props.width
 * @param {string|number} props.height
 * @param {string} props.gradientId
 * @param {string} props.viewBox
 * @param {(fill: string) => React.ReactNode} props.renderPaths
 * @returns {JSX.Element}
 */
export const PeakUpSocialIcon = ({
  ariaLabel,
  width,
  height,
  gradientId,
  viewBox,
  renderPaths,
}) => {
  const fill = `url(#${gradientId})`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={viewBox}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#18c8ff" />
          <stop offset="45%" stopColor="#21e6c1" />
          <stop offset="100%" stopColor="#b7ff3f" />
        </linearGradient>
      </defs>
      {renderPaths(fill)}
    </svg>
  );
};
