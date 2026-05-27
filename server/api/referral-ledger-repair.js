const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const {
  repairAllReferralLedgerEntries,
  repairReferralLedgerForCoach,
} = require('../api-util/referralLedgerRepair');

const parseBoolean = value => value === true || value === 'true' || value === 1 || value === '1';

const runRepairHandler = (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const query = req.query || {};
    const dryRun = parseBoolean(body.dryRun ?? query.dryRun);
    const repairAll = parseBoolean(body.repairAll ?? query.repairAll);

    const coachUserId = String(body.coachUserId || query.coachUserId || '').trim() || undefined;
    const coachEmail = String(body.coachEmail || query.coachEmail || '').trim() || undefined;
    const applicationId =
      String(body.applicationId || query.applicationId || '').trim() || undefined;

    if (repairAll) {
      const results = repairAllReferralLedgerEntries({ dryRun });
      const repairedCount = results.filter(result => result.repaired).length;
      res.status(200).json({
        ok: true,
        dryRun,
        scanned: results.length,
        repaired: repairedCount,
        results,
      });
      return;
    }

    const result = repairReferralLedgerForCoach(
      { coachUserId, coachEmail, applicationId },
      { dryRun }
    );

    if (!result) {
      res.status(404).json({
        ok: false,
        message: 'No referral ledger entry found for repair.',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      dryRun,
      scanned: 1,
      repaired: result.repaired ? 1 : 0,
      results: [result],
    });
  } catch (error) {
    console.error('[referral-ledger-repair] failed:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Referral ledger repair failed.',
    });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  runRepair: runRepairHandler,
};
