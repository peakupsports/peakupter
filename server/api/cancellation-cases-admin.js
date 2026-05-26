const express = require('express');
const {
  listCancellationCases,
  getCancellationCase,
  patchCancellationCase,
  resolveCancellationCase,
  dismissCancellationCase,
  reopenCancellationCase,
  deleteCancellationCase,
  CASE_STATUSES,
} = require('../api-util/cancellationCaseStore');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const logCaseAction = (tag, id, detail) => {
  // eslint-disable-next-line no-console
  console.log(`[PeakUp CANCELLATION CASE ${tag}]`, { id, ...detail });
};

const logCaseError = (tag, id, error) => {
  // eslint-disable-next-line no-console
  console.error(`[PeakUp CANCELLATION CASE ${tag}]`, {
    id,
    message: error?.message || 'Unknown error',
  });
};

const listCases = (req, res) => {
  try {
    const cases = listCancellationCases();
    res.status(200).json({ cases });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to list cancellation cases' });
  }
};

const getCase = (req, res) => {
  try {
    const cancellationCase = getCancellationCase(req.params.id);
    res.status(200).json({ case: cancellationCase });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load case' });
  }
};

const buildFieldPatch = body => {
  const { adminNotes, refundStatus, reassignmentStatus, urgency, status } = body || {};
  const patch = {};

  if (status && Object.values(CASE_STATUSES).includes(status)) {
    patch.status = status;
  }
  if (typeof adminNotes === 'string') {
    patch.adminNotes = adminNotes;
  }
  if (refundStatus) {
    patch.refundStatus = refundStatus;
  }
  if (reassignmentStatus) {
    patch.reassignmentStatus = reassignmentStatus;
  }
  if (urgency) {
    patch.urgency = urgency;
  }

  return patch;
};

const patchCase = (req, res) => {
  const { id } = req.params;
  try {
    const patch = buildFieldPatch(req.body);
    logCaseAction('UPDATE', id, { fields: Object.keys(patch) });
    const cancellationCase = patchCancellationCase(id, patch);
    logCaseAction('UPDATE', id, { status: 'success', caseStatus: cancellationCase.status });
    res.status(200).json({ case: cancellationCase });
  } catch (e) {
    logCaseError('UPDATE', id, e);
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to update case' });
  }
};

const resolveCase = (req, res) => {
  const { id } = req.params;
  try {
    logCaseAction('RESOLVE', id, { action: 'start' });
    const patch = buildFieldPatch(req.body);
    const cancellationCase = resolveCancellationCase(id, patch);
    logCaseAction('RESOLVE', id, { status: 'success', resolvedAt: cancellationCase.resolvedAt });
    res.status(200).json({ case: cancellationCase });
  } catch (e) {
    logCaseError('RESOLVE', id, e);
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to resolve case' });
  }
};

const dismissCase = (req, res) => {
  const { id } = req.params;
  try {
    logCaseAction('DISMISS', id, { action: 'start' });
    const patch = buildFieldPatch(req.body);
    const cancellationCase = dismissCancellationCase(id, patch);
    logCaseAction('DISMISS', id, { status: 'success', dismissedAt: cancellationCase.dismissedAt });
    res.status(200).json({ case: cancellationCase });
  } catch (e) {
    logCaseError('DISMISS', id, e);
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to dismiss case' });
  }
};

const reopenCase = (req, res) => {
  const { id } = req.params;
  try {
    logCaseAction('REOPEN', id, { action: 'start' });
    const patch = buildFieldPatch(req.body);
    const cancellationCase = reopenCancellationCase(id, patch);
    logCaseAction('REOPEN', id, { status: 'success', reopenedAt: cancellationCase.reopenedAt });
    res.status(200).json({ case: cancellationCase });
  } catch (e) {
    logCaseError('REOPEN', id, e);
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to reopen case' });
  }
};

const deleteCase = (req, res) => {
  const { id } = req.params;
  try {
    logCaseAction('DELETE', id, { action: 'start' });
    const result = deleteCancellationCase(id);
    logCaseAction('DELETE', id, { status: 'success' });
    res.status(200).json(result);
  } catch (e) {
    logCaseError('DELETE', id, e);
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to delete case' });
  }
};

const router = express.Router();
router.use(requireCoachApplicationAdmin);
router.use(express.json({ limit: '256kb' }));
router.get('/', listCases);
router.get('/:id', getCase);
router.patch('/:id', patchCase);
router.post('/:id/resolve', resolveCase);
router.post('/:id/dismiss', dismissCase);
router.post('/:id/reopen', reopenCase);
router.delete('/:id', deleteCase);

module.exports = router;
