const { getIntegrationSdk } = require('../api-util/integrationSdk');
const { REWARD_ACCRUAL_TRANSITIONS, processReferralRewardAccrual } = require('../api-util/referralRewardAccrual');

const truthy = v => v === true || v === 'true' || v === 1 || v === '1';

const readHeader = (req, name) => {
  const value = req.get(name);
  return typeof value === 'string' ? value : '';
};

const resolveWebhookSecret = () => String(process.env.PEAKUP_SHARETRIBE_WEBHOOK_SECRET || '').trim();

const extractTransactionId = body => {
  if (!body || typeof body !== 'object') return null;

  const direct =
    body.transactionId ||
    body.transaction_id ||
    body.transaction?.id?.uuid ||
    body.transaction?.id ||
    body.resource?.id?.uuid ||
    body.resourceId?.uuid ||
    body.resourceId;

  const id = typeof direct === 'string' ? direct : null;
  return id && id.trim() ? id.trim() : null;
};

const extractTransitionName = body => {
  if (!body || typeof body !== 'object') return null;
  const direct =
    body.transitionName ||
    body.transition_name ||
    body.transition ||
    body?.resource?.attributes?.lastTransition ||
    null;
  return typeof direct === 'string' && direct.trim() ? direct.trim() : null;
};

module.exports = async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Optional shared-secret auth (best-effort; allow local dev without config).
  const configuredSecret = resolveWebhookSecret();
  const providedSecret =
    readHeader(req, 'X-Peakup-Webhook-Secret') ||
    readHeader(req, 'X-Webhook-Secret') ||
    (readHeader(req, 'Authorization').startsWith('Bearer ')
      ? readHeader(req, 'Authorization').slice('Bearer '.length).trim()
      : '');

  if (configuredSecret && providedSecret !== configuredSecret) {
    console.warn('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName: extractTransitionName(body),
      transactionId: extractTransactionId(body),
      providerId: null,
      accrualExecuted: false,
      skipReason: 'unauthorized_webhook',
    });
    res.status(401).json({ ok: false });
    return;
  }

  const transactionId = extractTransactionId(body);
  const transitionName = extractTransitionName(body);

  if (!transactionId) {
    console.warn('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName,
      transactionId: null,
      providerId: null,
      accrualExecuted: false,
      skipReason: 'missing_transaction_id',
    });
    res.status(200).json({ ok: true });
    return;
  }

  let sdk;
  try {
    sdk = getIntegrationSdk();
  } catch (error) {
    console.error('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName,
      transactionId,
      providerId: null,
      accrualExecuted: false,
      skipReason: 'integration_sdk_unavailable',
      error: error?.message || String(error),
    });
    res.status(200).json({ ok: true });
    return;
  }

  let tx;
  try {
    const response = await sdk.transactions.show({
      id: transactionId,
      include: ['provider', 'customer'],
      'fields.transaction': [
        'processName',
        'lastTransition',
        'transitions',
        'lineItems',
        'payinTotal',
        'payoutTotal',
        'protectedData',
        'metadata',
      ],
    });
    tx = response?.data?.data || null;
  } catch (error) {
    console.error('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName,
      transactionId,
      providerId: null,
      accrualExecuted: false,
      skipReason: 'transaction_show_failed',
      error: error?.message || String(error),
    });
    res.status(200).json({ ok: true });
    return;
  }

  const providerId = tx?.relationships?.provider?.data?.id?.uuid || null;
  const effectiveTransition = transitionName || tx?.attributes?.lastTransition || null;

  if (!effectiveTransition || !REWARD_ACCRUAL_TRANSITIONS.has(effectiveTransition)) {
    console.info('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName: effectiveTransition,
      transactionId,
      providerId,
      accrualExecuted: false,
      skipReason: !effectiveTransition ? 'missing_transition' : 'transition_not_eligible',
    });
    res.status(200).json({ ok: true });
    return;
  }

  try {
    const record = await processReferralRewardAccrual({
      trustedSdk: sdk,
      transitionName: effectiveTransition,
      transaction: tx,
    });

    console.info('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName: effectiveTransition,
      transactionId,
      providerId,
      accrualExecuted: Boolean(record),
      skipReason: record ? null : 'accrual_returned_null',
    });
  } catch (error) {
    console.error('[PeakUp REFERRAL ACCRUAL TRIGGER]', {
      transitionName: effectiveTransition,
      transactionId,
      providerId,
      accrualExecuted: false,
      skipReason: 'accrual_failed',
      error: error?.message || String(error),
    });
  }

  res.status(200).json({ ok: true });
};

