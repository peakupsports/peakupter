/**
 * Referral Center — ambassador invite link helpers.
 */

export const PRODUCTION_AMBASSADOR_HOST = 'peakup.ch';
export const AMBASSADOR_INVITE_PATH = '/coach-signup';

const stripProtocol = url =>
  String(url || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');

const normalizeOrigin = value => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch (e) {
      return trimmed.replace(/\/$/, '');
    }
  }

  const host = stripProtocol(trimmed);
  return host ? `https://${host}` : '';
};

/**
 * Origin for ambassador invite links (local dev vs production).
 *
 * @param {Object} [config]
 * @param {Window|{ location?: { origin?: string } }|undefined} [runtimeWindow]
 * @returns {string}
 */
export const resolveAmbassadorShareOrigin = (config = {}, runtimeWindow) => {
  const win =
    runtimeWindow === null
      ? null
      : runtimeWindow !== undefined
      ? runtimeWindow
      : typeof window !== 'undefined'
      ? window
      : null;

  if (win?.location?.origin) {
    return win.location.origin;
  }

  const fromEnv = process.env.REACT_APP_AMBASSADOR_REFERRAL_DOMAIN;
  if (fromEnv) {
    const envOrigin = normalizeOrigin(fromEnv);
    if (envOrigin) {
      return envOrigin;
    }
  }

  const root = config.marketplaceRootURL || process.env.REACT_APP_MARKETPLACE_ROOT_URL || '';
  const rootOrigin = normalizeOrigin(root);
  if (rootOrigin) {
    return rootOrigin;
  }

  return `https://${PRODUCTION_AMBASSADOR_HOST}`;
};

export const getAmbassadorShareOrigin = config => resolveAmbassadorShareOrigin(config);

/**
 * Host portion for display helpers.
 *
 * @param {Object} [config]
 * @returns {string}
 */
export const getAmbassadorShareDomain = (config = {}) => {
  try {
    return new URL(getAmbassadorShareOrigin(config)).host;
  } catch (e) {
    return PRODUCTION_AMBASSADOR_HOST;
  }
};

/**
 * Full invite URL for clipboard / external open.
 *
 * @param {string} code
 * @param {Object} [config]
 * @returns {string}
 */
export const buildAmbassadorShareLink = (code, config = {}, runtimeWindow) => {
  const origin = resolveAmbassadorShareOrigin(config, runtimeWindow);
  const normalized = String(code || '').trim();
  if (!normalized) {
    return `${origin}${AMBASSADOR_INVITE_PATH}`;
  }
  return `${origin}${AMBASSADOR_INVITE_PATH}?ref=${encodeURIComponent(normalized)}`;
};

/**
 * Display-friendly share URL without protocol.
 *
 * @param {string} code
 * @param {Object} [config]
 * @returns {string}
 */
export const formatAmbassadorShareLinkDisplay = (code, config = {}, runtimeWindow) => {
  return buildAmbassadorShareLink(code, config, runtimeWindow).replace(/^https?:\/\//i, '');
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
