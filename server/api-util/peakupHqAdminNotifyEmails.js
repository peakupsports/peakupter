/**
 * Resolve PeakUp HQ admin notification recipients from environment variables.
 *
 * Supports (in order of precedence, deduplicated):
 * - REACT_APP_PEAKUP_HQ_ADMIN_EMAIL (singular — client bundle + server in dev)
 * - PEAKUP_HQ_ADMIN_EMAIL (singular — server / Netlify only)
 * - REACT_APP_PEAKUP_HQ_ADMIN_EMAILS (comma-separated)
 * - PEAKUP_HQ_ADMIN_EMAILS (comma-separated — server / Netlify only)
 * - COACH_APPLICATION_NOTIFY_EMAIL (legacy single notify address)
 */

const parseAdminEmails = value =>
  (value || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * @returns {string[]} Lowercase admin emails for transactional notifications.
 */
const getPeakUpHqAdminNotifyEmails = () => {
  const candidates = [
    process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAIL,
    process.env.PEAKUP_HQ_ADMIN_EMAIL,
    ...parseAdminEmails(process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS),
    ...parseAdminEmails(process.env.PEAKUP_HQ_ADMIN_EMAILS),
    process.env.COACH_APPLICATION_NOTIFY_EMAIL,
  ]
    .map(email => String(email || '').trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(candidates)];
};

module.exports = {
  getPeakUpHqAdminNotifyEmails,
  parseAdminEmails,
};
