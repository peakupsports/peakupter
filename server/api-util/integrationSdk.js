const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

const INTEGRATION_SDK_PACKAGE = 'sharetribe-flex-integration-sdk';
const DEFAULT_INTEGRATION_BASE_URL = 'https://flex-integ-api.sharetribe.com';

let integrationSdkInstance = null;
let configLogged = false;

/**
 * Integration API credentials (NOT Marketplace trusted-token credentials).
 * Prefer SHARETRIBE_INTEGRATION_* from Console → Applications → Integration API.
 *
 * @returns {{
 *   clientId: string|undefined,
 *   clientSecret: string|undefined,
 *   usingMarketplaceFallback: boolean,
 *   clientIdSource: string,
 *   clientSecretSource: string,
 * }}
 */
const getIntegrationCredentials = () => {
  const clientIdSources = [
    ['SHARETRIBE_INTEGRATION_SDK_CLIENT_ID', process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_ID],
    ['SHARETRIBE_INTEGRATION_CLIENT_ID', process.env.SHARETRIBE_INTEGRATION_CLIENT_ID],
    ['REACT_APP_SHARETRIBE_SDK_CLIENT_ID', process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID],
  ];
  const clientSecretSources = [
    [
      'SHARETRIBE_INTEGRATION_SDK_CLIENT_SECRET',
      process.env.SHARETRIBE_INTEGRATION_SDK_CLIENT_SECRET,
    ],
    ['SHARETRIBE_INTEGRATION_CLIENT_SECRET', process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET],
    ['SHARETRIBE_SDK_CLIENT_SECRET', process.env.SHARETRIBE_SDK_CLIENT_SECRET],
  ];

  const clientIdEntry = clientIdSources.find(([, value]) => Boolean(String(value || '').trim()));
  const clientSecretEntry = clientSecretSources.find(([, value]) =>
    Boolean(String(value || '').trim())
  );

  const clientIdSource = clientIdEntry?.[0] || 'missing';
  const clientSecretSource = clientSecretEntry?.[0] || 'missing';
  const usingMarketplaceFallback =
    clientIdSource === 'REACT_APP_SHARETRIBE_SDK_CLIENT_ID' ||
    clientSecretSource === 'SHARETRIBE_SDK_CLIENT_SECRET';

  return {
    clientId: clientIdEntry?.[1],
    clientSecret: clientSecretEntry?.[1],
    usingMarketplaceFallback,
    clientIdSource,
    clientSecretSource,
  };
};

const maskSecret = value => {
  const str = String(value || '');
  if (!str) {
    return '(missing)';
  }
  if (str.length <= 8) {
    return '***';
  }
  return `${str.slice(0, 4)}…${str.slice(-4)} (${str.length} chars)`;
};

const logIntegrationSdkConfig = () => {
  if (configLogged) {
    return;
  }
  configLogged = true;

  const { clientId, clientSecret, usingMarketplaceFallback, clientIdSource, clientSecretSource } =
    getIntegrationCredentials();

  // eslint-disable-next-line no-console
  console.log('[PeakUp SHARETRIBE INTEGRATION SDK CONFIG]', {
    sdkPackage: INTEGRATION_SDK_PACKAGE,
    apiBaseUrl: DEFAULT_INTEGRATION_BASE_URL,
    isIntegrationSdk: true,
    isMarketplaceSdk: false,
    clientIdPresent: Boolean(clientId),
    clientIdSource,
    clientSecretPresent: Boolean(clientSecret),
    clientSecretSource,
    clientSecretPreview: maskSecret(clientSecret),
    usingMarketplaceCredentialsFallback: usingMarketplaceFallback,
    hint: usingMarketplaceFallback
      ? 'Create an Integration API app in Sharetribe Console and set SHARETRIBE_INTEGRATION_CLIENT_ID + SHARETRIBE_INTEGRATION_CLIENT_SECRET in .env — Marketplace credentials often return 403 Forbidden on Integration endpoints.'
      : 'Using dedicated Integration API credentials.',
  });

  if (!clientSecret) {
    console.error('[PeakUp SHARETRIBE INTEGRATION SDK CONFIG]', {
      error: 'SHARETRIBE_SDK_CLIENT_SECRET (or SHARETRIBE_INTEGRATION_CLIENT_SECRET) is missing server-side.',
    });
  }
};

/**
 * Server-only Sharetribe Integration API client (client credentials, flex-integ-api host).
 *
 * @returns {import('sharetribe-flex-integration-sdk').IntegrationSdk}
 */
const getIntegrationSdk = () => {
  logIntegrationSdkConfig();

  const { clientId, clientSecret, usingMarketplaceFallback } = getIntegrationCredentials();

  if (!clientId || !clientSecret) {
    const err = new Error(
      'Sharetribe Integration API is not configured. Set SHARETRIBE_INTEGRATION_CLIENT_ID and SHARETRIBE_INTEGRATION_CLIENT_SECRET in .env (from Console → Build → Applications → Integration API).'
    );
    err.status = 503;
    throw err;
  }

  if (usingMarketplaceFallback) {
    console.warn(
      '[PeakUp SHARETRIBE INTEGRATION SDK CONFIG] Falling back to Marketplace client id/secret. If coach approval returns Forbidden, add Integration API application credentials to .env.'
    );
  }

  if (!integrationSdkInstance) {
    integrationSdkInstance = sharetribeIntegrationSdk.createInstance({
      clientId,
      clientSecret,
    });
  }

  return integrationSdkInstance;
};

module.exports = {
  getIntegrationCredentials,
  getIntegrationSdk,
  integrationTypes: sharetribeIntegrationSdk.types,
  logIntegrationSdkConfig,
};
