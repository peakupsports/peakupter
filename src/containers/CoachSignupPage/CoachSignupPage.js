import React, { useLayoutEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { ensureCurrentUser } from '../../util/data';
import {
  buildCoachApplicationPath,
  buildCoachSignupAuthSearch,
  captureAmbassadorRefFromEntry,
  coachOnboardingSignupTo,
} from '../../util/coachOnboarding';
import { pathByRouteName } from '../../util/routes';

import { IconSpinner, Page, LayoutSingleColumn } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import css from './CoachSignupPage.module.css';

/**
 * Coach onboarding entry — requires Sharetribe account before /coach-application.
 */
const CoachSignupPage = () => {
  const history = useHistory();
  const location = useLocation();
  const routeConfiguration = useRouteConfiguration();
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);

  useLayoutEffect(() => {
    const ref = captureAmbassadorRefFromEntry({
      location,
      source: 'CoachSignupPage',
    });
    const coachApplicationPath = buildCoachApplicationPath({ ref });
    const signupPath = pathByRouteName('SignupPage', routeConfiguration);

    if (!isAuthenticated) {
      history.replace({
        pathname: signupPath,
        search: buildCoachSignupAuthSearch({ ref }),
        ...coachOnboardingSignupTo({ ref }),
      });
      return;
    }

    const user = ensureCurrentUser(currentUser);
    if (!user.id) {
      return;
    }

    if (user.attributes.emailVerified) {
      history.replace(coachApplicationPath);
      return;
    }

    history.replace({
      pathname: signupPath,
      search: buildCoachSignupAuthSearch({ ref }),
      ...coachOnboardingSignupTo({ ref }),
    });
  }, [currentUser, history, isAuthenticated, location, routeConfiguration]);

  return (
    <Page scrollingDisabled={false}>
      <LayoutSingleColumn
        topbar={<TopbarContainer />}
        footer={<FooterContainer />}
      >
        <div className={css.spinnerWrap}>
          <IconSpinner />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default CoachSignupPage;
