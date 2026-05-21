import React from 'react';
import classNames from 'classnames';

import { getSportHeroImage } from '../../config/configSportMedia';
import { extractSportKeysFromListing } from '../../util/coachExplore';

import css from './CheckoutPage.module.css';

const HERO_TARGET_ASPECT = 16 / 9;
const HERO_MIN_WIDTH = 1920;
const HERO_IDEAL_WIDTH = 2560;

/** Prefer wide scaled variants, then largest listing-card crops. */
const heroVariantPriority = (variantPrefix = 'listing-card') => [
  'scaled-xlarge',
  'scaled-large',
  'scaled-medium',
  `${variantPrefix}-6x`,
  `${variantPrefix}-4x`,
  'scaled-small',
];

/**
 * Score variant for cinematic 16:9 checkout hero (width + aspect + priority).
 *
 * @param {string} key
 * @param {Object} variant
 * @param {number} priorityIndex
 * @returns {number}
 */
const scoreHeroVariant = (key, variant, priorityIndex) => {
  const w = variant?.width || 0;
  const h = variant?.height || w / HERO_TARGET_ASPECT;
  if (!variant?.url || w < 400) {
    return -1;
  }

  const aspect = w / h;
  const aspectFit = 1 - Math.min(1, Math.abs(aspect - HERO_TARGET_ASPECT) / HERO_TARGET_ASPECT);
  const widthFit = Math.min(1, w / HERO_IDEAL_WIDTH);
  const minWidthBoost = w >= HERO_MIN_WIDTH ? 0.15 : w >= 1280 ? 0.05 : 0;
  const priorityBoost = Math.max(0, 8 - priorityIndex) * 0.04;

  return widthFit * 0.5 + aspectFit * 0.25 + minWidthBoost + priorityBoost;
};

/**
 * Resolve the best widescreen URL for the checkout hero (≥1920px wide when available).
 *
 * @param {boolean} useListingImage
 * @param {Object} firstImage
 * @param {string} variantPrefix
 * @param {string|null} sportHeroSrc
 * @returns {string|null}
 */
const resolveCheckoutHeroUrl = (useListingImage, firstImage, variantPrefix, sportHeroSrc) => {
  if (useListingImage && firstImage?.attributes?.variants) {
    const variants = firstImage.attributes.variants;
    const priority = heroVariantPriority(variantPrefix);
    const allKeys = Object.keys(variants);
    const orderedKeys = [
      ...priority,
      `${variantPrefix}-2x`,
      variantPrefix,
      ...allKeys.filter(
        k =>
          !priority.includes(k) && k !== `${variantPrefix}-2x` && k !== variantPrefix
      ),
    ];

    let bestUrl = null;
    let bestScore = -1;

    orderedKeys.forEach((key, index) => {
      const variant = variants[key];
      if (!variant?.url) {
        return;
      }
      const score = scoreHeroVariant(key, variant, index);
      if (score > bestScore) {
        bestScore = score;
        bestUrl = variant.url;
      }
    });

    if (bestUrl) {
      return bestUrl;
    }
  }

  return sportHeroSrc || null;
};

/**
 * Landing-style full-bleed hero for PeakUp checkout (cover, 82% center, light overlay).
 *
 * @param {Object} props
 * @param {propTypes.listing} [props.listing]
 * @param {boolean} props.showListingImage
 * @param {propTypes.image} [props.firstImage]
 * @param {Object} props.layoutListingImageConfig
 * @param {'checkout'|'transaction'} [props.tone] Slightly stronger overlay on transaction pages
 */
const CheckoutHeroBackground = props => {
  const { listing, showListingImage, firstImage, layoutListingImageConfig, tone = 'checkout' } =
    props;
  const isTransactionTone = tone === 'transaction';

  const useListingImage = showListingImage && firstImage;
  const sportKeys = extractSportKeysFromListing(listing);
  const sportHeroSrc =
    sportKeys.length > 0 ? getSportHeroImage(sportKeys[0]) : getSportHeroImage(null);

  const { variantPrefix = 'listing-card' } = layoutListingImageConfig || {};
  const heroUrl = resolveCheckoutHeroUrl(useListingImage, firstImage, variantPrefix, sportHeroSrc);

  if (!heroUrl) {
    return null;
  }

  return (
    <div
      className={classNames(css.checkoutHeroBg, {
        [css.checkoutHeroBgTransaction]: isTransactionTone,
      })}
      aria-hidden
    >
      <div className={css.checkoutHeroStage}>
        <div className={css.checkoutHeroImageWrap}>
          <img
            className={css.checkoutHeroImage}
            src={heroUrl}
            alt=""
            decoding="async"
            fetchPriority={isTransactionTone ? 'high' : undefined}
            sizes="(min-width: 2560px) 2560px, 100vw"
          />
        </div>
        <div
          className={classNames(css.checkoutHeroOverlay, {
            [css.checkoutHeroOverlayTransaction]: isTransactionTone,
          })}
        />
        <div
          className={classNames(css.checkoutHeroVignette, {
            [css.checkoutHeroVignetteTransaction]: isTransactionTone,
          })}
        />
      </div>
    </div>
  );
};

export default CheckoutHeroBackground;
