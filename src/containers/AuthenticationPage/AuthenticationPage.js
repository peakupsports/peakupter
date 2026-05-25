import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Redirect } from 'react-router-dom';
import Cookies from 'js-cookie';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { camelize } from '../../util/string';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { ensureCurrentUser, getFeaturedListingsProps } from '../../util/data';
import {
  getAuthErrorMessage,
  getSignupErrorMessage,
  isSignupEmailTakenError,
  isTooManyEmailVerificationRequestsError,
} from '../../util/errors';

import { login, authenticationInProgress, signup, signupWithIdp } from '../../ducks/auth.duck';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';
import { sendVerificationEmail } from '../../ducks/user.duck';
import { fetchFeaturedListings } from '../../ducks/featuredListings.duck';
import { getListingsById } from '../../ducks/marketplaceData.duck';

import {
  Page,
  Heading,
  IconSpinner,
  NamedLink,
  NamedRedirect,
  LinkTabNavHorizontal,
  ResponsiveBackgroundImageContainer,
  Modal,
  LayoutSingleColumn,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';
// We need to get ToS asset and get it rendered for the modal on this page.
import { TermsOfServiceContent } from '../../containers/TermsOfServicePage/TermsOfServicePage';
// We need to get PrivacyPolicy asset and get it rendered for the modal on this page.
import { PrivacyPolicyContent } from '../../containers/PrivacyPolicyPage/PrivacyPolicyPage';
import NotFoundPage from '../../containers/NotFoundPage/NotFoundPage';

import {
  getAuthInfoFromCookies,
  getAuthErrorFromCookies,
  getHandleSubmitConfirm,
  getHandleSubmitSignup,
} from './AuthenticationPage.helpers';

import {
  filterCoachOnboardingUserTypes,
  getCustomerUserTypeForCoachSignup,
  getCoachOnboardingStoredReferralCode,
  hasCoachOnboardingUrlSignal,
  isCoachOnboardingQueryActive,
  isCoachOnboardingReturn,
  isCoachProviderSignupUserType,
  parseReferralCodeFromLocation,
  parseReferralCodeFromPath,
  buildCoachSignupAuthSearch,
  buildCoachOnboardingProfilePublicData,
  resolvePostLoginRedirect,
  syncCoachOnboardingIntent,
} from '../../util/coachOnboarding';

import TermsAndConditions from './TermsAndConditions/TermsAndConditions';
import ConfirmSignupForm from './ConfirmSignupForm/ConfirmSignupForm';
import LoginForm from './LoginForm/LoginForm';
import SignupForm from './SignupForm/SignupForm';
import EmailVerificationInfo from './EmailVerificationInfo';
import SocialLoginButtons from './SocialLoginButtons/SocialLoginButtons';

import { TOS_ASSET_NAME, PRIVACY_POLICY_ASSET_NAME } from './AuthenticationPage.duck';

import css from './AuthenticationPage.module.css';

const getTabHeading = ({ messageId, isSelected }) => {
  return (
    <Heading as={isSelected ? 'h1' : 'h2'} rootClassName={css.tab}>
      <FormattedMessage id={messageId} />
    </Heading>
  );
};

const getAuthenticationTabs = ({ isLogin, signupRouteName, userTypeMaybe, fromState }) => {
  return [
    {
      text: getTabHeading({
        messageId: 'AuthenticationPage.signupLinkText',
        isSelected: !isLogin,
      }),
      selected: !isLogin,
      linkProps: {
        name: signupRouteName,
        params: userTypeMaybe,
        to: fromState,
      },
    },
    {
      text: getTabHeading({
        messageId: 'AuthenticationPage.loginLinkText',
        isSelected: isLogin,
      }),
      selected: isLogin,
      linkProps: {
        name: 'LoginPage',
        to: fromState,
      },
    },
  ];
};

const AuthenticationFormErrorMessage = props => {
  const { isLogin, idpAuthError, loginError, signupError } = props;

  if (isLogin && loginError) {
    return <div className={css.error}>{loginError}</div>;
  }

  if (!isLogin && signupError) {
    if (isSignupEmailTakenError(signupError)) {
      return (
        <div className={css.error}>
          <FormattedMessage id="AuthenticationPage.signupFailedEmailAlreadyTaken" />
        </div>
      );
    }

    const readableError = getSignupErrorMessage(signupError);
    return (
      <div className={css.error}>
        <FormattedMessage id="AuthenticationPage.signupFailed" />
        {readableError ? <div className={css.errorDetail}>{readableError}</div> : null}
      </div>
    );
  }

  const translationId = isLogin && !!idpAuthError ? 'AuthenticationPage.idpAuthFailed' : null;

  return translationId ? (
    <div className={css.error}>
      <FormattedMessage id={translationId} />
    </div>
  ) : null;
};

const ResendVerificationErrorMessage = props => {
  const { sendVerificationEmailError } = props;

  const resendErrorTranslationId = isTooManyEmailVerificationRequestsError(
    sendVerificationEmailError
  )
    ? 'AuthenticationPage.resendFailedTooManyRequests'
    : 'AuthenticationPage.resendFailed';

  return sendVerificationEmailError ? (
    <p className={css.error}>
      <FormattedMessage id={resendErrorTranslationId} />
    </p>
  ) : null;
};

const BlankPage = props => {
  const { schemaTitle, schemaDescription, scrollingDisabled, topbarClasses } = props;
  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn
        topbar={<TopbarContainer className={topbarClasses} />}
        footer={<FooterContainer />}
      >
        <div className={css.spinnerContainer}>
          <IconSpinner />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

/**
 * The AuthenticationPage component.
 *
 * @component
 * @param {Object} props
 * @param {boolean} props.authInProgress - Whether the authentication is in progress
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {propTypes.error} props.loginError - The login error
 * @param {propTypes.error} props.signupError - The signup error
 * @param {propTypes.error} props.confirmError - The confirm error
 * @param {Function} props.submitLogin - The login submit function
 * @param {Function} props.submitSignup - The signup submit function
 * @param {Function} props.submitSingupWithIdp - The signup with IdP submit function
 * @param {'login' | 'signup'| 'confirm'} props.tab - The tab to render
 * @param {boolean} props.sendVerificationEmailInProgress - Whether the verification email is in progress
 * @param {propTypes.error} props.sendVerificationEmailError - The verification email error
 * @param {Function} props.onResendVerificationEmail - The resend verification email function
 * @param {Function} props.onManageDisableScrolling - The manage disable scrolling function
 * @param {object} props.privacyAssetsData - The privacy assets data
 * @param {boolean} props.privacyFetchInProgress - Whether the privacy fetch is in progress
 * @param {propTypes.error} props.privacyFetchError - The privacy fetch error
 * @param {object} props.tosAssetsData - The terms of service assets data
 * @param {boolean} props.tosFetchInProgress - Whether the terms of service fetch is in progress
 * @param {propTypes.error} props.tosFetchError - The terms of service fetch error
 * @param {object} props.location - The location object
 * @param {object} props.params - The path parameters
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {object} props.pageAssetsData - The page assets data
 * @param {boolean} props.pageAssetsFetchInProgress - Whether the page assets fetch is in progress
 * @param {propTypes.error} props.pageAssetsFetchError - The page assets fetch error
 * @param {object} props.featuredListingData - The featured listing data
 * @param {Function} props.getListingEntitiesById - The get listing entities by id function
 * @param {Function} props.onFetchFeaturedListings - The on fetch featured listings function
 * @param {object} props.staticContext - The static context
 * @returns {JSX.Element}
 */
export const AuthenticationPageComponent = props => {
  const [tosModalOpen, setTosModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [authInfo, setAuthInfo] = useState(getAuthInfoFromCookies());
  const cookieAuthError = getAuthErrorFromCookies();
  const [authError, setAuthError] = useState(
    cookieAuthError ? getAuthErrorMessage(cookieAuthError) : null
  );
  const [mounted, setMounted] = useState(false);

  const config = useConfiguration();
  const intl = useIntl();

  const {
    authInProgress,
    currentUser,
    isAuthenticated,
    location,
    params: pathParams,
    loginError,
    scrollingDisabled,
    signupError,
    confirmError,
    submitLogin,
    submitSignup,
    submitSingupWithIdp,
    tab = 'signup',
    sendVerificationEmailInProgress,
    sendVerificationEmailError,
    onResendVerificationEmail,
    onManageDisableScrolling,
    pageAssetsData,
    pageAssetsFetchInProgress,
    pageAssetsFetchError,
    staticContext,
  } = props;

  const locationFrom = location.state?.from || null;
  const authinfoFrom = authInfo?.from || null;
  const from = locationFrom || authinfoFrom || null;

  useLayoutEffect(() => {
    if (authError) {
      Cookies.remove('st-autherror');
    }
    const userForSync = ensureCurrentUser(currentUser);
    syncCoachOnboardingIntent({
      location,
      from,
      pathname: location.pathname,
      currentUser: userForSync.id ? userForSync : null,
    });
    setMounted(true);
  }, [authError, location, from, currentUser]);

  const user = ensureCurrentUser(currentUser);
  const currentUserLoaded = !!user.id;

  // On mobile, it's better to scroll to top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tosModalOpen, privacyModalOpen]);

  // History API has potentially state tied to this route
  // We have used that state to store previous URL ("from"),
  // so that use can be redirected back to that page after authentication.
  const idp = authInfo ? authInfo.idpId.replace(/^./, str => str.toUpperCase()) : null;

  const isConfirm = tab === 'confirm';
  const isLogin = tab === 'login';
  const userTypeInPushState = location.state?.userType || null;
  const userTypeInAuthInfo = isConfirm && authInfo?.userType ? authInfo?.userType : null;
  const userType = pathParams?.userType || userTypeInPushState || userTypeInAuthInfo || null;

  if (!isLogin && isCoachProviderSignupUserType(userType)) {
    const ref = parseReferralCodeFromLocation(location);
    return (
      <Redirect
        to={{
          pathname: '/coach-signup',
          search: ref ? `?ref=${encodeURIComponent(ref)}` : '',
        }}
      />
    );
  }

  const { userTypes = [], userFields = [] } = config.user;
  const isCoachOnboardingFlow =
    isCoachOnboardingReturn(from) || isCoachOnboardingQueryActive(location.search);
  const onboardingUserTypes = isCoachOnboardingFlow
    ? filterCoachOnboardingUserTypes(userTypes)
    : userTypes;
  const coachOnboardingUserType = isCoachOnboardingFlow
    ? getCustomerUserTypeForCoachSignup(userTypes)
    : null;
  const preselectedUserType =
    coachOnboardingUserType ||
    userTypes.find(conf => conf.userType === userType)?.userType ||
    null;
  const signupRouteName = isCoachOnboardingFlow
    ? 'SignupPage'
    : !!preselectedUserType
    ? 'SignupForUserTypePage'
    : 'SignupPage';
  const userTypeMaybe = preselectedUserType ? { userType: preselectedUserType } : {};
  const fromMaybe = from ? { from } : {};
  const coachSignupRef =
    parseReferralCodeFromLocation(location) ||
    parseReferralCodeFromPath(typeof from === 'string' ? from : '') ||
    getCoachOnboardingStoredReferralCode();
  const preserveCoachSearch =
    isCoachOnboardingFlow ||
    isCoachOnboardingQueryActive(location.search) ||
    hasCoachOnboardingUrlSignal({ location, from });
  const coachSearch =
    location.search ||
    (preserveCoachSearch ? buildCoachSignupAuthSearch({ ref: coachSignupRef }) : '');
  const fromState = {
    state: { ...fromMaybe, ...userTypeMaybe },
    ...(preserveCoachSearch && coachSearch ? { search: coachSearch } : {}),
  };
  const show404 = userType && !preselectedUserType;

  // We only want to show the email verification dialog in the signup
  // tab if the user isn't being redirected somewhere else
  // (i.e. `from` is present). We must also check the `emailVerified`
  // flag only when the current user is fully loaded.
  const showEmailVerification = !isLogin && currentUserLoaded && !user.attributes.emailVerified;

  useEffect(() => {
    if (!mounted || !isAuthenticated || !currentUserLoaded || !user.attributes.emailVerified) {
      return;
    }

    resolvePostLoginRedirect(user, { from });
  }, [mounted, isAuthenticated, currentUserLoaded, user, from]);

  const marketplaceName = config.marketplaceName;
  const schemaTitle = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.schemaTitleLogin' }, { marketplaceName })
    : intl.formatMessage({ id: 'AuthenticationPage.schemaTitleSignup' }, { marketplaceName });
  const schemaDescription = isLogin
    ? intl.formatMessage({ id: 'AuthenticationPage.schemaDescriptionLogin' }, { marketplaceName })
    : intl.formatMessage({ id: 'AuthenticationPage.schemaDescriptionSignup' }, { marketplaceName });
  const topbarClasses = classNames({
    [css.hideOnMobile]: showEmailVerification,
  });

  const postLoginRedirectTarget =
    mounted && currentUserLoaded && user.attributes.emailVerified
      ? resolvePostLoginRedirect(user, { from })
      : null;
  const shouldRedirectAfterAuth =
    isAuthenticated && currentUserLoaded && !showEmailVerification && postLoginRedirectTarget;
  if (
    !mounted &&
    isAuthenticated &&
    currentUserLoaded &&
    !showEmailVerification &&
    postLoginRedirectTarget
  ) {
    // Show a blank page for already authenticated users,
    // when the first rendering on client side is not yet done
    // This is done to avoid hydration issues when full page load is happening.
    return (
      <BlankPage
        schemaTitle={schemaTitle}
        schemaDescription={schemaDescription}
        topbarClasses={topbarClasses}
      />
    );
  }

  if (shouldRedirectAfterAuth) {
    return <Redirect to={postLoginRedirectTarget} />;
  } else if (show404) {
    // User type not found, show 404
    return <NotFoundPage staticContext={staticContext} />;
  }

  const termsAndConditions = (
    <TermsAndConditions
      onOpenTermsOfService={() => setTosModalOpen(true)}
      onOpenPrivacyPolicy={() => setPrivacyModalOpen(true)}
      intl={intl}
    />
  );
  const signupLinkText = intl.formatMessage({ id: 'AuthenticationPage.signupLinkText' });
  const loginLinkText = intl.formatMessage({ id: 'AuthenticationPage.loginLinkText' });

  // There are three different scenarios to handle on this page:
  //   - Normal authentication (login/signup + SSO options)
  //   - Confirm step after SSO
  //   - Email verification information after signup
  // The rendering priority is actually: Email verification > Confirm form for SSO > Normal authentication form
  // But the order of components in the JSX is reversed to follow the user flow through the authentication process.
  // Note: the confirm form for SSO is a step after user has been authenticated with an external provider (e.g. Facebook)
  // We collect data from user in this step. (Things that are not available from the external provider.)
  const showConfirmFormForSSO = !showEmailVerification && isConfirm;
  const showAuthenticationForm = !showEmailVerification && !isConfirm;
  const showLoginForm = showAuthenticationForm && isLogin;

  return (
    <Page
      className={css.peakUpAuthPage}
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'WebPage',
        name: schemaTitle,
        description: schemaDescription,
      }}
    >
      <LayoutSingleColumn
        mainColumnClassName={css.layoutWrapperMain}
        topbar={<TopbarContainer className={topbarClasses} />}
        footer={<FooterContainer />}
      >
        <ResponsiveBackgroundImageContainer
          className={css.root}
          childrenWrapperClassName={css.contentContainer}
          as="section"
          image={config.branding.brandImage}
          sizes="100%"
          useOverlay
        >
          {showAuthenticationForm ? (
            <div className={css.content}>
              <LinkTabNavHorizontal
                className={css.tabs}
                tabs={getAuthenticationTabs({
                  isLogin,
                  signupRouteName,
                  userTypeMaybe,
                  fromState,
                })}
                ariaLabel={`${signupLinkText} & ${loginLinkText}`}
              />

              <AuthenticationFormErrorMessage
                isLogin={isLogin}
                idpAuthError={authError}
                loginError={loginError}
                signupError={signupError}
              />

              {showLoginForm ? (
                <LoginForm
                  className={css.loginForm}
                  onSubmit={submitLogin}
                  inProgress={authInProgress}
                />
              ) : (
                <>
                  <div className={css.signupChoice}>
                    <p className={css.signupChoiceTitle}>
                      <FormattedMessage id="AuthenticationPage.signupChoiceTitle" />
                    </p>
                    <p className={css.signupChoiceSubtitle}>
                      <FormattedMessage id="AuthenticationPage.signupChoiceSubtitle" />
                    </p>
                    <NamedLink
                      className={css.signupChoiceCoach}
                      name="CoachSignupPage"
                      to={{
                        search: parseReferralCodeFromLocation(location)
                          ? `?ref=${encodeURIComponent(parseReferralCodeFromLocation(location))}`
                          : '',
                      }}
                    >
                      <span className={css.signupChoiceCoachLabel}>
                        <FormattedMessage id="AuthenticationPage.signupChoiceCoach" />
                      </span>
                      <span className={css.signupChoiceCoachHint}>
                        <FormattedMessage id="AuthenticationPage.signupChoiceCoachHint" />
                      </span>
                    </NamedLink>
                    <div className={css.signupChoiceDivider} role="separator">
                      <span>
                        <FormattedMessage id="AuthenticationPage.signupChoiceDivider" />
                      </span>
                    </div>
                    <p className={css.signupChoiceClientLabel}>
                      <FormattedMessage id="AuthenticationPage.signupChoiceClient" />
                    </p>
                    <p className={css.signupChoiceClientHint}>
                      <FormattedMessage id="AuthenticationPage.signupChoiceClientHint" />
                    </p>
                  </div>
                  <SignupForm
                    className={css.signupForm}
                    onSubmit={getHandleSubmitSignup({
                      submitSignup,
                      userFields,
                      ...(isCoachOnboardingFlow
                        ? {
                            coachOnboardingPublicData: buildCoachOnboardingProfilePublicData({
                              ref: coachSignupRef,
                            }),
                          }
                        : {}),
                    })}
                    inProgress={authInProgress}
                    termsAndConditions={termsAndConditions}
                    preselectedUserType={preselectedUserType}
                    userTypes={onboardingUserTypes}
                    userFields={userFields}
                  />
                </>
              )}

              <SocialLoginButtons
                isLogin={isLogin}
                showFacebookLogin={!!process.env.REACT_APP_FACEBOOK_APP_ID}
                showGoogleLogin={!!process.env.REACT_APP_GOOGLE_CLIENT_ID}
                {...fromMaybe}
                {...(isCoachOnboardingFlow ? {} : userTypeMaybe)}
              />
            </div>
          ) : null}

          {showConfirmFormForSSO ? (
            <div className={css.content}>
              <Heading as="h1" rootClassName={css.signupWithIdpTitle}>
                <FormattedMessage
                  id="AuthenticationPage.confirmSignupWithIdpTitle"
                  values={{ idp }}
                />
              </Heading>

              <p className={css.confirmInfoText}>
                <FormattedMessage id="AuthenticationPage.confirmSignupInfoText" />
              </p>
              <AuthenticationFormErrorMessage
                isLogin={false}
                idpAuthError={null}
                loginError={null}
                signupError={confirmError}
              />
              <ConfirmSignupForm
                className={css.form}
                inProgress={authInProgress}
                onSubmit={getHandleSubmitConfirm({
                  authInfo,
                  submitSingupWithIdp,
                  userFields,
                })}
                termsAndConditions={termsAndConditions}
                authInfo={authInfo}
                idp={idp}
                preselectedUserType={preselectedUserType}
                userTypes={onboardingUserTypes}
                userFields={userFields}
              />
            </div>
          ) : null}

          {showEmailVerification ? (
            <EmailVerificationInfo
              name={user.attributes.profile.firstName}
              email={<span className={css.email}>{user.attributes.email}</span>}
              onResendVerificationEmail={onResendVerificationEmail}
              resendErrorMessage={
                <ResendVerificationErrorMessage
                  sendVerificationEmailError={sendVerificationEmailError}
                />
              }
              sendVerificationEmailInProgress={sendVerificationEmailInProgress}
            />
          ) : null}
        </ResponsiveBackgroundImageContainer>
      </LayoutSingleColumn>
      <Modal
        id="AuthenticationPage.tos"
        isOpen={tosModalOpen}
        onClose={() => setTosModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={'terms-accepted.tos-and-privacy'}
      >
        <div className={css.termsWrapper} role="complementary">
          <TermsOfServiceContent
            inProgress={pageAssetsFetchInProgress}
            error={pageAssetsFetchError}
            data={pageAssetsData?.[camelize(TOS_ASSET_NAME)]?.data}
            featuredListings={getFeaturedListingsProps(camelize(PRIVACY_POLICY_ASSET_NAME), props)}
            isOpen={tosModalOpen}
          />
        </div>
      </Modal>
      <Modal
        id="AuthenticationPage.privacyPolicy"
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={'terms-accepted.tos-and-privacy'}
      >
        <div className={css.privacyWrapper} role="complementary">
          <PrivacyPolicyContent
            inProgress={pageAssetsFetchInProgress}
            error={pageAssetsFetchError}
            data={pageAssetsData?.[camelize(PRIVACY_POLICY_ASSET_NAME)]?.data}
            featuredListings={getFeaturedListingsProps(camelize(PRIVACY_POLICY_ASSET_NAME), props)}
            isOpen={privacyModalOpen}
          />
        </div>
      </Modal>
    </Page>
  );
};

/**
 * The AuthenticationPage "container" component.
 * This component handles props (state and dispatch actions) and passes them to the AuthenticationPageComponent.
 *
 * @component
 * @param {Object} props from the router (routeConfiguration.js and Routes.js).
 * @returns {JSX.Element}
 */
const AuthenticationPage = props => {
  const dispatch = useDispatch();

  const authInProgress = useSelector(state => authenticationInProgress(state));
  const currentUser = useSelector(state => state.user?.currentUser);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);
  const loginError = useSelector(state => state.auth?.loginError);
  const signupError = useSelector(state => state.auth?.signupError);
  const confirmError = useSelector(state => state.auth?.confirmError);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const sendVerificationEmailInProgress = useSelector(
    state => state.user?.sendVerificationEmailInProgress
  );
  const sendVerificationEmailError = useSelector(state => state.user?.sendVerificationEmailError);

  const hostedAssets = useSelector(state => state.hostedAssets || {});
  const pageAssetsData = hostedAssets.pageAssetsData;
  const pageAssetsFetchInProgress = hostedAssets.inProgress;
  const pageAssetsFetchError = hostedAssets.error;

  const featuredListingData = useSelector(state => state.featuredListings || {});
  const entities = useSelector(state => state.marketplaceData?.entities || {});

  const getListingEntitiesById = useCallback(
    listingIds => getListingsById({ marketplaceData: { entities } }, listingIds),
    [entities]
  );

  const submitLogin = useCallback(({ email, password }) => dispatch(login(email, password)), [
    dispatch,
  ]);
  const submitSignup = useCallback(params => dispatch(signup(params)), [dispatch]);
  const submitSingupWithIdp = useCallback(params => dispatch(signupWithIdp(params)), [dispatch]);
  const onResendVerificationEmail = useCallback(() => dispatch(sendVerificationEmail()), [
    dispatch,
  ]);
  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );
  const onFetchFeaturedListings = useCallback(
    (sectionId, parentPage, listingImageConfig, allSections) =>
      dispatch(fetchFeaturedListings({ sectionId, parentPage, listingImageConfig, allSections })),
    [dispatch]
  );

  return (
    <AuthenticationPageComponent
      {...props}
      authInProgress={authInProgress}
      currentUser={currentUser}
      isAuthenticated={isAuthenticated}
      loginError={loginError}
      scrollingDisabled={scrollingDisabled}
      signupError={signupError}
      confirmError={confirmError}
      submitLogin={submitLogin}
      submitSignup={submitSignup}
      submitSingupWithIdp={submitSingupWithIdp}
      sendVerificationEmailInProgress={sendVerificationEmailInProgress}
      sendVerificationEmailError={sendVerificationEmailError}
      onResendVerificationEmail={onResendVerificationEmail}
      onManageDisableScrolling={onManageDisableScrolling}
      pageAssetsData={pageAssetsData}
      pageAssetsFetchInProgress={pageAssetsFetchInProgress}
      pageAssetsFetchError={pageAssetsFetchError}
      featuredListingData={featuredListingData}
      getListingEntitiesById={getListingEntitiesById}
      onFetchFeaturedListings={onFetchFeaturedListings}
    />
  );
};

export default AuthenticationPage;
