const { getRootURL } = require('./rootURL');
const { getPeakUpHqAdminNotifyEmails } = require('./peakupHqAdminNotifyEmails');
const { sendTransactionalEmail, getConfiguredProvider } = require('./peakupTransactionalEmail');

const formatDateTime = iso => {
  if (!iso) {
    return new Date().toISOString();
  }
  try {
    return new Date(iso).toISOString();
  } catch (e) {
    return String(iso);
  }
};

const buildDetailLines = fields => {
  const lines = [];
  fields.forEach(({ label, value }) => {
    const normalized = value == null ? '' : String(value).trim();
    if (normalized) {
      lines.push(`${label}: ${normalized}`);
    }
  });
  return lines;
};

const escapeHtml = value =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildEmailHtml = ({ eyebrow, title, intro, detailLines, reviewLink, reviewLabel }) => {
  const rows = detailLines
    .map(line => {
      const [label, ...rest] = line.split(': ');
      const value = rest.join(': ');
      return `<tr><td style="padding:6px 0;color:#9ca8b8;font-size:12px;vertical-align:top;width:38%;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#f4f6fa;font-size:14px;line-height:1.5;">${escapeHtml(value)}</td></tr>`;
    })
    .join('');

  const ctaBlock = reviewLink
    ? `<a href="${escapeHtml(reviewLink)}" style="display:inline-block;margin-top:18px;padding:12px 20px;border-radius:999px;background:linear-gradient(135deg,#9dff4f 0%,#22e6b8 100%);color:#0b1220;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(reviewLabel || 'Open in admin')}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#060a12;font-family:Arial,Helvetica,sans-serif;color:#f4f6fa;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#060a12;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#101826;border:1px solid rgba(94,245,214,0.18);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;">
                <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9dff4f;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.6;color:#d8e0ea;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
                  ${rows}
                </table>
                ${ctaBlock}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const sendToAdminRecipients = async ({ subject, text, html, tags, logPrefix }) => {
  const recipients = getPeakUpHqAdminNotifyEmails();
  if (recipients.length === 0) {
    const error = 'No PeakUp HQ admin notification recipients configured.';
    console.warn(`[${logPrefix}] ${error}`);
    return { success: false, sent: 0, failed: 0, recipients: [], error };
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const to of recipients) {
    try {
      const result = await sendTransactionalEmail({ to, subject, text, html, tags });
      sent += 1;
      console.info(
        `[${logPrefix}] Sent to=${to} provider=${result.provider} messageId=${result.messageId || 'n/a'}`
      );
    } catch (error) {
      failed += 1;
      errors.push(`${to}: ${error.message}`);
      console.error(`[${logPrefix}] Failed to=${to} error=${error.message}`);
    }
  }

  return {
    success: sent > 0,
    sent,
    failed,
    recipients,
    error: errors.length > 0 ? errors.join('; ') : null,
    provider: getConfiguredProvider(),
  };
};

/**
 * @param {object} payload
 * @returns {{ subject: string, text: string, html: string, reviewLink: string|null }}
 */
const buildCoachProfessionalSignupEmailContent = payload => {
  const rootUrl = getRootURL();
  const reviewLink = `${rootUrl}/admin/coach-applications`;
  const submittedAt = formatDateTime(payload.submittedAt);
  const sports = payload.sports || payload.mainSport || '';
  const location = [payload.cityArea, payload.country].filter(Boolean).join(', ');

  const detailLines = buildDetailLines([
    { label: 'First name', value: payload.firstName },
    { label: 'Last name', value: payload.lastName },
    { label: 'Email', value: payload.email },
    { label: 'Phone', value: payload.phone },
    { label: 'Sports', value: sports },
    { label: 'Location', value: location },
    { label: 'User ID', value: payload.userId },
    { label: 'Signup date', value: submittedAt },
  ]);

  const subject = 'New Professional Signup – PeakUp';
  const text = [
    'A new Professional account was created on PeakUp.',
    '',
    ...detailLines,
    '',
    `Review applications: ${reviewLink}`,
    '',
    'PeakUp',
  ].join('\n');

  const html = buildEmailHtml({
    eyebrow: 'PeakUp Admin',
    title: subject,
    intro: 'A new Professional account was created and is entering the coach onboarding flow.',
    detailLines,
    reviewLink,
    reviewLabel: 'Open coach applications',
  });

  return { subject, text, html, reviewLink };
};

/**
 * @param {object} payload
 * @returns {{ subject: string, text: string, html: string, reviewLink: string|null }}
 */
const buildCoachProfessionalApplicationEmailContent = payload => {
  const rootUrl = getRootURL();
  const reviewLink = payload.applicationId
    ? `${rootUrl}/admin/coach-applications/${payload.applicationId}`
    : `${rootUrl}/admin/coach-applications`;
  const submittedAt = formatDateTime(payload.submittedAt);
  const sports = [payload.mainSport, payload.otherSports].filter(Boolean).join(', ');
  const location = [payload.cityArea, payload.country].filter(Boolean).join(', ');
  const nameParts = String(payload.fullName || '').trim().split(/\s+/);
  const firstName = payload.firstName || nameParts[0] || '';
  const lastName = payload.lastName || nameParts.slice(1).join(' ') || '';

  const detailLines = buildDetailLines([
    { label: 'First name', value: firstName },
    { label: 'Last name', value: lastName },
    { label: 'Email', value: payload.email },
    { label: 'Phone', value: payload.phone },
    { label: 'Sports', value: sports },
    { label: 'Location', value: location },
    { label: 'Application ID', value: payload.applicationId },
    { label: 'User ID', value: payload.applicantUserId },
    { label: 'Submitted', value: submittedAt },
  ]);

  const subject = 'New Professional Application Ready for Review – PeakUp';
  const text = [
    'A Professional application was submitted and is ready for review.',
    '',
    ...detailLines,
    '',
    `Review application: ${reviewLink}`,
    '',
    'PeakUp',
  ].join('\n');

  const html = buildEmailHtml({
    eyebrow: 'PeakUp Admin',
    title: subject,
    intro: 'A Professional application was submitted and is ready for manual review.',
    detailLines,
    reviewLink,
    reviewLabel: 'Review application',
  });

  return { subject, text, html, reviewLink };
};

/**
 * Notify HQ admins of a new coach/professional signup (non-blocking safe).
 *
 * @param {object} payload
 * @returns {Promise<object>}
 */
const sendCoachProfessionalSignupAdminEmail = async payload => {
  const { subject, text, html } = buildCoachProfessionalSignupEmailContent(payload);
  return sendToAdminRecipients({
    subject,
    text,
    html,
    tags: ['coach-professional-signup-admin'],
    logPrefix: 'PeakUp Coach Signup Admin Notify',
  });
};

/**
 * Notify HQ admins of a submitted coach/professional application (non-blocking safe).
 *
 * @param {object} payload
 * @returns {Promise<object>}
 */
const sendCoachProfessionalApplicationAdminEmail = async payload => {
  const { subject, text, html } = buildCoachProfessionalApplicationEmailContent(payload);
  return sendToAdminRecipients({
    subject,
    text,
    html,
    tags: ['coach-professional-application-admin'],
    logPrefix: 'PeakUp Coach Application Admin Notify',
  });
};

module.exports = {
  buildCoachProfessionalSignupEmailContent,
  buildCoachProfessionalApplicationEmailContent,
  sendCoachProfessionalSignupAdminEmail,
  sendCoachProfessionalApplicationAdminEmail,
};
