import React from 'react';
import { Helmet } from 'react-helmet-async';

import { useRouteConfiguration } from '../context/routeConfigurationContext';
import { matchPathname } from '../util/routes';
import {
  applyMapboxAccessTokenIfReady,
  MAPBOX_GL_CSS_URL,
  MAPBOX_GL_JS_URL,
  MAPBOX_SDK_RELATIVE_PATH,
  MAPBOX_SCRIPT_ID,
  MAPBOX_SDK_SCRIPT_ID,
} from './mapboxGeocoderScripts';

const GOOGLE_MAPS_SCRIPT_ID = 'GoogleMapsApi';

/**
 * Map library is shown on some of the pages, but ReusableMapContainer is used app wide.
 * However, we can defer the map library loading on pages that don't show the map immediately.
 * Note: this currently only affects Mapbox library.
 * Google Maps library is always loaded immediately. (It seems to be more fragile when loaded asynchronously.)
 *
 * @param {string} initialPathname - The initial pathname at the time of the full page load.
 * @param {array} routeConfiguration - The route configuration.
 * @returns {boolean} - True if the map library can be deferred, false otherwise.
 */
const canDeferMapLibrary = (initialPathname, routeConfiguration) => {
  if (!initialPathname) {
    return false;
  }
  const matchedRoutes = matchPathname(initialPathname, routeConfiguration);
  const currentRouteConfig = matchedRoutes.length > 0 ? matchedRoutes[0]?.route : null;
  return currentRouteConfig?.prioritizeMapLibraryLoading !== true;
};

/**
 * Include scripts (like Map Provider).
 * These scripts are relevant for whole application: location search in Topbar and maps on different pages.
 * However, if you don't need location search and maps, you can just omit this component from app.js
 * Note: another common point to add <scripts>, <links> and <meta> tags is Page.js
 *       and Stripe script is added in public/index.html
 *
 * Note 2: When adding new external scripts/styles/fonts/etc.,
 *         if a Content Security Policy (CSP) is turned on, the new URLs
 *         should be whitelisted in the policy. Check: server/csp.js
 */
export const IncludeScripts = props => {
  const { marketplaceRootURL: rootURL, maps, analytics } = props?.config || {};
  const { googleAnalyticsId, plausibleDomains } = analytics;

  const routeConfiguration = useRouteConfiguration();
  // Note: Affects Mapbox only. Google Maps initialization is not yet ready to support asynchronous loading.
  const deferMapLibrary = canDeferMapLibrary(props?.initialPathname, routeConfiguration)
    ? { defer: '' }
    : {};

  const { mapProvider, googleMapsAPIKey, mapboxAccessToken } = maps || {};
  const isGoogleMapsInUse = mapProvider === 'googleMaps';
  const isMapboxInUse = mapProvider === 'mapbox';

  // Add Google Analytics script if correct id exists (it should start with 'G-' prefix)
  // See: https://developers.google.com/analytics/devguides/collection/gtagjs
  const hasGoogleAnalyticsv4Id = googleAnalyticsId?.indexOf('G-') === 0;

  // Collect relevant map libraries
  let mapLibraries = [];
  let analyticsLibraries = [];

  if (isMapboxInUse) {
    // NOTE: remember to update mapbox-sdk.min.js to a new version regularly.
    // mapbox-sdk.min.js is included from static folder for CSP purposes.
    // Load mapbox-gl-js before mapbox-sdk so `window.mapboxgl` exists for the token.
    mapLibraries.push(
      <link
        key="mapbox_GL_CSS"
        href={MAPBOX_GL_CSS_URL}
        rel="stylesheet"
        crossOrigin="anonymous"
      />
    );
    mapLibraries.push(
      <script
        id={MAPBOX_SCRIPT_ID}
        key="mapbox_GL_JS"
        src={MAPBOX_GL_JS_URL}
        crossOrigin="anonymous"
        {...deferMapLibrary}
      ></script>
    );
    mapLibraries.push(
      <script
        id={MAPBOX_SDK_SCRIPT_ID}
        key="mapboxSDK"
        src={MAPBOX_SDK_RELATIVE_PATH}
        {...deferMapLibrary}
      ></script>
    );
  } else if (isGoogleMapsInUse) {
    // Add Google Maps library
    mapLibraries.push(
      <script
        id={GOOGLE_MAPS_SCRIPT_ID}
        key="GoogleMapsApi"
        src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsAPIKey}&libraries=places`}
        crossOrigin="anonymous"
      ></script>
    );
  }

  if (googleAnalyticsId && hasGoogleAnalyticsv4Id) {
    // Google Analytics: gtag.js
    // NOTE: This template is a single-page application (SPA).
    //       gtag.js sends initial page_view event after page load.
    //       but we need to handle subsequent events for in-app navigation.
    //       This is done in src/analytics/handlers.js
    analyticsLibraries.push(
      <script
        key="gtag.js"
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
        crossOrigin="anonymous"
      ></script>
    );

    if (typeof window !== 'undefined') {
      window.dataLayer = window.dataLayer || [];
      // Ensure that gtag function is found from window scope
      window.gtag = function gtag() {
        dataLayer.push(arguments);
      };
      gtag('js', new Date());
      gtag('config', googleAnalyticsId, {
        cookie_flags: 'SameSite=None;Secure',
      });
    }
  }

  if (plausibleDomains) {
    // If plausibleDomains is not an empty string, include their script too.
    analyticsLibraries.push(
      <script
        key="plausible"
        defer
        src="https://plausible.io/js/script.js"
        data-domain={plausibleDomains}
        crossOrigin="anonymous"
      ></script>
    );
  }

  const isBrowser = typeof window !== 'undefined';

  // If Mapbox GL is already on window (SSR head tags or prior navigation), apply token safely.
  if (isMapboxInUse && isBrowser) {
    applyMapboxAccessTokenIfReady(mapboxAccessToken);
  }

  // Client-side script load: mapbox-gl-js defines `window.mapboxgl`; mapbox-sdk defines `window.mapboxSdk`.
  const onMapLibLoaded = scriptId => {
    if (!isMapboxInUse) {
      return;
    }
    if (scriptId === MAPBOX_SCRIPT_ID || scriptId === MAPBOX_SDK_SCRIPT_ID) {
      applyMapboxAccessTokenIfReady(mapboxAccessToken);
    }
  };

  // React Helmet Async doesn't support onLoad prop for scripts.
  // However, it does have onChangeClientState functionality.
  // We can use that to start listen 'load' events when the library is added on client-side.
  const onChangeClientState = (newState, addedTags) => {
    if (addedTags?.scriptTags) {
      addedTags.scriptTags.forEach(scriptTag => {
        if (![MAPBOX_SCRIPT_ID, MAPBOX_SDK_SCRIPT_ID, GOOGLE_MAPS_SCRIPT_ID].includes(scriptTag.id)) {
          return;
        }
        scriptTag.addEventListener('load', () => onMapLibLoaded(scriptTag.id), { once: true });
      });
    }
  };

  const allScripts = [...analyticsLibraries, ...mapLibraries];
  return <Helmet onChangeClientState={onChangeClientState}>{allScripts}</Helmet>;
};
