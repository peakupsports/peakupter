const express = require('express');
const {
  APPLICATION_STATUSES,
  listTeamApplications,
  getTeamApplication,
  updateTeamApplicationStatus,
  updateTeamApplicationApplicantUserId,
} = require('../api-util/teamApplicationStore');
const { applyTeamApprovalToSharetribe } = require('../api-util/teamApprovalSharetribe');
const { syncTeamRoster } = require('../api-util/teamRosterSharetribe');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');

const router = express.Router();

router.use(requireCoachApplicationAdmin);

router.get('/', (req, res) => {
  try {
    res.status(200).json({ applications: listTeamApplications() });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Failed to list team applications' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const application = getTeamApplication(req.params.id);
    res.status(200).json({ application });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load application' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const existing = getTeamApplication(req.params.id);

    let approvalResult = null;
    if (
      status === APPLICATION_STATUSES.APPROVED &&
      existing.status !== APPLICATION_STATUSES.APPROVED
    ) {
      approvalResult = await applyTeamApprovalToSharetribe(existing);
      if (approvalResult?.userId && !String(existing.applicantUserId || '').trim()) {
        updateTeamApplicationApplicantUserId(req.params.id, approvalResult.userId);
      }
      const rosterIds = Array.isArray(existing.intendedRosterCoachIds)
        ? existing.intendedRosterCoachIds
        : [];
      if (approvalResult?.userId && rosterIds.length > 0) {
        await syncTeamRoster(approvalResult.userId, rosterIds, existing.teamName);
      }
    }

    let application = updateTeamApplicationStatus(req.params.id, status);
    if (approvalResult?.userId && !String(application.applicantUserId || '').trim()) {
      application = { ...application, applicantUserId: approvalResult.userId };
    }
    res.status(200).json({ application, approvalResult });
  } catch (e) {
    console.error('[team-applications] status update failed:', e);
    const statusCode = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(statusCode).json({
      message: e.message || 'Failed to update status',
      sharetribeStep: e.sharetribeStep || null,
    });
  }
});

module.exports = router;
