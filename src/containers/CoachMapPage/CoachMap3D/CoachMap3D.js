import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import classNames from 'classnames';

import { getCoachCoordinates } from '../../../util/profileCoachSticker';
import { pickPrimaryTierId, getTierColors } from '../../../util/coachTier';

import CoachMapPopup from './CoachMapPopup';
import css from './CoachMap3D.module.css';

const STREET_STYLE_3D = 'mapbox://styles/mapbox/streets-v12';

// Same emoji table used by SportBar – kept here as a local map so this
// component does not pull cross-feature deps just for marker glyphs.
const SPORT_EMOJI = {
  surf: '🏄',
  mtb: '🚵',
  tennis: '🎾',
  golf: '⛳️',
  climbing: '🧗',
  yoga: '🧘',
  skydive: '🪂',
  fitness: '🏋️',
  wakeboard: '🏄',
  kitesurf: '🪁',
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

const dominantEmoji = coach => {
  const sport = coach?.sportKeys?.[0];
  const key = String(sport || '').toLowerCase();
  return SPORT_EMOJI[key] || '📍';
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
 * @param {Object} [props.flyToTarget]       { lat, lng, ts? } — `ts` is treated as a nonce so the
 *                                           camera re-flies even when the user re-clicks the same coach.
 * @param {Object} [props.bounds]            Plain bounds { swLat, swLng, neLat, neLng }.
 * @param {Object} [props.center]            { lat, lng } fallback when bounds are missing.
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
    flyToTarget = null,
    bounds = null,
    center = null,
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
        style: STREET_STYLE_3D,
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
                'fill-extrusion-color': '#cad5e0',
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
                'fill-extrusion-opacity': 0.65,
              },
            },
            labelLayerId
          );
        }
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
  // We also validate finite range, swap clearly-reversed pairs, and apply a
  // tiny ring offset to coaches that share the exact same coords so each
  // marker stays individually clickable instead of stacking invisibly.
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

    const rows = coaches.map(coach => ({
      coach,
      key: coach?.authorUuid || null,
      coords: getCoachCoordinates(coach),
    }));

    const seen = new Set();
    const seenAtFp = new Map();

    rows.forEach(({ coach, key, coords }) => {
      if (!key || !coords) return;
      let { lat, lng } = coords;

      // Heuristic swap: clearly-reversed pair (lat outside ±90 but lng would fit).
      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        const tmp = lat;
        lat = lng;
        lng = tmp;
      }
      if (!isInRange(lat, lng)) return;

      // Spread duplicates on a small ring so they stay individually clickable.
      const fp = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      const dupIndex = seenAtFp.get(fp) || 0;
      seenAtFp.set(fp, dupIndex + 1);
      if (dupIndex > 0) {
        const slot = (dupIndex - 1) % 6;
        const ring = Math.ceil(dupIndex / 6);
        const angle = (slot * 2 * Math.PI) / 6;
        const radius = 0.0001 * ring; // ~11 m per ring
        lat += radius * Math.sin(angle);
        lng += radius * Math.cos(angle);
      }

      seen.add(key);
      const lngLat = [lng, lat];

      // Resolve the coach's tier so the marker hover/active glow can pick up
      // the same border/glow used by the CoachCard avatar ring and the popup
      // badge. Falls back to the default purple via the CSS `var(name, fb)`
      // when the coach has no tier.
      const tierId = pickPrimaryTierId(coach?.author?.attributes?.profile?.publicData);
      const tierColors = getTierColors(tierId);

      const applyTierVars = el => {
        if (!el) return;
        if (tierColors) {
          el.style.setProperty('--tier-border', tierColors.border);
          el.style.setProperty('--tier-glow', tierColors.glow);
        } else {
          el.style.removeProperty('--tier-border');
          el.style.removeProperty('--tier-glow');
        }
      };

      const existing = markersRef.current.get(key);
      if (existing) {
        existing.marker.setLngLat(lngLat);
        // Refresh emoji glyph in case the coach's dominant sport changed.
        existing.container.textContent = dominantEmoji(coach);
        applyTierVars(existing.container);
        return;
      }

      const container = document.createElement('div');
      container.className = css.markerPin;
      container.dataset.coachKey = key;
      container.textContent = dominantEmoji(coach);
      applyTierVars(container);

      container.addEventListener('mouseenter', () => onMarkerHoverRef.current(coach, true));
      container.addEventListener('mouseleave', () => onMarkerHoverRef.current(coach, false));
      container.addEventListener('click', () => onMarkerClickRef.current(coach));

      const marker = new window.mapboxgl.Marker({ element: container, anchor: 'center' })
        .setLngLat(lngLat)
        .addTo(map);

      markersRef.current.set(key, { marker, container });
    });

    // Drop stale markers.
    markersRef.current.forEach((entry, key) => {
      if (!seen.has(key)) {
        entry.marker.remove();
        markersRef.current.delete(key);
      }
    });
  }, [coaches, isReady]);

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

    if (!selectedCoach) {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setPopupContainer(prev => (prev ? null : prev));
      return undefined;
    }

    const coords = getCoachCoordinates(selectedCoach);
    if (!coords) {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setPopupContainer(prev => (prev ? null : prev));
      return undefined;
    }

    const lngLat = [coords.lng, coords.lat];
    if (popupRef.current) {
      // Existing popup: just move it, the React portal re-renders the body.
      popupRef.current.setLngLat(lngLat);
      return undefined;
    }

    const containerEl = document.createElement('div');
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
    setPopupContainer(containerEl);
    return undefined;
  }, [selectedCoach]);

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
