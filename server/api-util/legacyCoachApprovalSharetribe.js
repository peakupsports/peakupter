const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep } = require('./coachApprovalSharetribe');

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);
const CUSTOMER_USER_TYPES = new Set(['customer', 'member', 'buyer']);
const COACH_IDENTITY_FIELD_KEYS = ['userType', 'accountType', 'profileType', 'role'];

const truthyPublicFlag = v => v === true || v === 'true' || v === 1 || v === '1';

const isApprovedStatusValue = value =>
  String(value || '')
    .trim()
    .toLowerCase() === 'approved';

/**
 * Coach verification flags shared by team roster, search, and legacy approval.
 *
 * @param {object} pd
 * @returns {boolean}
 */
const hasCoachVerificationPublicData = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  if (truthyPublicFlag(pd.peakupVerifiedCoach)) return true;
  if (truthyPublicFlag(pd.coachApproved)) return true;
  if (truthyPublicFlag(pd.profileVerified)) return true;
  if (truthyPublicFlag(pd.isApprovedCoach)) return true;
  if (truthyPublicFlag(pd.isVerifiedCoach)) return true;
  if (isApprovedStatusValue(pd.approvalStatus)) return true;
  if (isApprovedStatusValue(pd.coachApplicationStatus)) return true;
  if (isApprovedStatusValue(pd.applicationStatus)) return true;
  return false;
};

const hasCoachIdentityFields = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  return COACH_IDENTITY_FIELD_KEYS.some(key =>
    COACH_PROVIDER_USER_TYPES.has(
      String(pd[key] || '')
        .trim()
        .toLowerCase()
    )
  );
};

const hasCoachProfileSignals = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  if (Array.isArray(pd.sports) && pd.sports.length > 0) {
    return true;
  }
  if (Array.isArray(pd.certifications) && pd.certifications.length > 0) {
    return true;
  }
  if (pd.coachLevel != null && String(pd.coachLevel).trim() !== '') {
    return true;
  }
  if (pd.coachCityText != null && String(pd.coachCityText).trim() !== '') {
    return true;
  }
  if (pd.coachCity != null && String(pd.coachCity).trim() !== '') {
    return true;
  }
  if (pd.experience != null && String(pd.experience).trim() !== '') {
    return true;
  }
  if (pd.experienceYears != null && String(pd.experienceYears).trim() !== '') {
    return true;
  }
  if (pd.priceFrom != null && String(pd.priceFrom).trim() !== '') {
    return true;
  }
  if (pd.teachingHoursStart != null && String(pd.teachingHoursStart).trim() !== '') {
    return true;
  }
  if (pd.teachingHoursEnd != null && String(pd.teachingHoursEnd).trim() !== '') {
    return true;
  }
  if (pd.location != null && String(pd.location).trim() !== '') {
    return true;
  }
  if (Array.isArray(pd.peakupCoachBadges) && pd.peakupCoachBadges.length > 0) {
    return true;
  }
  return false;
};

/**
 * True when user looks like a legacy manually-created coach (not team/customer).
 *
 * @param {object} user
 * @param {{ hasPublishedListing?: boolean }} [context]
 */
const looksLikeLegacyCoachUser = (user, context = {}) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();

  if (ut === 'team') {
    return { eligible: false, reason: 'team_account' };
  }
  if (hasCoachVerificationPublicData(pd)) {
    return { eligible: false, reason: 'already_verified', alreadyVerified: true };
  }
  if (CUSTOMER_USER_TYPES.has(ut) && !hasCoachProfileSignals(pd) && !context.hasPublishedListing) {
    return { eligible: false, reason: 'customer_without_coach_signals' };
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return { eligible: true, reason: 'coach_user_type' };
  }
  if (hasCoachIdentityFields(pd)) {
    return { eligible: true, reason: 'coach_identity_fields' };
  }
  if (hasCoachProfileSignals(pd)) {
    return { eligible: true, reason: 'coach_profile_signals' };
  }
  if (context.hasPublishedListing && ut !== 'team' && !CUSTOMER_USER_TYPES.has(ut)) {
    return { eligible: true, reason: 'published_listing_author' };
  }
  return { eligible: false, reason: 'not_coach_like' };
};

/**
 * Approval fields to add for legacy coaches (Option A — manual / migration patch).
 *
 * @param {object} existingPublicData
 * @returns {object}
 */
const buildLegacyCoachApprovalPatch = (existingPublicData = {}) => {
  const pd = existingPublicData || {};
  const patch = {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();

  if (!truthyPublicFlag(pd.coachApproved)) {
    patch.coachApproved = true;
  }
  if (pd.coachApplicationStatus !== 'approved') {
    patch.coachApplicationStatus = 'approved';
  }
  if (pd.approvalStatus !== 'approved') {
    patch.approvalStatus = 'approved';
  }
  if (!truthyPublicFlag(pd.isVerifiedCoach)) {
    patch.isVerifiedCoach = true;
  }
  if (!truthyPublicFlag(pd.profileVerified)) {
    patch.profileVerified = true;
  }
  if (!truthyPublicFlag(pd.peakupVerifiedCoach)) {
    patch.peakupVerifiedCoach = true;
  }
  if (!pd.coachApprovedAt) {
    patch.coachApprovedAt = new Date().toISOString();
  }
  if (!pd.legacyCoachApprovalAt) {
    patch.legacyCoachApprovalAt = new Date().toISOString();
  }
  patch.legacyCoachApprovalSource = 'legacy_migration';

  if (!ut && Object.keys(patch).length > 0) {
    patch.userType = 'coach';
  } else if (CUSTOMER_USER_TYPES.has(ut) && (hasCoachProfileSignals(pd) || hasCoachIdentityFields(pd))) {
    patch.userType = 'coach';
  }

  return patch;
};

const authorHasPublishedListing = async (integrationSdk, userId) => {
  try {
    const response = await integrationSdk.listings.query({
      author_id: userId,
      states: 'published',
      page: 1,
      perPage: 1,
    });
    const totalItems = response?.data?.meta?.totalItems;
    if (typeof totalItems === 'number') {
      return totalItems > 0;
    }
    return (response?.data?.data || []).length > 0;
  } catch (error) {
    return false;
  }
};

const logLegacyCoachPatchPlan = ({ userId, displayName, currentPublicData, patch, dryRun, reason }) => {
  // eslint-disable-next-line no-console
  console.log('[legacy-coach-approve]', {
    dryRun,
    userId,
    displayName,
    reason,
    currentPublicData,
    fieldsBeingAdded: patch,
  });
};

/**
 * Approve a single legacy coach account (dry-run logs only, no Sharetribe write).
 *
 * @param {object} integrationSdk
 * @param {string} userId
 * @param {{ dryRun?: boolean, skipListingCheck?: boolean }} [opts]
 */
const approveLegacyCoachUser = async (integrationSdk, userId, opts = {}) => {
  const dryRun = opts.dryRun !== false;
  const coachUuid = new integrationTypes.UUID(userId);
  const showResponse = await integrationSdk.users.show({ id: coachUuid });
  const user = showResponse?.data?.data;

  if (!user) {
    return {
      userId,
      status: 'error',
      reason: 'user_not_found',
    };
  }

  const displayName = user?.attributes?.profile?.displayName || null;
  const currentPublicData = user?.attributes?.profile?.publicData || {};

  let eligibility = looksLikeLegacyCoachUser(user);
  if (!eligibility.eligible && !eligibility.alreadyVerified && !opts.skipListingCheck) {
    const hasPublishedListing = await authorHasPublishedListing(integrationSdk, userId);
    eligibility = looksLikeLegacyCoachUser(user, { hasPublishedListing });
  }

  if (eligibility.alreadyVerified) {
    return {
      userId,
      displayName,
      status: 'skipped',
      reason: eligibility.reason,
      currentPublicData,
    };
  }

  if (!eligibility.eligible) {
    return {
      userId,
      displayName,
      status: 'skipped',
      reason: eligibility.reason,
      currentPublicData,
    };
  }

  const patch = buildLegacyCoachApprovalPatch(currentPublicData);
  if (Object.keys(patch).length === 0) {
    return {
      userId,
      displayName,
      status: 'skipped',
      reason: 'nothing_to_patch',
      currentPublicData,
    };
  }

  logLegacyCoachPatchPlan({
    userId,
    displayName,
    currentPublicData,
    patch,
    dryRun,
    reason: eligibility.reason,
  });

  if (dryRun) {
    return {
      userId,
      displayName,
      status: 'dry_run',
      reason: eligibility.reason,
      currentPublicData,
      patch,
    };
  }

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: coachUuid,
        publicData: {
          ...currentPublicData,
          ...patch,
        },
      }),
    { userId, legacyCoachApproval: true }
  );

  return {
    userId,
    displayName,
    status: 'patched',
    reason: eligibility.reason,
    currentPublicData,
    patch,
  };
};

/**
 * Scan marketplace users and patch legacy coach accounts.
 *
 * @param {{ dryRun?: boolean, maxPages?: number, userId?: string, perPage?: number }} [opts]
 */
const runLegacyCoachApprovalScan = async (opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const dryRun = opts.dryRun !== false;
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 20, 1), 50);
  const perPage = Math.min(Math.max(Number(opts.perPage) || 100, 1), 100);
  const targetUserId = String(opts.userId || '').trim();

  const summary = {
    dryRun,
    scanned: 0,
    eligible: 0,
    patched: 0,
    skipped: 0,
    errors: 0,
    results: [],
  };

  if (targetUserId) {
    try {
      const result = await approveLegacyCoachUser(integrationSdk, targetUserId, { dryRun });
      summary.scanned = 1;
      summary.results.push(result);
      if (result.status === 'patched' || result.status === 'dry_run') {
        summary.eligible += 1;
        if (result.status === 'patched') {
          summary.patched += 1;
        }
      } else if (result.status === 'error') {
        summary.errors += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.errors += 1;
      summary.results.push({
        userId: targetUserId,
        status: 'error',
        reason: error.message,
      });
    }
    return summary;
  }

  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({ page, perPage });
    const batch = response?.data?.data || [];
    totalPages = response?.data?.meta?.totalPages || 1;

    // eslint-disable-next-line no-restricted-syntax
    for (const user of batch) {
      const userId = user?.id?.uuid;
      if (!userId) {
        continue;
      }
      summary.scanned += 1;
      try {
        // eslint-disable-next-line no-await-in-loop
        const result = await approveLegacyCoachUser(integrationSdk, userId, { dryRun });
        summary.results.push(result);
        if (result.status === 'patched' || result.status === 'dry_run') {
          summary.eligible += 1;
          if (result.status === 'patched') {
            summary.patched += 1;
          }
        } else if (result.status === 'error') {
          summary.errors += 1;
        } else {
          summary.skipped += 1;
        }
      } catch (error) {
        summary.errors += 1;
        summary.results.push({
          userId,
          status: 'error',
          reason: error.message,
        });
      }
    }

    page += 1;
  }

  return summary;
};

module.exports = {
  hasCoachVerificationPublicData,
  looksLikeLegacyCoachUser,
  buildLegacyCoachApprovalPatch,
  approveLegacyCoachUser,
  runLegacyCoachApprovalScan,
};
