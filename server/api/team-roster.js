const { getSdk } = require('../api-util/sdk');
const { syncTeamRoster } = require('../api-util/teamRosterSharetribe');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const isTeamUser = user => {
  const ut = user?.attributes?.profile?.publicData?.userType;
  return String(ut || '')
    .trim()
    .toLowerCase() === 'team';
};

/**
 * POST /api/team-roster
 * Body: { memberIds: string[] }
 * Team owner or HQ admin.
 */
module.exports = async (req, res) => {
  try {
    const { memberIds } = req.body || {};
    const adminToken = req.headers['x-peakup-admin-token'];
    const isAdmin =
      adminToken &&
      process.env.COACH_APPLICATION_ADMIN_TOKEN &&
      adminToken === process.env.COACH_APPLICATION_ADMIN_TOKEN;

    let teamUserId = String(req.body?.teamUserId || '').trim();

    if (!isAdmin) {
      const sdk = getSdk(req, res);
      const currentUserResponse = await sdk.currentUser.show();
      const currentUser = currentUserResponse?.data?.data;
      if (!currentUser?.id?.uuid) {
        res.status(401).json({ message: 'Sign in to manage your team roster.' });
        return;
      }
      if (!isTeamUser(currentUser)) {
        res.status(403).json({ message: 'Only team accounts can manage a roster.' });
        return;
      }
      teamUserId = currentUser.id.uuid;
    }

    if (!teamUserId) {
      res.status(400).json({ message: 'teamUserId is required for admin roster updates.' });
      return;
    }

    const ids = Array.isArray(memberIds) ? memberIds : [];
    const result = await syncTeamRoster(teamUserId, ids);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to sync team roster.' });
  }
};

module.exports.requireCoachApplicationAdmin = requireCoachApplicationAdmin;
