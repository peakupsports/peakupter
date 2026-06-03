const { processCoachEventCancellation } = require('../api-util/coachEventCancellation');
const { formatSharetribeSdkError } = require('../api-util/coachBlockCancellationSdk');

module.exports = async (req, res) => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp EVENT CANCEL API HIT]', {
    endpoint: '/api/peakup/coach-event-cancel',
    transactionId: req.body?.transactionId || null,
  });

  try {
    await processCoachEventCancellation(req, res, req.body);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PeakUp EVENT CANCEL API ERROR]', error);

    if (!res.headersSent) {
      const status = error?.status && Number.isFinite(error.status) ? error.status : 500;
      res.status(status).json({ message: formatSharetribeSdkError(error) });
    }
  }
};
