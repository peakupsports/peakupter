const { getSdk } = require('../api-util/sdk');
const { sendCoachProfessionalSignupAdminEmail } = require('../api-util/coachProfessionalAdminNotifyEmail');

const PROTECTED_NOTIFY_KEY = 'peakupCoachSignupAdminNotifiedAt';

const isCoachOnboardingUser = publicData =>
  publicData?.coachOnboardingIntent === true || publicData?.pendingCoachApplication === true;

/**
 * POST /api/coach-onboarding-notify
 * Sends a one-time HQ admin email after a Professional (coach) account signup.
 * Does not block signup if email delivery fails.
 */
module.exports = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    if (!currentUser?.id?.uuid) {
      res.status(401).json({ message: 'Sign in required.' });
      return;
    }

    const profile = currentUser.attributes?.profile || {};
    const publicData = profile.publicData || {};
    const protectedData = profile.protectedData || {};

    if (!isCoachOnboardingUser(publicData)) {
      res.status(204).end();
      return;
    }

    if (protectedData[PROTECTED_NOTIFY_KEY]) {
      res.status(204).end();
      return;
    }

    const emailResult = await sendCoachProfessionalSignupAdminEmail({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      email: currentUser.attributes?.email || '',
      phone: protectedData.phoneNumber || profile.phoneNumber || '',
      sports: Array.isArray(publicData.sports) ? publicData.sports.join(', ') : publicData.sports || '',
      country: publicData.country || publicData.peakupCoachProfileCountry || '',
      cityArea: publicData.cityArea || publicData.coachCity || '',
      userId: currentUser.id.uuid,
      submittedAt: new Date().toISOString(),
    });

    if (emailResult.success) {
      try {
        await sdk.currentUser.updateProfile({
          protectedData: {
            ...protectedData,
            [PROTECTED_NOTIFY_KEY]: new Date().toISOString(),
          },
        });
      } catch (profileError) {
        console.warn(
          `[coach-onboarding-notify] Admin email sent but could not persist notify flag for user ${currentUser.id.uuid}:`,
          profileError?.message || profileError
        );
      }
    }

    res.status(emailResult.success ? 200 : 202).json({
      ok: emailResult.success,
      sent: emailResult.sent,
      failed: emailResult.failed,
    });
  } catch (e) {
    console.error('[coach-onboarding-notify] Failed:', e);
    res.status(500).json({ message: e.message || 'Coach onboarding notify failed' });
  }
};
