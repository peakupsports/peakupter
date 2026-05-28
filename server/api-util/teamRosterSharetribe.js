const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep } = require('./coachApprovalSharetribe');

const AFFILIATION_ACTIVE = 'active';
const AFFILIATION_PENDING = 'pending';
const AFFILIATION_REMOVED = 'removed';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isVerifiedCoachPublicData = pd => {
  const truthy = v => v === true || v === 'true' || v === 1;
  return truthy(pd?.peakupVerifiedCoach) || truthy(pd?.coachApproved) || truthy(pd?.profileVerified);
};

const isCoachAccountUser = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  if (ut === 'team') {
    return false;
  }
  return ut === 'coach' || ut === 'provider' || ut === '';
};

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

const mapCoachEntity = (coach, rosterStatus) => ({
  id: coach.id?.uuid,
  type: coach.type,
  attributes: coach.attributes,
  profileImage: coach.profileImage || null,
  rosterStatus,
});

const getTeamPendingInviteIds = teamPd =>
  Array.isArray(teamPd?.peakupTeamPendingInviteIds)
    ? teamPd.peakupTeamPendingInviteIds.map(String).filter(Boolean)
    : [];

const updateTeamPendingInviteIds = async (integrationSdk, teamUserId, teamPd, pendingIds) => {
  const teamUuid = new integrationTypes.UUID(teamUserId);
  const uniquePending = [...new Set(pendingIds.map(String).filter(Boolean))];
  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: teamUuid,
        publicData: {
          ...teamPd,
          peakupTeamPendingInviteIds: uniquePending,
        },
      }),
    { teamUserId, pendingCount: uniquePending.length }
  );
  return uniquePending;
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
  const previousIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String)
    : [];
  const removedIds = previousIds.filter(id => !uniqueIds.includes(id));

  await runSharetribeApprovalStep(
    'users.updateProfile',
    () =>
      integrationSdk.users.updateProfile({
        id: teamUuid,
        publicData: {
          ...teamPd,
          peakupTeamMemberIds: uniqueIds,
        },
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
 *
 * @param {string} teamUserId
 * @returns {Promise<object[]>}
 */
const fetchTeamRosterMembers = async teamUserId => {
  const integrationSdk = getIntegrationSdk();
  const teamUuid = new integrationTypes.UUID(teamUserId);
  const teamShow = await integrationSdk.users.show({
    id: teamUuid,
    include: ['profileImage'],
    'fields.image': ['variants.square-small', 'variants.square-small2x'],
  });
  const teamUser = teamShow?.data?.data;
  const teamPd = teamUser?.attributes?.profile?.publicData || {};
  const memberIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];

  const members = [];
  for (const coachId of memberIds) {
    try {
      const coachUuid = new integrationTypes.UUID(coachId);
      const res = await integrationSdk.users.show({
        id: coachUuid,
        include: ['profileImage'],
        'fields.image': ['variants.square-small', 'variants.square-small2x'],
        'fields.user': ['profile.displayName', 'profile.publicData'],
      });
      const coach = res?.data?.data;
      if (!coach) continue;
      const pd = coach.attributes?.profile?.publicData || {};
      if (!isVerifiedCoachPublicData(pd)) continue;
      if (String(pd.peakupAffiliatedTeamId || '').trim() !== teamUserId) continue;
      if (String(pd.peakupAffiliationStatus || 'active').toLowerCase() !== AFFILIATION_ACTIVE) {
        continue;
      }
      members.push(coach);
    } catch (e) {
      console.warn('[team-roster] failed to load member', coachId, e?.message);
    }
  }

  return { teamUser, members };
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
  const activeIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];
  const pendingIds = getTeamPendingInviteIds(teamPd);

  const coaches = [];
  for (const coachId of activeIds) {
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) continue;
      coaches.push(mapCoachEntity(coach, AFFILIATION_ACTIVE));
    } catch (e) {
      console.warn('[team-roster] manage active member load failed', coachId, e?.message);
    }
  }

  for (const coachId of pendingIds) {
    if (activeIds.includes(coachId)) {
      continue;
    }
    try {
      const coach = await showCoachUser(integrationSdk, coachId);
      if (!coach) continue;
      const pd = coach.attributes?.profile?.publicData || {};
      const status = String(pd.peakupAffiliationStatus || '').toLowerCase();
      if (status === AFFILIATION_PENDING) {
        coaches.push(mapCoachEntity(coach, AFFILIATION_PENDING));
      } else if (!isVerifiedCoachPublicData(pd)) {
        coaches.push(mapCoachEntity(coach, 'not_verified'));
      } else {
        coaches.push(mapCoachEntity(coach, AFFILIATION_PENDING));
      }
    } catch (e) {
      console.warn('[team-roster] manage pending member load failed', coachId, e?.message);
    }
  }

  return {
    teamId: teamUserId,
    teamDisplayName: teamUser.attributes?.profile?.displayName || null,
    coaches,
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
  const raw = String(query || '').trim();
  if (!raw) {
    return [];
  }

  const profileUuid = extractProfileUuidFromQuery(raw);
  if (profileUuid) {
    const coach = await showCoachUser(integrationSdk, profileUuid);
    if (!coach || !isCoachAccountUser(coach)) {
      return [];
    }
    const pd = coach.attributes?.profile?.publicData || {};
    const rosterStatus = isVerifiedCoachPublicData(pd) ? 'eligible' : 'not_verified';
    return [mapCoachEntity(coach, rosterStatus)];
  }

  const normalizedEmail = raw.includes('@') ? raw.toLowerCase() : '';
  const normalizedName = raw.toLowerCase();
  const matches = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 8 && matches.length < limit) {
    // eslint-disable-next-line no-await-in-loop
    const response = await integrationSdk.users.query({
      page,
      perPage: 100,
      include: ['profileImage'],
      'fields.user': ['profile.displayName', 'profile.abbreviatedName', 'profile.publicData', 'email'],
      'fields.image': ['variants.square-small', 'variants.square-small2x'],
    });
    const batch = response?.data?.data || [];
    const included = response?.data?.included || [];
    totalPages = response?.data?.meta?.totalPages || 1;

    batch.forEach(user => {
      if (matches.length >= limit) {
        return;
      }
      if (!isCoachAccountUser(user)) {
        return;
      }
      const email = String(user?.attributes?.email || '')
        .trim()
        .toLowerCase();
      const displayName = String(user?.attributes?.profile?.displayName || '').toLowerCase();
      const abbreviatedName = String(user?.attributes?.profile?.abbreviatedName || '').toLowerCase();
      const pd = user?.attributes?.profile?.publicData || {};

      let matched = false;
      if (normalizedEmail && email === normalizedEmail) {
        matched = true;
      } else if (!normalizedEmail) {
        matched =
          displayName.includes(normalizedName) ||
          abbreviatedName.includes(normalizedName) ||
          String(user.id?.uuid || '').toLowerCase() === normalizedName;
      }

      if (!matched) {
        return;
      }

      const rosterStatus = isVerifiedCoachPublicData(pd) ? 'eligible' : 'not_verified';
      matches.push(mapCoachEntity(attachProfileImage(user, included), rosterStatus));
    });

    page += 1;
  }

  return matches;
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

  const existingTeamId = String(pd.peakupAffiliatedTeamId || '').trim();
  const existingStatus = String(pd.peakupAffiliationStatus || '').toLowerCase();
  if (existingTeamId && existingTeamId !== teamUserId) {
    throw Object.assign(new Error('This coach is already linked to another organization.'), {
      status: 409,
    });
  }
  if (existingTeamId === teamUserId && existingStatus === AFFILIATION_ACTIVE) {
    throw Object.assign(new Error('This coach is already on your roster.'), { status: 409 });
  }
  if (existingTeamId === teamUserId && existingStatus === AFFILIATION_PENDING) {
    throw Object.assign(new Error('An invitation is already pending for this coach.'), {
      status: 409,
    });
  }

  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    throw Object.assign(new Error('Team user not found.'), { status: 404 });
  }
  const teamPd = teamUser.attributes?.profile?.publicData || {};
  const teamName =
    teamUser.attributes?.profile?.displayName || teamPd.teamTagline || 'Team';
  const pendingIds = getTeamPendingInviteIds(teamPd);
  if (!pendingIds.includes(coachId)) {
    pendingIds.push(coachId);
  }

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
        },
      }),
    { teamUserId, coachId }
  );

  await updateTeamPendingInviteIds(integrationSdk, teamUserId, teamPd, pendingIds);

  return { teamUserId, coachId, status: AFFILIATION_PENDING };
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
  const coach = await showCoachUser(integrationSdk, coachUserId);
  if (!coach) {
    throw Object.assign(new Error('Coach not found.'), { status: 404 });
  }
  const pd = coach.attributes?.profile?.publicData || {};
  const affiliatedTeamId = String(pd.peakupAffiliatedTeamId || '').trim();
  const status = String(pd.peakupAffiliationStatus || '').toLowerCase();

  if (affiliatedTeamId !== teamUserId || status !== AFFILIATION_PENDING) {
    throw Object.assign(new Error('No pending invitation from this team.'), { status: 404 });
  }

  if (normalizedAction === 'decline') {
    await runSharetribeApprovalStep(
      'users.updateProfile',
      () =>
        integrationSdk.users.updateProfile({
          id: new integrationTypes.UUID(coachUserId),
          publicData: {
            ...pd,
            peakupAffiliatedTeamId: null,
            peakupAffiliationStatus: AFFILIATION_REMOVED,
            peakupAffiliatedTeamName: null,
          },
        }),
      { teamUserId, coachUserId }
    );

    const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
    const teamPd = teamShow?.data?.data?.attributes?.profile?.publicData || {};
    const pendingIds = getTeamPendingInviteIds(teamPd).filter(id => id !== coachUserId);
    await updateTeamPendingInviteIds(integrationSdk, teamUserId, teamPd, pendingIds);

    return { teamUserId, coachUserId, status: AFFILIATION_REMOVED };
  }

  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamUserId) });
  const teamPd = teamShow?.data?.data?.attributes?.profile?.publicData || {};
  const teamName = teamShow?.data?.data?.attributes?.profile?.displayName || 'Team';
  const activeIds = Array.isArray(teamPd.peakupTeamMemberIds)
    ? teamPd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];
  if (!activeIds.includes(coachUserId)) {
    activeIds.push(coachUserId);
  }

  const pendingIds = getTeamPendingInviteIds(teamPd).filter(id => id !== coachUserId);
  await updateTeamPendingInviteIds(integrationSdk, teamUserId, teamPd, pendingIds);

  const result = await syncTeamRoster(teamUserId, activeIds, teamName);
  return { ...result, coachUserId, status: AFFILIATION_ACTIVE };
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

  const teamShow = await integrationSdk.users.show({ id: new integrationTypes.UUID(teamId) });
  const teamUser = teamShow?.data?.data;
  if (!teamUser) {
    return [];
  }
  const teamPd = teamUser.attributes?.profile?.publicData || {};

  return [
    {
      teamId,
      teamDisplayName: teamUser.attributes?.profile?.displayName || pd.peakupAffiliatedTeamName,
      teamTagline: teamPd.teamTagline || null,
      status: AFFILIATION_PENDING,
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
