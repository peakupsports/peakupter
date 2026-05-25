const path = require('path');
const {
  listCoachApplications,
  getCoachApplication,
  updateCoachApplicationStatus,
  deleteCoachApplication,
  resolveDocumentFile,
} = require('../api-util/coachApplicationStore');
const { syncReferralOnApplicationStatusChange } = require('../api-util/referralTracking');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const guessMimeType = fileName => {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.pdf') {
    return 'application/pdf';
  }
  if (ext === '.png') {
    return 'image/png';
  }
  if (ext === '.webp') {
    return 'image/webp';
  }
  if (ext === '.jpg' || ext === '.jpeg') {
    return 'image/jpeg';
  }
  return 'application/octet-stream';
};

/** GET /api/coach-applications */
const listApplications = (req, res) => {
  try {
    const applications = listCoachApplications();
    res.status(200).json({ applications });
  } catch (e) {
    console.error('[coach-applications] list failed:', e);
    res.status(500).json({ message: e.message || 'Failed to list applications' });
  }
};

/** GET /api/coach-applications/:id */
const getApplication = (req, res) => {
  try {
    const application = getCoachApplication(req.params.id);
    res.status(200).json({ application });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load application' });
  }
};

/** PATCH /api/coach-applications/:id/status */
const patchStatus = (req, res) => {
  try {
    const { status } = req.body || {};
    const application = updateCoachApplicationStatus(req.params.id, status);
    syncReferralOnApplicationStatusChange(application);
    res.status(200).json({ application });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to update status' });
  }
};

/** DELETE /api/coach-applications/:id */
const deleteApplication = (req, res) => {
  try {
    const result = deleteCoachApplication(req.params.id);
    res.status(200).json({ deleted: true, id: result.id });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to delete application' });
  }
};

/** GET /api/coach-applications/:id/documents/:filename */
const getDocument = (req, res) => {
  try {
    const { filePath, fileName } = resolveDocumentFile(req.params.id, req.params.filename);
    const record = getCoachApplication(req.params.id);
    const meta = (record.savedFiles || []).find(f => f.fileName === fileName);
    const mimeType = meta?.mimeType || guessMimeType(fileName);
    const downloadName = meta?.originalName || fileName;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${downloadName.replace(/"/g, '')}"`);
    res.sendFile(filePath);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load document' });
  }
};

const express = require('express');
const adminRouter = express.Router({ mergeParams: true });

adminRouter.use(requireCoachApplicationAdmin);
adminRouter.use(express.json({ limit: '64kb' }));
adminRouter.get('/', listApplications);
adminRouter.get('/:id/documents/:filename', getDocument);
adminRouter.delete('/:id', deleteApplication);
adminRouter.get('/:id', getApplication);
adminRouter.patch('/:id/status', patchStatus);

module.exports = adminRouter;
