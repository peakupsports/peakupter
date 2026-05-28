const { getSdk } = require('../api-util/sdk');
const {
  saveTeamApplicationSubmission,
  getTeamApplication,
} = require('../api-util/teamApplicationStore');

const REQUIRED_FIELDS = ['teamName', 'email', 'mainSport'];

const validatePayload = body => {
  const missing = REQUIRED_FIELDS.filter(key => !body?.[key] || !String(body[key]).trim());
  if (missing.length > 0) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }
};

module.exports = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser?.id?.uuid) {
      res.status(401).json({ message: 'Sign in to submit your team application.' });
      return;
    }

    validatePayload(req.body);

    const accountEmail = String(currentUser.attributes?.email || '').trim();
    const payload = {
      ...req.body,
      email: accountEmail,
      applicantUserId: currentUser.id.uuid,
    };

    const result = saveTeamApplicationSubmission(payload);
    const application = getTeamApplication(result.id);

    res.status(201).json({ application });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'Failed to submit team application.' });
  }
};
