const { getSdk } = require('../api-util/sdk');
const {
  listTakenReferralCodes,
  saveAmbassadorActivation,
} = require('../api-util/ambassadorActivationStore');
const { validateActivationRequest } = require('../api-util/ambassadorActivationLogic');
const { sendAmbassadorWelcomeEmail } = require('../api-util/ambassadorWelcomeEmail');

const getRequestOrigin = req => {
  const host = req.get('x-forwarded-host') || req.get('host');
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'https';
  return host ? `${protocol}://${host}` : '';
};

const buildReferralLink = (req, code) => {
  const origin = getRequestOrigin(req);
  const normalized = String(code || '').trim();
  if (!origin) {
    return `/join?ref=${encodeURIComponent(normalized)}`;
  }
  return `${origin}/join?ref=${encodeURIComponent(normalized)}`;
};

const buildReferralCenterLink = req => {
  const origin = getRequestOrigin(req);
  return origin ? `${origin}/referral-center` : '/referral-center';
};

module.exports = async (req, res) => {
  try {
    if (!req.body?.acceptTerms) {
      res.status(400).json({ message: 'Ambassador Program terms must be accepted.' });
      return;
    }

    const sdk = getSdk(req, res);
    const currentUserResponse = await sdk.currentUser.show();
    const currentUser = currentUserResponse?.data?.data;

    const takenCodes = listTakenReferralCodes();
    const activation = validateActivationRequest({
      currentUser,
      takenCodes,
    });

    await sdk.currentUser.updateProfile({
      publicData: activation.publicData,
    });

    const referralLink = buildReferralLink(req, activation.referralCode);
    const referralCenterLink = buildReferralCenterLink(req);

    const welcomeEmail = await sendAmbassadorWelcomeEmail({
      to: activation.email,
      coachName: activation.displayName,
      referralCode: activation.referralCode,
      referralLink,
      referralCenterLink,
      ambassadorTier: 'bronze',
      rewardsUnlocked: false,
    });

    const record = saveAmbassadorActivation({
      userId: activation.userId,
      coachName: activation.displayName,
      email: activation.email,
      referralCode: activation.referralCode,
      ambassadorTier: 'bronze',
      ambassadorRewardsUnlocked: false,
      activatedAt: activation.joinedAt,
      referralLink,
      welcomeEmailSentAt: welcomeEmail.success ? welcomeEmail.sentAt : null,
      welcomeEmailError: welcomeEmail.success ? null : welcomeEmail.error,
    });

    res.status(201).json({
      ok: true,
      activation: {
        id: record.id,
        ambassadorActive: true,
        ambassadorTier: 'bronze',
        ambassadorRewardsUnlocked: false,
        ambassadorJoinedAt: activation.joinedAt,
        ambassadorReferralCode: activation.referralCode,
        referralLink,
      },
    });
  } catch (error) {
    const status = error.status && Number.isFinite(error.status) ? error.status : 500;
    console.error('[ambassador-activation] Failed:', error);
    res.status(status).json({ message: error.message || 'Ambassador activation failed.' });
  }
};
