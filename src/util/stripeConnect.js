// Netherlands requires a sole proprietorship for individuals.
// According to Stripe: "we’re enforcing stricter business type requirements for Netherlands (NL)
// accounts to ensure compliance with Dutch regulations. This specifically affects
// how we collect the KvK (Kamer van Koophandel), the unique 8-digit company registration number
// required for businesses in the Netherlands."
// https://docs.stripe.com/connect/upcoming-requirements-updates?program=eu-2025#netherlands-business-registration-requirements
const countriesRequiringSoleProprietorshipForIndividuals = new Set(['NL']);

/**
 * Whether Connect onboarding for an individual in this country must use a company account with
 * sole proprietorship structure (Stripe compliance; currently applies to NL).
 *
 * @param {string} country - ISO 3166-1 alpha-2 country code
 * @returns {boolean}
 */
export const requiresSoleProprietorshipAccount = country =>
  countriesRequiringSoleProprietorshipForIndividuals.has(country);

/**
 * Builds `business_type` and optional `company.structure` for Stripe account creation or token
 * flows when the seller's country and account type trigger sole-proprietorship rules.
 *
 * @param {Object} params
 * @param {string} params.country - ISO 3166-1 alpha-2 country code
 * @param {string} params.accountType - Stripe business type, e.g. `individual` or `company`
 * @returns {Object} Either `{ business_type: 'company', company: { structure: 'sole_proprietorship' } }`
 *   for individuals in restricted countries, or `{ business_type: accountType }` otherwise
 */
export const getStripeAccountTokenInfo = ({ country, accountType }) => {
  const isIndividualInRestrictedCountry =
    accountType === 'individual' && requiresSoleProprietorshipAccount(country);

  return isIndividualInRestrictedCountry
    ? {
        business_type: 'company',
        company: {
          structure: 'sole_proprietorship',
        },
      }
    : {
        business_type: accountType,
      };
};

/**
 * Normalizes Stripe account data for display: company accounts with sole proprietorship structure
 * are shown as `individual` to match how the seller signed up.
 *
 * @param {Object} [stripeAccountData] - Account object with optional `business_type` and `company.structure`
 * @returns {string|undefined} Display type (`individual` for mapped sole props, otherwise `business_type`, or
 *   `undefined` when missing)
 */
export const getDisplayAccountType = stripeAccountData => {
  const businessType = stripeAccountData?.business_type;
  const companyStructure = stripeAccountData?.company?.structure;

  return businessType === 'company' && companyStructure === 'sole_proprietorship'
    ? 'individual'
    : businessType;
};

const MISSING_TOKEN_MESSAGE =
  'Stripe token was not created. Please check Stripe publishable key and country/account setup.';

/**
 * Creates a Stripe Connect account token via Stripe.js and returns the token id.
 * Handles Stripe.js `{ error }` responses without throwing on undefined `token`.
 *
 * @param {Object} stripe Stripe.js instance from `window.Stripe(publishableKey)`
 * @param {Object} accountInfo Payload for `stripe.createToken('account', accountInfo)`
 * @returns {Promise<string>} account token id (tok_…)
 */
export const createStripeAccountToken = (stripe, accountInfo) => {
  if (!stripe) {
    return Promise.reject(new Error('Stripe is not initialized. Please reload the page and try again.'));
  }

  if (typeof stripe.createToken !== 'function') {
    return Promise.reject(
      new Error(
        'Stripe account tokens are not available. Please check that Stripe.js loaded correctly.'
      )
    );
  }

  return stripe.createToken('account', accountInfo).then(response => {
    /* eslint-disable no-console */
    console.error('[PeakUp payout] Stripe token response:', response);
    /* eslint-enable no-console */

    if (response?.error) {
      const message =
        response.error.message ||
        'Stripe could not create an account token for this country or account type.';
      /* eslint-disable no-console */
      console.error('[PeakUp payout] Stripe token error:', response.error);
      /* eslint-enable no-console */
      throw new Error(message);
    }

    if (!response || !response.token || !response.token.id) {
      /* eslint-disable no-console */
      console.error('[PeakUp payout] Missing Stripe token response:', response);
      /* eslint-enable no-console */
      throw new Error(MISSING_TOKEN_MESSAGE);
    }

    return response.token.id;
  });
};
