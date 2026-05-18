import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import css from './CustomerProfileHero.module.css';

/**
 * Compact welcome hero for customer profile dashboard only.
 */
const CustomerProfileHero = props => {
  const { displayName, isOwnProfile = false, className } = props;
  const firstName = displayName?.trim?.().split(/\s+/)?.[0] || displayName;

  return (
    <section className={classNames(css.root, className)} aria-label="Member dashboard">
      <div className={css.inner}>
        <div className={css.copy}>
          <p className={css.eyebrow}>
            <FormattedMessage id="ProfilePage.memberHeroEyebrow" />
          </p>
          <h2 className={css.title}>
            <FormattedMessage
              id={
                isOwnProfile
                  ? 'ProfilePage.memberWelcomeBack'
                  : 'ProfilePage.memberWelcomeMember'
              }
              values={{ name: firstName || '' }}
            />
          </h2>
          <p className={css.subtitle}>
            <FormattedMessage id="ProfilePage.memberHeroSubtitle" />
          </p>
        </div>
        <div className={css.visual} aria-hidden>
          <div className={css.mountainGlow} />
          <svg className={css.mountainSvg} viewBox="0 0 240 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="memberHeroMountain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(25, 223, 242, 0.12)" />
                <stop offset="100%" stopColor="rgba(25, 223, 242, 0.04)" />
              </linearGradient>
            </defs>
            <path
              d="M0 120 L60 52 L110 78 L160 28 L200 62 L240 44 L240 120 Z"
              fill="url(#memberHeroMountain)"
            />
            <path
              d="M0 120 L80 68 L140 92 L240 56 L240 120 Z"
              fill="rgba(8, 18, 32, 0.2)"
            />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default CustomerProfileHero;
