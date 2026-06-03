export const MAPBOX_SCRIPT_ID = 'mapbox_GL_JS';
export const MAPBOX_SDK_SCRIPT_ID = 'mapbox_SDK_JS';
export const MAPBOX_GL_JS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js';
export const MAPBOX_GL_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css';
export const MAPBOX_SDK_VERSION_DIR = 'mapbox-sdk@0.16.2';
export const MAPBOX_SDK_MIN_FILE = 'mapbox-sdk.min.js';
export const MAPBOX_SDK_FALLBACK_FILE = 'mapbox-sdk.js';
export const MAPBOX_SDK_RELATIVE_PATH = `/static/scripts/mapbox/${MAPBOX_SDK_VERSION_DIR}/${MAPBOX_SDK_MIN_FILE}`;
export const MAPBOX_SDK_FALLBACK_RELATIVE_PATH = `/static/scripts/mapbox/${MAPBOX_SDK_VERSION_DIR}/${MAPBOX_SDK_FALLBACK_FILE}`;

const MAPBOX_GEOCODER_HELMET_WAIT_MS = 3000;
const MAPBOX_GEOCODER_LIB_TIMEOUT_MS = 30000;
const MAPBOX_GEOCODER_POLL_MS = 50;
const MAPBOX_SDK_GLOBAL_POLL_MS = 50;
const MAPBOX_SDK_GLOBAL_POLL_MAX_MS = 2000;

const normalizeRootUrl = rootURLMaybe => {
  const raw = String(
    rootURLMaybe || (typeof window !== 'undefined' ? window.location.origin : '')
  ).trim();
  return raw.replace(/\/$/, '');
};

/**
 * Resolve the mapbox-sdk script URL against the **current page origin**.
 * Self-hosted static assets must not use configured marketplaceRootURL when
 * testing from iPhone/LAN (configured URL may still be localhost).
 *
 * @param {string} [rootURLMaybe] SSR fallback only
 * @param {string} [relativePath]
 * @returns {string}
 */
export const getMapboxSdkScriptUrl = (rootURLMaybe, relativePath = MAPBOX_SDK_RELATIVE_PATH) => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${relativePath}`;
  }
  const rootURL = normalizeRootUrl(rootURLMaybe);
  if (rootURL) {
    return `${rootURL}${relativePath}`;
  }
  return relativePath;
};

export const tryApplyMapboxAccessToken = accessTokenMaybe => {
  if (
    accessTokenMaybe &&
    typeof window !== 'undefined' &&
    window.mapboxgl &&
    !window.mapboxgl.accessToken
  ) {
    window.mapboxgl.accessToken = accessTokenMaybe;
  }
};

export const getMapboxGeocoderLibraryStatus = accessTokenMaybe => ({
  mapboxGlLoaded: typeof window !== 'undefined' && !!window.mapboxgl,
  mapboxSdkLoaded: typeof window !== 'undefined' && !!window.mapboxSdk,
  accessTokenPresent:
    typeof window !== 'undefined' &&
    !!window.mapboxgl &&
    (!!window.mapboxgl.accessToken || Boolean(String(accessTokenMaybe || '').trim())),
});

const mapboxGeocoderLibsReady = accessTokenMaybe => {
  tryApplyMapboxAccessToken(accessTokenMaybe);
  return (
    typeof window !== 'undefined' &&
    !!window.mapboxgl &&
    !!window.mapboxSdk &&
    !!window.mapboxgl.accessToken
  );
};

const sleep = ms => new Promise(resolve => window.setTimeout(resolve, ms));

const isLibraryReadyForScriptId = scriptId => {
  if (scriptId === MAPBOX_SCRIPT_ID) {
    return !!window.mapboxgl;
  }
  if (scriptId === MAPBOX_SDK_SCRIPT_ID) {
    return !!window.mapboxSdk;
  }
  return false;
};

const resolveScriptUrl = src =>
  typeof window !== 'undefined' ? new URL(src, window.location.origin).href : src;

const scriptSrcMatchesDesired = (scriptEl, desiredSrc) => {
  if (!scriptEl) {
    return false;
  }
  const current = scriptEl.getAttribute('src') || '';
  if (!current) {
    return false;
  }
  try {
    return resolveScriptUrl(current) === resolveScriptUrl(desiredSrc);
  } catch (e) {
    return current === desiredSrc;
  }
};

const waitForMapboxSdkGlobal = async () => {
  if (window.mapboxSdk) {
    return true;
  }
  const started = Date.now();
  while (Date.now() - started < MAPBOX_SDK_GLOBAL_POLL_MAX_MS) {
    if (window.mapboxSdk) {
      return true;
    }
    await sleep(MAPBOX_SDK_GLOBAL_POLL_MS);
  }
  return !!window.mapboxSdk;
};

/**
 * Inject a script tag or wait for an existing Helmet tag to finish loading.
 *
 * @param {string} id
 * @param {string} src
 * @param {Record<string, string>} [attrs]
 * @returns {Promise<void>}
 */
const loadMapboxScript = (id, src, attrs = {}) =>
  new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error(`Cannot load ${id} without document`));
      return;
    }

    if (isLibraryReadyForScriptId(id)) {
      resolve();
      return;
    }

    let scriptEl = document.getElementById(id);
    if (scriptEl && !scriptSrcMatchesDesired(scriptEl, src)) {
      scriptEl.remove();
      scriptEl = null;
    }

    let created = false;

    const cleanup = (loadHandler, errorHandler, timeoutId) => {
      window.clearTimeout(timeoutId);
      if (scriptEl) {
        scriptEl.removeEventListener('load', loadHandler);
        scriptEl.removeEventListener('error', errorHandler);
      }
    };

    const finishOk = async (loadHandler, errorHandler, timeoutId) => {
      if (id === MAPBOX_SDK_SCRIPT_ID) {
        const sdkReady = await waitForMapboxSdkGlobal();
        if (!sdkReady) {
          return;
        }
      } else if (!isLibraryReadyForScriptId(id)) {
        return;
      }

      scriptEl?.setAttribute('data-peakup-loaded', '1');
      cleanup(loadHandler, errorHandler, timeoutId);
      resolve();
    };

    const finishErr = (loadHandler, errorHandler, timeoutId, message) => {
      cleanup(loadHandler, errorHandler, timeoutId);
      reject(new Error(message || `Failed to load ${id}`));
    };

    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = id;
      scriptEl.src = src;
      Object.entries(attrs).forEach(([key, value]) => {
        scriptEl.setAttribute(key, value);
      });
      created = true;
    }

    const onLoad = () => {
      void finishOk(onLoad, onError, timeoutId).catch(error =>
        finishErr(onLoad, onError, timeoutId, error?.message || `Failed to initialize ${id}`)
      );
    };
    const onError = () => {
      finishErr(
        onLoad,
        onError,
        timeoutId,
        created ? `Failed to load ${id}` : `Failed to load existing ${id}`
      );
    };

    const timeoutId = window.setTimeout(() => {
      if (isLibraryReadyForScriptId(id)) {
        finishOk(onLoad, onError, timeoutId);
        return;
      }
      finishErr(onLoad, onError, timeoutId, `Timed out waiting for ${id}`);
    }, MAPBOX_GEOCODER_LIB_TIMEOUT_MS);

    scriptEl.addEventListener('load', onLoad);
    scriptEl.addEventListener('error', onError);

    if (created) {
      document.head.appendChild(scriptEl);
    }

    void finishOk(onLoad, onError, timeoutId).catch(error =>
      finishErr(onLoad, onError, timeoutId, error?.message || `Failed to initialize ${id}`)
    );
  });

const loadMapboxSdkScript = async rootURLMaybe => {
  const primaryUrl = getMapboxSdkScriptUrl(rootURLMaybe, MAPBOX_SDK_RELATIVE_PATH);
  const fallbackUrl = getMapboxSdkScriptUrl(rootURLMaybe, MAPBOX_SDK_FALLBACK_RELATIVE_PATH);

  const staleScript = document.getElementById(MAPBOX_SDK_SCRIPT_ID);
  if (staleScript && !window.mapboxSdk) {
    staleScript.remove();
  }

  try {
    await loadMapboxScript(MAPBOX_SDK_SCRIPT_ID, primaryUrl);
    return;
  } catch (primaryError) {
    document.getElementById(MAPBOX_SDK_SCRIPT_ID)?.remove();
    await loadMapboxScript(MAPBOX_SDK_SCRIPT_ID, fallbackUrl);
  }
};

const loadMapboxScriptWithRetry = async (id, src, attrs = {}, rootURLMaybe) => {
  if (id === MAPBOX_SDK_SCRIPT_ID) {
    await loadMapboxSdkScript(rootURLMaybe);
    return;
  }

  try {
    await loadMapboxScript(id, src, attrs);
  } catch (firstError) {
    document.getElementById(id)?.remove();
    await loadMapboxScript(id, src, attrs);
  }
};

/**
 * Programmatically load mapbox-gl-js + mapbox-sdk and apply the access token.
 *
 * @param {string} [accessTokenMaybe]
 * @param {string} [rootURLMaybe]
 * @returns {Promise<{ mapboxGlLoaded: boolean, mapboxSdkLoaded: boolean, accessTokenPresent: boolean }>}
 */
export const ensureMapboxGeocoderLibraries = async (accessTokenMaybe, rootURLMaybe) => {
  if (typeof window === 'undefined') {
    throw new Error('Mapbox libraries are required for GeocoderMapbox');
  }

  tryApplyMapboxAccessToken(accessTokenMaybe);
  if (mapboxGeocoderLibsReady(accessTokenMaybe)) {
    return getMapboxGeocoderLibraryStatus(accessTokenMaybe);
  }

  if (!window.mapboxgl) {
    await loadMapboxScriptWithRetry(
      MAPBOX_SCRIPT_ID,
      MAPBOX_GL_JS_URL,
      { crossOrigin: 'anonymous' },
      rootURLMaybe
    );
  }

  tryApplyMapboxAccessToken(accessTokenMaybe);

  if (!window.mapboxSdk) {
    await loadMapboxScriptWithRetry(MAPBOX_SDK_SCRIPT_ID, null, {}, rootURLMaybe);
  }

  tryApplyMapboxAccessToken(accessTokenMaybe);

  if (!mapboxGeocoderLibsReady(accessTokenMaybe)) {
    if (!String(accessTokenMaybe || '').trim()) {
      throw new Error('Mapbox access token is required for GeocoderMapbox');
    }
    throw new Error('Mapbox libraries are required for GeocoderMapbox');
  }

  return getMapboxGeocoderLibraryStatus(accessTokenMaybe);
};

/**
 * Wait briefly for Helmet-injected tags, then force-load Mapbox libraries if needed.
 *
 * @param {string} [accessTokenMaybe]
 * @param {string} [rootURLMaybe]
 * @returns {Promise<void>}
 */
export const waitForMapboxGeocoderLibraries = async (accessTokenMaybe, rootURLMaybe) => {
  if (typeof window === 'undefined') {
    throw new Error('Mapbox libraries are required for GeocoderMapbox');
  }

  tryApplyMapboxAccessToken(accessTokenMaybe);
  if (mapboxGeocoderLibsReady(accessTokenMaybe)) {
    return;
  }

  const started = Date.now();
  while (Date.now() - started < MAPBOX_GEOCODER_HELMET_WAIT_MS) {
    tryApplyMapboxAccessToken(accessTokenMaybe);
    if (mapboxGeocoderLibsReady(accessTokenMaybe)) {
      return;
    }

    const helmetSdk = document.getElementById(MAPBOX_SDK_SCRIPT_ID);
    if (helmetSdk && !scriptSrcMatchesDesired(helmetSdk, getMapboxSdkScriptUrl(rootURLMaybe))) {
      helmetSdk.remove();
    }

    await sleep(MAPBOX_GEOCODER_POLL_MS);
  }

  await ensureMapboxGeocoderLibraries(accessTokenMaybe, rootURLMaybe);
};

/**
 * Apply configured Mapbox token once mapbox-gl-js has created `window.mapboxgl`.
 *
 * @param {string|undefined} mapboxAccessToken
 * @returns {{ applied: boolean, reason: string }}
 */
export const applyMapboxAccessTokenIfReady = mapboxAccessToken => {
  if (typeof window === 'undefined') {
    return { applied: false, reason: 'no-window' };
  }
  if (!mapboxAccessToken) {
    return { applied: false, reason: 'no-configured-token' };
  }
  if (!window.mapboxgl) {
    return { applied: false, reason: 'mapboxgl-not-ready' };
  }
  if (!window.mapboxgl.accessToken) {
    window.mapboxgl.accessToken = mapboxAccessToken;
  }
  return {
    applied: !!window.mapboxgl.accessToken,
    reason: window.mapboxgl.accessToken ? 'ok' : 'token-set-failed',
  };
};
