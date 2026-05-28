const { getSdk } = require('../api-util/sdk');
const {
  fetchTeamRosterManage,
  searchCoachesForTeamInvite,
  inviteCoachToTeam,
  cancelTeamCoachInvite,
  removeTeamCoachMember,
  respondToTeamInvite,
  fetchCoachPendingTeamInvites,
} = require('../api-util/teamRosterSharetribe');

const isTeamUser = user => {
  const ut = user?.attributes?.profile?.publicData?.userType;
  return (
    String(ut || '')
      .trim()
      .toLowerCase() === 'team'
  );
};

const isCoachAccount = user => {
  const pd = user?.attributes?.profile?.publicData || {};
  const ut = String(pd.userType || '')
    .trim()
    .toLowerCase();
  return ut !== 'team' && ut !== 'customer';
};

const requireTeamUser = async (req, res) => {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse?.data?.data;
  if (!currentUser?.id?.uuid) {
    res.status(401).json({ message: 'Sign in to manage your team coaches.' });
    return null;
  }
  if (!isTeamUser(currentUser)) {
    res.status(403).json({ message: 'Only team accounts can manage coaches.' });
    return null;
  }
  return currentUser;
};

const requireCoachUser = async (req, res) => {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUser = currentUserResponse?.data?.data;
  if (!currentUser?.id?.uuid) {
    res.status(401).json({ message: 'Sign in to respond to team invitations.' });
    return null;
  }
  if (!isCoachAccount(currentUser)) {
    res.status(403).json({ message: 'Only coach accounts can respond to team invitations.' });
    return null;
  }
  return currentUser;
};

/** GET /api/team-roster/manage */
const getManage = async (req, res) => {
  try {
    const currentUser = await requireTeamUser(req, res);
    if (!currentUser) {
      return;
    }
    const result = await fetchTeamRosterManage(currentUser.id.uuid);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load team coaches.' });
  }
};

/** GET /api/team-roster/search?q= */
const search = async (req, res) => {
  try {
    const currentUser = await requireTeamUser(req, res);
    if (!currentUser) {
      return;
    }
    const q = String(req.query?.q || '').trim();
    if (!q) {
      res.status(400).json({ message: 'Search query is required.' });
      return;
    }
    const coaches = await searchCoachesForTeamInvite(q);
    res.status(200).json({ coaches });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Coach search failed.' });
  }
};

/** POST /api/team-roster/invite { coachId } */
const invite = async (req, res) => {
  try {
    const currentUser = await requireTeamUser(req, res);
    if (!currentUser) {
      return;
    }
    const coachId = String(req.body?.coachId || '').trim();
    if (!coachId) {
      res.status(400).json({ message: 'coachId is required.' });
      return;
    }
    const result = await inviteCoachToTeam(currentUser.id.uuid, coachId);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({
      message: e.message || 'Failed to send invitation.',
      code: e.code || undefined,
    });
  }
};

/** POST /api/team-roster/invite/cancel { coachId } */
const cancelInvite = async (req, res) => {
  try {
    const currentUser = await requireTeamUser(req, res);
    if (!currentUser) {
      return;
    }
    const coachId = String(req.body?.coachId || '').trim();
    if (!coachId) {
      res.status(400).json({ message: 'coachId is required.' });
      return;
    }
    const result = await cancelTeamCoachInvite(currentUser.id.uuid, coachId);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to cancel invitation.' });
  }
};

/** POST /api/team-roster/member/remove { coachId } */
const removeMember = async (req, res) => {
  try {
    const currentUser = await requireTeamUser(req, res);
    if (!currentUser) {
      return;
    }
    const coachId = String(req.body?.coachId || '').trim();
    if (!coachId) {
      res.status(400).json({ message: 'coachId is required.' });
      return;
    }
    const result = await removeTeamCoachMember(currentUser.id.uuid, coachId);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to remove coach.' });
  }
};

/** POST /api/team-roster/respond { teamId, action: accept|decline } */
const respondInvite = async (req, res) => {
  try {
    const currentUser = await requireCoachUser(req, res);
    if (!currentUser) {
      return;
    }
    const teamId = String(req.body?.teamId || '').trim();
    const action = String(req.body?.action || '').trim();
    if (!teamId) {
      res.status(400).json({ message: 'teamId is required.' });
      return;
    }
    const result = await respondToTeamInvite(currentUser.id.uuid, teamId, action);
    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to respond to invitation.' });
  }
};

/** GET /api/team-roster/my-invites */
const myInvites = async (req, res) => {
  try {
    const currentUser = await requireCoachUser(req, res);
    if (!currentUser) {
      return;
    }
    const invites = await fetchCoachPendingTeamInvites(currentUser.id.uuid);
    res.status(200).json({ invites });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load invitations.' });
  }
};

module.exports = {
  getManage,
  search,
  invite,
  cancelInvite,
  removeMember,
  respondInvite,
  myInvites,
};
