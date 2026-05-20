import appSettings from '../config/settings';

/**
 * True when running a local/dev client build (not production UX or console diagnostics).
 *
 * @returns {boolean}
 */
export const isDevelopmentMode = () =>
  appSettings.dev || process.env.NODE_ENV === 'development';
