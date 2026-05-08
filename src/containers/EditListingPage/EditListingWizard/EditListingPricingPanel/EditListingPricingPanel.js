import React, { useState } from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage } from '../../../../util/reactIntl';
import { LISTING_STATE_DRAFT, propTypes } from '../../../../util/types';
import { types as sdkTypes } from '../../../../util/sdkLoader';
import { isPriceVariationsEnabled } from '../../../../util/configHelpers';
import {
  isValidCurrencyForTransactionProcess,
  isAllowedListingCurrency,
  formatAllowedListingCurrencies,
} from '../../../../util/fieldHelpers';
import { unitDivisor } from '../../../../util/currency';
import { FIXED, isBookingProcess } from '../../../../transactions/transaction';

// Import shared components
import { H3, ListingLink } from '../../../../components';

// Import modules from this directory
import EditListingPricingForm from './EditListingPricingForm';
import {
  getInitialValuesForPriceVariants,
  handleSubmitValuesForPriceVariants,
} from './BookingPriceVariants';
import {
  getInitialValuesForStartTimeInterval,
  handleSubmitValuesForStartTimeInterval,
} from './StartTimeInverval';
import css from './EditListingPricingPanel.module.css';

const { Money } = sdkTypes;

const getListingTypeConfig = (publicData, listingTypes) => {
  const selectedListingType = publicData.listingType;
  return listingTypes.find(conf => conf.listingType === selectedListingType);
};

// Read the coach-selected currency from the user's profile public data.
// Falls back to null if not set, so callers can decide on a fallback.
const getCoachProfileCurrency = currentUser => {
  const currency = currentUser?.attributes?.profile?.publicData?.currency;
  return typeof currency === 'string' && currency.length === 3 ? currency.toUpperCase() : null;
};

// Re-wrap an existing Money value into the target currency while preserving
// the human-readable major-unit value (e.g. CHF 75 -> EUR 75).
// This is intentionally a 1:1 numeric carry-over (no FX conversion) because the
// goal here is "the coach profile currency wins" – no rate lookup is needed.
const normalizeMoneyToCurrency = (money, targetCurrency) => {
  if (!money || !targetCurrency || money.currency === targetCurrency) {
    return money;
  }
  try {
    const fromDivisor = unitDivisor(money.currency);
    const toDivisor = unitDivisor(targetCurrency);
    const majorAmount = Number(money.amount) / fromDivisor;
    const newSubunits = Math.round(majorAmount * toDivisor);
    return new Money(newSubunits, targetCurrency);
  } catch (e) {
    // If either currency is unsupported, keep the original value.
    return money;
  }
};

// NOTE: components that handle price variants and start time interval are currently
// exporting helper functions that handle the initial values and the submission values.
// This is a tentative approach to contain logic in one place.
const getInitialValues = props => {
  const { listing, listingTypes, effectiveCurrency } = props;
  const { publicData } = listing?.attributes || {};
  const { unitType } = publicData || {};
  const listingTypeConfig = getListingTypeConfig(publicData, listingTypes);
  // Note: publicData contains priceVariationsEnabled if listing is created with priceVariations enabled.
  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);

  if (unitType === FIXED || isPriceVariationsInUse) {
    return {
      ...getInitialValuesForPriceVariants(props, isPriceVariationsInUse),
      ...getInitialValuesForStartTimeInterval(props),
    };
  }

  const rawPrice = listing?.attributes?.price;
  const price = effectiveCurrency
    ? normalizeMoneyToCurrency(rawPrice, effectiveCurrency)
    : rawPrice;
  return { price };
};

// This is needed to show the listing's price consistently over XHR calls.
// I.e. we don't change the API entity saved to Redux store.
// Instead, we use a temporary entity inside the form's state.
const getOptimisticListing = (listing, updateValues) => {
  const tmpListing = {
    ...listing,
    attributes: {
      ...listing.attributes,
      ...updateValues,
      publicData: {
        ...listing.attributes?.publicData,
        ...updateValues?.publicData,
      },
    },
  };
  return tmpListing;
};

/**
 * The EditListingPricingPanel component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {propTypes.ownListing} props.listing - The listing object
 * @param {string} props.marketplaceCurrency - The marketplace currency
 * @param {number} props.listingMinimumPriceSubUnits - The listing minimum price sub units
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {Function} props.onSubmit - The submit function
 * @param {string} props.submitButtonText - The submit button text
 * @param {Array<propTypes.listingType>} props.listingTypes - The listing types
 * @param {boolean} props.panelUpdated - Whether the panel is updated
 * @param {boolean} props.updateInProgress - Whether the panel is updating
 * @param {Object} props.errors - The errors
 * @returns {JSX.Element}
 */
const EditListingPricingPanel = props => {
  const {
    className,
    rootClassName,
    listing,
    marketplaceCurrency,
    listingMinimumPriceSubUnits,
    disabled,
    ready,
    onSubmit,
    submitButtonText,
    listingTypes,
    panelUpdated,
    updateInProgress,
    errors,
    currentUser,
    updatePageTitle: UpdatePageTitle,
    intl,
  } = props;

  // Resolve the currency that the listing should actually use.
  // The coach selects this in their profile settings; marketplace currency is
  // only a fallback for users that haven't configured a profile currency yet.
  const coachProfileCurrency = getCoachProfileCurrency(currentUser);
  const effectiveCurrency = coachProfileCurrency || marketplaceCurrency;

  const [state, setState] = useState({
    initialValues: getInitialValues({ ...props, effectiveCurrency }),
  });

  const classes = classNames(rootClassName || css.root, className);
  const initialValues = state.initialValues;
  const isPublished = listing?.id && listing?.attributes?.state !== LISTING_STATE_DRAFT;

  const publicData = listing?.attributes?.publicData;
  const listingTypeConfig = getListingTypeConfig(publicData, listingTypes);
  const transactionProcessAlias = listingTypeConfig?.transactionType?.alias;
  const process = listingTypeConfig?.transactionType?.process;
  const isBooking = isBookingProcess(process);

  // Note: publicData contains priceVariationsEnabled if listing is created with priceVariations enabled.
  const isPriceVariationsInUse = isPriceVariationsEnabled(publicData, listingTypeConfig);

  const isCompatibleCurrency = isValidCurrencyForTransactionProcess(
    transactionProcessAlias,
    effectiveCurrency
  );
  // Real listings must use a currency from the explicit PeakUp whitelist.
  const isAllowedCurrency = isAllowedListingCurrency(effectiveCurrency);

  const priceCurrencyValid =
    !isCompatibleCurrency || !isAllowedCurrency
      ? false
      : effectiveCurrency && initialValues.price instanceof Money
      ? initialValues.price.currency === effectiveCurrency
      : !!effectiveCurrency;
  const unitType = listing?.attributes?.publicData?.unitType;

  const panelHeadingProps = isPublished
    ? {
        id: 'EditListingPricingPanel.title',
        values: { listingTitle: <ListingLink listing={listing} />, lineBreak: <br /> },
        messageProps: { listingTitle: listing.attributes.title },
      }
    : {
        id: 'EditListingPricingPanel.createListingTitle',
        values: { lineBreak: <br /> },
        messageProps: {},
      };

  return (
    <main className={classes}>
      <UpdatePageTitle
        panelHeading={intl.formatMessage(
          { id: panelHeadingProps.id },
          { ...panelHeadingProps.messageProps }
        )}
      />
      <H3 as="h1">
        <FormattedMessage id={panelHeadingProps.id} values={{ ...panelHeadingProps.values }} />
      </H3>
      {priceCurrencyValid ? (
        <EditListingPricingForm
          className={css.form}
          initialValues={initialValues}
          onSubmit={values => {
            const { price } = values;

            // New values for listing attributes
            let updateValues = {};

            if (unitType === FIXED || isPriceVariationsInUse) {
              let publicDataUpdates = { priceVariationsEnabled: isPriceVariationsInUse };
              // NOTE: components that handle price variants and start time interval are currently
              // exporting helper functions that handle the initial values and the submission values.
              // This is a tentative approach to contain logic in one place.
              // We might remove or improve this setup in the future.

              // This adds startTimeInterval to publicData
              const startTimeIntervalChanges = handleSubmitValuesForStartTimeInterval(
                values,
                publicDataUpdates
              );
              // This adds lowest price variant to the listing.attributes.price and priceVariants to listing.attributes.publicData
              const priceVariantChanges = handleSubmitValuesForPriceVariants(
                values,
                publicDataUpdates,
                unitType,
                listingTypeConfig
              );
              updateValues = {
                ...priceVariantChanges,
                ...startTimeIntervalChanges,
                publicData: {
                  priceVariationsEnabled: isPriceVariationsInUse,
                  ...startTimeIntervalChanges.publicData,
                  ...priceVariantChanges.publicData,
                },
              };
            } else {
              const priceVariationsEnabledMaybe = isBooking
                ? {
                    publicData: {
                      priceVariationsEnabled: false,
                    },
                  }
                : {};
              updateValues = { price, ...priceVariationsEnabledMaybe };
            }

            // Save the initialValues to state
            // Otherwise, re-rendering would overwrite the values during XHR call.
            setState({
              initialValues: getInitialValues({
                listing: getOptimisticListing(listing, updateValues),
                listingTypes,
                effectiveCurrency,
              }),
            });
            onSubmit(updateValues);
          }}
          marketplaceCurrency={effectiveCurrency}
          coachProfileCurrency={coachProfileCurrency}
          unitType={unitType}
          listingTypeConfig={listingTypeConfig}
          isPriceVariationsInUse={isPriceVariationsInUse}
          listingMinimumPriceSubUnits={listingMinimumPriceSubUnits}
          saveActionMsg={submitButtonText}
          disabled={disabled}
          ready={ready}
          updated={panelUpdated}
          updateInProgress={updateInProgress}
          fetchErrors={errors}
        />
      ) : (
        <div className={css.priceCurrencyInvalid}>
          <FormattedMessage
            id="EditListingPricingPanel.listingPriceCurrencyInvalid"
            values={{
              marketplaceCurrency: effectiveCurrency,
              currency: effectiveCurrency,
              supportedCurrencies: formatAllowedListingCurrencies(),
            }}
          />
        </div>
      )}
    </main>
  );
};

export default EditListingPricingPanel;
