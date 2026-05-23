import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../util/reactIntl';
import { NamedLink } from '../../components';
import PeakUpHqIcon from './PeakUpHqIcons';
import { PEAKUP_HQ_SECTIONS } from './peakUpHqContent';

import css from './PeakUpHqShell.module.css';

/**
 * Premium PeakUp HQ layout shell — sidebar navigation + content area.
 *
 * @param {Object} props
 * @param {string} props.activeSectionId section id from peakUpHqContent
 * @param {boolean} [props.showHero=true]
 * @param {React.ReactNode} props.children
 */
const PeakUpHqShell = props => {
  const { activeSectionId, showHero = true, children } = props;

  const isDashboard = activeSectionId === 'dashboard';

  return (
    <div className={css.shell}>
      <aside className={css.sidebar} aria-label="PeakUp HQ">
        <NamedLink name="PeakUpHQPage" className={css.brandLink}>
          <span className={css.brandIcon} aria-hidden="true">
            <PeakUpHqIcon name="hq" className={css.iconSvg} />
          </span>
          <span className={css.brandText}>
            <span className={css.brandTitle}>
              <FormattedMessage id="PeakUpHq.brandTitle" />
            </span>
            <span className={css.brandSubtitle}>
              <FormattedMessage id="PeakUpHq.brandSubtitle" />
            </span>
          </span>
        </NamedLink>

        <nav className={css.sideNav}>
          <ul className={css.sideNavList}>
            <li>
              <NamedLink
                name="PeakUpHQPage"
                className={classNames(css.sideNavLink, isDashboard && css.sideNavLinkActive)}
              >
                <PeakUpHqIcon name="hq" className={css.sideNavIcon} />
                <FormattedMessage id="PeakUpHq.nav.overview" />
              </NamedLink>
            </li>
            {PEAKUP_HQ_SECTIONS.map(section => {
              const isActive = activeSectionId === section.id;

              return (
                <li key={section.id}>
                  <NamedLink
                    name={section.routeName}
                    className={classNames(css.sideNavLink, isActive && css.sideNavLinkActive)}
                  >
                    <PeakUpHqIcon name={section.icon} className={css.sideNavIcon} />
                    <span className={css.sideNavLabel}>
                      <FormattedMessage id={section.titleId} />
                    </span>
                    {!section.live ? (
                      <span className={css.comingSoon}>
                        <FormattedMessage id="PeakUpHq.comingSoon" />
                      </span>
                    ) : null}
                  </NamedLink>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div className={css.main}>
        {showHero ? (
          <header className={css.hero}>
            <p className={css.accessLabel}>
              <FormattedMessage id="PeakUpHq.accessLabel" />
            </p>
            <h1 className={css.heroTitle}>
              <FormattedMessage id="PeakUpHq.heroTitle" />
            </h1>
            <p className={css.heroSubtitle}>
              <FormattedMessage id="PeakUpHq.heroSubtitle" />
            </p>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
};

export default PeakUpHqShell;
