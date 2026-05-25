import React, { useLayoutEffect } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Redirect, withRouter } from 'react-router-dom';

import { FormattedMessage } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import { resolvePostVerifyRedirect } from '../../util/coachOnboarding';
import { verify } from '../../ducks/emailVerification.duck';

import AuthFlowBlankPage from '../../routing/AuthFlowBlankPage';
import EmailVerificationForm from './EmailVerificationForm/EmailVerificationForm';

import css from './EmailVerificationPage.module.css';

/**
  Parse verification token from URL

  Returns stringified token, if the token is provided.

  Returns `null` if verification token is not provided.

  Please note that we need to explicitely stringify the token, because
  the unwanted result of the `parse` method is that it automatically
  parses the token to number.
*/
const parseVerificationToken = search => {
  const urlParams = parse(search);
  const verificationToken = urlParams.t;

  if (verificationToken) {
    return `${verificationToken}`;
  }

  return null;
};

/**
 * The EmailVerificationPage component.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Function} props.submitVerification - The submit verification function
 * @param {boolean} props.emailVerificationInProgress - Whether the email verification is in progress
 * @param {propTypes.error} props.verificationError - The verification error
 * @param {Object} props.location - The location object
 * @param {string} props.location.search - The search object
 * @returns {JSX.Element} email verification page component
 */
export const EmailVerificationPageComponent = props => {
  const {
    currentUser,
    submitVerification,
    emailVerificationInProgress,
    verificationError,
    location,
    currentUserFetchInProgress,
  } = props;

  const verificationToken = parseVerificationToken(location ? location.search : null);
  const user = ensureCurrentUser(currentUser);

  useLayoutEffect(() => {
    if (verificationToken) {
      // eslint-disable-next-line no-console
      console.log('[PeakUp Verify Token Found]', { tokenLength: verificationToken.length });
    }
  }, [verificationToken]);

  const initialValues = {
    verificationToken,
  };
  const emailIsVerified =
    user.id && user.attributes.emailVerified && user.attributes.pendingEmail == null;

  const verificationPending =
    emailVerificationInProgress ||
    currentUserFetchInProgress ||
    (!!verificationToken && !emailIsVerified && !verificationError);

  if (emailIsVerified && !verificationPending) {
    return <Redirect to={resolvePostVerifyRedirect()} />;
  }

  if (verificationPending) {
    return <AuthFlowBlankPage />;
  }

  if (!user.id) {
    return <AuthFlowBlankPage />;
  }

  return (
    <div className={css.content}>
      <EmailVerificationForm
        initialValues={initialValues}
        onSubmit={submitVerification}
        currentUser={user}
        inProgress={emailVerificationInProgress}
        verificationError={verificationError}
      />
    </div>
  );
};

const mapStateToProps = state => {
  const { currentUser, currentUserFetchInProgress } = state.user;
  const { verificationError, verificationInProgress } = state.emailVerification;
  return {
    verificationError,
    emailVerificationInProgress: verificationInProgress,
    currentUserFetchInProgress,
    currentUser,
  };
};

const mapDispatchToProps = dispatch => ({
  submitVerification: ({ verificationToken }) => {
    return dispatch(verify(verificationToken));
  },
});

// Note: it is important that the withRouter HOC is **outside** the
// connect HOC, otherwise React Router won't rerender any Route
// components since connect implements a shouldComponentUpdate
// lifecycle hook.
//
// See: https://github.com/ReactTraining/react-router/issues/4671
const EmailVerificationPage = compose(
  withRouter,
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(EmailVerificationPageComponent);

export default EmailVerificationPage;
