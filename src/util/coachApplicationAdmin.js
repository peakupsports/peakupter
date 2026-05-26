/**
 * Client helpers for PeakUp HQ admin API routes.
 *
 * Authorized HQ users (see peakupAdmin.js) can call admin APIs via Sharetribe session.
 * COACH_APPLICATION_ADMIN_TOKEN in .env is a dev/fallback when not signed in as HQ admin.
 */

import { apiBaseUrl } from './api';

export const ADMIN_TOKEN_STORAGE_KEY = 'peakupCoachApplicationAdminToken';

export const APPLICATION_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEED_MORE_INFO: 'need_more_info',
};

export const STATUS_LABEL_IDS = {
  [APPLICATION_STATUSES.PENDING]: 'AdminCoachApplicationsPage.statusPending',
  [APPLICATION_STATUSES.APPROVED]: 'AdminCoachApplicationsPage.statusApproved',
  [APPLICATION_STATUSES.REJECTED]: 'AdminCoachApplicationsPage.statusRejected',
  [APPLICATION_STATUSES.NEED_MORE_INFO]: 'AdminCoachApplicationsPage.statusNeedMoreInfo',
};

export const getStoredAdminToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
};

export const setStoredAdminToken = token => {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } else {
    window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
};

export const adminFetch = async (path, options = {}) => {
  const token = getStoredAdminToken();
  const url = `${apiBaseUrl()}${path}`;
  const headers = {
    ...(options.headers || {}),
    'X-PeakUp-Admin-Token': token || '',
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await window.fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = res.headers.get('Content-Type') || '';
  const isJson = contentType.includes('application/json');

  if (res.status >= 400) {
    const parsed = isJson ? await res.json().catch(() => ({})) : {};
    const err = new Error(parsed.message || res.statusText || 'Request failed');
    err.status = res.status;
    err.data = parsed;
    throw err;
  }

  if (isJson) {
    return res.json();
  }
  return res;
};

export const fetchCoachApplicationsList = () =>
  adminFetch('/api/coach-applications').then(data => data.applications || []);

export const fetchAmbassadorActivationsList = () =>
  adminFetch('/api/ambassador-activations').then(data => data.activations || []);

export const fetchAmbassadorAdminOverview = () =>
  adminFetch('/api/ambassador-admin/overview').then(data => data.overview);

export const fetchCoachApplicationDetail = id =>
  adminFetch(`/api/coach-applications/${encodeURIComponent(id)}`).then(data => data.application);

export const patchCoachApplicationStatus = (id, status) =>
  adminFetch(`/api/coach-applications/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then(data => data.application);

export const deleteCoachApplication = id =>
  adminFetch(`/api/coach-applications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(data => data);

/**
 * URL to open/download a document (includes admin token query for new-tab access).
 */
export const coachApplicationDocumentUrl = (applicationId, fileName) => {
  const token = getStoredAdminToken();
  const base = `${apiBaseUrl()}/api/coach-applications/${encodeURIComponent(applicationId)}/documents/${encodeURIComponent(fileName)}`;
  if (!token) {
    return base;
  }
  return `${base}?adminToken=${encodeURIComponent(token)}`;
};

export const formatApplicationType = application => {
  if (application.interestedInAmbassador) {
    return 'ambassador_interest';
  }
  if (application.applyingIndependently) {
    return 'independent';
  }
  if (application.ambassadorReferralCode) {
    return 'referral';
  }
  return 'standard';
};
