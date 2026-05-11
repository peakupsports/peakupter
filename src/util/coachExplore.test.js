import {
  countryDisplayName,
  countryDisplayNameToCode,
  deriveCountryCodeFromPlace,
  derivePlaceShortLabel,
  formatCoachExploreSportSlug,
  getCoachDisplayLocation,
  getCoachFullLocationLabel,
  getCoachMapLocationLabel,
  getCoachShortLocationLabel,
  haversineDistanceKm,
  looksLikeCoordinates,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
  SPORT_VARIANT_DISPLAY_LABELS,
} from './coachExplore';

describe('parseCoachExploreSearch', () => {
  it('parses sport and geo query', () => {
    expect(parseCoachExploreSearch('?sport=golf&lat=46.95&lng=7.44&location=Bern')).toEqual({
      sportKey: 'golf',
      userLat: 46.95,
      userLng: 7.44,
      locationLabel: 'Bern',
      coachId: '',
    });
  });

  it('ignores invalid lat/lng', () => {
    expect(parseCoachExploreSearch('?lat=nan&lng=x')).toEqual({
      sportKey: '',
      userLat: null,
      userLng: null,
      locationLabel: '',
      coachId: '',
    });
  });
});

describe('formatCoachExploreSportSlug', () => {
  it('title-cases hyphenated slugs', () => {
    expect(formatCoachExploreSportSlug('freeride-snowboard')).toBe('Freeride Snowboard');
  });

  // The CoachesPage hero headline is built from `?sport=<variant>` slugs
  // that are typically compound, separator-less words. The pinned
  // `SPORT_VARIANT_DISPLAY_LABELS` map is the canonical source for
  // those labels — these assertions guard the user-visible copy
  // ("Find your Freestyle Snowboard coach") against regressions in the
  // formatter or the registry.
  it('resolves canonical labels for Snowboard / Ski variant slugs', () => {
    expect(formatCoachExploreSportSlug('freerideski')).toBe('Freeride Ski');
    expect(formatCoachExploreSportSlug('freerideskiing')).toBe('Freeride Ski');
    expect(formatCoachExploreSportSlug('freeridesnowboard')).toBe('Freeride Snowboard');
    expect(formatCoachExploreSportSlug('freestyleski')).toBe('Freestyle Ski');
    expect(formatCoachExploreSportSlug('freestyleskiing')).toBe('Freestyle Ski');
    expect(formatCoachExploreSportSlug('freestylesnowboard')).toBe('Freestyle Snowboard');
    expect(formatCoachExploreSportSlug('splitboard')).toBe('Splitboard');
    expect(formatCoachExploreSportSlug('splittouring')).toBe('Splitboard');
    expect(formatCoachExploreSportSlug('skitouring')).toBe('Ski Touring');
  });

  it('resolves variant labels regardless of casing / separators', () => {
    // Defensive: lookup collapses non-alphanumerics before matching, so
    // human-edited inputs ("Freeride-Ski", "FREESTYLE_SNOWBOARD") still
    // hit the pinned label instead of falling through to the
    // title-case fallback.
    expect(formatCoachExploreSportSlug('Freeride-Ski')).toBe('Freeride Ski');
    expect(formatCoachExploreSportSlug('FREESTYLE_SNOWBOARD')).toBe('Freestyle Snowboard');
    expect(formatCoachExploreSportSlug('  ski touring  ')).toBe('Ski Touring');
    expect(formatCoachExploreSportSlug('Split-Touring')).toBe('Splitboard');
  });

  it('falls back to title-case for non-variant slugs (top-level sports)', () => {
    // Top-level sports are intentionally NOT in the variant registry —
    // their single-word slugs are already handled correctly by the
    // generic title-case path, and we don't want this formatter to
    // shadow the canonical SPORT_LABELS that live elsewhere
    // (SportBar, Profile Settings, …).
    expect(formatCoachExploreSportSlug('snowboard')).toBe('Snowboard');
    expect(formatCoachExploreSportSlug('ski')).toBe('Ski');
    expect(formatCoachExploreSportSlug('kitesurf')).toBe('Kitesurf');
  });

  it('returns empty string for nullish / empty input', () => {
    expect(formatCoachExploreSportSlug('')).toBe('');
    expect(formatCoachExploreSportSlug(null)).toBe('');
    expect(formatCoachExploreSportSlug(undefined)).toBe('');
    expect(formatCoachExploreSportSlug('   ')).toBe('');
  });
});

describe('SPORT_VARIANT_DISPLAY_LABELS', () => {
  it('pins both slug shapes for each variant discipline (short + long form)', () => {
    // Both shapes must coexist so the registry tolerates either the
    // Console-style slug (`freerideski`) or the CoachMap canonical
    // key (`freerideskiing`). When they share a discipline they must
    // share the SAME display label.
    expect(SPORT_VARIANT_DISPLAY_LABELS.freerideski).toBe(
      SPORT_VARIANT_DISPLAY_LABELS.freerideskiing
    );
    expect(SPORT_VARIANT_DISPLAY_LABELS.freestyleski).toBe(
      SPORT_VARIANT_DISPLAY_LABELS.freestyleskiing
    );
    expect(SPORT_VARIANT_DISPLAY_LABELS.splitboard).toBe(
      SPORT_VARIANT_DISPLAY_LABELS.splittouring
    );
  });

  it('exposes the six Snowboard / Ski variants the brief listed', () => {
    expect(SPORT_VARIANT_DISPLAY_LABELS.freerideski).toBe('Freeride Ski');
    expect(SPORT_VARIANT_DISPLAY_LABELS.freeridesnowboard).toBe('Freeride Snowboard');
    expect(SPORT_VARIANT_DISPLAY_LABELS.freestyleski).toBe('Freestyle Ski');
    expect(SPORT_VARIANT_DISPLAY_LABELS.freestylesnowboard).toBe('Freestyle Snowboard');
    expect(SPORT_VARIANT_DISPLAY_LABELS.splitboard).toBe('Splitboard');
    expect(SPORT_VARIANT_DISPLAY_LABELS.skitouring).toBe('Ski Touring');
  });

  it('is frozen so consumers cannot mutate the registry at runtime', () => {
    expect(Object.isFrozen(SPORT_VARIANT_DISPLAY_LABELS)).toBe(true);
  });
});

describe('sortCoachRowsByDistanceKm', () => {
  const row = (uuid, lat, lng) => ({
    authorUuid: uuid,
    representativeListing: {
      attributes: { geolocation: { lat, lng } },
    },
  });

  it('orders by distance from user', () => {
    const a = row('a', 47.0, 7.5);
    const b = row('b', 46.95, 7.44);
    const c = row('c', null, null);
    const sorted = sortCoachRowsByDistanceKm([a, b, c], 46.948, 7.4474);
    expect(sorted[0].authorUuid).toBe('b');
    expect(sorted[1].authorUuid).toBe('a');
    expect(sorted[2].authorUuid).toBe('c');
  });
});

describe('haversineDistanceKm', () => {
  it('returns null for invalid input', () => {
    expect(haversineDistanceKm(NaN, 1, 2, 3)).toBeNull();
  });
});

describe('looksLikeCoordinates', () => {
  it('matches typical "lat, lng" pairs', () => {
    expect(looksLikeCoordinates('38.644566, -9.233415')).toBe(true);
    expect(looksLikeCoordinates('46.95,7.44')).toBe(true);
    expect(looksLikeCoordinates('  -89.0, 180.0  ')).toBe(true);
  });

  it('does not match human addresses', () => {
    expect(looksLikeCoordinates('Lisbon, Portugal')).toBe(false);
    expect(looksLikeCoordinates('Costa da Caparica')).toBe(false);
    expect(looksLikeCoordinates('1st Avenue, NYC')).toBe(false);
  });

  it('does not match non-strings', () => {
    expect(looksLikeCoordinates(null)).toBe(false);
    expect(looksLikeCoordinates(undefined)).toBe(false);
    expect(looksLikeCoordinates(42)).toBe(false);
    expect(looksLikeCoordinates({})).toBe(false);
  });
});

describe('countryDisplayName', () => {
  it('expands ISO-2 country codes', () => {
    expect(countryDisplayName('PT', 'en')).toBe('Portugal');
    expect(countryDisplayName('CH', 'en')).toBe('Switzerland');
    expect(countryDisplayName('us', 'en')).toBe('United States');
  });

  it('keeps already-expanded names as-is', () => {
    expect(countryDisplayName('Portugal')).toBe('Portugal');
    expect(countryDisplayName('United Kingdom')).toBe('United Kingdom');
  });

  it('returns null for empty / nullish input', () => {
    expect(countryDisplayName(null)).toBeNull();
    expect(countryDisplayName('')).toBeNull();
    expect(countryDisplayName('   ')).toBeNull();
  });
});

describe('getCoachDisplayLocation', () => {
  const coachWithProfile = pd => ({
    author: { attributes: { profile: { publicData: pd } } },
  });

  it('prefers explicit `coach.locationLabel` override', () => {
    expect(
      getCoachDisplayLocation({
        ...coachWithProfile({ coachCityText: 'St. Moritz, CH' }),
        locationLabel: 'Engadina',
      })
    ).toBe('Engadina');
  });

  it('reads `coachCityText` from publicData', () => {
    expect(
      getCoachDisplayLocation(coachWithProfile({ coachCityText: 'Costa da Caparica, Portugal' }))
    ).toBe('Costa da Caparica, Portugal');
  });

  it('reads geocoded `selectedPlace.address` from `publicData.location`', () => {
    expect(
      getCoachDisplayLocation(
        coachWithProfile({
          location: {
            search: '38.644566, -9.233415',
            selectedPlace: { address: 'Lisbon, Portugal' },
          },
        })
      )
    ).toBe('Lisbon, Portugal');
  });

  it('NEVER returns coordinate-shaped strings', () => {
    // No selectedPlace.address available, only the raw search string with coords.
    const result = getCoachDisplayLocation(
      coachWithProfile({
        location: { search: '38.644566, -9.233415' },
      })
    );
    expect(result).toBeNull();
  });

  it('falls back to country display name when nothing else is available', () => {
    expect(
      getCoachDisplayLocation(coachWithProfile({ country: 'PT' }), { locale: 'en' })
    ).toBe('Portugal');
  });

  it('composes "City, Country" when both are present', () => {
    expect(
      getCoachDisplayLocation(coachWithProfile({ city: 'Lisbon', country: 'PT' }), {
        locale: 'en',
      })
    ).toBe('Lisbon, Portugal');
  });

  it('reads listing publicData address as last fallback', () => {
    expect(
      getCoachDisplayLocation({
        author: { attributes: { profile: { publicData: {} } } },
        representativeListing: {
          attributes: {
            publicData: {
              location: { selectedPlace: { address: 'Cape Town, South Africa' } },
            },
          },
        },
      })
    ).toBe('Cape Town, South Africa');
  });

  it('returns null when nothing usable is available', () => {
    expect(getCoachDisplayLocation({})).toBeNull();
    expect(
      getCoachDisplayLocation({
        author: { attributes: { profile: { publicData: {} } } },
      })
    ).toBeNull();
  });

  it('rejects coordinate-shaped values across every source', () => {
    expect(
      getCoachDisplayLocation(coachWithProfile({ coachCityText: '38.644566, -9.233415' }))
    ).toBeNull();
    expect(
      getCoachDisplayLocation(coachWithProfile({ locationName: '38.644566, -9.233415' }))
    ).toBeNull();
  });
});

describe('countryDisplayNameToCode', () => {
  it('reverses common English country names to ISO-2 codes', () => {
    expect(countryDisplayNameToCode('Switzerland', 'en')).toBe('CH');
    expect(countryDisplayNameToCode('Italy', 'en')).toBe('IT');
    expect(countryDisplayNameToCode('Portugal', 'en')).toBe('PT');
    expect(countryDisplayNameToCode('Argentina', 'en')).toBe('AR');
    expect(countryDisplayNameToCode('  united states  ', 'en')).toBe('US');
  });

  it('handles non-English locales when the locale knows the name', () => {
    expect(countryDisplayNameToCode('Schweiz', 'de')).toBe('CH');
    expect(countryDisplayNameToCode('Suisse', 'fr')).toBe('CH');
  });

  it('falls back to English when the requested locale does not match', () => {
    // German-named user but the address came back in English from Mapbox.
    expect(countryDisplayNameToCode('Switzerland', 'de')).toBe('CH');
  });

  it('returns empty string for nullish / empty / unknown input', () => {
    expect(countryDisplayNameToCode(null)).toBe('');
    expect(countryDisplayNameToCode('')).toBe('');
    expect(countryDisplayNameToCode('   ')).toBe('');
    expect(countryDisplayNameToCode('Atlantis')).toBe('');
  });
});

describe('deriveCountryCodeFromPlace', () => {
  it('reads `selectedPlace.countryCode` when the patch has persisted it', () => {
    expect(
      deriveCountryCodeFromPlace({
        selectedPlace: { countryCode: 'CH', address: 'whatever' },
      })
    ).toBe('CH');
  });

  it('falls back to extracting the country from the address tail', () => {
    expect(
      deriveCountryCodeFromPlace({
        selectedPlace: { address: 'St. Moritz, Grisons, Switzerland' },
      })
    ).toBe('CH');
    expect(
      deriveCountryCodeFromPlace({
        selectedPlace: { address: 'Lenzerheide, Switzerland' },
      })
    ).toBe('CH');
    expect(
      deriveCountryCodeFromPlace({
        selectedPlace: { address: 'Milan, Italy' },
      })
    ).toBe('IT');
    expect(
      deriveCountryCodeFromPlace({
        selectedPlace: { address: 'Lisbon, Portugal' },
      })
    ).toBe('PT');
  });

  it('uses the provided locale to recognise localized country names', () => {
    expect(
      deriveCountryCodeFromPlace(
        { selectedPlace: { address: 'Zürich, Schweiz' } },
        'de'
      )
    ).toBe('CH');
  });

  it('uses `location.search` as a last resort', () => {
    expect(
      deriveCountryCodeFromPlace({ search: 'Chamonix, Auvergne-Rhône-Alpes, France' })
    ).toBe('FR');
  });

  it('returns empty string when no country is recognisable', () => {
    expect(deriveCountryCodeFromPlace(null)).toBe('');
    expect(deriveCountryCodeFromPlace({})).toBe('');
    expect(
      deriveCountryCodeFromPlace({ selectedPlace: { address: 'Laax' } })
    ).toBe('');
    expect(
      deriveCountryCodeFromPlace({ selectedPlace: { address: '46.80, 9.25' } })
    ).toBe('');
  });
});

describe('derivePlaceShortLabel', () => {
  it('returns the first comma-delimited segment of a saved Mapbox address', () => {
    expect(
      derivePlaceShortLabel({
        selectedPlace: { address: 'St. Moritz, Grisons, Switzerland' },
      })
    ).toBe('St. Moritz');
    expect(
      derivePlaceShortLabel({
        selectedPlace: { address: 'Laax, Grisons, Switzerland' },
      })
    ).toBe('Laax');
    expect(
      derivePlaceShortLabel({
        selectedPlace: { address: 'Lisbon, Portugal' },
      })
    ).toBe('Lisbon');
    expect(
      derivePlaceShortLabel({
        selectedPlace: { address: 'Zermatt, Valais, Switzerland' },
      })
    ).toBe('Zermatt');
  });

  it('prefers `selectedPlace.name` / `placeName` / `text` if Mapbox provided one', () => {
    expect(
      derivePlaceShortLabel({
        selectedPlace: {
          name: 'St. Moritz',
          address: 'St. Moritz, Grisons, Switzerland',
        },
      })
    ).toBe('St. Moritz');
    expect(
      derivePlaceShortLabel({ selectedPlace: { placeName: 'Laax' } })
    ).toBe('Laax');
  });

  it('falls back to `search` when no selectedPlace is available', () => {
    expect(derivePlaceShortLabel({ search: 'Chamonix, Auvergne-Rhône-Alpes, France' })).toBe(
      'Chamonix'
    );
  });

  it('rejects coordinate-shaped strings everywhere', () => {
    expect(
      derivePlaceShortLabel({ selectedPlace: { address: '46.80, 9.25' } })
    ).toBeNull();
    expect(derivePlaceShortLabel({ search: '46.80, 9.25' })).toBeNull();
  });

  it('returns null for empty / non-object input', () => {
    expect(derivePlaceShortLabel(null)).toBeNull();
    expect(derivePlaceShortLabel({})).toBeNull();
    expect(derivePlaceShortLabel('Laax')).toBeNull();
  });
});

describe('getCoachShortLocationLabel', () => {
  const coachWithProfile = pd => ({
    author: { attributes: { profile: { publicData: pd } } },
  });

  it('reads the visual `coachCityText` short label', () => {
    expect(getCoachShortLocationLabel(coachWithProfile({ coachCityText: 'Laax' }))).toBe(
      'Laax'
    );
  });

  it('shortens legacy `coachCityText` values that store the full Mapbox address', () => {
    // Pre-refactor profiles persisted the entire Mapbox address into
    // `coachCityText`. The helper must collapse it to the first segment so
    // the figurina still reads as a clean place name.
    expect(
      getCoachShortLocationLabel(
        coachWithProfile({ coachCityText: 'St. Moritz, Maloja District, Grisons, Switzerland' })
      )
    ).toBe('St. Moritz');
  });

  it('derives a short label from the saved Mapbox autocomplete value', () => {
    expect(
      getCoachShortLocationLabel(
        coachWithProfile({
          location: {
            search: 'St. Moritz, Grisons, Switzerland',
            selectedPlace: {
              address: 'St. Moritz, Grisons, Switzerland',
              origin: { lat: 46.4983, lng: 9.8401 },
            },
          },
        })
      )
    ).toBe('St. Moritz');
  });

  it('prefers explicit caller override over publicData', () => {
    expect(
      getCoachShortLocationLabel({
        ...coachWithProfile({ coachCityText: 'Laax' }),
        locationLabel: 'Engadina',
      })
    ).toBe('Engadina');
  });

  it('falls back to listing-level Mapbox value when profile has nothing', () => {
    expect(
      getCoachShortLocationLabel({
        author: { attributes: { profile: { publicData: {} } } },
        representativeListing: {
          attributes: {
            publicData: {
              location: { selectedPlace: { address: 'Cape Town, Western Cape, South Africa' } },
            },
          },
        },
      })
    ).toBe('Cape Town');
  });

  it('falls back to country display name when nothing else is available', () => {
    expect(
      getCoachShortLocationLabel(coachWithProfile({ country: 'CH' }), { locale: 'en' })
    ).toBe('Switzerland');
  });

  it('composes "City, Country" from explicit fields when both are present', () => {
    expect(
      getCoachShortLocationLabel(coachWithProfile({ city: 'Zermatt', country: 'CH' }), {
        locale: 'en',
      })
    ).toBe('Zermatt, Switzerland');
  });

  it('rejects coordinate-shaped values everywhere', () => {
    expect(
      getCoachShortLocationLabel(coachWithProfile({ coachCityText: '46.8, 9.2' }))
    ).toBeNull();
    expect(
      getCoachShortLocationLabel(coachWithProfile({ locationName: '46.8, 9.2' }))
    ).toBeNull();
  });

  it('normalizes "St.Moritz" → "St. Moritz" (missing space after period)', () => {
    expect(
      getCoachShortLocationLabel(coachWithProfile({ coachCityText: 'St.Moritz' }))
    ).toBe('St. Moritz');
  });

  it('collapses repeated tokens such as "Laax Laax" → "Laax"', () => {
    expect(
      getCoachShortLocationLabel(coachWithProfile({ coachCityText: 'Laax Laax' }))
    ).toBe('Laax');
  });
});

describe('getCoachFullLocationLabel', () => {
  const coachWithProfile = pd => ({
    author: { attributes: { profile: { publicData: pd } } },
  });

  it('returns the full clean Mapbox address when persisted on the profile', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({
          location: {
            selectedPlace: { address: 'Lenzerheide, Grisons, Switzerland' },
          },
        })
      )
    ).toBe('Lenzerheide, Grisons, Switzerland');

    expect(
      getCoachFullLocationLabel(
        coachWithProfile({
          location: {
            selectedPlace: { address: 'St. Moritz, Grisons, Switzerland' },
          },
        })
      )
    ).toBe('St. Moritz, Grisons, Switzerland');
  });

  it('normalizes "St.Moritz" → "St. Moritz" inside the full address', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'St.Moritz, Grisons, Switzerland' } },
        })
      )
    ).toBe('St. Moritz, Grisons, Switzerland');
  });

  it('dedupes repeated tokens within a segment ("Laax Laax" → "Laax")', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'Laax Laax, Grisons, Switzerland' } },
        })
      )
    ).toBe('Laax, Grisons, Switzerland');
  });

  it('dedupes adjacent identical comma-segments ("Laax, Laax, …" → "Laax, …")', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'Laax, Laax, Switzerland' } },
        })
      )
    ).toBe('Laax, Switzerland');
  });

  it('falls back to listing-level Mapbox address when profile has none', () => {
    expect(
      getCoachFullLocationLabel({
        author: { attributes: { profile: { publicData: {} } } },
        representativeListing: {
          attributes: {
            publicData: {
              location: {
                selectedPlace: { address: 'Cape Town, Western Cape, South Africa' },
              },
            },
          },
        },
      })
    ).toBe('Cape Town, Western Cape, South Africa');
  });

  it('accepts legacy `coachCityText` storing a full multi-segment address', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({ coachCityText: 'St.Moritz, Grisons, Switzerland' })
      )
    ).toBe('St. Moritz, Grisons, Switzerland');
  });

  it('composes "City, Country" from explicit fields when both are present', () => {
    expect(
      getCoachFullLocationLabel(coachWithProfile({ city: 'Lisbon', country: 'PT' }), {
        locale: 'en',
      })
    ).toBe('Lisbon, Portugal');
  });

  it('falls back to the short label when only single-token data exists', () => {
    // A coach with just `coachCityText: "Laax"` (no Mapbox address, no
    // country) gets the short value back so the box never renders empty.
    expect(getCoachFullLocationLabel(coachWithProfile({ coachCityText: 'Laax' }))).toBe(
      'Laax'
    );
  });

  it('rejects coordinate-shaped strings everywhere', () => {
    expect(
      getCoachFullLocationLabel(
        coachWithProfile({ location: { selectedPlace: { address: '46.80, 9.25' } } })
      )
    ).toBeNull();
  });

  it('returns null when nothing usable is available', () => {
    expect(getCoachFullLocationLabel({})).toBeNull();
    expect(
      getCoachFullLocationLabel({ author: { attributes: { profile: { publicData: {} } } } })
    ).toBeNull();
  });
});

describe('getCoachMapLocationLabel', () => {
  const coachWithProfile = pd => ({
    author: { attributes: { profile: { publicData: pd } } },
  });

  it('renders Filo as "St. Moritz, Switzerland" (St.Moritz spacing fix + Mapbox country)', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'St.Moritz, Grisons, Switzerland' } },
        })
      )
    ).toBe('St. Moritz, Switzerland');
  });

  it('renders Gary as "London, United Kingdom"', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({
          coachCityText: 'London',
          location: { selectedPlace: { address: 'London, England, United Kingdom' } },
        })
      )
    ).toBe('London, United Kingdom');
  });

  it('renders Gini as "Lisbon, Portugal" (dedupes "Lisbon, Lisbon, Portugal")', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'Lisbon, Lisbon, Portugal' } },
        })
      )
    ).toBe('Lisbon, Portugal');
  });

  it('renders Dani as "Lenzerheide, Switzerland"', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({
          location: { selectedPlace: { address: 'Lenzerheide, Grisons, Switzerland' } },
        })
      )
    ).toBe('Lenzerheide, Switzerland');
  });

  it('reads `selectedPlace.countryCode` fast-path when previously persisted', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({
          coachCityText: 'St. Moritz',
          location: {
            selectedPlace: {
              address: 'St. Moritz, Grisons, Switzerland',
              countryCode: 'CH',
            },
          },
        })
      )
    ).toBe('St. Moritz, Switzerland');
  });

  it('does NOT use `publicData.country` (nationality) as country fallback', () => {
    // Italian coach typing only `coachCityText: "St. Moritz"` (no Mapbox
    // geocode saved): the label must NOT add ", Italy" — the country only
    // comes from the coaching place. With no Mapbox country, render the
    // city alone.
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({ coachCityText: 'St. Moritz', country: 'IT' })
      )
    ).toBe('St. Moritz');
  });

  it('returns just the city when no Mapbox country is recoverable', () => {
    expect(
      getCoachMapLocationLabel(coachWithProfile({ coachCityText: 'Laax' }))
    ).toBe('Laax');
  });

  it('falls back to listing-level Mapbox geocode for the country', () => {
    expect(
      getCoachMapLocationLabel({
        author: {
          attributes: { profile: { publicData: { coachCityText: 'Cape Town' } } },
        },
        representativeListing: {
          attributes: {
            publicData: {
              location: {
                selectedPlace: { address: 'Cape Town, Western Cape, South Africa' },
              },
            },
          },
        },
      })
    ).toBe('Cape Town, South Africa');
  });

  it('rejects coordinate-shaped strings everywhere', () => {
    expect(
      getCoachMapLocationLabel(
        coachWithProfile({ location: { selectedPlace: { address: '46.80, 9.25' } } })
      )
    ).toBeNull();
  });

  it('returns null when nothing usable is available', () => {
    expect(getCoachMapLocationLabel({})).toBeNull();
    expect(
      getCoachMapLocationLabel({ author: { attributes: { profile: { publicData: {} } } } })
    ).toBeNull();
  });
});
