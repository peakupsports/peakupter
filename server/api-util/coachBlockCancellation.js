const { getSdk, getUserToken, getTrustedSdk } = require('./sdk');
const {
  resolveCoachBlockCancelTransition,
  getTransactionProcessDetails,
  isLegacyProcessWithoutProviderCancel,
  isTransitionUnavailable,
  LEGACY_BOOKING_CANCEL_MESSAGE,
} = require('./coachBlockCancellationProcess');
const {
  createCancellationCase,
  countRecentCasesForCoach,
  URGENCY_LEVELS,
} = require('./cancellationCaseStore');
const {
  CUSTOMER_CANCEL_INBOX_MESSAGE,
  notifyCustomerOfCoachCancellation,
} = require('./coachBlockCancellationCustomerNotify');
const {
  formatSharetribeSdkError,
  logCancelStep,
  logCancelStepError,
} = require('./coachBlockCancellationSdk');

const getIncludedUsers = showResponse => {
  const included = showResponse?.data?.included || [];
  const users = included.filter(entity => entity.type === 'user');
  return { included, users };
};

const verifyCoachOwnsTransaction = (transaction, coachUserId) =>
  transaction?.relationships?.provider?.data?.id?.uuid === coachUserId;

const formatBookingAtLabel = (transaction, sessionMeta, bookingEntity) => {
  if (sessionMeta?.dateRangeLabel) {
    return sessionMeta.dateRangeLabel;
  }
  if (sessionMeta?.timeLabel) {
    return `${sessionMeta.dateKey || ''} ${sessionMeta.timeLabel}`.trim();
  }
  const start =
    bookingEntity?.attributes?.displayStart || bookingEntity?.attributes?.start;
  return start ? new Date(start).toISOString() : '';
};

/**
 * Run operator transition(s) via trusted SDK (default-purchase cancel).
 *
 * @param {Object} req
 * @param {string} transactionId
 * @param {string} transition
 * @param {string|null} chainedTransition
 */
const runOperatorCancelTransitions = async (req, transactionId, transition, chainedTransition) => {
  const trustedSdk = await getTrustedSdk(req);

  logCancelStep(`operator transition transactionId=${transactionId}`, {
    transition,
    actor: 'operator',
  });
  await trustedSdk.transactions.transition({
    id: transactionId,
    transition,
    params: {},
  });
  logCancelStep(`operator transition success transactionId=${transactionId}`, { transition });

  if (chainedTransition) {
    logCancelStep(`operator chained transition transactionId=${transactionId}`, {
      transition: chainedTransition,
      actor: 'operator',
    });
    await trustedSdk.transactions.transition({
      id: transactionId,
      transition: chainedTransition,
      params: {},
    });
    logCancelStep(`operator chained transition success transactionId=${transactionId}`, {
      transition: chainedTransition,
    });
  }
};

const findBookingEntity = (showResponse, transaction) => {
  const bookingId = transaction?.relationships?.booking?.data?.id;
  return (showResponse?.data?.included || []).find(
    entity => entity.type === 'booking' && entity.id?.uuid === bookingId?.uuid
  );
};

/**
 * Sharetribe returns transitions valid for this transaction's pinned processVersion
 * (not the latest alias). Used to diagnose "Invalid transition" on older bookings.
 *
 * @param {import('sharetribe-flex-sdk').Instance} sdk
 * @param {string} transactionId
 * @returns {Promise<string[]>}
 */
const queryAvailableTransitionNames = async (sdk, transactionId) => {
  try {
    const response = await sdk.processTransitions.query({ transactionId });
    return (response?.data?.data || [])
      .map(entity => entity?.attributes?.name)
      .filter(Boolean);
  } catch (error) {
    logCancelStepError(`processTransitions.query transactionId=${transactionId}`, error);
    return [];
  }
};

/**
 * @param {Object} params
 * @param {import('sharetribe-flex-sdk').Instance} params.sdk
 * @param {Object} params.req
 * @param {Object} params.res
 * @param {string} params.coachUserId
 * @param {string} params.coachName
 * @param {string} params.transactionId
 * @param {Object|null} params.sessionMeta
 * @param {Object|null} params.blockSummary
 * @param {string|null} [params.cancelSource]
 * @returns {Promise<Object>}
 */
const cancelTransactionForCoachBlock = async ({
  sdk,
  req,
  res,
  coachUserId,
  coachName,
  transactionId,
  sessionMeta,
  blockSummary,
  cancelSource = null,
}) => {
  logCancelStep(`transaction.show transactionId=${transactionId}`);

  let showResponse;
  try {
    showResponse = await sdk.transactions.show({
      id: transactionId,
      include: ['customer', 'provider', 'listing', 'booking'],
    });
  } catch (error) {
    logCancelStepError(`transaction.show transactionId=${transactionId}`, error);
    throw error;
  }

  const transaction = showResponse?.data?.data;
  const processDetails = getTransactionProcessDetails(showResponse, transaction);
  const { processName, processAlias, processVersion, lastTransition, transactionState } =
    processDetails;

  // eslint-disable-next-line no-console
  console.log('[PeakUp CANCEL PROCESS]', {
    transactionId,
    ...processDetails,
  });

  if (!verifyCoachOwnsTransaction(transaction, coachUserId)) {
    const err = new Error('Transaction not found for this coach');
    err.status = 403;
    throw err;
  }

  const {
    transition,
    actor,
    chainedTransition,
    processState,
    error: resolveError,
  } = resolveCoachBlockCancelTransition(transaction);

  const availableTransitions = await queryAvailableTransitionNames(sdk, transactionId);
  const legacyProcess = isLegacyProcessWithoutProviderCancel(transition, availableTransitions);
  const nextTransitionAllowed =
    !transition || availableTransitions.length === 0
      ? null
      : availableTransitions.includes(transition);

  // eslint-disable-next-line no-console
  console.log('[PeakUp CANCEL TRANSITION]', {
    transactionId,
    lastTransition,
    nextTransition: transition,
    processState,
    processName,
    processAlias,
    processVersion,
    transactionState,
    actor,
    chainedTransition,
    availableTransitions,
    legacyProcess,
    nextTransitionAllowed,
  });

  logCancelStep(`resolveTransition transactionId=${transactionId}`, {
    ...processDetails,
    transitionName: transition,
    actor,
    chainedTransition,
    availableTransitions,
    legacyProcess,
    nextTransitionAllowed,
  });

  let transitionError = null;
  const operatorUnavailable =
    actor === 'operator' && isTransitionUnavailable(transition, availableTransitions);

  if (!transition) {
    transitionError = new Error(resolveError || 'Invalid transition');
  } else if (legacyProcess) {
    transitionError = new Error(LEGACY_BOOKING_CANCEL_MESSAGE);
    logCancelStep(`legacy process — skip transition transactionId=${transactionId}`, {
      processName,
      processVersion,
      nextTransition: transition,
      availableTransitions,
    });
  } else if (operatorUnavailable) {
    transitionError = new Error(
      `Operator cancel transition unavailable for lastTransition=${lastTransition || 'unknown'}`
    );
    logCancelStep(`operator transition unavailable transactionId=${transactionId}`, {
      transition,
      availableTransitions,
    });
  } else {
    try {
      if (actor === 'operator') {
        await runOperatorCancelTransitions(req, transactionId, transition, chainedTransition);
      } else {
        logCancelStep(`transition transactionId=${transactionId}`, {
          transition,
          actor: 'provider',
        });
        await sdk.transactions.transition({
          id: transactionId,
          transition,
          params: {},
        });
        logCancelStep(`transition success transactionId=${transactionId}`, { transition });
      }
    } catch (error) {
      logCancelStepError(`transition transactionId=${transactionId}`, error, {
        transition,
        chainedTransition,
        lastTransition,
        processState,
        actor,
      });
      transitionError = error;
    }
  }

  const bookingEntity = findBookingEntity(showResponse, transaction);
  const { users } = getIncludedUsers(showResponse);
  const customerId = transaction?.relationships?.customer?.data?.id?.uuid;
  const customerEntity = users.find(u => u.id?.uuid === customerId);
  const customerEmail = customerEntity?.attributes?.email || '';
  const customerName =
    customerEntity?.attributes?.profile?.displayName ||
    customerEntity?.attributes?.profile?.firstName ||
    sessionMeta?.customerName ||
    '';
  const customerFirstName =
    customerEntity?.attributes?.profile?.firstName ||
    (customerName ? customerName.split(/\s+/)[0] : '') ||
    '';

  const listingIncluded = showResponse?.data?.included?.find(
    entity =>
      entity.type === 'listing' &&
      entity.id?.uuid === transaction?.relationships?.listing?.data?.id?.uuid
  );
  const sessionTitle =
    sessionMeta?.sessionTitle ||
    listingIncluded?.attributes?.title ||
    'PeakUp session';

  let messageSent = false;
  let emailSent = false;
  let emailError = null;

  if (!transitionError) {
    const notifyResult = await notifyCustomerOfCoachCancellation({
      coachSdk: sdk,
      transactionId,
      customerEmail,
      customerFirstName,
      cancelContext: cancelSource === 'event' || sessionMeta?.isEvent ? 'event' : 'session',
    });
    messageSent = notifyResult.messageSent;
    emailSent = notifyResult.emailSent;
    emailError = notifyResult.emailError || null;
  }

  const recentCoachCases = countRecentCasesForCoach(coachUserId, 30);
  const urgency = recentCoachCases >= 2 ? URGENCY_LEVELS.HIGH : URGENCY_LEVELS.NORMAL;

  const cancellationOutcome = transitionError ? 'cancellation_pending' : 'cancelled';

  const cancellationCase = createCancellationCase({
    coachUserId,
    coachName,
    customerUserId: customerId,
    customerName,
    customerEmail,
    transactionId,
    sessionTitle,
    bookingAt: formatBookingAtLabel(transaction, sessionMeta, bookingEntity),
    bookingStatus: sessionMeta?.statusLabel || processState,
    blockSummary,
    urgency,
    cancellationOutcome,
    customerNotified: messageSent || emailSent,
    emailSent,
    messageSent,
  });

  return {
    transactionId,
    processState,
    lastTransition,
    transition,
    actor,
    cancelled: !transitionError,
    cancellationPending: Boolean(transitionError),
    messageSent,
    emailSent,
    emailError,
    transitionError: transitionError ? formatSharetribeSdkError(transitionError) : null,
    caseId: cancellationCase.id,
  };
};

/**
 * @param {Object} req
 * @param {Object} res
 * @param {Object} body
 */
const processCoachBlockCancellations = async (req, res, body) => {
  const hasSessionToken = Boolean(getUserToken(req));
  logCancelStep('currentUser.show', { hasSessionToken });

  const sdk = getSdk(req, res);

  let currentUserResponse;
  try {
    currentUserResponse = await sdk.currentUser.show();
    logCancelStep('currentUser.show success', {
      userId: currentUserResponse?.data?.data?.id?.uuid,
    });
  } catch (error) {
    logCancelStepError('currentUser.show', error, { hasSessionToken });
    const err = new Error(
      hasSessionToken
        ? formatSharetribeSdkError(error)
        : 'Authentication required — session cookie not sent to API server. Ensure you are logged in.'
    );
    err.status = hasSessionToken ? error?.status || 403 : 401;
    throw err;
  }

  const currentUser = currentUserResponse?.data?.data;
  const coachUserId = currentUser?.id?.uuid;

  if (!coachUserId) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const coachName =
    currentUser?.attributes?.profile?.displayName ||
    currentUser?.attributes?.profile?.firstName ||
    'Coach';

  const { transactionIds = [], sessions = [], blockSummary = null, cancelSource = null } =
    body || {};
  const uniqueIds = [...new Set(transactionIds.filter(Boolean))];

  if (!uniqueIds.length) {
    res.status(400).json({ message: 'No transactions to cancel' });
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp BLOCK CANCEL API COACH]', {
    coachUserId,
    transactionCount: uniqueIds.length,
    blockSummary,
  });

  const sessionByTxId = (sessions || []).reduce((map, session) => {
    if (session?.transactionId) {
      map[session.transactionId] = session;
    }
    return map;
  }, {});

  const results = [];
  for (const transactionId of uniqueIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await cancelTransactionForCoachBlock({
        sdk,
        req,
        res,
        coachUserId,
        coachName,
        transactionId,
        sessionMeta: sessionByTxId[transactionId] || null,
        blockSummary,
        cancelSource,
      });
      results.push(result);
    } catch (error) {
      logCancelStepError(`cancelTransaction transactionId=${transactionId}`, error);
      results.push({
        transactionId,
        cancelled: false,
        cancellationPending: true,
        transitionError: formatSharetribeSdkError(error),
      });
    }
  }

  const cancelledCount = results.filter(r => r.cancelled).length;
  const pendingCount = results.filter(r => r.cancellationPending).length;

  res.status(200).json({
    ok: true,
    coachUserId,
    cancelledCount,
    pendingCount,
    results,
    adminCasesCreated: results.map(r => r.caseId).filter(Boolean),
  });
};

module.exports = {
  CUSTOMER_CANCEL_INBOX_MESSAGE,
  processCoachBlockCancellations,
  cancelTransactionForCoachBlock,
  resolveCoachBlockCancelTransition,
};
