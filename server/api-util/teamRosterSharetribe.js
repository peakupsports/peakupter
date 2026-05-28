const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const { runSharetribeApprovalStep } = require('./coachApprovalSharetribe');

const AFFILIATION_ACTIVE = 'active';
const AFFILIATION_REMOVED = 'removed';

const isVerifiedCoachPublicData = pd => {
  const truthy = v => v === true || v === 'true' || v === 1;
  return truthy(pd?.peakupVerifiedCoach) || truthy(pd?.coachApproved) || truthy(pd?.profileVerified);
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

module.exports = {
  syncTeamRoster,
  fetchTeamRosterMembers,
  isVerifiedCoachPublicData,
};
