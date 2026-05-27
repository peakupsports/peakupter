const { getCoachApplication } = require('./coachApplicationStore');
const { resolveReferralCode } = require('./referralCodeRegistry');
const { findReferralForCoach } = require('./referralCoachLookup');
const {
  REFERRAL_STATUSES,
  findReferralByApplicationId,
  listAllReferrals,
  updateReferralEntry,
} = require('./referralLedgerStore');

/**
 * @param {object} payload
 */
const logReferralLedgerRepair = payload => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp REFERRAL LEDGER REPAIR]', {
    coachUserId: payload.coachUserId ?? null,
    coachEmail: payload.coachEmail ?? null,
    ambassadorReferralCode: payload.ambassadorReferralCode ?? null,
    ambassadorUserId: payload.ambassadorUserId ?? null,
    repaired: Boolean(payload.repaired),
    reason: payload.reason ?? null,
  });
};

const getCoachApplicationSafe = applicationId => {
  const normalized = String(applicationId || '').trim();
  if (!normalized) {
    return null;
  }
  try {
    return getCoachApplication(normalized);
  } catch (error) {
    return null;
  }
};

/**
 * Build ledger patch to link ambassador + referred coach from application data.
 *
 * @param {object} entry
 * @param {object|null} application
 * @returns {object}
 */
const buildReferralLinkPatch = (entry, application = null) => {
  const patch = {};
  const linkedApplication =
    application || (entry?.applicationId ? getCoachApplicationSafe(entry.applicationId) : null);

  const referralCode = String(
    entry?.ambassadorReferralCode || linkedApplication?.ambassadorReferralCode || ''
  ).trim();

  if (!String(entry?.ambassadorUserId || '').trim() && referralCode) {
    const ambassador = resolveReferralCode(referralCode);
    if (ambassador?.ambassadorUserId) {
      patch.ambassadorUserId = ambassador.ambassadorUserId;
      patch.ambassadorReferralCode = ambassador.ambassadorReferralCode;
    }
  }

  const coachUserId = String(
    entry?.referredCoachUserId || linkedApplication?.applicantUserId || ''
  ).trim();
  if (coachUserId && String(entry?.referredCoachUserId || '') !== coachUserId) {
    patch.referredCoachUserId = coachUserId;
  }

  const coachEmail = String(
    entry?.referredCoachEmail || entry?.applicantEmail || linkedApplication?.email || ''
  ).trim();
  if (coachEmail && String(entry?.referredCoachEmail || '') !== coachEmail) {
    patch.referredCoachEmail = coachEmail;
  }

  return { patch, linkedApplication, referralCode, coachUserId, coachEmail };
};

/**
 * @param {object} entry
 * @param {object} [options]
 * @param {boolean} [options.dryRun]
 * @returns {{ entry: object, repaired: boolean, reason: string }}
 */
const repairReferralLedgerEntry = (entry, options = {}) => {
  const { dryRun = false } = options;
  const { patch, referralCode, coachUserId, coachEmail } = buildReferralLinkPatch(entry);

  const ambassadorUserId =
    patch.ambassadorUserId || entry.ambassadorUserId || null;
  const ambassadorReferralCode =
    patch.ambassadorReferralCode || entry.ambassadorReferralCode || referralCode || null;
  const resolvedCoachUserId = patch.referredCoachUserId || entry.referredCoachUserId || coachUserId;
  const resolvedCoachEmail =
    patch.referredCoachEmail || entry.referredCoachEmail || coachEmail || entry.applicantEmail;

  if (Object.keys(patch).length === 0) {
    logReferralLedgerRepair({
      coachUserId: resolvedCoachUserId,
      coachEmail: resolvedCoachEmail,
      ambassadorReferralCode,
      ambassadorUserId,
      repaired: false,
      reason: 'already_linked',
    });
    return { entry, repaired: false, reason: 'already_linked' };
  }

  if (
    patch.referredCoachUserId &&
    [REFERRAL_STATUSES.VERIFIED, REFERRAL_STATUSES.ACTIVE].includes(entry.status)
  ) {
    patch.status = REFERRAL_STATUSES.ACTIVE;
    patch.rewardStatus = 'earning';
  }

  if (dryRun) {
    logReferralLedgerRepair({
      coachUserId: resolvedCoachUserId,
      coachEmail: resolvedCoachEmail,
      ambassadorReferralCode,
      ambassadorUserId,
      repaired: false,
      reason: 'dry_run_would_repair',
    });
    return {
      entry: { ...entry, ...patch },
      repaired: false,
      reason: 'dry_run_would_repair',
    };
  }

  const updated = updateReferralEntry(entry.id, patch);
  logReferralLedgerRepair({
    coachUserId: updated.referredCoachUserId,
    coachEmail: updated.referredCoachEmail || updated.applicantEmail,
    ambassadorReferralCode: updated.ambassadorReferralCode,
    ambassadorUserId: updated.ambassadorUserId,
    repaired: true,
    reason: 'ledger_link_repaired',
  });

  return { entry: updated, repaired: true, reason: 'ledger_link_repaired' };
};

/**
 * @param {object} [options]
 * @returns {Array<{ entry: object, repaired: boolean, reason: string }>}
 */
const repairAllReferralLedgerEntries = (options = {}) =>
  listAllReferrals().map(entry => repairReferralLedgerEntry(entry, options));

/**
 * @param {object} params
 * @param {string} [params.coachUserId]
 * @param {string} [params.coachEmail]
 * @param {string} [params.applicationId]
 * @param {object} [options]
 * @returns {object|null}
 */
const repairReferralLedgerForCoach = (params = {}, options = {}) => {
  const { coachUserId, coachEmail, applicationId } = params;
  let entry = null;

  if (applicationId) {
    entry = findReferralByApplicationId(applicationId);
  }
  if (!entry) {
    entry = findReferralForCoach({ coachUserId, coachEmail });
  }

  if (!entry) {
    logReferralLedgerRepair({
      coachUserId: coachUserId || null,
      coachEmail: coachEmail || null,
      ambassadorReferralCode: null,
      ambassadorUserId: null,
      repaired: false,
      reason: 'referral_entry_not_found',
    });
    return null;
  }

  return repairReferralLedgerEntry(entry, options);
};

module.exports = {
  buildReferralLinkPatch,
  logReferralLedgerRepair,
  repairAllReferralLedgerEntries,
  repairReferralLedgerEntry,
  repairReferralLedgerForCoach,
};
