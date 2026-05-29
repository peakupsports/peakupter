const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep } = require('./coachApprovalSharetribe');
const { hasCoachVerificationPublicData } = require('./legacyCoachApprovalSharetribe');

const AFFILIATION_ACTIVE = 'active';
const AFFILIATION_PENDING = 'pending';
const AFFILIATION_REMOVED = 'removed';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const truthyPublicFlag = v => v === true || v === 'true' || v === 1 || v === '1';

const isApprovedStatusValue = value =>
  String(value || '')
    .trim()
    .toLowerCase() === 'approved';

const hasCoachApprovalFlags = pd => hasCoachVerificationPublicData(pd);

const isVerifiedCoachPublicData = pd => hasCoachVerificationPublicData(pd);

const COACH_PROVIDER_USER_TYPES = new Set(['coach', 'provider', 'instructor', 'seller']);
const COACH_IDENTITY_TYPE_VALUES = COACH_PROVIDER_USER_TYPES;
const CUSTOMER_USER_TYPES = new Set(['customer', 'member', 'buyer']);
const PROFILE_IDENTIFIER_KEYS = ['profileSlug', 'slug', 'username', 'handle', 'profileHandle'];
const COACH_IDENTITY_FIELD_KEYS = ['userType', 'accountType', 'profileType', 'role'];
const TEAM_ROSTER_SEARCH_DEBUG = true;

const logTeamRosterSearch = (message, payload = {}) => {
  if (!TEAM_ROSTER_SEARCH_DEBUG) {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[team-roster-search]', message, payload);
};

const extractCoachUserUuid = user => {
  const explicitUserId = user?.userId;
  if (typeof explicitUserId === 'string' && UUID_RE.test(explicitUserId.trim())) {
    return explicitUserId.trim();
  }

  const rawId = user?.id;
  if (!rawId) {
    return null;
  }
  if (typeof rawId === 'string') {
    return UUID_RE.test(rawId) ? rawId : null;
  }
  const uuid = rawId?.uuid;
  return uuid && UUID_RE.test(String(uuid)) ? String(uuid) : null;
};

const ensureUserEntityId = (user, fallbackUuid = '') => {
  if (!user) {
    return null;
  }
  const uuid = extractCoachUserUuid(user) || (UUID_RE.test(String(fallbackUuid)) ? String(fallbackUuid) : null);
  if (!uuid) {
    return null;
  }
  if (extractCoachUserUuid(user) === uuid) {
    return user;
  }
  return {
    ...user,
    id: { uuid },
    userId: uuid,
  };
};

const summarizeCoachPublicDataForLog = pd => ({
  userType: pd?.userType ?? null,
  accountType: pd?.accountType ?? null,
  profileType: pd?.profileType ?? null,
  role: pd?.role ?? null,
  isCoach: pd?.isCoach ?? null,
  isProvider: pd?.isProvider ?? null,
  coachApproved: pd?.coachApproved ?? null,
  isApprovedCoach: pd?.isApprovedCoach ?? null,
  peakupVerifiedCoach: pd?.peakupVerifiedCoach ?? null,
  profileVerified: pd?.profileVerified ?? null,
  approvalStatus: pd?.approvalStatus ?? null,
  coachApplicationStatus: pd?.coachApplicationStatus ?? null,
  applicationStatus: pd?.applicationStatus ?? null,
  coachApplicationId: pd?.coachApplicationId ?? null,
  coachOnboardingIntent: pd?.coachOnboardingIntent ?? null,
  peakupCoachApplicant: pd?.peakupCoachApplicant ?? null,
});

const hasCoachIdentityFields = pd => {
  if (!pd || typeof pd !== 'object') {
    return false;
  }
  return COACH_IDENTITY_FIELD_KEYS.some(key =>
    COACH_IDENTITY_TYPE_VALUES.has(
      String(pd[key] || '')
        .trim()
        .toLowerCase()
    )
  );
};

const hasCoachBooleanFlags = pd =>
  Boolean(pd && (truthyPublicFlag(pd.isCoach) || truthyPublicFlag(pd.isProvider)));

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
  if (pd.coachApplicationId != null && String(pd.coachApplicationId).trim() !== '') {
    return true;
  }
  if (truthyPublicFlag(pd.coachOnboardingIntent)) {
    return true;
  }
  if (truthyPublicFlag(pd.peakupCoachApplicant)) {
    return true;
  }
  return false;
};

const evaluateCoachAccountEligibility = (user, context = {}) => {
  const pd = user?.attributes?.profile?.publicData || user?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  const debug = {
    rawId: user?.id ?? null,
    normalizedId: extractCoachUserUuid(user),
    userType: pd.userType ?? null,
    accountType: pd.accountType ?? null,
    profileType: pd.profileType ?? null,
    role: pd.role ?? null,
    approvalFields: summarizeCoachPublicDataForLog(pd),
    verified: isVerifiedCoachPublicData(pd),
    hasCoachSignals: hasCoachProfileSignals(pd),
    fromListingAuthor: Boolean(context.fromListingAuthor),
  };

  if (ut === 'team') {
    return { accept: false, reason: 'team_account', debug };
  }
  if (COACH_PROVIDER_USER_TYPES.has(ut)) {
    return { accept: true, reason: 'coach_provider_user_type', debug };
  }
  if (hasCoachIdentityFields(pd)) {
    return { accept: true, reason: 'coach_identity_fields', debug };
  }
  if (hasCoachBooleanFlags(pd)) {
    return { accept: true, reason: 'coach_boolean_flags', debug };
  }
  if (hasCoachApprovalFlags(pd)) {
    return { accept: true, reason: 'coach_approval_flags', debug };
  }
  if (hasCoachProfileSignals(pd)) {
    return { accept: true, reason: 'coach_profile_signals', debug };
  }
  if (context.fromListingAuthor && ut !== 'team' && !CUSTOMER_USER_TYPES.has(ut)) {
    return { accept: true, reason: 'published_listing_author', debug };
  }
  if (CUSTOMER_USER_TYPES.has(ut)) {
    return { accept: false, reason: 'customer_user_type', debug };
  }
  if (!ut) {
    return { accept: false, reason: 'empty_user_type_no_coach_signals', debug };
  }
  return { accept: false, reason: 'not_coach_account', debug };
};

const isCoachAccountUser = user => evaluateCoachAccountEligibility(user).accept;

const extractProfileUuidFromQuery = raw => {
  const q = String(raw || '').trim();
  if (!q) {
    return '';
  }
  if (UUID_RE.test(q)) {
    return q;
  }
  const pathMatch = q.match(/\/u\/([0-9a-f-]{36})/i);
  if (pathMatch?.[1] && UUID_RE.test(pathMatch[1])) {
    return pathMatch[1];
  }
  return '';
};

const normalizeSearchQuery = raw => {
  const trimmed = String(raw || '').trim();
  const lower = trimmed.toLowerCase();
  const profileUuid = extractProfileUuidFromQuery(trimmed);

  let slugHint = '';
  const slugPathMatch = trimmed.match(/\/u\/([^/?#]+)/i);
  if (slugPathMatch?.[1] && !UUID_RE.test(slugPathMatch[1])) {
    slugHint = String(slugPathMatch[1]).trim().toLowerCase();
  }

  let email = '';
  if (trimmed.includes('@')) {
    const emailMatch = trimmed.match(/[^\s<>,;]+@[^\s<>,;]+/);
    email = (emailMatch ? emailMatch[0] : trimmed).trim().toLowerCase();
  }

  const tokens = lower.split(/\s+/).filter(token => token.length >= 2);

  return { raw: trimmed, lower, profileUuid, email, slugHint, tokens };
};

const collectUserSearchStrings = user => {
  const attrs = user?.attributes || {};
  const profile = attrs.profile || {};
  const pd = profile.publicData || user?.publicData || {};
  const parts = [
    user?.email,
    attrs.email,
    user?.displayName,
    profile.displayName,
    profile.abbreviatedName,
    profile.firstName,
    profile.lastName,
    extractCoachUserUuid(user),
    ...PROFILE_IDENTIFIER_KEYS.map(key => pd[key]),
    pd.coachApplicationId,
  ];
  return parts
    .map(value => String(value || '').trim().toLowerCase())
    .filter(Boolean);
};

const userMatchesQuery = (user, meta) => {
  const strings = collectUserSearchStrings(user);
  const { profileUuid, email, lower, slugHint, tokens } = meta;
  const userUuid = extractCoachUserUuid(user);

  if (profileUuid && userUuid === profileUuid) {
    return { matched: true, reason: 'profile_uuid_exact' };
  }

  if (slugHint && strings.some(value => value === slugHint || value.includes(slugHint))) {
    return { matched: true, reason: 'profile_slug_match' };
  }

  if (email) {
    const userEmail = String(user?.email || user?.attributes?.email || '')
      .trim()
      .toLowerCase();
    if (userEmail === email) {
      return { matched: true, reason: 'email_exact' };
    }
    if (userEmail.includes(email)) {
      return { matched: true, reason: 'email_partial' };
    }
    return { matched: false, reason: 'email_mismatch' };
  }

  if (strings.some(value => value.includes(lower))) {
    return { matched: true, reason: 'text_substring' };
  }

  if (tokens.length > 0 && tokens.every(token => strings.some(value => value.includes(token)))) {
    return { matched: true, reason: 'token_match' };
  }

  return { matched: false, reason: 'no_text_match' };
};

const USER_SEARCH_INCLUDE_FIELDS = {
  include: ['profileImage'],
  'fields.user': [
    'profile.displayName',
    'profile.abbreviatedName',
    'profile.firstName',
    'profile.lastName',
    'profile.publicData',
    'email',
  ],
  'fields.image': ['variants.square-small', 'variants.square-small2x'],
};

const showUserByEmail = async (integrationSdk, email) => {
  try {
    const response = await integrationSdk.users.show({
      email,
      ...USER_SEARCH_INCLUDE_FIELDS,
    });
    const user = response?.data?.data;
    if (!user) {
      return null;
    }
    return attachProfileImage(user, response?.data?.included || []);
  } catch (error) {
    logTeamRosterSearch('users.show by email failed', {
      email,
      status: error?.status || null,
      message: error?.message || null,
    });
    return null;
  }
};

const paginateUsersForSearch = async (integrationSdk, meta, onUser) => {
  let page = 1;
  let totalPages = 1;
  const maxPages = 20;

  while (page <= totalPages && page <= maxPages) {
    logTeamRosterSearch('users.query request', { page, perPage: 100, query: meta.raw });
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({
      page,
      perPage: 100,
      ...USER_SEARCH_INCLUDE_FIELDS,
    });
    const batch = response?.data?.data || [];
    const included = response?.data?.included || [];
    totalPages = response?.data?.meta?.totalPages || 1;

    logTeamRosterSearch('users.query response', {
      page,
      usersReturned: batch.length,
      totalPages,
    });

    batch.forEach(user => {
      onUser(attachProfileImage(user, included), 'users.query');
    });

    page += 1;
  }
};

const listingMatchesQuery = (listing, meta) => {
  const title = String(listing?.attributes?.title || '').toLowerCase();
  const listingId = String(listing?.id?.uuid || '').toLowerCase();
  const listingPd = listing?.attributes?.publicData || {};
  const listingSlug = String(listingPd.slug || listingPd.listingSlug || '').toLowerCase();
  const { lower, profileUuid } = meta;

  if (profileUuid && listingId === profileUuid) {
    return { matched: true, reason: 'listing_id_uuid' };
  }
  if (title.includes(lower)) {
    return { matched: true, reason: 'listing_title' };
  }
  if (listingId.includes(lower)) {
    return { matched: true, reason: 'listing_id_fragment' };
  }
  if (listingSlug && listingSlug.includes(lower)) {
    return { matched: true, reason: 'listing_slug' };
  }
  return { matched: false, reason: 'listing_no_match' };
};

const collectAuthorsFromListingsResponse = (listings, included, meta, limit) => {
  const authorsById = new Map();

  listings.forEach(listing => {
    if (authorsById.size >= limit) {
      return;
    }
    const authorId = listing?.relationships?.author?.data?.id?.uuid;
    if (!authorId || authorsById.has(authorId)) {
      return;
    }

    const author = ensureUserEntityId(
      included.find(item => item?.type === 'user' && item?.id?.uuid === authorId),
      authorId
    );
    if (!author) {
      logTeamRosterSearch('listing author missing from included', { authorId });
      return;
    }

    const userMatch = userMatchesQuery(author, meta);
    const listingMatch = listingMatchesQuery(listing, meta);
    const matched = userMatch.matched || listingMatch.matched;
    if (!matched) {
      return;
    }

    const eligibility = evaluateCoachAccountEligibility(author, { fromListingAuthor: true });
    logTeamRosterSearch('listing author candidate', {
      authorId,
      userMatch,
      listingMatch,
      eligibility,
      publicData: author?.attributes?.profile?.publicData || {},
    });

    if (!eligibility.accept) {
      logTeamRosterSearch('listing author rejected', {
        authorId,
        reason: eligibility.reason,
      });
      return;
    }

    authorsById.set(authorId, attachProfileImage(author, included));
  });

  return [...authorsById.values()];
};

const searchListingAuthors = async (integrationSdk, meta, limit) => {
  if (!meta.raw || meta.raw.length < 2) {
    return [];
  }

  const authorsById = new Map();
  const addAuthors = authors => {
    authors.forEach(author => {
      const authorId = extractCoachUserUuid(author);
      if (!authorId || authorsById.has(authorId)) {
        return;
      }
      authorsById.set(authorId, author);
    });
  };

  if (!meta.email && !meta.profileUuid) {
    try {
      logTeamRosterSearch('listings.query keywords request', { keywords: meta.raw, perPage: 50 });
      const keywordResponse = await integrationSdk.listings.query({
        keywords: meta.raw,
        page: 1,
        perPage: 50,
        states: 'published',
        include: ['author', 'author.profileImage'],
        ...USER_SEARCH_INCLUDE_FIELDS,
        'fields.listing': ['title', 'publicData', 'state'],
      });
      const keywordListings = keywordResponse?.data?.data || [];
      const keywordIncluded = keywordResponse?.data?.included || [];
      logTeamRosterSearch('listings.query keywords response', {
        listingsReturned: keywordListings.length,
        includedReturned: keywordIncluded.length,
      });
      addAuthors(
        collectAuthorsFromListingsResponse(keywordListings, keywordIncluded, meta, limit)
      );
    } catch (error) {
      logTeamRosterSearch('listings.query keywords failed', {
        message: error?.message || null,
        status: error?.status || null,
      });
    }
  }

  if (authorsById.size >= limit) {
    return [...authorsById.values()].slice(0, limit);
  }

  let page = 1;
  const maxPages = 6;
  let totalPages = 1;

  while (page <= totalPages && page <= maxPages && authorsById.size < limit) {
    logTeamRosterSearch('listings.query paginated request', { page, perPage: 100 });
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.listings.query({
      page,
      perPage: 100,
      states: 'published',
      include: ['author', 'author.profileImage'],
      ...USER_SEARCH_INCLUDE_FIELDS,
      'fields.listing': ['title', 'publicData', 'state'],
    });
    const listings = response?.data?.data || [];
    const included = response?.data?.included || [];
    totalPages = response?.data?.meta?.totalPages || 1;

    logTeamRosterSearch('listings.query paginated response', {
      page,
      listingsReturned: listings.length,
      totalPages,
    });

    addAuthors(collectAuthorsFromListingsResponse(listings, included, meta, limit - authorsById.size));
    page += 1;
  }

  return [...authorsById.values()].slice(0, limit);
};

const attachProfileImage = (user, included = []) => {
  const imageRefId = user?.relationships?.profileImage?.data?.id?.uuid;
  if (!imageRefId) {
    return user;
  }
  const image = included.find(item => item?.id?.uuid === imageRefId);
  return image ? { ...user, profileImage: image } : user;
};

const showCoachUser = async (integrationSdk, coachId) => {
  const coachUuid = new integrationTypes.UUID(coachId);
  const res = await integrationSdk.users.show({
    id: coachUuid,
    include: ['profileImage'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    'fields.user': ['profile.displayName', 'profile.publicData', 'email'],
  });
  const coach = res?.data?.data;
  if (!coach) {
    return null;
  }
  return attachProfileImage(coach, res?.data?.included || []);
};

const mapCoachEntity = (coach, rosterStatus) => {
  const uuid = extractCoachUserUuid(coach);
  if (!uuid) {
    return null;
  }
  return {
    id: { uuid },
    userId: uuid,
    type: coach.type || 'user',
    attributes: coach.attributes || { profile: { publicData: coach.publicData || {} } },
    profileImage: coach.profileImage || null,
    rosterStatus,
  };
};

/**
 * Normalized search candidate for team coach invite modal.
 *
 * @param {object} user
 * @param {string} rosterStatus
 * @param {string} source
 */
const mapCoachSearchCandidate = (user, rosterStatus, source) => {
  const rawId = user?.id ?? null;
  const uuid = extractCoachUserUuid(user);

  logTeamRosterSearch('candidate id normalization', {
    rawId,
    normalizedId: uuid,
    source,
    approvalFields: summarizeCoachPublicDataForLog(
      user?.attributes?.profile?.publicData || user?.publicData || {}
    ),
  });

  if (!uuid) {
    logTeamRosterSearch('skipped candidate missing user id', {
      rawId,
      source,
      approvalFields: summarizeCoachPublicDataForLog(
        user?.attributes?.profile?.publicData || user?.publicData || {}
      ),
    });
    return null;
  }

  const attrs = user?.attributes || {};
  const profile = attrs.profile || {};
  const publicData = profile.publicData || user?.publicData || {};

  return {
    id: uuid,
    userId: uuid,
    type: user?.type || 'user',
    displayName: profile.displayName || user?.displayName || null,
    email: attrs.email || user?.email || null,
    profileImage: user?.profileImage || null,
    publicData,
    protectedData: attrs.protectedData || user?.protectedData || {},
    metadata: user?.metadata || attrs.metadata || {},
    source,
    rosterStatus,
    attributes: {
      ...attrs,
      email: attrs.email || user?.email || null,
      profile: {
        ...profile,
        displayName: profile.displayName || user?.displayName || null,
        publicData,
      },
    },
  };
};

const normalizeRosterUserId = id =>
  String(id || '')
    .trim();

const rosterIdsEqual = (a, b) =>
  normalizeRosterUserId(a).toLowerCase() === normalizeRosterUserId(b).toLowerCase();

const rosterIncludes = (ids, id) => ids.some(existing => rosterIdsEqual(existing, id));

const rosterWithoutId = (ids, id) => ids.filter(existing => !rosterIdsEqual(existing, id));

const rosterWithId = (ids, id) => {
  const normalizedId = normalizeRosterUserId(id);
  if (!normalizedId || rosterIncludes(ids, normalizedId)) {
    return ids;
  }
  return [...ids, normalizedId];
};

const getTeamPendingInviteIds = teamPd =>
  Array.isArray(teamPd?.peakupTeamPendingInviteIds)
    ? teamPd.peakupTeamPendingInviteIds.map(normalizeRosterUserId).filter(Boolean)
    : [];

const getTeamActiveMemberIds = teamPd =>
  Array.isArray(teamPd?.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(normalizeRosterUserId).filter(Boolean)
    : [];

const fetchTeamPublicData = async (integrationSdk, teamUserId) => {
  const teamShow = await integrationSdk.users.show({
    id: new integrationTypes.UUID(normalizeRosterUserId(teamUserId)),
  });
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    throw Object.assign(new Error('Team user not found.'), { status: 404 });
  }
  return {
    teamUser,
    teamPd: teamUser.attributes?.profile?.publicData || {},
    teamDisplayName: teamUser.attributes?.profile?.displayName || null,
  };
};

const buildTeamRosterPublicDataPatch = (teamPd, { memberIds, pendingInviteIds }) => {
  const uniqueMemberIds = [...new Set((memberIds || []).map(normalizeRosterUserId).filter(Boolean))];
  const uniquePendingIds = [
    ...new Set((pendingInviteIds || []).map(normalizeRosterUserId).filter(Boolean)),
  ];
  return {
    ...teamPd,
    peakupTeamMemberIds: uniqueMemberIds,
    peakupTeamPendingInviteIds: uniquePendingIds,
    teamCoachCount: String(uniqueMemberIds.length),
  };
};

const getTeamDeclinedInviteIds = teamPd =>
  Array.isArray(teamPd?.peakupTeamDeclinedInviteIds)
    ? teamPd.peakupTeamDeclinedInviteIds.map(String).filter(Boolean)
    : [];

const updateTeamPendingInviteIds = async (integrationSdk, teamUserId, teamPd, pendingIds) => {
  const teamUuid = new integrationTypes.UUID(normalizeRosterUserId(teamUserId));
  const uniquePending = [...new Set(pendingIds.map(normalizeRosterUserId).filter(Boolean))];
  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: teamUuid,
        publicData: buildTeamRosterPublicDataPatch(teamPd, {
          memberIds: getTeamActiveMemberIds(teamPd),
          pendingInviteIds: uniquePending,
        }),
      }),
    { teamUserId, pendingCount: uniquePending.length }
  );
  return uniquePending;
};

const updateTeamDeclinedInviteIds = async (integrationSdk, teamUserId, teamPd, declinedIds) => {
  const teamUuid = new integrationTypes.UUID(teamUserId);
  const uniqueDeclined = [...new Set(declinedIds.map(String).filter(Boolean))];
  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: teamUuid,
        publicData: {
          ...teamPd,
          peakupTeamDeclinedInviteIds: uniqueDeclined,
        },
      }),
    { teamUserId, declinedCount: uniqueDeclined.length }
  );
  return uniqueDeclined;
};

const resolveCoachInvitePreviousStatus = ({
  teamUserId,
  coachId,
  teamPd,
  coachPd,
  existingTeamId,
  existingStatus,
}) => {
  const activeIds = getTeamActiveMemberIds(teamPd);
  if (rosterIncludes(activeIds, coachId)) {
    return 'active';
  }
  if (rosterIncludes(getTeamPendingInviteIds(teamPd), coachId)) {
    return 'pending';
  }
  if (rosterIncludes(getTeamDeclinedInviteIds(teamPd), coachId)) {
    return 'declined';
  }
  if (rosterIdsEqual(existingTeamId, teamUserId) && existingStatus === AFFILIATION_PENDING) {
    return 'pending';
  }
  if (rosterIdsEqual(existingTeamId, teamUserId) && existingStatus === AFFILIATION_ACTIVE) {
    return 'active';
  }
  if (rosterIdsEqual(existingTeamId, teamUserId) && existingStatus === AFFILIATION_REMOVED) {
    return 'declined';
  }
  if (String(coachPd?.peakupAffiliationStatus || '').toLowerCase() === AFFILIATION_REMOVED) {
    return 'declined';
  }
  return 'none';
};

/**
 * Sync team roster: updates team.peakupTeamMemberIds and coach affiliation fields.
 *
 * @param {string} teamUserId
 * @param {string[]} memberIds ordered coach UUIDs
 * @param {string} teamDisplayName for coach badge copy
 */
const syncTeamRoster = async (teamUserId, memberIds, teamDisplayName = '') => {
  const integrationSdk = getIntegrationSdk();
  const teamUuid = new integrationTypes.UUID(teamUserId);

  const uniqueIds = [...new Set((memberIds || []).map(id => String(id || '').trim()).filter(Boolean))];

  for (const coachId of uniqueIds) {
    const coachUuid = new integrationTypes.UUID(coachId);
    const showResponse = await runSharetribeApprovalStep(
      'users.show',
      () => integrationSdk.users.show({ id: coachUuid }),
      { teamUserId, coachId }
    );
    const coach = showResponse?.data?.data;
    const pd = coach?.attributes?.profile?.publicData || {};
    if (!isVerifiedCoachPublicData(pd)) {
      const err = new Error(`Coach ${coachId} is not verified and cannot join a team roster.`);
      err.status = 422;
      throw err;
    }
    const existingTeamId = String(pd.peakupAffiliatedTeamId || '').trim();
    if (existingTeamId && existingTeamId !== teamUserId) {
      const err = new Error(`Coach ${coachId} is already affiliated with another team.`);
      err.status = 409;
      throw err;
    }
  }

  const teamShow = await runSharetribeApprovalStep(
    'users.show',
    () => integrationSdk.users.show({ id: teamUuid }),
    { teamUserId }
  );
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    throw Object.assign(new Error('Team user not found.'), { status: 404 });
  }

  const teamPd = teamUser.attributes?.profile?.publicData || {};
  const previousIds = getTeamActiveMemberIds(teamPd);
  const removedIds = previousIds.filter(id => !rosterIncludes(uniqueIds, id));

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: teamUuid,
        publicData: buildTeamRosterPublicDataPatch(teamPd, {
          memberIds: uniqueIds,
          pendingInviteIds: getTeamPendingInviteIds(teamPd),
        }),
      }),
    { teamUserId, memberCount: uniqueIds.length }
  );

  const teamName =
    teamDisplayName ||
    teamUser.attributes?.profile?.displayName ||
    teamPd.teamTagline ||
    'Team';

  for (const coachId of uniqueIds) {
    const coachUuid = new integrationTypes.UUID(coachId);
    const showResponse = await runSharetribeApprovalStep(
      'users.show',
      () => integrationSdk.users.show({ id: coachUuid }),
      { teamUserId, coachId }
    );
    const coach = showResponse?.data?.data;
    const pd = coach?.attributes?.profile?.publicData || {};
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: coachUuid,
          publicData: {
            ...pd,
            peakupAffiliatedTeamId: teamUserId,
            peakupAffiliationStatus: AFFILIATION_ACTIVE,
            peakupAffiliatedTeamName: teamName,
          },
        }),
      { teamUserId, coachId }
    );
  }

  for (const coachId of removedIds) {
    const coachUuid = new integrationTypes.UUID(coachId);
    const showResponse = await runSharetribeApprovalStep(
      'users.show',
      () => integrationSdk.users.show({ id: coachUuid }),
      { teamUserId, coachId }
    );
    const coach = showResponse?.data?.data;
    const pd = coach?.attributes?.profile?.publicData || {};
    if (String(pd.peakupAffiliatedTeamId || '').trim() !== teamUserId) {
      continue;
    }
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: coachUuid,
          publicData: {
            ...pd,
            peakupAffiliatedTeamId: null,
            peakupAffiliationStatus: AFFILIATION_REMOVED,
            peakupAffiliatedTeamName: null,
          },
        }),
      { teamUserId, coachId }
    );
  }

  return { teamUserId, memberIds: uniqueIds, removedIds };
};

/**
 * Fetch public roster member users (Integration API).
 * Only returns coaches who are on peakupTeamMemberIds with active affiliation.
 *
 * @param {string} teamUserId
 * @returns {Promise<{ teamUser: object, members: object[], activeCoachIds: string[] }>}
 */
const fetchTeamRosterMembers = async teamUserId => {
  const integrationSdk = getIntegrationSdk();
  const normalizedTeamId = normalizeRosterUserId(teamUserId);
  let fetchError = null;

  let teamUser;
  let teamPd = {};
  try {
    const teamShow = await integrationSdk.users.show({
      id: new integrationTypes.UUID(normalizedTeamId),
      include: ['profileImage'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
      'fields.user': ['profile.displayName', 'profile.publicData'],
    });
    teamUser = teamShow?.data?.data;
    teamPd = teamUser?.attributes?.profile?.publicData || {};
  } catch (e) {
    fetchError = e?.message || 'Failed to load team user.';
    // eslint-disable-next-line no-console
    console.log('[PeakUp TEAM PUBLIC COACHES]', {
      teamId: normalizedTeamId,
      activeCoachIds: [],
      fetchedCoachCount: 0,
      fetchError,
    });
    throw Object.assign(new Error(fetchError), { status: e?.status || 502 });
  }

  const activeCoachIds = getTeamActiveMemberIds(teamPd);
  const members = [];

  for (const coachId of activeCoachIds) {
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) {
        continue;
      }
      const pd = coach.attributes?.profile?.publicData || {};
      if (!isVerifiedCoachPublicData(pd)) {
        continue;
      }
      const status = String(pd.peakupAffiliationStatus || '').toLowerCase();
      if (status === AFFILIATION_PENDING || status === AFFILIATION_REMOVED) {
        continue;
      }
      const affiliatedTeamId = normalizeRosterUserId(pd.peakupAffiliatedTeamId);
      if (affiliatedTeamId && !rosterIdsEqual(affiliatedTeamId, normalizedTeamId)) {
        continue;
      }
      members.push(coach);
    } catch (e) {
      fetchError = fetchError || e?.message || null;
      console.warn('[team-roster] public member load failed', coachId, e?.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp TEAM PUBLIC COACHES]', {
    teamId: normalizedTeamId,
    activeCoachIds,
    fetchedCoachCount: members.length,
    fetchError,
  });

  return { teamUser, members, activeCoachIds };
};

/**
 * Team settings: active + pending roster with coach metadata.
 *
 * @param {string} teamUserId
 */
const fetchTeamRosterManage = async teamUserId => {
  const integrationSdk = getIntegrationSdk();
  const teamUuid = new integrationTypes.UUID(teamUserId);
  const teamShow = await integrationSdk.users.show({ id: teamUuid });
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    throw Object.assign(new Error('Team user not found.'), { status: 404 });
  }
  const teamPd = teamUser.attributes?.profile?.publicData || {};
  const activeIds = getTeamActiveMemberIds(teamPd);
  const pendingIds = getTeamPendingInviteIds(teamPd);
  const declinedIds = getTeamDeclinedInviteIds(teamPd);

  const coaches = [];
  for (const coachId of activeIds) {
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) continue;
      const mapped = mapCoachEntity(coach, AFFILIATION_ACTIVE);
      if (mapped) {
        coaches.push(mapped);
      }
    } catch (e) {
      console.warn('[team-roster] manage active member load failed', coachId, e?.message);
    }
  }

  for (const coachId of pendingIds) {
    if (rosterIncludes(activeIds, coachId)) {
      continue;
    }
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) continue;
      const pd = coach.attributes?.profile?.publicData || {};
      const status = String(pd.peakupAffiliationStatus || '').toLowerCase();
      const rosterStatus =
        status === AFFILIATION_PENDING
          ? AFFILIATION_PENDING
          : !isVerifiedCoachPublicData(pd)
          ? 'not_verified'
          : AFFILIATION_PENDING;
      const mapped = mapCoachEntity(coach, rosterStatus);
      if (mapped) {
        coaches.push(mapped);
      }
    } catch (e) {
      console.warn('[team-roster] manage pending member load failed', coachId, e?.message);
    }
  }

  for (const coachId of declinedIds) {
    if (rosterIncludes(activeIds, coachId) || rosterIncludes(pendingIds, coachId)) {
      continue;
    }
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) continue;
      const mapped = mapCoachEntity(coach, 'declined');
      if (mapped) {
        coaches.push(mapped);
      }
    } catch (e) {
      console.warn('[team-roster] manage declined member load failed', coachId, e?.message);
    }
  }

  return {
    teamId: teamUserId,
    teamDisplayName: teamUser.attributes?.profile?.displayName || null,
    coaches,
    declinedInviteIds: declinedIds,
  };
};

/**
 * Search coaches by email, profile URL/UUID, or display name fragment.
 *
 * @param {string} query
 * @param {{ limit?: number }} [opts]
 */
const searchCoachesForTeamInvite = async (query, opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const limit = Math.min(Math.max(Number(opts.limit) || 8, 1), 12);
  const meta = normalizeSearchQuery(query);

  logTeamRosterSearch('start', {
    incomingQuery: query,
    normalized: meta,
    limit,
  });

  if (!meta.raw) {
    return [];
  }

  const resultsById = new Map();

  const tryAddCandidate = (user, source, options = {}) => {
    const userId = extractCoachUserUuid(user);
    if (!userId || resultsById.has(userId) || resultsById.size >= limit) {
      return;
    }

    const pd = user?.attributes?.profile?.publicData || user?.publicData || {};
    const match = options.matchResult || userMatchesQuery(user, meta);
    const eligibility = evaluateCoachAccountEligibility(user, {
      fromListingAuthor: source === 'listings',
    });

    logTeamRosterSearch('candidate evaluation', {
      rawId: user?.id ?? null,
      normalizedId: userId,
      source,
      match,
      eligibility,
      approvalFields: summarizeCoachPublicDataForLog(pd),
      displayName: user?.attributes?.profile?.displayName || user?.displayName || null,
      emailPresent: Boolean(user?.attributes?.email || user?.email),
    });

    if (!match.matched) {
      logTeamRosterSearch('candidate rejected', { userId, reason: match.reason });
      return;
    }
    if (!eligibility.accept) {
      logTeamRosterSearch('candidate rejected', { userId, reason: eligibility.reason });
      return;
    }

    const rosterStatus = isVerifiedCoachPublicData(pd) ? 'eligible' : 'not_verified';
    const mappedCoach = mapCoachSearchCandidate(user, rosterStatus, source);
    if (!mappedCoach) {
      return;
    }
    resultsById.set(userId, mappedCoach);
    logTeamRosterSearch('candidate accepted', {
      userId,
      source,
      rosterStatus,
      normalizedId: mappedCoach.id,
    });
  };

  if (meta.profileUuid) {
    logTeamRosterSearch('strategy', { type: 'users.show by profile uuid', id: meta.profileUuid });
    const coach = await showCoachUser(integrationSdk, meta.profileUuid);
    if (coach) {
      tryAddCandidate(coach, 'profile_uuid', {
        matchResult: { matched: true, reason: 'profile_uuid_exact' },
      });
    }
    logTeamRosterSearch('complete', {
      totalResults: resultsById.size,
      candidateUserIds: [...resultsById.keys()],
    });
    return [...resultsById.values()];
  }

  if (meta.email) {
    logTeamRosterSearch('strategy', { type: 'users.show by email', email: meta.email });
    const userByEmail = await showUserByEmail(integrationSdk, meta.email);
    if (userByEmail) {
      tryAddCandidate(userByEmail, 'email_show', {
        matchResult: { matched: true, reason: 'email_show' },
      });
    }
  }

  if (resultsById.size < limit) {
    logTeamRosterSearch('strategy', { type: 'users.query paginated' });
    await paginateUsersForSearch(integrationSdk, meta, user => {
      tryAddCandidate(user, 'users.query');
    });
  }

  if (resultsById.size < limit) {
    logTeamRosterSearch('strategy', {
      type: 'listings.query author fallback',
      remaining: limit - resultsById.size,
    });
    const listingAuthors = await searchListingAuthors(
      integrationSdk,
      meta,
      limit - resultsById.size
    );
    logTeamRosterSearch('listing fallback authors', {
      count: listingAuthors.length,
      candidateUserIds: listingAuthors.map(author => author.id?.uuid).filter(Boolean),
    });
    listingAuthors.forEach(author => {
      tryAddCandidate(author, 'listings', {
        matchResult: { matched: true, reason: 'listing_author_match' },
      });
    });
  }

  const results = [...resultsById.values()].slice(0, limit);
  logTeamRosterSearch('complete', {
    totalResults: results.length,
    candidateUserIds: results.map(coach => coach.id).filter(Boolean),
  });
  return results;
};

/**
 * Invite a verified coach to join the team (pending until accepted).
 *
 * @param {string} teamUserId
 * @param {string} coachId
 */
const inviteCoachToTeam = async (teamUserId, coachId) => {
  const integrationSdk = getIntegrationSdk();
  const coach = await showCoachUser(integrationSdk, coachId);
  if (!coach) {
    throw Object.assign(new Error('Coach not found.'), { status: 404 });
  }
  if (!isCoachAccountUser(coach)) {
    throw Object.assign(new Error('Only PeakUp coach accounts can be linked to a team.'), {
      status: 422,
    });
  }

  const pd = coach.attributes?.profile?.publicData || {};
  if (!isVerifiedCoachPublicData(pd)) {
    throw Object.assign(
      new Error('This coach is not verified yet. They must complete PeakUp verification first.'),
      { status: 422, code: 'coach_not_verified' }
    );
  }

  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    throw Object.assign(new Error('Team user not found.'), { status: 404 });
  }
  const teamPd = teamUser.attributes?.profile?.publicData || {};
  const activeIds = getTeamActiveMemberIds(teamPd);
  const pendingIds = getTeamPendingInviteIds(teamPd);
  const declinedIds = getTeamDeclinedInviteIds(teamPd);

  const existingTeamId = normalizeRosterUserId(pd.peakupAffiliatedTeamId);
  const existingStatus = String(pd.peakupAffiliationStatus || '').toLowerCase();
  const previousStatus = resolveCoachInvitePreviousStatus({
    teamUserId,
    coachId,
    teamPd,
    coachPd: pd,
    existingTeamId,
    existingStatus,
  });

  if (existingTeamId && !rosterIdsEqual(existingTeamId, teamUserId)) {
    throw Object.assign(new Error('This coach is already linked to another organization.'), {
      status: 409,
    });
  }
  if (rosterIncludes(activeIds, coachId) || previousStatus === 'active') {
    throw Object.assign(new Error('This coach is already on your roster.'), { status: 409 });
  }
  if (
    rosterIncludes(pendingIds, coachId) ||
    (rosterIdsEqual(existingTeamId, teamUserId) && existingStatus === AFFILIATION_PENDING)
  ) {
    throw Object.assign(new Error('An invitation is already pending for this coach.'), {
      status: 409,
    });
  }

  const coachEmail = coach.attributes?.email || null;
  const invitedAt = new Date().toISOString();
  // eslint-disable-next-line no-console
  console.log('[PeakUp TEAM COACH INVITE]', {
    teamId: teamUserId,
    coachUserId: coachId,
    coachEmail,
    previousStatus,
    nextStatus: AFFILIATION_PENDING,
  });
  // eslint-disable-next-line no-console
  console.log('[PeakUp TEAM INVITATION INBOX]', {
    threadType: 'team_invitation',
    teamId: teamUserId,
    coachUserId: coachId,
    invitedAt,
  });

  const teamName =
    teamUser.attributes?.profile?.displayName || teamPd.teamTagline || 'Team';
  const nextPendingIds = rosterIncludes(pendingIds, coachId) ? pendingIds : [...pendingIds, normalizeRosterUserId(coachId)];
  const nextDeclinedIds = declinedIds.filter(id => !rosterIdsEqual(id, coachId));

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: new integrationTypes.UUID(coachId),
        publicData: {
          ...pd,
          peakupAffiliatedTeamId: teamUserId,
          peakupAffiliationStatus: AFFILIATION_PENDING,
          peakupAffiliatedTeamName: teamName,
          peakupTeamInvitationInboxAt: invitedAt,
        },
      }),
    { teamUserId, coachId }
  );

  await updateTeamPendingInviteIds(integrationSdk, teamUserId, teamPd, nextPendingIds);
  if (nextDeclinedIds.length !== declinedIds.length) {
    await updateTeamDeclinedInviteIds(integrationSdk, teamUserId, teamPd, nextDeclinedIds);
  }

  return { teamUserId, coachId, status: AFFILIATION_PENDING, previousStatus };
};

/**
 * Cancel a pending invitation (team owner).
 */
const cancelTeamCoachInvite = async (teamUserId, coachId) => {
  const integrationSdk = getIntegrationSdk();
  const coach = await showCoachUser(integrationSdk, coachId);
  const pd = coach?.attributes?.profile?.publicData || {};
  if (
    String(pd.peakupAffiliatedTeamId || '').trim() === teamUserId &&
    String(pd.peakupAffiliationStatus || '').toLowerCase() === AFFILIATION_PENDING
  ) {
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: new integrationTypes.UUID(coachId),
          publicData: {
            ...pd,
            peakupAffiliatedTeamId: null,
            peakupAffiliationStatus: AFFILIATION_REMOVED,
            peakupAffiliatedTeamName: null,
          },
        }),
      { teamUserId, coachId }
    );
  }

  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
  const teamPd = teamShow?.data?.data?.attributes?.profile?.publicData || {};
  const pendingIds = getTeamPendingInviteIds(teamPd).filter(id => id !== coachId);
  await updateTeamPendingInviteIds(integrationSdk, teamUserId, teamPd, pendingIds);

  return { teamUserId, coachId, cancelled: true };
};

/**
 * Remove an active coach from the roster.
 */
const removeTeamCoachMember = async (teamUserId, coachId) => {
  const integrationSdk = getIntegrationSdk();
  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
  const teamPd = teamShow?.data?.data?.attributes?.profile?.publicData || {};
  const activeIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];
  const nextIds = activeIds.filter(id => id !== coachId);
  const teamName = teamShow?.data?.data?.attributes?.profile?.displayName || 'Team';
  return syncTeamRoster(teamUserId, nextIds, teamName);
};

/**
 * Coach accepts or declines a team invitation.
 */
const respondToTeamInvite = async (coachUserId, teamUserId, action) => {
  const normalizedAction = String(action || '').toLowerCase();
  if (normalizedAction !== 'accept' && normalizedAction !== 'decline') {
    throw Object.assign(new Error('action must be accept or decline.'), { status: 400 });
  }

  const integrationSdk = getIntegrationSdk();
  const normalizedCoachId = normalizeRosterUserId(coachUserId);
  const normalizedTeamId = normalizeRosterUserId(teamUserId);
  const coach = await showCoachUser(integrationSdk, normalizedCoachId);
  if (!coach) {
    throw Object.assign(new Error('Coach not found.'), { status: 404 });
  }
  const pd = coach.attributes?.profile?.publicData || {};
  const affiliatedTeamId = normalizeRosterUserId(pd.peakupAffiliatedTeamId);
  const status = String(pd.peakupAffiliationStatus || '').toLowerCase();

  if (!rosterIdsEqual(affiliatedTeamId, normalizedTeamId) || status !== AFFILIATION_PENDING) {
    throw Object.assign(new Error('No pending invitation from this team.'), { status: 404 });
  }

  if (normalizedAction === 'decline') {
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: new integrationTypes.UUID(normalizedCoachId),
          publicData: {
            ...pd,
            peakupAffiliatedTeamId: null,
            peakupAffiliationStatus: AFFILIATION_REMOVED,
            peakupAffiliatedTeamName: null,
          },
        }),
      { teamUserId: normalizedTeamId, coachUserId: normalizedCoachId }
    );

    const { teamPd } = await fetchTeamPublicData(integrationSdk, normalizedTeamId);
    const beforePendingIds = getTeamPendingInviteIds(teamPd);
    const afterPendingIds = rosterWithoutId(beforePendingIds, normalizedCoachId);
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: new integrationTypes.UUID(normalizedTeamId),
          publicData: buildTeamRosterPublicDataPatch(teamPd, {
            memberIds: getTeamActiveMemberIds(teamPd),
            pendingInviteIds: afterPendingIds,
          }),
        }),
      { teamUserId: normalizedTeamId, coachUserId: normalizedCoachId }
    );

    const { teamPd: teamPdAfterPending } = await fetchTeamPublicData(integrationSdk, normalizedTeamId);
    const declinedIds = getTeamDeclinedInviteIds(teamPdAfterPending);
    if (!rosterIncludes(declinedIds, normalizedCoachId)) {
      await updateTeamDeclinedInviteIds(integrationSdk, normalizedTeamId, teamPdAfterPending, [
        ...declinedIds,
        normalizedCoachId,
      ]);
    }

    return { teamUserId: normalizedTeamId, coachUserId: normalizedCoachId, status: AFFILIATION_REMOVED };
  }

  if (!isVerifiedCoachPublicData(pd)) {
    throw Object.assign(
      new Error('This coach is not verified yet. They must complete PeakUp verification first.'),
      { status: 422, code: 'coach_not_verified' }
    );
  }

  const { teamPd, teamDisplayName } = await fetchTeamPublicData(integrationSdk, normalizedTeamId);
  const beforePendingIds = getTeamPendingInviteIds(teamPd);
  const beforeCoachIds = getTeamActiveMemberIds(teamPd);
  const afterPendingIds = rosterWithoutId(beforePendingIds, normalizedCoachId);
  const afterCoachIds = rosterWithId(beforeCoachIds, normalizedCoachId);
  const teamName = teamDisplayName || teamPd.teamTagline || 'Team';

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: new integrationTypes.UUID(normalizedTeamId),
        publicData: buildTeamRosterPublicDataPatch(teamPd, {
          memberIds: afterCoachIds,
          pendingInviteIds: afterPendingIds,
        }),
      }),
    { teamUserId: normalizedTeamId, coachUserId: normalizedCoachId, memberCount: afterCoachIds.length }
  );

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: new integrationTypes.UUID(normalizedCoachId),
        publicData: {
          ...pd,
          peakupAffiliatedTeamId: normalizedTeamId,
          peakupAffiliationStatus: AFFILIATION_ACTIVE,
          peakupAffiliatedTeamName: teamName,
        },
      }),
    { teamUserId: normalizedTeamId, coachUserId: normalizedCoachId }
  );

  const coachAfter = await showCoachUser(integrationSdk, normalizedCoachId);
  const coachAffiliationStatus =
    coachAfter?.attributes?.profile?.publicData?.peakupAffiliationStatus || null;

  // eslint-disable-next-line no-console
  console.log('[PeakUp TEAM INVITE ACCEPT]', {
    teamId: normalizedTeamId,
    coachUserId: normalizedCoachId,
    beforePendingIds,
    afterPendingIds,
    beforeCoachIds,
    afterCoachIds,
    coachAffiliationStatus,
  });

  return {
    teamUserId: normalizedTeamId,
    coachUserId: normalizedCoachId,
    status: AFFILIATION_ACTIVE,
    memberIds: afterCoachIds,
    pendingInviteIds: afterPendingIds,
    coachAffiliationStatus,
  };
};

/**
 * Pending team invites for the signed-in coach.
 */
const fetchCoachPendingTeamInvites = async coachUserId => {
  const integrationSdk = getIntegrationSdk();
  const coach = await showCoachUser(integrationSdk, coachUserId);
  if (!coach) {
    return [];
  }
  const pd = coach.attributes?.profile?.publicData || {};
  const teamId = String(pd.peakupAffiliatedTeamId || '').trim();
  const status = String(pd.peakupAffiliationStatus || '').toLowerCase();
  if (!teamId || status !== AFFILIATION_PENDING) {
    return [];
  }

  const teamShow = await integrationSdk.users.show({
    id: new integrationTypes.UUID(teamId),
    include: ['profileImage'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
    'fields.user': ['profile.displayName', 'profile.publicData'],
  });
  const teamUser = attachProfileImage(teamShow?.data?.data, teamShow?.data?.included || []);
  if (!teamUser) {
    return [];
  }
  const teamPd = teamUser.attributes?.profile?.publicData || {};
  const teamCityText =
    teamPd.teamCityText != null ? String(teamPd.teamCityText).trim() || null : null;
  const teamSports = Array.isArray(teamPd.teamSports) ? teamPd.teamSports : [];
  const teamMainSport = teamSports[0] != null ? String(teamSports[0]).trim() || null : null;
  const memberIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];
  const storedCoachCount = parseInt(String(teamPd.teamCoachCount || '').trim(), 10);
  const teamCoachCount =
    memberIds.length > 0
      ? memberIds.length
      : Number.isFinite(storedCoachCount) && storedCoachCount > 0
      ? storedCoachCount
      : null;

  return [
    {
      teamId,
      teamDisplayName: teamUser.attributes?.profile?.displayName || pd.peakupAffiliatedTeamName,
      teamTagline: teamPd.teamTagline || null,
      teamCityText,
      teamMainSport,
      teamCoachCount,
      teamProfileImage: teamUser.profileImage || null,
      status: AFFILIATION_PENDING,
      threadType: 'team_invitation',
      invitedAt: pd.peakupTeamInvitationInboxAt || null,
    },
  ];
};

module.exports = {
  syncTeamRoster,
  fetchTeamRosterMembers,
  fetchTeamRosterManage,
  searchCoachesForTeamInvite,
  inviteCoachToTeam,
  cancelTeamCoachInvite,
  removeTeamCoachMember,
  respondToTeamInvite,
  fetchCoachPendingTeamInvites,
  isVerifiedCoachPublicData,
  AFFILIATION_ACTIVE,
  AFFILIATION_PENDING,
  AFFILIATION_REMOVED,
};
