import React from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isScrollingDisabled } from '../../../ducks/ui.duck';

import { Page, NamedLink } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';
import PeakUpHqShell from '../PeakUpHqShell';
import PeakUpHqIcon from '../PeakUpHqIcons';
import { PEAKUP_HQ_SECTIONS } from '../peakUpHqContent';

import sportTheme from '../../SportPagesTheme.module.css';
import css from './PeakUpHqDashboardPage.module.css';

const PeakUpHqDashboardPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const title = intl.formatMessage(
    { id: 'PeakUpHq.schemaTitle' },
    { marketplaceName: config.marketplaceName }
  );

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <PeakUpHqAdminGate>
        <TopbarContainer currentPage="PeakUpHQPage" chromeTheme="sportPremium" />

        <main className={css.main}>
          <div className={css.rail}>
            <PeakUpHqShell activeSectionId="dashboard">
              <ul className={css.grid}>
                {PEAKUP_HQ_SECTIONS.map(section => (
                  <li key={section.id}>
                    <NamedLink
                      name={section.routeName}
                      className={css.cardLink}
                    >
                      <article className={css.card}>
                        <span className={css.cardIcon} aria-hidden="true">
                          <PeakUpHqIcon name={section.icon} className={css.cardIconSvg} />
                        </span>
                        <h2 className={css.cardTitle}>
                          <FormattedMessage id={section.titleId} />
                        </h2>
                        <p className={css.cardDescription}>
                          <FormattedMessage id={section.descriptionId} />
                        </p>
                        <span
                          className={classNames(
                            css.cardMeta,
                            !section.live && css.cardMetaMuted
                          )}
                        >
                          {section.live ? (
                            <FormattedMessage id="PeakUpHq.cardOpen" />
                          ) : (
                            <FormattedMessage id="PeakUpHq.comingSoon" />
                          )}
                        </span>
                      </article>
                    </NamedLink>
                  </li>
                ))}
              </ul>
            </PeakUpHqShell>
          </div>
        </main>

        <FooterContainer />
      </PeakUpHqAdminGate>
    </Page>
  );
};

export default PeakUpHqDashboardPage;
