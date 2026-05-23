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
import { getPeakUpHqSectionByRouteName } from '../peakUpHqContent';

import sportTheme from '../../SportPagesTheme.module.css';
import css from './PeakUpHqPlaceholderPage.module.css';

/**
 * @param {{ routeName: string }} props
 */
const PeakUpHqPlaceholderPage = ({ routeName }) => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));
  const section = getPeakUpHqSectionByRouteName(routeName);

  const title = intl.formatMessage(
    { id: 'PeakUpHq.schemaTitle' },
    { marketplaceName: config.marketplaceName }
  );

  if (!section) {
    return null;
  }

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <PeakUpHqAdminGate>
        <TopbarContainer currentPage={routeName} chromeTheme="sportPremium" />

        <main className={css.main}>
          <div className={css.rail}>
            <PeakUpHqShell activeSectionId={section.id} showHero={false}>
              <section className={css.panel}>
                <h2 className={css.panelTitle}>
                  <FormattedMessage id={section.titleId} />
                </h2>
                <p className={css.panelText}>
                  <FormattedMessage id="PeakUpHq.placeholderBody" />
                </p>
                <NamedLink name="PeakUpHQPage" className={css.backLink}>
                  <FormattedMessage id="PeakUpHq.backToOverview" />
                </NamedLink>
              </section>
            </PeakUpHqShell>
          </div>
        </main>

        <FooterContainer />
      </PeakUpHqAdminGate>
    </Page>
  );
};

export default PeakUpHqPlaceholderPage;
