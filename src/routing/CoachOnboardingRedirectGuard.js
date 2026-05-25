import React, { useLayoutEffect, useState } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { ensureCurrentUser } from '../util/data';
import {
  isAuthSignupPathname,
  isCoachApplicationReturnPath,
  isVerifyEmailPathname,
  resolveCoachOnboardingRedirect,
} from '../util/coachOnboarding';

/**
 * Global backstop: verified coach applicants must not stay on customer-facing routes.
 * Redirect decision uses profile publicData only — not localStorage.
 */
const CoachOnboardingRedirectGuard = () => {
  const location = useLocation();
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const currentUser = useSelector(state => state.user?.currentUser);
  const verificationInProgress = useSelector(
    state => state.emailVerification?.verificationInProgress
  );
  const [ready, setReady] = useState(false);
  const [redirectPath, setRedirectPath] = useState(null);

  useLayoutEffect(() => {
    const user = ensureCurrentUser(currentUser);

    const emailVerified =
      isAuthenticated && user.id && user.attributes.emailVerified && user.attributes.pendingEmail == null;

    const authPageHandlesRedirect =
      isVerifyEmailPathname(location.pathname) ||
      isAuthSignupPathname(location.pathname) ||
      location.pathname === '/login';

    if (emailVerified && !authPageHandlesRedirect && !verificationInProgress) {
      const target = resolveCoachOnboardingRedirect({
        currentUser: user.id ? user : null,
      });
      const currentPath = `${location.pathname}${location.search || ''}`;
      const alreadyAtDestination = isCoachApplicationReturnPath(currentPath);

      if (target && !alreadyAtDestination) {
        // eslint-disable-next-line no-console
        console.log('[PeakUp Coach Redirect Triggered]', {
          source: 'CoachOnboardingRedirectGuard',
          from: currentPath,
          to: target,
        });
        setRedirectPath(target);
      } else {
        setRedirectPath(null);
      }
    } else {
      setRedirectPath(null);
    }

    setReady(true);
  }, [location, isAuthenticated, currentUser, verificationInProgress]);

  if (!ready || !redirectPath) {
    return null;
  }

  return <Redirect to={redirectPath} />;
};

export default CoachOnboardingRedirectGuard;
