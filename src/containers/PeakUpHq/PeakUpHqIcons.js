import React from 'react';

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const ICONS = {
  hq: (
    <svg {...iconProps}>
      <path {...stroke} d="M12 3 4 9v12h6v-7h4v7h6V9l-8-6Z" />
      <path {...stroke} d="M9 21V12h6v9" />
    </svg>
  ),
  applications: (
    <svg {...iconProps}>
      <path {...stroke} d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
    </svg>
  ),
  featured: (
    <svg {...iconProps}>
      <path {...stroke} d="M12 3 14.5 9H21l-5.5 4 2 6L12 15l-5.5 4 2-6L3 9h6.5L12 3Z" />
    </svg>
  ),
  cancellations: (
    <svg {...iconProps}>
      <circle {...stroke} cx="12" cy="12" r="8" />
      <path {...stroke} d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  ambassadors: (
    <svg {...iconProps}>
      <circle {...stroke} cx="12" cy="8" r="3.5" />
      <path {...stroke} d="M5 20c.8-3.2 3-5 7-5s6.2 1.8 7 5" />
      <path {...stroke} d="M18 7.5 20 6M18 10.5 20.5 11" />
    </svg>
  ),
  verification: (
    <svg {...iconProps}>
      <path {...stroke} d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path {...stroke} d="m9.5 12 1.8 1.8L15 10" />
    </svg>
  ),
  reports: (
    <svg {...iconProps}>
      <path {...stroke} d="M5 19V5M5 19h14" />
      <path {...stroke} d="M9 15V9M13 15V7M17 15v-4" />
    </svg>
  ),
  payments: (
    <svg {...iconProps}>
      <rect {...stroke} x="3" y="6" width="18" height="12" rx="2" />
      <path {...stroke} d="M3 10h18M7 15h4" />
    </svg>
  ),
  activity: (
    <svg {...iconProps}>
      <path {...stroke} d="M4 18h16M6 14l3-4 3 3 5-7 2 3" />
    </svg>
  ),
  dashboard: (
    <svg {...iconProps}>
      <rect {...stroke} x="4" y="4" width="7" height="7" rx="1.2" />
      <rect {...stroke} x="13" y="4" width="7" height="7" rx="1.2" />
      <rect {...stroke} x="4" y="13" width="7" height="7" rx="1.2" />
      <rect {...stroke} x="13" y="13" width="7" height="7" rx="1.2" />
    </svg>
  ),
};

/**
 * @param {{ name: string, className?: string }} props
 */
const PeakUpHqIcon = ({ name, className }) => {
  const icon = ICONS[name] || ICONS.hq;
  return <span className={className}>{icon}</span>;
};

export default PeakUpHqIcon;
