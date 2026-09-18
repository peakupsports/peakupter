import { getSportHeroImage } from '../../config/configSportMedia';

/** @typedef {'left' | 'right'} HeroSubjectPosition */

/**
 * Single swap-point for Landing Page hero art.
 *
 * Per-slide tuning (all optional):
 * - `mirrorHeroImage: true` — flip the photo layer horizontally
 * - `subjectPosition: 'left'` — alias for mirror opt-in
 * - `heroPositionX: '75%'` — horizontal background-position (e.g. "75% center")
 * - `focalPoint: '80% 40%'` — full background-position override
 *
 * Default: no mirror, global `focalPoint` / `mirroredFocalPoint`.
 */
export const LANDING_HERO_MEDIA = Object.freeze({
  rotationIntervalMs: 8200,
  transitionDurationMs: 2800,
  /** Default crop when the photo layer is not mirrored. */
  focalPoint: '90% center',
  /** Default crop before mirroring a left-weighted subject. */
  mirroredFocalPoint: '12% center',
  /** Default vertical alignment when `heroPositionX` is set. */
  focalPointY: 'center',
  slides: Object.freeze(
    [
      {
        key: 'surf',
        imageUrl: getSportHeroImage('surf', { fallback: null }),
        mirrorHeroImage: true,
        heroPositionX: '0%',
      },
      {
        key: 'mtb',
        imageUrl: getSportHeroImage('mtb', { fallback: null }),
        mirrorHeroImage: true,
        heroPositionX: '70%',
      },
      { key: 'climbing', imageUrl: getSportHeroImage('climbing', { fallback: null }) },
      {
        key: 'canyoning',
        imageUrl: getSportHeroImage('canyoning', { fallback: null }),
        heroPositionX: '150%',
      },
      { key: 'yoga', imageUrl: getSportHeroImage('yoga', { fallback: null }) },
      { key: 'tennis', imageUrl: getSportHeroImage('tennis', { fallback: null }), mirrorHeroImage: true },
      {
        key: 'ski',
        imageUrl: getSportHeroImage('freerideskiing', { fallback: null }),
        mirrorHeroImage: true,
      },
    ].filter(slide => typeof slide.imageUrl === 'string' && slide.imageUrl.length > 0)
  ),
});

/**
 * @param {string | number | null | undefined} heroPositionX
 * @param {string} [focalPointY]
 * @returns {string | null}
 */
export const formatHeroBackgroundPositionX = (heroPositionX, focalPointY = 'center') => {
  if (heroPositionX == null || heroPositionX === '') {
    return null;
  }

  const x = String(heroPositionX).trim();
  if (!x) {
    return null;
  }

  const y = String(focalPointY || 'center').trim() || 'center';
  return `${x} ${y}`;
};

/**
 * Resolve hero photo presentation for a landing slide or static hero config.
 *
 * @param {object | null | undefined} slide
 * @param {typeof LANDING_HERO_MEDIA} [mediaDefaults]
 * @returns {{ shouldMirror: boolean, focalPoint: string, subjectPosition: HeroSubjectPosition }}
 */
export const resolveLandingHeroSlidePresentation = (
  slide,
  mediaDefaults = LANDING_HERO_MEDIA
) => {
  const shouldMirror =
    slide?.mirrorHeroImage === true || slide?.subjectPosition === 'left';
  const subjectPosition = shouldMirror ? 'left' : 'right';

  const heroPositionFromX = formatHeroBackgroundPositionX(
    slide?.heroPositionX,
    slide?.heroPositionY || mediaDefaults.focalPointY
  );

  const focalPoint =
    slide?.focalPoint ||
    heroPositionFromX ||
    (shouldMirror ? mediaDefaults.mirroredFocalPoint : mediaDefaults.focalPoint) ||
    '90% center';

  const focalParts = focalPoint.trim().split(/\s+/);
  const backgroundPositionX =
    slide?.heroPositionX != null && String(slide.heroPositionX).trim() !== ''
      ? String(slide.heroPositionX).trim()
      : focalParts[0] || '90%';
  const backgroundPositionY =
    slide?.heroPositionY != null && String(slide.heroPositionY).trim() !== ''
      ? String(slide.heroPositionY).trim()
      : focalParts[1] || mediaDefaults.focalPointY || 'center';

  return {
    shouldMirror,
    focalPoint,
    backgroundPositionX,
    backgroundPositionY,
    subjectPosition,
  };
};
