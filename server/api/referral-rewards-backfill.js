const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { getTrustedSdk } = require('../api-util/sdk');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const { runReferralRewardBackfill } = require('../api-util/referralRewardBackfill');

const parseBoolean = value => value === true || value === 'true' || value === 1 || value === '1';

const probeTransactionsQuery = async sdk => {
  await sdk.transactions.query({ page: 1, perPage: 1 });
};

/**
 * Prefer Integration API (admin token). Fall back to trusted Marketplace SDK when the
 * request carries a logged-in HQ session (browser cookie).
 */
const resolveBackfillSdk = async req => {
  try {
    const integrationSdk = getIntegrationSdk();
    await probeTransactionsQuery(integrationSdk);
    return { sdk: integrationSdk, source: 'integration' };
  } catch (integrationError) {
    const status = integrationError?.status || integrationError?.response?.status;
    const integrationUnavailable = status === 401 || status === 403;

    if (!integrationUnavailable) {
      throw integrationError;
    }

    try {
      const trustedSdk = await getTrustedSdk(req);
      await probeTransactionsQuery(trustedSdk);
      return { sdk: trustedSdk, source: 'trusted_session' };
    } catch (sessionError) {
      const err = new Error(
        'Referral reward backfill requires Sharetribe Integration API credentials ' +
          '(SHARETRIBE_INTEGRATION_CLIENT_ID + SHARETRIBE_INTEGRATION_CLIENT_SECRET) or an ' +
          'authenticated HQ admin browser session on this request.'
      );
      err.status = 503;
      throw err;
    }
  }
};

const runBackfillHandler = async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const query = req.query || {};

    const providerId = String(body.providerId || query.providerId || '').trim() || undefined;
    const transactionId =
      String(body.transactionId || query.transactionId || '').trim() || undefined;
    const dryRun = parseBoolean(body.dryRun ?? query.dryRun);
    const maxPages = Number(body.maxPages || query.maxPages || 50);

    const { sdk, source } = await resolveBackfillSdk(req);
    const summary = await runReferralRewardBackfill(sdk, {
      providerId,
      transactionId,
      dryRun,
      maxPages: Number.isFinite(maxPages) && maxPages > 0 ? maxPages : 50,
    });

    res.status(200).json({ ...summary, sdkSource: source });
  } catch (error) {
    console.error('[referral-rewards-backfill] failed:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Referral reward backfill failed.',
    });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  runBackfill: runBackfillHandler,
};
