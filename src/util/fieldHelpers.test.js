import {
  coerceListingPublicDataLocationForUi,
  listingPublicDataLocationAddressLine,
} from './fieldHelpers';

describe('coerceListingPublicDataLocationForUi / listingPublicDataLocationAddressLine', () => {
  it('parses classic building + address shape', () => {
    const raw = { building: 'Block A', address: 'Bahnhofstrasse 1, Zürich' };
    expect(coerceListingPublicDataLocationForUi(raw)).toEqual({
      building: 'Block A',
      address: 'Bahnhofstrasse 1, Zürich',
    });
    expect(listingPublicDataLocationAddressLine(raw)).toBe('Block A, Bahnhofstrasse 1, Zürich');
  });

  it('parses plain string', () => {
    expect(coerceListingPublicDataLocationForUi('  Bern  ')).toEqual({ address: 'Bern' });
    expect(listingPublicDataLocationAddressLine('Bern')).toBe('Bern');
  });

  it('parses LocationAutocomplete-shaped stored value', () => {
    const raw = {
      predictions: [],
      search: 'Bern',
      selectedPlace: { address: 'Bern, Switzerland' },
    };
    expect(coerceListingPublicDataLocationForUi(raw)).toEqual({ address: 'Bern, Switzerland' });
    expect(listingPublicDataLocationAddressLine(raw)).toBe('Bern, Switzerland');
  });

  it('returns null / empty for unusable values', () => {
    expect(coerceListingPublicDataLocationForUi(null)).toBeNull();
    expect(coerceListingPublicDataLocationForUi({ predictions: [] })).toBeNull();
    expect(listingPublicDataLocationAddressLine({ predictions: [] })).toBe('');
  });
});
