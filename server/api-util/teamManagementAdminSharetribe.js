const { getIntegrationSdk } = require('./integrationSdk');
const { listTeamApplications, APPLICATION_STATUSES } = require('./teamApplicationStore');
const { readPartnerPriorityMeta } = require('./coachManagementAdminSharetribe');

const truthyPublicFlag = v => v === true || v === 'true' || v === 1 || v === '1';

const USER_QUERY_FIELDS = {
  include: ['profileImage'],
  'fields.image': ['variants.square-small', 'variants.square-small2x'],
  'fields.user': [
    'profile.displayName',
    'profile.publicData',
    'email',
    'createdAt',
  ],
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
    null
  );
};

const isTeamUser = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  return ut === 'team' || truthyPublicFlag(pd.peakupVerifiedTeam);
};

const isApprovedTeamStatus = status =>
  status === 'verified_public' || status === 'verified_draft';

const resolveTeamStatus = pd => {
  if (truthyPublicFlag(pd.peakupVerifiedTeam)) {
    const visibility = String(pd.peakupTeamVisibility || 'public').toLowerCase();
    return visibility === 'draft' ? 'verified_draft' : 'verified_public';
  }
  return 'unverified';
};

const resolveMainSport = pd => {
  const sports = Array.isArray(pd.peakupTeamSports)
    ? pd.peakupTeamSports
    : Array.isArray(pd.teamSports)
      ? pd.teamSports
      : Array.isArray(pd.sports)
        ? pd.sports
        : [];
  return sports.map(s => String(s || '').trim()).filter(Boolean)[0] || null;
};

const formatTeamLocation = pd => {
  const parts = [pd.teamCityText, pd.cityArea, pd.city, pd.country]
    .map(v => String(v || '').trim())
    .filter(Boolean);
  return [...new Set(parts)].join(', ').slice(0, 160) || null;
};

const mapUserToTeamRow = (user, included = []) => {
  const pd = user?.attributes?.profile?.publicData || {};
  const memberIds = Array.isArray(pd.peakupTeamMemberIds)
    ? pd.peakupTeamMemberIds.map(String).filter(Boolean)
    : [];
  const pendingInviteIds = Array.isArray(pd.peakupTeamPendingInviteIds)
    ? pd.peakupTeamPendingInviteIds.map(String).filter(Boolean)
    : [];
  const partner = readPartnerPriorityMeta(pd);

  return {
    rowId: `team:${user?.id?.uuid}`,
    sourceType: 'team',
    teamId: user?.id?.uuid || null,
    teamName:
      user?.attributes?.profile?.displayName ||
      pd.teamTagline ||
      pd.teamName ||
      null,
    ownerEmail: user?.attributes?.email || null,
    location: formatTeamLocation(pd),
    mainSport: resolveMainSport(pd),
    coachCount: memberIds.length,
    pendingInviteCount: pendingInviteIds.length,
    memberIds,
    pendingInviteIds,
    status: resolveTeamStatus(pd),
    signupAt: user?.attributes?.createdAt || null,
    profileImageUrl: extractProfileImageUrl(user, included),
    partnerPriority: partner.partnerPriority,
    partnerPriorityLevel: partner.partnerPriorityLevel,
  };
};

const mapApplicationToPendingTeamRow = app => ({
  rowId: `application:${app.id}`,
  sourceType: 'application',
  applicationId: app.id,
  teamId: app.applicantUserId || null,
  teamName: app.teamName || null,
  ownerEmail: app.email || null,
  location: [app.cityArea, app.country].filter(Boolean).join(', ') || null,
  mainSport: app.mainSport || (app.teamSports || [])[0] || null,
  coachCount: Array.isArray(app.intendedRosterCoachIds)
    ? app.intendedRosterCoachIds.length
    : 0,
  pendingInviteCount: 0,
  status:
    app.status === APPLICATION_STATUSES.NEED_MORE_INFO
      ? 'application_need_more_info'
      : 'application_pending',
  signupAt: app.submittedAt || null,
  profileImageUrl: null,
  partnerPriority: false,
});

const teamMatchesSearch = (row, queryLower) => {
  if (!queryLower) {
    return true;
  }
  const haystack = [row.teamName, row.ownerEmail, row.location, row.mainSport, row.teamId]
    .map(v => String(v || '').toLowerCase())
    .join(' ');
  return haystack.includes(queryLower);
};

const resolveUserSummary = (usersById, userId) => {
  const user = usersById.get(String(userId));
  if (!user) {
    return { displayName: null, email: null, profileImageUrl: null };
  }
  return {
    displayName: user?.attributes?.profile?.displayName || null,
    email: user?.attributes?.email || null,
    profileImageUrl: user.profileImageUrl || null,
  };
};

const buildRosterRows = (teams, usersById) => {
  const teamCoaches = [];
  const teamInvitations = [];

  teams.forEach(team => {
    (team.memberIds || []).forEach(coachId => {
      const coach = resolveUserSummary(usersById, coachId);
      teamCoaches.push({
        rowId: `${team.teamId}:${coachId}:member`,
        teamId: team.teamId,
        teamName: team.teamName,
        coachId,
        coachDisplayName: coach.displayName,
        coachEmail: coach.email,
        coachProfileImageUrl: coach.profileImageUrl,
        rosterStatus: 'member',
      });
    });
    (team.pendingInviteIds || []).forEach(coachId => {
      const coach = resolveUserSummary(usersById, coachId);
      teamInvitations.push({
        rowId: `${team.teamId}:${coachId}:invite`,
        teamId: team.teamId,
        teamName: team.teamName,
        coachId,
        coachDisplayName: coach.displayName,
        coachEmail: coach.email,
        coachProfileImageUrl: coach.profileImageUrl,
        rosterStatus: 'invited',
      });
      teamCoaches.push({
        rowId: `${team.teamId}:${coachId}:invited`,
        teamId: team.teamId,
        teamName: team.teamName,
        coachId,
        coachDisplayName: coach.displayName,
        coachEmail: coach.email,
        coachProfileImageUrl: coach.profileImageUrl,
        rosterStatus: 'invited',
      });
    });
  });

  return { teamCoaches, teamInvitations };
};

/**
 * @param {{ q?: string, sport?: string, maxPages?: number }} [opts]
 */
const listTeamsForAdmin = async (opts = {}) => {
  const integrationSdk = getIntegrationSdk();
  const queryLower = String(opts.q || '')
    .trim()
    .toLowerCase();
  const sportFilter = String(opts.sport || '')
    .trim()
    .toLowerCase();
  const maxPages = Math.min(Math.max(Number(opts.maxPages) || 25, 1), 50);

  const teams = [];
  const pendingTeams = [];
  const usersById = new Map();
  const sportSet = new Set();

  const openApplications = listTeamApplications().filter(app => {
    const status = app.status || APPLICATION_STATUSES.PENDING;
    return (
      status === APPLICATION_STATUSES.PENDING || status === APPLICATION_STATUSES.NEED_MORE_INFO
    );
  });

  openApplications.forEach(app => {
    const row = mapApplicationToPendingTeamRow(app);
    if (row.mainSport) {
      sportSet.add(String(row.mainSport).trim().toLowerCase());
    }
    if (teamMatchesSearch(row, queryLower)) {
      if (!sportFilter || String(row.mainSport || '').trim().toLowerCase() === sportFilter) {
        pendingTeams.push(row);
      }
    }
  });

  let page = 1;
  let totalPages = 1;

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

    batch.forEach(user => {
      const userId = user?.id?.uuid;
      if (userId) {
        usersById.set(String(userId), {
          ...user,
          profileImageUrl: extractProfileImageUrl(user, included),
        });
      }
      if (!isTeamUser(user)) {
        return;
      }
      const row = mapUserToTeamRow(user, included);
      if (row.mainSport) {
        sportSet.add(String(row.mainSport).trim().toLowerCase());
      }
      if (!teamMatchesSearch(row, queryLower)) {
        return;
      }
      if (sportFilter && String(row.mainSport || '').trim().toLowerCase() !== sportFilter) {
        return;
      }
      teams.push(row);
    });

    page += 1;
  }

  teams.sort((a, b) =>
    String(a.teamName || '').localeCompare(String(b.teamName || ''), undefined, {
      sensitivity: 'base',
    })
  );
  pendingTeams.sort((a, b) => {
    const ta = a.signupAt ? new Date(a.signupAt).getTime() : 0;
    const tb = b.signupAt ? new Date(b.signupAt).getTime() : 0;
    return tb - ta;
  });

  const approvedTeams = teams.filter(team => isApprovedTeamStatus(team.status));
  const partnerTeams = teams.filter(team => team.partnerPriority);
  const { teamCoaches, teamInvitations } = buildRosterRows(teams, usersById);

  return {
    teams,
    pendingTeams,
    approvedTeams,
    partnerTeams,
    teamCoaches,
    teamInvitations,
    filterOptions: {
      sports: [...sportSet].filter(Boolean).sort(),
    },
  };
};

module.exports = {
  listTeamsForAdmin,
};
