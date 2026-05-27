// These helpers are calling this template's own server-side routes
// so, they are not directly calling Marketplace API or Integration API.
// You can find these api endpoints from 'server/api/...' directory

import appSettings from '../config/settings';
import { types as sdkTypes, transit } from './sdkLoader';
import Decimal from 'decimal.js';

export const apiBaseUrl = marketplaceRootURL => {
  // In development the API server runs on a separate port (default 3500).
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.REACT_APP_DEV_API_SERVER_PORT || '3500';
    return `http://localhost:${port}`;
  }

  // Otherwise, use the given marketplaceRootURL parameter or the same domain and port as the frontend
  return marketplaceRootURL ? marketplaceRootURL.replace(/\/$/, '') : `${window.location.origin}`;
};

// Application type handlers for JS SDK.
//
// NOTE: keep in sync with `typeHandlers` in `server/api-util/sdk.js`
export const typeHandlers = [
  // Use Decimal type instead of SDK's BigDecimal.
  {
    type: sdkTypes.BigDecimal,
    customType: Decimal,
    writer: v => new sdkTypes.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

const serialize = data => {
  return transit.write(data, { typeHandlers, verbose: appSettings.sdk.transitVerbose });
};

const deserialize = str => {
  return transit.read(str, { typeHandlers });
};

const methods = {
  POST: 'POST',
  GET: 'GET',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
};

// If server/api returns data from SDK, you should set Content-Type to 'application/transit+json'
const request = (path, options = {}) => {
  const url = `${apiBaseUrl()}${path}`;
  const { credentials, headers, body, ...rest } = options;

  // If headers are not set, we assume that the body should be serialized as transit format.
  const shouldSerializeBody =
    (!headers || headers['Content-Type'] === 'application/transit+json') && body;
  const bodyMaybe = shouldSerializeBody ? { body: serialize(body) } : {};

  const fetchOptions = {
    credentials: credentials || 'include',
    // Since server/api mostly talks to Marketplace API using SDK,
    // we default to 'application/transit+json' as content type (as SDK uses transit).
    headers: headers || { 'Content-Type': 'application/transit+json' },
    ...bodyMaybe,
    ...rest,
  };

  return window.fetch(url, fetchOptions).then(res => {
    const contentTypeHeader = res.headers.get('Content-Type');
    const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;

    if (res.status >= 400) {
      return res.json().then(data => {
        const message =
          typeof data?.message === 'string'
            ? data.message
            : typeof data?.statusText === 'string'
            ? data.statusText
            : 'Request failed';
        const err = new Error(message);
        err.status = res.status;
        err.statusText = data?.statusText || res.statusText;
        err.data = data;
        throw err;
      });
    }
    if (contentType === 'application/transit+json') {
      return res.text().then(deserialize);
    } else if (contentType === 'application/json') {
      return res.json();
    }
    return res.text();
  });
};

const postJsonToLocalApi = (path, body) => {
  const url = `${apiBaseUrl()}${path}`;
  return window
    .fetch(url, {
      method: methods.POST,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(async res => {
      const contentTypeHeader = res.headers.get('Content-Type');
      const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;
      const parsed = contentType === 'application/json' ? await res.json().catch(() => ({})) : {};

      if (res.status >= 400) {
        const err = new Error(parsed.message || res.statusText || 'Request failed');
        err.status = res.status;
        err.data = parsed;
        throw err;
      }
      return parsed;
    });
};

const getJsonFromLocalApi = path => {
  const url = `${apiBaseUrl()}${path}`;
  return window
    .fetch(url, {
      method: methods.GET,
      credentials: 'include',
    })
    .then(async res => {
      const contentTypeHeader = res.headers.get('Content-Type');
      const contentType = contentTypeHeader ? contentTypeHeader.split(';')[0] : null;
      const parsed = contentType === 'application/json' ? await res.json().catch(() => ({})) : {};

      if (res.status >= 400) {
        const err = new Error(parsed.message || res.statusText || 'Request failed');
        err.status = res.status;
        err.data = parsed;
        throw err;
      }
      return parsed;
    });
};

// Keep the previous parameter order for the post method.
// For now, only POST has own specific function, but you can create more or use request directly.
const post = (path, body, options = {}) => {
  const requestOptions = {
    ...options,
    method: methods.POST,
    body,
  };

  return request(path, requestOptions);
};

// Fetch transaction line items from the local API endpoint.
//
// See `server/api/transaction-line-items.js` to see what data should
// be sent in the body.
export const transactionLineItems = body => {
  return post('/api/transaction-line-items', body);
};

// Initiate a privileged transaction.
//
// With privileged transitions, the transactions need to be created
// from the backend. This endpoint enables sending the order data to
// the local backend, and passing that to the Marketplace API.
//
// See `server/api/initiate-privileged.js` to see what data should be
// sent in the body.
export const initiatePrivileged = body => {
  return post('/api/initiate-privileged', body);
};

// Transition a transaction with a privileged transition.
//
// This is similar to the `initiatePrivileged` above. It will use the
// backend for the transition. The backend endpoint will add the
// payment line items to the transition params.
//
// See `server/api/transition-privileged.js` to see what data should
// be sent in the body.
export const transitionPrivileged = body => {
  return post('/api/transition-privileged', body);
};

// Create user with identity provider (e.g. Facebook or Google)
//
// If loginWithIdp api call fails and user can't authenticate to Marketplace API with idp
// we will show option to create a new user with idp.
// For that user needs to confirm data fetched from the idp.
// After the confirmation, this endpoint is called to create a new user with confirmed data.
//
// See `server/api/auth/createUserWithIdp.js` to see what data should
// be sent in the body.
export const createUserWithIdp = body => {
  return post('/api/auth/create-user-with-idp', body);
};

// Check if user can be deleted and then delete the user. Endpoint logic
// must be modified to accommodate the transaction processes used in
// the marketplace.
export const deleteUserAccount = body => {
  return post('/api/delete-account', body);
};

/** Reserves overlapping PeakUp time slots server-side until TTL (single-node memory). */
export const peakupBookingHoldReserve = body =>
  postJsonToLocalApi('/api/peakup/booking-hold', body);

/** Releases a slot reservation when the shopper leaves checkout or clears the PeakUp cart. */
export const peakupBookingHoldRelease = body =>
  postJsonToLocalApi('/api/peakup/booking-hold/release', body);

/** Submit PeakUp coach application (multipart fields + base64 documents). */
export const submitCoachApplication = body =>
  postJsonToLocalApi('/api/coach-application', body);

/** Activate Ambassador Program for the logged-in verified coach. */
export const activateAmbassadorProgram = body =>
  postJsonToLocalApi('/api/ambassador-activation', body);

/** Live Referral Center dashboard for active ambassadors. */
export const fetchReferralCenterDashboard = () => getJsonFromLocalApi('/api/referral-center');

/** Public ambassadors for Ambassador Program “Meet our Ambassadors” section. */
export const fetchAmbassadorsShowcase = () => getJsonFromLocalApi('/api/ambassadors-showcase');
