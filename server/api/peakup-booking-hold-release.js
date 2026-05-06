const { releasePeakupBookingHold } = require('../api-util/peakupBookingHoldStore');

module.exports = (req, res) => {
  try {
    const { holdId } = req.body || {};
    const released = releasePeakupBookingHold(holdId);
    res.status(200).json({ released });
  } catch (e) {
    res.status(500).json({ message: e.message || 'PeakUp release failed' });
  }
};
