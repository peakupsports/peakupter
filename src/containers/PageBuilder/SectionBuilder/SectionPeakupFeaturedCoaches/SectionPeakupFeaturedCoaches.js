import React, { useEffect, useRef, useState, useCallback } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

// Configurations + utilities
import { useConfiguration } from '../../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { getMarketplaceEntities } from '../../../../ducks/marketplaceData.duck';
import {
  comparePeakupFeaturedCoaches,
  resolveDisplayBadgeIds,
} from '../../../../util/profileCoachSticker';

// Shared components (relative path keeps src/components/index.js import order intact)
import {
  ErrorMessage,
  IconSpinner,
  PeakUpCoachFigurineCard,
} from '../../../../components';

// PageBuilder building blocks
import Field, { hasDataInFields } from '../../Field';
import SectionContainer from '../SectionContainer';

import css from './SectionPeakupFeaturedCoaches.module.css';

const FEATURED_COACH_BADGE_SRC = '/CoachPagePic/Featured_Coach.jpg';

/**
 * Selector: rebuild `coachCard` props for each row in `state.featuredCoaches.coaches`,
 * denormalising the related `user` and `listing` entities from `state.marketplaceData`.
 *
 * @param {Object} state Redux store
 */
const selectFeaturedCoachCards = state => {
  const rows = state.featuredCoaches?.coaches || [];
  if (!rows.length) return [];

  const userRefs = rows.map(r => ({ id: { uuid: r.authorUuid }, type: 'user' }));
  const listingRefs = rows
    .filter(r => r.listingId)
    .map(r => ({ id: { uuid: r.listingId }, type: 'listing' }));

  const users = getMarketplaceEntities(state, userRefs);
  const listings = getMarketplaceEntities(state, listingRefs);
  const usersByUuid = new Map(users.map(u => [u.id?.uuid, u]));
  const listingsByUuid = new Map(listings.map(l => [l.id?.uuid, l]));

  return rows
    .map(row => {
      const author = usersByUuid.get(row.authorUuid);
      if (!author) return null;
      const representativeListing = row.listingId
        ? listingsByUuid.get(row.listingId) || null
        : null;
      const authorPd = author?.attributes?.profile?.publicData || {};
      // Display badges are auto-derived (admin-only Founder/Ambassador,
      // Top coach for >=10y, Certified coach as default).
      const computedBadgeIds = resolveDisplayBadgeIds(authorPd);
      return {
        authorUuid: row.authorUuid,
        author,
        representativeListing,
        sportKeys: row.sportKeys || [],
        reviewCount: row.reviewCount || 0,
        reviewAverage: row.reviewAverage ?? null,
        // Prefer slice value if present, but fall back to live profile.publicData
        badgeIds: Array.isArray(row.badgeIds) && row.badgeIds.length ? row.badgeIds : computedBadgeIds,
        badgePriority: row.badgePriority || 0,
      };
    })
    .filter(Boolean)
    .sort(comparePeakupFeaturedCoaches);
};

/** Quanto scorrere a ogni click sulle frecce (≈ una card + gap). */
const SCROLL_STEP_PX = 320;

/**
 * Featured PeakUp coaches — landing-page section.
 *
 * Renders the highest-priority coaches as `PeakUpCoachFigurineCard` (gold-bordered "figurina"),
 * sorted by badge tier (Founder > Ambassador > Top coach > Certified coach > none) then by
 * review score (Bayesian-light blend of average × volume); see
 * {@link comparePeakupFeaturedCoaches} in `src/util/profileCoachSticker.js`.
 *
 * Layout: una riga sola con scroll orizzontale (snap) + frecce su desktop.
 */
const SectionPeakupFeaturedCoaches = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    appearance,
    callToAction,
    options = {},
  } = props;

  const featuredCoaches = options?.featuredCoaches || {};
  const { onFetchFeaturedCoaches, onFetchFeaturedCoachReviews } = featuredCoaches;

  const fetchStatus = useSelector(state => state.featuredCoaches?.fetchStatus || 'idle');
  const fetchError = useSelector(state => state.featuredCoaches?.fetchError || null);
  const reviewsStatus = useSelector(state => state.featuredCoaches?.reviewsStatus || 'idle');
  const cards = useSelector(selectFeaturedCoachCards);
  const hasMissingUserPublicData = cards.some(
    c => !c?.author?.attributes?.profile?.publicData
  );
  const hasMissingAvatarVariants = cards.some(c => {
    const img = c?.author?.profileImage;
    if (!img?.id) return false;
    const variants = img?.attributes?.variants || {};
    // Card uses square-small(2x)/default fallback. If none exist, it will show placeholder.
    return !variants['square-small'] && !variants['square-small2x'] && !variants['default'];
  });
  const didRefetchForUserPublicDataRef = useRef(false);
  const didRefetchForAvatarVariantsRef = useRef(false);

  useEffect(() => {
    if (fetchStatus === 'idle' && typeof onFetchFeaturedCoaches === 'function') {
      onFetchFeaturedCoaches({ config });
    }
    // We intentionally only react to fetchStatus 'idle': avoids refetch storms on tab focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchStatus, onFetchFeaturedCoaches]);

  useEffect(() => {
    if (fetchStatus !== 'succeeded') return;
    if (!cards.length) return;
    if (reviewsStatus !== 'idle') return;
    if (typeof onFetchFeaturedCoachReviews !== 'function') return;

    const authorUuids = cards.map(c => c.authorUuid).filter(Boolean);
    onFetchFeaturedCoachReviews({ authorUuids });
  }, [fetchStatus, cards, reviewsStatus, onFetchFeaturedCoachReviews]);

  useEffect(() => {
    if (
      fetchStatus === 'succeeded' &&
      hasMissingUserPublicData &&
      !didRefetchForUserPublicDataRef.current &&
      typeof onFetchFeaturedCoaches === 'function'
    ) {
      didRefetchForUserPublicDataRef.current = true;
      onFetchFeaturedCoaches({ config });
    }
  }, [fetchStatus, hasMissingUserPublicData, onFetchFeaturedCoaches, config]);

  useEffect(() => {
    if (
      fetchStatus === 'succeeded' &&
      hasMissingAvatarVariants &&
      !didRefetchForAvatarVariantsRef.current &&
      typeof onFetchFeaturedCoaches === 'function'
    ) {
      didRefetchForAvatarVariantsRef.current = true;
      onFetchFeaturedCoaches({ config });
    }
  }, [fetchStatus, hasMissingAvatarVariants, onFetchFeaturedCoaches, config]);

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const hasCallToAction = hasDataInFields([callToAction], fieldOptions);

  const inProgress = fetchStatus === 'loading' && cards.length === 0;
  const noCoachesFound = fetchStatus === 'succeeded' && cards.length === 0;

  // Scroller refs/state per le frecce desktop.
  const scrollerRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [cards.length, updateScrollState]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const onScroll = () => updateScrollState();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollBy = dir => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_STEP_PX, behavior: 'smooth' });
  };

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
    >
      <header className={classNames(defaultClasses.sectionDetails, css.headerBlock, css.showcaseHeader)}>
        <h2 className={css.showcaseTitle}>
          <span className={css.showcaseTitleBadgeWrap} aria-hidden="true">
            <img
              className={css.showcaseTitleBadge}
              src={FEATURED_COACH_BADGE_SRC}
              alt=""
              width={60}
              height={60}
              decoding="async"
            />
          </span>
          <span className={css.showcaseTitleText}>
            <FormattedMessage
              id="SectionPeakupFeaturedCoaches.titleFeatured"
              defaultMessage="Featured"
            />{' '}
            <span className={css.showcaseTitleAccent}>
              <FormattedMessage
                id="SectionPeakupFeaturedCoaches.titleCoach"
                defaultMessage="Coach"
              />
            </span>
          </span>
        </h2>

        <p className={css.showcaseSubtitle}>
          <FormattedMessage
            id="SectionPeakupFeaturedCoaches.subtitle"
            defaultMessage="Top rated coaches by our community"
          />
        </p>

        {hasCallToAction ? (
          <Field
            data={callToAction}
            className={defaultClasses.ctaButton}
            options={fieldOptions}
          />
        ) : null}
      </header>

      {inProgress ? (
        <div className={css.statusWrap}>
          <IconSpinner />
        </div>
      ) : null}

      {fetchStatus === 'failed' && fetchError ? (
        <div className={css.statusWrap} role="alert">
          <h4 className={css.errorTitle}>
            <FormattedMessage
              id="SectionPeakupFeaturedCoaches.errorTitle"
              defaultMessage="We couldn't load coaches right now"
            />
          </h4>
          <ErrorMessage error={fetchError} />
        </div>
      ) : null}

      {noCoachesFound ? (
        <p className={css.emptyState}>
          <FormattedMessage
            id="SectionPeakupFeaturedCoaches.empty"
            defaultMessage="No featured coaches available yet."
          />
        </p>
      ) : null}

      {cards.length > 0 ? (
        <div className={css.carouselArea}>
          <div className={css.scrollViewport}>
              <button
            type="button"
            className={classNames(css.navButton, css.navButtonPrev)}
            onClick={() => scrollBy(-1)}
            disabled={!canScrollPrev}
            aria-label={intl.formatMessage({
              id: 'SectionPeakupFeaturedCoaches.scrollPrev',
              defaultMessage: 'Scroll to previous coaches',
            })}
          >
            <span aria-hidden>‹</span>
          </button>

          <ul
            ref={scrollerRef}
            className={css.scroller}
            role="list"
            aria-label={intl.formatMessage({
              id: 'SectionPeakupFeaturedCoaches.regionLabel',
              defaultMessage: 'Featured PeakUp coaches',
            })}
          >
            {cards.map((card, idx) => (
              <li key={card.authorUuid} className={css.scrollerItem}>
                <PeakUpCoachFigurineCard
                  author={card.author}
                  representativeListing={card.representativeListing}
                  sportKeys={card.sportKeys}
                  reviewCount={card.reviewCount}
                  reviewAverage={card.reviewAverage}
                  badgeIds={card.badgeIds}
                  rank={idx + 1}
                  // Gold / silver / bronze podium medal is intentionally
                  // scoped to this LandingPage section only — it represents
                  // the curated "Featured Coaches" ranking and must NOT
                  // appear on directory pages (/coaches, /coach-map, …).
                  showPodiumBadge
                />
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={classNames(css.navButton, css.navButtonNext)}
            onClick={() => scrollBy(1)}
            disabled={!canScrollNext}
            aria-label={intl.formatMessage({
              id: 'SectionPeakupFeaturedCoaches.scrollNext',
              defaultMessage: 'Scroll to more coaches',
            })}
          >
            <span aria-hidden>›</span>
          </button>
          </div>
        </div>
      ) : null}
    </SectionContainer>
  );
};

export default SectionPeakupFeaturedCoaches;
