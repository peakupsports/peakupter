/** Params used only server-side for line-items; Marketplace API rejects unknown keys. */

const PEAKUP_INTERNAL_PARAMS = ['peakupSessionCount', 'peakupBookingSlots'];

exports.omitPeakupInternalParams = params => {
  if (!params || typeof params !== 'object') {
    return params;
  }
  const next = { ...params };
  PEAKUP_INTERNAL_PARAMS.forEach(k => delete next[k]);
  return next;
};
