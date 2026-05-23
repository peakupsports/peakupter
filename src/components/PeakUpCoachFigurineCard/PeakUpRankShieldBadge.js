import React, { useId } from 'react';
import classNames from 'classnames';

import css from './PeakUpCoachFigurineCard.module.css';

/**
 * Compact PeakUp ranking shield (ranks 1–3) — no hanging ribbon.
 *
 * @param {Object} props
 * @param {1|2|3} props.rank
 * @param {string} props.tierClassName CSS module key (`medal_gold` | `medal_silver` | `medal_bronze`)
 * @param {string} props.ariaLabel accessible label
 */
const PeakUpRankShieldBadge = ({ rank, tierClassName, ariaLabel }) => {
  const uid = useId().replace(/:/g, '');
  const fillId = `peakupShieldFill-${uid}`;
  const shineId = `peakupShieldShine-${uid}`;

  return (
    <span
      className={classNames(css.podiumMedal, css[tierClassName])}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg
        className={css.podiumShieldSvg}
        viewBox="0 0 64 78"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={fillId} x1="18%" y1="0%" x2="82%" y2="100%">
            <stop offset="0%" className={css.podiumShieldStopTop} />
            <stop offset="48%" className={css.podiumShieldStopMid} />
            <stop offset="100%" className={css.podiumShieldStopBottom} />
          </linearGradient>
          <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="38%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {/* Shield body — compact crest, no ribbon tail */}
        <path
          className={css.podiumShieldBody}
          d="M32 3.5 55.5 14.8V46.2c0 .8-.4 1.5-1.1 1.9L32 73.5 9.6 48.1c-.7-.4-1.1-1.1-1.1-1.9V14.8L32 3.5Z"
          fill={`url(#${fillId})`}
        />
        <path
          className={css.podiumShieldRim}
          d="M32 3.5 55.5 14.8V46.2c0 .8-.4 1.5-1.1 1.9L32 73.5 9.6 48.1c-.7-.4-1.1-1.1-1.1-1.9V14.8L32 3.5Z"
        />
        <path
          className={css.podiumShieldShine}
          d="M32 8 48 16.5V42.5L32 62 16 42.5V16.5L32 8Z"
          fill={`url(#${shineId})`}
        />

        {/* PeakUp mountain mark */}
        <path
          className={css.podiumShieldPeakMark}
          d="M32 18.5 39.5 30.5H24.5L32 18.5Z"
        />
      </svg>

      <span className={css.podiumShieldRank} aria-hidden="true">
        {rank}
      </span>
    </span>
  );
};

export default PeakUpRankShieldBadge;
