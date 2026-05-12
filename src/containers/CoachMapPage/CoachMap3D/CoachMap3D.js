import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

import { getCoachCoordinates } from '../../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierColors } from '../../../util/coachTier';
import { normalizeSportKey, selectedSportToFilterHyphen } from '../../../util/coachExplore';
import { matchSportFilterKeys } from '../../../util/sportFilterKeys';

import CoachMapPopup from './CoachMapPopup';
import css from './CoachMap3D.module.css';

// Mapbox base style. We intentionally use the dark core style so the map
// reads as part of PeakUp's premium navy UI rather than as a bright map
// embedded inside a dark page. `dark-v11` still ships the same `composite`
// vector source used by streets/outdoors, so our custom 3D building layer,
// terrain DEM, markers, popups, fitBounds, flyTo, hover sync and
// geolocation pipeline keep working unchanged.
const COACH_MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';

// Match the desktop / mobile breakpoint used elsewhere in the app
// (`--viewportMedium` in `customMediaQueries.css` starts at 768px).
// Mobile gets a lighter "premium" treatment (lower terrain exaggeration,
// no atmospheric fog) so the map stays crisp on small screens and cheap
// on cellular bandwidth.
const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 767px)').matches;

/**
 * Apply the premium "alpine outdoor" visual layer on top of the base
 * Mapbox style. Idempotent: every step checks for an existing
 * source/layer first so a re-fired `style.load` (Mapbox can re-emit it
 * after `setStyle`) won't double-add. Safe no-op on browsers without
 * `setTerrain` / `setFog` support — the rest of the map continues to
 * work without these effects.
 *
 * Effects added (all are GPU-only or use cached DEM tiles):
 *  – Terrain DEM via `mapbox-dem` raster-dem source + `setTerrain`,
 *    which lifts mountains so our 50° pitch reads as a true 3D relief
 *    instead of a flat tilted plane.
 *  – `sky` layer of type `atmosphere`, giving the horizon a real
 *    atmospheric gradient at high pitch (very cheap effect).
 *  – `setFog({…})` for a soft alpine haze that fades distant terrain
 *    into the sky color. Desktop only — on mobile we skip it to keep
 *    the map crisp and avoid the small extra GPU/network cost.
 *
 * Markers, popups, flyTo, hover and the geolocation pipeline are
 * deliberately untouched: they bind to the Map instance, not to the
 * style, so they keep working through any style upgrade.
 *
 * @param {object} map a live `mapboxgl.Map` instance, post `style.load`
 */
const installPremiumOutdoorLook = map => {
  if (!map) return;
  const mobile = isMobileViewport();

  // 1. Terrain DEM ---------------------------------------------------------
  // The DEM raster source is shared across all Mapbox accounts and is
  // already covered by our CSP allow-list (api.mapbox.com /
  // *.tiles.mapbox.com). `maxzoom: 14` keeps the DEM lookups cheap —
  // anything above that is flat-terrain at city level anyway.
  if (typeof map.setTerrain === 'function') {
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    // Exaggeration is intentionally subtle: 1.4 desktop / 1.15 mobile
    // gives clear alpine relief without making the Alps look like
    // theme-park spikes when the camera is near-vertical.
    map.setTerrain({
      source: 'mapbox-dem',
      exaggeration: mobile ? 1.15 : 1.4,
    });
  }

  // 2. Sky / atmosphere ----------------------------------------------------
  // A `sky` layer of type `atmosphere` renders a physically-based sky
  // gradient with the sun position we configure. For the dark map pass we
  // keep the sun subtle so the horizon stays readable without reintroducing
  // a daylight-blue map feel inside the dark CoachMap shell.
  if (!map.getLayer('peakup-sky')) {
    map.addLayer({
      id: 'peakup-sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0.0, 90.0],
        'sky-atmosphere-sun-intensity': 5,
      },
    });
  }

  // 3. Atmospheric fog (desktop only) --------------------------------------
  // `setFog` adds a soft haze along the horizon — distant terrain fades
  // into the sky color, giving real depth at our 50° pitch. In the dark
  // map pass we keep the haze cool and low-luminance so the map blends
  // into the surrounding navy shell while preserving label readability.
  if (!mobile && typeof map.setFog === 'function') {
    map.setFog({
      range: [0.6, 10],
      color: '#122032',
      'high-color': '#1e3a56',
      'horizon-blend': 0.1,
      'space-color': '#040913',
      'star-intensity': 0.0,
    });
  }
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
 * @param {string} [props.selectedSport]     Raw SportBar value ('' / 'mtb' / 'snowboard' / …).
 *                                           When set, marker glyphs switch to the filtered sport
 *                                           so the map feels context-aware (a coach who teaches
 *                                           both Ski and MTB shows 🚵 under the MTB filter and
 *                                           🎿 under the Ski filter).
 * @param {Object} [props.flyToTarget]       { lat, lng, ts? } — `ts` is treated as a nonce so the
 *                                           camera re-flies even when the user re-clicks the same coach.
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
    activeListingId = null,
    selectedListingId = null,
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
        zoom: 4,
        pitch: 50,
        bearing: -17.6,
        antialias: true,
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

        if (!map.getLayer('peakup-3d-buildings')) {
          map.addLayer(
            {
              id: 'peakup-3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': '#31465f',
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
                'fill-extrusion-opacity': 0.78,
              },
            },
            labelLayerId
          );
        }

        // Premium "alpine outdoor" pass: terrain DEM + sky/atmosphere
        // (+ fog on desktop). Idempotent and fully isolated — does not
        // touch the building-extrusion layer above, the marker pipeline,
        // popups, fitBounds, flyTo, hover, or geolocation. See
        // `installPremiumOutdoorLook` for the full rationale.
        installPremiumOutdoorLook(map);
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
    map.fitBounds(
      [
        [swLng, swLat],
        [neLng, neLat],
      ],
      { padding: 80, duration: 600, pitch: 50, bearing: -17.6, maxZoom: 13 }
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
    coaches.forEach(coach => {
      const key = coach?.authorUuid;
      if (!key) return;
      const coords = getCoachCoordinates(coach);
      if (!coords) return;
      let { lat, lng } = coords;
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
      if (!isInRange(lat, lng)) return;
      validRows.push({ coach, key, lat, lng });
    });

    // Pass 2 — group by fingerprint (~11m bucket via toFixed(4)).
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
        const { coach, key } = row;
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
          existing.container.textContent = dominantEmoji(coach, activeFilterKeys);
          applyTierVars(existing.container);
          return;
        }

        const container = document.createElement('div');
        container.className = css.markerPin;
        container.dataset.coachKey = key;
        container.textContent = dominantEmoji(coach, activeFilterKeys);
        applyTierVars(container);

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
  }, [coaches, isReady, selectedSport]);

  // Highlight the hovered AND/OR selected listing's marker.
  useEffect(() => {
    const activeUuid = activeListingId?.uuid;
    const selectedUuid = selectedListingId?.uuid;
    const matches = (uuid, key) =>
      !!uuid &&
      coaches.some(
        c => c.authorUuid === key && c.representativeListing?.id?.uuid === uuid
      );
    markersRef.current.forEach((entry, key) => {
      const isActive = matches(activeUuid, key) || matches(selectedUuid, key);
      entry.container.classList.toggle(css.markerPinActive, !!isActive);
    });
  }, [activeListingId, selectedListingId, coaches]);

  // Fly the camera to the requested target whenever it changes (the parent
  // bumps `ts` on each click so re-selecting the same coach also re-flies).
  // Note: Mapbox camera methods (flyTo, jumpTo, fitBounds) work as soon as the
  // Map instance exists – they do NOT require `style.load`. So we gate only on
  // `mapRef.current`, not on `isReady`, otherwise a click that happens before
  // the style.load event fires gets silently dropped.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !flyToTarget) return;
    const { lat, lng } = flyToTarget;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    map.flyTo({
      center: [lng, lat],
      zoom: 14,
      pitch: 55,
      bearing: -17.6,
      duration: 1100,
      essential: true,
    });
  }, [flyToTarget, isReady]);

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
      return undefined;
    }

    const lngLat = [lng, lat];
    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.setLngLat(lngLat);
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
    })
      .setLngLat(lngLat)
      .addTo(map);

    userLocationMarkerRef.current = marker;
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
  const selectedCoach = useMemo(() => {
    const uuid = selectedListingId?.uuid;
    if (!uuid) return null;
    return (
      coaches.find(c => c.representativeListing?.id?.uuid === uuid) || null
    );
  }, [coaches, selectedListingId]);

  // Open / move / close the Mapbox Popup based on `selectedCoach`. The popup's
  // DOM container is created here and exposed via state so React can portal
  // <CoachMapPopup /> into it from below — this preserves IntlProvider /
  // Router context while letting Mapbox handle anchoring + repositioning.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.mapboxgl) return undefined;

    const popupTierId = pickPrimaryTierId(selectedCoach?.author?.attributes?.profile?.publicData);
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

    if (!selectedCoach) {
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
    const markerEntry = markersRef.current.get(selectedCoach.authorUuid);
    let lngLat = null;
    if (markerEntry?.marker) {
      const ll = markerEntry.marker.getLngLat();
      if (ll) lngLat = [ll.lng, ll.lat];
    }
    if (!lngLat) {
      const coords = getCoachCoordinates(selectedCoach);
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
  }, [selectedCoach, isReady]);

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
    if (!selectedCoach) return undefined;

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
  }, [selectedCoach]);

  return (
    <>
      <div
        ref={containerRef}
        className={classNames(rootClassName || css.root, className)}
        role="region"
        aria-label="Coach 3D map"
      />
      {popupContainer && selectedCoach
        ? createPortal(
            <CoachMapPopup
              coach={selectedCoach}
              onClose={() => onPopupCloseRef.current()}
            />,
            popupContainer
          )
        : null}
    </>
  );
};

export default CoachMap3D;
