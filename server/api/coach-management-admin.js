const { getSdk } = require('../api-util/sdk');
const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const { isPeakUpHqAdminUser } = require('../api-util/peakUpHqAdminAuth');
const {
  listVerifiedCoachesForAdmin,
  setPartnerPriority,
  clearPartnerPriority,
} = require('../api-util/coachManagementAdminSharetribe');

const resolveAssignedBy = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;
    if (currentUser?.id?.uuid) {
      return currentUser.id.uuid;
    }
  } catch (e) {
    // token-only admin
  }
  return 'hq_admin';
};

/** GET /api/coach-management-admin */
const listCoaches = async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const sport = String(req.query?.sport || '').trim();
    const country = String(req.query?.country || '').trim();
    const tier = String(req.query?.tier || '').trim();
    const partnerOnly =
      req.query?.partnerOnly === 'true' || req.query?.partnerOnly === '1';
    const maxPages = Number(req.query?.maxPages || 25);

    const result = await listVerifiedCoachesForAdmin({
      q,
      sport,
      country,
      tier,
      partnerOnly,
      maxPages: Number.isFinite(maxPages) ? maxPages : 25,
    });

    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load coaches.' });
  }
};

/** POST /api/coach-management-admin/partner-priority */
const assignPartnerPriority = async (req, res) => {
  try {
    const coachId = String(req.body?.coachId || '').trim();
    if (!coachId) {
      res.status(400).json({ message: 'coachId is required.' });
      return;
    }
    const assignedBy = await resolveAssignedBy(req, res);
    const coach = await setPartnerPriority(coachId, {
      level: req.body?.level,
      reason: req.body?.reason,
      until: req.body?.until || null,
      assignedBy,
    });
    res.status(200).json({ coach });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({
      message: e.message || 'Failed to assign partner priority.',
      code: e.code || undefined,
    });
  }
};

/** POST /api/coach-management-admin/partner-priority/clear */
const removePartnerPriority = async (req, res) => {
  try {
    const coachId = String(req.body?.coachId || '').trim();
    if (!coachId) {
      res.status(400).json({ message: 'coachId is required.' });
      return;
    }
    const coach = await clearPartnerPriority(coachId);
    res.status(200).json({ coach });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to clear partner priority.' });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  listCoaches,
  assignPartnerPriority,
  removePartnerPriority,
  isPeakUpHqAdminUser,
};
