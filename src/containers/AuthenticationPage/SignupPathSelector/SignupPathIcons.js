import React from 'react';
import classNames from 'classnames';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.85,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/** Athlete / explorer — person outline */
const SignupPathClientIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable="false"
  >
    <circle cx="12" cy="8.5" r="3.25" {...stroke} />
    <path d="M6.5 20v-1.25c0-2.5 2.5-4.25 5.5-4.25s5.5 1.75 5.5 4.25V20" {...stroke} />
    <path d="M17 7.5 19.5 5M19.5 7.5H17" {...stroke} />
  </svg>
);

/** Instructor — whistle outline */
const SignupPathCoachIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable="false"
  >
    <path
      d="M9.5 10.5h5.2a1.8 1.8 0 0 1 1.8 1.8v.4a1.8 1.8 0 0 1-1.8 1.8H13l-1.2 3.2h-1.6L9.2 14.5H9.5a1.8 1.8 0 0 1-1.8-1.8v-.4a1.8 1.8 0 0 1 1.8-1.8z"
      {...stroke}
    />
    <path d="M15.2 10.5V8.6a3.2 3.2 0 0 0-6.4 0v1.9" {...stroke} />
    <path d="M5 19h14M9 19l3-6 3 6" {...stroke} />
  </svg>
);

/** Crew / academy — grouped athletes */
const SignupPathTeamIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    focusable="false"
  >
    <circle cx="9" cy="8.5" r="2.75" {...stroke} />
    <path d="M4.5 19.5v-1c0-2 2.25-3.5 4.5-3.5s4.5 1.5 4.5 3.5v1" {...stroke} />
    <circle cx="17" cy="9.5" r="2.35" {...stroke} />
    <path d="M13.25 19.5v-1c0-1.6 1.65-2.75 3.75-2.75s3.75 1.15 3.75 2.75v1" {...stroke} />
    <circle cx="5.25" cy="10.5" r="2" {...stroke} />
    <path d="M2.25 19.5v-1c0-1.4 1.35-2.5 3-2.5" {...stroke} />
  </svg>
);

const ICON_BY_VARIANT = {
  client: SignupPathClientIcon,
  coach: SignupPathCoachIcon,
  team: SignupPathTeamIcon,
};

/**
 * @param {Object} props
 * @param {'client'|'coach'|'team'} props.variant
 * @param {string} [props.className]
 */
const SignupPathIcon = ({ variant, className }) => {
  const Icon = ICON_BY_VARIANT[variant];
  if (!Icon) {
    return null;
  }
  return <Icon className={classNames(className)} />;
};

export default SignupPathIcon;
