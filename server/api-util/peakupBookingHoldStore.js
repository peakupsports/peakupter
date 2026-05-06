const crypto = require('crypto');

const DEFAULT_TTL_MS = parseInt(process.env.PEAKUP_BOOKING_HOLD_TTL_MS || '900000', 10);

/** @type {Map<string, object>} */
const holdsById = new Map();

const listingIdToString = id => {
  if (!id) return null;
  if (typeof id === 'string') return id;
  return id.uuid != null ? id.uuid : null;
};

/**
 * Stable JSON key for PeakUp slots (canonical order).
 * @param {Array<{bookingStart:string,bookingEnd:string}>} slots
 */
const slotsSignature = slots => {
  if (!slots?.length) return '[]';
  const sorted = [...slots].sort((a, b) =>
    String(a.bookingStart || '').localeCompare(String(b.bookingStart || ''))
  );
  return JSON.stringify(sorted);
};

const rangesOverlapMs = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

const parseHoldSlotsMs = normalizedSlots =>
  normalizedSlots
    .map(s => {
      const st = Date.parse(s.bookingStart);
      const en = Date.parse(s.bookingEnd);
      if (Number.isNaN(st) || Number.isNaN(en) || st >= en) return null;
      return { bookingStart: s.bookingStart, bookingEnd: s.bookingEnd, msStart: st, msEnd: en };
    })
    .filter(Boolean);

/**
 * Another active hold on the same listing overlaps any proposed slot interval.
 *
 * @param {string} listingUuid
 * @param {ReturnType<typeof parseHoldSlotsMs>} proposed
 * @param {string|null} excludeHoldId
 */
const slotConflict = (listingUuid, proposed, excludeHoldId) => {
  const now = Date.now();
  for (const [hid, entry] of holdsById.entries()) {
    if (hid === excludeHoldId) continue;
    if (entry.listingUuid !== listingUuid) continue;
    if (entry.expiresAt <= now) continue;
    for (const a of proposed) {
      for (const b of entry.slotRanges) {
        if (rangesOverlapMs(a.msStart, a.msEnd, b.msStart, b.msEnd)) {
          return true;
        }
      }
    }
  }
  return false;
};

exports.pruneExpiredPeakupBookingHolds = () => {
  const now = Date.now();
  for (const [id, entry] of holdsById.entries()) {
    if (entry.expiresAt <= now) {
      holdsById.delete(id);
    }
  }
};

setInterval(() => exports.pruneExpiredPeakupBookingHolds(), 60_000).unref();

/**
 * Reserve overlapping-time protection for PeakUp listings (single-node process memory).
 *
 * @param {{ listingUuid: string, peakupBookingSlots: Array<{bookingStart:string,bookingEnd:string}> }} body
 */
exports.reservePeakupBookingHold = ({
  listingUuid,
  peakupBookingSlots,
  ttlMs = DEFAULT_TTL_MS,
}) => {
  if (!listingUuid || !peakupBookingSlots?.length) {
    const err = new Error('listingUuid and peakupBookingSlots are required');
    err.status = 400;
    throw err;
  }

  const slotRanges = parseHoldSlotsMs(peakupBookingSlots);
  if (!slotRanges.length) {
    const err = new Error('Invalid peakupBookingSlots');
    err.status = 400;
    throw err;
  }

  exports.pruneExpiredPeakupBookingHolds();

  if (slotConflict(listingUuid, slotRanges, null)) {
    const err = new Error('Another customer is reserving an overlapping slot. Try another time.');
    err.status = 409;
    throw err;
  }

  const holdId = crypto.randomUUID();
  const now = Date.now();
  holdsById.set(holdId, {
    listingUuid,
    slotRanges,
    signature: slotsSignature(peakupBookingSlots),
    createdAt: now,
    expiresAt: now + Math.max(ttlMs, 30_000),
  });

  return { holdId, expiresAt: new Date(now + ttlMs).toISOString(), ttlMs };
};

exports.releasePeakupBookingHold = holdId => {
  if (!holdId) return false;
  return holdsById.delete(holdId);
};

/** @returns {{ listingUuid:string, signature:string }}
 */
exports.peakHoldEntry = holdId => {
  const entry = holdsById.get(holdId);
  if (!entry || entry.expiresAt <= Date.now()) {
    if (entry) holdsById.delete(holdId);
    return null;
  }
  return entry;
};

/**
 * @param {object} mergedOrderLike getFullOrderData result (params flattened + protectedData)
 */
exports.peakHoldMatchesMergedOrderData = (entry, mergedOrderLike) => {
  if (!entry) return false;
  const slots = mergedOrderLike?.protectedData?.peakupBookingSlots;
  if (!Array.isArray(slots) || !slots.length) return false;

  const count = mergedOrderLike.peakupSessionCount;
  if (typeof count !== 'number' || count !== slots.length) return false;
  if (slots.length !== entry.slotRanges.length) return false;

  return slotsSignature(slots) === entry.signature;
};

exports.consumePeakupBookingHold = holdId => {
  return holdsById.delete(holdId);
};

exports.__testOnly = {
  slotsSignature,
  parseHoldSlotsMs,
  clearAll: () => holdsById.clear(),
  listingIdToString,
};
