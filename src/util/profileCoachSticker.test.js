import { resolveCoachLocationStickerSlug } from '../config/configCoachCity';
import {
  coachStickerShowsVerifiedSeal,
  comparePeakupFeaturedCoaches,
  formatProfileLanguagesForSticker,
  mergeCoachSports,
  peakupCoachBadgePriorityFor,
  peakupCoachReviewScore,
  resolvePeakupCoachBadgeIds,
  sportsForFigurinaOverlay,
} from './profileCoachSticker';

const intlCoachLanguagePassthrough = {
  formatMessage: ({ defaultMessage }) => defaultMessage,
};

describe('sportsForFigurinaOverlay', () => {
  it('consolidates freeride and freestyle snowboard into one snowboard for figurina', () => {
    expect(
      sportsForFigurinaOverlay(['Freeride Snowboard', 'Freestyle snowboard', 'ski'])
    ).toEqual(['snowboard', 'ski']);
  });

  it('keeps snowboard base alongside other sports and skips variants', () => {
    expect(sportsForFigurinaOverlay(['snowboard', 'Freeride Snowboard', 'surf'])).toEqual([
      'snowboard',
      'surf',
    ]);
  });

  it('mergesCoachSports-compatible keys still consolidate variants', () => {
    const merged = mergeCoachSports(
      { sports: ['freeridesnowboard'] },
      { sports: ['freestylesnowboard'] }
    );
    expect(sportsForFigurinaOverlay(merged)).toEqual(['snowboard']);
  });

  it('consolidates split touring with snowboard family on figurina', () => {
    expect(sportsForFigurinaOverlay(['Split touring', 'ski'])).toEqual(['snowboard', 'ski']);
    expect(sportsForFigurinaOverlay(['splittouring', 'snowboard'])).toEqual(['snowboard']);
    expect(sportsForFigurinaOverlay(['splittouring', 'freeridesnowboard'])).toEqual([
      'snowboard',
    ]);
  });
});

describe('resolveCoachLocationStickerSlug', () => {
  it('returns laax from coachCityText when enum coachCity is empty', () => {
    expect(resolveCoachLocationStickerSlug(null, 'Laax area', '')).toBe('laax');
  });

  it('returns laax from location line when coachCityText absent', () => {
    expect(resolveCoachLocationStickerSlug('', '', 'Laax')).toBe('laax');
  });

  it('respects enum slug when set', () => {
    expect(resolveCoachLocationStickerSlug('laax', '', 'Zürich')).toBe('laax');
  });
});

describe('coachStickerShowsVerifiedSeal', () => {
  it('is true when peakupVerifiedCoach is set', () => {
    expect(coachStickerShowsVerifiedSeal({ peakupVerifiedCoach: true })).toBe(true);
  });

  it('is true for certified badge id', () => {
    expect(coachStickerShowsVerifiedSeal({ peakupCoachBadges: ['certified_coach'] })).toBe(true);
  });

  it('is true for top_coach badge', () => {
    expect(coachStickerShowsVerifiedSeal({ peakupBadgeTopCoach: true })).toBe(true);
  });

  it('is false without signals', () => {
    expect(coachStickerShowsVerifiedSeal({ peakupCoachBadges: ['ambassador'] })).toBe(false);
    expect(coachStickerShowsVerifiedSeal({})).toBe(false);
  });
});

describe('resolvePeakupCoachBadgeIds', () => {
  it('respects array order from peakupCoachBadges', () => {
    expect(resolvePeakupCoachBadgeIds({ peakupCoachBadges: ['founder', 'ambassador'] })).toEqual([
      'founder',
      'ambassador',
    ]);
  });

  it('falls back to booleans, includes founder', () => {
    expect(
      resolvePeakupCoachBadgeIds({ peakupBadgeFounder: true, peakupBadgeTopCoach: true })
    ).toEqual(['founder', 'top_coach']);
  });

  it('falls back to legacy coachLevel free-form string', () => {
    expect(resolvePeakupCoachBadgeIds({ coachLevel: 'Ambassador' })).toEqual(['ambassador']);
    expect(resolvePeakupCoachBadgeIds({ coachLevel: 'Top Coach' })).toEqual(['top_coach']);
    expect(resolvePeakupCoachBadgeIds({ coachLevel: 'certified-coach' })).toEqual([
      'certified_coach',
    ]);
    expect(resolvePeakupCoachBadgeIds({ coachLevel: 'Coach Level 4' })).toEqual([]);
  });

  it('strips emoji decorations from legacy coachLevel labels', () => {
    expect(resolvePeakupCoachBadgeIds({ coachLevel: '🔥 Ambassador' })).toEqual(['ambassador']);
    expect(resolvePeakupCoachBadgeIds({ coachLevel: '⭐ Top Coach ⭐' })).toEqual(['top_coach']);
    expect(resolvePeakupCoachBadgeIds({ coachLevel: '✅ Certified Coach' })).toEqual([
      'certified_coach',
    ]);
  });

  it('does not use legacy coachLevel when array/booleans already define badges', () => {
    expect(
      resolvePeakupCoachBadgeIds({
        peakupCoachBadges: ['top_coach'],
        coachLevel: 'Ambassador',
      })
    ).toEqual(['top_coach']);
  });

  it('accepts peakupCoachBadges as a single string or CSV string', () => {
    expect(resolvePeakupCoachBadgeIds({ peakupCoachBadges: 'Ambassador' })).toEqual([
      'ambassador',
    ]);
    expect(
      resolvePeakupCoachBadgeIds({ peakupCoachBadges: 'ambassador, top_coach;certified-coach' })
    ).toEqual(['ambassador', 'top_coach', 'certified_coach']);
  });

  it('accepts peakupCoachBadges as a boolean object map', () => {
    expect(
      resolvePeakupCoachBadgeIds({
        peakupCoachBadges: { ambassador: true, certified_coach: false, top_coach: true },
      })
    ).toEqual(['ambassador', 'top_coach']);
  });

  it('accepts coachLevel as an array of strings (legacy)', () => {
    expect(resolvePeakupCoachBadgeIds({ coachLevel: ['Ambassador', 'top_coach'] })).toEqual([
      'ambassador',
      'top_coach',
    ]);
  });
});

describe('peakupCoachBadgePriorityFor', () => {
  it('returns 0 for empty list', () => {
    expect(peakupCoachBadgePriorityFor([])).toBe(0);
  });

  it('returns the highest priority among given badges', () => {
    expect(peakupCoachBadgePriorityFor(['certified_coach'])).toBe(20);
    expect(peakupCoachBadgePriorityFor(['top_coach', 'certified_coach'])).toBe(30);
    expect(peakupCoachBadgePriorityFor(['ambassador', 'certified_coach'])).toBe(40);
    expect(peakupCoachBadgePriorityFor(['founder', 'ambassador', 'top_coach'])).toBe(50);
  });

  it('ignores unknown badges', () => {
    expect(peakupCoachBadgePriorityFor(['unknown', 'coach_level_4'])).toBe(0);
  });
});

describe('peakupCoachReviewScore', () => {
  it('returns 0 for missing data', () => {
    expect(peakupCoachReviewScore({})).toBe(0);
    expect(peakupCoachReviewScore({ reviewAverage: 5, reviewCount: 0 })).toBe(0);
  });

  it('blends prior with sample so 1×5.0 ranks below 12×4.6', () => {
    const small = peakupCoachReviewScore({ reviewAverage: 5.0, reviewCount: 1 });
    const big = peakupCoachReviewScore({ reviewAverage: 4.6, reviewCount: 12 });
    expect(big).toBeGreaterThan(small);
  });
});

describe('comparePeakupFeaturedCoaches (reviews first, then badges, then alphabet)', () => {
  const make = ({ name = 'X', badges = [], avg = 0, count = 0 } = {}) => ({
    author: {
      attributes: {
        profile: {
          displayName: name,
          publicData: { peakupCoachBadges: badges },
        },
      },
    },
    reviewAverage: avg,
    reviewCount: count,
  });

  it('a coach with reviews beats a higher-tier coach with no reviews', () => {
    const founder = make({ name: 'F', badges: ['founder'] });
    const topCoachWithReviews = make({ name: 'T', badges: ['top_coach'], avg: 4.5, count: 8 });
    const sorted = [founder, topCoachWithReviews].sort(comparePeakupFeaturedCoaches);
    expect(sorted[0]).toBe(topCoachWithReviews);
  });

  it('among coaches without reviews, badge priority decides', () => {
    const certified = make({ name: 'C', badges: ['certified_coach'] });
    const top = make({ name: 'B', badges: ['top_coach'] });
    const amb = make({ name: 'A', badges: ['ambassador'] });
    const sorted = [certified, top, amb].sort(comparePeakupFeaturedCoaches);
    expect(sorted.map(c => c.author.attributes.profile.displayName)).toEqual(['A', 'B', 'C']);
  });

  it('among coaches with reviews, higher review score wins (regardless of badge)', () => {
    const lowBadgeManyReviews = make({
      name: 'CL4',
      badges: [],
      avg: 4.6,
      count: 25,
    });
    const highBadgeFewReviews = make({
      name: 'AMB',
      badges: ['ambassador'],
      avg: 5.0,
      count: 1,
    });
    const sorted = [highBadgeFewReviews, lowBadgeManyReviews].sort(comparePeakupFeaturedCoaches);
    expect(sorted[0]).toBe(lowBadgeManyReviews);
  });

  it('same review score → higher count wins → otherwise badge → otherwise alphabet', () => {
    const a = make({ name: 'A', badges: ['top_coach'], avg: 4.5, count: 10 });
    const b = make({ name: 'B', badges: ['ambassador'], avg: 4.5, count: 10 });
    // Stesso score, stesso count → tie-break su badge → ambassador (B) vince
    expect([a, b].sort(comparePeakupFeaturedCoaches)[0]).toBe(b);

    // Same everything, only name differs → alphabet decides
    const x = make({ name: 'Z', avg: 4.5, count: 10 });
    const y = make({ name: 'A', avg: 4.5, count: 10 });
    expect([x, y].sort(comparePeakupFeaturedCoaches).map(c => c.author.attributes.profile.displayName))
      .toEqual(['A', 'Z']);
  });
});

describe('formatProfileLanguagesForSticker', () => {
  it('dedupes codes and keeps order', () => {
    expect(
      formatProfileLanguagesForSticker(intlCoachLanguagePassthrough, ['it', 'en', 'it', 'FR'])
    ).toEqual([
      { key: 'it', label: 'it' },
      { key: 'en', label: 'en' },
      { key: 'fr', label: 'fr' },
    ]);
  });

  it('still emits unknown codes from defaultMessage', () => {
    expect(formatProfileLanguagesForSticker(intlCoachLanguagePassthrough, ['xx'])).toEqual([
      { key: 'xx', label: 'xx' },
    ]);
  });
});
