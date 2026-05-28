const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const { runLegacyCoachApprovalScan } = require('../api-util/legacyCoachApprovalSharetribe');

const parseBoolean = value => value === true || value === 'true' || value === 1 || value === '1';

const runLegacyCoachApprove = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const query = req.query || {};

    const userId = String(body.userId || query.userId || '').trim() || undefined;
    const dryRun = body.dryRun != null ? parseBoolean(body.dryRun) : query.dryRun != null ? parseBoolean(query.dryRun) : true;
    const maxPages = Number(body.maxPages || query.maxPages || 20);
    const perPage = Number(body.perPage || query.perPage || 100);

    const summary = await runLegacyCoachApprovalScan({
      userId,
      dryRun,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 20,
      perPage: Number.isFinite(perPage) && perPage > 0 ? perPage : 100,
    });

    res.status(200).json(summary);
  } catch (error) {
    console.error('[coach-legacy-approve] failed:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Legacy coach approval failed.',
    });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  runLegacyCoachApprove,
};
