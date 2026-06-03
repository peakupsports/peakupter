const { getIntegrationSdk, integrationTypes } = require('./integrationSdk');
const {
  formatSharetribeSdkError,
  logCancelStep,
  logCancelStepError,
} = require('./coachBlockCancellationSdk');

/**
 * Run operator transition(s) on a transaction via Sharetribe Integration API.
 *
 * @param {string} transactionId
 * @param {string} transition
 * @param {string|null} chainedTransition
 * @returns {Promise<{ transitionsRun: string[] }>}
 */
const runIntegrationOperatorEventCancelTransitions = async (
  transactionId,
  transition,
  chainedTransition
) => {
  const integrationSdk = getIntegrationSdk();
  const id = new integrationTypes.UUID(transactionId);
  const transitionsRun = [];

  logCancelStep(`integration operator transition transactionId=${transactionId}`, {
    transition,
    sdk: 'integration',
  });

  try {
    await integrationSdk.transactions.transition({
      id,
      transition,
      params: {},
    });
    transitionsRun.push(transition);
    logCancelStep(`integration operator transition success transactionId=${transactionId}`, {
      transition,
    });
  } catch (error) {
    logCancelStepError(`integration operator transition transactionId=${transactionId}`, error, {
      transition,
    });
    throw error;
  }

  if (chainedTransition) {
    logCancelStep(`integration operator chained transition transactionId=${transactionId}`, {
      transition: chainedTransition,
      sdk: 'integration',
    });

    try {
      await integrationSdk.transactions.transition({
        id,
        transition: chainedTransition,
        params: {},
      });
      transitionsRun.push(chainedTransition);
      logCancelStep(`integration operator chained transition success transactionId=${transactionId}`, {
        transition: chainedTransition,
      });
    } catch (error) {
      logCancelStepError(
        `integration operator chained transition transactionId=${transactionId}`,
        error,
        { transition: chainedTransition, priorTransition: transition }
      );
      throw error;
    }
  }

  return { transitionsRun };
};

/**
 * @param {Error|Object} error
 * @returns {string}
 */
const formatOperatorTransitionError = error => formatSharetribeSdkError(error);

module.exports = {
  runIntegrationOperatorEventCancelTransitions,
  formatOperatorTransitionError,
};
