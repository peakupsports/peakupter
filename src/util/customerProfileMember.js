/**
 * PeakUp customer (member) profile helpers — not used by coach figurina / sticker UI.
 */

const CUSTOMER_LEVEL_PUBLIC_DATA_KEYS = [
  'level',
  'skillLevel',
  'memberLevel',
  'customerLevel',
  'playingLevel',
  'skill_level',
];

const LEVEL_MESSAGE_IDS = {
  beginner: 'ProfilePage.memberLevel_beginner',
  intermediate: 'ProfilePage.memberLevel_intermediate',
  advanced: 'ProfilePage.memberLevel_advanced',
  expert: 'ProfilePage.memberLevel_expert',
};

const normalizeLevelToken = raw => {
  if (raw == null) return '';
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
};

/**
 * @param {import('./reactIntl').intlShape} intl
 * @param {Object} [profilePublicData]
 * @returns {string|null} display label for member skill level
 */
export const resolveCustomerLevelLabel = (intl, profilePublicData = {}) => {
  const pd = profilePublicData || {};
  let raw = null;
  for (const key of CUSTOMER_LEVEL_PUBLIC_DATA_KEYS) {
    const value = pd[key];
    if (value != null && String(value).trim() !== '') {
      raw = String(value).trim();
      break;
    }
  }
  if (!raw) return null;

  const token = normalizeLevelToken(raw);
  const messageId = LEVEL_MESSAGE_IDS[token];
  if (messageId && intl?.formatMessage) {
    return intl.formatMessage({ id: messageId, defaultMessage: raw });
  }

  return raw
    .replace(/_/g, ' ')
    .replace(/\b\w/g, ch => ch.toUpperCase());
};
