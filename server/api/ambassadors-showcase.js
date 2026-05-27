const { buildAmbassadorsShowcase } = require('../api-util/ambassadorShowcaseService');

module.exports = async (req, res) => {
  try {
    const { ambassadors, onlyFounder } = await buildAmbassadorsShowcase();
    res.status(200).json({ ok: true, ambassadors, onlyFounder });
  } catch (error) {
    console.error('[ambassadors-showcase] failed:', error);
    const status = error.status || 500;
    res.status(status).json({
      message: error.message || 'Failed to load ambassadors showcase.',
    });
  }
};
