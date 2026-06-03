const { getSdk, getUserToken } = require('./sdk');
const {
  resolveCoachEventCancelTransition,
  isCancelableMultiDayEventTransaction,
  getPurchaseProcessStateInfo,
} = require('./coachEventCancellationProcess');
const { runIntegrationOperatorEventCancelTransitions } = require('./coachEventCancellationOperator');
const {
  createCancellationCase,
  countRecentCasesForCoach,
  URGENCY_LEVELS,
} = require('./cancellationCaseStore');
const { notifyCustomerOfCoachCancellation } = require('./coachBlockCancellationCustomerNotify');
const {
  formatSharetribeSdkError,
  logCancelStep,
  logCancelStepError,
} = require('./coachBlockCancellationSdk');

const verifyCoachOwnsTransaction = (transaction, coachUserId) =>
  transaction?.relationships?.provider?.data?.id?.uuid === coachUserId;

const getIncludedUsers = showResponse => {
  const included = showResponse?.data?.included || [];
  return included.filter(entity => entity.type === 'user');
};

const formatEventAtLabel = sessionMeta => {
  if (sessionMeta?.dateRangeLabel) {
    return sessionMeta.dateRangeLabel;
  }
  if (sessionMeta?.timeLabel && sessionMeta?.dateKey) {
    return `${sessionMeta.dateKey} ${sessionMeta.timeLabel}`.trim();
  }
  return sessionMeta?.dateLabel || '';
};

/**
 * Cancel a Multi-Day Experience event on behalf of the coach via Integration API.
 *
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const cancelCoachCalendarEvent = async ({
  sdk,
  coachUserId,
  coachName,
  transactionId,
  sessionMeta,
}) => {
  logCancelStep(`eventCancel transaction.show transactionId=${transactionId}`, { coachUserId });

  let showResponse;
  try {
    showResponse = await sdk.transactions.show({
      id: transactionId,
      include: ['customer', 'provider', 'listing'],
    });
  } catch (error) {
    logCancelStepError(`eventCancel transaction.show transactionId=${transactionId}`, error);
    throw error;
  }

  const transaction = showResponse?.data?.data;
  const purchaseInfo = getPurchaseProcessStateInfo(transaction);
  const lastTransition = transaction?.attributes?.lastTransition || null;
  const providerId = transaction?.relationships?.provider?.data?.id?.uuid || null;

  // eslint-disable-next-line no-console
  console.log('[PeakUp EVENT CANCEL PROCESS]', {
    transactionId,
    coachUserId,
    providerId,
    providerOwnershipMatch: providerId === coachUserId,
    processName: transaction?.attributes?.processName || null,
    processState: purchaseInfo?.processState || null,
    lastTransition,
    transactionState: transaction?.attributes?.state || null,
  });

  if (!verifyCoachOwnsTransaction(transaction, coachUserId)) {
    const err = new Error('Transaction not found for this coach');
    err.status = 403;
    throw err;
  }

  if (!isCancelableMultiDayEventTransaction(transaction)) {
    const err = new Error(
      `Event cannot be canceled from processState=${purchaseInfo?.processState || 'unknown'}`
    );
    err.status = 422;
    throw err;
  }

  const {
    transition,
    chainedTransition,
    processState,
    cancelCase,
    actor,
    error: resolveError,
  } = resolveCoachEventCancelTransition(transaction);

  // eslint-disable-next-line no-console
  console.log('[PeakUp EVENT CANCEL TRANSITION]', {
    transactionId,
    processState,
    lastTransition,
    cancelCase,
    nextTransition: transition,
    chainedTransition,
    actor,
    sdk: 'integration',
  });

  let transitionError = null;
  let transitionsRun = [];

  if (!transition) {
    transitionError = new Error(resolveError || 'Invalid transition');
  } else {
    try {
      const result = await runIntegrationOperatorEventCancelTransitions(
        transactionId,
        transition,
        chainedTransition
      );
      transitionsRun = result.transitionsRun;
      // eslint-disable-next-line no-console
      console.log('[PeakUp EVENT CANCEL RESULT]', {
        transactionId,
        processState,
        cancelCase,
        transitionsRun,
        cancelled: true,
      });
    } catch (error) {
      logCancelStepError(`eventCancel operator transition transactionId=${transactionId}`, error, {
        transition,
        chainedTransition,
        processState,
        cancelCase,
      });
      transitionError = error;
      // eslint-disable-next-line no-console
      console.log('[PeakUp EVENT CANCEL RESULT]', {
        transactionId,
        processState,
        cancelCase,
        transitionsRun,
        cancelled: false,
        error: formatSharetribeSdkError(error),
      });
    }
  }

  const users = getIncludedUsers(showResponse);
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
    'PeakUp event';

  let messageSent = false;
  let emailSent = false;
  let emailError = null;

  if (!transitionError) {
    const notifyResult = await notifyCustomerOfCoachCancellation({
      coachSdk: sdk,
      transactionId,
      customerEmail,
      customerFirstName,
      cancelContext: 'event',
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
    bookingAt: formatEventAtLabel(sessionMeta),
    bookingStatus: sessionMeta?.statusLabel || processState,
    blockSummary: {
      kind: 'cancel-event',
      cancelCase,
      eventTitle: sessionTitle,
      dateRangeLabel: sessionMeta?.dateRangeLabel || null,
    },
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
    cancelCase,
    transition,
    chainedTransition,
    transitionsRun,
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
const processCoachEventCancellation = async (req, res, body) => {
  const hasSessionToken = Boolean(getUserToken(req));
  logCancelStep('eventCancel currentUser.show', { hasSessionToken });

  const sdk = getSdk(req, res);

  let currentUserResponse;
  try {
    currentUserResponse = await sdk.currentUser.show();
    logCancelStep('eventCancel currentUser.show success', {
      userId: currentUserResponse?.data?.data?.id?.uuid,
    });
  } catch (error) {
    logCancelStepError('eventCancel currentUser.show', error, { hasSessionToken });
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

  const { transactionId, session = null } = body || {};

  if (!transactionId) {
    res.status(400).json({ message: 'No transaction to cancel' });
    return;
  }

  // eslint-disable-next-line no-console
  console.log('[PeakUp EVENT CANCEL API COACH]', {
    coachUserId,
    transactionId,
  });

  try {
    const result = await cancelCoachCalendarEvent({
      sdk,
      coachUserId,
      coachName,
      transactionId,
      sessionMeta: session,
    });

    res.status(200).json({
      ok: true,
      coachUserId,
      cancelledCount: result.cancelled ? 1 : 0,
      pendingCount: result.cancellationPending ? 1 : 0,
      result,
    });
  } catch (error) {
    logCancelStepError(`eventCancel transactionId=${transactionId}`, error);
    const status = error?.status && Number.isFinite(error.status) ? error.status : 500;
    res.status(status).json({
      ok: false,
      message: formatSharetribeSdkError(error),
      transactionId,
    });
  }
};

module.exports = {
  cancelCoachCalendarEvent,
  processCoachEventCancellation,
};
