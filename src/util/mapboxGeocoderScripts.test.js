import {
  ensureMapboxGeocoderLibraries,
  getMapboxGeocoderLibraryStatus,
  getMapboxSdkScriptUrl,
  MAPBOX_SCRIPT_ID,
  MAPBOX_SDK_RELATIVE_PATH,
  MAPBOX_SDK_SCRIPT_ID,
  tryApplyMapboxAccessToken,
  waitForMapboxGeocoderLibraries,
} from './mapboxGeocoderScripts';

describe('mapboxGeocoderScripts', () => {
  const accessToken = 'pk.test-token';

  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.mapboxgl;
    delete window.mapboxSdk;
  });

  it('builds the mapbox-sdk URL from the current page origin', () => {
    expect(getMapboxSdkScriptUrl('https://example.com')).toBe(
      `${window.location.origin}${MAPBOX_SDK_RELATIVE_PATH}`
    );
  });

  it('reports library status from window globals', () => {
    window.mapboxgl = { accessToken: accessToken };
    window.mapboxSdk = () => ({});

    expect(getMapboxGeocoderLibraryStatus(accessToken)).toMatchObject({
      mapboxGlLoaded: true,
      mapboxSdkLoaded: true,
      accessTokenPresent: true,
    });
  });

  it('loads missing mapbox scripts programmatically', async () => {
    const appendChildSpy = jest.spyOn(document.head, 'appendChild');

    window.mapboxgl = undefined;
    window.mapboxSdk = undefined;

    appendChildSpy.mockImplementation(node => {
      if (node.tagName === 'SCRIPT') {
        if (node.id === MAPBOX_SCRIPT_ID) {
          window.mapboxgl = { accessToken: null };
        }
        if (node.id === MAPBOX_SDK_SCRIPT_ID) {
          window.mapboxSdk = () => ({ geocoding: {} });
        }
        node.onload?.(new Event('load'));
      }
      return node;
    });

    await ensureMapboxGeocoderLibraries(accessToken, 'https://example.com');

    expect(window.mapboxgl.accessToken).toBe(accessToken);
    expect(getMapboxGeocoderLibraryStatus(accessToken).mapboxSdkLoaded).toBe(true);
    appendChildSpy.mockRestore();
  });

  it('waits for Helmet tags then force-loads when needed', async () => {
    window.mapboxgl = { accessToken: accessToken };
    window.mapboxSdk = () => ({});

    await expect(waitForMapboxGeocoderLibraries(accessToken, 'https://example.com')).resolves.toBe(
      undefined
    );
  });

  it('applies the configured token once mapbox-gl is present', () => {
    window.mapboxgl = { accessToken: null };
    tryApplyMapboxAccessToken(accessToken);
    expect(window.mapboxgl.accessToken).toBe(accessToken);
  });

  it('removes stale Helmet sdk tags that point at a different origin', async () => {
    const stale = document.createElement('script');
    stale.id = MAPBOX_SDK_SCRIPT_ID;
    stale.src = 'http://localhost:4000/static/scripts/mapbox/mapbox-sdk@0.16.2/mapbox-sdk.min.js';
    document.head.appendChild(stale);

    window.mapboxgl = { accessToken: accessToken };

    const originalAppendChild = document.head.appendChild.bind(document.head);
    const appendChildSpy = jest.spyOn(document.head, 'appendChild');
    appendChildSpy.mockImplementation(node => {
      const appended = originalAppendChild(node);
      if (node.tagName === 'SCRIPT' && node.id === MAPBOX_SDK_SCRIPT_ID) {
        window.mapboxSdk = () => ({ geocoding: {} });
        node.onload?.(new Event('load'));
      }
      return appended;
    });

    await ensureMapboxGeocoderLibraries(accessToken, 'http://localhost:4000');

    expect(window.mapboxSdk).toBeTruthy();
    expect(document.getElementById(MAPBOX_SDK_SCRIPT_ID)?.src).toContain(MAPBOX_SDK_RELATIVE_PATH);
    appendChildSpy.mockRestore();
  });
});
