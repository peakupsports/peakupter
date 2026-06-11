const { sendTransactionalEmail, getConfiguredProvider } = require('./peakupTransactionalEmail');

const capitalizeTier = tier =>
  String(tier || 'bronze')
    .trim()
    .charAt(0)
    .toUpperCase() + String(tier || 'bronze').trim().slice(1).toLowerCase();

/**
 * Build plain-text and HTML bodies for the ambassador welcome email.
 *
 * @param {object} payload
 * @returns {{ subject: string, text: string, html: string }}
 */
const buildAmbassadorWelcomeEmailContent = payload => {
  const coachName = payload.coachName || 'there';
  const referralCode = payload.referralCode || '';
  const referralLink = payload.referralLink || '';
  const referralCenterLink = payload.referralCenterLink || '';
  const tierLabel = capitalizeTier(payload.ambassadorTier || 'bronze');
  const rewardsUnlocked = Boolean(payload.rewardsUnlocked);

  const rewardsStatusCopy = rewardsUnlocked
    ? 'Your Bronze ambassador rewards are active — you earn commission on referred professional payouts.'
    : 'Your Bronze rewards are locked until you complete the Bronze tier criteria in your Referral Center. You can still share your code and track referrals now.';

  const subject = 'Welcome to the PeakUp Ambassador Program';

  const text = [
    `Hi ${coachName},`,
    '',
    'Welcome to the PeakUp Ambassador Program.',
    '',
    `Ambassador tier: ${tierLabel}`,
    `Your referral code: ${referralCode}`,
    `Your referral link: ${referralLink}`,
    '',
    rewardsStatusCopy,
    '',
    'How rewards work:',
    'Client payment → Stripe fee → PeakUp platform fee → Professional payout → Ambassador %',
    '',
    'Next steps:',
    `- Open your Referral Center: ${referralCenterLink}`,
    '- Share your referral link with professionals you trust',
    '- Track referrals, progress, and rewards as your network grows',
    '',
    'PeakUp Team',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#060a12;font-family:Arial,Helvetica,sans-serif;color:#f4f6fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060a12;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#101826;border:1px solid rgba(94,245,214,0.18);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9dff4f;">PeakUp Ambassador Program</p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#ffffff;">Welcome, ${coachName}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#d8e0ea;">You're now an active PeakUp Ambassador. Share your code, grow your professional network, and unlock referral rewards.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 18px;">
                <div style="padding:16px 18px;border-radius:14px;background:rgba(0,0,0,0.28);border:1px solid rgba(94,245,214,0.16);">
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca8b8;">Ambassador tier</p>
                  <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:#ffffff;">${tierLabel}</p>
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca8b8;">Referral code</p>
                  <p style="margin:0 0 14px;font-size:24px;font-weight:700;letter-spacing:0.04em;color:#9dff4f;">${referralCode}</p>
                  <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#9ca8b8;">Referral link</p>
                  <p style="margin:0;font-size:14px;line-height:1.5;word-break:break-word;"><a href="${referralLink}" style="color:#22e6b8;text-decoration:none;">${referralLink}</a></p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 18px;">
                <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#d8e0ea;">${rewardsStatusCopy}</p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca8b8;">Client payment → Stripe fee → PeakUp platform fee → Professional payout → Ambassador %</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <a href="${referralCenterLink}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#9dff4f 0%,#22e6b8 100%);color:#0b1220;font-size:14px;font-weight:700;text-decoration:none;">Open Referral Center</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
};

/**
 * Send ambassador welcome email after first successful activation.
 *
 * @param {object} payload
 * @returns {Promise<{ success: boolean, sentAt: string|null, provider: string|null, error: string|null }>}
 */
const sendAmbassadorWelcomeEmail = async payload => {
  const to = String(payload.to || '').trim();
  if (!to) {
    const error = 'Missing recipient email address.';
    console.error(`[PeakUp Ambassador Welcome Email Failed] ${error}`);
    return { success: false, sentAt: null, provider: null, error };
  }

  const { subject, text, html } = buildAmbassadorWelcomeEmailContent(payload);

  try {
    const result = await sendTransactionalEmail({
      to,
      subject,
      text,
      html,
      tags: ['ambassador-welcome'],
    });

    console.info(
      `[PeakUp Ambassador Welcome Email Sent] to=${to} provider=${result.provider} messageId=${result.messageId || 'n/a'}`
    );

    return {
      success: true,
      sentAt: new Date().toISOString(),
      provider: result.provider,
      messageId: result.messageId,
      error: null,
    };
  } catch (error) {
    const provider = getConfiguredProvider() || 'none';
    console.error(
      `[PeakUp Ambassador Welcome Email Failed] to=${to} provider=${provider} error=${error.message}`
    );

    return {
      success: false,
      sentAt: null,
      provider,
      error: error.message,
    };
  }
};

module.exports = {
  buildAmbassadorWelcomeEmailContent,
  sendAmbassadorWelcomeEmail,
};
