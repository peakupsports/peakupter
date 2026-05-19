import {
  INQUIRY_PROCESS_NAME,
  getProcess,
  resolveLatestProcessName,
} from '../transactions/transaction';

/**
 * True when the transaction page should render as a PeakUp messaging conversation
 * (inquiry / free-inquiry states across supported processes).
 *
 * @param {Object|string} processNameOrTransaction - Transaction entity or process name
 * @param {Object} [transaction] - Transaction when first arg is process name
 * @returns {boolean}
 */
export const isPeakUpConversationView = (processNameOrTransaction, transaction) => {
  const tx =
    transaction ?? (typeof processNameOrTransaction === 'object' ? processNameOrTransaction : null);
  const processName =
    typeof processNameOrTransaction === 'string'
      ? processNameOrTransaction
      : resolveLatestProcessName(tx?.attributes?.processName);

  if (!processName || !tx) {
    return false;
  }

  try {
    const process = getProcess(processName);
    const state = process.getState(tx);
    const { states } = process;

    if (processName === INQUIRY_PROCESS_NAME) {
      return true;
    }

    if (states?.FREE_INQUIRY && state === states.FREE_INQUIRY) {
      return true;
    }

    return states?.INQUIRY && state === states.INQUIRY;
  } catch (e) {
    return false;
  }
};

/**
 * Primary sport key for a conversation header badge (coach listing or profile).
 *
 * @param {Object} listing
 * @param {Object} provider
 * @returns {string|null}
 */
export const getConversationSportKey = (listing, provider) => {
  const listingSports = listing?.attributes?.publicData?.sports;
  if (Array.isArray(listingSports) && listingSports.length > 0) {
    return String(listingSports[0]).trim().toLowerCase().replace(/\s+/g, '');
  }

  const profileSports = provider?.attributes?.profile?.publicData?.sports;
  if (Array.isArray(profileSports) && profileSports.length > 0) {
    return String(profileSports[0]).trim().toLowerCase().replace(/\s+/g, '');
  }

  return null;
};
