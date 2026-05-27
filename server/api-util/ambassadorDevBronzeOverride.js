/**
 * Local dev-only: treat Giangio ambassador test account as Bronze rewards unlocked.
 * Never active outside development — does not change Bronze criteria or reward math.
 */

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

const isDevBronzeOverrideEnvironment = () =>
  process.env.NODE_ENV === 'development' || process.env.REACT_APP_ENV === 'development';

const getDevBronzeOverrideIdentifiers = () => ({
  userIds: [
    ...DEFAULT_DEV_BRONZE_USER_IDS,
    ...parseCsv(process.env.PEAKUP_DEV_BRONZE_OVERRIDE_USER_IDS),
  ].map(id => String(id).trim().toLowerCase()),
  emails: [
    ...DEFAULT_DEV_BRONZE_EMAILS,
    ...parseCsv(process.env.PEAKUP_DEV_BRONZE_OVERRIDE_EMAILS),
  ].map(normalizeEmail),
  referralCodes: [
    ...DEFAULT_DEV_BRONZE_REFERRAL_CODES,
    ...parseCsv(process.env.PEAKUP_DEV_BRONZE_OVERRIDE_REFERRAL_CODES),
  ].map(normalizeReferralCode),
});

/**
 * @param {{ userId?: string|null, email?: string|null, referralCode?: string|null }} account
 * @returns {boolean}
 */
const isGiangioDevAmbassadorBronzeOverride = account => {
  if (!isDevBronzeOverrideEnvironment()) {
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

/**
 * @param {{ userId?: string|null, email?: string|null, referralCode?: string|null, overrideActive: boolean }} payload
 */
const logDevBronzeOverride = payload => {
  if (!isDevBronzeOverrideEnvironment()) {
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
 * Resolve ambassadorRewardsUnlocked for API/UI (read-only override in development).
 *
 * @param {object} params
 * @param {string} [params.userId]
 * @param {string} [params.email]
 * @param {string} [params.referralCode]
 * @param {boolean} [params.storedUnlocked]
 * @returns {{ unlocked: boolean, overrideActive: boolean }}
 */
const resolveAmbassadorRewardsUnlockedWithDevOverride = ({
  userId,
  email,
  referralCode,
  storedUnlocked = false,
}) => {
  const overrideActive = isGiangioDevAmbassadorBronzeOverride({ userId, email, referralCode });
  logDevBronzeOverride({ userId, email, overrideActive });

  return {
    unlocked: overrideActive ? true : Boolean(storedUnlocked),
    overrideActive,
  };
};

module.exports = {
  getDevBronzeOverrideIdentifiers,
  isDevBronzeOverrideEnvironment,
  isGiangioDevAmbassadorBronzeOverride,
  logDevBronzeOverride,
  resolveAmbassadorRewardsUnlockedWithDevOverride,
};
