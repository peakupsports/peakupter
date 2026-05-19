import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';

import {
  sendVerificationEmail,
  hasCurrentUserErrors,
  fetchCurrentUserNotifications,
} from '../../ducks/user.duck';
import { logout, authenticationInProgress } from '../../ducks/auth.duck';
import { manageDisableScrolling } from '../../ducks/ui.duck';

// Eager import: a lazy Topbar left the layout row at ~0px until the chunk loaded, so `<main>`
// (hero) started at the top of the viewport and then jumped down when the bar appeared (~1–2s).
import Topbar from './Topbar/Topbar';

/**
 * Topbar container component, which is connected to Redux Store.
 * @component
 * @param {Object} props
 * @param {number} props.notificationCount number of notifications
 * @param {Function} props.onLogout logout function
 * @param {Function} props.onManageDisableScrolling manage disable scrolling function
 * @param {Function} props.onResendVerificationEmail resend verification email function
 * @param {Object} props.sendVerificationEmailInProgress send verification email in progress
 * @param {Object} props.sendVerificationEmailError send verification email error
 * @param {boolean} props.hasGenericError has generic error
 * @returns {JSX.Element}
 */
export const TopbarContainerComponent = props => {
  const {
    notificationCount = 0,
    currentUserSaleNotificationCount = 0,
    currentUserOrderNotificationCount = 0,
    hasGenericError,
    ...rest
  } = props;

  return (
    <Topbar
      notificationCount={notificationCount}
      currentUserSaleNotificationCount={currentUserSaleNotificationCount}
      currentUserOrderNotificationCount={currentUserOrderNotificationCount}
      showGenericError={hasGenericError}
      {...rest}
    />
  );
};

const mapStateToProps = state => {
  // Topbar needs isAuthenticated and isLoggedInAs
  const { isAuthenticated, isLoggedInAs, logoutError, authScopes } = state.auth;
  // Topbar needs user info.
  const {
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    currentUserSaleNotificationCount = 0,
    currentUserOrderNotificationCount = 0,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
  } = state.user;
  const hasGenericError = !!(logoutError || hasCurrentUserErrors(state));
  return {
    authInProgress: authenticationInProgress(state),
    currentUser,
    currentUserHasListings,
    currentUserHasOrders,
    notificationCount: currentUserSaleNotificationCount + currentUserOrderNotificationCount,
    currentUserSaleNotificationCount,
    currentUserOrderNotificationCount,
    isAuthenticated,
    isLoggedInAs,
    authScopes,
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    hasGenericError,
  };
};

const mapDispatchToProps = dispatch => ({
  onLogout: historyPush => dispatch(logout(historyPush)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
  onResendVerificationEmail: () => dispatch(sendVerificationEmail()),
  onFetchCurrentUserNotifications: () => dispatch(fetchCurrentUserNotifications()),
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const TopbarContainer = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(TopbarContainerComponent);

export default TopbarContainer;
