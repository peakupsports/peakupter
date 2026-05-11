import {
  mapHostedCategoriesToPeakUpTopLevelSports,
  PEAKUP_TOP_LEVEL_SPORT_ORDER,
  sortByPeakUpTopLevelSportOrder,
  toPeakUpTopLevelSportKey,
} from './peakupSportTaxonomy';

describe('toPeakUpTopLevelSportKey', () => {
  it('resolves hosted aliases to the canonical PeakUp top-level sport', () => {
    expect(toPeakUpTopLevelSportKey('wakeboarding')).toBe('wakeboard');
    expect(toPeakUpTopLevelSportKey('skiing')).toBe('ski');
    expect(toPeakUpTopLevelSportKey('mountainbike')).toBe('mtb');
    expect(toPeakUpTopLevelSportKey('skate')).toBe('skateboard');
  });

  it('collapses known variants to their SportBar parent sport', () => {
    expect(toPeakUpTopLevelSportKey('freeridesnowboard')).toBe('snowboard');
    expect(toPeakUpTopLevelSportKey('splitboard')).toBe('snowboard');
    expect(toPeakUpTopLevelSportKey('freestyleski')).toBe('ski');
    expect(toPeakUpTopLevelSportKey('skitouring')).toBe('ski');
  });

  it('rejects unrelated legacy categories', () => {
    expect(toPeakUpTopLevelSportKey('paragliding')).toBe('');
    expect(toPeakUpTopLevelSportKey('')).toBe('');
    expect(toPeakUpTopLevelSportKey(null)).toBe('');
  });
});

describe('mapHostedCategoriesToPeakUpTopLevelSports', () => {
  it('filters, normalizes and orders hosted categories like the SportBar', () => {
    const categories = [
      { id: 'legacy-fitness-bootcamp', name: 'Legacy Bootcamp' },
      { id: 'wakeboarding', name: 'Wakeboarding' },
      { id: 'freeridesnowboard', name: 'Freeride Snowboard' },
      { id: 'outdoor-bike', name: 'MTB' },
      { id: 'skiing', name: 'Skiing' },
      { id: 'cross-country', name: 'Cross Country' },
    ];

    expect(mapHostedCategoriesToPeakUpTopLevelSports(categories)).toEqual([
      { id: 'outdoor-bike', name: 'MTB' },
      { id: 'wakeboarding', name: 'Wakeboard' },
      { id: 'freeridesnowboard', name: 'Snowboard' },
      { id: 'skiing', name: 'Ski' },
      { id: 'cross-country', name: 'Cross-country' },
    ]);
  });

  it('dedupes multiple hosted categories that collapse to the same top-level sport', () => {
    const categories = [
      { id: 'freestylesnowboard', name: 'Freestyle Snowboard' },
      { id: 'splitboard', name: 'Splitboard' },
      { id: 'snowboard', name: 'Snowboard' },
      { id: 'surf', name: 'Surf' },
    ];

    expect(mapHostedCategoriesToPeakUpTopLevelSports(categories)).toEqual([
      { id: 'surf', name: 'Surf' },
      { id: 'snowboard', name: 'Snowboard' },
    ]);
  });

  it('returns categories in the shared SportBar order', () => {
    const categories = PEAKUP_TOP_LEVEL_SPORT_ORDER.map(key => ({
      id: key,
      name: `${key}-hosted`,
    })).reverse();

    expect(mapHostedCategoriesToPeakUpTopLevelSports(categories).map(cat => cat.id)).toEqual(
      PEAKUP_TOP_LEVEL_SPORT_ORDER
    );
  });
});

describe('sortByPeakUpTopLevelSportOrder', () => {
  it('sorts items by the shared canonical SportBar order', () => {
    const items = [
      { key: 'ski' },
      { key: 'surf' },
      { key: 'wakeboard' },
      { key: 'mtb' },
      { key: 'crosscountry' },
    ];

    expect(sortByPeakUpTopLevelSportOrder(items, item => item.key)).toEqual([
      { key: 'surf' },
      { key: 'mtb' },
      { key: 'wakeboard' },
      { key: 'ski' },
      { key: 'crosscountry' },
    ]);
  });

  it('keeps unknown items at the tail in original order', () => {
    const items = [{ key: 'legacy-a' }, { key: 'tennis' }, { key: 'legacy-b' }];

    expect(sortByPeakUpTopLevelSportOrder(items, item => item.key)).toEqual([
      { key: 'tennis' },
      { key: 'legacy-a' },
      { key: 'legacy-b' },
    ]);
  });
});
