/**
 * MVP reward earned email — logs structured payload until transactional email is wired.
 *
 * @param {object} payload
 */
const sendAmbassadorRewardEarnedEmail = payload => {
  const message = {
    to: payload.to,
    subject: 'You earned an ambassador reward on PeakUp',
    coachName: payload.coachName,
    referredCoachName: payload.referredCoachName,
    rewardFormatted: payload.rewardFormatted,
    ambassadorPercent: payload.ambassadorPercent,
    body: [
      `Hi ${payload.coachName},`,
      '',
      `Great news — ${payload.referredCoachName} completed a paid booking on PeakUp.`,
      '',
      `Your ambassador reward: ${payload.rewardFormatted} (${payload.ambassadorPercent}% of professional net payout).`,
      '',
      'View your earnings and reward history in the Referral Center.',
      '',
      'PeakUp Team',
    ].join('\n'),
  };

  console.info('[referral-reward-accrual] reward-earned-email', JSON.stringify(message, null, 2));

  const notifyEmail =
    process.env.AMBASSADOR_WELCOME_NOTIFY_EMAIL || process.env.COACH_APPLICATION_NOTIFY_EMAIL;
  if (notifyEmail) {
    console.info(`[referral-reward-accrual] reward email queued for ${payload.to} (notify: ${notifyEmail})`);
  }

  return {
    sentAt: new Date().toISOString(),
    message,
  };
};

module.exports = {
  sendAmbassadorRewardEarnedEmail,
};
