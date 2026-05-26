const { processCoachBlockCancellations } = require('../api-util/coachBlockCancellation');

const { formatSharetribeSdkError } = require('../api-util/coachBlockCancellationSdk');

const extractErrorMessage = error => formatSharetribeSdkError(error);

module.exports = async (req, res) => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp BLOCK CANCEL API HIT]');
  // eslint-disable-next-line no-console
  console.log('[PeakUp BLOCK CANCEL API BODY]', req.body);

  try {
    await processCoachBlockCancellations(req, res, req.body);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PeakUp BLOCK CANCEL API ERROR]', error);

    if (!res.headersSent) {
      const status = error?.status && Number.isFinite(error.status) ? error.status : 500;
      res.status(status).json({ message: extractErrorMessage(error) });
    }
  }
};
