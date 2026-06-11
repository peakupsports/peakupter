const { sendTransactionalEmail } = require('./peakupTransactionalEmail');

const SUBJECT = 'Your PeakUp session has been cancelled';
const EVENT_SUBJECT = 'Your PeakUp event registration has been cancelled';

/**
 * @param {Object} params
 * @param {string} [params.customerFirstName]
 * @param {'session'|'event'} [params.cancelContext]
 * @returns {{ subject: string, text: string, html: string }}
 */
const buildCoachCancellationNotificationEmailContent = ({
  customerFirstName,
  cancelContext = 'session',
}) => {
  const firstName = String(customerFirstName || '').trim();
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const isEvent = cancelContext === 'event';

  const text = isEvent
    ? `${greeting}

Unfortunately, your professional had to cancel the upcoming event.

We understand this can be frustrating and sincerely apologize for the inconvenience.

If your registration was already paid, your refund will be processed according to PeakUp's cancellation policy.

You can discover other experiences anytime on PeakUp Sports.

Thank you for your understanding,
PeakUp Sports Support`
    : `${greeting}

Unfortunately, your professional had to cancel the upcoming session due to a scheduling conflict.

We understand this can be frustrating and sincerely apologize for the inconvenience.

If your booking was already paid, the refund process has already been initiated automatically.

You can reschedule or discover other certified professionals anytime on PeakUp Sports.

Thank you for your understanding,
PeakUp Sports Support`;

  const paragraphs = text
    .split('\n\n')
    .map(
      paragraph =>
        `<p style="margin:0 0 14px;line-height:1.55;">${paragraph.replace(/\n/g, '<br/>')}</p>`
    );

  const html = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#0b1220;max-width:560px;">${paragraphs.join('')}</div>`;

  return { subject: isEvent ? EVENT_SUBJECT : SUBJECT, text, html };
};

/**
 * @param {Object} params
 * @param {string} params.to
 * @param {string} [params.customerFirstName]
 * @param {'session'|'event'} [params.cancelContext]
 * @returns {Promise<{ success: boolean, sentAt?: string, error?: string }>}
 */
const sendCoachCancellationNotificationEmail = async params => {
  const { to, customerFirstName, cancelContext = 'session' } = params;

  if (!to) {
    return { success: false, error: 'Missing customer email' };
  }

  const { subject, text, html } = buildCoachCancellationNotificationEmailContent({
    customerFirstName,
    cancelContext,
  });

  try {
    await sendTransactionalEmail({
      to,
      subject,
      text,
      html,
      tags: [
        cancelContext === 'event' ? 'coach-event-cancel' : 'coach-block-cancel',
        'customer-cancellation',
      ],
    });
    return { success: true, sentAt: new Date().toISOString() };
  } catch (e) {
    return { success: false, error: e.message || 'Email send failed' };
  }
};

module.exports = {
  SUBJECT,
  EVENT_SUBJECT,
  buildCoachCancellationNotificationEmailContent,
  sendCoachCancellationNotificationEmail,
};
