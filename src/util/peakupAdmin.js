/**
 * PeakUp HQ — marketplace operator / internal admin access helpers.
 */

import peakUpAdminConfig, {
  developmentHqAdminEmails,
  parseAdminEmails,
} from '../config/configPeakUpAdmin';
import { ensureCurrentUser } from './data';

export const PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY = 'peakUpHqAdmin';

export const PEAKUP_HQ_ROUTE_NAMES = [
  'PeakUpHQPage',
  'PeakUpHqDashboardPage',
  'PeakUpHqFeaturedCoachesPage',
  'PeakUpHqAmbassadorsPage',
  'PeakUpHqCancellationCenterPage',
  'PeakUpHqVerificationPage',
  'PeakUpHqReportsPage',
  'PeakUpHqPaymentsPage',
  'PeakUpHqActivityPage',
  'AdminCoachApplicationsPage',
  'AdminCoachApplicationDetailPage',
];

const isDevelopmentEnv = () =>
  process.env.REACT_APP_ENV === 'development' || process.env.NODE_ENV === 'development';

/**
 * @returns {string[]}
 */
export const getEnvAdminEmails = () => parseAdminEmails(process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS);

/**
 * Sharetribe stores the login email on currentUser.attributes.email.
 *
 * @param {import('../util/types').currentUser} currentUser
 * @returns {string}
 */
export const getPeakUpHqUserEmail = currentUser => {
  const user = ensureCurrentUser(currentUser);
  const profile = user.attributes?.profile || {};
  const metadata = profile.metadata || {};

  return (
    user.attributes?.email ||
    profile.email ||
    metadata.email ||
    ''
  )
    .trim()
    .toLowerCase();
};

/**
 * Normalizes peakUpAdmin config (guards against namespace/default import mismatch).
 *
 * @param {Object} [config]
 * @returns {{ userIds: string[], emails: string[] }}
 */
export const resolvePeakUpAdminConfig = (config = {}) => {
  const raw = config.peakUpAdmin;
  const peakUpAdmin =
    raw?.default && (Array.isArray(raw.default.userIds) || Array.isArray(raw.default.emails))
      ? raw.default
      : raw || {};

  const configEmails = Array.isArray(peakUpAdmin.emails)
    ? peakUpAdmin.emails.map(email => String(email).trim().toLowerCase()).filter(Boolean)
    : [];

  const configDevEmails = Array.isArray(peakUpAdmin.developmentHqAdminEmails)
    ? peakUpAdmin.developmentHqAdminEmails.map(email => String(email).trim().toLowerCase()).filter(Boolean)
    : developmentHqAdminEmails;

  const envEmails = getEnvAdminEmails();
  const devFallbackEmails = isDevelopmentEnv() ? configDevEmails : [];

  return {
    userIds: Array.isArray(peakUpAdmin.userIds) ? peakUpAdmin.userIds : [],
    emails: [...new Set([...configEmails, ...envEmails, ...devFallbackEmails])],
  };
};

const isPublicDataAdmin = publicData => {
  if (publicData?.[PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY] === true) {
    return true;
  }

  if (publicData?.isAdmin === true) {
    return true;
  }

  const userRole = (publicData?.userRole || '').toString().trim().toLowerCase();
  if (userRole === 'admin') {
    return true;
  }

  const role = (publicData?.role || '').toString().trim().toLowerCase();
  return role === 'admin' || role === 'operator';
};

/**
 * @param {import('../util/types').currentUser} currentUser
 * @param {Object} [config]
 * @param {boolean} result
 * @param {Object} [extra]
 */
const logPeakUpHqAdminCheckFinal = (currentUser, config, result, extra = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  const envEmails = getEnvAdminEmails();
  const email = getPeakUpHqUserEmail(currentUser);
  const publicData = currentUser?.attributes?.profile?.publicData;

  // eslint-disable-next-line no-console
  console.log('[PeakUp HQ ADMIN CHECK FINAL]', {
    email,
    envEmails,
    publicData,
    result,
    ...extra,
  });

  if (!envEmails.length && isDevelopmentEnv()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[PeakUp HQ] REACT_APP_PEAKUP_HQ_ADMIN_EMAILS is empty in the browser bundle. ' +
        'Add your login email to .env.development and restart `yarn dev`. ' +
        'Dev hardcoded fallback emails may still grant access.'
    );
  }

  if (isDevelopmentEnv() && typeof process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn(
      '[PeakUp HQ] REACT_APP_PEAKUP_HQ_ADMIN_EMAILS was not injected at build time. Restart `yarn dev`.'
    );
  }
};

/**
 * @param {import('../util/types').currentUser} currentUser
 * @param {Object} [config] merged marketplace config
 * @returns {boolean}
 */
export const isPeakUpHqAdmin = (currentUser, config = {}) => {
  const user = ensureCurrentUser(currentUser);
  const publicData = user.attributes?.profile?.publicData || {};
  const email = getPeakUpHqUserEmail(user);
  const { userIds, emails } = resolvePeakUpAdminConfig(config);

  let result = false;
  let reason = 'not-authenticated';

  if (!user?.id?.uuid) {
    logPeakUpHqAdminCheckFinal(currentUser, config, false, { reason });
    return false;
  }

  if (isPublicDataAdmin(publicData)) {
    result = true;
    reason = 'publicData';
  } else if (userIds.includes(user.id.uuid)) {
    result = true;
    reason = 'userIdAllowlist';
  } else if (email && emails.includes(email)) {
    result = true;
    reason = 'emailAllowlist';
  } else {
    reason = 'no-match';
  }

  logPeakUpHqAdminCheckFinal(currentUser, config, result, { reason });
  return result;
};

/**
 * @param {string} [routeName]
 * @returns {boolean}
 */
export const isPeakUpHqRouteName = routeName =>
  Boolean(routeName && PEAKUP_HQ_ROUTE_NAMES.includes(routeName));

/**
 * HQ operators signed in via Sharetribe can call admin APIs without a dev token.
 *
 * @param {import('../util/types').currentUser} currentUser
 * @param {Object} [config]
 * @returns {boolean}
 */
export const canAccessHqAdminApiViaSession = (currentUser, config = {}) =>
  isPeakUpHqAdmin(currentUser, config);

/**
 * @param {import('../util/types').currentUser} currentUser
 * @param {Object} [config]
 * @param {boolean} [tokenAuthenticated]
 * @returns {boolean}
 */
export const hasPeakUpHqAdminDashboardAccess = (currentUser, config, tokenAuthenticated = false) =>
  tokenAuthenticated || canAccessHqAdminApiViaSession(currentUser, config);

export { peakUpAdminConfig };
