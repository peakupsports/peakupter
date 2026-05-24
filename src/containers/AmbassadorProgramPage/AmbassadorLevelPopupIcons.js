import React from 'react';

const svgProps = {
  fill: 'none',
  'aria-hidden': true,
  focusable: 'false',
};

const STROKE = 1.9;
const ROUND = { strokeLinecap: 'round', strokeLinejoin: 'round' };
const FILL = 'currentColor';

export const CriteriaReviewsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.4l2 4 4.2.6-3 3 .7 4.2L8 11.6 4.1 14.2l.7-4.2-3-3 4.2-.6L8 2.4z"
      fill={FILL}
      fillOpacity="0.32"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
  </svg>
);

export const CriteriaSessionsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <rect
      x="2.4"
      y="4"
      width="11.2"
      height="9.2"
      rx="1.8"
      fill={FILL}
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth={STROKE}
    />
    <path
      d="M5 2.6v2.4M11 2.6v2.4M2.4 7.2h11.2M5.4 10.4l1.6 1.6 3.4-3.6"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
  </svg>
);

export const CriteriaResponseIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="8" cy="8" r="5.4" fill={FILL} fillOpacity="0.2" stroke="currentColor" strokeWidth={STROKE} />
    <path d="M8 4.8v3.8l2.6 1.6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    <circle cx="8" cy="8" r="0.9" fill="currentColor" />
  </svg>
);

export const CriteriaCancellationsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 3.2L13.6 12.4H2.4L8 3.2z"
      fill={FILL}
      fillOpacity="0.28"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <path d="M8 6.6v3" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    <circle cx="8" cy="11.6" r="0.85" fill="currentColor" />
  </svg>
);

export const CriteriaReferralsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="4.2" cy="5.2" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <circle cx="8" cy="4.8" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <circle cx="11.8" cy="5.2" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <path
      d="M1.4 13.2c.8-2 2.4-3 2.8-3s2 1 2.8 3M8.6 13.2c.8-2 2.4-3 2.8-3s2 1 2.8 3"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  </svg>
);

export const CriteriaProfileIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.2l5 2.4v4c0 2.6-1.9 4.6-5 5.4-3.1-.8-5-2.8-5-5.4V4.6L8 2.2z"
      fill={FILL}
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <path d="M5.8 8.2l1.5 1.5 3-3" stroke="currentColor" strokeWidth={STROKE} {...ROUND} />
  </svg>
);

export const BenefitCommissionIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="8" cy="8" r="5.4" fill={FILL} fillOpacity="0.26" stroke="currentColor" strokeWidth={STROKE} />
    <path
      d="M10.4 5.6a2.6 2.6 0 0 0-4 2c0 1.5 2 1.3 2 2.8a1.5 1.5 0 0 1-1.5 1.5M8 11.6v.6"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  </svg>
);

export const BenefitRocketIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.4c2 2.2 2.8 4.6 2.6 7.2L8 10.8l-2.6-1.2C5.2 6.8 6 4.4 8 2.4z"
      fill={FILL}
      fillOpacity="0.28"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <circle cx="8" cy="7" r="1.3" fill="currentColor" />
    <path d="M6 11.6l-1.4 2.2M10 11.6l1.4 2.2" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const BenefitCommunityIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="5.4" cy="5.8" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <circle cx="10.6" cy="5.8" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <path
      d="M2.2 13c1-2 2.4-3 3.2-3s2.2 1 3.2 3M8.6 13c1-2 2.4-3 3.2-3s2.2 1 3.2 3"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  </svg>
);

export const BenefitAnalyticsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <rect x="2.2" y="3.6" width="11.6" height="9.6" rx="1.6" fill={FILL} fillOpacity="0.18" stroke="currentColor" strokeWidth={STROKE} />
    <path
      d="M4.6 11V8.2M7.4 11V6.4M10.2 11V7.6M13 11V5"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
  </svg>
);

export const BenefitBadgeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="8" cy="8.4" r="4" fill={FILL} fillOpacity="0.3" stroke="currentColor" strokeWidth={STROKE} />
    <path d="M8 2v1.8M5.2 3.8l1.1 1.1M10.8 3.8l-1.1 1.1" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    <path d="M6 12.8l2 1.6 2-1.6" stroke="currentColor" strokeWidth={STROKE} {...ROUND} />
  </svg>
);

export const BenefitFeesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M4.8 2.8h5.4l2.6 2.6v7.2a1.4 1.4 0 0 1-1.4 1.4H4.8a1.4 1.4 0 0 1-1.4-1.4V4.2a1.4 1.4 0 0 1 1.4-1.4z"
      fill={FILL}
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <circle cx="6.4" cy="6.2" r="1" fill="currentColor" />
    <path d="M8.6 10.2l3.2-3.2" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const BenefitSupportIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M4.4 8.2a3.6 3.6 0 0 1 7.2 0"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
    <rect x="2.6" y="8" width="2.6" height="4" rx="1.2" fill={FILL} fillOpacity="0.28" stroke="currentColor" strokeWidth={STROKE} />
    <rect x="10.8" y="8" width="2.6" height="4" rx="1.2" fill={FILL} fillOpacity="0.28" stroke="currentColor" strokeWidth={STROKE} />
    <path d="M6 12.4h4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const BenefitVisibilityIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="8" cy="3" r="1.2" fill="currentColor" />
    <path
      d="M8 4l5.2 8.8H2.8L8 4z"
      fill={FILL}
      fillOpacity="0.26"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <path d="M2.2 13.6h11.6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
    <path d="M6.2 13.6v1.4M9.8 13.6v1.4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const BenefitVipIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M2.8 5.2l2.4 5.2 2.6-3.4 2.2 3.4 2.4-5.2h3.6L11 13.2H5L2.8 5.2z"
      fill={FILL}
      fillOpacity="0.28"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
  </svg>
);

export const BenefitEliteIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.2l2 3.6h4l-3.2 2.4 1.2 3.8L8 9.6l-4 2.4 1.2-3.8-3.2-2.4h4L8 2.2z"
      fill={FILL}
      fillOpacity="0.3"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
  </svg>
);

export const BenefitCollaborationIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="5.2" cy="5.4" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <circle cx="10.8" cy="5.4" r="2.2" fill={FILL} fillOpacity="0.24" stroke="currentColor" strokeWidth={STROKE} />
    <path
      d="M2.4 12.8c1-1.8 2.6-2.6 2.8-2.6M10.8 10.2c.2 0 1.8.8 2.8 2.6"
      stroke="currentColor"
      strokeWidth={STROKE}
      strokeLinecap="round"
    />
    <path d="M12 3.8l1.6 1.6M12 5.4l1.6-1.6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const RenewalShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.2l4.8 2.2v3.6c0 2.2-1.6 4.2-4.8 4.8-3.2-.6-4.8-2.6-4.8-4.8V4.4L8 2.2z"
      fill={FILL}
      fillOpacity="0.22"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <path d="M6 8l1.4 1.4 2.8-2.8" stroke="currentColor" strokeWidth={STROKE} {...ROUND} />
  </svg>
);

export const FutureGemIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M8 2.6l4.2 2.6L8 13.4 3.8 5.2 8 2.6z"
      fill={FILL}
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
  </svg>
);

export const FuturePartnerIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="4.4" cy="7.6" r="2.2" fill={FILL} fillOpacity="0.22" stroke="currentColor" strokeWidth={STROKE} />
    <circle cx="11.6" cy="7.6" r="2.2" fill={FILL} fillOpacity="0.22" stroke="currentColor" strokeWidth={STROKE} />
    <path d="M2.2 12.8c.8-1.8 2.2-2.6 2.2-2.6M11.6 10.2s1.4.8 2.2 2.6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const FutureMegaphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <path
      d="M3 6.8h3.2l4.2-2.6v8.4L6.2 9.8H3V6.8z"
      fill={FILL}
      fillOpacity="0.24"
      stroke="currentColor"
      strokeWidth={STROKE}
      {...ROUND}
    />
    <path d="M10.8 6.8c1 .8 1.6 1.6 1.6 2.6s-.6 1.8-1.6 2.6" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

export const InfoIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 16 16" {...svgProps}>
    <circle cx="8" cy="8" r="5.2" fill={FILL} fillOpacity="0.2" stroke="currentColor" strokeWidth={STROKE} />
    <path d="M8 7.2v4M8 5.2v.4" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
  </svg>
);

const CRITERIA_ICONS = {
  reviews: CriteriaReviewsIcon,
  sessions: CriteriaSessionsIcon,
  response: CriteriaResponseIcon,
  cancellations: CriteriaCancellationsIcon,
  referrals: CriteriaReferralsIcon,
  profile: CriteriaProfileIcon,
};

const BENEFIT_ICONS = {
  commission: BenefitCommissionIcon,
  rocket: BenefitRocketIcon,
  community: BenefitCommunityIcon,
  analytics: BenefitAnalyticsIcon,
  badge: BenefitBadgeIcon,
  fees: BenefitFeesIcon,
  support: BenefitSupportIcon,
  visibility: BenefitVisibilityIcon,
  vip: BenefitVipIcon,
  elite: BenefitEliteIcon,
  collaboration: BenefitCollaborationIcon,
};

const FUTURE_ICONS = {
  gem: FutureGemIcon,
  partner: FuturePartnerIcon,
  rocket: BenefitRocketIcon,
  megaphone: FutureMegaphoneIcon,
};

export const renderCriteriaIcon = (key, className) => {
  const Icon = CRITERIA_ICONS[key] || CriteriaProfileIcon;
  return <Icon className={className} />;
};

export const renderBenefitIcon = (iconKey, className) => {
  const Icon = BENEFIT_ICONS[iconKey] || BenefitBadgeIcon;
  return <Icon className={className} />;
};

export const renderFutureIcon = (iconKey, className) => {
  const Icon = FUTURE_ICONS[iconKey] || FutureGemIcon;
  return <Icon className={className} />;
};
