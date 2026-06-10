import { getListingTypeTranslationId, getLocalizedListingTypeLabel } from './listingTypeLabels';

const intl = {
  formatMessage: ({ id, defaultMessage }) => {
    const messages = {
      'ListingType.hourly_booking': 'Prenotazione oraria',
      'ListingType.price_variations': 'Variazioni di prezzo',
      'ListingType.multi_day_experiences': 'Esperienze multi-giorno',
    };
    return messages[id] || defaultMessage;
  },
};

describe('listingTypeLabels', () => {
  it('resolves translation id from listingType id', () => {
    expect(getListingTypeTranslationId({ listingType: 'Hourly booking', label: 'Hourly booking' })).toBe(
      'ListingType.hourly_booking'
    );
    expect(getListingTypeTranslationId({ listingType: 'Price-variations', label: 'Price variations' })).toBe(
      'ListingType.price_variations'
    );
  });

  it('returns localized label with fallback to hosted label', () => {
    expect(
      getLocalizedListingTypeLabel(intl, { listingType: 'Hourly booking', label: 'Hourly booking' })
    ).toBe('Prenotazione oraria');
    expect(
      getLocalizedListingTypeLabel(intl, { listingType: 'unknown-type', label: 'Custom label' })
    ).toBe('Custom label');
  });
});
