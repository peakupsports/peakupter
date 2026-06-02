import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';

import { isScrollingDisabled } from '../../ducks/ui.duck';

// Shared components: index.js maintains the correct module-load order.
import { Page, PeakUpCoachFigurineCard } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  filterCoachesBySport,
  formatCoachExploreSportSlug,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
} from '../../util/coachExplore';
import { resolveFigurinaHeaderBadgeIds } from '../../util/profileCoachSticker';
import { getSportHeroImage } from '../../config/configSportMedia';
import { fetchCoachesExploreThunk } from '../CoachesExplorePage/CoachesExplorePage.duck';

import css from './CoachesPage.module.css';
import sportTheme from '../SportPagesTheme.module.css';

/** Pixels scrolled per arrow click (≈ one card + gap). Matches the
 * Landing Page Featured Coaches carousel for visual consistency. */
const SCROLL_STEP_PX = 320;

/**
 * Coaches directory: horizontal carousel of PeakUp coach figurine cards
 * sharing the **exact same layout** as the Landing Page "Featured Coaches"
 * section (single row, scroll-snap, arrow nav on desktop, no wrapping).
 *
 * Sport filtering is driven by the **global SportBar that lives in the
 * Topbar** (single navigation layer for the whole platform). This page is a
 * pure consumer of `?sport=` from the URL. Filter logic, query-param
 * parsing, routing and data fetching remain unchanged. Supports deep links
 * `?sport=surf&lat=…&lng=…&location=…` for marketing / geo landing pages.
 */
const CoachesPage = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const { search } = useLocation();

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const { coaches, fetchStatus } = useSelector(state => state.CoachesExplorePage);

  const queryExplore = useMemo(() => parseCoachExploreSearch(search), [search]);
  // Source of truth for the active sport on this page: the URL `?sport=`.
  // Same value the global SportBar in the Topbar reads/writes.
  const selectedSport = queryExplore.sportKey;

  const filteredCoaches = useMemo(() => {
    const bySport = filterCoachesBySport(coaches, selectedSport);
    if (queryExplore.userLat != null && queryExplore.userLng != null) {
      return sortCoachRowsByDistanceKm(bySport, queryExplore.userLat, queryExplore.userLng);
    }
    return bySport;
  }, [coaches, selectedSport, queryExplore.userLat, queryExplore.userLng]);

  const onRetry = useCallback(() => {
    dispatch(fetchCoachesExploreThunk({ config }));
  }, [config, dispatch]);

  const marketplaceName = config.branding.marketplaceName || 'Marketplace';
  const schemaTitle = intl.formatMessage({ id: 'CoachesPage.schemaTitle' }, { marketplaceName });
  const schemaDescription = intl.formatMessage({ id: 'CoachesPage.schemaDescription' });

  const headlineSportPhrase = selectedSport.trim()
    ? formatCoachExploreSportSlug(selectedSport)
    : '';

  // Sport-themed cinematic background for the page hero. Images come from
  // `public/CoachPagePic/` via the temporary sport-media library
  // (`src/config/configSportMedia.js`). Empty `selectedSport` ("All
  // sports") falls back to `SPORT_MEDIA_FALLBACK` (Snowboard1.jpg).
  // This is the ONLY place CoachesPage uses these assets — figurine
  // photos, avatars, listing galleries and map popups stay untouched
  // per the architectural separation note in `configSportMedia.js`.
  const heroImage = getSportHeroImage(selectedSport);
  const heroAriaLabel = headlineSportPhrase
    ? intl.formatMessage(
        {
          id: 'CoachDirectory.heroBannerAriaLabel',
          defaultMessage: '{sport} coaches',
        },
        { sport: headlineSportPhrase }
      )
    : intl.formatMessage({
        id: 'CoachDirectory.heroBannerAriaLabelGeneric',
        defaultMessage: 'PeakUp coaches',
      });

  const hasGeoProximity =
    queryExplore.userLat != null &&
    queryExplore.userLng != null &&
    Number.isFinite(queryExplore.userLat) &&
    Number.isFinite(queryExplore.userLng);
  const hasPlaceLabel = !hasGeoProximity && queryExplore.locationLabel.length > 0;

  const loading = fetchStatus === 'loading';
  const failed = fetchStatus === 'failed';

  // Carousel scroll state — same pattern as
  // `SectionPeakupFeaturedCoaches.js` so the user gets identical "scroll
  // by ~one card" behaviour and arrow disabled states on both surfaces.
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
  }, [filteredCoaches.length, updateScrollState]);

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
    <Page
      title={schemaTitle}
      description={schemaDescription}
      scrollingDisabled={scrollingDisabled}
      className={sportTheme.sportPremium}
    >
      <TopbarContainer currentPage="CoachesPage" chromeTheme="sportPremium" />

      {/* ============================================================
          Full-page sport-lifestyle backdrop.

          Rendered as a `position: fixed` layer behind the page so it:
            - covers the entire viewport edge-to-edge (no boxed card),
            - stays visible while the user scrolls the figurine
              carousel (parallax-style cinematic feel),
            - and stays prominent during the empty state when there
              are no coaches for the selected sport.

          A vertical dark gradient overlay keeps the title / subtitle
          / empty-state copy legible regardless of which sport image
          is shown (Snowboard1, Tennis, Golf, …). The image itself is
          decorative — meaningful content lives in real text nodes
          below — so `alt=""` + `role="presentation"` + `aria-hidden`
          on the wrapper.
          ============================================================ */}
      <div className={css.pageBackdrop} aria-hidden aria-label={heroAriaLabel}>
        <img
          className={css.pageBackdropImage}
          src={heroImage}
          alt=""
          role="presentation"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <div className={css.pageBackdropOverlay} />
      </div>

      <main className={css.root}>
        <header className={css.pageHeader}>
          <h1 className={css.title}>
            {headlineSportPhrase ? (
              <FormattedMessage
                id="CoachDirectory.heroTitleWithSport"
                values={{ sport: headlineSportPhrase }}
              />
            ) : (
              <FormattedMessage id="CoachesPage.title" />
            )}
          </h1>
          <p className={css.subtitle}>
            {hasGeoProximity ? (
              <FormattedMessage id="CoachDirectory.heroSubtitleNearYou" />
            ) : hasPlaceLabel ? (
              <FormattedMessage
                id="CoachDirectory.heroSubtitleInPlace"
                values={{ place: queryExplore.locationLabel }}
              />
            ) : (
              <FormattedMessage id="CoachesPage.subtitle" />
            )}
          </p>
        </header>

        {loading ? (
          <p className={css.status}>
            <FormattedMessage id="CoachesPage.loading" />
          </p>
        ) : null}

        {failed ? (
          <div className={css.errorBox}>
            <p className={css.status}>
              <FormattedMessage id="CoachesPage.error" />
            </p>
            <button type="button" className={css.retry} onClick={onRetry}>
              <FormattedMessage id="CoachesPage.retry" />
            </button>
          </div>
        ) : null}

        {!loading && !failed && filteredCoaches.length === 0 ? (
          <p className={css.empty}>
            <FormattedMessage id="CoachesPage.empty" />
          </p>
        ) : null}

        {!loading && !failed && filteredCoaches.length > 0 ? (
          <div className={css.scrollViewport}>
            <button
              type="button"
              className={classNames(css.navButton, css.navButtonPrev)}
              onClick={() => scrollBy(-1)}
              disabled={!canScrollPrev}
              aria-label={intl.formatMessage({
                id: 'CoachesPage.scrollPrev',
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
                id: 'CoachesPage.regionLabel',
                defaultMessage: 'PeakUp coaches',
              })}
            >
              {filteredCoaches.map(coach => {
                const authorPd = coach.author?.attributes?.profile?.publicData || {};
                const badgeIds = resolveFigurinaHeaderBadgeIds(authorPd);
                // No `rank` / `showPodiumBadge` here on purpose: the gold /
                // silver / bronze podium medal is exclusive to the LandingPage
                // "Featured Coaches" curated ranking.
                return (
                  <li key={coach.authorUuid} className={css.scrollerItem}>
                    <PeakUpCoachFigurineCard
                      author={coach.author}
                      representativeListing={coach.representativeListing}
                      sportKeys={coach.sportKeys || []}
                      reviewCount={coach.reviewCount || 0}
                      reviewAverage={coach.reviewAverage ?? null}
                      badgeIds={badgeIds}
                    />
                  </li>
                );
              })}
            </ul>

            <button
              type="button"
              className={classNames(css.navButton, css.navButtonNext)}
              onClick={() => scrollBy(1)}
              disabled={!canScrollNext}
              aria-label={intl.formatMessage({
                id: 'CoachesPage.scrollNext',
                defaultMessage: 'Scroll to more coaches',
              })}
            >
              <span aria-hidden>›</span>
            </button>
          </div>
        ) : null}
      </main>
      <FooterContainer />
    </Page>
  );
};

CoachesPage.propTypes = {
  staticContext: propTypes.staticContext,
};

export default CoachesPage;
