import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { ensureCurrentUser } from '../util/data';
import {
  getVerifyEmailGateState,
  logVerifyEmailGateState,
  parseEmailVerificationTokenFromLocation,
} from '../util/coachOnboarding';

import AuthFlowBlankPage from './AuthFlowBlankPage';

/**
 * Prevents LandingPage from mounting during email verification and post-verify redirect.
 * Allows /verify-email route to mount so loadData can run verify API call.
 */
const VerifyEmailRedirectGate = ({ children }) => {
  const location = useLocation();
  const verifyInProgress = useSelector(state => state.emailVerification?.verificationInProgress);
  const verifySuccess = useSelector(state => state.emailVerification?.isVerified);
  const currentUser = useSelector(state => state.user?.currentUser);
  const currentUserFetchInProgress = useSelector(state => state.user?.currentUserFetchInProgress);
  const lastLogKeyRef = useRef('');

  const user = ensureCurrentUser(currentUser);
  const emailIsVerified = Boolean(
    user.id && user.attributes.emailVerified && user.attributes.pendingEmail == null
  );
  const verificationToken = parseEmailVerificationTokenFromLocation(location);

  const gateState = useMemo(
    () =>
      getVerifyEmailGateState({
        pathname: location.pathname,
        search: location.search,
        verifyInProgress,
        verifySuccess,
        emailIsVerified,
        verificationToken,
        currentUserFetchInProgress,
      }),
    [
      location.pathname,
      location.search,
      verifyInProgress,
      verifySuccess,
      emailIsVerified,
      verificationToken,
      currentUserFetchInProgress,
    ]
  );

  useLayoutEffect(() => {
    const logKey = [
      gateState.verifyInProgress,
      gateState.verifySuccess,
      gateState.target,
      location.pathname,
      gateState.shouldBlockRoutes,
    ].join('|');

    if (logKey !== lastLogKeyRef.current) {
      lastLogKeyRef.current = logKey;
      logVerifyEmailGateState(gateState, { pathname: location.pathname });
    }
  }, [gateState, location.pathname]);

  if (gateState.shouldBlockRoutes) {
    if (gateState.target) {
      return <Redirect to={gateState.target} />;
    }
    return <AuthFlowBlankPage />;
  }

  return children;
};

export default VerifyEmailRedirectGate;
