import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { createSlug } from '../../util/urlHelpers';
import { formatMoney } from '../../util/currency';
import { countryCodeToFlagEmoji, listingHasPeakupBookingFlag } from '../../util/coachExplore';

import AspectRatioWrapper from '../AspectRatioWrapper/AspectRatioWrapper';
import { Avatar } from '../Avatar/Avatar';
import NamedLink from '../NamedLink/NamedLink';
import ResponsiveImage from '../ResponsiveImage/ResponsiveImage';

import css from './CoachStickerCard.module.css';

/**
 * Compact coach card (“figurina”) for Coaches and Coach map pages.
 *
 * @param {Object} props
 * @param {Object} props.coach aggregated coach row (author + representativeListing + sportKeys + …)
 * @param {boolean} [props.compact] tighter layout for sidebar
 * @param {Function} [props.onMouseEnter]
 * @param {Function} [props.onMouseLeave]
 */
const CoachStickerCard = props => {
  const { coach, compact = false, onMouseEnter, onMouseLeave } = props;
  const config = useConfiguration();
  const intl = useIntl();

  const { author, representativeListing, sportKeys = [], hourlyPrice, reviewAverage, reviewCount } =
    coach || {};
  const listing = representativeListing;

  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } =
    config?.layout?.listingImage || {};

  const displayName = author?.attributes?.profile?.displayName || '';
  const countryCode =
    (
      author?.attributes?.profile?.publicData?.country ||
      listing?.attributes?.publicData?.country ||
      ''
    )
      ?.toString?.()
      ?.trim() || '';
  const flag = countryCodeToFlagEmoji(countryCode);

  const firstImage = listing?.images?.[0] || null;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k =>
        k.startsWith(variantPrefix)
      )
    : [];
  const title = listing?.attributes?.title || displayName || 'Coach';
  const listingSlug = createSlug(title);
  const listingId = listing?.id?.uuid;
  const profileId = author?.id?.uuid;
  const listingImageIsGhost = listing && listingHasPeakupBookingFlag(listing);

  const sportLabel =
    sportKeys.slice(0, 2).join(' · ') ||
    intl.formatMessage({ id: 'CoachStickerCard.fallbackSport' });

  const hoverProps =
    onMouseEnter || onMouseLeave
      ? {
          onMouseEnter,
          onMouseLeave,
        }
      : {};

  const formattedPriceMaybe =
    hourlyPrice && typeof hourlyPrice.amount === 'number'
      ? `${formatMoney(intl, hourlyPrice)}/h`
      : null;

  return (
    <article
      className={classNames(css.root, compact ? css.compact : null)}
      {...hoverProps}
    >
      <div className={css.media}>
        {firstImage && variants.length > 0 ? (
          <AspectRatioWrapper
            className={css.aspect}
            width={aspectWidth}
            height={aspectHeight}
          >
            {listingImageIsGhost && profileId ? (
              <NamedLink className={css.imageLink} name="ProfilePage" params={{ id: profileId }}>
                <ResponsiveImage
                  rootClassName={css.image}
                  alt={title}
                  image={firstImage}
                  variants={variants}
                  sizes={
                    compact ? '(max-width: 480px) 45vw, 200px' : '(max-width: 768px) 42vw, 240px'
                  }
                />
              </NamedLink>
            ) : listingId ? (
              <NamedLink
                className={css.imageLink}
                name="ListingPage"
                params={{ slug: listingSlug, id: listingId }}
              >
                <ResponsiveImage
                  rootClassName={css.image}
                  alt={title}
                  image={firstImage}
                  variants={variants}
                  sizes={
                    compact ? '(max-width: 480px) 45vw, 200px' : '(max-width: 768px) 42vw, 240px'
                  }
                />
              </NamedLink>
            ) : (
              <ResponsiveImage
                rootClassName={css.image}
                alt={title}
                image={firstImage}
                variants={variants}
                sizes={
                  compact ? '(max-width: 480px) 45vw, 200px' : '(max-width: 768px) 42vw, 240px'
                }
              />
            )}
          </AspectRatioWrapper>
        ) : (
          <AspectRatioWrapper className={css.aspect} width={aspectWidth} height={aspectHeight}>
            <div className={css.avatarFallback}>
              <Avatar rootClassName={css.avatarLarge} user={author} disableProfileLink />
            </div>
          </AspectRatioWrapper>
        )}

        {reviewCount > 0 && reviewAverage != null ? (
          <div className={css.scorePill}>
            <FormattedMessage
              id="CoachStickerCard.ratingReviews"
              values={{
                rating: reviewAverage.toFixed(1),
                count: reviewCount,
              }}
            />
          </div>
        ) : null}
      </div>

      <div className={css.body}>
        <div className={css.nameRow}>
          <span className={css.flag} aria-hidden={!flag}>
            {flag ? `${flag}\u00A0` : null}
          </span>
          {profileId ? (
            <NamedLink className={css.name} name="ProfilePage" params={{ id: profileId }}>
              {displayName}
            </NamedLink>
          ) : (
            <span className={css.name}>{displayName}</span>
          )}
        </div>

        <div className={css.metaRow}>
          <span className={css.sport}>{sportLabel}</span>
          {countryCode ? (
            <span className={css.country}>{countryCode.toUpperCase()}</span>
          ) : null}
        </div>

        {formattedPriceMaybe ? (
          <div className={css.price}>
            <FormattedMessage
              id="CoachesPage.priceFrom"
              values={{ price: formattedPriceMaybe }}
            />
          </div>
        ) : null}

        <div className={css.actions}>
          {profileId ? (
            <NamedLink className={css.contactBtn} name="ProfilePage" params={{ id: profileId }}>
              <FormattedMessage id="CoachesPage.contact" />
            </NamedLink>
          ) : (
            <span className={css.contactBtnDisabled}>
              <FormattedMessage id="CoachesPage.contact" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default CoachStickerCard;
