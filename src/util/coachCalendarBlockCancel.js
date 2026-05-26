/**
 * Resolve API URL for coach-block-cancel.
 * In development the API runs on port 3500 (separate from the webpack dev server).
 *
 * @returns {string}
 */
export const resolveCoachBlockCancelApiUrl = () => {
  const base =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3500' : '';
  const url = `${base}/api/peakup/coach-block-cancel`;

  // eslint-disable-next-line no-console
  console.log('[PeakUp BLOCK CANCEL REQUEST URL]', url);

  return url;
};

/**
 * @param {Response} response
 * @returns {Promise<Object>}
 */
const parseErrorResponse = async response => {
  const contentType = response.headers.get('Content-Type') || '';

  try {
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return data;
    }

    const text = await response.text();
    if (text && text.trim().startsWith('{')) {
      return JSON.parse(text);
    }

    return {
      message: text?.slice(0, 300) || `Request failed (${response.status})`,
    };
  } catch (e) {
    return {
      message: `Request failed (${response.status})`,
    };
  }
};

/**
 * @param {Object} errorBody
 * @param {number} status
 * @returns {string}
 */
export const extractCoachBlockCancelErrorMessage = (errorBody, status) =>
  errorBody?.message ||
  errorBody?.statusText ||
  errorBody?.error ||
  (status ? `Coach block cancellation failed (${status})` : 'Coach block cancellation failed');

/**
 * Cancel active bookings when a coach blocks a day or time range.
 *
 * @param {Object} payload
 * @param {string[]} payload.transactionIds
 * @param {Object[]} [payload.sessions]
 * @param {Object|null} [payload.blockSummary]
 * @returns {Promise<Object>}
 */
export const postCoachBlockCancel = async payload => {
  const url = resolveCoachBlockCancelApiUrl();

  // eslint-disable-next-line no-console
  console.log('[PeakUp BLOCK CANCEL SUBMIT PAYLOAD]', payload);

  let response;
  try {
    // eslint-disable-next-line no-console
    console.log('[PeakUp BLOCK CANCEL FETCH START]', url);
    response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    const err = new Error(
      networkError?.message === 'Load failed' || networkError?.message === 'Failed to fetch'
        ? 'Could not reach the PeakUp server. Check that the API server is running and try again.'
        : networkError?.message || 'Network error while cancelling sessions'
    );
    err.cause = networkError;
    throw err;
  }

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    const message =
      errorBody?.message ||
      errorBody?.statusText ||
      errorBody?.error ||
      extractCoachBlockCancelErrorMessage(errorBody, response.status);
    const err = new Error(message);
    err.status = response.status;
    err.data = errorBody;
    // eslint-disable-next-line no-console
    console.error('[PeakUp BLOCK CANCEL SUBMIT ERROR]', {
      status: response.status,
      message,
      errorBody,
    });
    throw err;
  }

  return response.json();
};
