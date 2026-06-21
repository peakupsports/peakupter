import React from 'react';
import classNames from 'classnames';

import css from './CoachEarningsDashboardIcons.module.css';

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
  wallet: (
    <svg {...iconProps}>
      <path
        {...stroke}
        d="M4 7.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
      />
      <path {...stroke} d="M4 9.5V7a2 2 0 0 1 2-2h10" />
      <path {...stroke} d="M15 13h5" />
      <circle cx="15.5" cy="13" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  ),
  payout: (
    <svg {...iconProps}>
      <rect {...stroke} x="3" y="5" width="18" height="14" rx="2" />
      <path {...stroke} d="M3 10h18" />
      <path {...stroke} d="M7 15h5" />
      <path {...stroke} d="M17 6V4M7 6V4" />
    </svg>
  ),
  calendar: (
    <svg {...iconProps}>
      <rect {...stroke} x="4" y="5" width="16" height="15" rx="2" />
      <path {...stroke} d="M8 3v4M16 3v4M4 10h16" />
      <path {...stroke} d="M8 14h2M11 14h2M14 14h2M8 17h2M11 17h2" />
    </svg>
  ),
  trophy: (
    <svg {...iconProps}>
      <path {...stroke} d="M8 21h8" />
      <path {...stroke} d="M12 17v4" />
      <path {...stroke} d="M7 4h10v4.5a5 5 0 0 1-10 0V4Z" />
      <path {...stroke} d="M5 4H4a1 1 0 0 0-1 1v.5a2.5 2.5 0 0 0 2.5 2.5M19 4h1a1 1 0 0 1 1 1v.5a2.5 2.5 0 0 1-2.5 2.5" />
    </svg>
  ),
  tier: (
    <svg {...iconProps}>
      <circle {...stroke} cx="12" cy="9" r="4" />
      <path {...stroke} d="M8.5 14 7 21h10l-1.5-7" />
      <path {...stroke} d="M9 7.5 10.5 10l2.5-3 2.5 3L17 7.5" />
    </svg>
  ),
  rewards: (
    <svg {...iconProps}>
      <path {...stroke} d="M12 3 14.5 9H21l-5.5 4 2 6L12 15l-5.5 4 2-6L3 9h6.5L12 3Z" />
    </svg>
  ),
  referrals: (
    <svg {...iconProps}>
      <circle {...stroke} cx="9" cy="9" r="2.75" />
      <circle {...stroke} cx="16.5" cy="10" r="2.25" />
      <path {...stroke} d="M4.5 19c.5-2.4 2.2-4 4.5-4s4 1.6 4.5 4" />
      <path {...stroke} d="M14.5 19c.35-1.8 1.6-3 3.5-3 1.2 0 2.2.45 2.9 1.2" />
    </svg>
  ),
  transactions: (
    <svg {...iconProps}>
      <path {...stroke} d="M8 4h8l2 3v13H6V4h2Z" />
      <path {...stroke} d="M8 4v3h8" />
      <path {...stroke} d="M9 12h6M9 15h4" />
    </svg>
  ),
};

/**
 * PeakUp stroke icons for the coach earnings dashboard stat cards.
 *
 * @param {{ name: keyof typeof ICONS, className?: string, rootClassName?: string }} props
 */
const CoachEarningsDashboardIcon = ({ name, className, rootClassName }) => {
  const icon = ICONS[name] || ICONS.wallet;

  return (
    <span className={classNames(css.root, rootClassName, className)} aria-hidden="true">
      {icon}
    </span>
  );
};

export default CoachEarningsDashboardIcon;
