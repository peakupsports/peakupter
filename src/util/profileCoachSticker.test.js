import { resolveCoachLocationStickerSlug } from '../config/configCoachCity';
import {
  coachStickerShowsVerifiedSeal,
  comparePeakupFeaturedCoaches,
  formatCoachExperienceLabel,
  formatProfileLanguagesForSticker,
  mergeCoachSports,
  parseExperienceMinYears,
  peakupCoachBadgePriorityFor,
  peakupCoachReviewScore,
  resolveDisplayBadgeIds,
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

describe('parseExperienceMinYears', () => {
  it('returns 0 for null / empty / hobby', () => {
    expect(parseExperienceMinYears(null)).toBe(0);
    expect(parseExperienceMinYears('')).toBe(0);
    expect(parseExperienceMinYears('hobby')).toBe(0);
  });

  it('takes the lower bound of the underscore range key', () => {
    expect(parseExperienceMinYears('0_5')).toBe(0);
    expect(parseExperienceMinYears('5_10')).toBe(5);
    expect(parseExperienceMinYears('10_15')).toBe(10);
    expect(parseExperienceMinYears('15_20')).toBe(15);
  });

  it('handles ASCII hyphen ranges with or without "years" suffix', () => {
    expect(parseExperienceMinYears('15-20')).toBe(15);
    expect(parseExperienceMinYears('15-20 years')).toBe(15);
  });

  it('handles en-dash / em-dash ranges (Console / hosted label shape)', () => {
    expect(parseExperienceMinYears('15\u201320 years')).toBe(15); // en dash
    expect(parseExperienceMinYears('15\u201420 years')).toBe(15); // em dash
    expect(parseExperienceMinYears('10\u201315')).toBe(10);
  });

  it('handles the "X to Y years" verbose label', () => {
    expect(parseExperienceMinYears('15 to 20 years')).toBe(15);
    expect(parseExperienceMinYears('5 to 10 years')).toBe(5);
  });

  it('handles 20 / 20+ / spaced "20 +" / "20 years +" as 20', () => {
    expect(parseExperienceMinYears('20')).toBe(20);
    expect(parseExperienceMinYears('20+')).toBe(20);
    expect(parseExperienceMinYears('20 +')).toBe(20);
    expect(parseExperienceMinYears('20 years +')).toBe(20);
    expect(parseExperienceMinYears('15+')).toBe(15);
  });

  it('accepts plain numeric strings and numbers (with optional unit)', () => {
    expect(parseExperienceMinYears(7)).toBe(7);
    expect(parseExperienceMinYears('12')).toBe(12);
    expect(parseExperienceMinYears('12 years')).toBe(12);
    expect(parseExperienceMinYears('12 yrs')).toBe(12);
  });

  it('returns 0 for unrecognisable strings', () => {
    expect(parseExperienceMinYears('--')).toBe(0);
    expect(parseExperienceMinYears('abc')).toBe(0);
  });
});

describe('resolveDisplayBadgeIds', () => {
  it('keeps admin-only Founder when set', () => {
    expect(resolveDisplayBadgeIds({ peakupCoachBadges: ['founder'] })).toEqual(['founder']);
  });

  it('keeps admin-only Ambassador when set', () => {
    expect(resolveDisplayBadgeIds({ peakupCoachBadges: ['ambassador'] })).toEqual(['ambassador']);
  });

  it('Founder beats Ambassador when both are set', () => {
    expect(
      resolveDisplayBadgeIds({ peakupCoachBadges: ['ambassador', 'founder'] })
    ).toEqual(['founder']);
  });

  it('ignores manually-set top_coach / certified_coach (admin-only filter)', () => {
    expect(resolveDisplayBadgeIds({ peakupCoachBadges: ['top_coach'] })).toEqual(['certified_coach']);
    expect(resolveDisplayBadgeIds({ peakupCoachBadges: ['certified_coach'] })).toEqual([
      'certified_coach',
    ]);
  });

  it('auto-derives top_coach for experience >= 10 years (legacy enum keys)', () => {
    expect(resolveDisplayBadgeIds({ experience: '10_15' })).toEqual(['top_coach']);
    expect(resolveDisplayBadgeIds({ experience: '20+' })).toEqual(['top_coach']);
  });

  it('auto-derives top_coach for free-form / hosted Console labels', () => {
    expect(resolveDisplayBadgeIds({ experience: '15\u201320 years' })).toEqual(['top_coach']);
    expect(resolveDisplayBadgeIds({ experience: '15-20 years' })).toEqual(['top_coach']);
    expect(resolveDisplayBadgeIds({ experience: '15 to 20 years' })).toEqual(['top_coach']);
    expect(resolveDisplayBadgeIds({ experience: '12 years' })).toEqual(['top_coach']);
  });

  it('reads the experience value from alternative publicData keys', () => {
    expect(resolveDisplayBadgeIds({ peakupCoachExperience: '15\u201320 years' })).toEqual([
      'top_coach',
    ]);
    expect(resolveDisplayBadgeIds({ coachExperience: '12 years' })).toEqual(['top_coach']);
    expect(resolveDisplayBadgeIds({ experienceYears: 11 })).toEqual(['top_coach']);
  });

  it('falls back to certified_coach for short experience or missing data', () => {
    expect(resolveDisplayBadgeIds({})).toEqual(['certified_coach']);
    expect(resolveDisplayBadgeIds({ experience: 'hobby' })).toEqual(['certified_coach']);
    expect(resolveDisplayBadgeIds({ experience: '5_10' })).toEqual(['certified_coach']);
    expect(resolveDisplayBadgeIds({ experience: '5\u201310 years' })).toEqual(['certified_coach']);
  });

  it('admin Founder wins over experience-based derivation', () => {
    expect(
      resolveDisplayBadgeIds({ peakupCoachBadges: ['founder'], experience: '0_5' })
    ).toEqual(['founder']);
  });

  it('admin Ambassador wins even if experience would qualify for Top coach', () => {
    expect(
      resolveDisplayBadgeIds({ peakupCoachBadges: ['ambassador'], experience: '20+' })
    ).toEqual(['ambassador']);
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

describe('formatCoachExperienceLabel', () => {
  // Resolve the message via `defaultMessage` + ICU placeholders, mirroring
  // the real react-intl behaviour for unit-test purposes.
  const intl = {
    formatMessage: ({ defaultMessage }, values = {}) => {
      if (!defaultMessage) return '';
      return defaultMessage.replace(/\{(\w+)\}/g, (_, name) =>
        values[name] != null ? String(values[name]) : `{${name}}`
      );
    },
  };

  it('returns null for empty / nullish input', () => {
    expect(formatCoachExperienceLabel(intl, null)).toBeNull();
    expect(formatCoachExperienceLabel(intl, '')).toBeNull();
    expect(formatCoachExperienceLabel(intl, undefined)).toBeNull();
  });

  it('renders canonical enum keys with their curated default', () => {
    expect(formatCoachExperienceLabel(intl, 'hobby')).toBe('Hobby');
    expect(formatCoachExperienceLabel(intl, '0_5')).toBe('0–5 years');
    expect(formatCoachExperienceLabel(intl, '5_10')).toBe('5–10 years');
    expect(formatCoachExperienceLabel(intl, '10_15')).toBe('10–15 years');
    expect(formatCoachExperienceLabel(intl, '15_20')).toBe('15–20 years');
    expect(formatCoachExperienceLabel(intl, '20')).toBe('20+ years');
    expect(formatCoachExperienceLabel(intl, '20+')).toBe('20+ years');
  });

  it('synthesises a complete "X–Y years" label from ASCII hyphen ranges', () => {
    expect(formatCoachExperienceLabel(intl, '15-20')).toBe('15–20 years');
    expect(formatCoachExperienceLabel(intl, '10-15')).toBe('10–15 years');
    expect(formatCoachExperienceLabel(intl, '5-10 years')).toBe('5–10 years');
  });

  it('synthesises ranges from en-dash / em-dash labels (Console hosted shape)', () => {
    expect(formatCoachExperienceLabel(intl, '15\u201320 years')).toBe('15–20 years');
    expect(formatCoachExperienceLabel(intl, '10\u201415')).toBe('10–15 years');
  });

  it('synthesises ranges from "X to Y years"', () => {
    expect(formatCoachExperienceLabel(intl, '15 to 20 years')).toBe('15–20 years');
    expect(formatCoachExperienceLabel(intl, '5 to 10')).toBe('5–10 years');
  });

  it('renders open-ended values with "+ years"', () => {
    expect(formatCoachExperienceLabel(intl, '20 +')).toBe('20+ years');
    expect(formatCoachExperienceLabel(intl, '20 years +')).toBe('20+ years');
    expect(formatCoachExperienceLabel(intl, '25')).toBe('25+ years');
  });

  it('renders plain numbers with "years" suffix', () => {
    expect(formatCoachExperienceLabel(intl, 12)).toBe('12 years');
    expect(formatCoachExperienceLabel(intl, '12')).toBe('12 years');
    expect(formatCoachExperienceLabel(intl, '7 years')).toBe('7 years');
  });

  it('falls back to the raw text only when nothing parseable can be extracted', () => {
    expect(formatCoachExperienceLabel(intl, 'unknown')).toBe('unknown');
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
