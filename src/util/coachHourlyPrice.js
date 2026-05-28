import { isBookingProcessAlias } from '../transactions/transaction';

// Local copy to avoid circular deps (coachExplore <-> coachBookingNavigation).
const listingHasPeakupBookingFlag = listing => {
  const v = listing?.attributes?.publicData?.peakupBookingListing;
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
};

/**
 * Pick the coach hourly-booking listing.
 *
 * Rules:
 * - Must be a booking-process listing
 * - Must have `publicData.unitType === 'hour'`
 * - Must NOT be the technical ghost listing (`peakupBookingListing`)
 * - Prefer published over draft
 * - Prefer public over hidden (but allow hidden if it's the only candidate)
 *
 * @param {Array<Object>} listings denormalised listings for the same coach
 * @returns {Object|null}
 */
export const pickCoachHourlyBookingListing = (listings = []) => {
  const list = Array.isArray(listings) ? listings : [];
  if (list.length === 0) return null;

  const candidates = list.filter(l => {
    if (listingHasPeakupBookingFlag(l)) return false;
    const pd = l?.attributes?.publicData || {};
    if (pd.unitType !== 'hour') return false;
    return isBookingProcessAlias(pd.transactionProcessAlias);
  });

  if (candidates.length === 0) return null;

  const rank = listing => {
    const pd = listing?.attributes?.publicData || {};
    const hidden =
      pd.hiddenFromPublic === true ||
      (typeof pd.hiddenFromPublic === 'string' && pd.hiddenFromPublic.toLowerCase() === 'true');
    const published = listing?.attributes?.state === 'published';
    // Lower is better.
    return (published ? 0 : 10) + (hidden ? 1 : 0);
  };

  return [...candidates].sort((a, b) => rank(a) - rank(b))[0];
};

/**
 * Read the LOWEST hourly booking price Money across the coach's hourly-booking listings.
 *
 * @param {Array<Object>} listings denormalised listings for the same coach
 * @returns {Object|null} sdkTypes.Money-like value or null
 */
export const getLowestCoachHourlyBookingPrice = listings => {
  const list = Array.isArray(listings) ? listings : [];
  if (list.length === 0) return null;

  let best = null;
  for (const l of list) {
    if (listingHasPeakupBookingFlag(l)) continue;
    const pd = l?.attributes?.publicData || {};
    if (pd.unitType !== 'hour') continue;
    if (!isBookingProcessAlias(pd.transactionProcessAlias)) continue;

    const price = l?.attributes?.price;
    if (!price || typeof price.amount !== 'number' || !price.currency) continue;
    if (!best || price.amount < best.amount) {
      best = price;
    }
  }

  return best;
};

// Back-compat alias (legacy callers). Prefer `getLowestCoachHourlyBookingPrice`.
export const getCoachHourlyBookingPrice = getLowestCoachHourlyBookingPrice;

