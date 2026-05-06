import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, SportBar, CoachStickerCard } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  filterCoachesBySport,
  formatCoachExploreSportSlug,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
} from '../../util/coachExplore';
import { fetchCoachesExploreThunk } from '../CoachesExplorePage/CoachesExplorePage.duck';

import css from './CoachesPage.module.css';

const KEY_ARROW_LEFT = 'ArrowLeft';
const KEY_ARROW_RIGHT = 'ArrowRight';

/**
 * Coaches directory: horizontal sticker carousel and sport filter (no winter sub-variants).
 * Supports deep links ?sport=golf&lat=&lng=&location= for marketing / geo landing pages.
 */
const CoachesPage = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const dispatch = useDispatch();
  const { search } = useLocation();

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const { coaches, fetchStatus, fetchError } = useSelector(state => state.CoachesExplorePage);

  const queryExplore = useMemo(() => parseCoachExploreSearch(search), [search]);

  const [selectedSport, setSelectedSport] = useState('');

  useEffect(() => {
    setSelectedSport(queryExplore.sportKey);
  }, [queryExplore.sportKey]);

  const filteredCoaches = useMemo(() => {
    const bySport = filterCoachesBySport(coaches, selectedSport);
    if (queryExplore.userLat != null && queryExplore.userLng != null) {
      return sortCoachRowsByDistanceKm(bySport, queryExplore.userLat, queryExplore.userLng);
    }
    return bySport;
  }, [coaches, selectedSport, queryExplore.userLat, queryExplore.userLng]);

  const cardsScrollRef = useRef(null);

  const slideCoachesCarousel = useCallback((direction, event) => {
    const el = cardsScrollRef.current;
    if (!el || typeof window === 'undefined') return;
    const first = el.firstElementChild;
    if (!first) return;
    const style = window.getComputedStyle(el);
    const gapParsed = Number.parseFloat(style.gap || style.columnGap || '0');
    const gap = Number.isFinite(gapParsed) ? gapParsed : 18;
    const step = Math.ceil(first.getBoundingClientRect().width + gap);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction * step,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    if (event?.currentTarget?.focus) {
      event.currentTarget.focus();
    }
  }, []);

  const onCarouselArrowKeyDown = useCallback(
    e => {
      if (e.key === KEY_ARROW_LEFT) {
        e.preventDefault();
        slideCoachesCarousel(-1, e);
      } else if (e.key === KEY_ARROW_RIGHT) {
        e.preventDefault();
        slideCoachesCarousel(1, e);
      }
    },
    [slideCoachesCarousel]
  );

  const onRetry = useCallback(() => {
    dispatch(fetchCoachesExploreThunk({ config }));
  }, [config, dispatch]);

  const marketplaceName = config.branding.marketplaceName || 'Marketplace';
  const schemaTitle = intl.formatMessage({ id: 'CoachesPage.schemaTitle' }, { marketplaceName });
  const schemaDescription = intl.formatMessage({ id: 'CoachesPage.schemaDescription' });

  const headlineSportPhrase = selectedSport.trim()
    ? formatCoachExploreSportSlug(selectedSport)
    : '';

  const hasGeoProximity =
    queryExplore.userLat != null &&
    queryExplore.userLng != null &&
    Number.isFinite(queryExplore.userLat) &&
    Number.isFinite(queryExplore.userLng);
  const hasPlaceLabel = !hasGeoProximity && queryExplore.locationLabel.length > 0;

  const loading = fetchStatus === 'loading';
  const failed = fetchStatus === 'failed';
  const showCarouselNav = !loading && !failed && filteredCoaches.length > 1;

  return (
    <Page title={schemaTitle} description={schemaDescription} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer />
      <main className={css.root}>
        <header className={css.header}>
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

        <div className={css.sportBarWrap}>
          <SportBar
            value={selectedSport}
            onChange={next => setSelectedSport(next)}
            allLabel={intl.formatMessage({ id: 'CoachesPage.sportAll' })}
          />
        </div>

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
          <p className={css.status}>
            <FormattedMessage id="CoachesPage.empty" />
          </p>
        ) : null}

        {!loading && !failed && filteredCoaches.length > 0 ? (
          <div className={css.carousel}>
            <div ref={cardsScrollRef} className={css.cardsRow}>
              {filteredCoaches.map(coach => (
                <div key={coach.authorUuid} className={css.stickerSlot}>
                  <CoachStickerCard coach={coach} />
                </div>
              ))}
            </div>
            {showCarouselNav ? (
              <div className={css.carouselNav}>
                <button
                  type="button"
                  className={css.carouselArrow}
                  aria-label={intl.formatMessage({ id: 'CoachesPage.carouselPrev' })}
                  onClick={e => slideCoachesCarousel(-1, e)}
                  onKeyDown={onCarouselArrowKeyDown}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={css.carouselArrow}
                  aria-label={intl.formatMessage({ id: 'CoachesPage.carouselNext' })}
                  onClick={e => slideCoachesCarousel(1, e)}
                  onKeyDown={onCarouselArrowKeyDown}
                >
                  ›
                </button>
              </div>
            ) : null}
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
