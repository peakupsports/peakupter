const { saveCoachApplicationSubmission } = require('../api-util/coachApplicationStore');

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

module.exports = (req, res) => {
  try {
    validatePayload(req.body);
    const result = saveCoachApplicationSubmission(req.body);

    const notifyEmail = process.env.COACH_APPLICATION_NOTIFY_EMAIL;
    if (notifyEmail) {
      console.info(
        `[coach-application] New submission ${result.id} for ${req.body.email} — notify: ${notifyEmail}`
      );
    } else {
      console.info(`[coach-application] New submission ${result.id} saved at ${result.dir}`);
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
