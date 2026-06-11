const { sendAmbassadorWelcomeEmail } = require('./ambassadorWelcomeEmail');

/**
 * MVP unlock email — logs structured payload until transactional email is wired.
 *
 * @param {object} payload
 */
const sendAmbassadorRewardsUnlockEmail = payload => {
  const message = {
    to: payload.to,
    subject: 'Bronze rewards unlocked — PeakUp Ambassador Program',
    coachName: payload.coachName,
    tier: payload.tier || 'bronze',
    commissionPercent: payload.commissionPercent || '2%',
    body: [
      `Hi ${payload.coachName},`,
      '',
      'Congratulations — you unlocked Bronze Ambassador rewards on PeakUp.',
      '',
      `Your referral commission is now active at ${payload.commissionPercent || '2%'} on referred professional net payouts.`,
      '',
      'Visit your Referral Center to track referrals, progress, and rewards.',
      '',
      'PeakUp Team',
    ].join('\n'),
  };

  console.info('[ambassador-tier] rewards-unlock-email', JSON.stringify(message, null, 2));

  const notifyEmail =
    process.env.AMBASSADOR_WELCOME_NOTIFY_EMAIL || process.env.COACH_APPLICATION_NOTIFY_EMAIL;
  if (notifyEmail) {
    console.info(`[ambassador-tier] unlock email queued for ${payload.to} (notify: ${notifyEmail})`);
  }

  return {
    sentAt: new Date().toISOString(),
    message,
  };
};

module.exports = {
  sendAmbassadorRewardsUnlockEmail,
};
