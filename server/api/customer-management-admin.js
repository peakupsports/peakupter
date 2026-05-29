const { requireCoachApplicationAdmin } = require('../api-util/coachApplicationAdminAuth');
const { listCustomersForAdmin } = require('../api-util/customerManagementAdminSharetribe');

/** GET /api/customer-management-admin */
const listCustomers = async (req, res) => {
  try {
    const q = String(req.query?.q || '').trim();
    const maxPages = Number(req.query?.maxPages || 50);
    const debugUserId = String(req.query?.debugUserId || '').trim();
    const debugEmail = String(req.query?.debugEmail || '').trim();

    const result = await listCustomersForAdmin({
      q,
      maxPages: Number.isFinite(maxPages) ? maxPages : 50,
      debugUserId: debugUserId || undefined,
      debugEmail: debugEmail || undefined,
    });

    res.status(200).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to load customers.' });
  }
};

module.exports = {
  requireCoachApplicationAdmin,
  listCustomers,
};
