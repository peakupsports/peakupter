const http = require('http');
const https = require('https');
const sharetribeSdk = require('sharetribe-flex-sdk');

const { sendCoachCancellationNotificationEmail } = require('./coachCancellationNotificationEmail');
const { formatSharetribeSdkError } = require('./coachBlockCancellationSdk');

const CLIENT_ID = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const CLIENT_SECRET = process.env.SHARETRIBE_SDK_CLIENT_SECRET;
const BASE_URL = process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL;
const TRANSIT_VERBOSE = process.env.REACT_APP_SHARETRIBE_SDK_TRANSIT_VERBOSE === 'true';

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });
const baseUrlMaybe = BASE_URL ? { baseUrl: BASE_URL } : {};

const CUSTOMER_CANCEL_INBOX_MESSAGE = `Your coaching session has been cancelled by the coach due to a scheduling conflict.

We sincerely apologize for the inconvenience.

If a payment was already completed, the refund process has been initiated automatically.

You can book a new session anytime on PeakUp Sports with one of our certified coaches.`;

let operatorMessageSdkPromise = null;

const memoryStore = token => {
  const store = sharetribeSdk.tokenStore.memoryStore();
  store.setToken(token);
  return store;
};

/**
 * Marketplace user used as system/operator sender for cancellation inbox messages.
 * Set PEAKUP_SYSTEM_MESSAGE_SENDER_EMAIL + PEAKUP_SYSTEM_MESSAGE_SENDER_PASSWORD
 * to a dedicated PeakUp Support operator account.
 *
 * @returns {Promise<import('sharetribe-flex-sdk').Instance|null>}
 */
const getOperatorMessageSdk = () => {
  const email = process.env.PEAKUP_SYSTEM_MESSAGE_SENDER_EMAIL;
  const password = process.env.PEAKUP_SYSTEM_MESSAGE_SENDER_PASSWORD;

  if (!email || !password) {
    return Promise.resolve(null);
  }

  if (!operatorMessageSdkPromise) {
    const loginSdk = sharetribeSdk.createInstance({
      transitVerbose: TRANSIT_VERBOSE,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      httpAgent,
      httpsAgent,
      tokenStore: sharetribeSdk.tokenStore.memoryStore(),
      ...baseUrlMaybe,
    });

    operatorMessageSdkPromise = loginSdk
      .login({ username: email, password })
      .then(() => {
        const token = loginSdk.tokenStore.getToken();
        return sharetribeSdk.createInstance({
          transitVerbose: TRANSIT_VERBOSE,
          clientId: CLIENT_ID,
          httpAgent,
          httpsAgent,
          tokenStore: memoryStore(token),
          ...baseUrlMaybe,
        });
      })
      .catch(error => {
        operatorMessageSdkPromise = null;
        throw error;
      });
  }

  return operatorMessageSdkPromise;
};

/**
 * @param {Object} params
 * @param {import('sharetribe-flex-sdk').Instance} params.coachSdk
 * @param {string} params.transactionId
 * @returns {Promise<{ success: boolean, senderMode?: string, error?: string }>}
 */
const sendCustomerCancellationInboxMessage = async ({ coachSdk, transactionId }) => {
  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER CANCEL MESSAGE]', {
    transactionId,
    action: 'send',
  });

  try {
    const operatorSdk = await getOperatorMessageSdk();
    const messageSdk = operatorSdk || coachSdk;
    const senderMode = operatorSdk ? 'operator' : 'coach';

    await messageSdk.messages.send({
      transactionId,
      content: CUSTOMER_CANCEL_INBOX_MESSAGE,
    });

    // eslint-disable-next-line no-console
    console.log('[PeakUp CUSTOMER CANCEL MESSAGE]', {
      transactionId,
      status: 'success',
      senderMode,
    });

    return { success: true, senderMode };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[PeakUp CUSTOMER CANCEL MESSAGE]', {
      transactionId,
      status: 'error',
      message: formatSharetribeSdkError(error),
    });
    return { success: false, error: formatSharetribeSdkError(error) };
  }
};

/**
 * @param {Object} params
 * @param {import('sharetribe-flex-sdk').Instance} params.coachSdk
 * @param {string} params.transactionId
 * @param {string} params.customerEmail
 * @param {string} [params.customerFirstName]
 * @returns {Promise<{ messageSent: boolean, emailSent: boolean, emailError?: string|null, senderMode?: string }>}
 */
const notifyCustomerOfCoachCancellation = async ({
  coachSdk,
  transactionId,
  customerEmail,
  customerFirstName,
}) => {
  const messageResult = await sendCustomerCancellationInboxMessage({
    coachSdk,
    transactionId,
  });

  // eslint-disable-next-line no-console
  console.log('[PeakUp CUSTOMER CANCEL EMAIL]', {
    transactionId,
    to: customerEmail || null,
    action: 'send',
  });

  const emailResult = await sendCoachCancellationNotificationEmail({
    to: customerEmail,
    customerFirstName,
  });

  if (emailResult.success) {
    // eslint-disable-next-line no-console
    console.log('[PeakUp CUSTOMER CANCEL EMAIL]', {
      transactionId,
      status: 'success',
      sentAt: emailResult.sentAt,
    });
  } else {
    // eslint-disable-next-line no-console
    console.error('[PeakUp CUSTOMER CANCEL EMAIL]', {
      transactionId,
      status: 'error',
      message: emailResult.error || 'Email send failed',
    });
  }

  return {
    messageSent: messageResult.success,
    emailSent: emailResult.success,
    emailError: emailResult.error || null,
    senderMode: messageResult.senderMode,
  };
};

module.exports = {
  CUSTOMER_CANCEL_INBOX_MESSAGE,
  getOperatorMessageSdk,
  sendCustomerCancellationInboxMessage,
  notifyCustomerOfCoachCancellation,
};
