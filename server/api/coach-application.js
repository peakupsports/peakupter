const { getSdk } = require('../api-util/sdk');
const { saveCoachApplicationSubmission, getCoachApplication } = require('../api-util/coachApplicationStore');
const { trackCoachApplicationReferral } = require('../api-util/referralTracking');
const { sendCoachProfessionalApplicationAdminEmail } = require('../api-util/coachProfessionalAdminNotifyEmail');

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

    try {
      await sdk.currentUser.updateProfile({
        publicData: {
          pendingCoachApplication: false,
        },
      });
    } catch (profileError) {
      console.warn(
        `[coach-application] Could not clear pendingCoachApplication for user ${currentUser.id.uuid}:`,
        profileError?.message || profileError
      );
    }

    console.info(
      `[coach-application] New submission ${result.id} saved for user ${currentUser.id.uuid} at ${result.dir}`
    );

    sendCoachProfessionalApplicationAdminEmail({
      applicationId: result.id,
      fullName: application?.fullName || payload.fullName,
      email: accountEmail,
      phone: application?.phone || payload.phone,
      country: application?.country || payload.country,
      cityArea: application?.cityArea || payload.cityArea,
      mainSport: application?.mainSport || payload.mainSport,
      otherSports: application?.otherSports || payload.otherSports,
      applicantUserId: currentUser.id.uuid,
      submittedAt: application?.submittedAt,
    }).catch(emailError => {
      console.error(
        `[coach-application] Admin notification email failed for submission ${result.id}:`,
        emailError?.message || emailError
      );
    });

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
