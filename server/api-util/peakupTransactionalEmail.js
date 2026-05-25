/**
 * PeakUp transactional email — Resend, Postmark, or webhook (e.g. Zapier).
 *
 * Configure one provider via environment variables:
 * - RESEND_API_KEY + PEAKUP_EMAIL_FROM
 * - POSTMARK_SERVER_TOKEN + PEAKUP_EMAIL_FROM
 * - PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_URL (JSON POST)
 */

const getFromAddress = () =>
  process.env.PEAKUP_EMAIL_FROM ||
  process.env.AMBASSADOR_WELCOME_FROM_EMAIL ||
  'PeakUp <noreply@peakupsports.com>';

const getConfiguredProvider = () => {
  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }
  if (process.env.POSTMARK_SERVER_TOKEN) {
    return 'postmark';
  }
  if (process.env.PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_URL) {
    return 'webhook';
  }
  return null;
};

const sendViaResend = async ({ to, subject, html, text, from }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || `Resend API error (${response.status})`);
    err.status = response.status;
    err.data = body;
    throw err;
  }

  return { provider: 'resend', messageId: body?.id || null };
};

const sendViaPostmark = async ({ to, subject, html, text, from }) => {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_SERVER_TOKEN,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || 'outbound',
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.Message || `Postmark API error (${response.status})`);
    err.status = response.status;
    err.data = body;
    throw err;
  }

  return { provider: 'postmark', messageId: body?.MessageID || null };
};

const sendViaWebhook = async ({ to, subject, html, text, from, tags }) => {
  const response = await fetch(process.env.PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      to,
      from,
      subject,
      html,
      text,
      tags: tags || [],
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    const err = new Error(`Webhook email error (${response.status}): ${bodyText}`.trim());
    err.status = response.status;
    throw err;
  }

  return { provider: 'webhook', messageId: null };
};

/**
 * Send a transactional email using the configured provider.
 *
 * @param {object} payload
 * @param {string} payload.to
 * @param {string} payload.subject
 * @param {string} payload.html
 * @param {string} payload.text
 * @param {string} [payload.from]
 * @param {string[]} [payload.tags]
 * @returns {Promise<{ provider: string, messageId: string|null }>}
 */
const sendTransactionalEmail = async payload => {
  const to = String(payload.to || '').trim();
  if (!to) {
    throw new Error('Transactional email recipient is required.');
  }

  const provider = getConfiguredProvider();
  if (!provider) {
    throw new Error(
      'No transactional email provider configured. Set RESEND_API_KEY, POSTMARK_SERVER_TOKEN, or PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_URL.'
    );
  }

  const message = {
    to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    from: payload.from || getFromAddress(),
    tags: payload.tags,
  };

  if (provider === 'resend') {
    return sendViaResend(message);
  }
  if (provider === 'postmark') {
    return sendViaPostmark(message);
  }
  return sendViaWebhook(message);
};

module.exports = {
  getConfiguredProvider,
  getFromAddress,
  sendTransactionalEmail,
};
