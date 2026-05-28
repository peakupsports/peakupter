const { fetchTeamRosterMembers } = require('../api-util/teamRosterSharetribe');

const truthyTeamPublic = pd => {
  const truthy = v => v === true || v === 'true' || v === 1;
  if (!truthy(pd?.peakupVerifiedTeam) && !truthy(pd?.teamApproved)) {
    return false;
  }
  return String(pd?.peakupTeamVisibility || 'public').toLowerCase() !== 'draft';
};

/**
 * GET /api/team-members/:teamId
 */
module.exports = async (req, res) => {
  try {
    const teamId = String(req.params.teamId || '').trim();
    if (!teamId) {
      res.status(400).json({ message: 'teamId is required.' });
      return;
    }

    const { teamUser, members } = await fetchTeamRosterMembers(teamId);
    const teamPd = teamUser?.attributes?.profile?.publicData || {};
    if (!truthyTeamPublic(teamPd)) {
      res.status(404).json({ message: 'Team not found.' });
      return;
    }

    res.status(200).json({
      teamId,
      teamDisplayName: teamUser?.attributes?.profile?.displayName || null,
      members: members.map(m => ({
        id: m.id?.uuid,
        type: m.type,
        attributes: m.attributes,
        profileImage: m.profileImage || null,
      })),
    });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load team members.' });
  }
};
