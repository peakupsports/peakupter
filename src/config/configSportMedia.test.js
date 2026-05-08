import {
  SPORT_MEDIA_FALLBACK,
  SPORT_MEDIA_KEYS,
  SPORT_MEDIA_LIBRARY,
  getSportHeroImage,
  getSportHeroImageForCoach,
  pickFirstMappedSportKey,
} from './configSportMedia';

describe('SPORT_MEDIA_LIBRARY', () => {
  it('exposes the 8 sport keys we currently have artwork for', () => {
    expect([...SPORT_MEDIA_KEYS].sort()).toEqual([
      'crosscountry',
      'golf',
      'kitesurf',
      'mtb',
      'ski',
      'skydive',
      'snowboard',
      'tennis',
    ]);
  });

  it('every entry points at /CoachPagePic/*.jpg with the canonical filename', () => {
    expect(SPORT_MEDIA_LIBRARY.snowboard.hero).toBe('/CoachPagePic/Snowboard1.jpg');
    expect(SPORT_MEDIA_LIBRARY.ski.hero).toBe('/CoachPagePic/Ski.jpg');
    expect(SPORT_MEDIA_LIBRARY.mtb.hero).toBe('/CoachPagePic/MTB.jpg');
    expect(SPORT_MEDIA_LIBRARY.golf.hero).toBe('/CoachPagePic/Golf.jpg');
    expect(SPORT_MEDIA_LIBRARY.tennis.hero).toBe('/CoachPagePic/Tennis.jpg');
    expect(SPORT_MEDIA_LIBRARY.kitesurf.hero).toBe('/CoachPagePic/KiteSurf.jpg');
    expect(SPORT_MEDIA_LIBRARY.skydive.hero).toBe('/CoachPagePic/SkyDive.jpg');
    // Filename intentionally preserves the on-disk `Crosscoutry` typo.
    expect(SPORT_MEDIA_LIBRARY.crosscountry.hero).toBe('/CoachPagePic/Crosscoutry.jpg');
  });

  it('is frozen so consumers cannot mutate the registry at runtime', () => {
    expect(Object.isFrozen(SPORT_MEDIA_LIBRARY)).toBe(true);
    expect(() => {
      // @ts-expect-error — runtime guard, TS would block this anyway.
      SPORT_MEDIA_LIBRARY.snowboard = { hero: '/x.jpg' };
    }).toThrow();
  });

  it('exposes Snowboard as the default fallback', () => {
    expect(SPORT_MEDIA_FALLBACK).toBe('/CoachPagePic/Snowboard1.jpg');
  });
});

describe('getSportHeroImage', () => {
  it('returns the mapped hero URL for the canonical normalized key', () => {
    expect(getSportHeroImage('snowboard')).toBe('/CoachPagePic/Snowboard1.jpg');
    expect(getSportHeroImage('mtb')).toBe('/CoachPagePic/MTB.jpg');
    expect(getSportHeroImage('kitesurf')).toBe('/CoachPagePic/KiteSurf.jpg');
    expect(getSportHeroImage('crosscountry')).toBe('/CoachPagePic/Crosscoutry.jpg');
  });

  it('normalizes mixed-case / punctuated / emoji-prefixed input', () => {
    expect(getSportHeroImage('Cross-Country')).toBe('/CoachPagePic/Crosscoutry.jpg');
    expect(getSportHeroImage('cross_country')).toBe('/CoachPagePic/Crosscoutry.jpg');
    expect(getSportHeroImage('Kite Surf')).toBe('/CoachPagePic/KiteSurf.jpg');
    expect(getSportHeroImage('🏂 Snowboard')).toBe('/CoachPagePic/Snowboard1.jpg');
    expect(getSportHeroImage('  MTB  ')).toBe('/CoachPagePic/MTB.jpg');
  });

  it('falls back to Snowboard1.jpg for unmapped keys', () => {
    expect(getSportHeroImage('yoga')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage('pilates')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage('')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage(null)).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage(undefined)).toBe(SPORT_MEDIA_FALLBACK);
  });

  it('returns null when fallback is explicitly disabled', () => {
    expect(getSportHeroImage('yoga', { fallback: null })).toBeNull();
    expect(getSportHeroImage(null, { fallback: null })).toBeNull();
    expect(getSportHeroImage('', { fallback: null })).toBeNull();
  });

  it('honours a caller-supplied fallback override', () => {
    expect(getSportHeroImage('yoga', { fallback: '/static/empty.jpg' })).toBe(
      '/static/empty.jpg'
    );
  });
});

describe('pickFirstMappedSportKey', () => {
  it('returns the first key in the iteration that has a library entry', () => {
    expect(pickFirstMappedSportKey(['yoga', 'mtb', 'ski'])).toBe('mtb');
    expect(pickFirstMappedSportKey(['ski', 'mtb', 'snowboard'])).toBe('ski');
  });

  it('normalizes each candidate before lookup', () => {
    expect(pickFirstMappedSportKey(['Cross-Country', 'Yoga'])).toBe('crosscountry');
    expect(pickFirstMappedSportKey(['🏂 Snowboard', 'mtb'])).toBe('snowboard');
  });

  it('returns null when nothing matches', () => {
    expect(pickFirstMappedSportKey(['yoga', 'pilates'])).toBeNull();
    expect(pickFirstMappedSportKey([])).toBeNull();
  });

  it('handles non-iterable / nullish input gracefully', () => {
    expect(pickFirstMappedSportKey(null)).toBeNull();
    expect(pickFirstMappedSportKey(undefined)).toBeNull();
    expect(pickFirstMappedSportKey(42)).toBeNull();
    expect(pickFirstMappedSportKey({})).toBeNull();
  });
});

describe('getSportHeroImageForCoach', () => {
  const coach = (profileSports, listingSports, sportKeys) => ({
    author: { attributes: { profile: { publicData: { sports: profileSports } } } },
    representativeListing: {
      attributes: { publicData: { sports: listingSports } },
    },
    sportKeys,
  });

  it('uses the coach profile primary sport before listing-level sports', () => {
    expect(getSportHeroImageForCoach(coach(['Snowboard'], ['Ski']))).toBe(
      '/CoachPagePic/Snowboard1.jpg'
    );
  });

  it('falls back to the listing sport when profile has no mapped entry', () => {
    expect(getSportHeroImageForCoach(coach(['Yoga'], ['MTB']))).toBe(
      '/CoachPagePic/MTB.jpg'
    );
  });

  it('falls back to the pre-computed `coach.sportKeys` as last resort', () => {
    expect(
      getSportHeroImageForCoach(coach(undefined, undefined, ['kitesurf']))
    ).toBe('/CoachPagePic/KiteSurf.jpg');
  });

  it('uses the global fallback when no coach sport matches', () => {
    expect(getSportHeroImageForCoach(coach(['Yoga'], ['Pilates']))).toBe(SPORT_MEDIA_FALLBACK);
  });

  it('returns null when fallback is explicitly disabled and no sport matches', () => {
    expect(
      getSportHeroImageForCoach(coach(['Yoga'], ['Pilates']), { fallback: null })
    ).toBeNull();
  });

  it('still returns the matched hero when fallback is disabled but a sport matches', () => {
    expect(
      getSportHeroImageForCoach(coach(['Yoga'], ['MTB']), { fallback: null })
    ).toBe('/CoachPagePic/MTB.jpg');
  });

  it('handles missing / empty coach gracefully', () => {
    expect(getSportHeroImageForCoach(null)).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImageForCoach(undefined)).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImageForCoach({})).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImageForCoach({}, { fallback: null })).toBeNull();
    expect(getSportHeroImageForCoach(null, { fallback: null })).toBeNull();
  });
});
