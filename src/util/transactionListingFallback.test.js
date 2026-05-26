import { createTransaction } from './testData';
import {
  buildFallbackListingFromTransaction,
  isCanceledBookingTransaction,
  resolveTransactionPageListing,
} from './transactionListingFallback';
import { getProcess } from '../transactions/transaction';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';

describe('transactionListingFallback', () => {
  const process = getProcess('default-booking');

  const canceledTx = createTransaction({
    id: 'tx-1',
    processName: 'default-booking/release-1',
    lastTransition: bookingTransitions.PROVIDER_CANCEL,
    customer: { id: { uuid: 'customer-1' } },
    provider: { id: { uuid: 'provider-1' } },
  });

  it('detects canceled booking state', () => {
    expect(isCanceledBookingTransaction(canceledTx, process)).toBe(true);
  });

  it('builds fallback listing from transaction protected data', () => {
    canceledTx.attributes.protectedData = {
      priceVariantName: 'Tennis session',
      unitType: 'hour',
      listingType: 'hourly',
    };
    const listing = buildFallbackListingFromTransaction(canceledTx);
    expect(listing.attributes.title).toBe('Tennis session');
    expect(listing.author).toEqual(canceledTx.provider);
  });

  it('uses fallback when listing entity is missing', () => {
    const { listing, listingUnavailable } = resolveTransactionPageListing(canceledTx, null);
    expect(listingUnavailable).toBe(true);
    expect(listing.attributes.title).toBeTruthy();
  });

  it('keeps API listing when present', () => {
    const apiListing = {
      id: { uuid: 'listing-1' },
      attributes: { title: 'Live listing' },
    };
    const result = resolveTransactionPageListing(canceledTx, apiListing);
    expect(result.listingUnavailable).toBe(false);
    expect(result.listing).toBe(apiListing);
  });
});
