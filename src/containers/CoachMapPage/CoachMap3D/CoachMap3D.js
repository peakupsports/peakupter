import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

import { getCoachCoordinates } from '../../../util/profileCoachSticker';
import { getTeamCoordinates } from '../../../util/peakupTeam';
import { pickPrimaryTierId, getTierColors } from '../../../util/coachTier';
import {
  debugCoachMapLocate,
  logCoachMapLocateVerbose,
  normalizeSportKey,
  selectedSportToFilterHyphen,
} from '../../../util/coachExplore';
import { matchSportFilterKeys } from '../../../util/sportFilterKeys';

import CoachMapPopup from './CoachMapPopup';
import TeamMapPopup from './TeamMapPopup';
import css from './CoachMap3D.module.css';

// Satellite + minimal vector overlay: soft premium daytime via fog/sky + light
// CSS grade on the canvas (markers/popup sit outside canvas and stay vivid).
const COACH_MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12';

const INITIAL_CAMERA_PITCH = 76;
const INITIAL_CAMERA_BEARING = -31;
const INITIAL_MAP_ZOOM = 4.35;
const BOUNDS_CAMERA_PITCH = 65;
const BOUNDS_CAMERA_BEARING = -34;
const INITIAL_CAMERA_DURATION_MS = 1900;
const STANDARD_BOUNDS_DURATION_MS = 900;
const USER_LOCATION_FLYTO_PITCH = 67;
const USER_LOCATION_FLYTO_BEARING = -34;
const USER_LOCATION_FLYTO_DURATION_MS = 2000;
const USER_LOCATION_FLYTO_ZOOM = 12.1;
const COACH_FLYTO_PITCH = 62;
const COACH_FLYTO_BEARING = -34;
const COACH_FLYTO_DURATION_MS = 1100;
const COACH_FLYTO_ZOOM = 14;

const cinematicCameraEasing = t => 1 - Math.pow(1 - t, 2.35);

// Match the desktop / mobile breakpoint used elsewhere (`--viewportMedium`,
// 768px): slightly gentler DEM / sky on narrow viewports; fog stays on.
const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 767px)').matches;

/**
 * Globe: atmosphere comes from fog. The style-spec `sky` layer is not reliably
 * used on globe projection; keep sky only as a Mercator fallback.
 *
 * @param {object} map
 * @returns {boolean}
 */
const projectionIsGlobe = map => {
  if (!map || typeof map.getProjection !== 'function') return false;
  const p = map.getProjection();
  if (p === 'globe') return true;
  if (p && typeof p === 'object') {
    const n = String(p.name || '').toLowerCase();
    return n === 'globe';
  }
  return false;
};

/**
 * Label legibility on satellite + soft daytime grade. Markers unaffected (DOM
 * above canvas).
 *
 * @param {object} map
 */
const applyPeakUpSatelliteLabelPass = map => {
  if (!map?.getStyle) return;
  const layers = map.getStyle().layers || [];

  layers.forEach(layer => {
    const { id, type } = layer;
    if (!id) return;

    try {
      if (type === 'symbol' && layer.layout?.['text-field']) {
        map.setPaintProperty(id, 'text-color', '#1e2a3a');
        map.setPaintProperty(id, 'text-halo-color', 'rgba(255, 255, 255, 0.88)');
        map.setPaintProperty(id, 'text-halo-width', 1.45);
        map.setPaintProperty(id, 'text-halo-blur', 0.35);
      }
    } catch (e) {
      // noop
    }
  });
};

/**
 * Premium daytime visuals: DEM drape + fog (globe) + optional sky (Mercator)
 * + global light. Does not touch markers, popups, or camera API.
 *
 * @param {object} map mapboxgl.Map instance after style.load
 */
const installCoachMapPremiumVisuals = map => {
  if (!map) return;
  const mobile = isMobileViewport();

  if (typeof map.setTerrain === 'function') {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: mobile ? 1.08 : 1.22,
    });
  }

  // No extra hillshade on satellite — it muddles imagery; DEM + fog carry depth.

  const onGlobe = projectionIsGlobe(map);

  // Non-globe only: soft daytime sky dome (globe uses fog + light CSS grade).
  if (!onGlobe && !map.getLayer('peakup-sky')) {
    try {
      map.addLayer({
        id: 'peakup-sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [168.0, 42.0],
          'sky-atmosphere-sun-intensity': mobile ? 8 : 11,
          'sky-atmosphere-color': 'rgba(255, 255, 255, 0.92)',
          'sky-atmosphere-halo-color': 'rgba(255, 248, 235, 0.55)',
        },
      });
    } catch (e) {
      // Older GL builds: skip sky.
    }
  }

  if (typeof map.setFog === 'function') {
    map.setFog({
      range: mobile ? [0.5, 10.5] : [0.45, 12.5],
      color: '#dce8f4',
      'high-color': '#a8c8e8',
      'horizon-blend': mobile ? 0.22 : 0.28,
      'space-color': '#c5daf0',
      'star-intensity': 0.0,
    });
  }

  if (typeof map.setLight === 'function') {
    map.setLight({
      anchor: 'map',
      color: '#fff6eb',
      intensity: mobile ? 0.38 : 0.48,
      position: [1.15, 145, 48],
    });
  }

  applyPeakUpSatelliteLabelPass(map);
};

// Anti-stacking ("spiderfy") config. When 2+ coaches share the same
// fingerprint (`toFixed(4)` ≈ 11m bucket on lat/lng), we keep the
// first marker on its real coordinates and spread the rest on a tight
// ring around it. The fingerprint width is intentionally tight so
// coaches at genuinely distinct addresses never get clustered, while
// still catching "same building / same parking lot" cases that fall
// just outside an exact-coordinate match (e.g. one coach uses the
// listing geolocation, another falls back to the configured city slug).
//
// The radius is chosen as a compromise between "subtle so the location
// still feels accurate" and "visibly separated at typical exploration
// zoom (12–15)":
//   – ring 1, ring radius 0.002° → ~220m lat / ~150m lng at lat 46°.
//     At zoom 14 (typical zoom-in to a city) that's ~33px — clearly
//     bigger than the marker's 38px disc but still tight enough to
//     read as "same place".
//   – ring 2+ scales the radius linearly so groups of 7+ stay legible.
// Each coach gets a deterministic slot via a stable sort on
// `authorUuid` inside the cluster, so offsets never jiggle between
// renders even if Redux returns coaches in a different order.
const SPIDERFY_FINGERPRINT_DECIMALS = 4;
const SPIDERFY_RING_RADIUS_DEG = 0.002;
const SPIDERFY_SLOTS_PER_RING = 6;

// Same emoji table used by SportBar – kept here as a local map so this
// component does not pull cross-feature deps just for marker glyphs.
// Keys MUST mirror `SPORT_EMOJI` in `src/components/SportBar/SportBar.js`
// and `PROFILE_SPORT_EMOJI` in `src/util/profileCoachSticker.js`.
const SPORT_EMOJI = {
  surf: '🏄',
  mtb: '🚵',
  tennis: '🎾',
  golf: '⛳️',
  climbing: '🧗',
  yoga: '🧘',
  skydive: '🪂',
  fitness: '💪',
  wakeboard: '🏄',
  kitesurf: '🪁',
  skateboard: '🛹',
  skate: '🛹',
  snowboard: '🏂',
  ski: '🎿',
  crosscountry: '🎿',
  skitouring: '🎿',
  splittouring: '🏂',
  freerideskiing: '🎿',
  freeridesnowboard: '🏂',
  freestylesnowboard: '🏂',
  freestyleskiing: '🎿',
};

/**
 * Pick the emoji glyph rendered inside the coach's map marker.
 *
 * When a sport filter is active (the user is exploring `/coach-map?sport=mtb`,
 * for example), the marker should reflect the sport currently being explored
 * instead of the coach's primary/default sport. Concretely:
 *   – Filter "MTB" → all markers in the filtered set show 🚵, even for a
 *     coach whose primary sport is Ski (Dani teaches both, the filter is
 *     why he's on the map at all).
 *   – Filter "Snowboard" → 🏂 for every coach in view, regardless of which
 *     snowboard variant they actually teach.
 *   – No filter (or coach has no sport in the active filter set, which the
 *     filter pipeline shouldn't allow but we keep a defensive fallback) →
 *     fall back to the coach's first declared sport key (current behavior).
 *
 * The matching is done against the *normalised* sport key set so the marker
 * stays accurate regardless of whether the listing publicData stores a
 * filter parent (`snowboard`) or one of its variants
 * (`freerideSnowboard`, `splitTouring`, etc.) — this mirrors how
 * `filterCoachesBySport` decides who shows up on the map in the first place.
 *
 * @param {Object} coach aggregated coach row (with `sportKeys`)
 * @param {Set<string>|null} activeFilterKeys normalised sport keys allowed by
 *   the current SportBar filter; pass `null` when no filter is active
 * @returns {string} a single emoji character (or 📍 fallback)
 */
const dominantEmoji = (coach, activeFilterKeys) => {
  const sportKeys = coach?.sportKeys || [];
  if (activeFilterKeys && activeFilterKeys.size > 0) {
    for (const sk of sportKeys) {
      const k = normalizeSportKey(sk);
      if (k && activeFilterKeys.has(k) && SPORT_EMOJI[k]) {
        return SPORT_EMOJI[k];
      }
    }
  }
  const sport = sportKeys[0];
  const key = normalizeSportKey(sport);
  return SPORT_EMOJI[key] || '📍';
};

/**
 * Build the Set of normalised sport keys allowed by the current SportBar
 * value, mirroring the expansion done by `filterCoachesBySport`. Returns
 * `null` when no filter is active so consumers can short-circuit cheaply.
 *
 * @param {string} selectedSport raw SportBar value ('' / 'mtb' / 'snowboard'…)
 * @returns {Set<string>|null}
 */
const buildActiveFilterKeySet = selectedSport => {
  const v = selectedSportToFilterHyphen(selectedSport);
  if (!v) return null;
  return new Set(matchSportFilterKeys(v).map(normalizeSportKey));
};

const isMapboxAvailable = () =>
  typeof window !== 'undefined' && !!window.mapboxgl && !!window.mapboxgl.accessToken;

/**
 * 3D Mapbox map for the Coach map page.
 * - `pitch` + `fill-extrusion` building layer for a "3D" feel.
 * - Custom emoji markers per coach, synced with `activeListingId` (hover) and
 *   `selectedListingId` (persistent click) for marker highlight.
 * - Auto-fits to provided plain `bounds` on changes.
 * - When `flyToTarget` changes, animates the camera to that coordinate.
 *
 * @param {Object} props
 * @param {Array}  props.coaches             Aggregated coach rows (with representativeListing).
 * @param {Object} [props.activeListingId]   Sharetribe SDK UUID of the hovered listing.
 * @param {Object} [props.selectedListingId] Sharetribe SDK UUID of the selected listing (persistent).
 * @param {string} [props.selectedAuthorUuid] Selected coach or team author UUID (persistent highlight).
 * @param {string} [props.hoveredAuthorUuid] Hovered coach or team author UUID.
 * @param {string} [props.selectedSport]     Raw SportBar value ('' / 'mtb' / 'snowboard' / …).
 *                                           When set, marker glyphs switch to the filtered sport
 *                                           so the map feels context-aware (a coach who teaches
 *                                           both Ski and MTB shows 🚵 under the MTB filter and
 *                                           🎿 under the Ski filter).
 * @param {Object} [props.flyToTarget]       { lat, lng, ts?, zoom?, pitch?, bearing?, duration? } —
 *                                           `ts` is a nonce so the camera re-flies on repeat clicks.
 *                                           Optional camera fields override defaults (user locate flyTo).
 * @param {Object} [props.bounds]            Plain bounds { swLat, swLng, neLat, neLng }.
 * @param {Object} [props.center]            { lat, lng } fallback when bounds are missing.
 * @param {Object} [props.userLocation]      { lat, lng } — when set, draws a subtle pulsing
 *                                           "You are here" dot. Independent from coach markers.
 * @param {Function} [props.onMarkerHover]   (coach, isHovering) => void
 * @param {Function} [props.onMarkerClick]   (coach) => void
 * @param {Function} [props.onPopupClose]    () => void — called when the popup is dismissed
 *                                           (close button or Mapbox 'close' event).
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 */
const CoachMap3D = props => {
  const {
    coaches = [],
    teams = [],
    activeListingId = null,
    selectedListingId = null,
    selectedAuthorUuid = null,
    hoveredAuthorUuid = null,
    selectedSport = '',
    flyToTarget = null,
    bounds = null,
    center = null,
    userLocation = null,
    onMarkerHover = () => {},
    onMarkerClick = () => {},
    onPopupClose = () => {},
    className,
    rootClassName,
  } = props;

  const containerRef = useRef(null);
  const mapRef = useRef(null);
  // authorUuid -> { marker, container }
  const markersRef = useRef(new Map());
  // Single Mapbox Marker for the "You are here" dot. Lives separately from
  // the coach markers map so toggling user location on/off never disturbs
  // the coach pin lifecycle.
  const userLocationMarkerRef = useRef(null);
  // Latest callbacks – kept in refs so marker listeners don't need re-bind on each render.
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onPopupCloseRef = useRef(onPopupClose);
  const [isReady, setIsReady] = useState(false);
  const hasAnimatedInitialBoundsRef = useRef(false);

  // Mapbox Popup instance + the DOM element React portals into.
  const popupRef = useRef(null);
  const [popupContainer, setPopupContainer] = useState(null);

  useEffect(() => {
    onMarkerHoverRef.current = onMarkerHover;
    onMarkerClickRef.current = onMarkerClick;
    onPopupCloseRef.current = onPopupClose;
  }, [onMarkerHover, onMarkerClick, onPopupClose]);

  // Initialize the Mapbox GL map once. The script is included via Helmet
  // (see `src/util/includeScripts.js`) and may still be loading when this
  // component mounts after a client-side navigation – we poll briefly.
  useEffect(() => {
    if (mapRef.current) return undefined;
    if (!containerRef.current) return undefined;

    let cancelled = false;
    let pollHandle = null;

    const tryInit = () => {
      if (cancelled) return;
      if (!isMapboxAvailable()) {
        pollHandle = window.setTimeout(tryInit, 120);
        return;
      }
      if (!containerRef.current) return;

      const initialCenter = center
        ? [center.lng, center.lat]
        : bounds
        ? [(bounds.swLng + bounds.neLng) / 2, (bounds.swLat + bounds.neLat) / 2]
        : [10.0, 46.0]; // Alpine fallback for the platform

      const map = new window.mapboxgl.Map({
        container: containerRef.current,
        style: COACH_MAP_STYLE,
        center: initialCenter,
        zoom: INITIAL_MAP_ZOOM,
        pitch: INITIAL_CAMERA_PITCH,
        bearing: INITIAL_CAMERA_BEARING,
        antialias: true,
        projection: 'globe',
      });

      map.addControl(
        new window.mapboxgl.NavigationControl({ visualizePitch: true, showCompass: true }),
        'top-right'
      );

      map.on('style.load', () => {
        const styleLayers = map.getStyle().layers || [];
        const labelLayer = styleLayers.find(
          l => l.type === 'symbol' && l.layout && l.layout['text-field']
        );
        const labelLayerId = labelLayer ? labelLayer.id : undefined;

        if (!map.getLayer('peakup-3d-buildings') && map.getSource('composite')) {
          try {
            map.addLayer(
              {
                id: 'peakup-3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                filter: ['==', 'extrude', 'true'],
                type: 'fill-extrusion',
                minzoom: 14,
                paint: {
                  'fill-extrusion-color': '#5a6f88',
                  'fill-extrusion-height': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14,
                    0,
                    14.5,
                    ['get', 'height'],
                  ],
                  'fill-extrusion-base': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    14,
                    0,
                    14.5,
                    ['get', 'min_height'],
                  ],
                  'fill-extrusion-opacity': 0.45,
                },
              },
              labelLayerId
            );
          } catch (e) {
            // Satellite styles may omit building extrusions in some tiles — skip.
          }
        }

        installCoachMapPremiumVisuals(map);
        setIsReady(true);
      });

      mapRef.current = map;
    };

    tryInit();

    return () => {
      cancelled = true;
      if (pollHandle) window.clearTimeout(pollHandle);
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount once

  // Fit the map to the requested bounds whenever they change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !bounds) return;
    const { swLat, swLng, neLat, neLng } = bounds;
    if (
      !Number.isFinite(swLat) ||
      !Number.isFinite(swLng) ||
      !Number.isFinite(neLat) ||
      !Number.isFinite(neLng)
    ) {
      return;
    }
    const duration = hasAnimatedInitialBoundsRef.current
      ? STANDARD_BOUNDS_DURATION_MS
      : INITIAL_CAMERA_DURATION_MS;
    hasAnimatedInitialBoundsRef.current = true;
    map.fitBounds(
      [
        [swLng, swLat],
        [neLng, neLat],
      ],
      {
        padding: 80,
        duration,
        pitch: BOUNDS_CAMERA_PITCH,
        bearing: BOUNDS_CAMERA_BEARING,
        maxZoom: 13,
        easing: cinematicCameraEasing,
      }
    );
  }, [bounds, isReady]);

  // Sync markers with the coaches list.
  //
  // Coordinate sourcing uses `getCoachCoordinates`, which falls back from the
  // representative listing's `geolocation` to the coach profile publicData
  // (lat/lng, location.selectedPlace.origin, configured `coachCity` slug).
  //
  // Pipeline (3 passes):
  //   1. Validate + range-check + swap clearly-reversed pairs.
  //   2. Group by `toFixed(SPIDERFY_FINGERPRINT_DECIMALS)` fingerprint
  //      so coaches that land on the same place (identical coords or
  //      within ~11m) — e.g. Filo and Javier in St. Moritz — end up in
  //      the same bucket regardless of input order.
  //   3. Sort each bucket by `authorUuid` and assign a slot on a tight
  //      polar ring. The first coach (sorted) keeps the real coordinates;
  //      the rest spread on `SPIDERFY_RING_RADIUS_DEG` rings. Sorting by
  //      stable id makes the spiderfy fully deterministic across renders
  //      so markers never jiggle when Redux re-emits the coach list in a
  //      slightly different order (e.g. distance-sort toggle).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady || !window.mapboxgl) return;

    const isInRange = (lat, lng) =>
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    // Resolve the active SportBar filter once per pass so every marker in
    // the run picks the same context-aware glyph (Dani's marker shows 🚵
    // on /coach-map?sport=mtb and 🎿 on /coach-map?sport=ski). Built from
    // the same key-expansion used by `filterCoachesBySport`, so parent
    // filters (`snowboard`, `ski`) match every variant.
    const activeFilterKeys = buildActiveFilterKeySet(selectedSport);

    // Pass 1 — resolve & validate base coords per coach.
    const validRows = [];
    const pushRow = (entity, key, coords, isTeam) => {
      if (!key || !coords) return;
      let { lat, lng } = coords;
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
      if (!isInRange(lat, lng)) return;
      validRows.push({ coach: entity, key, lat, lng, isTeam });
    };

    coaches.forEach(coach => {
      pushRow(coach, coach?.authorUuid, getCoachCoordinates(coach), false);
    });

    teams.forEach(team => {
      pushRow(team, team?.authorUuid, getTeamCoordinates(team), true);
    });

    // Pass 2 — group by fingerprint (~11m bucket via toFixed(4)).
    // Future: split fpGroups by entityType (`coach` vs `team`) for separate
    // cluster layers / hub halos when zoomed to resort scale (e.g. Laax).
    const fpGroups = new Map();
    validRows.forEach(row => {
      const fp = `${row.lat.toFixed(SPIDERFY_FINGERPRINT_DECIMALS)},${row.lng.toFixed(
        SPIDERFY_FINGERPRINT_DECIMALS
      )}`;
      let bucket = fpGroups.get(fp);
      if (!bucket) {
        bucket = [];
        fpGroups.set(fp, bucket);
      }
      bucket.push(row);
    });

    // Pass 3 — assign deterministic positions and create/update markers.
    const seen = new Set();

    fpGroups.forEach(bucket => {
      // Stable sort within the cluster so the same coach always gets the
      // same slot regardless of input order (Redux refetches, distance
      // resorts, sport filter toggles).
      bucket.sort((a, b) => a.key.localeCompare(b.key));

      bucket.forEach((row, dupIndex) => {
        const { coach, key, isTeam } = row;
        let { lat, lng } = row;

        // Single coach in this bucket → keep real coordinates exactly.
        // Otherwise spread on a tight polar ring so each marker stays
        // individually clickable.
        if (dupIndex > 0) {
          const slot = (dupIndex - 1) % SPIDERFY_SLOTS_PER_RING;
          const ring = Math.ceil(dupIndex / SPIDERFY_SLOTS_PER_RING);
          const angle = (slot * 2 * Math.PI) / SPIDERFY_SLOTS_PER_RING;
          const radius = SPIDERFY_RING_RADIUS_DEG * ring;
          lat += radius * Math.sin(angle);
          lng += radius * Math.cos(angle);
        }

        seen.add(key);
        const lngLat = [lng, lat];

        // Resolve the coach's tier so the marker hover/active glow can pick
        // up the same border/glow used by the CoachCard avatar ring and the
        // popup badge. Falls back to the default purple via `var(name, fb)`
        // when the coach has no tier.
        const tierId = pickPrimaryTierId(coach?.author?.attributes?.profile?.publicData);
        const tierColors = getTierColors(tierId);

        const applyTierVars = el => {
          if (!el) return;
          if (tierColors) {
            el.style.setProperty('--tier-border', tierColors.border);
            el.style.setProperty('--tier-glow', tierColors.glow);
            el.style.setProperty('--tier-rgb', tierColors.rgb);
          } else {
            el.style.removeProperty('--tier-border');
            el.style.removeProperty('--tier-glow');
            el.style.removeProperty('--tier-rgb');
          }
        };

        const existing = markersRef.current.get(key);
        if (existing) {
          existing.marker.setLngLat(lngLat);
          // Refresh glyph: this is what makes the marker context-aware.
          // When the user switches the SportBar filter, the effect re-runs
          // (deps include `selectedSport`) and every existing marker swaps
          // its emoji to the active sport — no marker re-creation needed.
          existing.container.textContent = isTeam ? '◆' : dominantEmoji(coach, activeFilterKeys);
          existing.container.classList.toggle(css.markerPinTeam, isTeam);
          if (!isTeam) {
            applyTierVars(existing.container);
          }
          return;
        }

        const container = document.createElement('div');
        container.className = isTeam ? `${css.markerPin} ${css.markerPinTeam}` : css.markerPin;
        container.dataset.coachKey = key;
        container.dataset.entityType = isTeam ? 'team' : 'coach';
        container.textContent = isTeam ? '◆' : dominantEmoji(coach, activeFilterKeys);
        if (!isTeam) {
          applyTierVars(container);
        }

        container.addEventListener('mouseenter', () => onMarkerHoverRef.current(coach, true));
        container.addEventListener('mouseleave', () => onMarkerHoverRef.current(coach, false));
        // `stopPropagation` keeps the click from bubbling up to our
        // document-level outside-click handler (see effect below) and any
        // future Mapbox-internal listeners on the map container, so the
        // marker click is the *only* event that runs and `selectedCoachKey`
        // is set without being immediately reset by a stale close.
        container.addEventListener('click', e => {
          e.stopPropagation();
          onMarkerClickRef.current(coach);
        });

        const marker = new window.mapboxgl.Marker({ element: container, anchor: 'center' })
          .setLngLat(lngLat)
          .addTo(map);

        markersRef.current.set(key, { marker, container });
      });
    });

    // Drop stale markers.
    markersRef.current.forEach((entry, key) => {
      if (!seen.has(key)) {
        entry.marker.remove();
        markersRef.current.delete(key);
      }
    });
    // `selectedSport` is in the deps so the marker glyphs refresh when the
    // user toggles the SportBar (e.g. Dani's icon flips from 🎿 to 🚵 when
    // switching from Ski to MTB). `coaches` already changes by reference
    // on filter toggle, but listing both is defensive against future
    // memoization/sort changes upstream that could keep the same
    // reference across two filters that produce identical visible sets.
  }, [coaches, teams, isReady, selectedSport]);

  // Highlight hovered listing and/or selected author (coach or team).
  useEffect(() => {
    const activeUuid = activeListingId?.uuid;
    const selectedUuid = selectedListingId?.uuid;
    const matchesListing = (uuid, key) =>
      !!uuid &&
      (coaches.some(
        c => c.authorUuid === key && c.representativeListing?.id?.uuid === uuid
      ) ||
        teams.some(
          t => t.authorUuid === key && t.representativeListing?.id?.uuid === uuid
        ));
    markersRef.current.forEach((entry, key) => {
      const isActive =
        matchesListing(activeUuid, key) ||
        matchesListing(selectedUuid, key) ||
        selectedAuthorUuid === key ||
        hoveredAuthorUuid === key;
      entry.container.classList.toggle(css.markerPinActive, !!isActive);
    });
  }, [
    activeListingId,
    selectedListingId,
    selectedAuthorUuid,
    hoveredAuthorUuid,
    coaches,
    teams,
  ]);

  // Fly the camera to the requested target whenever it changes (the parent
  // bumps `ts` on each click so re-selecting the same coach also re-flies).
  // Note: Mapbox camera methods (flyTo, jumpTo, fitBounds) work as soon as the
  // Map instance exists – they do NOT require `style.load`. So we gate only on
  // `mapRef.current`, not on `isReady`, otherwise a click that happens before
  // the style.load event fires gets silently dropped.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    const { lat, lng, zoom, pitch, bearing, duration } = flyToTarget;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    logCoachMapLocateVerbose('mapRef ready?', { ready: true, hasMap: !!map });
    const targetIsUserLocation =
      Number.isFinite(userLocation?.lat) &&
      Number.isFinite(userLocation?.lng) &&
      Math.abs(userLocation.lat - lat) < 0.000001 &&
      Math.abs(userLocation.lng - lng) < 0.000001;
    const zoomFinal = Number.isFinite(zoom)
      ? zoom
      : targetIsUserLocation
      ? USER_LOCATION_FLYTO_ZOOM
      : COACH_FLYTO_ZOOM;
    const pitchFinal = Number.isFinite(pitch)
      ? pitch
      : targetIsUserLocation
      ? USER_LOCATION_FLYTO_PITCH
      : COACH_FLYTO_PITCH;
    const bearingFinal = Number.isFinite(bearing)
      ? bearing
      : targetIsUserLocation
      ? USER_LOCATION_FLYTO_BEARING
      : COACH_FLYTO_BEARING;
    const durationFinal = Number.isFinite(duration)
      ? duration
      : targetIsUserLocation
      ? USER_LOCATION_FLYTO_DURATION_MS
      : COACH_FLYTO_DURATION_MS;
    logCoachMapLocateVerbose('flyTo user location (CoachMap3D executing map.flyTo)', {
      center: [lng, lat],
      zoom: zoomFinal,
      pitch: pitchFinal,
      bearing: bearingFinal,
      duration: durationFinal,
    });
    map.flyTo({
      center: [lng, lat],
      zoom: zoomFinal,
      pitch: pitchFinal,
      bearing: bearingFinal,
      duration: durationFinal,
      easing: cinematicCameraEasing,
      essential: true,
    });
    const onMoveEnd = () => {
      const c = map.getCenter();
      logCoachMapLocateVerbose('final map center after flyTo', { lng: c.lng, lat: c.lat, zoom: map.getZoom() });
    };
    map.once('moveend', onMoveEnd);
  }, [flyToTarget, isReady, userLocation]);

  // "You are here" marker. Lives independently from the coach markers
  // pipeline so toggling user location on/off (e.g. permission revoked
  // mid-session) never touches coach pins, hover halos or selection
  // halos. Re-uses the same Mapbox Marker / DOM element across renders
  // when only the coordinates change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mapboxgl) return undefined;

    const lat = userLocation?.lat;
    const lng = userLocation?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    if (!hasCoords) {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      debugCoachMapLocate('user location marker: cleared (no coords)');
      return undefined;
    }

    // Safari / mobile: adding markers before `style.load` can fail silently or
    // lose sync with the map canvas — `isReady` is set only after style.load.
    if (!isReady) {
      debugCoachMapLocate('user location marker: waiting for map style.load', { lat, lng });
      return undefined;
    }

    const lngLat = [lng, lat];
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLngLat(lngLat);
      debugCoachMapLocate('user location marker: moved', { lat, lng });
      return undefined;
    }

    const dot = document.createElement('div');
    dot.className = css.userLocationDot;
    dot.setAttribute('aria-label', 'Your location');
    const pulse = document.createElement('span');
    pulse.className = css.userLocationPulse;
    pulse.setAttribute('aria-hidden', 'true');
    dot.appendChild(pulse);

    const marker = new window.mapboxgl.Marker({
      element: dot,
      anchor: 'center',
      className: 'peakup-coachmap-user-location',
    })
      .setLngLat(lngLat)
      .addTo(map);

    userLocationMarkerRef.current = marker;
    debugCoachMapLocate('user location marker: rendered', { lat, lng });
    return undefined;
  }, [userLocation, isReady]);

  // Belt & suspenders: tear down the user-location marker on unmount so a
  // late-arriving geolocation result can't leak the DOM element.
  useEffect(
    () => () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    },
    []
  );

  // Resolve the currently-selected coach from the listing id so we can render
  // its premium popup. We match on the representative listing's UUID, which is
  // also what drives `markerPinActive` for the persistent click highlight.
  const selectedEntity = useMemo(() => {
    if (selectedAuthorUuid) {
      return (
        teams.find(t => t.authorUuid === selectedAuthorUuid) ||
        coaches.find(c => c.authorUuid === selectedAuthorUuid) ||
        null
      );
    }
    const uuid = selectedListingId?.uuid;
    if (!uuid) return null;
    return (
      coaches.find(c => c.representativeListing?.id?.uuid === uuid) ||
      teams.find(t => t.representativeListing?.id?.uuid === uuid) ||
      null
    );
  }, [coaches, teams, selectedListingId, selectedAuthorUuid]);

  // Open / move / close the Mapbox Popup based on `selectedCoach`. The popup's
  // DOM container is created here and exposed via state so React can portal
  // <CoachMapPopup /> into it from below — this preserves IntlProvider /
  // Router context while letting Mapbox handle anchoring + repositioning.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mapboxgl) return undefined;

    const popupTierId =
      selectedEntity?.entityType === 'team'
        ? null
        : pickPrimaryTierId(selectedEntity?.author?.attributes?.profile?.publicData);
    const popupTierColors = getTierColors(popupTierId);
    const applyPopupTierVars = popupInstance => {
      const popupEl = popupInstance?.getElement?.();
      if (!popupEl) return;
      if (popupTierColors) {
        popupEl.style.setProperty('--popup-tier-border', popupTierColors.border);
        popupEl.style.setProperty('--popup-tier-glow', popupTierColors.glow);
        popupEl.style.setProperty('--popup-tier-rgb', popupTierColors.rgb);
      } else {
        popupEl.style.removeProperty('--popup-tier-border');
        popupEl.style.removeProperty('--popup-tier-glow');
        popupEl.style.removeProperty('--popup-tier-rgb');
      }
    };

    if (!selectedEntity) {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setPopupContainer(prev => (prev ? null : prev));
      return undefined;
    }

    // Anchor the popup to the marker's *actual* rendered position so the
    // popup tip points to the pin even when the spiderfy pipeline shifts
    // the marker off the cluster center. Falls back to the raw coordinates
    // in the brief window where the marker hasn't been created yet
    // (e.g. ?coachId= deep-link landing before the coaches list resolves).
    const markerEntry = markersRef.current.get(selectedEntity.authorUuid);
    let lngLat = null;
    if (markerEntry?.marker) {
      const ll = markerEntry.marker.getLngLat();
      if (ll) lngLat = [ll.lng, ll.lat];
    }
    if (!lngLat) {
      const coords =
        selectedEntity?.entityType === 'team'
          ? getTeamCoordinates(selectedEntity)
          : getCoachCoordinates(selectedEntity);
      if (coords) lngLat = [coords.lng, coords.lat];
    }
    if (!lngLat) {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setPopupContainer(prev => (prev ? null : prev));
      return undefined;
    }

    if (popupRef.current) {
      // Existing popup: just move it, the React portal re-renders the body.
      popupRef.current.setLngLat(lngLat);
      applyPopupTierVars(popupRef.current);
      return undefined;
    }

    const containerEl = document.createElement('div');
    // We deliberately keep `closeOnClick: false` and instead implement
    // outside-click ourselves (see the document-level effect below). The
    // built-in `closeOnClick: true` was racing with marker clicks: in the
    // same tick where a marker click set a new `selectedCoachKey`, Mapbox
    // would also fire `popup.close` (queueing `setSelectedCoachKey(null)`),
    // and React's automatic batching let the null win — so popups silently
    // didn't open / didn't switch when clicking another marker.
    const popup = new window.mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      focusAfterOpen: false,
      anchor: 'bottom',
      offset: 28,
      maxWidth: '300px',
      className: 'peakupPopup',
    })
      .setLngLat(lngLat)
      .setDOMContent(containerEl)
      .addTo(map);

    popup.on('close', () => {
      // Triggered by Mapbox when `popup.remove()` is called from any path
      // (including ours below). Notifying the parent is idempotent: it just
      // clears the selection if it isn't already cleared.
      onPopupCloseRef.current();
    });

    popupRef.current = popup;
    applyPopupTierVars(popup);
    setPopupContainer(containerEl);
    return undefined;
    // We also depend on `isReady` so a popup created via ?coachId= deep-link
    // *before* Mapbox has finished loading (markers not yet rendered, popup
    // anchored to fallback raw coords) gets re-anchored to the actual
    // marker position once the marker sync runs and `markersRef` is hot.
  }, [selectedEntity, isReady]);

  // Belt & suspenders: tear down the popup on unmount in case the
  // selection-driven effect didn't get a chance to clean up.
  useEffect(
    () => () => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    },
    []
  );

  // Outside-click + ESC for the marker popup. We implement this at the
  // document level (instead of relying on Mapbox's `closeOnClick: true`)
  // so we get full control over which clicks count as "outside":
  //
  //   - clicks on a marker → `stopPropagation` keeps them from reaching
  //     here at all; selection updates via the marker's own handler.
  //   - clicks inside the popup (`.mapboxgl-popup`) → ignored.
  //   - clicks on Mapbox controls (`.mapboxgl-ctrl`) → ignored, so zoom /
  //     fullscreen buttons don't dismiss the popup.
  //   - clicks outside the map container entirely (sidebar Coach Cards,
  //     SportBar, topbar) → ignored, so the sidebar "Map" button can
  //     switch the selected coach without the popup being closed first
  //     and React batching the null update on top of the new uuid.
  //   - clicks on the map canvas / empty area inside the map container →
  //     close the popup.
  //
  // Listener is attached only while a popup is open, so it never runs
  // when there's nothing to close.
  useEffect(() => {
    if (!selectedEntity) return undefined;

    const handleDocClick = event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const map = mapRef.current;
      if (!map) return;
      const mapContainer = map.getContainer();
      if (!mapContainer) return;
      if (!mapContainer.contains(target)) return; // click outside the map
      if (target.closest('.mapboxgl-popup')) return; // click inside popup
      if (target.closest('.mapboxgl-marker')) return; // click on a marker
      if (target.closest('.mapboxgl-ctrl')) return; // click on a control
      onPopupCloseRef.current();
    };

    const handleKey = event => {
      if (event.key === 'Escape' || event.key === 'Esc') {
        onPopupCloseRef.current();
      }
    };

    document.addEventListener('click', handleDocClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleDocClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [selectedEntity]);

  return (
    <>
      <div
        ref={containerRef}
        className={classNames(rootClassName || css.root, className)}
        role="region"
        aria-label="Coach 3D map"
      />
      {popupContainer && selectedEntity
        ? createPortal(
            selectedEntity.entityType === 'team' ? (
              <TeamMapPopup team={selectedEntity} onClose={() => onPopupCloseRef.current()} />
            ) : (
              <CoachMapPopup
                coach={selectedEntity}
                onClose={() => onPopupCloseRef.current()}
              />
            ),
            popupContainer
          )
        : null}
    </>
  );
};

export default CoachMap3D;
