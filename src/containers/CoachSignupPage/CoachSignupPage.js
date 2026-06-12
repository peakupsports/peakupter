import React, { useLayoutEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { ensureCurrentUser } from '../../util/data';
import {
  buildCoachApplicationPath,
  buildCoachSignupAuthSearch,
  captureAmbassadorRefFromEntry,
  coachOnboardingSignupTo,
} from '../../util/coachOnboarding';
import { pathByRouteName } from '../../util/routes';
import { repairCoachApplicantProfileThunk } from '../../ducks/auth.duck';

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
  const dispatch = useDispatch();
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
      dispatch(repairCoachApplicantProfileThunk({ ref })).finally(() => {
        history.replace(coachApplicationPath);
      });
      return;
    }

    history.replace({
      pathname: signupPath,
      search: buildCoachSignupAuthSearch({ ref }),
      ...coachOnboardingSignupTo({ ref }),
    });
  }, [currentUser, dispatch, history, isAuthenticated, location, routeConfiguration]);

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
