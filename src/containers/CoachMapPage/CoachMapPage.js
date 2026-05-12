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
  haversineDistanceKm,
  parseCoachExploreSearch,
  sortCoachRowsByDistanceKm,
} from '../../util/coachExplore';
import { sortByPeakUpTopLevelSportOrder } from '../../util/peakupSportTaxonomy';
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
// gravity-style discipline first (Freestyle), then Freeride, then the
// touring (uphill) variant.
//
// Snowboard variant labels use the implicit-parent short form (the
// Snowboard parent chip already provides context):
//   Snowboard:  🏂 Freestyle · 🏔️ Freeride · 🥾 Split touring
//
// Ski variant labels use the explicit "<sport> Ski" / "Ski touring"
// form to (a) follow the canonical ski-domain naming and (b) avoid
// any cross-discipline confusion with the Snowboard "Split touring"
// term — they share the same 🥾 glyph but are different disciplines:
//   Ski:        ⛷️ Freestyle Ski · 🏔️ Freeride Ski · 🥾 Ski touring
//
// Keys are kept stable so `matchSportFilterKeys` / aliases / routing /
// query params keep working unchanged. Only the user-facing labels move.
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
    { key: 'freestyleskiing', label: 'Freestyle Ski', emoji: '⛷️', aliases: ['freestyleski'] },
    { key: 'freerideskiing', label: 'Freeride Ski', emoji: '🏔️', aliases: ['freerideski'] },
    // Was previously labeled "Split touring" — that's the Snowboard term.
    // The canonical Ski-domain term is "Ski touring" (matches the key
    // `skitouring`). Filter keys / URL params unchanged.
    { key: 'skitouring', label: 'Ski touring', emoji: '🥾' },
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
// `wakesurf` is a separate top-level bookable sport on PeakUp, NOT a
// Wakeboard variant — no entry in `WAKEBOARD_DISCIPLINE.variants`.
// 🌊 visually disambiguates from Wakeboard (🏄) and Surf (🏄) in the
// CoachMap chip row.
const WAKESURF_DISCIPLINE = { key: 'wakesurf', label: 'Wakesurf', emoji: '🌊' };
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
 * CoachMap top-level parent sports must follow the same canonical PeakUp order
 * as the Landing / Topbar SportBar. Variants stay nested under their existing
 * parent discipline and are NOT reordered here.
 *
 * @returns {Array}
 */
const getCoachMapDisciplines = () =>
  sortByPeakUpTopLevelSportOrder(
    [
      SURF_DISCIPLINE,
      MTB_DISCIPLINE,
      TENNIS_DISCIPLINE,
      GOLF_DISCIPLINE,
      CLIMBING_DISCIPLINE,
      YOGA_DISCIPLINE,
      SKYDIVE_DISCIPLINE,
      FITNESS_DISCIPLINE,
      WAKEBOARD_DISCIPLINE,
      WAKESURF_DISCIPLINE,
      KITESURF_DISCIPLINE,
      SKATEBOARD_DISCIPLINE,
      SNOWBOARD_DISCIPLINE,
      SKI_DISCIPLINE,
      CROSSCOUNTRY_DISCIPLINE,
    ],
    discipline => discipline.key
  );

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

// Defensive viewport guard (F1a). The bounds derived from `filteredCoaches`
// can occasionally span continents — e.g. when a future real coach signs up
// in Niseko/Whistler/Aspen on a sport whose other coaches all live in the
// Alps. Without this guard, `fitBounds` over a hemispheric box produces a
// globe view at zoom 0–1 (Mapbox v3 defaults to `projection: 'globe'`).
//
// When the raw filtered bounds exceed these spans AND the user's
// geolocation is known, we recompute bounds from the subset of coaches
// within `USER_REGION_CLIP_KM` km of the user. The faraway coaches are
// still rendered as markers (this only clips the camera, not the data),
// so a click on a Niseko marker still flies the camera there.
//
// When userLocation is NOT known, we keep the raw filtered bounds as-is
// (fail-soft) — under normal data conditions this branch is unreachable
// because the demo cleanup (F2) keeps every demo's variant tag inside the
// Alpine cluster.
const WIDE_BOUNDS_LAT_SPAN_DEG = 30;
const WIDE_BOUNDS_LNG_SPAN_DEG = 60;
// ~800 km ≈ 7° lat at lat 46° / ~10° lng at lat 46°. Wide enough to cover
// most of an alpine country plus its neighbours, narrow enough to clearly
// reject transatlantic / transpacific outliers.
const USER_REGION_CLIP_KM = 800;

/**
 * True when `bounds` cover more than the safe span thresholds (i.e. the
 * filtered coach set is geographically scattered enough that fitBounds
 * would zoom out to a globe-style view).
 *
 * @param {{ swLat:number, swLng:number, neLat:number, neLng:number }|null} bounds
 * @returns {boolean}
 */
const isWideBounds = bounds => {
  if (!bounds) return false;
  const latSpan = bounds.neLat - bounds.swLat;
  const lngSpan = bounds.neLng - bounds.swLng;
  return latSpan > WIDE_BOUNDS_LAT_SPAN_DEG || lngSpan > WIDE_BOUNDS_LNG_SPAN_DEG;
};

/**
 * Compute filtered bounds from the subset of `coaches` within `radiusKm`
 * of `(centerLat, centerLng)`. Same shape and single-coach padding as the
 * main `filteredBoundsPlain` calculation. Returns `null` when no coach
 * passes the radius filter or when none have valid coordinates.
 *
 * @param {Object[]} coaches
 * @param {number} centerLat
 * @param {number} centerLng
 * @param {number} radiusKm
 * @returns {{ swLat:number, swLng:number, neLat:number, neLng:number }|null}
 */
const computeBoundsForCoachesNear = (coaches, centerLat, centerLng, radiusKm) => {
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;
  let count = 0;
  coaches.forEach(c => {
    const coords = getCoachCoordinates(c);
    if (!coords) return;
    const km = haversineDistanceKm(centerLat, centerLng, coords.lat, coords.lng);
    if (km == null || km > radiusKm) return;
    if (coords.lat < swLat) swLat = coords.lat;
    if (coords.lng < swLng) swLng = coords.lng;
    if (coords.lat > neLat) neLat = coords.lat;
    if (coords.lng > neLng) neLng = coords.lng;
    count += 1;
  });
  if (count === 0) return null;
  if (count === 1) {
    const pad = 0.08;
    return {
      swLat: swLat - pad,
      swLng: swLng - pad,
      neLat: neLat + pad,
      neLng: neLng + pad,
    };
  }
  return { swLat, swLng, neLat, neLng };
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
  const coachMapDisciplines = useMemo(() => getCoachMapDisciplines(), []);

  // The URL is the single source of truth for the active sport filter (per
  // the SportBar contract — see Topbar.js `mergeSportIntoSearch`). Reading
  // it directly via the already-memoized `queryExplore` removes the
  // 1-render desync window we used to have between `useState('')` +
  // `useEffect(setSelectedSport(queryExplore.sportKey))`. That window
  // caused a visible double map-fit on initial load (the first paint
  // fitted to all coaches with `selectedSport=''`, then the effect ran,
  // selectedSport flipped to e.g. 'ski', and the bounds-fit fired again
  // to the filtered subset). Deriving the value keeps the SportBar chip,
  // the in-memory filter and the URL perfectly in lockstep on every
  // render.
  const selectedSport = queryExplore.sportKey;
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
  // higher-priority focus is implied by the URL. Order of precedence:
  //   – `?coachId=…` (deep-link from a Coach Profile) wins.
  //   – `?lat=&lng=` (user already provided an explicit location) wins.
  //   – `?sport=…` (active SportBar filter) wins — the camera must stay
  //     fitted to the filtered coach set, otherwise a late-arriving
  //     geolocation result silently hijacks the view a second or two
  //     after the user picked their sport.
  // With none of the above (a clean visit to /coach-map) we fly to the
  // user. The ref guards so we only consume the resolved position once
  // per session — subsequent filter changes still refit to the filtered
  // coach set via the bounds-driven `fitBounds` effect inside CoachMap3D.
  const flyToUserLocationConsumedRef = useRef(false);
  useEffect(() => {
    if (flyToUserLocationConsumedRef.current) return;
    if (!userLocation) return;
    if (queryExplore.coachId) return;
    if (queryExplore.userLat != null || queryExplore.userLng != null) return;
    // Active sport filter takes precedence over the user's geolocation.
    // The bounds pipeline already fitted the camera to the filtered
    // coaches; we must NOT fly elsewhere on top of that.
    if (queryExplore.sportKey) return;

    flyToUserLocationConsumedRef.current = true;
    setFlyToTarget({
      lat: userLocation.lat,
      lng: userLocation.lng,
      ts: Date.now(),
    });
  }, [
    userLocation,
    queryExplore.coachId,
    queryExplore.userLat,
    queryExplore.userLng,
    queryExplore.sportKey,
  ]);

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

  // F1a (defensive viewport guard). When the raw `filteredBoundsPlain`
  // would force fitBounds to a globe view (filtered coaches scattered
  // across continents) AND we have the user's geolocation, we replace
  // them with bounds derived from coaches within `USER_REGION_CLIP_KM`
  // of the user. The faraway coach markers are still rendered — only
  // the camera is regionalized. Clicking a faraway marker still fires
  // `flyTo` to that coach via `handleMarkerClick` / `handleMapClick`.
  //
  // This guard is fail-soft: if userLocation is unknown OR no coach
  // falls within the radius, we keep the original `filteredBoundsPlain`
  // (so under normal data conditions — i.e. with the F2 demo cleanup —
  // this branch is essentially never reached).
  const safeFilteredBoundsPlain = useMemo(() => {
    if (!isWideBounds(filteredBoundsPlain)) return filteredBoundsPlain;
    if (!userLocation) return filteredBoundsPlain;
    const clipped = computeBoundsForCoachesNear(
      filteredCoaches,
      userLocation.lat,
      userLocation.lng,
      USER_REGION_CLIP_KM
    );
    return clipped || filteredBoundsPlain;
  }, [filteredBoundsPlain, filteredCoaches, userLocation]);

  // Bounds resolution rules:
  //  – No active sport filter (`/coach-map` or `/coach-map?sport=`):
  //    prefer the filtered bounds; if the filtered set is empty (e.g.
  //    waiting for the first fetch), fall back to the global bounds
  //    from the duck so the map at least shows a sensible coach
  //    distribution on first paint.
  //  – Active sport filter (`/coach-map?sport=ski` etc.) with results:
  //    use the filtered bounds, so the map fits to the visible coaches.
  //  – Active sport filter with NO results: pass `null`. Inside
  //    CoachMap3D the `fitBounds` effect short-circuits on `!bounds`,
  //    so the map keeps its current camera (last filtered view, user
  //    geolocation, or the alpine fallback) instead of jumping to the
  //    global all-coaches bounds. The cinematic empty state in the
  //    sidebar is the user-facing signal — the map staying put is the
  //    coherent map-side counterpart.
  //
  // In every branch we pass `safeFilteredBoundsPlain` (the F1a-clipped
  // version) instead of the raw `filteredBoundsPlain`, so the camera
  // stays regional whenever the filter result happens to span continents.
  const isSportFilterActive = !!selectedSport;
  const effectiveBoundsPlain = isSportFilterActive
    ? safeFilteredBoundsPlain
    : safeFilteredBoundsPlain || boundsPlain || null;

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

  // Filter-wins selection consistency. When the SportBar narrows the
  // visible set so that the previously-selected coach is no longer part
  // of `filteredCoaches`, clear the selection explicitly:
  //   – the popup closes (CoachMap3D resolves `selectedCoach` from the
  //     same filtered list and tears the popup down on null);
  //   – the marker drops its persistent highlight class;
  //   – the hover/active id is reset so a stale `mouseleave` on the
  //     vanished card doesn't keep firing onto a removed marker;
  //   – and crucially: the selection state in this component matches
  //     the user-visible reality, so switching back to a sport that
  //     re-includes the coach won't ghost-rehydrate the popup.
  // The bounds pipeline already refits the camera to the new filtered
  // set on the same URL change, so no extra flyTo is needed here.
  useEffect(() => {
    if (!selectedCoachKey) return;
    const stillVisible = filteredCoaches.some(
      c => c.authorUuid === selectedCoachKey
    );
    if (!stillVisible) {
      setSelectedCoachKey(null);
      setActiveListingId(null);
    }
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
                  className={css.sidebarCoachCard}
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
            className={css.mapSurface}
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
