import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { NamedLink } from '../../components';

import css from './InstructorsEarningsBanner.module.css';

/**
 * Pre-application earnings CTA on the 4_instructors Grow with PeakUp page.
 */
const InstructorsEarningsBanner = () => (
  <aside
    className={css.banner}
    data-instructors-earnings-banner
    aria-labelledby="instructors-earnings-banner-heading"
  >
    <div className={css.bannerTransition} aria-hidden="true" />
    <div className={css.bannerGlow} aria-hidden="true" />
    <div className={css.bannerInner}>
      <div className={css.bannerCopy}>
        <h2 id="instructors-earnings-banner-heading" className={css.bannerTitle}>
          <FormattedMessage id="InstructorsEarningsBanner.title" />
        </h2>
        <p className={css.bannerText}>
          <FormattedMessage id="InstructorsEarningsBanner.text" />
        </p>
      </div>
      <NamedLink name="CoachEarningsPage" className={classNames(css.bannerCta)}>
        <FormattedMessage id="InstructorsEarningsBanner.cta" />
      </NamedLink>
    </div>
  </aside>
);

export default InstructorsEarningsBanner;
