const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CASES_DIR = path.join(__dirname, '..', 'data', 'cancellation-cases');

const CASE_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REFUND_PENDING: 'refund_pending',
  DISMISSED: 'dismissed',
  CANCELLED: 'cancelled',
};

const INACTIVE_CASE_STATUSES = new Set([
  CASE_STATUSES.RESOLVED,
  CASE_STATUSES.CLOSED,
  CASE_STATUSES.DISMISSED,
  CASE_STATUSES.CANCELLED,
]);

const URGENCY_LEVELS = {
  NORMAL: 'normal',
  HIGH: 'high',
};

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const casePathForId = id => path.join(CASES_DIR, `${path.basename(id)}.json`);

const readCaseFile = filePath => {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeCaseFile = (filePath, record) => {
  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
};

/**
 * @param {string} [status]
 * @returns {boolean}
 */
const isActiveCaseStatus = status => {
  if (!status) {
    return true;
  }
  return !INACTIVE_CASE_STATUSES.has(status);
};

/**
 * Backfill missing fields on older JSON records.
 *
 * @param {Object} record
 * @returns {Object}
 */
const normalizeCaseRecord = record => ({
  ...record,
  status: record.status || CASE_STATUSES.OPEN,
  urgency: record.urgency || URGENCY_LEVELS.NORMAL,
  adminNotes: record.adminNotes || '',
  refundStatus: record.refundStatus || 'pending_review',
  reassignmentStatus: record.reassignmentStatus || 'not_started',
  resolvedAt: record.resolvedAt || null,
  dismissedAt: record.dismissedAt || null,
  reopenedAt: record.reopenedAt || null,
});

const toListItem = record => {
  const normalized = normalizeCaseRecord(record);
  return {
    id: normalized.id,
    status: normalized.status,
    urgency: normalized.urgency,
    reason: normalized.reason,
    coachUserId: normalized.coachUserId,
    coachName: normalized.coachName,
    customerName: normalized.customerName,
    sessionTitle: normalized.sessionTitle,
    transactionId: normalized.transactionId,
    bookingAt: normalized.bookingAt,
    bookingStatus: normalized.bookingStatus,
    refundStatus: normalized.refundStatus,
    reassignmentStatus: normalized.reassignmentStatus,
    cancellationOutcome: normalized.cancellationOutcome,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    resolvedAt: normalized.resolvedAt,
    dismissedAt: normalized.dismissedAt,
    reopenedAt: normalized.reopenedAt,
  };
};

const listCaseFiles = () => {
  ensureDir(CASES_DIR);
  return fs
    .readdirSync(CASES_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => path.join(CASES_DIR, name));
};

const applyStatusTransitionFields = (record, nextStatus) => {
  const now = new Date().toISOString();
  const previousStatus = record.status;

  if (!nextStatus || nextStatus === previousStatus) {
    return {};
  }

  if (nextStatus === CASE_STATUSES.RESOLVED || nextStatus === CASE_STATUSES.CLOSED) {
    return {
      resolvedAt: now,
      dismissedAt: null,
    };
  }

  if (nextStatus === CASE_STATUSES.DISMISSED || nextStatus === CASE_STATUSES.CANCELLED) {
    return {
      dismissedAt: now,
      resolvedAt: null,
    };
  }

  if (isActiveCaseStatus(nextStatus) && !isActiveCaseStatus(previousStatus)) {
    return {
      status: CASE_STATUSES.OPEN,
      reopenedAt: now,
      resolvedAt: null,
      dismissedAt: null,
    };
  }

  return {};
};

/**
 * @param {Object} payload
 * @returns {Object}
 */
const createCancellationCase = payload => {
  ensureDir(CASES_DIR);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const record = normalizeCaseRecord({
    id,
    status: CASE_STATUSES.OPEN,
    urgency: payload.urgency || URGENCY_LEVELS.NORMAL,
    reason: payload.reason || 'coach_calendar_block',
    coachUserId: payload.coachUserId,
    coachName: payload.coachName || '',
    customerUserId: payload.customerUserId || '',
    customerName: payload.customerName || '',
    customerEmail: payload.customerEmail || '',
    transactionId: payload.transactionId,
    sessionTitle: payload.sessionTitle || '',
    bookingAt: payload.bookingAt || '',
    bookingStatus: payload.bookingStatus || '',
    blockSummary: payload.blockSummary || null,
    cancellationOutcome: payload.cancellationOutcome || 'pending',
    refundStatus: 'pending_review',
    reassignmentStatus: 'not_started',
    customerNotified: Boolean(payload.customerNotified),
    emailSent: Boolean(payload.emailSent),
    messageSent: Boolean(payload.messageSent),
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    dismissedAt: null,
    reopenedAt: null,
  });

  writeCaseFile(casePathForId(id), record);
  return record;
};

const listCancellationCases = () =>
  listCaseFiles()
    .map(readCaseFile)
    .filter(Boolean)
    .map(normalizeCaseRecord)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(toListItem);

const getCancellationCase = id => {
  const record = readCaseFile(casePathForId(id));
  if (!record) {
    const err = new Error('Cancellation case not found');
    err.status = 404;
    throw err;
  }
  return normalizeCaseRecord(record);
};

const patchCancellationCase = (id, patch) => {
  const record = getCancellationCase(id);
  const nextStatus = patch.status ?? record.status;
  const statusFields =
    patch.status !== undefined ? applyStatusTransitionFields(record, nextStatus) : {};

  const next = normalizeCaseRecord({
    ...record,
    ...patch,
    ...statusFields,
    status: statusFields.status || nextStatus,
    updatedAt: new Date().toISOString(),
  });

  writeCaseFile(casePathForId(id), next);
  return next;
};

const resolveCancellationCase = (id, patch = {}) =>
  patchCancellationCase(id, {
    ...patch,
    status: CASE_STATUSES.RESOLVED,
    resolvedAt: new Date().toISOString(),
    dismissedAt: null,
  });

const dismissCancellationCase = (id, patch = {}) =>
  patchCancellationCase(id, {
    ...patch,
    status: CASE_STATUSES.DISMISSED,
    dismissedAt: new Date().toISOString(),
    resolvedAt: null,
  });

const reopenCancellationCase = (id, patch = {}) =>
  patchCancellationCase(id, {
    ...patch,
    status: CASE_STATUSES.OPEN,
    reopenedAt: new Date().toISOString(),
    resolvedAt: null,
    dismissedAt: null,
  });

const deleteCancellationCase = id => {
  const filePath = casePathForId(id);
  if (!fs.existsSync(filePath)) {
    const err = new Error('Cancellation case not found');
    err.status = 404;
    throw err;
  }
  fs.unlinkSync(filePath);
  return { id, deleted: true };
};

const countRecentCasesForCoach = (coachUserId, withinDays = 30) => {
  const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
  return listCaseFiles()
    .map(readCaseFile)
    .filter(record => record?.coachUserId === coachUserId)
    .filter(record => new Date(record.createdAt).getTime() >= cutoff).length;
};

module.exports = {
  CASE_STATUSES,
  INACTIVE_CASE_STATUSES,
  URGENCY_LEVELS,
  isActiveCaseStatus,
  normalizeCaseRecord,
  createCancellationCase,
  listCancellationCases,
  getCancellationCase,
  patchCancellationCase,
  resolveCancellationCase,
  dismissCancellationCase,
  reopenCancellationCase,
  deleteCancellationCase,
  countRecentCasesForCoach,
};
