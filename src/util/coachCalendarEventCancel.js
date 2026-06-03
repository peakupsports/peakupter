/**
 * Resolve API URL for coach-event-cancel (Multi-Day Experiences).
 *
 * @returns {string}
 */
export const resolveCoachEventCancelApiUrl = () => {
  const base =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3500' : '';
  return `${base}/api/peakup/coach-event-cancel`;
};

/**
 * @param {Response} response
 * @returns {Promise<Object>}
 */
const parseErrorResponse = async response => {
  const contentType = response.headers.get('Content-Type') || '';

  try {
    if (contentType.includes('application/json')) {
      return response.json();
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
 * Cancel a Multi-Day Experience event via server-side Integration API operator transitions.
 *
 * @param {Object} payload
 * @param {string} payload.transactionId
 * @param {Object} [payload.session]
 * @returns {Promise<Object>}
 */
export const postCoachEventCancel = async payload => {
  const url = resolveCoachEventCancelApiUrl();

  // eslint-disable-next-line no-console
  console.log('[PeakUp EVENT CANCEL SUBMIT PAYLOAD]', payload);

  let response;
  try {
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
        : networkError?.message || 'Network error while cancelling event'
    );
    err.cause = networkError;
    throw err;
  }

  if (!response.ok) {
    const errorBody = await parseErrorResponse(response);
    const message =
      errorBody?.message ||
      errorBody?.result?.transitionError ||
      `Coach event cancellation failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.data = errorBody;
    throw err;
  }

  return response.json();
};
