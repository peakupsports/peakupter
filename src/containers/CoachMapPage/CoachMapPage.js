import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { parse, stringify } from '../../util/urlHelpers';

import { isScrollingDisabled } from '../../ducks/ui.duck';

import { matchesEntityFilter } from '../../util/peakupTeam';
import { Page, SportBar, CoachCard, TeamCard } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';

import {
  COACH_MAP_APPLY_PRIMED_GEO_EVENT,
  COACH_MAP_DIRECT_GEO_EVENT,
  COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY,
  COACH_MAP_SCROLL_PANEL_EVENT,
  coachMapSearchForFreshGeolocationIntent,
  debugCoachMapLocate,
  filterCoachesBySport,
  filterTeamsBySport,
  formatCoachExploreSportSlug,
  haversineDistanceKm,
  logCoachMapLocateVerbose,
  parseCoachExploreSearch,
  stripCoachMapLocateParamsFromSearch,
} from '../../util/coachExplore';
import { sortByPeakUpTopLevelSportOrder } from '../../util/peakupSportTaxonomy';
import { getCoachCoordinates } from '../../util/profileCoachSticker';
import { getTeamCoordinates } from '../../util/peakupTeam';
import { coachPreferredMeetingPointsList } from '../../util/peakupMeetingPoint';
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
 * Plain bounds covering only the given coach rows (same coordinate source as
 * markers: {@link getCoachCoordinates}). Returns `null` when none have coords.
 *
 * @param {Object[]} coachRows
 * @returns {{ swLat:number, swLng:number, neLat:number, neLng:number }|null}
 */
const computePlainBoundsFromCoachRows = coachRows => {
  if (!coachRows?.length) return null;
  let swLat = Infinity;
  let swLng = Infinity;
  let neLat = -Infinity;
  let neLng = -Infinity;
  let count = 0;
  coachRows.forEach(c => {
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
 * Expand plain bounds so they include `(lat, lng)` (e.g. user reference point).
 *
 * @param {{ swLat:number, swLng:number, neLat:number, neLng:number }} b
 * @param {number} lat
 * @param {number} lng
 */
const unionPlainBoundsWithPoint = (b, lat, lng) => {
  if (!b || !Number.isFinite(lat) || !Number.isFinite(lng)) return b;
  return {
    swLat: Math.min(b.swLat, lat),
    swLng: Math.min(b.swLng, lng),
    neLat: Math.max(b.neLat, lat),
    neLng: Math.max(b.neLng, lng),
  };
};

// Sport + map anchor: never fitBounds all filtered coaches worldwide. Prefer
// coaches within `NEARBY_COACH_RADIUS_KM`; if none, zoom to user + nearest few.
const NEARBY_COACH_RADIUS_KM = 100;
const MAP_FIT_DISTANT_COACH_COUNT = 5;
// ~13 km — local view when the filtered set has no geocoded coaches.
const USER_ANCHOR_ONLY_BOUNDS_PAD_DEG = 0.12;

/**
 * Coach map: full-page layout.
 * - Desktop: fixed-width left sidebar with all coach cards (independent scroll)
 *   + 3D Mapbox map filling the remaining width.
 * - Mobile: 3D map on top, vertical stacked coach list below.
 *
 * SportBar lives in the desktop topbar (see Topbar.js). It still drives the
 * in-page list/map filter via local `selectedSport`.
 *
 * Same query params as Coaches list: ?sport=&lat=&lng=&location=&locate=
 */
const CoachMapPage = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const location = useLocation();
  const history = useHistory();
  const dispatch = useDispatch();

  const mapPanelRef = useRef(null);
  const scrollResizeTimerRef = useRef(null);

  const scrollCoachMapPanelMobileIntoView = useCallback(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(max-width: 1023px)');
    if (!mq?.matches) return;
    const el = mapPanelRef.current;
    if (!el || typeof el.scrollIntoView !== 'function') return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    requestAnimationFrame(() => {
      if (scrollResizeTimerRef.current) {
        window.clearTimeout(scrollResizeTimerRef.current);
      }
      scrollResizeTimerRef.current = window.setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        scrollResizeTimerRef.current = null;
      }, 200);
    });
  }, []);

  useEffect(() => {
    const handler = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollCoachMapPanelMobileIntoView());
      });
    };
    window.addEventListener(COACH_MAP_SCROLL_PANEL_EVENT, handler);
    return () => window.removeEventListener(COACH_MAP_SCROLL_PANEL_EVENT, handler);
  }, [scrollCoachMapPanelMobileIntoView]);

  const scrollingDisabled = useSelector(isScrollingDisabled);
  const {
    coaches: realCoaches,
    teams: realTeams = [],
    fetchStatus,
    boundsPlain,
  } = useSelector(state => state.CoachesExplorePage);

  // Merge real coaches with frontend-only demo entries so the map reads as
  // an internationally active platform from the very first render (real
  // coaches still rank first; demos are appended). `mergeDemoIntoCoaches`
  // is a no-op when `DEMO_COACHES_ENABLED` is false.
  const coaches = useMemo(() => mergeDemoIntoCoaches(realCoaches), [realCoaches]);

  const queryExplore = useMemo(() => parseCoachExploreSearch(location.search), [location.search]);

  const locateGeoAppliedForSearchRef = useRef('');

  /** `_locatenonce` for which locate geolocation already succeeded; sport-only URL edits must not re-poll GPS. */
  const locateIntentNonceResolvedRef = useRef(null);

  useEffect(() => {
    if (!parseCoachExploreSearch(location.search).locate) {
      locateGeoAppliedForSearchRef.current = '';
      locateIntentNonceResolvedRef.current = null;
    }
  }, [location.search]);

  useEffect(() => {
    debugCoachMapLocate('CoachMapPage URL → queryExplore', {
      locationSearch: location.search,
      locate: queryExplore.locate,
      sportKey: queryExplore.sportKey,
      coachId: queryExplore.coachId || null,
      userLat: queryExplore.userLat,
      userLng: queryExplore.userLng,
    });
  }, [location.search, queryExplore]);

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
  /** GeolocationPositionError.code, -1 = API missing, -2 = unknown error; null = none */
  const [geolocationErrorCode, setGeolocationErrorCode] = useState(null);
  // Browser geolocation result. `null` while pending / on permission denial,
  // `{ lat, lng }` once the user accepts. Drives the "You are here" marker
  // in CoachMap3D and (conditionally) an auto-flyTo on first resolve.
  const [userLocation, setUserLocation] = useState(null);

  /** When true, the `?locate=` URL effect must not start a second `getCurrentPosition` (sidebar / topbar already did, same gesture). */
  const ignoreLocateUrlEffectOnceRef = useRef(false);

  const applyUserGeolocationFromLocateFlow = useCallback((lat, lng, meta = {}) => {
    setGeolocationErrorCode(null);
    logCoachMapLocateVerbose('setUserLocation', { lat, lng, ...meta });
    setUserLocation({ lat, lng });
    // Same camera on mobile and desktop (product parity).
    setFlyToTarget({
      lat,
      lng,
      ts: Date.now(),
      zoom: 12.5,
      pitch: 65,
      bearing: -25,
      duration: 1600,
    });
    logCoachMapLocateVerbose('flyTo user location', {
      zoom: 12.5,
      pitch: 65,
      bearing: -25,
      duration: 1600,
      ...meta,
    });
    if (typeof window !== 'undefined') {
      locateGeoAppliedForSearchRef.current = window.location.search || '';
      try {
        const sp = new URLSearchParams(window.location.search.replace(/^\?/, ''));
        locateIntentNonceResolvedRef.current = sp.get('_locatenonce') || '';
      } catch (e) {
        locateIntentNonceResolvedRef.current = '';
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COACH_MAP_SCROLL_PANEL_EVENT));
    }
  }, []);

  const tryConsumePrimedLandingGeo = useCallback(() => {
    const parsed = parseCoachExploreSearch(location.search);
    if (!parsed.locate) return false;
    if (locateGeoAppliedForSearchRef.current === location.search) return false;
    try {
      const raw = sessionStorage.getItem(COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY);
      if (!raw) return false;
      const j = JSON.parse(raw);
      sessionStorage.removeItem(COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY);
      if (!Number.isFinite(j.lat) || !Number.isFinite(j.lng)) return false;
      applyUserGeolocationFromLocateFlow(j.lat, j.lng, { branch: 'landing-primed' });
      logCoachMapLocateVerbose('applied primed landing geolocation from sessionStorage', {
        lat: j.lat,
        lng: j.lng,
      });
      return true;
    } catch (e) {
      return false;
    }
  }, [location.search, applyUserGeolocationFromLocateFlow]);

  const runDirectCoachMapGeolocation = useCallback(
    meta => {
      setGeolocationErrorCode(null);
      debugCoachMapLocate('CURRENT LOCATION CLICKED', meta);
      logCoachMapLocateVerbose('CURRENT LOCATION CLICKED', meta);
      ignoreLocateUrlEffectOnceRef.current = true;
      logCoachMapLocateVerbose('mapRef ready?', {
        note: 'CoachMap3D applies flyTo when flyToTarget updates',
        ...meta,
      });
      if (typeof window === 'undefined' || !navigator?.geolocation?.getCurrentPosition) {
        debugCoachMapLocate('requesting geolocation', { error: 'API unavailable', ...meta });
        logCoachMapLocateVerbose('requesting geolocation', { error: 'API unavailable', ...meta });
        setGeolocationErrorCode(-1);
        return;
      }
      debugCoachMapLocate('requesting geolocation', { branch: 'direct user gesture', ...meta });
      logCoachMapLocateVerbose('requesting geolocation', { ...meta, branch: 'direct user gesture' });
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos?.coords?.latitude;
          const lng = pos?.coords?.longitude;
          debugCoachMapLocate('geo success lat/lng', { lat, lng, ...meta });
          logCoachMapLocateVerbose('geo success lat/lng', { lat, lng, ...meta });
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            applyUserGeolocationFromLocateFlow(lat, lng, meta);
            debugCoachMapLocate('setUserLocation applied via applyUserGeolocationFromLocateFlow', {
              lat,
              lng,
            });
          } else {
            debugCoachMapLocate('geo success but lat/lng not finite', { lat, lng });
            setGeolocationErrorCode(2);
          }
        },
        err => {
          debugCoachMapLocate('geo error', {
            code: err?.code,
            message: err?.message,
            ...meta,
          });
          logCoachMapLocateVerbose('geo error', {
            code: err?.code,
            message: err?.message,
            ...meta,
          });
          setGeolocationErrorCode(typeof err?.code === 'number' ? err.code : -2);
          if (typeof window !== 'undefined' && parseCoachExploreSearch(window.location.search).locate) {
            const stripped = stripCoachMapLocateParamsFromSearch(window.location.search);
            history.replace(`${window.location.pathname}${stripped}`);
          }
        },
        // iOS/Android: high accuracy often times out or never resolves; match
        // the locate-URL effect (so Current location matches landing behaviour).
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 0 }
      );
    },
    [applyUserGeolocationFromLocateFlow, history]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onDirect = () => runDirectCoachMapGeolocation({ source: 'TopbarSearchForm' });
    window.addEventListener(COACH_MAP_DIRECT_GEO_EVENT, onDirect);
    return () => window.removeEventListener(COACH_MAP_DIRECT_GEO_EVENT, onDirect);
  }, [runDirectCoachMapGeolocation]);

  useEffect(() => {
    if (!userLocation) return;
    if (!Number.isFinite(userLocation.lat) || !Number.isFinite(userLocation.lng)) return;
    debugCoachMapLocate('CoachMapPage → CoachMap3D userLocation prop', {
      lat: userLocation.lat,
      lng: userLocation.lng,
    });
  }, [userLocation]);

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
    if (queryExplore.locate) return;
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
    const meetingPointId = queryExplore.meetingPointId;
    if (meetingPointId) {
      const points = coachPreferredMeetingPointsList(target.author);
      const mp = points.find(p => p.id === meetingPointId);
      if (mp?.lat != null && mp?.lng != null) {
        setFlyToTarget({ lat: mp.lat, lng: mp.lng, ts: Date.now() });
        return;
      }
    }
    if (coords) {
      setFlyToTarget({ lat: coords.lat, lng: coords.lng, ts: Date.now() });
    }
  }, [queryExplore.coachId, queryExplore.meetingPointId, queryExplore.locate, coaches]);

  // Geolocation: `?locate=1` (landing "Find a coach") requests a fresh fix
  // (`maximumAge: 0`) even when `?sport=` is present. Implemented in a
  // dedicated effect with a StrictMode-safe `cancelled` flag — the old
  // `locateIntentGeoStartedRef` guard could skip the second mount's
  // `getCurrentPosition` call entirely after a strict unmount. Plain
  // `/coach-map` visits use the softer cached read in a separate effect.
  const geolocationSoftRequestedRef = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator?.geolocation?.getCurrentPosition) return;

    const parsed = parseCoachExploreSearch(location.search);
    if (!parsed.locate) return;

    const explicitUserGeo =
      parsed.userLat != null &&
      parsed.userLng != null &&
      Number.isFinite(parsed.userLat) &&
      Number.isFinite(parsed.userLng);

    debugCoachMapLocate('geolocation effect (locate URL)', {
      locate: parsed.locate,
      explicitUserGeo,
      hasApi: !!navigator?.geolocation?.getCurrentPosition,
    });

    if (explicitUserGeo) return;

    const locateNonce =
      new URLSearchParams(location.search.replace(/^\?/, '')).get('_locatenonce') || '';

    if (
      parsed.locate &&
      userLocation &&
      locateNonce &&
      locateIntentNonceResolvedRef.current === locateNonce
    ) {
      logCoachMapLocateVerbose(
        'locate URL effect skipped (same _locatenonce; userLocation already set — sport or other params changed)',
        { locateNonce }
      );
      debugCoachMapLocate('geolocation effect (locate URL): skipped — same locate session', {
        locateNonce,
      });
      return;
    }

    const onPrimedEvent = () => {
      tryConsumePrimedLandingGeo();
    };
    window.addEventListener(COACH_MAP_APPLY_PRIMED_GEO_EVENT, onPrimedEvent);

    const removePrimedListener = () => {
      window.removeEventListener(COACH_MAP_APPLY_PRIMED_GEO_EVENT, onPrimedEvent);
    };

    if (tryConsumePrimedLandingGeo()) {
      return removePrimedListener;
    }

    if (ignoreLocateUrlEffectOnceRef.current) {
      ignoreLocateUrlEffectOnceRef.current = false;
      logCoachMapLocateVerbose('locate URL geolocation effect skipped (direct tap already invoked getCurrentPosition)', {
        search: location.search,
      });
      debugCoachMapLocate('geolocation effect (locate URL): skipped — direct handler owns this gesture', {
        search: location.search,
      });
      return removePrimedListener;
    }

    let cancelled = false;
    logCoachMapLocateVerbose('requesting geolocation', { branch: 'locate-url-effect' });
    debugCoachMapLocate('requesting geolocation', { branch: 'locate-url-effect', maximumAge: 0 });
    debugCoachMapLocate('requesting geolocation (locate intent, fresh fix)', {
      maximumAge: 0,
    });
    navigator.geolocation.getCurrentPosition(
      pos => {
        if (cancelled) return;
        const qs = typeof window !== 'undefined' ? window.location.search : '';
        const nonceNow = new URLSearchParams(qs.replace(/^\?/, '')).get('_locatenonce') || '';
        if (nonceNow && locateIntentNonceResolvedRef.current === nonceNow) {
          logCoachMapLocateVerbose('locate URL geo callback skipped (nonce already resolved)', {
            nonceNow,
          });
          return;
        }
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        logCoachMapLocateVerbose('geo success lat/lng', { lat, lng, branch: 'locate-url-effect' });
        debugCoachMapLocate('geo success', { lat, lng });
        debugCoachMapLocate('geolocation success (locate intent)', { lat, lng });
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          applyUserGeolocationFromLocateFlow(lat, lng, { branch: 'locate-url-effect' });
        }
      },
      err => {
        if (cancelled) return;
        logCoachMapLocateVerbose('geo error', { code: err?.code, message: err?.message });
        debugCoachMapLocate('geo error', { code: err?.code, message: err?.message });
        debugCoachMapLocate('geolocation error (locate intent)', {
          code: err?.code,
          message: err?.message,
        });
        setGeolocationErrorCode(typeof err?.code === 'number' ? err.code : -2);
        const stripped = stripCoachMapLocateParamsFromSearch(location.search);
        history.replace(`${location.pathname}${stripped}`);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
    );

    return () => {
      cancelled = true;
      removePrimedListener();
    };
  }, [
    location.pathname,
    location.search,
    history,
    userLocation,
    tryConsumePrimedLandingGeo,
    applyUserGeolocationFromLocateFlow,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!navigator?.geolocation?.getCurrentPosition) return;

    const parsed = parseCoachExploreSearch(location.search);
    if (parsed.locate) return;

    debugCoachMapLocate('geolocation effect (non-locate URL)', {
      locate: parsed.locate,
      hasApi: !!navigator?.geolocation?.getCurrentPosition,
    });

    if (geolocationSoftRequestedRef.current) return;
    geolocationSoftRequestedRef.current = true;
    debugCoachMapLocate('requesting geolocation', { branch: 'soft-url-effect' });
    debugCoachMapLocate('requesting geolocation (soft / cached-friendly)', {});
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos?.coords?.latitude;
        const lng = pos?.coords?.longitude;
        debugCoachMapLocate('geo success', { lat, lng, branch: 'soft' });
        debugCoachMapLocate('geolocation success (soft)', { lat, lng });
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          debugCoachMapLocate('setting userLocation', { lat, lng, branch: 'soft' });
          setUserLocation({ lat, lng });
        }
      },
      err => {
        debugCoachMapLocate('geo error', { code: err?.code, message: err?.message, branch: 'soft' });
        debugCoachMapLocate('geolocation error (soft)', {
          code: err?.code,
          message: err?.message,
        });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  }, [location.search]);

  // Auto-centre on the user once geolocation resolves, but only when no
  // higher-priority focus is implied by the URL. Order of precedence:
  //   – `?coachId=…` (deep-link from a Coach Profile) wins.
  //   – `?lat=&lng=` (user already provided an explicit location) wins.
  //   – `?sport=…` (active SportBar filter) wins — unless `?locate=1`
  //     explicitly requests centring on the user (landing CTA).
  // With none of the above (a clean visit to /coach-map) we fly to the
  // user. The ref guards so we only consume the resolved position once
  // per session — subsequent filter changes still refit to the filtered
  // coach set via the bounds-driven `fitBounds` effect inside CoachMap3D.
  const flyToUserLocationConsumedRef = useRef(false);
  const flyToExplicitLocationConsumedRef = useRef(false);

  useEffect(() => {
    if (parseCoachExploreSearch(location.search).locate) {
      flyToUserLocationConsumedRef.current = false;
      debugCoachMapLocate('locate in URL: reset flyToUserLocation consumed gate', {
        search: location.search,
      });
    }
    flyToExplicitLocationConsumedRef.current = false;
  }, [location.search]);

  useEffect(() => {
    if (queryExplore.locate) {
      return;
    }
    if (flyToUserLocationConsumedRef.current) return;
    if (!userLocation) return;
    if (queryExplore.coachId) {
      debugCoachMapLocate('flyTo user: blocked (coachId)', { coachId: queryExplore.coachId });
      return;
    }
    if (queryExplore.userLat != null || queryExplore.userLng != null) {
      debugCoachMapLocate('flyTo user: blocked (explicit lat/lng in URL)', {
        userLat: queryExplore.userLat,
        userLng: queryExplore.userLng,
      });
      return;
    }
    if (queryExplore.sportKey && !queryExplore.locate) {
      debugCoachMapLocate('flyTo user: blocked (sport filter, no locate)', {
        sportKey: queryExplore.sportKey,
      });
      return;
    }

    debugCoachMapLocate('flyTo user location', {
      lat: userLocation.lat,
      lng: userLocation.lng,
      locate: queryExplore.locate,
      sportKey: queryExplore.sportKey || null,
    });
    debugCoachMapLocate('flyTo user: setFlyToTarget', {
      lat: userLocation.lat,
      lng: userLocation.lng,
      locate: queryExplore.locate,
      sportKey: queryExplore.sportKey || null,
    });
    flyToUserLocationConsumedRef.current = true;
    setFlyToTarget({
      lat: userLocation.lat,
      lng: userLocation.lng,
      ts: Date.now(),
    });
  }, [
    userLocation,
    queryExplore.locate,
    queryExplore.coachId,
    queryExplore.userLat,
    queryExplore.userLng,
    queryExplore.sportKey,
  ]);

  const explicitLocationReference = useMemo(() => {
    if (
      queryExplore.userLat != null &&
      queryExplore.userLng != null &&
      Number.isFinite(queryExplore.userLat) &&
      Number.isFinite(queryExplore.userLng)
    ) {
      return { lat: queryExplore.userLat, lng: queryExplore.userLng };
    }
    return null;
  }, [queryExplore.userLat, queryExplore.userLng]);

  const isExplicitLocationSearch = useMemo(
    () =>
      explicitLocationReference &&
      String(queryExplore.locationLabel || '').trim().length > 0,
    [explicitLocationReference, queryExplore.locationLabel]
  );

  useEffect(() => {
    if (!isExplicitLocationSearch) return;
    if (queryExplore.locate) return;
    if (queryExplore.coachId) return;
    if (flyToExplicitLocationConsumedRef.current) return;

    flyToExplicitLocationConsumedRef.current = true;
    const { lat, lng } = explicitLocationReference;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    debugCoachMapLocate('flyTo explicit location search', {
      lat,
      lng,
      locationLabel: queryExplore.locationLabel,
    });
    setFlyToTarget({
      lat,
      lng,
      ts: Date.now(),
      zoom: 12.5,
      pitch: 65,
      bearing: -34,
      duration: 1400,
    });
  }, [
    explicitLocationReference,
    isExplicitLocationSearch,
    queryExplore.coachId,
    queryExplore.locate,
    queryExplore.locationLabel,
  ]);

  // Explicit searched location coordinates win over browser geolocation.
  const geoReference = useMemo(() => {
    if (explicitLocationReference) return explicitLocationReference;
    if (
      userLocation &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng)
    ) {
      return { lat: userLocation.lat, lng: userLocation.lng };
    }
    return null;
  }, [explicitLocationReference, userLocation]);

  const entityFilter = queryExplore.entityFilter || 'all';

  const filteredCoaches = useMemo(() => {
    if (!matchesEntityFilter(entityFilter, 'coach')) {
      return [];
    }
    const bySport = filterCoachesBySport(coaches, selectedSport);
    if (!geoReference) return bySport;
    const refLat = geoReference.lat;
    const refLng = geoReference.lng;
    return [...bySport].sort((a, b) => {
      const ca = getCoachCoordinates(a);
      const cb = getCoachCoordinates(b);
      const daKm = ca ? haversineDistanceKm(refLat, refLng, ca.lat, ca.lng) : null;
      const dbKm = cb ? haversineDistanceKm(refLat, refLng, cb.lat, cb.lng) : null;
      const da = daKm == null || !Number.isFinite(daKm) ? Infinity : daKm;
      const db = dbKm == null || !Number.isFinite(dbKm) ? Infinity : dbKm;
      if (da !== db) return da - db;
      return String(a.authorUuid || '').localeCompare(String(b.authorUuid || ''));
    });
  }, [coaches, selectedSport, geoReference, entityFilter]);

  const filteredTeams = useMemo(() => {
    if (!matchesEntityFilter(entityFilter, 'team')) {
      return [];
    }
    const bySport = filterTeamsBySport(realTeams, selectedSport);
    if (!geoReference) return bySport;
    const refLat = geoReference.lat;
    const refLng = geoReference.lng;
    return [...bySport].sort((a, b) => {
      const ca = getTeamCoordinates(a);
      const cb = getTeamCoordinates(b);
      const daKm = ca ? haversineDistanceKm(refLat, refLng, ca.lat, ca.lng) : null;
      const dbKm = cb ? haversineDistanceKm(refLat, refLng, cb.lat, cb.lng) : null;
      const da = daKm == null || !Number.isFinite(daKm) ? Infinity : daKm;
      const db = dbKm == null || !Number.isFinite(dbKm) ? Infinity : dbKm;
      if (da !== db) return da - db;
      return String(a.authorUuid || '').localeCompare(String(b.authorUuid || ''));
    });
  }, [realTeams, selectedSport, geoReference, entityFilter]);

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
  // across continents) AND we have an anchor reference (searched location
  // coords or user geolocation), we replace them with bounds derived from
  // coaches within `USER_REGION_CLIP_KM` of that anchor. The faraway coach
  // markers are still rendered — only the camera is regionalized.
  // Clicking a faraway marker still fires `flyTo` to that coach via
  // `handleMarkerClick` / `handleMapClick`.
  //
  // This guard is fail-soft: if the anchor ref is unknown OR no coach
  // falls within the radius, we keep the original `filteredBoundsPlain`
  // (so under normal data conditions — i.e. with the F2 demo cleanup —
  // this branch is essentially never reached).
  const safeFilteredBoundsPlain = useMemo(() => {
    if (!isWideBounds(filteredBoundsPlain)) return filteredBoundsPlain;
    if (!geoReference) return filteredBoundsPlain;
    const clipped = computeBoundsForCoachesNear(
      filteredCoaches,
      geoReference.lat,
      geoReference.lng,
      USER_REGION_CLIP_KM
    );
    return clipped || filteredBoundsPlain;
  }, [filteredBoundsPlain, filteredCoaches, geoReference]);

  const isSportFilterActive = !!selectedSport;

  // Coaches with map coords + distance from anchor (`userLocation` or `?lat=&lng=`).
  // `filteredCoaches` is already distance-sorted when `geoReference` is set.
  const shouldUseAnchoredGeo = isSportFilterActive || explicitLocationReference;

  const geoAnchoredCoachDistances = useMemo(() => {
    if (!shouldUseAnchoredGeo || !geoReference) return [];
    const refLat = geoReference.lat;
    const refLng = geoReference.lng;
    const out = [];
    for (const c of filteredCoaches) {
      const coords = getCoachCoordinates(c);
      if (!coords) continue;
      const km = haversineDistanceKm(refLat, refLng, coords.lat, coords.lng);
      if (!Number.isFinite(km)) continue;
      out.push({ coach: c, km });
    }
    return out;
  }, [shouldUseAnchoredGeo, geoReference, filteredCoaches]);

  const nearbyCoachRowsForMap = useMemo(
    () => geoAnchoredCoachDistances.filter(x => x.km <= NEARBY_COACH_RADIUS_KM).map(x => x.coach),
    [geoAnchoredCoachDistances]
  );

  const sportMapFitCoachRows = useMemo(() => {
    if (!shouldUseAnchoredGeo || !geoReference) return [];
    if (nearbyCoachRowsForMap.length > 0) return nearbyCoachRowsForMap;
    return geoAnchoredCoachDistances.slice(0, MAP_FIT_DISTANT_COACH_COUNT).map(x => x.coach);
  }, [shouldUseAnchoredGeo, geoReference, nearbyCoachRowsForMap, geoAnchoredCoachDistances]);

  const showNoNearbyCoachesNotice = useMemo(
    () =>
      isSportFilterActive &&
      !!geoReference &&
      fetchStatus !== 'loading' &&
      geoAnchoredCoachDistances.length > 0 &&
      nearbyCoachRowsForMap.length === 0,
    [
      isSportFilterActive,
      geoReference,
      fetchStatus,
      geoAnchoredCoachDistances.length,
      nearbyCoachRowsForMap.length,
    ]
  );

  // With a map anchor (searched location or sport filter + geo anchor): fit
  // only nearby coaches (+ anchor), or if none nearby the nearest few
  // worldwide for the current anchor — never all filtered rows.
  const sportUserAnchoredMapBounds = useMemo(() => {
    if (!shouldUseAnchoredGeo || !geoReference) {
      return null;
    }
    const refLat = geoReference.lat;
    const refLng = geoReference.lng;
    const fromCoaches = computePlainBoundsFromCoachRows(sportMapFitCoachRows);
    if (fromCoaches) {
      return unionPlainBoundsWithPoint(fromCoaches, refLat, refLng);
    }
    const p = USER_ANCHOR_ONLY_BOUNDS_PAD_DEG;
    return {
      swLat: refLat - p,
      swLng: refLng - p,
      neLat: refLat + p,
      neLng: refLng + p,
    };
  }, [shouldUseAnchoredGeo, geoReference, sportMapFitCoachRows]);

  // Bounds resolution rules:
  //  – No sport filter: `safeFilteredBoundsPlain` (F1a-clipped) or Redux
  //    `boundsPlain` on first paint.
  //  – Sport filter + geo reference: `sportUserAnchoredMapBounds` — within
  //    `NEARBY_COACH_RADIUS_KM` fit user + all nearby filtered coaches; if none
  //    nearby, fit user + nearest `MAP_FIT_DISTANT_COACH_COUNT` only (never all
  //    worldwide filtered markers).
  //  – Sport filter + no geo: `safeFilteredBoundsPlain` (legacy: full filtered
  //    envelope, F1a still clips when `userLocation` exists and bounds are wide).
  //  – Empty filtered set with sport + geo: small pad around user (still not
  //    global bounds).
  const effectiveBoundsPlain = useMemo(() => {
    if (!isSportFilterActive && !explicitLocationReference) {
      return safeFilteredBoundsPlain || boundsPlain || null;
    }
    if (geoReference) {
      return sportUserAnchoredMapBounds;
    }
    return safeFilteredBoundsPlain;
  }, [
    isSportFilterActive,
    explicitLocationReference,
    geoReference,
    sportUserAnchoredMapBounds,
    safeFilteredBoundsPlain,
    boundsPlain,
  ]);

  const center = useMemo(() => {
    if (effectiveBoundsPlain) {
      return {
        lat: (effectiveBoundsPlain.neLat + effectiveBoundsPlain.swLat) / 2,
        lng: (effectiveBoundsPlain.neLng + effectiveBoundsPlain.swLng) / 2,
      };
    }
    if (explicitLocationReference) {
      return explicitLocationReference;
    }
    return null;
  }, [effectiveBoundsPlain, explicitLocationReference]);

  // After `?locate=1` resolves to a real user fix, stop driving the camera with
  // `fitBounds` on coach envelopes — a late Redux/coach update refits bounds
  // and would override the flyTo to the user.
  const mapFitBoundsPlain = useMemo(
    () => (queryExplore.locate ? null : effectiveBoundsPlain),
    [queryExplore.locate, effectiveBoundsPlain]
  );

  useEffect(() => {
    if (queryExplore.locate && mapFitBoundsPlain == null) {
      logCoachMapLocateVerbose('default fitBounds skipped because locate intent active', {
        hadEffectiveBounds: !!effectiveBoundsPlain,
      });
    }
  }, [queryExplore.locate, mapFitBoundsPlain, effectiveBoundsPlain]);

  const onRetry = useCallback(() => {
    dispatch(fetchCoachesExploreThunk({ config }));
  }, [config, dispatch]);

  const [hoveredAuthorUuid, setHoveredAuthorUuid] = useState(null);

  const handleMarkerHover = useCallback((entity, isHovering) => {
    setHoveredAuthorUuid(isHovering ? entity?.authorUuid || null : null);
    setActiveListingId(isHovering ? entity?.representativeListing?.id || null : null);
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
  const handleMapClick = useCallback(entity => {
    if (!entity) return;
    const coords =
      entity.entityType === 'team' ? getTeamCoordinates(entity) : getCoachCoordinates(entity);
    setSelectedCoachKey(entity.authorUuid || null);
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
    const stillVisible =
      filteredCoaches.some(c => c.authorUuid === selectedCoachKey) ||
      filteredTeams.some(t => t.authorUuid === selectedCoachKey);
    if (!stillVisible) {
      setSelectedCoachKey(null);
      setActiveListingId(null);
    }
  }, [filteredCoaches, filteredTeams, selectedCoachKey]);

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

  // `parse` / `stringify` keep every existing query key (locate, _locatenonce, coachId, …).
  // Sport filter only touches `sport` — map camera stays driven by locate / Current location.
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

  const handleCurrentLocationToolbarClick = useCallback(() => {
    debugCoachMapLocate('current location clicked', { source: 'CoachMapPage.sidebar' });
    runDirectCoachMapGeolocation({ source: 'CoachMapPage.sidebar' });
    const nextSearch = coachMapSearchForFreshGeolocationIntent(location.search);
    history.push(`${location.pathname}${nextSearch}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COACH_MAP_SCROLL_PANEL_EVENT));
    }
  }, [history, location.pathname, location.search, runDirectCoachMapGeolocation]);

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
            <div
              className={css.mobileCoachMapSportBar}
              role="region"
              aria-label={intl.formatMessage({ id: 'CoachMapPage.mobileSportBarA11y' })}
            >
              <SportBar
                variant="coachMapMobileRail"
                value={selectedSport}
                onChange={handleSportBarChange}
                allLabel={intl.formatMessage({ id: 'CoachMapPage.sportAll' })}
                disciplines={coachMapDisciplines}
                inTopbar={false}
              />
            </div>
            <div className={css.sidebarLocationRow}>
              <button
                type="button"
                className={css.currentLocationButton}
                onClick={handleCurrentLocationToolbarClick}
              >
                <FormattedMessage
                  id="CoachMapPage.currentLocation"
                  defaultMessage="Current location"
                />
              </button>
            </div>
            {geolocationErrorCode != null ? (
              <div className={css.sidebarGeoError} role="alert">
                <FormattedMessage
                  id={
                    geolocationErrorCode === 1
                      ? 'CoachMapPage.geolocationErrorPermission'
                      : geolocationErrorCode === 3
                        ? 'CoachMapPage.geolocationErrorTimeout'
                        : geolocationErrorCode === 2
                          ? 'CoachMapPage.geolocationErrorUnavailable'
                          : geolocationErrorCode === -1
                            ? 'CoachMapPage.geolocationErrorUnavailableApi'
                            : 'CoachMapPage.geolocationErrorGeneric'
                  }
                />
              </div>
            ) : null}
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
          ) : filteredCoaches.length === 0 && filteredTeams.length === 0 ? (
            <p className={css.status}>
              <FormattedMessage
                id={isSportFilterActive ? 'CoachDirectory.noResults' : 'CoachesPage.empty'}
              />
            </p>
          ) : (
            <>
              <div className={css.entityFilter} role="tablist" aria-label="Entity filter">
                {['all', 'coaches', 'teams'].map(value => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={entityFilter === value}
                    className={classNames(
                      css.entityFilterBtn,
                      entityFilter === value && css.entityFilterBtnActive
                    )}
                    onClick={() => {
                      const params = parse(location.search);
                      const next = { ...params, entity: value === 'all' ? undefined : value };
                      if (value === 'all') delete next.entity;
                      history.push({ search: stringify(next) });
                    }}
                  >
                    <FormattedMessage id={`CoachMapPage.entity.${value}`} />
                  </button>
                ))}
              </div>
              {showNoNearbyCoachesNotice ? (
                <p className={css.proximityNotice} role="status">
                  <FormattedMessage
                    id="CoachMapPage.noNearbyCoachesForSport"
                    values={{
                      sport:
                        headlineSportPhrase ||
                        formatCoachExploreSportSlug(selectedSport),
                    }}
                  />
                </p>
              ) : null}
              <div className={css.sidebarList}>
                {filteredTeams.length > 0 ? (
                  <section className={css.sidebarSection}>
                    <h2 className={css.sidebarSectionTitle}>
                      <FormattedMessage id="CoachMapPage.teamsSection" />
                    </h2>
                    {filteredTeams.map(team => (
                      <TeamCard
                        key={team.authorUuid}
                        team={team}
                        className={css.sidebarCoachCard}
                        isSelected={selectedCoachKey === team.authorUuid}
                        onMouseEnter={() => setHoveredAuthorUuid(team.authorUuid)}
                        onMouseLeave={() => setHoveredAuthorUuid(null)}
                        onMapClick={handleMapClick}
                        onSelect={() => {
                          setSelectedCoachKey(team.authorUuid);
                          setActiveListingId(team.representativeListing?.id || null);
                        }}
                      />
                    ))}
                  </section>
                ) : null}
                {filteredCoaches.length > 0 ? (
                  <section className={css.sidebarSection}>
                    {filteredTeams.length > 0 ? (
                      <h2 className={css.sidebarSectionTitle}>
                        <FormattedMessage id="CoachMapPage.coachesSection" />
                      </h2>
                    ) : null}
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
                  </section>
                ) : null}
              </div>
            </>
          )}
        </aside>

        <div className={css.mapPanel} ref={mapPanelRef}>
          <CoachMap3D
            coaches={filteredCoaches}
            teams={filteredTeams}
            className={css.mapSurface}
            activeListingId={activeListingId}
            selectedListingId={selectedListingId}
            selectedAuthorUuid={selectedCoachKey}
            hoveredAuthorUuid={hoveredAuthorUuid}
            selectedSport={selectedSport}
            flyToTarget={flyToTarget}
            bounds={mapFitBoundsPlain}
            center={queryExplore.locate ? null : center}
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
