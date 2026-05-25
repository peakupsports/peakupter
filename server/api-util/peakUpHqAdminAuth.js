/**
 * Server-side PeakUp HQ admin checks for protected admin API routes.
 * Mirrors client logic in src/util/peakupAdmin.js.
 */

const parseAdminEmails = value =>
  (value || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

const parseCsv = value =>
  (value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

const isDevelopmentEnv = () =>
  process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENV === 'development';

const DEVELOPMENT_HQ_ADMIN_EMAILS = parseAdminEmails('giangiomac@gmail.com');

const getServerHqAdminAllowlists = () => {
  const reactAppEmails = parseAdminEmails(process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS);
  const serverEmails = parseAdminEmails(process.env.PEAKUP_HQ_ADMIN_EMAILS);
  const userIds = parseCsv(process.env.REACT_APP_PEAKUP_HQ_ADMIN_USER_IDS);
  const devFallback = isDevelopmentEnv() ? DEVELOPMENT_HQ_ADMIN_EMAILS : [];

  return {
    userIds,
    emails: [...new Set([...reactAppEmails, ...serverEmails, ...devFallback])],
  };
};

const isPublicDataAdmin = publicData => {
  if (publicData?.peakUpHqAdmin === true) {
    return true;
  }

  if (publicData?.isAdmin === true) {
    return true;
  }

  const userRole = String(publicData?.userRole || '')
    .trim()
    .toLowerCase();
  if (userRole === 'admin') {
    return true;
  }

  const role = String(publicData?.role || '')
    .trim()
    .toLowerCase();
  return role === 'admin' || role === 'operator';
};

const getUserEmail = currentUser => {
  const profile = currentUser?.attributes?.profile || {};
  const metadata = profile.metadata || {};

  return (
    currentUser?.attributes?.email ||
    profile.email ||
    metadata.email ||
    ''
  )
    .trim()
    .toLowerCase();
};

/**
 * @param {object|null|undefined} currentUser Sharetribe current user
 * @returns {boolean}
 */
const isPeakUpHqAdminUser = currentUser => {
  if (!currentUser?.id?.uuid) {
    return false;
  }

  const publicData = currentUser.attributes?.profile?.publicData || {};
  if (isPublicDataAdmin(publicData)) {
    return true;
  }

  const { userIds, emails } = getServerHqAdminAllowlists();
  if (userIds.includes(currentUser.id.uuid)) {
    return true;
  }

  const email = getUserEmail(currentUser);
  return Boolean(email && emails.includes(email));
};

module.exports = {
  isPeakUpHqAdminUser,
};
