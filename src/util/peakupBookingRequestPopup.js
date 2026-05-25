import {
  getProcess,
  isBookingProcess,
  isBookingProcessAlias,
  resolveLatestProcessName,
} from '../transactions/transaction';

const POPUP_SEEN_STORAGE_PREFIX = 'peakupBookingRequestPopupSeen';

export const COACH_DASHBOARD_ROUTE_NAME = 'CoachDashboardPage';

/**
 * Whether the new-booking popup may appear on the current page.
 *
 * @param {{ routeName: string|null, isCoachMode: boolean, saleNotificationCount: number }} params
 * @returns {boolean}
 */
export const canShowBookingRequestPopup = ({
  routeName,
  isCoachMode,
  saleNotificationCount,
}) =>
  isCoachMode === true &&
  routeName === COACH_DASHBOARD_ROUTE_NAME &&
  saleNotificationCount > 0;

export const getBookingRequestPopupSeenKey = userId => `${POPUP_SEEN_STORAGE_PREFIX}:${userId}`;

const readSeenIds = userId => {
  if (typeof window === 'undefined' || !userId) {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(getBookingRequestPopupSeenKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch (e) {
    return [];
  }
};

/**
 * @param {string} userId
 * @param {string} transactionId
 */
export const markBookingRequestPopupSeen = (userId, transactionId) => {
  if (typeof window === 'undefined' || !userId || !transactionId) {
    return;
  }
  const seen = readSeenIds(userId);
  if (seen.includes(transactionId)) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      getBookingRequestPopupSeenKey(userId),
      JSON.stringify([...seen, transactionId])
    );
  } catch (e) {
    // ignore quota errors
  }
};

/**
 * @param {string} userId
 * @param {string} transactionId
 * @returns {boolean}
 */
export const wasBookingRequestPopupSeen = (userId, transactionId) =>
  readSeenIds(userId).includes(transactionId);

/**
 * @param {Object} transaction
 * @returns {{ process: Object, processState: string, states: Object }|null}
 */
const resolveBookingProcessName = rawName => {
  if (!rawName) {
    return null;
  }
  return rawName.includes('/') ? rawName.split('/')[0] : resolveLatestProcessName(rawName);
};

export const getBookingProcessStateInfo = transaction => {
  const baseName = resolveBookingProcessName(transaction?.attributes?.processName);
  if (!baseName) {
    return null;
  }
  try {
    const process = getProcess(baseName);
    return {
      process,
      processName: baseName,
      processState: process.getState(transaction),
      states: process.states,
    };
  } catch (e) {
    return null;
  }
};

/**
 * Provider-side booking in `preauthorized` (paid request awaiting accept/decline).
 *
 * @param {Object} transaction
 * @param {string} currentUserId
 * @returns {boolean}
 */
export const isProviderNewBookingRequest = (transaction, currentUserId) => {
  if (!transaction || !currentUserId) {
    return false;
  }

  if (transaction.provider?.id?.uuid !== currentUserId) {
    return false;
  }

  const rawName = transaction?.attributes?.processName;
  const isBooking = rawName?.includes('/')
    ? isBookingProcessAlias(rawName)
    : isBookingProcess(resolveLatestProcessName(rawName));

  if (!isBooking) {
    return false;
  }

  const info = getBookingProcessStateInfo(transaction);
  return info?.processState === info?.states?.PREAUTHORIZED;
};

/**
 * Most recent unseen provider booking request for the popup.
 *
 * @param {Array<Object>} transactions
 * @param {Object} currentUser
 * @returns {Object|null}
 */
export const pickNewBookingRequestForPopup = (transactions, currentUser) => {
  const userId = currentUser?.id?.uuid;
  if (!userId || !Array.isArray(transactions)) {
    return null;
  }

  const candidates = transactions
    .filter(tx => isProviderNewBookingRequest(tx, userId))
    .filter(tx => !wasBookingRequestPopupSeen(userId, tx.id?.uuid))
    .sort((a, b) => {
      const aAt = new Date(a.attributes?.lastTransitionedAt || 0).getTime();
      const bAt = new Date(b.attributes?.lastTransitionedAt || 0).getTime();
      return bAt - aAt;
    });

  return candidates[0] || null;
};

/**
 * Optional subtle in-app chime (no external asset).
 */
export const playBookingRequestNotificationSound = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(740, t);
    osc.frequency.exponentialRampToValueAtTime(988, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(660, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.045, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.start(t);
    osc.stop(t + 0.26);
    osc.onended = () => ctx.close();
  } catch (e) {
    // Autoplay policies or missing API — silent fail
  }
};
