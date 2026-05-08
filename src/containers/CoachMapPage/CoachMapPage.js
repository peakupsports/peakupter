import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse, stringify } from '../../util/urlHelpers';

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
// TEMP DEMO COACHES FOR MARKETING REEL – REMOVE BEFORE PRODUCTION
// Single source of truth in `./demoCoaches.js`. To remove, delete this
// import and the `mergeDemoIntoCoaches` call below; the rest is unchanged.
import { mergeDemoIntoCoaches } from './demoCoaches';
import { fetchCoachesExploreThunk } from '../CoachesExplorePage/CoachesExplorePage.duck';

import CoachMap3D from './CoachMap3D/CoachMap3D';

import css from './CoachMapPage.module.css';

/**
 * CoachMap-only filter chips. The main row stays compact (one chip per
 * primary sport). Snowboard and Ski declare `variants[]`: when the family
 * is active (parent slug OR any variant slug is the current value),
 * `<SportBar disciplines>` renders a smaller secondary row below with the
 * leaf disciplines only – the parent chip in the main row already acts as
 * the implicit "All <sport>". Filtering is delegated to
 * `matchSportFilterKeys`:
 *  - `snowboard` (parent click) → all snowboard variants
 *  - leaf slug (e.g. `freeridesnowboard`) → only that variant
 *  - same for `ski` family
 *
 * This list does NOT change global sport taxonomy, ProfilePage, listing
 * setup or coach figurine; it only drives the SportBar on this page.
 */
// CoachMap discipline chips. Keys MUST be from the official platform
// sports list (mirrors `SPORT_LABELS` in `src/components/SportBar/SportBar.js`
// and `PROFILE_SPORT_DISPLAY_LABELS` in `src/util/profileCoachSticker.js`).
// Adding a sport in Profile Settings without adding it here means it
// never shows up as a CoachMap filter chip.
//
// Snowboard / Ski declare `variants[]` so the SportBar renders a
// secondary row when the family is active. Variant short labels stay
// CoachMap-only ("Freeride" / "Freestyle" / …) – the parent context
// disambiguates. Canonical full labels live in
// `PROFILE_SPORT_DISPLAY_LABELS` for use elsewhere (cards, popups, sticker).
// Variant emojis use clean, sport-canonical glyphs that read instantly
// over the map (no custom symbols / pictograms). Order is curated:
// gravity-style discipline first (Freestyle / Freeski), then Freeride,
// then the touring (uphill) variant.
//
// Snowboard:  🏂 Freestyle · 🏔️ Freeride · 🥾 Split touring
// Ski:        ⛷️ Freeski   · 🏔️ Freeride · 🥾 Split touring
//
// Keys are kept stable so `matchSportFilterKeys` / aliases / routing /
// query params keep working unchanged.
const SNOWBOARD_DISCIPLINE = {
  key: 'snowboard',
  label: 'Snowboard',
  emoji: '🏂',
  variants: [
    { key: 'freestylesnowboard', label: 'Freestyle', emoji: '🏂' },
    { key: 'freeridesnowboard', label: 'Freeride', emoji: '🏔️' },
    { key: 'splittouring', label: 'Split touring', emoji: '🥾' },
  ],
};

const SKI_DISCIPLINE = {
  key: 'ski',
  label: 'Ski',
  emoji: '🎿',
  aliases: ['skiing'],
  variants: [
    { key: 'freestyleskiing', label: 'Freeski', emoji: '⛷️', aliases: ['freestyleski'] },
    { key: 'freerideskiing', label: 'Freeride', emoji: '🏔️', aliases: ['freerideski'] },
    { key: 'skitouring', label: 'Split touring', emoji: '🥾' },
  ],
};

const MTB_DISCIPLINE = { key: 'mtb', label: 'MTB', emoji: '🚵' };
const SURF_DISCIPLINE = { key: 'surf', label: 'Surf', emoji: '🏄' };
const TENNIS_DISCIPLINE = { key: 'tennis', label: 'Tennis', emoji: '🎾' };
const CLIMBING_DISCIPLINE = { key: 'climbing', label: 'Climbing', emoji: '🧗' };
const GOLF_DISCIPLINE = { key: 'golf', label: 'Golf', emoji: '⛳️' };
// 💪 matches `PROFILE_SPORT_EMOJI.fitness` so chip / figurine / marker stay aligned.
const FITNESS_DISCIPLINE = { key: 'fitness', label: 'Fitness', emoji: '💪' };
const YOGA_DISCIPLINE = { key: 'yoga', label: 'Yoga', emoji: '🧘' };
const SKYDIVE_DISCIPLINE = { key: 'skydive', label: 'Skydive', emoji: '🪂' };
// 🪁 differentiates Kitesurf from Surf (which uses 🏄). Wakeboard
// re-uses 🏄 since `PROFILE_SPORT_EMOJI.wakeboard` does too – the chip
// label disambiguates.
const KITESURF_DISCIPLINE = { key: 'kitesurf', label: 'Kitesurf', emoji: '🪁' };
const WAKEBOARD_DISCIPLINE = { key: 'wakeboard', label: 'Wakeboard', emoji: '🏄' };
const CROSSCOUNTRY_DISCIPLINE = {
  key: 'crosscountry',
  label: 'Cross-country',
  emoji: '🎿',
  aliases: ['cross-country', 'cross_country'],
};
// Skateboard chip filters expand to both `skate` and `skateboard` keys
// via `matchSportFilterKeys` so legacy coach data still matches.
const SKATEBOARD_DISCIPLINE = {
  key: 'skateboard',
  label: 'Skateboard',
  emoji: '🛹',
  aliases: ['skate'],
};

/**
 * Pick the seasonal main-row order. Winter = Nov→Apr (months 10,11,0,1,2,3),
 * pushing Snowboard / Ski to the front; Summer = May→Oct (4-9) leads with
 * MTB / Surf and pushes winter sports to the back. Date is injected so it
 * stays unit-testable (default uses the current calendar month).
 *
 * @param {Date} [date]
 * @returns {Array}
 */
const getCoachMapDisciplinesForSeason = (date = new Date()) => {
  const month = typeof date.getMonth === 'function' ? date.getMonth() : new Date().getMonth();
  const isWinter = month >= 10 || month <= 3;
  // Order rationale (both seasons): in-season disciplines first, then
  // year-round disciplines (Tennis · Climbing · Golf · Fitness · Yoga ·
  // Skydive · Skateboard), then off-season disciplines at the end. Every
  // sport from the official platform list is rendered in both seasons so
  // coaches are never hidden – only the order changes.
  if (isWinter) {
    return [
      SNOWBOARD_DISCIPLINE,
      SKI_DISCIPLINE,
      CROSSCOUNTRY_DISCIPLINE,
      MTB_DISCIPLINE,
      CLIMBING_DISCIPLINE,
      TENNIS_DISCIPLINE,
      GOLF_DISCIPLINE,
      FITNESS_DISCIPLINE,
      YOGA_DISCIPLINE,
      SKATEBOARD_DISCIPLINE,
      SKYDIVE_DISCIPLINE,
      SURF_DISCIPLINE,
      KITESURF_DISCIPLINE,
      WAKEBOARD_DISCIPLINE,
    ];
  }
  return [
    SURF_DISCIPLINE,
    KITESURF_DISCIPLINE,
    WAKEBOARD_DISCIPLINE,
    MTB_DISCIPLINE,
    CLIMBING_DISCIPLINE,
    SKATEBOARD_DISCIPLINE,
    TENNIS_DISCIPLINE,
    GOLF_DISCIPLINE,
    FITNESS_DISCIPLINE,
    YOGA_DISCIPLINE,
    SKYDIVE_DISCIPLINE,
    SNOWBOARD_DISCIPLINE,
    SKI_DISCIPLINE,
    CROSSCOUNTRY_DISCIPLINE,
  ];
};

const normalizeDisciplineSlug = s =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[\s\-_]+/g, '');

/**
 * Resolve the user-facing short label for a sport slug used in the page
 * headline, scoped to the CoachMap chips. Returns the parent or variant
 * `label` defined in the CoachMap discipline list (so e.g. `freeridesnowboard`
 * → "Freeride", not the raw slug "Freeridesnowboard"). Returns null when
 * the slug isn't part of the CoachMap taxonomy – the caller can fall back
 * to a generic title-case helper for unknown slugs.
 *
 * @param {Array} disciplines
 * @param {string} slug
 * @returns {string|null}
 */
const getCoachMapHeadlineLabel = (disciplines, slug) => {
  const v = normalizeDisciplineSlug(slug);
  if (!v) return null;
  for (const d of disciplines) {
    if (normalizeDisciplineSlug(d.key) === v) return d.label;
    if ((d.aliases || []).some(a => normalizeDisciplineSlug(a) === v)) return d.label;
    for (const va of d.variants || []) {
      if (normalizeDisciplineSlug(va.key) === v) return va.label;
      if ((va.aliases || []).some(a => normalizeDisciplineSlug(a) === v)) return va.label;
    }
  }
  return null;
};

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
  const history = useHistory();
  const dispatch = useDispatch();

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const { coaches: realCoaches, fetchStatus, boundsPlain } = useSelector(
    state => state.CoachesExplorePage
  );

  // Merge real coaches with frontend-only demo entries so the map reads as
  // an internationally active platform from the very first render (real
  // coaches still rank first; demos are appended). `mergeDemoIntoCoaches`
  // is a no-op when `DEMO_COACHES_ENABLED` is false.
  const coaches = useMemo(() => mergeDemoIntoCoaches(realCoaches), [realCoaches]);

  const queryExplore = useMemo(() => parseCoachExploreSearch(location.search), [location.search]);

  // Seasonal main-row order (winter Nov–Apr puts Snowboard/Ski first; summer
  // May–Oct leads with MTB/Surf). Computed once per session via `useMemo`
  // to keep prop reference stable across renders.
  const coachMapDisciplines = useMemo(() => getCoachMapDisciplinesForSeason(), []);

  const [selectedSport, setSelectedSport] = useState('');
  // Hover state on cards/markers — transient.
  const [activeListingId, setActiveListingId] = useState(null);
  // Click "Map" on a CoachCard => persistent selection that survives mouseleave
  // and triggers a flyTo in CoachMap3D. `flyToTarget.ts` is bumped on every
  // click so the same coach can be re-flown by the user.
  const [selectedCoachKey, setSelectedCoachKey] = useState(null);
  const [flyToTarget, setFlyToTarget] = useState(null);
  // Browser geolocation result. `null` while pending / on permission denial,
  // `{ lat, lng }` once the user accepts. Drives the "You are here" marker
  // in CoachMap3D and (conditionally) an auto-flyTo on first resolve.
  const [userLocation, setUserLocation] = useState(null);

  // Ensure data is loaded when entering the map page directly (e.g. from "Current location").
  useEffect(() => {
    if (fetchStatus === 'idle') {
      dispatch(fetchCoachesExploreThunk({ config }));
    }
  }, [fetchStatus, dispatch, config]);

  useEffect(() => {
    setSelectedSport(queryExplore.sportKey);
  }, [queryExplore.sportKey]);

  // Deep-link target: when the page is opened with `?coachId=<uuid>` (e.g.
  // from the small map preview on a Coach Profile page), auto-select that
  // coach as soon as the coaches list resolves — popup opens, marker
  // highlights, camera flies. We look up against the unfiltered `coaches`
  // array so the link still works even when a sport filter would
  // otherwise hide the marker. The ref guards against re-firing on every
  // render: we only consume each `coachId` once per session, then let
  // the user's interactions take over.
  const consumedCoachIdRef = useRef(null);
  useEffect(() => {
    const targetCoachId = queryExplore.coachId;
    if (!targetCoachId) return;
    if (!coaches || coaches.length === 0) return;
    if (consumedCoachIdRef.current === targetCoachId) return;

    const target = coaches.find(c => c.authorUuid === targetCoachId);
    if (!target) return;

    consumedCoachIdRef.current = targetCoachId;
    setSelectedCoachKey(target.authorUuid);
    setActiveListingId(target.representativeListing?.id || null);
    const coords = getCoachCoordinates(target);
    if (coords) {
      setFlyToTarget({ lat: coords.lat, lng: coords.lng, ts: Date.now() });
    }
  }, [queryExplore.coachId, coaches]);

  // Ask the browser for the user's current location once on mount. The
  // request is fire-and-forget – we never block page rendering on it.
  // Permission denial, missing API, or timeout are all handled silently:
  // `userLocation` simply stays `null`, the existing default centring
  // (bounds-fit on coaches) takes over, and no "You are here" marker is
  // drawn. We use a low-precision request with a 5-minute cache window
  // so revisiting the page within the same session doesn't re-prompt.
  const geolocationRequestedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (geolocationRequestedRef.current) return;
    if (!navigator?.geolocation?.getCurrentPosition) return;

    geolocationRequestedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setUserLocation({ lat, lng });
        }
      },
      // Permission denied, position unavailable, timeout — graceful no-op.
      // Existing fallback (fit to coach bounds / Alpine default) stays
      // active.
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  // Auto-centre on the user once geolocation resolves, but only when no
  // higher-priority focus is implied by the URL:
  //   – `?coachId=…` (deep-link from a Coach Profile) wins.
  //   – `?lat=&lng=` (user already provided a location) wins.
  // With only `?sport=…` (or no params at all) we fly to the user. The
  // ref guards so we only consume the resolved position once per session
  // — subsequent filter changes still refit to the filtered coach set.
  const flyToUserLocationConsumedRef = useRef(false);
  useEffect(() => {
    if (flyToUserLocationConsumedRef.current) return;
    if (!userLocation) return;
    if (queryExplore.coachId) return;
    if (queryExplore.userLat != null || queryExplore.userLng != null) return;

    flyToUserLocationConsumedRef.current = true;
    setFlyToTarget({
      lat: userLocation.lat,
      lng: userLocation.lng,
      ts: Date.now(),
    });
  }, [userLocation, queryExplore.coachId, queryExplore.userLat, queryExplore.userLng]);

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

  // Prefer the curated CoachMap chip label so the title reads "Find your
  // Freeride coach" instead of the raw concatenated slug
  // ("Freeridesnowboard"). Falls back to the generic slug formatter for
  // sports outside the CoachMap chip list (e.g. arrived via deep link).
  const headlineSportPhrase = selectedSport.trim()
    ? getCoachMapHeadlineLabel(coachMapDisciplines, selectedSport) ||
      formatCoachExploreSportSlug(selectedSport)
    : '';
  const hasGeoProximity =
    queryExplore.userLat != null &&
    queryExplore.userLng != null &&
    Number.isFinite(queryExplore.userLat) &&
    Number.isFinite(queryExplore.userLng);
  const hasPlaceLabel = !hasGeoProximity && queryExplore.locationLabel.length > 0;

  // SportBar lives in the desktop topbar (same row as logo + menu, à la
  // LandingPage). Click handler updates `?sport=` *in place* on the
  // current URL, preserving every other search param (lat / lng /
  // location / coachId). The local `selectedSport` mirror is kept in
  // sync via the existing `useEffect(queryExplore.sportKey)` upstream,
  // so the chip active state and the in-memory filter both follow the
  // URL change. The wrapper applies the same scale used on LandingPage
  // to keep visual size aligned.
  const handleSportBarChange = useCallback(
    next => {
      setActiveListingId(null);
      const currentParams = parse(location.search);
      const merged = { ...currentParams };
      if (next) {
        merged.sport = next;
      } else {
        delete merged.sport;
      }
      const search = stringify(merged);
      history.push(`${location.pathname}${search ? `?${search}` : ''}`);
    },
    [history, location.pathname, location.search]
  );

  const topbarSportBar = (
    <div className={css.topbarSportBarScale}>
      <SportBar
        value={selectedSport}
        onChange={handleSportBarChange}
        allLabel={intl.formatMessage({ id: 'CoachMapPage.sportAll' })}
        disciplines={coachMapDisciplines}
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
            selectedSport={selectedSport}
            flyToTarget={flyToTarget}
            bounds={effectiveBoundsPlain}
            center={center}
            userLocation={userLocation}
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
