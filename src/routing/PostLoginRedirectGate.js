import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { Redirect, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import { authenticationInProgress, clearPostLoginRedirectPending } from '../ducks/auth.duck';
import { setPlatformMode } from '../ducks/peakupPlatformMode.duck';
import { PLATFORM_MODE_COACH } from '../util/peakupPlatformMode';
import { getPostLoginRedirectState, logPostLoginGateState } from '../util/coachOnboarding';

import AuthFlowBlankPage from './AuthFlowBlankPage';

/**
 * Blocks route content (e.g. LandingPage) until post-login redirect completes.
 * Auth pages handle their own spinner/redirect UX.
 */
const PostLoginRedirectGate = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const postLoginRedirectPending = useSelector(state => state.auth?.postLoginRedirectPending);
  const authSettling = useSelector(state => authenticationInProgress(state));
  const currentUser = useSelector(state => state.user?.currentUser);
  const currentUserFetchInProgress = useSelector(state => state.user?.currentUserFetchInProgress);
  const lastLogKeyRef = useRef('');

  const redirectState = useMemo(
    () =>
      getPostLoginRedirectState({
        isAuthenticated,
        authSettling,
        postLoginRedirectPending,
        currentUserFetchInProgress,
        currentUser,
        location,
      }),
    [
      isAuthenticated,
      authSettling,
      postLoginRedirectPending,
      currentUserFetchInProgress,
      currentUser,
      location,
    ]
  );

  useLayoutEffect(() => {
    const logKey = [
      postLoginRedirectPending,
      authSettling,
      isAuthenticated,
      redirectState.currentUserLoaded,
      redirectState.profileReady,
      redirectState.target,
      location.pathname,
      redirectState.shouldBlockRoutes,
      redirectState.redirectDecisionComplete,
    ].join('|');

    if (logKey !== lastLogKeyRef.current) {
      lastLogKeyRef.current = logKey;
      logPostLoginGateState(redirectState, {
        postLoginRedirectPending,
        authInProgress: authSettling,
        isAuthenticated,
        pathname: location.pathname,
      });
    }

    if (redirectState.redirectDecisionComplete && postLoginRedirectPending) {
      if (redirectState.target === '/coach-dashboard') {
        dispatch(setPlatformMode(PLATFORM_MODE_COACH));
      }
      dispatch(clearPostLoginRedirectPending());
    }
  }, [
    authSettling,
    dispatch,
    isAuthenticated,
    location.pathname,
    postLoginRedirectPending,
    redirectState,
  ]);

  if (redirectState.shouldBlockRoutes) {
    if (redirectState.target && !redirectState.atTarget) {
      return <Redirect to={redirectState.target} />;
    }
    return <AuthFlowBlankPage />;
  }

  return children;
};

export default PostLoginRedirectGate;
