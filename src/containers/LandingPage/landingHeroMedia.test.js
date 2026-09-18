import {
  LANDING_HERO_MEDIA,
  formatHeroBackgroundPositionX,
  resolveLandingHeroSlidePresentation,
} from './landingHeroMedia';

describe('formatHeroBackgroundPositionX', () => {
  it('returns null when heroPositionX is absent', () => {
    expect(formatHeroBackgroundPositionX(undefined)).toBeNull();
    expect(formatHeroBackgroundPositionX(null)).toBeNull();
    expect(formatHeroBackgroundPositionX('')).toBeNull();
  });

  it('builds a background-position string with default vertical center', () => {
    expect(formatHeroBackgroundPositionX('75%')).toBe('75% center');
  });
});

describe('resolveLandingHeroSlidePresentation', () => {
  it('does not mirror by default', () => {
    const result = resolveLandingHeroSlidePresentation({ key: 'surf' });

    expect(result).toEqual({
      shouldMirror: false,
      focalPoint: LANDING_HERO_MEDIA.focalPoint,
      backgroundPositionX: '90%',
      backgroundPositionY: 'center',
      subjectPosition: 'right',
    });
  });

  it('mirrors when mirrorHeroImage is true', () => {
    const result = resolveLandingHeroSlidePresentation({ mirrorHeroImage: true });

    expect(result).toEqual({
      shouldMirror: true,
      focalPoint: LANDING_HERO_MEDIA.mirroredFocalPoint,
      backgroundPositionX: '12%',
      backgroundPositionY: 'center',
      subjectPosition: 'left',
    });
  });

  it('uses heroPositionX when set', () => {
    const result = resolveLandingHeroSlidePresentation({
      heroPositionX: '60%',
    });

    expect(result).toEqual({
      shouldMirror: false,
      focalPoint: '60% center',
      backgroundPositionX: '60%',
      backgroundPositionY: 'center',
      subjectPosition: 'right',
    });
  });

  it('prefers heroPositionX over mirror defaults', () => {
    const result = resolveLandingHeroSlidePresentation({
      mirrorHeroImage: true,
      heroPositionX: '75%',
    });

    expect(result).toEqual({
      shouldMirror: true,
      focalPoint: '75% center',
      backgroundPositionX: '75%',
      backgroundPositionY: 'center',
      subjectPosition: 'left',
    });
  });

  it('prefers focalPoint over heroPositionX', () => {
    const result = resolveLandingHeroSlidePresentation({
      heroPositionX: '60%',
      focalPoint: '20% 40%',
    });

    expect(result.focalPoint).toBe('20% 40%');
  });

  it('respects per-slide focalPoint overrides', () => {
    const result = resolveLandingHeroSlidePresentation({
      mirrorHeroImage: true,
      focalPoint: '20% center',
    });

    expect(result.focalPoint).toBe('20% center');
    expect(result.shouldMirror).toBe(true);
  });
});
