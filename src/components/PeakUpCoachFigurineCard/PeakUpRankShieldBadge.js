import React from 'react';
import classNames from 'classnames';

import css from './PeakUpCoachFigurineCard.module.css';

/** Public shield assets — compact crest only, no hanging ribbon. */
export const RANK_SHIELD_IMAGE_SRC = {
  1: '/CoachPagePic/Scudo_oro.jpg',
  2: '/CoachPagePic/Scudo_argento.jpg',
  3: '/CoachPagePic/Scudo_bronzo.jpg',
};

/**
 * Compact PeakUp ranking shield (ranks 1–3) — image asset, no ribbon.
 *
 * @param {Object} props
 * @param {1|2|3} props.rank
 * @param {string} props.tierClassName CSS module key (`medal_gold` | `medal_silver` | `medal_bronze`)
 * @param {string} props.ariaLabel accessible label
 */
const PeakUpRankShieldBadge = ({ rank, tierClassName, ariaLabel }) => {
  const src = RANK_SHIELD_IMAGE_SRC[rank];

  if (!src) {
    return null;
  }

  return (
    <span
      className={classNames(css.podiumMedal, css[tierClassName])}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <img
        className={css.podiumShieldImg}
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        draggable="false"
      />
    </span>
  );
};

export default PeakUpRankShieldBadge;
