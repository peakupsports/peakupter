const crypto = require('crypto');

const { isPeakUpHqAdminUser } = require('./peakUpHqAdminAuth');

const VERIFIED_SEAL_BADGE_IDS = new Set(['founder', 'certified_coach', 'top_coach']);
const COACH_PROVIDER_USER_TYPE_IDS = new Set(['coach', 'provider', 'instructor', 'seller']);

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

const normalizeBadgeIds = publicData => {
  const pd = publicData || {};
  const ids = new Set();

  if (Array.isArray(pd.peakupCoachBadges)) {
    pd.peakupCoachBadges.forEach(id => {
      const normalized = String(id || '').trim();
      if (normalized) {
        ids.add(normalized);
      }
    });
  }

  if (truthy(pd.peakupBadgeAmbassador)) ids.add('ambassador');
  if (truthy(pd.peakupBadgeCertifiedCoach)) ids.add('certified_coach');
  if (truthy(pd.peakupBadgeTopCoach)) ids.add('top_coach');
  if (truthy(pd.peakupBadgeFounder)) ids.add('founder');

  return [...ids];
};

const isVerifiedCoachPublicData = publicData => {
  const pd = publicData || {};
  if (truthy(pd.peakupVerifiedCoach)) {
    return true;
  }
  if (truthy(pd.profileVerified) || truthy(pd.coachApproved)) {
    return true;
  }
  if (truthy(pd.peakupBadgeFounder)) {
    return true;
  }
  return normalizeBadgeIds(pd).some(id => VERIFIED_SEAL_BADGE_IDS.has(id));
};

const isExplicitCoachProviderUserType = publicData => {
  const userType = String(publicData?.userType || '')
    .trim()
    .toLowerCase();
  return userType.length > 0 && COACH_PROVIDER_USER_TYPE_IDS.has(userType);
};

const buildReferralCodeBase = displayName => {
  const parts = String(displayName || 'Coach')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);

  const merged = parts
    .map(part => part.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  const safe = merged.replace(/[^a-zA-Z0-9]/g, '').slice(0, 18);
  return safe || 'Coach';
};

const formatReferralCode = (baseName, sequence = 1) => {
  const seq = String(Math.max(1, sequence)).padStart(2, '0');
  return `${buildReferralCodeBase(baseName)}PKUP${seq}`;
};

const generateUniqueReferralCode = (displayName, takenCodes, existingCode) => {
  const existing = String(existingCode || '').trim();
  if (existing) {
    return existing;
  }

  const taken = new Set(
    (takenCodes || []).map(code => String(code || '').trim().toUpperCase()).filter(Boolean)
  );
  const base = buildReferralCodeBase(displayName);

  for (let i = 1; i <= 99; i += 1) {
    const candidate = formatReferralCode(base, i);
    if (!taken.has(candidate.toUpperCase())) {
      return candidate;
    }
  }

  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${base}PKUP${suffix}`;
};

const mergeAmbassadorPublicData = (publicData, activationFields) => {
  const pd = { ...(publicData || {}) };
  const badges = new Set(normalizeBadgeIds(pd));
  badges.add('ambassador');

  return {
    ...pd,
    ...activationFields,
    peakupCoachBadges: [...badges],
    peakupBadgeAmbassador: true,
  };
};

const validateActivationRequest = ({ currentUser, takenCodes }) => {
  if (!currentUser?.id) {
    const err = new Error('Authentication required.');
    err.status = 401;
    throw err;
  }

  if (currentUser.attributes?.state !== 'active') {
    const err = new Error('Ambassador Program access is available only for verified PeakUp coaches.');
    err.status = 403;
    throw err;
  }

  const publicData = currentUser.attributes?.profile?.publicData || {};
  const isHqAdmin = isPeakUpHqAdminUser(currentUser);

  if (!isHqAdmin && !isExplicitCoachProviderUserType(publicData) && !truthy(publicData.peakupVerifiedCoach)) {
    const err = new Error('Ambassador Program access is available only for verified PeakUp coaches.');
    err.status = 403;
    throw err;
  }

  if (!isHqAdmin && !isVerifiedCoachPublicData(publicData)) {
    const err = new Error('Ambassador Program access is available only for verified PeakUp coaches.');
    err.status = 403;
    throw err;
  }

  if (truthy(publicData.ambassadorActive)) {
    const err = new Error('Ambassador Program is already active on this account.');
    err.status = 409;
    throw err;
  }

  const displayName = currentUser.attributes?.profile?.displayName || 'Coach';
  const referralCode = generateUniqueReferralCode(
    displayName,
    takenCodes,
    publicData.ambassadorReferralCode
  );
  const joinedAt = new Date().toISOString();

  return {
    userId: currentUser.id.uuid,
    displayName,
    email: currentUser.attributes?.email || '',
    referralCode,
    joinedAt,
    publicData: mergeAmbassadorPublicData(publicData, {
      ambassadorActive: true,
      ambassadorTier: 'bronze',
      ambassadorRewardsUnlocked: false,
      ambassadorJoinedAt: joinedAt,
      ambassadorReferralCode: referralCode,
    }),
  };
};

module.exports = {
  buildReferralCodeBase,
  formatReferralCode,
  generateUniqueReferralCode,
  isVerifiedCoachPublicData,
  mergeAmbassadorPublicData,
  validateActivationRequest,
};
