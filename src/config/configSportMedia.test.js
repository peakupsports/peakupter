import {
  FEATURED_COACH_SECTION_BADGE_SRC,
  SPORT_MEDIA_FALLBACK,
  SPORT_MEDIA_KEYS,
  SPORT_MEDIA_LIBRARY,
  getSportHeroImage,
  getSportHeroImageForCoach,
  pickFirstMappedSportKey,
} from './configSportMedia';

describe('FEATURED_COACH_SECTION_BADGE_SRC', () => {
  it('points at the public CoachPagePic asset with exact on-disk casing', () => {
    expect(FEATURED_COACH_SECTION_BADGE_SRC).toBe('/CoachPagePic/Featured_Coach.jpg');
  });
});

describe('SPORT_MEDIA_LIBRARY', () => {
  it('exposes the 15 top-level sports + 9 Snowboard/Ski variant keys we have artwork for', () => {
    expect([...SPORT_MEDIA_KEYS].sort()).toEqual([
      'climbing',
      'crosscountry',
      'fitness',
      // Snowboard / Ski discipline variants (6 disciplines, 9 keys with aliases).
      'freerideski',
      'freerideskiing',
      'freeridesnowboard',
      'freestyleski',
      'freestyleskiing',
      'freestylesnowboard',
      'golf',
      'kitesurf',
      'mtb',
      'skateboard',
      'ski',
      'skitouring',
      'skydive',
      'snowboard',
      'splitboard',
      'splittouring',
      'surf',
      'tennis',
      'wakeboard',
      'wakesurf',
      'yoga',
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
    // Filename intentionally preserves the on-disk lower-case `surf1.jpg`.
    expect(SPORT_MEDIA_LIBRARY.surf.hero).toBe('/CoachPagePic/surf1.jpg');
    // Filename intentionally preserves the on-disk lower-case `wakeboard.jpg`.
    expect(SPORT_MEDIA_LIBRARY.wakeboard.hero).toBe('/CoachPagePic/wakeboard.jpg');
    // Filename intentionally preserves the on-disk lower-case `wakesurf.jpg`.
    // `wakesurf` is a separate top-level bookable sport (NOT a Wakeboard variant).
    expect(SPORT_MEDIA_LIBRARY.wakesurf.hero).toBe('/CoachPagePic/wakesurf.jpg');
    // Filename intentionally preserves the on-disk lower-case `climbing.jpg`.
    expect(SPORT_MEDIA_LIBRARY.climbing.hero).toBe('/CoachPagePic/climbing.jpg');
    // Filename intentionally preserves the on-disk capitalised `Fitness.jpg`.
    expect(SPORT_MEDIA_LIBRARY.fitness.hero).toBe('/CoachPagePic/Fitness.jpg');
    // Filename intentionally preserves the on-disk lower-case `yoga.jpg`.
    expect(SPORT_MEDIA_LIBRARY.yoga.hero).toBe('/CoachPagePic/yoga.jpg');
    // Filename intentionally preserves the on-disk lower-case `skateboard.jpg`.
    expect(SPORT_MEDIA_LIBRARY.skateboard.hero).toBe('/CoachPagePic/skateboard.jpg');
    // Filename intentionally preserves the on-disk `Crosscoutry` typo.
    expect(SPORT_MEDIA_LIBRARY.crosscountry.hero).toBe('/CoachPagePic/Crosscoutry.jpg');
  });

  it('Snowboard / Ski variant keys resolve to their dedicated artwork', () => {
    // Freeride Ski — both shapes share a single asset.
    expect(SPORT_MEDIA_LIBRARY.freerideskiing.hero).toBe('/CoachPagePic/freerideski.jpg');
    expect(SPORT_MEDIA_LIBRARY.freerideski.hero).toBe('/CoachPagePic/freerideski.jpg');
    // Freeride Snowboard.
    expect(SPORT_MEDIA_LIBRARY.freeridesnowboard.hero).toBe(
      '/CoachPagePic/freeridesnowboard.jpg'
    );
    // Freestyle Ski — both shapes share a single asset.
    expect(SPORT_MEDIA_LIBRARY.freestyleskiing.hero).toBe('/CoachPagePic/freestyleskiing.jpg');
    expect(SPORT_MEDIA_LIBRARY.freestyleski.hero).toBe('/CoachPagePic/freestyleskiing.jpg');
    // Freestyle Snowboard.
    expect(SPORT_MEDIA_LIBRARY.freestylesnowboard.hero).toBe(
      '/CoachPagePic/freestylesnowboard.jpg'
    );
    // Splitboard / Split touring — canonical CoachMap key `splittouring`
    // and colloquial alias `splitboard` share the same asset.
    expect(SPORT_MEDIA_LIBRARY.splittouring.hero).toBe('/CoachPagePic/splitboard.jpg');
    expect(SPORT_MEDIA_LIBRARY.splitboard.hero).toBe('/CoachPagePic/splitboard.jpg');
    // Ski touring.
    expect(SPORT_MEDIA_LIBRARY.skitouring.hero).toBe('/CoachPagePic/skitouring.jpg');
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

  // ───────────────────────────────────────────────────────────────────
  // CoachesPage filtered URLs flow through `getSportHeroImage` directly:
  //   /coaches?sport=freerideski → getSportHeroImage('freerideski')
  // These tests guard the end-to-end variant resolution so a future
  // refactor of `normalizeSportKey` or the library shape can't
  // silently regress the hero swap.
  // ───────────────────────────────────────────────────────────────────
  it('resolves Snowboard / Ski variant slugs from CoachesPage ?sport= URLs', () => {
    expect(getSportHeroImage('freerideski')).toBe('/CoachPagePic/freerideski.jpg');
    expect(getSportHeroImage('freerideskiing')).toBe('/CoachPagePic/freerideski.jpg');
    expect(getSportHeroImage('freeridesnowboard')).toBe('/CoachPagePic/freeridesnowboard.jpg');
    expect(getSportHeroImage('freestyleski')).toBe('/CoachPagePic/freestyleskiing.jpg');
    expect(getSportHeroImage('freestyleskiing')).toBe('/CoachPagePic/freestyleskiing.jpg');
    expect(getSportHeroImage('freestylesnowboard')).toBe('/CoachPagePic/freestylesnowboard.jpg');
    expect(getSportHeroImage('splittouring')).toBe('/CoachPagePic/splitboard.jpg');
    expect(getSportHeroImage('splitboard')).toBe('/CoachPagePic/splitboard.jpg');
    expect(getSportHeroImage('skitouring')).toBe('/CoachPagePic/skitouring.jpg');
  });

  it('still resolves variant slugs even with capitalisation / separators', () => {
    // Defensive: confirms `normalizeSportKey` lowercases + strips
    // non-alphanumerics before lookup, so a label coming from a
    // human-edited footer link or a category title still hits the
    // variant entry without an alias table.
    expect(getSportHeroImage('Freeride Ski')).toBe('/CoachPagePic/freerideski.jpg');
    expect(getSportHeroImage('freeride-ski')).toBe('/CoachPagePic/freerideski.jpg');
    expect(getSportHeroImage('Ski Touring')).toBe('/CoachPagePic/skitouring.jpg');
    expect(getSportHeroImage('Split-Touring')).toBe('/CoachPagePic/splitboard.jpg');
    expect(getSportHeroImage('🏂 Freeride Snowboard')).toBe(
      '/CoachPagePic/freeridesnowboard.jpg'
    );
  });

  it('falls back to Snowboard1.jpg for unmapped keys', () => {
    // `dance` / `pilates` are intentionally OUTSIDE the SportBar /
    // `SPORT_MEDIA_LIBRARY` key set, so they remain valid stand-ins for
    // "unmapped sport" in this fallback test even after the library
    // grew to cover all canonical SportBar sports.
    expect(getSportHeroImage('dance')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage('pilates')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage('')).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage(null)).toBe(SPORT_MEDIA_FALLBACK);
    expect(getSportHeroImage(undefined)).toBe(SPORT_MEDIA_FALLBACK);
  });

  it('returns null when fallback is explicitly disabled', () => {
    expect(getSportHeroImage('dance', { fallback: null })).toBeNull();
    expect(getSportHeroImage(null, { fallback: null })).toBeNull();
    expect(getSportHeroImage('', { fallback: null })).toBeNull();
  });

  it('honours a caller-supplied fallback override', () => {
    expect(getSportHeroImage('dance', { fallback: '/static/empty.jpg' })).toBe(
      '/static/empty.jpg'
    );
  });
});

describe('pickFirstMappedSportKey', () => {
  // `dance` / `pilates` are intentionally OUTSIDE the SportBar /
  // `SPORT_MEDIA_LIBRARY` key set, used here as stable stand-ins for
  // "unmapped sport".
  it('returns the first key in the iteration that has a library entry', () => {
    expect(pickFirstMappedSportKey(['dance', 'mtb', 'ski'])).toBe('mtb');
    expect(pickFirstMappedSportKey(['ski', 'mtb', 'snowboard'])).toBe('ski');
  });

  it('normalizes each candidate before lookup', () => {
    expect(pickFirstMappedSportKey(['Cross-Country', 'Dance'])).toBe('crosscountry');
    expect(pickFirstMappedSportKey(['🏂 Snowboard', 'mtb'])).toBe('snowboard');
  });

  it('returns null when nothing matches', () => {
    expect(pickFirstMappedSportKey(['dance', 'pilates'])).toBeNull();
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

  // `Dance` / `Pilates` are intentionally OUTSIDE the SportBar /
  // `SPORT_MEDIA_LIBRARY` key set, so they remain valid stand-ins for
  // "unmapped sport" even after the library grew to cover Yoga.
  it('falls back to the listing sport when profile has no mapped entry', () => {
    expect(getSportHeroImageForCoach(coach(['Dance'], ['MTB']))).toBe(
      '/CoachPagePic/MTB.jpg'
    );
  });

  it('falls back to the pre-computed `coach.sportKeys` as last resort', () => {
    expect(
      getSportHeroImageForCoach(coach(undefined, undefined, ['kitesurf']))
    ).toBe('/CoachPagePic/KiteSurf.jpg');
  });

  it('uses the global fallback when no coach sport matches', () => {
    expect(getSportHeroImageForCoach(coach(['Dance'], ['Pilates']))).toBe(SPORT_MEDIA_FALLBACK);
  });

  it('returns null when fallback is explicitly disabled and no sport matches', () => {
    expect(
      getSportHeroImageForCoach(coach(['Dance'], ['Pilates']), { fallback: null })
    ).toBeNull();
  });

  it('still returns the matched hero when fallback is disabled but a sport matches', () => {
    expect(
      getSportHeroImageForCoach(coach(['Dance'], ['MTB']), { fallback: null })
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
