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
export const mergeIntlMessages = (localMessages = {}, hostedMessages = {}) => {
  const merged = { ...localMessages, ...hostedMessages };

  Object.keys(localMessages).forEach(key => {
    if (LOCAL_TRANSLATION_PRIORITY_PREFIXES.some(prefix => key.startsWith(prefix))) {
      merged[key] = localMessages[key];
    }
  });

  return merged;
};
