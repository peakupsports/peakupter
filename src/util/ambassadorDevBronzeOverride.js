/**
 * Client dev-only mirror of server ambassador Bronze unlock override (Giangio test account).
 */

import { isDevelopmentMode } from './isDevelopmentMode';

const DEFAULT_DEV_BRONZE_USER_IDS = [
  '69e16a44-5217-4220-9f45-618ca5dcfe5d',
  'cbab01af-901f-40ab-adb5-540243b93f7f',
];

const DEFAULT_DEV_BRONZE_EMAILS = ['giangiomac@gmail.com', 'gl.buvoli@peakupsports.com'];

const DEFAULT_DEV_BRONZE_REFERRAL_CODES = ['GIANGIOPKUP01'];

const parseCsv = value =>
  String(value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const normalizeReferralCode = code => String(code || '').trim().toUpperCase();

const getDevBronzeOverrideIdentifiers = () => ({
  userIds: [
    ...DEFAULT_DEV_BRONZE_USER_IDS,
    ...parseCsv(process.env.REACT_APP_PEAKUP_DEV_BRONZE_OVERRIDE_USER_IDS),
  ].map(id => String(id).trim().toLowerCase()),
  emails: [
    ...DEFAULT_DEV_BRONZE_EMAILS,
    ...parseCsv(process.env.REACT_APP_PEAKUP_DEV_BRONZE_OVERRIDE_EMAILS),
  ].map(normalizeEmail),
  referralCodes: [
    ...DEFAULT_DEV_BRONZE_REFERRAL_CODES,
    ...parseCsv(process.env.REACT_APP_PEAKUP_DEV_BRONZE_OVERRIDE_REFERRAL_CODES),
  ].map(normalizeReferralCode),
});

/**
 * @param {{ userId?: string|null, email?: string|null, referralCode?: string|null }} account
 * @returns {boolean}
 */
export const isGiangioDevAmbassadorBronzeOverride = account => {
  if (!isDevelopmentMode()) {
    return false;
  }

  const { userIds, emails, referralCodes } = getDevBronzeOverrideIdentifiers();
  const userId = String(account?.userId || '')
    .trim()
    .toLowerCase();
  const email = normalizeEmail(account?.email);
  const referralCode = normalizeReferralCode(account?.referralCode);

  if (userId && userIds.includes(userId)) {
    return true;
  }
  if (email && emails.includes(email)) {
    return true;
  }
  if (referralCode && referralCodes.includes(referralCode)) {
    return true;
  }

  return false;
};

const logDevBronzeOverride = payload => {
  if (!isDevelopmentMode()) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp DEV BRONZE OVERRIDE]', {
    userId: payload.userId ?? null,
    email: payload.email ?? null,
    overrideActive: Boolean(payload.overrideActive),
  });
};

/**
 * @param {object} params
 * @param {string} [params.userId]
 * @param {string} [params.email]
 * @param {string} [params.referralCode]
 * @param {boolean} [params.storedUnlocked]
 * @returns {boolean}
 */
export const resolveAmbassadorRewardsUnlockedWithDevOverride = ({
  userId,
  email,
  referralCode,
  storedUnlocked = false,
}) => {
  const overrideActive = isGiangioDevAmbassadorBronzeOverride({ userId, email, referralCode });
  logDevBronzeOverride({ userId, email, overrideActive });
  return overrideActive ? true : Boolean(storedUnlocked);
};
