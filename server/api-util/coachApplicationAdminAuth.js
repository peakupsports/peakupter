/**
 * MVP admin guard for PeakUp HQ internal API routes (coach applications, ambassadors, etc.).
 *
 * Access is granted when ANY of these match:
 * - Valid X-PeakUp-Admin-Token header matching COACH_APPLICATION_ADMIN_TOKEN (.env)
 * - Authenticated Sharetribe session for an authorized PeakUp HQ user
 *
 * TODO: Replace token hasAnyRole('operator') when marketplace operator auth is wired.
 */

const { getSdk } = require('./sdk');
const { isPeakUpHqAdminUser } = require('./peakUpHqAdminAuth');

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

const requireCoachApplicationAdmin = async (req, res, next) => {
  const expected = getExpectedToken();
  const provided = extractToken(req);

  if (expected && provided && provided === expected) {
    next();
    return;
  }

  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (isPeakUpHqAdminUser(currentUser)) {
      next();
      return;
    }
  } catch (error) {
    // Fall through to token/unauthorized handling below.
  }

  if (!expected) {
    res.status(503).json({
      message:
        'PeakUp HQ admin API is not configured. Set COACH_APPLICATION_ADMIN_TOKEN in .env or sign in as an authorized HQ user.',
    });
    return;
  }

  res.status(401).json({ message: 'Unauthorized' });
};

module.exports = {
  requireCoachApplicationAdmin,
};
