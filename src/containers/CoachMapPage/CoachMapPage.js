import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { Page, SportBar, CoachCard } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';

import {
  filterCoachesBySport,
  formatCoachExploreSportSlug,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
} from '../../util/coachExplore';
import { getCoachCoordinates } from '../../util/profileCoachSticker';
import { fetchCoachesExploreThunk } from '../CoachesExplorePage/CoachesExplorePage.duck';

import CoachMap3D from './CoachMap3D/CoachMap3D';

import css from './CoachMapPage.module.css';

/**
 * Coach map: full-page layout.
 * - Desktop: fixed-width left sidebar with all coach cards (independent scroll)
 *   + 3D Mapbox map filling the remaining width.
 * - Mobile: 3D map on top, vertical stacked coach list below.
 *
 * SportBar lives in the desktop topbar (see Topbar.js). It still drives the
 * in-page list/map filter via local `selectedSport`.
 *
 * Same query params as Coaches list: ?sport=&lat=&lng=&location=
 */
const CoachMapPage = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const location = useLocation();
  const dispatch = useDispatch();

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const { coaches, fetchStatus, boundsPlain } = useSelector(
    state => state.CoachesExplorePage
  );

  const queryExplore = useMemo(() => parseCoachExploreSearch(location.search), [location.search]);

  const [selectedSport, setSelectedSport] = useState('');
  // Hover state on cards/markers — transient.
  const [activeListingId, setActiveListingId] = useState(null);
  // Click "Map" on a CoachCard => persistent selection that survives mouseleave
  // and triggers a flyTo in CoachMap3D. `flyToTarget.ts` is bumped on every
  // click so the same coach can be re-flown by the user.
  const [selectedCoachKey, setSelectedCoachKey] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);

  // Ensure data is loaded when entering the map page directly (e.g. from "Current location").
  useEffect(() => {
    if (fetchStatus === 'idle') {
      dispatch(fetchCoachesExploreThunk({ config }));
    }
  }, [fetchStatus, dispatch, config]);

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

  // Bounds derived from the *filtered* coach set so changing the SportBar
  // (or any other filter) refits the map to only the visible coaches.
  // Coordinates are resolved with the same fallback chain used to draw the
  // markers, so the camera and the pins stay in sync.
  const filteredBoundsPlain = useMemo(() => {
    if (!filteredCoaches.length) return null;
    let swLat = Infinity;
    let swLng = Infinity;
    let neLat = -Infinity;
    let neLng = -Infinity;
    let count = 0;
    filteredCoaches.forEach(c => {
      const coords = getCoachCoordinates(c);
      if (!coords) return;
      if (coords.lat < swLat) swLat = coords.lat;
      if (coords.lng < swLng) swLng = coords.lng;
      if (coords.lat > neLat) neLat = coords.lat;
      if (coords.lng > neLng) neLng = coords.lng;
      count += 1;
    });
    if (count === 0) return null;
    if (count === 1) {
      // Single-point: pad ~9km so fitBounds doesn't slam to street zoom (the
      // CoachMap3D fitBounds call still applies its own maxZoom cap).
      const pad = 0.08;
      return {
        swLat: swLat - pad,
        swLng: swLng - pad,
        neLat: neLat + pad,
        neLng: neLng + pad,
      };
    }
    return { swLat, swLng, neLat, neLng };
  }, [filteredCoaches]);

  // Prefer the filtered bounds; fall back to the global bounds from the duck
  // while the filtered set is empty or hasn't resolved any coordinates yet.
  const effectiveBoundsPlain = filteredBoundsPlain || boundsPlain || null;

  const center = useMemo(() => {
    const b = effectiveBoundsPlain;
    if (!b) return null;
    return {
      lat: (b.neLat + b.swLat) / 2,
      lng: (b.neLng + b.swLng) / 2,
    };
  }, [effectiveBoundsPlain]);

  const onRetry = useCallback(() => {
    dispatch(fetchCoachesExploreThunk({ config }));
  }, [config, dispatch]);

  const handleMarkerHover = useCallback((coach, isHovering) => {
    setActiveListingId(isHovering ? coach?.representativeListing?.id || null : null);
  }, []);

  // Marker click: persist the selection so the marker stays highlighted AND
  // the premium popup opens at that coach. We do NOT trigger flyTo here –
  // flying the camera remains a CoachCard-only action via `handleMapClick`.
  const handleMarkerClick = useCallback(coach => {
    setActiveListingId(coach?.representativeListing?.id || null);
    setSelectedCoachKey(coach?.authorUuid || null);
  }, []);

  // Popup close (✕ button or Mapbox-internal 'close' event): clear the
  // selection, which also drops the marker highlight via `selectedListingId`.
  const handlePopupClose = useCallback(() => {
    setSelectedCoachKey(null);
  }, []);

  // CoachCard "Map" button: select the coach, fly the map, keep card highlighted.
  // Coordinates come from `getCoachCoordinates`, which falls back from the
  // representative listing's `geolocation` to the coach's profile publicData
  // (lat/lng, location.selectedPlace.origin, configured `coachCity` slug).
  const handleMapClick = useCallback(coach => {
    if (!coach) return;
    const coords = getCoachCoordinates(coach);
    setSelectedCoachKey(coach.authorUuid || null);
    if (coords) {
      setFlyToTarget({ lat: coords.lat, lng: coords.lng, ts: Date.now() });
    }
  }, []);

  // Resolve the selected coach's representative listing id so the marker stays
  // highlighted independently from hover state.
  const selectedListingId = useMemo(() => {
    if (!selectedCoachKey) return null;
    const c = filteredCoaches.find(x => x.authorUuid === selectedCoachKey);
    return c?.representativeListing?.id || null;
  }, [filteredCoaches, selectedCoachKey]);

  const marketplaceName = config.branding.marketplaceName || 'Marketplace';
  const schemaTitle = intl.formatMessage({ id: 'CoachMapPage.schemaTitle' }, { marketplaceName });
  const schemaDescription = intl.formatMessage({ id: 'CoachMapPage.schemaDescription' });

  const loading = fetchStatus === 'loading';
  const failed = fetchStatus === 'failed';

  const headlineSportPhrase = selectedSport.trim()
    ? formatCoachExploreSportSlug(selectedSport)
    : '';
  const hasGeoProximity =
    queryExplore.userLat != null &&
    queryExplore.userLng != null &&
    Number.isFinite(queryExplore.userLat) &&
    Number.isFinite(queryExplore.userLng);
  const hasPlaceLabel = !hasGeoProximity && queryExplore.locationLabel.length > 0;

  // SportBar lives in the desktop topbar (same row as logo + menu, à la LandingPage),
  // but it still drives the in-page list/map filter via local `selectedSport`.
  // The wrapper applies the same scale used on LandingPage to keep visual size aligned.
  const topbarSportBar = (
    <div className={css.topbarSportBarScale}>
      <SportBar
        value={selectedSport}
        onChange={next => {
          setSelectedSport(next);
          setActiveListingId(null);
        }}
        allLabel={intl.formatMessage({ id: 'CoachMapPage.sportAll' })}
        includeWinterVariants
        inTopbar
      />
    </div>
  );

  const titleNode = headlineSportPhrase ? (
    <FormattedMessage
      id="CoachDirectory.heroTitleWithSport"
      values={{ sport: headlineSportPhrase }}
    />
  ) : (
    <FormattedMessage id="CoachMapPage.title" />
  );

  const subtitleNode = hasGeoProximity ? (
    <FormattedMessage id="CoachDirectory.heroSubtitleNearYou" />
  ) : hasPlaceLabel ? (
    <FormattedMessage
      id="CoachDirectory.heroSubtitleInPlace"
      values={{ place: queryExplore.locationLabel }}
    />
  ) : (
    <FormattedMessage id="CoachMapPage.subtitle" />
  );

  return (
    <Page title={schemaTitle} description={schemaDescription} scrollingDisabled={scrollingDisabled}>
      <TopbarContainer currentPage="CoachMapPage" topbarCenterContent={topbarSportBar} />
      <main className={css.fullScreen}>
        <aside
          className={css.sidebar}
          aria-label={intl.formatMessage({ id: 'CoachesPage.title' })}
        >
          <header className={css.sidebarHeader}>
            <h1 className={css.title}>{titleNode}</h1>
            <p className={css.subtitle}>{subtitleNode}</p>
          </header>

          {loading ? (
            <p className={css.status}>
              <FormattedMessage id="CoachesPage.loading" />
            </p>
          ) : failed ? (
            <div className={css.errorBox}>
              <p className={css.status}>
                <FormattedMessage id="CoachesPage.error" />
              </p>
              <button type="button" className={css.retry} onClick={onRetry}>
                <FormattedMessage id="CoachesPage.retry" />
              </button>
            </div>
          ) : filteredCoaches.length === 0 ? (
            <p className={css.status}>
              <FormattedMessage id="CoachesPage.empty" />
            </p>
          ) : (
            <div className={css.sidebarList}>
              {filteredCoaches.map(coach => (
                <CoachCard
                  key={coach.authorUuid}
                  coach={coach}
                  isSelected={selectedCoachKey === coach.authorUuid}
                  onMouseEnter={() =>
                    setActiveListingId(coach.representativeListing?.id || null)
                  }
                  onMouseLeave={() => setActiveListingId(null)}
                  onMapClick={handleMapClick}
                />
              ))}
            </div>
          )}
        </aside>

        <div className={css.mapPanel}>
          <CoachMap3D
            coaches={filteredCoaches}
            activeListingId={activeListingId}
            selectedListingId={selectedListingId}
            flyToTarget={flyToTarget}
            bounds={effectiveBoundsPlain}
            center={center}
            onMarkerHover={handleMarkerHover}
            onMarkerClick={handleMarkerClick}
            onPopupClose={handlePopupClose}
          />
        </div>
      </main>
    </Page>
  );
};

CoachMapPage.propTypes = {
  staticContext: propTypes.staticContext,
};

export default CoachMapPage;
