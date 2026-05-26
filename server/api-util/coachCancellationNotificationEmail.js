const { sendTransactionalEmail } = require('./peakupTransactionalEmail');

const SUBJECT = 'Your PeakUp session has been cancelled';

/**
 * @param {Object} params
 * @param {string} [params.customerFirstName]
 * @returns {{ subject: string, text: string, html: string }}
 */
const buildCoachCancellationNotificationEmailContent = ({ customerFirstName }) => {
  const firstName = String(customerFirstName || '').trim();
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

  const text = `${greeting}

Unfortunately, your coach had to cancel the upcoming session due to a scheduling conflict.

We understand this can be frustrating and sincerely apologize for the inconvenience.

If your booking was already paid, the refund process has already been initiated automatically.

You can reschedule or discover other certified coaches anytime on PeakUp Sports.

Thank you for your understanding,
PeakUp Sports Support`;

  const paragraphs = text
    .split('\n\n')
    .map(
      paragraph =>
        `<p style="margin:0 0 14px;line-height:1.55;">${paragraph.replace(/\n/g, '<br/>')}</p>`
    );

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0b1220;max-width:560px;">${paragraphs.join('')}</div>`;

  return { subject: SUBJECT, text, html };
};

/**
 * @param {Object} params
 * @param {string} params.to
 * @param {string} [params.customerFirstName]
 * @returns {Promise<{ success: boolean, sentAt?: string, error?: string }>}
 */
const sendCoachCancellationNotificationEmail = async params => {
  const { to, customerFirstName } = params;

  if (!to) {
    return { success: false, error: 'Missing customer email' };
  }

  const { subject, text, html } = buildCoachCancellationNotificationEmailContent({
    customerFirstName,
  });

  try {
    await sendTransactionalEmail({
      to,
      subject,
      text,
      html,
      tags: ['coach-block-cancel', 'customer-cancellation'],
    });
    return { success: true, sentAt: new Date().toISOString() };
  } catch (e) {
    return { success: false, error: e.message || 'Email send failed' };
  }
};

module.exports = {
  SUBJECT,
  buildCoachCancellationNotificationEmailContent,
  sendCoachCancellationNotificationEmail,
};
