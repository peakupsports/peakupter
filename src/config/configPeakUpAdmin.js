/**
 * PeakUp HQ admin access — client-safe allowlists.
 *
 * Admins are granted when ANY of these match:
 * - `publicData.peakUpHqAdmin === true` on the user profile (set in Sharetribe Console)
 * - User id is listed in REACT_APP_PEAKUP_HQ_ADMIN_USER_IDS (comma-separated UUIDs)
 * - Email is listed in REACT_APP_PEAKUP_HQ_ADMIN_EMAILS (comma-separated)
 * - Email in `developmentHqAdminEmails` (local dev fallback only — see below)
 */

const parseCsv = value =>
  (value || '')
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean);

export const parseAdminEmails = value =>
  (value || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

/**
 * Dev-only HQ admin emails compiled into the client bundle.
 * TEMP: primary owner login — update if your Sharetribe email differs.
 * Also set REACT_APP_PEAKUP_HQ_ADMIN_EMAILS in .env.development and restart yarn dev.
 */
export const developmentHqAdminEmails = parseAdminEmails('giangiomac@gmail.com');

export default {
  userIds: parseCsv(process.env.REACT_APP_PEAKUP_HQ_ADMIN_USER_IDS),
  emails: parseAdminEmails(process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS),
  developmentHqAdminEmails,
};
