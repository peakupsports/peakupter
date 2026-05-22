/**
 * MVP admin guard for coach application review endpoints.
 *
 * TODO: Replace with real marketplace admin authentication (e.g. Sharetribe operator role).
 *
 * Set COACH_APPLICATION_ADMIN_TOKEN in server environment. Clients send the same value via:
 * - Header: X-PeakUp-Admin-Token
 * - Query (document downloads only): adminToken
 */

const getExpectedToken = () => process.env.COACH_APPLICATION_ADMIN_TOKEN || '';

const extractToken = req => {
  const header = req.get('X-PeakUp-Admin-Token');
  if (header) {
    return header;
  }
  if (req.method === 'GET' && req.query?.adminToken) {
    return req.query.adminToken;
  }
  return null;
};

const requireCoachApplicationAdmin = (req, res, next) => {
  const expected = getExpectedToken();
  if (!expected) {
    res.status(503).json({
      message:
        'Coach application admin is not configured. Set COACH_APPLICATION_ADMIN_TOKEN on the server.',
    });
    return;
  }

  const provided = extractToken(req);
  if (!provided || provided !== expected) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
};

module.exports = {
  requireCoachApplicationAdmin,
};
