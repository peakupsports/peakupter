import React, { memo, useCallback, useEffect, useRef } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';

// Configurations + utilities
import { useConfiguration } from '../../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { getMarketplaceEntities } from '../../../../ducks/marketplaceData.duck';
import {
  featuredCoachesHealStaleReviewsLoaded,
  fetchFeaturedCoaches,
} from '../../../../ducks/featuredCoaches.duck';
import {
  logPeakupDataRegressionCheckFeaturedCoaches,
  logPeakupFeaturedReviewMerge,
} from '../../../../util/coachReviewStats';
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

const selectFeaturedCoachRows = state => state.featuredCoaches?.coaches || [];

/**
 * Memoized: rebuild coach card props from slice rows + marketplace entities.
 */
const selectFeaturedCoachCards = createSelector(
  [selectFeaturedCoachRows, state => state.marketplaceData?.entities],
  (rows, entities) => {
    if (!rows.length || !entities) return [];

    const userRefs = rows.map(r => ({ id: { uuid: r.authorUuid }, type: 'user' }));
    const listingRefs = rows
      .filter(r => r.listingId)
      .map(r => ({ id: { uuid: r.listingId }, type: 'listing' }));

    const users = getMarketplaceEntities({ marketplaceData: { entities } }, userRefs);
    const listings = getMarketplaceEntities({ marketplaceData: { entities } }, listingRefs);
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
        const computedBadgeIds = resolveDisplayBadgeIds(authorPd);
        return {
          authorUuid: row.authorUuid,
          author,
          representativeListing,
          sportKeys: row.sportKeys || [],
          reviewCount: row.reviewCount || 0,
          reviewAverage: row.reviewAverage ?? null,
          badgeIds:
            Array.isArray(row.badgeIds) && row.badgeIds.length ? row.badgeIds : computedBadgeIds,
          badgePriority: row.badgePriority || 0,
        };
      })
      .filter(Boolean)
      .sort(comparePeakupFeaturedCoaches);
  }
);

/** Quanto scorrere a ogni click sulle frecce (≈ una card + gap). */
const SCROLL_STEP_PX = 320;

/** Memoized carousel cell — avoids rerenders when nav scroll state updates. */
const FeaturedCoachScrollerCard = memo(({ card, rank }) => (
  <li className={css.scrollerItem}>
    <PeakUpCoachFigurineCard
      author={card.author}
      representativeListing={card.representativeListing}
      sportKeys={card.sportKeys}
      reviewCount={card.reviewCount}
      reviewAverage={card.reviewAverage}
      badgeIds={card.badgeIds}
      rank={rank}
      showPodiumBadge
    />
  </li>
));
FeaturedCoachScrollerCard.displayName = 'FeaturedCoachScrollerCard';

/**
 * Featured PeakUp coaches — landing-page section.
 */
const SectionPeakupFeaturedCoaches = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const {
    sectionId,
    className,
    rootClassName,
    defaultClasses,
    appearance,
    callToAction,
    options = {},
  } = props;

  const fetchStatus = useSelector(state => state.featuredCoaches?.fetchStatus || 'idle');
  const fetchError = useSelector(state => state.featuredCoaches?.fetchError || null);
  const reviewsStatus = useSelector(state => state.featuredCoaches?.reviewsStatus || 'idle');
  const reviewsLoaded = useSelector(state => state.featuredCoaches?.reviewsLoaded === true);
  const coachRows = useSelector(selectFeaturedCoachRows);
  const cards = useSelector(selectFeaturedCoachCards);

  const configRef = useRef(config);
  configRef.current = config;
  const didRequestFullFetchRef = useRef(false);
  const didRequestReviewsFetchRef = useRef(false);
  const didLogRegressionCheckRef = useRef(false);
  const didLogReviewMergeRef = useRef(false);

  useEffect(() => {
    dispatch(featuredCoachesHealStaleReviewsLoaded());
  }, [dispatch]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[PeakUp FEATURED SECTION STATE]', {
      status: fetchStatus,
      reviewsStatus,
      coachCount: coachRows.length,
      cardCount: cards.length,
      reviewsLoaded,
      didRequestFullFetch: didRequestFullFetchRef.current,
      didRequestReviewsFetch: didRequestReviewsFetchRef.current,
    });
  }, [fetchStatus, reviewsStatus, coachRows.length, cards.length, reviewsLoaded]);

  useEffect(() => {
    if (fetchStatus === 'loading' || reviewsStatus === 'loading') return;

    const needsReviews =
      fetchStatus === 'succeeded' && coachRows.length > 0 && reviewsLoaded === false;

    if (needsReviews) {
      if (didRequestReviewsFetchRef.current) return;
      didRequestReviewsFetchRef.current = true;
      dispatch(fetchFeaturedCoaches({ config: configRef.current, reviewsOnly: true, force: true }));
      return;
    }

    if (fetchStatus === 'succeeded' || fetchStatus === 'failed') {
      return;
    }

    if (didRequestFullFetchRef.current) return;
    didRequestFullFetchRef.current = true;
    dispatch(fetchFeaturedCoaches({ config: configRef.current }));
  }, [dispatch, fetchStatus, reviewsStatus, reviewsLoaded, coachRows.length]);

  useEffect(() => {
    if (reviewsStatus === 'failed' && !reviewsLoaded) {
      didRequestReviewsFetchRef.current = false;
    }
  }, [reviewsStatus, reviewsLoaded]);

  useEffect(() => {
    if (!reviewsLoaded || !cards.length || !coachRows.length) return;
    if (didLogReviewMergeRef.current) return;
    didLogReviewMergeRef.current = true;
    coachRows.forEach(row => {
      const card = cards.find(c => c.authorUuid === row.authorUuid);
      if (card) logPeakupFeaturedReviewMerge(row, card);
    });
  }, [reviewsLoaded, cards, coachRows]);

  useEffect(() => {
    if (!reviewsLoaded || !cards.length) return;
    if (didLogRegressionCheckRef.current) return;
    didLogRegressionCheckRef.current = true;
    const displayNameByUuid = {};
    cards.forEach(card => {
      if (!card?.authorUuid) return;
      const name = card.author?.attributes?.profile?.displayName;
      if (name) displayNameByUuid[card.authorUuid] = name;
    });
    logPeakupDataRegressionCheckFeaturedCoaches(
      cards.map(card => ({
        authorUuid: card.authorUuid,
        reviewCount: card.reviewCount,
        reviewAverage: card.reviewAverage,
      })),
      {
        displayNameByUuid,
        source: 'SectionPeakupFeaturedCoaches.selectFeaturedCoachCards',
      }
    );
  }, [reviewsLoaded, cards]);

  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const hasCallToAction = hasDataInFields([callToAction], fieldOptions);

  const inProgress = fetchStatus === 'loading' && cards.length === 0;
  const noCoachesFound = fetchStatus === 'succeeded' && cards.length === 0;

  const scrollerRef = useRef(null);
  const navPrevRef = useRef(null);
  const navNextRef = useRef(null);
  const scrollRafRef = useRef(null);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (navPrevRef.current) {
      navPrevRef.current.disabled = el.scrollLeft <= 4;
    }
    if (navNextRef.current) {
      navNextRef.current.disabled = el.scrollLeft >= maxScroll - 4;
    }
  }, []);

  useEffect(() => {
    updateScrollState();
  }, [cards.length, updateScrollState]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;

    const onScroll = () => {
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        updateScrollState();
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  const scrollBy = useCallback(dir => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_STEP_PX, behavior: 'smooth' });
  }, []);

  return (
    <SectionContainer
      id={sectionId}
      className={className}
      rootClassName={rootClassName}
      appearance={appearance}
    >
      <header className={classNames(defaultClasses.sectionDetails, css.headerBlock, css.showcaseHeader)}>
        <span className={css.showcaseTitleBadgeWrap} aria-hidden="true">
          <img
            className={css.showcaseTitleBadge}
            src={FEATURED_COACH_BADGE_SRC}
            alt=""
            width={84}
            height={84}
            decoding="async"
          />
        </span>

        <h2 className={css.showcaseTitle}>
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
              ref={navPrevRef}
              className={classNames(css.navButton, css.navButtonPrev)}
              onClick={() => scrollBy(-1)}
              disabled
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
                <FeaturedCoachScrollerCard key={card.authorUuid} card={card} rank={idx + 1} />
              ))}
            </ul>

            <button
              type="button"
              ref={navNextRef}
              className={classNames(css.navButton, css.navButtonNext)}
              onClick={() => scrollBy(1)}
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
