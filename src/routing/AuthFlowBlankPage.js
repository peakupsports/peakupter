import React from 'react';

import { IconSpinner, LayoutSingleColumn, Page } from '../components';
import TopbarContainer from '../containers/TopbarContainer/TopbarContainer';

import css from './PostLoginRedirectBlankPage.module.css';

/**
 * Neutral spinner shell for auth / verify / post-login redirect flows.
 */
const AuthFlowBlankPage = () => (
  <Page scrollingDisabled={false}>
    <LayoutSingleColumn topbar={<TopbarContainer />}>
      <div className={css.spinnerWrap} aria-busy="true" aria-live="polite">
        <IconSpinner />
      </div>
    </LayoutSingleColumn>
  </Page>
);

export default AuthFlowBlankPage;
