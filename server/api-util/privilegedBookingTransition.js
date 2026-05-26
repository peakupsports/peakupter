/**
 * Operator-privileged booking transitions (same pattern as transition-privileged.js).
 */

const { getSdk, getTrustedSdk, fetchCommission } = require('./sdk');
const { transactionLineItems } = require('./lineItems');
const { omitPeakupInternalParams } = require('./peakupParams');
const {
  formatSharetribeSdkError,
  logCancelStep,
  logCancelStepError,
} = require('./coachBlockCancellationSdk');

const findIncludedEntity = (included, type, id) =>
  (included || []).find(entity => entity.type === type && entity.id?.uuid === id?.uuid);

const buildOrderDataFromTransaction = (transaction, listing, booking) => {
  const { start, end, displayStart, displayEnd } = booking?.attributes || {};
  const currency =
    transaction?.attributes?.payinTotal?.currency ||
    listing?.attributes?.price?.currency ||
    'EUR';

  return {
    bookingStart: displayStart || start,
    bookingEnd: displayEnd || end,
    currency,
  };
};

/**
 * Run operator-only transitions (e.g. transition/operator-decline) via trusted SDK.
 * Provider cancellations use the coach session SDK in coachBlockCancellation.js.
 *
 * @param {Object} req Express request (session cookies)
 * @param {Object} res Express response
 * @param {string} transactionId
 * @param {string} transition
 * @returns {Promise<void>}
 */
const runPrivilegedBookingTransition = async (req, res, transactionId, transition) => {
  logCancelStep(`privilegedTransition start transactionId=${transactionId}`, { transition });

  const sdk = getSdk(req, res);

  logCancelStep(`transaction.show transactionId=${transactionId}`);
  const showResponse = await sdk.transactions.show({
    id: transactionId,
    include: ['listing', 'booking'],
  });

  const transaction = showResponse?.data?.data;
  const included = showResponse?.data?.included || [];
  const listingId = transaction?.relationships?.listing?.data?.id;
  const bookingId = transaction?.relationships?.booking?.data?.id;
  const listing = findIncludedEntity(included, 'listing', listingId);
  const booking = findIncludedEntity(included, 'booking', bookingId);

  if (!transaction || !listing || !booking) {
    const err = new Error('Transaction, listing, or booking data missing for privileged transition');
    err.status = 422;
    throw err;
  }

  logCancelStep(`fetchCommission transactionId=${transactionId}`);
  const commissionResponse = await fetchCommission(sdk);
  const commissionAsset = commissionResponse?.data?.data?.[0];
  const { providerCommission, customerCommission } =
    commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

  const orderData = buildOrderDataFromTransaction(transaction, listing, booking);
  const lineItems = transactionLineItems(
    listing,
    orderData,
    providerCommission,
    customerCommission
  );

  logCancelStep(`createTrustedSdk transactionId=${transactionId}`);
  const trustedSdk = await getTrustedSdk(req);

  const paramsForSdk = omitPeakupInternalParams({});

  logCancelStep(`transition transactionId=${transactionId}`, {
    transition,
    actor: 'operator',
    processName: transaction?.attributes?.processName,
    lastTransition: transaction?.attributes?.lastTransition,
  });

  await trustedSdk.transactions.transition({
    id: transactionId,
    transition,
    params: {
      ...paramsForSdk,
      lineItems,
    },
  });

  logCancelStep(`transition success transactionId=${transactionId}`, { transition });
};

/**
 * @param {Object} req
 * @param {Object} res
 * @param {string} transactionId
 * @param {string} transition
 */
const runPrivilegedBookingTransitionSafe = async (req, res, transactionId, transition) => {
  try {
    await runPrivilegedBookingTransition(req, res, transactionId, transition);
    return { ok: true, error: null };
  } catch (error) {
    logCancelStepError(`privilegedTransition transactionId=${transactionId}`, error, {
      transition,
    });
    return { ok: false, error: formatSharetribeSdkError(error) };
  }
};

module.exports = {
  runPrivilegedBookingTransition,
  runPrivilegedBookingTransitionSafe,
};
