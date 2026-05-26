/**
 * Sharetribe SDK helpers for coach block cancellation (logging + errors).
 */

/**
 * @param {Error|Object} error
 * @returns {string}
 */
const formatSharetribeSdkError = error => {
  const apiErrors =
    error?.data?.errors ||
    error?.response?.data?.errors ||
    (Array.isArray(error?.response?.data) ? error.response.data : null);
  if (Array.isArray(apiErrors) && apiErrors.length > 0) {
    const first = apiErrors[0];
    return (
      first?.meta?.message ||
      first?.title ||
      first?.detail ||
      error?.message ||
      'Sharetribe API error'
    );
  }

  return error?.message || error?.statusText || 'Sharetribe API error';
};

/**
 * @param {string} step
 * @param {Object} [detail]
 */
const logCancelStep = (step, detail) => {
  if (detail) {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp BLOCK CANCEL STEP] ${step}`, detail);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[PeakUp BLOCK CANCEL STEP] ${step}`);
  }
};

/**
 * @param {string} step
 * @param {Error|Object} error
 * @param {Object} [detail]
 */
const logCancelStepError = (step, error, detail) => {
  // eslint-disable-next-line no-console
  console.error(`[PeakUp BLOCK CANCEL STEP ERROR] ${step}`, {
    message: formatSharetribeSdkError(error),
    status: error?.status,
    statusText: error?.statusText,
    ...detail,
  });
};

module.exports = {
  formatSharetribeSdkError,
  logCancelStep,
  logCancelStepError,
};
