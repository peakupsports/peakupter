/** Local codebase copy wins over hosted Console assets for these key prefixes. */
export const LOCAL_TRANSLATION_PRIORITY_PREFIXES = [
  'PeakUp',
  'CoachDashboard',
  'CustomerDashboard',
  'TeamDashboard',
];

/**
 * Merge hosted Sharetribe translations with local fallback messages.
 * Hosted assets override generic template strings, but PeakUp dashboard copy
 * stays owned by the repository so booking UI updates ship with code.
 *
 * @param {Object} localMessages
 * @param {Object} [hostedMessages]
 * @returns {Object}
 */
/**
 * @param {object} localMessages
 * @param {object} [hostedMessages]
 * @param {object} [options]
 * @param {boolean} [options.preferLocal] When true, locale file wins over hosted Console copy.
 * @returns {object}
 */
export const mergeIntlMessages = (localMessages = {}, hostedMessages = {}, options = {}) => {
  const { preferLocal = false } = options;
  const merged = preferLocal
    ? { ...hostedMessages, ...localMessages }
    : { ...localMessages, ...hostedMessages };

  Object.keys(localMessages).forEach(key => {
    if (LOCAL_TRANSLATION_PRIORITY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      merged[key] = localMessages[key];
    }
  });

  return merged;
};
