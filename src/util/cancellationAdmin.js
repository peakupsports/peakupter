/**
 * PeakUp HQ — Cancellation Center admin API helpers.
 */

import { adminFetch } from './coachApplicationAdmin';

export const CANCELLATION_CASE_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REFUND_PENDING: 'refund_pending',
  DISMISSED: 'dismissed',
  CANCELLED: 'cancelled',
};

const INACTIVE_STATUSES = new Set([
  CANCELLATION_CASE_STATUSES.RESOLVED,
  CANCELLATION_CASE_STATUSES.CLOSED,
  CANCELLATION_CASE_STATUSES.DISMISSED,
  CANCELLATION_CASE_STATUSES.CANCELLED,
]);

/** @param {string} [status] */
export const isActiveCancellationCaseStatus = status => {
  if (!status) {
    return true;
  }
  return !INACTIVE_STATUSES.has(status);
};

export const fetchCancellationCasesList = () =>
  adminFetch('/api/cancellation-cases').then(data => data.cases || []);

export const fetchCancellationCaseDetail = id =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}`).then(data => data.case);

export const patchCancellationCase = (id, patch) =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then(data => data.case);

export const resolveCancellationCase = (id, patch = {}) =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify(patch),
  }).then(data => data.case);

export const dismissCancellationCase = (id, patch = {}) =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    body: JSON.stringify(patch),
  }).then(data => data.case);

export const reopenCancellationCase = (id, patch = {}) =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
    body: JSON.stringify(patch),
  }).then(data => data.case);

export const deleteCancellationCase = id =>
  adminFetch(`/api/cancellation-cases/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
