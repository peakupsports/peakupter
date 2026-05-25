/**
 * Referral Center — share link helpers (production-style URLs).
 */

const stripProtocol = url =>
  String(url || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');

/**
 * Public-facing domain for ambassador share links (never localhost in UI).
 *
 * @param {Object} [config]
 * @returns {string}
 */
export const getAmbassadorShareDomain = (config = {}) => {
  const fromEnv = process.env.REACT_APP_AMBASSADOR_REFERRAL_DOMAIN;
  if (fromEnv) {
    return stripProtocol(fromEnv);
  }

  const root = config.marketplaceRootURL || process.env.REACT_APP_MARKETPLACE_ROOT_URL || '';
  const normalized = stripProtocol(root);

  if (normalized && !normalized.includes('localhost') && !normalized.includes('127.0.0.1')) {
    return normalized;
  }

  return 'peakup.com';
};

/**
 * Full HTTPS share URL for clipboard / external open.
 *
 * @param {string} code
 * @param {Object} [config]
 * @returns {string}
 */
export const buildAmbassadorShareLink = (code, config = {}) => {
  const domain = getAmbassadorShareDomain(config);
  const normalized = String(code || '').trim();
  if (!normalized) {
    return `https://${domain}/join`;
  }
  return `https://${domain}/join?ref=${encodeURIComponent(normalized)}`;
};

/**
 * Display-friendly share URL without protocol (e.g. peakup.com/join?ref=CODE).
 *
 * @param {string} code
 * @param {Object} [config]
 * @returns {string}
 */
export const formatAmbassadorShareLinkDisplay = (code, config = {}) => {
  const domain = getAmbassadorShareDomain(config);
  const normalized = String(code || '').trim();
  if (!normalized) {
    return `${domain}/join`;
  }
  return `${domain}/join?ref=${normalized}`;
};

/**
 * @param {string} name
 * @returns {string}
 */
export const getCoachInitials = name => {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '?';
  }

  return parts.map(part => part.charAt(0).toUpperCase()).join('');
};
