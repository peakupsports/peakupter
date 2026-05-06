const { reservePeakupBookingHold } = require('../api-util/peakupBookingHoldStore');

module.exports = (req, res) => {
  try {
    const { listingId, peakupBookingSlots } = req.body || {};
    const listingUuid =
      typeof listingId === 'string' ? listingId : listingId?.uuid || listingId?.id?.uuid || null;

    const result = reservePeakupBookingHold({
      listingUuid,
      peakupBookingSlots,
    });
    res.status(201).json(result);
  } catch (e) {
    const status = e.status && Number.isFinite(e.status) ? e.status : 500;
    res.status(status).json({ message: e.message || 'PeakUp hold failed' });
  }
};
