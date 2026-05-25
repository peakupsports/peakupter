const { getSdk, getTrustedSdk } = require('../api-util/sdk');
const { buildReferralCenterDashboard } = require('../api-util/referralCenterService');

const truthy = value => value === true || value === 'true' || value === 1 || value === '1';

module.exports = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser?.id) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }

    const publicData = currentUser.attributes?.profile?.publicData || {};
    if (!truthy(publicData.ambassadorActive)) {
      res.status(403).json({ message: 'Ambassador access required.' });
      return;
    }

    const trustedSdk = await getTrustedSdk(req);
    const dashboard = await buildReferralCenterDashboard({ sdk, trustedSdk, currentUser });

    res.status(200).json({ ok: true, dashboard });
  } catch (error) {
    console.error('[referral-center] dashboard failed:', error);
    res.status(500).json({ message: error.message || 'Failed to load referral center dashboard.' });
  }
};
