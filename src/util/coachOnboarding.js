/**
 * Coach onboarding — signup/login must complete before /coach-application.
 * Provider user types cannot skip the application via /signup/:userType.
 */

export const COACH_PROVIDER_SIGNUP_USER_TYPES = new Set([
  'coach',
  'provider',
  'instructor',
  'seller',
]);

/**
 * @param {string|null|undefined} userType
 * @returns {boolean}
 */
export const isCoachProviderSignupUserType = userType =>
  COACH_PROVIDER_SIGNUP_USER_TYPES.has(String(userType || '').trim().toLowerCase());

/**
 * @param {string|null|undefined} path
 * @returns {boolean}
 */
export const isCoachApplicationReturnPath = path => {
  const normalized = String(path || '').trim();
  return normalized === '/coach-application' || normalized.startsWith('/coach-application?');
};

/**
 * @param {import('react-router-dom').Location|string|null|undefined} from
 * @returns {boolean}
 */
export const isCoachOnboardingReturn = from => {
  if (!from) {
    return false;
  }
  if (typeof from === 'string') {
    return isCoachApplicationReturnPath(from);
  }
  const pathname = from.pathname || '';
  return isCoachApplicationReturnPath(pathname);
};

/**
 * @param {string|null|undefined} search
 * @returns {string}
 */
export const parseReferralCodeFromSearch = search => {
  const ref = new URLSearchParams(String(search || '')).get('ref');
  return ref ? String(ref).trim() : '';
};

/**
 * @param {import('react-router-dom').Location} location
 * @returns {string}
 */
export const parseReferralCodeFromLocation = location =>
  parseReferralCodeFromSearch(location?.search);

/**
 * @param {{ ref?: string, pathname?: string }} [options]
 * @returns {string}
 */
export const buildCoachApplicationPath = ({ ref, pathname = '/coach-application' } = {}) => {
  const normalizedRef = String(ref || '').trim();
  if (!normalizedRef) {
    return pathname;
  }
  const params = new URLSearchParams();
  params.set('ref', normalizedRef);
  return `${pathname}?${params.toString()}`;
};

/**
 * TEMP: post-email-verification redirect while Coach Hub is under construction.
 * Replace with coach-hub route when ready; application flow stays in storage as returnPath.
 */
export const COACH_ONBOARDING_POST_VERIFY_REDIRECT_PATH = '/coaches';

/**
 * @param {{ ref?: string }} [options]
 * @returns {string}
 */
export const buildCoachOnboardingPostVerifyRedirectPath = ({ ref } = {}) =>
  buildCoachApplicationPath({ ref, pathname: COACH_ONBOARDING_POST_VERIFY_REDIRECT_PATH });

/**
 * @param {string|null|undefined} path
 * @returns {boolean}
 */
export const isCoachOnboardingPostVerifyReturnPath = path => {
  const normalized = String(path || '').trim();
  const pathname = normalized.split('?')[0];
  return pathname === COACH_ONBOARDING_POST_VERIFY_REDIRECT_PATH;
};

/**
 * @param {{ ref?: string }} [options]
 * @returns {string}
 */
export const buildCoachSignupEntryPath = ({ ref } = {}) =>
  buildCoachApplicationPath({ ref, pathname: '/coach-signup' });

/**
 * @param {{ ref?: string }} [options]
 * @returns {{ from: string }}
 */
export const buildCoachOnboardingAuthState = ({ ref } = {}) => ({
  from: buildCoachApplicationPath({ ref }),
});

/**
 * @param {{ ref?: string }} [options]
 * @returns {{ state: { from: string } }}
 */
export const coachOnboardingSignupTo = ({ ref } = {}) => ({
  state: buildCoachOnboardingAuthState({ ref }),
});

export const COACH_ONBOARDING_QUERY_PARAM = 'coachOnboarding';

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export const isAuthSignupPathname = pathname => {
  const normalized = String(pathname || '');
  return normalized === '/signup' || normalized.startsWith('/signup/');
};

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export const isVerifyEmailPathname = pathname => String(pathname || '') === '/verify-email';

/**
 * @param {string|null|undefined} search
 * @returns {string}
 */
export function parseEmailVerificationTokenFromSearch(search) {
  const token = new URLSearchParams(String(search || '')).get('t');
  return token ? String(token).trim() : '';
}

/**
 * @param {import('react-router-dom').Location|{ pathname?: string, search?: string }|null|undefined} location
 * @returns {string}
 */
export function parseEmailVerificationTokenFromLocation(location) {
  return parseEmailVerificationTokenFromSearch(location?.search);
}

/**
 * Email verification gate — block LandingPage during verify / post-verify redirect.
 *
 * @param {object} [options]
 * @param {string} [options.pathname]
 * @param {string} [options.search]
 * @param {boolean} [options.verifyInProgress]
 * @param {boolean} [options.verifySuccess]
 * @param {boolean} [options.emailIsVerified]
 * @param {string} [options.verificationToken]
 * @param {boolean} [options.currentUserFetchInProgress]
 * @returns {{
 *   shouldBlockRoutes: boolean,
 *   target: string|null,
 *   verifyInProgress: boolean,
 *   verifySuccess: boolean,
 *   redirectDecisionComplete: boolean,
 * }}
 */
export function getVerifyEmailGateState({
  pathname,
  search,
  verifyInProgress = false,
  verifySuccess = false,
  emailIsVerified = false,
  verificationToken = '',
  currentUserFetchInProgress = false,
} = {}) {
  const token = String(verificationToken || parseEmailVerificationTokenFromSearch(search)).trim();
  const onVerifyPath = isVerifyEmailPathname(pathname);
  const loginTarget = resolvePostVerifyRedirect();

  if (token && !onVerifyPath) {
    const params = new URLSearchParams({ t: token });
    return {
      shouldBlockRoutes: true,
      target: `/verify-email?${params.toString()}`,
      verifyInProgress: false,
      verifySuccess: false,
      redirectDecisionComplete: false,
    };
  }

  if (verifyInProgress && !onVerifyPath) {
    return {
      shouldBlockRoutes: true,
      target: null,
      verifyInProgress: true,
      verifySuccess: false,
      redirectDecisionComplete: false,
    };
  }

  if (!onVerifyPath) {
    return {
      shouldBlockRoutes: false,
      target: null,
      verifyInProgress: false,
      verifySuccess,
      redirectDecisionComplete: true,
    };
  }

  const verifyActive = verifyInProgress || (Boolean(token) && !emailIsVerified);
  const verifyCompleteReadyForLogin =
    emailIsVerified &&
    !verifyInProgress &&
    !currentUserFetchInProgress &&
    (verifySuccess || !token);

  if (verifyCompleteReadyForLogin) {
    return {
      shouldBlockRoutes: true,
      target: loginTarget,
      verifyInProgress: false,
      verifySuccess: true,
      redirectDecisionComplete: false,
    };
  }

  if (verifyActive || (verifySuccess && currentUserFetchInProgress)) {
    return {
      shouldBlockRoutes: false,
      target: null,
      verifyInProgress: verifyActive,
      verifySuccess,
      redirectDecisionComplete: false,
    };
  }

  return {
    shouldBlockRoutes: false,
    target: null,
    verifyInProgress: false,
    verifySuccess,
    redirectDecisionComplete: true,
  };
}

/**
 * @param {object} gateState
 * @param {object} [context]
 */
export function logVerifyEmailGateState(gateState, context = {}) {
  // eslint-disable-next-line no-console
  console.log('[PeakUp VERIFY GATE]', {
    verifyInProgress: gateState.verifyInProgress,
    verifySuccess: gateState.verifySuccess,
    target: gateState.target || resolvePostVerifyRedirect(),
    pathname: context.pathname,
    shouldBlockRoutes: gateState.shouldBlockRoutes,
  });
}

/**
 * @param {string|null|undefined} search
 * @returns {boolean}
 */
export const isCoachOnboardingQueryActive = search => {
  const value = new URLSearchParams(String(search || '')).get(COACH_ONBOARDING_QUERY_PARAM);
  return value === '1' || value === 'true' || value === 'yes';
};

const COACH_ONBOARDING_STORAGE_KEY = 'peakupCoachOnboarding';

function getCoachOnboardingStorage() {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

/**
 * @param {string|null|undefined} path
 * @returns {string}
 */
export function parseReferralCodeFromPath(path) {
  const normalized = String(path || '');
  const queryIndex = normalized.indexOf('?');
  if (queryIndex === -1) {
    return '';
  }
  return parseReferralCodeFromSearch(normalized.slice(queryIndex));
}

/**
 * @returns {{ active: boolean, ref: string, returnPath: string }|null}
 */
export function readCoachOnboardingIntent() {
  const storage = getCoachOnboardingStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(COACH_ONBOARDING_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed?.active || !parsed?.returnPath) {
      return null;
    }

    return {
      active: true,
      ref: String(parsed.ref || '').trim(),
      returnPath: String(parsed.returnPath),
    };
  } catch (e) {
    return null;
  }
}

export function clearCoachOnboardingIntent() {
  clearStalePostLoginRedirectStorage();
}

/** Legacy localStorage keys that must not influence post-login redirect. */
const STALE_POST_LOGIN_STORAGE_KEYS = [
  COACH_ONBOARDING_STORAGE_KEY,
  'coachOnboardingIntent',
  'pendingCoachApplication',
  'ambassadorRef',
  'ref',
  'peakupAmbassadorRef',
];

/**
 * Remove stale coach-onboarding redirect keys after signup/login.
 * Post-login redirect uses profile publicData only.
 */
export function clearStalePostLoginRedirectStorage() {
  const storage = getCoachOnboardingStorage();
  if (!storage) {
    return;
  }

  STALE_POST_LOGIN_STORAGE_KEYS.forEach(key => {
    try {
      storage.removeItem(key);
    } catch (e) {
      // ignore
    }
  });
}

/**
 * Persist coach onboarding intent across email verification (new tab / full reload).
 *
 * @param {{ ref?: string }} [options]
 */
export function persistCoachOnboardingIntent({ ref } = {}) {
  const storage = getCoachOnboardingStorage();
  if (!storage) {
    return;
  }

  const payload = {
    active: true,
    ref: String(ref || '').trim(),
    returnPath: buildCoachApplicationPath({ ref }),
  };

  try {
    storage.setItem(COACH_ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
    // eslint-disable-next-line no-console
    console.log('[PeakUp Coach Onboarding Intent]', {
      action: 'persist',
      ...payload,
    });
  } catch (e) {
    // Ignore storage failures — onboarding still works via in-memory router state.
  }
}

/**
 * Profile publicData written after signup (not during create) for coach onboarding.
 *
 * @param {{ ref?: string }} [options]
 * @returns {{
 *   userType: string,
 *   coachOnboardingIntent: boolean,
 *   pendingCoachApplication: boolean,
 *   ambassadorRef?: string,
 *   ambassadorReferralCode?: string,
 *   referredByAmbassador?: string,
 *   coachReferralCode?: string,
 * }}
 */
export function buildCoachOnboardingProfilePublicData({ ref } = {}) {
  const normalizedRef = String(ref || '').trim();
  return {
    userType: 'instructor',
    coachOnboardingIntent: true,
    pendingCoachApplication: true,
    ...(normalizedRef
      ? {
          ambassadorRef: normalizedRef,
          ambassadorReferralCode: normalizedRef,
          referredByAmbassador: normalizedRef,
          coachReferralCode: normalizedRef,
        }
      : {}),
  };
}

/**
 * Ambassador ref for signup — URL first, then router state, then pre-login storage.
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @returns {string}
 */
export function resolveSignupAmbassadorRef({ location, from } = {}) {
  const refFromLocation = location ? parseReferralCodeFromLocation(location) : '';
  const refFromFrom =
    typeof from === 'string'
      ? parseReferralCodeFromPath(from)
      : parseReferralCodeFromPath(from?.pathname) ||
        parseReferralCodeFromSearch(from?.search);
  const refFromStorage = getCoachOnboardingStoredReferralCode();

  return refFromLocation || refFromFrom || refFromStorage;
}

/**
 * Capture ambassador ref from invite entry and persist through signup/verify (pre-login only).
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @param {string} [options.source]
 * @returns {string}
 */
export function captureAmbassadorRefFromEntry({ location, from, source } = {}) {
  const ref = resolveSignupAmbassadorRef({ location, from });
  if (ref) {
    persistCoachOnboardingIntent({ ref });
    // eslint-disable-next-line no-console
    console.log('[PeakUp AMBASSADOR REF CAPTURED]', { ref, source: source || 'unknown' });
  }
  return ref;
}

/**
 * @returns {boolean}
 */
export function hasCoachOnboardingIntent() {
  return Boolean(readCoachOnboardingIntent()?.active);
}

/**
 * Signup/login URL search string that survives reloads and email verification.
 *
 * @param {{ ref?: string }} [options]
 * @returns {string}
 */
export const buildCoachSignupAuthSearch = ({ ref } = {}) => {
  const params = new URLSearchParams();
  params.set(COACH_ONBOARDING_QUERY_PARAM, '1');
  const normalizedRef = String(ref || '').trim();
  if (normalizedRef) {
    params.set('ref', normalizedRef);
  }
  return `?${params.toString()}`;
};

/**
 * @returns {string}
 */
export function getCoachOnboardingStoredReferralCode() {
  return String(readCoachOnboardingIntent()?.ref || '').trim();
}

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export const isCoachSignupEntryPathname = pathname => {
  const normalized = String(pathname || '').split('?')[0];
  return normalized === '/coach-signup';
};

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export const isJoinReferralPathname = pathname => {
  const normalized = String(pathname || '').split('?')[0];
  return normalized === '/join';
};

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export const isProviderSignupPathname = pathname => {
  const match = String(pathname || '').match(/^\/signup\/([^/?#]+)/i);
  return Boolean(match && isCoachProviderSignupUserType(match[1]));
};

/**
 * @param {import('react-router-dom').Location|{ pathname?: string, search?: string }|null|undefined} location
 * @returns {boolean}
 */
export const isJoinReferralEntry = location =>
  isJoinReferralPathname(location?.pathname) &&
  Boolean(parseReferralCodeFromSearch(location?.search));

/**
 * Coach onboarding signals from URL, entry routes, router state, or persisted intent.
 * Does not use profile publicData alone.
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @returns {boolean}
 */
export function hasCoachOnboardingUrlSignal({ location, from } = {}) {
  if (isCoachOnboardingQueryActive(location?.search)) {
    return true;
  }
  if (isCoachSignupEntryPathname(location?.pathname)) {
    return true;
  }
  if (isProviderSignupPathname(location?.pathname)) {
    return true;
  }
  if (isJoinReferralEntry(location)) {
    return true;
  }
  if (isCoachOnboardingReturn(from)) {
    return true;
  }
  if (hasCoachOnboardingIntent()) {
    return true;
  }
  return false;
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function isOnlyCustomerProfile(currentUser) {
  if (!currentUser?.id) {
    return false;
  }

  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const userType = String(publicData.userType || '').trim().toLowerCase();
  const coachOnboardingIntent = publicData.coachOnboardingIntent === true;
  const pendingCoachApplication = publicData.pendingCoachApplication === true;
  const peakupCoachApplicant = publicData.peakupCoachApplicant === true;

  return (
    userType === 'customer' &&
    !coachOnboardingIntent &&
    !pendingCoachApplication &&
    !peakupCoachApplicant
  );
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {object}
 */
export function getCoachOnboardingProfilePublicData(currentUser) {
  return currentUser?.attributes?.profile?.publicData || {};
}

/**
 * Reliable post-login signal from profile publicData (not localStorage).
 *
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function isCoachApplicantProfile(currentUser) {
  if (!currentUser?.id) {
    return false;
  }

  const publicData = getCoachOnboardingProfilePublicData(currentUser);
  const userType = String(publicData.userType || '').trim().toLowerCase();

  return (
    isCoachProviderSignupUserType(userType) ||
    publicData.coachOnboardingIntent === true ||
    publicData.pendingCoachApplication === true ||
    publicData.peakupCoachApplicant === true
  );
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function hasCoachOnboardingProfileIntent(currentUser) {
  return isCoachApplicantProfile(currentUser);
}

/**
 * Ambassador referral code saved on profile — sole source for post-login application ref.
 *
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string}
 */
export function getProfileAmbassadorRef(currentUser) {
  const publicData = getCoachOnboardingProfilePublicData(currentUser);
  return String(publicData.ambassadorRef || publicData.ambassadorReferralCode || '').trim();
}

/**
 * Referral code for signup/entry sync (URL, storage). Not used for post-login redirect.
 *
 * @param {object} [options]
 * @param {import('../util/types').propTypes.currentUser|null|undefined} [options.currentUser]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @returns {string}
 */
export function resolveCoachOnboardingReferralCode({ currentUser, location, from } = {}) {
  const publicData = currentUser?.attributes?.profile?.publicData || {};
  const refFromProfile = String(
    publicData.coachReferralCode || publicData.ambassadorReferralCode || publicData.referralCode || ''
  ).trim();
  const refFromLocation = location ? parseReferralCodeFromLocation(location) : '';
  const refFromFrom =
    typeof from === 'string'
      ? parseReferralCodeFromPath(from)
      : parseReferralCodeFromPath(from?.pathname) ||
        parseReferralCodeFromSearch(from?.search);
  const refFromStorage = getCoachOnboardingStoredReferralCode();

  return refFromProfile || refFromStorage || refFromLocation || refFromFrom;
}

export function shouldContinueCoachOnboarding({ currentUser } = {}) {
  return isCoachApplicantProfile(currentUser);
}

/**
 * After email verification, always send users to login.
 *
 * @returns {string}
 */
export function resolvePostVerifyRedirect() {
  // eslint-disable-next-line no-console
  console.log('[PeakUp VERIFY REDIRECT]', { target: '/login' });
  return '/login';
}

export const COACH_DASHBOARD_PATH = '/coach-dashboard';

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function isCoachProviderProfileUserType(currentUser) {
  if (!currentUser?.id) {
    return false;
  }
  const userType = String(getCoachOnboardingProfilePublicData(currentUser).userType || '')
    .trim()
    .toLowerCase();
  return isCoachProviderSignupUserType(userType);
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function hasAmbassadorDashboardAccess(currentUser) {
  if (!currentUser?.id) {
    return false;
  }
  const publicData = getCoachOnboardingProfilePublicData(currentUser);
  return Boolean(
    publicData.ambassadorReferralCode ||
      publicData.ambassadorCode ||
      publicData.referralCode ||
      publicData.ambassadorActive === true ||
      publicData.ambassadorActive === 'true'
  );
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function hasPendingCoachApplication(currentUser) {
  if (!currentUser?.id) {
    return false;
  }
  return getCoachOnboardingProfilePublicData(currentUser).pendingCoachApplication === true;
}

/**
 * @param {string|null|undefined} pathname
 * @returns {boolean}
 */
export function isPostLoginAuthPath(pathname) {
  const path = String(pathname || '');
  return path === '/login' || isAuthSignupPathname(path) || isVerifyEmailPathname(path);
}

/**
 * @param {string} currentPath
 * @param {string|null|undefined} target
 * @returns {boolean}
 */
export function pathsMatchPostLoginTarget(currentPath, target) {
  const current = String(currentPath || '');
  const dest = String(target || '/');
  const [currentPathname, currentSearch = ''] = current.split('?');
  const [targetPathname, targetSearch = ''] = dest.split('?');

  if (currentPathname !== targetPathname) {
    return false;
  }

  if (!targetSearch) {
    return true;
  }

  const normalizedTargetSearch = targetSearch.startsWith('?') ? targetSearch : `?${targetSearch}`;
  const normalizedCurrentSearch = currentSearch ? `?${currentSearch}` : '';
  return normalizedCurrentSearch === normalizedTargetSearch;
}

/**
 * Read-only post-login redirect target from profile publicData.
 *
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string|null}
 */
export function resolvePostLoginRedirectTarget(currentUser) {
  if (!currentUser?.id) {
    return null;
  }

  const publicData = getCoachOnboardingProfilePublicData(currentUser);
  const pendingCoachApplication = publicData.pendingCoachApplication === true;
  const coachProviderProfile = isCoachProviderProfileUserType(currentUser);
  const ambassadorRef = getProfileAmbassadorRef(currentUser);

  if (pendingCoachApplication) {
    return buildCoachApplicationPath({ ref: ambassadorRef });
  }
  if (coachProviderProfile) {
    return COACH_DASHBOARD_PATH;
  }
  return '/';
}

/**
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function isCurrentUserLoadedForPostLoginRedirect(currentUser) {
  if (!currentUser?.id) {
    return false;
  }
  return Boolean(currentUser.attributes?.profile);
}

/**
 * Profile + verification state required before post-login redirect decision is final.
 *
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export function isCurrentUserReadyForPostLoginDecision(currentUser) {
  if (!isCurrentUserLoadedForPostLoginRedirect(currentUser)) {
    return false;
  }
  if (!currentUser.attributes.emailVerified || currentUser.attributes.pendingEmail != null) {
    return false;
  }
  return true;
}

/**
 * Global post-login redirect gate state.
 * Blocks routes during login/signup until profile is loaded and redirect decision is final.
 *
 * @param {object} [options]
 * @param {boolean} [options.isAuthenticated]
 * @param {boolean} [options.authSettling]
 * @param {boolean} [options.postLoginRedirectPending]
 * @param {boolean} [options.currentUserFetchInProgress]
 * @param {import('../util/types').propTypes.currentUser|null|undefined} [options.currentUser]
 * @param {import('react-router-dom').Location} [options.location]
 * @returns {{
 *   pending: boolean,
 *   shouldBlockRoutes: boolean,
 *   target: string|null,
 *   atTarget: boolean,
 *   redirectDecisionComplete: boolean,
 *   currentUserLoaded: boolean,
 *   profileReady: boolean,
 * }}
 */
export function getPostLoginRedirectState({
  isAuthenticated,
  authSettling,
  postLoginRedirectPending = false,
  currentUserFetchInProgress = false,
  currentUser,
  location,
} = {}) {
  const pathname = location?.pathname || '';
  const currentPath = `${pathname}${location?.search || ''}`;
  const authPath = isPostLoginAuthPath(pathname);
  const inPostLoginFlow = postLoginRedirectPending || authSettling;
  const currentUserLoaded = isCurrentUserLoadedForPostLoginRedirect(currentUser);
  const profileReady = isCurrentUserReadyForPostLoginDecision(currentUser);

  const idleState = {
    pending: false,
    shouldBlockRoutes: false,
    target: null,
    atTarget: true,
    redirectDecisionComplete: false,
    currentUserLoaded,
    profileReady,
  };

  if (authPath || !inPostLoginFlow) {
    return idleState;
  }

  if (!isAuthenticated) {
    return idleState;
  }

  if (authSettling || currentUserFetchInProgress || !currentUserLoaded || !profileReady) {
    return {
      pending: true,
      shouldBlockRoutes: true,
      target: null,
      atTarget: false,
      redirectDecisionComplete: false,
      currentUserLoaded,
      profileReady,
    };
  }

  const target = resolvePostLoginRedirectTarget(currentUser);
  const atTarget = pathsMatchPostLoginTarget(currentPath, target);
  const redirectDecisionComplete = Boolean(target) && atTarget;

  if (!redirectDecisionComplete) {
    return {
      pending: true,
      shouldBlockRoutes: true,
      target,
      atTarget,
      redirectDecisionComplete: false,
      currentUserLoaded,
      profileReady,
    };
  }

  return {
    pending: false,
    shouldBlockRoutes: false,
    target,
    atTarget: true,
    redirectDecisionComplete: true,
    currentUserLoaded,
    profileReady,
  };
}

/**
 * @param {object} gateState
 * @param {object} [context]
 */
export function logPostLoginGateState(gateState, context = {}) {
  // eslint-disable-next-line no-console
  console.log('[PeakUp POST LOGIN GATE]', {
    postLoginRedirectPending: context.postLoginRedirectPending,
    authInProgress: context.authInProgress,
    isAuthenticated: context.isAuthenticated,
    currentUserLoaded: gateState.currentUserLoaded,
    profileReady: gateState.profileReady,
    target: gateState.target,
    pathname: context.pathname,
    shouldBlockRoutes: gateState.shouldBlockRoutes,
    redirectDecisionComplete: gateState.redirectDecisionComplete,
  });
}

/**
 * Post-login redirect for verified users after login.
 * Single source of truth: profile publicData (not localStorage or URL query).
 *
 * @param {import('../util/types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string|null}
 */
export function resolvePostLoginRedirect(currentUser) {
  if (!currentUser?.id) {
    return null;
  }

  clearStalePostLoginRedirectStorage();

  const publicData = getCoachOnboardingProfilePublicData(currentUser);
  const ambassadorRef = getProfileAmbassadorRef(currentUser);
  const target = resolvePostLoginRedirectTarget(currentUser);

  // eslint-disable-next-line no-console
  console.log('[PeakUp LOGIN REDIRECT DECISION]', {
    userType: publicData.userType,
    pendingCoachApplication: publicData.pendingCoachApplication,
    ambassadorRef,
    target,
    source: 'profile-publicData',
  });

  return target;
}

/**
 * Coach-application redirect for guards — pending application only.
 *
 * @param {object} [options]
 * @param {import('../util/types').propTypes.currentUser|null|undefined} [options.currentUser]
 * @returns {string|null}
 */
export function resolveCoachOnboardingRedirect({ currentUser } = {}) {
  if (!hasPendingCoachApplication(currentUser)) {
    return null;
  }

  return buildCoachApplicationPath({ ref: getProfileAmbassadorRef(currentUser) });
}

/**
 * @returns {string|null}
 */
export function getCoachOnboardingRedirectPath() {
  return readCoachOnboardingIntent()?.returnPath || null;
}

/**
 * @returns {string|null}
 */
export function consumeCoachOnboardingRedirectPath() {
  const intent = readCoachOnboardingIntent();
  if (!intent?.returnPath) {
    return null;
  }

  const redirectPath = buildCoachApplicationPath({ ref: intent.ref });
  clearCoachOnboardingIntent();
  // eslint-disable-next-line no-console
  console.log('[PeakUp Coach Redirect Triggered]', {
    source: 'consumeCoachOnboardingRedirectPath',
    redirectPath,
  });
  return redirectPath;
}

/**
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @param {string} [options.pathname]
 * @param {import('../util/types').propTypes.currentUser|null|undefined} [options.currentUser]
 */
export function syncCoachOnboardingIntent({ location, from, pathname, currentUser } = {}) {
  const path = pathname || location?.pathname || '';
  const refFromLocation = location ? parseReferralCodeFromLocation(location) : '';
  const refFromFrom =
    typeof from === 'string' ? parseReferralCodeFromPath(from) : parseReferralCodeFromSearch(from?.search);
  const storedRef = readCoachOnboardingIntent()?.ref || '';
  const ref =
    resolveCoachOnboardingReferralCode({ currentUser, location, from }) ||
    refFromLocation ||
    refFromFrom ||
    storedRef;

  const onCoachAuthStep =
    isVerifyEmailPathname(path) || isAuthSignupPathname(path) || path === '/login';

  const coachFlow =
    isCoachSignupEntryPathname(path) ||
    isProviderSignupPathname(path) ||
    isJoinReferralEntry(location || { pathname: path, search: location?.search }) ||
    isCoachOnboardingQueryActive(location?.search) ||
    isCoachOnboardingReturn(from) ||
    (onCoachAuthStep && hasCoachOnboardingIntent()) ||
    (currentUser?.id &&
      hasCoachOnboardingProfileIntent(currentUser) &&
      !isOnlyCustomerProfile(currentUser));

  const authenticatedLoginPage = path === '/login' && currentUser?.id;

  if (coachFlow && !authenticatedLoginPage) {
    persistCoachOnboardingIntent({ ref });
  }
}

/**
 * @param {Array<{ userType: string, roles?: string[] }>} userTypes
 * @returns {string|null}
 */
export const getCustomerUserTypeForCoachSignup = userTypes => {
  if (!Array.isArray(userTypes)) {
    return null;
  }

  const customerType = userTypes.find(
    config => Array.isArray(config.roles) && config.roles.includes('customer')
  );
  if (customerType?.userType) {
    return customerType.userType;
  }

  const nonProvider = userTypes.find(
    config => !isCoachProviderSignupUserType(config.userType)
  );
  return nonProvider?.userType || null;
};

/**
 * @param {Array<{ userType: string }>} userTypes
 * @returns {Array<{ userType: string }>}
 */
export const filterCoachOnboardingUserTypes = userTypes => {
  if (!Array.isArray(userTypes)) {
    return [];
  }
  return userTypes.filter(config => !isCoachProviderSignupUserType(config.userType));
};

/**
 * Rewrite legacy provider signup links to the coach onboarding entry route.
 *
 * @param {string|null|undefined} href
 * @returns {string|null|undefined}
 */
export const rewriteCoachSignupHref = href => {
  if (!href || typeof href !== 'string') {
    return href;
  }

  const trimmed = href.trim();
  const providerSignupMatch = trimmed.match(/^\/signup\/([^/?#]+)(.*)$/i);
  if (providerSignupMatch && isCoachProviderSignupUserType(providerSignupMatch[1])) {
    const suffix = providerSignupMatch[2] || '';
    const ref = parseReferralCodeFromSearch(suffix.startsWith('?') ? suffix : '');
    return buildCoachSignupEntryPath({ ref });
  }

  return href;
};

/**
 * Deep-clone CMS page sections and rewrite provider signup CTAs on the instructors page.
 *
 * @param {object|null|undefined} pageData
 * @returns {object|null|undefined}
 */
export const rewriteInstructorsPageCoachSignupLinks = pageData => {
  if (!pageData?.sections?.length) {
    return pageData;
  }

  const rewriteField = field => {
    if (!field || typeof field !== 'object') {
      return field;
    }

    if (typeof field.href === 'string') {
      return {
        ...field,
        href: rewriteCoachSignupHref(field.href),
      };
    }

    return field;
  };

  const rewriteBlock = block => {
    if (!block || typeof block !== 'object') {
      return block;
    }

    return {
      ...block,
      callToAction: rewriteField(block.callToAction),
      title: rewriteField(block.title),
      text: rewriteField(block.text),
    };
  };

  const sections = pageData.sections.map(section => {
    if (!section || typeof section !== 'object') {
      return section;
    }

    const blocks = Array.isArray(section.blocks)
      ? section.blocks.map(rewriteBlock)
      : section.blocks;

    return {
      ...section,
      callToAction: rewriteField(section.callToAction),
      blocks,
    };
  });

  return {
    ...pageData,
    sections,
  };
};
