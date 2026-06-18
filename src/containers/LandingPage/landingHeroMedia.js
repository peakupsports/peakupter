import { getSportHeroImage } from '../../config/configSportMedia';

/**
 * Single swap-point for Landing Page hero art.
 *
 * Current mode: premium rotating sport background using existing cinematic
 * sport images already committed under `public/CoachPagePic/`.
 *
 * To replace later, update `slides` only. If `slides` becomes empty,
 * LandingHeroSection automatically falls back to the hosted Sharetribe hero
 * background from `appearance`.
 */
export const LANDING_HERO_MEDIA = Object.freeze({
  rotationIntervalMs: 8200,
  transitionDurationMs: 2800,
  focalPoint: '82% center',
  slides: Object.freeze(
    [
      { key: 'surf', imageUrl: getSportHeroImage('surf', { fallback: null }) },
      { key: 'mtb', imageUrl: getSportHeroImage('mtb', { fallback: null }) },
      { key: 'climbing', imageUrl: getSportHeroImage('climbing', { fallback: null }) },
      { key: 'canyoning', imageUrl: getSportHeroImage('canyoning', { fallback: null }) },
      { key: 'yoga', imageUrl: getSportHeroImage('yoga', { fallback: null }) },
      { key: 'tennis', imageUrl: getSportHeroImage('tennis', { fallback: null }) },
      // Keep exactly one winter freeride shot in the mix so the hero reads
      // as 4-season / multi-sport first, alpine second.
      { key: 'ski', imageUrl: getSportHeroImage('freerideskiing', { fallback: null }) },
    ].filter(slide => typeof slide.imageUrl === 'string' && slide.imageUrl.length > 0)
  ),
});
