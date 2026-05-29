const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep } = require('./coachApprovalSharetribe');
const { listCoachApplications, APPLICATION_STATUSES } = require('./coachApplicationStore');
const {
  hasCoachVerificationPublicData,
  hasCoachProfileSignals,
  looksLikeLegacyCoachUser,
} = require('./legacyCoachApprovalSharetribe');

const FUTURE_COACH_STATUSES = {
  APPLICATION_PENDING: 'application_pending',
  APPLICATION_NEED_MORE_INFO: 'application_need_more_info',
  ONBOARDING: 'onboarding',
  DRAFT_PROFILE: 'draft_profile',
  LEGACY_UNVERIFIED: 'legacy_unverified',
  INVITED: 'invited',
};

/** Commercial partner priority levels (separate from merit-based ranking). */
const PARTNER_PRIORITY_LEVELS = ['standard', 'partner', 'sponsor', 'strategic'];

const TIER_FILTER_IDS = ['founder', 'ambassador', 'top_coach', 'certified_coach'];

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);
const BADGE_PRIORITY = {
  founder: 4,
  ambassador: 3,
  top_coach: 2,
  certified_coach: 1,
};

const truthyPublicFlag = v => v === true || v === 'true' || v === 1 || v === '1';

const normalizePartnerLevel = level => {
  const key = String(level || '').trim().toLowerCase();
  return PARTNER_PRIORITY_LEVELS.includes(key) ? key : null;
};

const isPartnerPriorityExpired = until => {
  if (!until) {
    return false;
  }
  const ts = new Date(until).getTime();
  return Number.isFinite(ts) && ts < Date.now();
};

/**
 * Partner Priority — commercial visibility layer (not consumer ranking).
 * Reads legacy featuredCoach flags for transition only.
 */
const readPartnerPriorityMeta = pd => {
  const publicData = pd || {};
  const rawActive =
    truthyPublicFlag(publicData.partnerPriority) || truthyPublicFlag(publicData.featuredCoach);
  const until = publicData.partnerPriorityUntil || null;
  const expired = rawActive && isPartnerPriorityExpired(until);
  const partnerPriority = rawActive && !expired;

  return {
    partnerPriority,
    partnerPriorityLevel:
      normalizePartnerLevel(publicData.partnerPriorityLevel) ||
      (truthyPublicFlag(publicData.featuredCoach) ? 'partner' : null),
    partnerPriorityReason: publicData.partnerPriorityReason || null,
    partnerPriorityUntil: until,
    partnerPriorityAssignedBy:
      publicData.partnerPriorityAssignedBy || publicData.featuredBy || null,
    partnerPriorityExpired: expired,
  };
};

const resolveBadgeIds = pd => {
  const ids = [];
  if (Array.isArray(pd?.peakupCoachBadges)) {
    pd.peakupCoachBadges.forEach(id => {
      const key = String(id || '').trim();
      if (key) ids.push(key);
    });
  }
  if (truthyPublicFlag(pd?.founderBadge)) ids.push('founder');
  if (truthyPublicFlag(pd?.ambassadorBadge)) ids.push('ambassador');
  return [...new Set(ids)];
};

const pickPrimaryTierId = pd => {
  const badgeIds = resolveBadgeIds(pd);
  let best = null;
  let bestPriority = 0;
  badgeIds.forEach(id => {
    const priority = BADGE_PRIORITY[id] || 0;
    if (priority > bestPriority) {
      bestPriority = priority;
      best = id;
    }
  });
  return best;
};

const extractProfileImageUrl = (user, included = []) => {
  const imageRefId = user?.relationships?.profileImage?.data?.id?.uuid;
  if (!imageRefId) {
    return null;
  }
  const image = included.find(item => item?.id?.uuid === imageRefId);
  const variants = image?.attributes?.variants || {};
  return (
    variants['square-small']?.url ||
    variants['square-small2x']?.url ||
    variants['square-small4x']?.url ||
    null
  );
};

const USER_QUERY_FIELDS = {
  include: ['profileImage'],
  'fields.image': ['variants.square-small', 'variants.square-small2x'],
  'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData', 'email'],
};

const isVerifiedCoachUser = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  if (ut === 'team') {
    return false;
  }
  if (!hasCoachVerificationPublicData(pd)) {
    return false;
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return true;
  }
  if (truthyPublicFlag(pd.isCoach) || truthyPublicFlag(pd.isProvider)) {
    return true;
  }
  return hasCoachVerificationPublicData(pd);
};

const coachMatchesSearch = (user, queryLower) => {
  if (!queryLower) {
    return true;
  }
  const attrs = user?.attributes || {};
  const profile = attrs.profile || {};
  const pd = profile.publicData || {};
  const sports = Array.isArray(pd.sports) ? pd.sports.join(' ') : '';
  const haystack = [
    attrs.email,
    profile.displayName,
    profile.abbreviatedName,
    pd.profileSlug,
    pd.slug,
    pd.username,
    pd.country,
    sports,
    user?.id?.uuid,
  ]
    .map(v => String(v || '').toLowerCase())
    .join(' ');
  return haystack.includes(queryLower);
};

const normalizeCountryFilter = value =>
  String(value || '')
    .trim()
    .toLowerCase();

const coachMatchesCountry = (pd, countryFilter) => {
  if (!countryFilter) {
    return true;
  }
  const country = String(pd?.country || '')
    .trim()
    .toLowerCase();
  return country === countryFilter || country.includes(countryFilter);
};

const coachMatchesSport = (pd, sportFilter) => {
  if (!sportFilter) {
    return true;
  }
  const sports = Array.isArray(pd?.sports) ? pd.sports : [];
  return sports.some(s => String(s || '').trim().toLowerCase() === sportFilter);
};

const hasCoachOnboardingProfilePublicData = pd =>
  truthyPublicFlag(pd?.coachOnboardingIntent) ||
  truthyPublicFlag(pd?.pendingCoachApplication) ||
  truthyPublicFlag(pd?.peakupCoachApplicant);

const formatLocationFromPd = pd => {
  const parts = [pd?.coachCityText, pd?.city, pd?.location, pd?.country]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(', ').slice(0, 160) || null;
};

const sportsFromApplication = app => {
  const sports = [app.mainSport, app.otherSports]
    .flatMap(s => String(s || '').split(/[,;|]/))
    .map(s => s.trim())
    .filter(Boolean);
  return [...new Set(sports)];
};

const formatLocationFromApplication = app => {
  const parts = [app.cityArea, app.country].map(v => String(v || '').trim()).filter(Boolean);
  return parts.join(', ') || null;
};

const futureCoachMatchesSearch = (row, queryLower) => {
  if (!queryLower) {
    return true;
  }
  const haystack = [
    row.displayName,
    row.email,
    row.location,
    ...(row.sports || []),
    row.userId,
    row.applicationId,
  ]
    .map(v => String(v || '').toLowerCase())
    .join(' ');
  return haystack.includes(queryLower);
};

const futureCoachMatchesSport = (row, sportFilter) => {
  if (!sportFilter) {
    return true;
  }
  return (row.sports || []).some(s => String(s || '').trim().toLowerCase() === sportFilter);
};

const futureCoachMatchesCountry = (row, countryFilter) => {
  if (!countryFilter) {
    return true;
  }
  const location = String(row.location || '').toLowerCase();
  return location.includes(countryFilter);
};

const collectTeamPendingInviteIds = users => {
  const invited = new Set();
  users.forEach(user => {
    const pd = user?.attributes?.profile?.publicData || {};
    const ut = String(pd.userType || '')
      .trim()
      .toLowerCase();
    if (ut !== 'team') {
      return;
    }
    const pending = Array.isArray(pd.peakupTeamPendingInviteIds)
      ? pd.peakupTeamPendingInviteIds
      : [];
    pending.forEach(id => {
      const key = String(id || '').trim();
      if (key) {
        invited.add(key);
      }
    });
  });
  return invited;
};

const resolveFutureCoachStatusForUser = (user, invitedCoachIds) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const userId = user?.id?.uuid;
  if (userId && invitedCoachIds.has(userId)) {
    return FUTURE_COACH_STATUSES.INVITED;
  }
  if (hasCoachOnboardingProfilePublicData(pd)) {
    return FUTURE_COACH_STATUSES.ONBOARDING;
  }
  const legacy = looksLikeLegacyCoachUser(user);
  if (legacy.eligible) {
    return FUTURE_COACH_STATUSES.LEGACY_UNVERIFIED;
  }
  if (hasCoachProfileSignals(pd)) {
    return FUTURE_COACH_STATUSES.DRAFT_PROFILE;
  }
  return FUTURE_COACH_STATUSES.DRAFT_PROFILE;
};

const isFutureCoachUser = user => {
  if (isVerifiedCoachUser(user)) {
    return false;
  }
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  if (ut === 'team') {
    return false;
  }
  if (hasCoachOnboardingProfilePublicData(pd)) {
    return true;
  }
  if (looksLikeLegacyCoachUser(user).eligible) {
    return true;
  }
  return hasCoachProfileSignals(pd);
};

const mapApplicationToFutureRow = app => ({
  rowId: `application:${app.id}`,
  sourceType: 'application',
  applicationId: app.id,
  userId: String(app.applicantUserId || '').trim() || null,
  displayName: app.fullName || null,
  email: app.email || null,
  sports: sportsFromApplication(app),
  location: formatLocationFromApplication(app),
  status:
    app.status === APPLICATION_STATUSES.NEED_MORE_INFO
      ? FUTURE_COACH_STATUSES.APPLICATION_NEED_MORE_INFO
      : FUTURE_COACH_STATUSES.APPLICATION_PENDING,
  submittedAt: app.submittedAt || app.updatedAt || null,
  profileImageUrl: null,
});

const mapUserToFutureRow = (user, included, invitedCoachIds) => {
  const pd = user?.attributes?.profile?.publicData || {};
  return {
    rowId: `user:${user?.id?.uuid}`,
    sourceType: 'profile',
    applicationId: null,
    userId: user?.id?.uuid || null,
    displayName: user?.attributes?.profile?.displayName || null,
    email: user?.attributes?.email || null,
    sports: Array.isArray(pd.sports) ? pd.sports : [],
    location: formatLocationFromPd(pd),
    status: resolveFutureCoachStatusForUser(user, invitedCoachIds),
    submittedAt: pd.coachApplicationSubmittedAt || pd.coachOnboardingStartedAt || null,
    profileImageUrl: extractProfileImageUrl(user, included),
  };
};

const mapUserToAdminRow = (user, included = []) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const partner = readPartnerPriorityMeta(pd);
  return {
    userId: user?.id?.uuid || null,
    displayName: user?.attributes?.profile?.displayName || null,
    email: user?.attributes?.email || null,
    userType: pd.userType || null,
    sports: Array.isArray(pd.sports) ? pd.sports : [],
    country: pd.country || null,
    badgeIds: resolveBadgeIds(pd),
    tierId: pickPrimaryTierId(pd),
    profileImageUrl: extractProfileImageUrl(user, included),
    publicData: pd,
    verified: hasCoachVerificationPublicData(pd),
    ...partner,
  };
};

/**
 * @param {{ q?: string, sport?: string, country?: string, tier?: string, partnerOnly?: boolean, maxPages?: number }} [opts]
 */
const listVerifiedCoachesForAdmin = async (opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const queryLower = String(opts.q || '')
    .trim()
    .toLowerCase();
  const sportFilter = String(opts.sport || '')
    .trim()
    .toLowerCase();
  const countryFilter = normalizeCountryFilter(opts.country);
  const tierFilter = String(opts.tier || '').trim();
  const partnerOnly = opts.partnerOnly === true;
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 25, 1), 50);

  const coaches = [];
  const futureCoaches = [];
  const sportSet = new Set();
  const countrySet = new Set();
  const applicationUserIds = new Set();
  const applicationEmails = new Set();
  let page = 1;
  let totalPages = 1;
  let allUsersBatch = [];

  const openApplications = listCoachApplications().filter(app => {
    const status = app.status || APPLICATION_STATUSES.PENDING;
    return (
      status === APPLICATION_STATUSES.PENDING || status === APPLICATION_STATUSES.NEED_MORE_INFO
    );
  });

  openApplications.forEach(app => {
    const row = mapApplicationToFutureRow(app);
    if (!futureCoachMatchesSearch(row, queryLower)) {
      return;
    }
    if (!futureCoachMatchesSport(row, sportFilter)) {
      return;
    }
    if (!futureCoachMatchesCountry(row, countryFilter)) {
      return;
    }
    if (row.userId) {
      applicationUserIds.add(row.userId);
    }
    if (row.email) {
      applicationEmails.add(String(row.email).trim().toLowerCase());
    }
    (row.sports || []).forEach(s => sportSet.add(String(s).trim().toLowerCase()));
    futureCoaches.push(row);
  });

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({
      page,
      perPage: 100,
      ...USER_QUERY_FIELDS,
    });
    const batch = response?.data?.data || [];
    const included = response?.data?.included || [];
    totalPages = response?.data?.meta?.totalPages || 1;
    allUsersBatch = allUsersBatch.concat(batch);

    batch.forEach(user => {
      if (!isVerifiedCoachUser(user)) {
        return;
      }
      const pd = user?.attributes?.profile?.publicData || {};
      if (!coachMatchesSearch(user, queryLower)) {
        return;
      }
      if (!coachMatchesSport(pd, sportFilter)) {
        return;
      }
      if (!coachMatchesCountry(pd, countryFilter)) {
        return;
      }
      const row = mapUserToAdminRow(user, included);
      if (tierFilter && row.tierId !== tierFilter) {
        return;
      }
      if (partnerOnly && !row.partnerPriority) {
        return;
      }
      (row.sports || []).forEach(s => sportSet.add(String(s).trim().toLowerCase()));
      if (row.country) {
        countrySet.add(String(row.country).trim().toUpperCase());
      }
      coaches.push(row);
    });

    batch.forEach(user => {
      if (!isFutureCoachUser(user)) {
        return;
      }
      const userId = user?.id?.uuid;
      const email = String(user?.attributes?.email || '')
        .trim()
        .toLowerCase();
      if (userId && applicationUserIds.has(userId)) {
        return;
      }
      if (email && applicationEmails.has(email)) {
        return;
      }
      const pd = user?.attributes?.profile?.publicData || {};
      if (!coachMatchesSearch(user, queryLower)) {
        return;
      }
      if (!coachMatchesSport(pd, sportFilter)) {
        return;
      }
      if (!coachMatchesCountry(pd, countryFilter)) {
        return;
      }
      const row = mapUserToFutureRow(user, included, new Set());
      if (!futureCoachMatchesSearch(row, queryLower)) {
        return;
      }
      if (!futureCoachMatchesSport(row, sportFilter)) {
        return;
      }
      if (!futureCoachMatchesCountry(row, countryFilter)) {
        return;
      }
      (row.sports || []).forEach(s => sportSet.add(String(s).trim().toLowerCase()));
      futureCoaches.push(row);
    });

    page += 1;
  }

  const invitedCoachIds = collectTeamPendingInviteIds(allUsersBatch);
  futureCoaches.forEach(row => {
    if (row.sourceType === 'profile' && row.userId && invitedCoachIds.has(row.userId)) {
      row.status = FUTURE_COACH_STATUSES.INVITED;
    }
  });

  futureCoaches.sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    if (tb !== ta) {
      return tb - ta;
    }
    return String(a.displayName || '').localeCompare(String(b.displayName || ''));
  });

  coaches.sort((a, b) => {
    if (a.partnerPriority !== b.partnerPriority) {
      return a.partnerPriority ? -1 : 1;
    }
    const ta = a.tierId ? BADGE_PRIORITY[a.tierId] || 0 : 0;
    const tb = b.tierId ? BADGE_PRIORITY[b.tierId] || 0 : 0;
    if (ta !== tb) {
      return tb - ta;
    }
    return String(a.displayName || '').localeCompare(String(b.displayName || ''));
  });

  return {
    coaches,
    futureCoaches,
    partnerPriorityLevels: PARTNER_PRIORITY_LEVELS,
    tierFilters: TIER_FILTER_IDS,
    filterOptions: {
      sports: [...sportSet].filter(Boolean).sort(),
      countries: [...countrySet].filter(Boolean).sort(),
    },
  };
};

const clearLegacyFeaturedFields = patch => ({
  ...patch,
  featuredCoach: false,
  featuredPlacements: [],
  featuredAt: null,
  featuredBy: null,
});

/**
 * @param {string} coachUserId
 * @param {{ level?: string, reason?: string, until?: string|null, assignedBy?: string }} [opts]
 */
const setPartnerPriority = async (coachUserId, opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const coachUuid = new integrationTypes.UUID(coachUserId);
  const showResponse = await integrationSdk.users.show({ id: coachUuid });
  const user = showResponse?.data?.data;
  if (!user) {
    throw Object.assign(new Error('Coach not found.'), { status: 404 });
  }
  if (!isVerifiedCoachUser(user)) {
    throw Object.assign(
      new Error('Only verified PeakUp coaches can receive partner priority.'),
      { status: 422, code: 'coach_not_verified' }
    );
  }

  const level = normalizePartnerLevel(opts.level) || 'partner';
  const existingPd = user?.attributes?.profile?.publicData || {};

  const patch = clearLegacyFeaturedFields({
    partnerPriority: true,
    partnerPriorityLevel: level,
    partnerPriorityReason: String(opts.reason || '').trim() || null,
    partnerPriorityUntil: opts.until || null,
    partnerPriorityAssignedBy: String(opts.assignedBy || '').trim() || null,
  });

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: coachUuid,
        publicData: {
          ...existingPd,
          ...patch,
        },
      }),
    { coachUserId, partnerPriorityLevel: level }
  );

  return mapUserToAdminRow({
    ...user,
    attributes: {
      ...user.attributes,
      profile: {
        ...user.attributes.profile,
        publicData: { ...existingPd, ...patch },
      },
    },
  });
};

/**
 * @param {string} coachUserId
 */
const clearPartnerPriority = async coachUserId => {
  const integrationSdk = getIntegrationSdk();
  const coachUuid = new integrationTypes.UUID(coachUserId);
  const showResponse = await integrationSdk.users.show({ id: coachUuid });
  const user = showResponse?.data?.data;
  if (!user) {
    throw Object.assign(new Error('Coach not found.'), { status: 404 });
  }

  const existingPd = user?.attributes?.profile?.publicData || {};
  const patch = clearLegacyFeaturedFields({
    partnerPriority: false,
    partnerPriorityLevel: null,
    partnerPriorityReason: null,
    partnerPriorityUntil: null,
    partnerPriorityAssignedBy: null,
  });

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: coachUuid,
        publicData: {
          ...existingPd,
          ...patch,
        },
      }),
    { coachUserId }
  );

  return mapUserToAdminRow({
    ...user,
    attributes: {
      ...user.attributes,
      profile: {
        ...user.attributes.profile,
        publicData: { ...existingPd, ...patch },
      },
    },
  });
};

module.exports = {
  PARTNER_PRIORITY_LEVELS,
  TIER_FILTER_IDS,
  FUTURE_COACH_STATUSES,
  listVerifiedCoachesForAdmin,
  setPartnerPriority,
  clearPartnerPriority,
  readPartnerPriorityMeta,
};
