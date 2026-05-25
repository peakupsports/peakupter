const { getSdk } = require('../api-util/sdk');
const { saveCoachApplicationSubmission, getCoachApplication } = require('../api-util/coachApplicationStore');
const { trackCoachApplicationReferral } = require('../api-util/referralTracking');

const REQUIRED_FIELDS = ['fullName', 'email', 'phone', 'mainSport'];

const validatePayload = body => {
  const missing = REQUIRED_FIELDS.filter(key => !body?.[key] || !String(body[key]).trim());
  if (missing.length > 0) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}`);
    err.status = 400;
    throw err;
  }

  if (!body.files?.idDocument?.dataBase64 || !body.files?.coachingCertificates?.dataBase64) {
    const err = new Error('ID and coaching certificate uploads are required.');
    err.status = 400;
    throw err;
  }

  if (!body.confirmCorrect || !body.acceptVerification || !body.understandManualReview) {
    const err = new Error('All consent confirmations are required.');
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
      res.status(401).json({ message: 'Sign in to submit your coach application.' });
      return;
    }

    if (!currentUser.attributes?.emailVerified) {
      res.status(403).json({ message: 'Verify your email before submitting your coach application.' });
      return;
    }

    const accountEmail = String(currentUser.attributes?.email || '').trim();
    validatePayload(req.body);

    const payload = {
      ...req.body,
      email: accountEmail,
      applicantUserId: currentUser.id.uuid,
    };

    if (
      req.body.email &&
      String(req.body.email).trim().toLowerCase() !== accountEmail.toLowerCase()
    ) {
      console.warn(
        `[coach-application] Email mismatch for user ${currentUser.id.uuid}: form=${req.body.email} account=${accountEmail}`
      );
    }

    const result = saveCoachApplicationSubmission(payload);
    const application = getCoachApplication(result.id);
    trackCoachApplicationReferral(application);

    const notifyEmail = process.env.COACH_APPLICATION_NOTIFY_EMAIL;
    if (notifyEmail) {
      console.info(
        `[coach-application] New submission ${result.id} for ${accountEmail} (user ${currentUser.id.uuid}) — notify: ${notifyEmail}`
      );
    } else {
      console.info(
        `[coach-application] New submission ${result.id} saved for user ${currentUser.id.uuid} at ${result.dir}`
      );
    }

    res.status(201).json({
      ok: true,
      id: result.id,
      message: 'Application received.',
    });
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    console.error('[coach-application] Failed:', e);
    res.status(status).json({ message: e.message || 'Coach application submission failed' });
  }
};
