const { fetchTeamRosterMembers } = require('../api-util/teamRosterSharetribe');

const truthyPublicFlag = value => value === true || value === 'true' || value === 1;

/**
 * Public team profiles can show roster when verified/approved or when active member ids exist.
 *
 * @param {Object} pd team publicData
 * @param {number} activeMemberCount
 */
const isPublicTeamRosterAccessible = (pd, activeMemberCount = 0) => {
  if (String(pd?.peakupTeamVisibility || 'public').toLowerCase() === 'draft') {
    return false;
  }
  if (truthyPublicFlag(pd?.peakupVerifiedTeam) || truthyPublicFlag(pd?.teamApproved)) {
    return true;
  }
  return activeMemberCount > 0;
};

/**
 * GET /api/team-members/:teamId
 */
module.exports = async (req, res) => {
  const teamId = String(req.params.teamId || '').trim();
  let activeCoachIds = [];
  let fetchError = null;

  try {
    if (!teamId) {
      res.status(400).json({ message: 'teamId is required.' });
      return;
    }

    const { teamUser, members, activeCoachIds: rosterIds } = await fetchTeamRosterMembers(teamId);
    activeCoachIds = rosterIds;
    const teamPd = teamUser?.attributes?.profile?.publicData || {};

    if (!isPublicTeamRosterAccessible(teamPd, activeCoachIds.length)) {
      fetchError = 'Team roster is not publicly accessible.';
      // eslint-disable-next-line no-console
      console.log('[PeakUp TEAM PUBLIC COACHES]', {
        teamId,
        activeCoachIds,
        fetchedCoachCount: 0,
        fetchError,
      });
      res.status(404).json({ message: 'Team not found.' });
      return;
    }

    res.status(200).json({
      teamId,
      teamDisplayName: teamUser?.attributes?.profile?.displayName || null,
      activeCoachIds,
      members: members.map(m => ({
        id: m.id?.uuid,
        type: m.type,
        attributes: m.attributes,
        profileImage: m.profileImage || null,
      })),
    });
  } catch (e) {
    fetchError = e?.message || 'Failed to load team members.';
    // eslint-disable-next-line no-console
    console.log('[PeakUp TEAM PUBLIC COACHES]', {
      teamId,
      activeCoachIds,
      fetchedCoachCount: 0,
      fetchError,
    });
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: fetchError });
  }
};
