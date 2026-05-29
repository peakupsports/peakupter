const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const { listTeamsForAdmin } = require('../api-util/teamManagementAdminSharetribe');

/** GET /api/team-management-admin */
const listTeams = async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const sport = String(req.query?.sport || '').trim();
    const maxPages = Number(req.query?.maxPages || 25);

    const result = await listTeamsForAdmin({
      q,
      sport,
      maxPages: Number.isFinite(maxPages) ? maxPages : 25,
    });

    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load teams.' });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  listTeams,
};
