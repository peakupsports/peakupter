import { coachCityCenter, coachCityLabel } from '../config/configCoachCity';

const finiteNum = v => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Lat/lng stored under Sharetribe-style `publicData.location.selectedPlace.origin` (Console / user fields).
 *
 * @param {Object} [publicData]
 * @returns {{ lat: number|null, lng: number|null }}
 */
export const originFromPublicDataLocationField = publicData => {
  const pd = publicData || {};
  const o = pd.location?.selectedPlace?.origin;
  if (!o || typeof o !== 'object') {
    return { lat: null, lng: null };
  }
  return { lat: finiteNum(o.lat), lng: finiteNum(o.lng) };
};

/**
 * Build Final Form value for {@link FieldLocationAutocompleteInput} from profile `publicData`.
 * Supports: top-level `lat`/`lng`, Console `location` object, then legacy Swiss `coachCity` slug.
 *
 * @param {Object} [publicData]
 * @returns {{ search: string, selectedPlace: { address: string, origin: { lat: number, lng: number }, bounds?: object }|null }}
 */
export const coachMapLocationFromPublicData = (publicData = {}) => {
  const pd = publicData || {};
  const latTop = finiteNum(pd.lat) ?? finiteNum(pd.latitude);
  const lngTop = finiteNum(pd.lng) ?? finiteNum(pd.longitude);
  const address =
    pd.coachCityText != null && String(pd.coachCityText).trim()
      ? String(pd.coachCityText).trim()
      : '';

  if (latTop != null && lngTop != null) {
    const display = address || `${latTop}, ${lngTop}`;
    return {
      search: display,
      selectedPlace: {
        address: display,
        origin: { lat: latTop, lng: lngTop },
      },
    };
  }

  const { lat: latLoc, lng: lngLoc } = originFromPublicDataLocationField(pd);
  if (latLoc != null && lngLoc != null) {
    const loc = pd.location || {};
    const search = typeof loc.search === 'string' ? loc.search.trim() : '';
    const sp = loc.selectedPlace || {};
    const addr =
      (typeof sp.address === 'string' && sp.address.trim()) ||
      search ||
      address ||
      `${latLoc}, ${lngLoc}`;
    return {
      search: search || addr,
      selectedPlace: {
        address: addr,
        origin: { lat: latLoc, lng: lngLoc },
        ...(sp.bounds && typeof sp.bounds === 'object' ? { bounds: sp.bounds } : {}),
      },
    };
  }

  const slugRaw = pd.coachCity != null && String(pd.coachCity).trim() ? String(pd.coachCity) : '';
  const slug = slugRaw.toLowerCase().trim();
  if (slug) {
    const c = coachCityCenter(slug);
    if (c && typeof c.lat === 'number' && typeof c.lng === 'number') {
      const label = coachCityLabel(slug);
      const display = address || label;
      return {
        search: display,
        selectedPlace: {
          address: display,
          origin: { lat: c.lat, lng: c.lng },
        },
      };
    }
  }

  return { search: '', selectedPlace: null };
};

/**
 * Patch to merge into `profile.publicData` from the coach map location field.
 * Persists both flat `lat`/`lng` (for figurina) and Sharetribe `location` object (Console-friendly).
 *
 * @param {*} value Form value for `pub_coachMapLocation`
 * @returns {Object} Keys may include `lat`, `lng`, `coachCityText`, `coachCity`, `location`
 */
export const publicDataPatchFromCoachMapLocation = value => {
  const loc = value || {};
  const sp = loc.selectedPlace;
  const origin = sp?.origin;
  const lat = finiteNum(origin?.lat);
  const lng = finiteNum(origin?.lng);
  const addressRaw = sp?.address != null ? String(sp.address).trim() : '';
  const address = addressRaw || (lat != null && lng != null ? `${lat}, ${lng}` : '');
  const searchStr =
    typeof loc.search === 'string' && loc.search.trim() ? loc.search.trim() : address;

  if (lat != null && lng != null) {
    const selectedPlace = {
      address,
      origin: { lat, lng },
      ...(sp?.bounds && typeof sp.bounds === 'object' ? { bounds: sp.bounds } : {}),
    };
    return {
      lat,
      lng,
      coachCityText: address,
      coachCity: null,
      location: {
        predictions: Array.isArray(loc.predictions) ? loc.predictions : [],
        search: searchStr,
        selectedPlace,
      },
    };
  }

  return {
    lat: null,
    lng: null,
    coachCityText: null,
    coachCity: null,
    location: null,
  };
};
