export const TEAM_INVITATION_THREAD_TYPE = 'team_invitation';

const READ_AT_STORAGE_PREFIX = 'peakupTeamInvitationReadAt';

/**
 * @param {string} teamId
 * @returns {string}
 */
export const getTeamInvitationThreadId = teamId =>
  `${TEAM_INVITATION_THREAD_TYPE}:${String(teamId || '').trim()}`;

/**
 * @param {string} userId
 * @param {string} teamId
 * @returns {string|null}
 */
export const getTeamInvitationReadAt = (userId, teamId) => {
  if (typeof window === 'undefined' || !userId || !teamId) {
    return null;
  }
  try {
    return window.sessionStorage.getItem(`${READ_AT_STORAGE_PREFIX}:${userId}:${teamId}`);
  } catch (e) {
    return null;
  }
};

/**
 * @param {string} userId
 * @param {string} teamId
 * @param {string} [readAt]
 */
export const markTeamInvitationReadAt = (userId, teamId, readAt = new Date().toISOString()) => {
  if (typeof window === 'undefined' || !userId || !teamId) {
    return;
  }
  try {
    window.sessionStorage.setItem(`${READ_AT_STORAGE_PREFIX}:${userId}:${teamId}`, readAt);
  } catch (e) {
    // Ignore quota / privacy errors.
  }
};

/**
 * @param {string} userId
 * @param {Object} invite
 * @returns {boolean}
 */
export const isTeamInvitationUnread = (userId, invite) => {
  const teamId = String(invite?.teamId || '').trim();
  if (!userId || !teamId) {
    return false;
  }
  const invitedAt = invite?.invitedAt || invite?.peakupTeamInvitationInboxAt || null;
  if (!invitedAt) {
    return true;
  }
  const readAt = getTeamInvitationReadAt(userId, teamId);
  if (!readAt) {
    return true;
  }
  return new Date(invitedAt).getTime() > new Date(readAt).getTime();
};

/**
 * @param {string} userId
 * @param {Array<Object>} invites
 * @returns {string[]}
 */
export const getUnreadTeamInvitationIds = (userId, invites = []) =>
  (Array.isArray(invites) ? invites : [])
    .filter(invite => isTeamInvitationUnread(userId, invite))
    .map(invite => String(invite?.teamId || '').trim())
    .filter(Boolean);

/**
 * @param {string} userId
 * @param {Array<Object>} invites
 * @returns {number}
 */
export const countUnreadTeamInvitations = (userId, invites = []) =>
  getUnreadTeamInvitationIds(userId, invites).length;

/**
 * @param {Object} params
 */
export const logTeamInvitationInboxEvent = params => {
  if (typeof console === 'undefined') {
    return;
  }
  // eslint-disable-next-line no-console
  console.log('[PeakUp TEAM INVITATION INBOX]', params);
};
