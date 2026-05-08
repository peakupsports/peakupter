import { coachCityCenter, coachCityLabel } from '../config/configCoachCity';
import { deriveCountryCodeFromPlace, derivePlaceShortLabel } from './coachExplore';

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
 *
 * Single-field UX: the coach now fills only one Mapbox autocomplete
 * ("Where do you coach?"). From that value we derive every downstream
 * piece of data:
 *
 *   - `lat` / `lng`            → precise coordinates for the map marker
 *   - `location` object        → Sharetribe-shaped address + bounds for
 *                                map popup, listing geocoding parity,
 *                                Console editing
 *   - `coachCityText`          → SHORT editorial label for the figurina
 *                                / coach card (e.g. "St. Moritz" — never
 *                                the full Mapbox address). Stored for
 *                                back-compat with legacy data and for
 *                                fast access in components that don't
 *                                want to re-derive it.
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
    // Derive the ISO-2 country code of the coaching place (NOT the
    // coach's nationality). Persisted onto `selectedPlace.countryCode`
    // so subsequent renders read it directly without re-parsing the
    // address tail every time. Mapbox returns addresses in English by
    // default for the worldwide search, so we use 'en' for the reverse
    // lookup at save time. The runtime helper (`deriveCountryCodeFromPlace`)
    // also re-derives from the address tail in the requested locale, as
    // a defensive fallback for non-English saves.
    const countryCode = deriveCountryCodeFromPlace(value, 'en');
    const selectedPlace = {
      address,
      origin: { lat, lng },
      ...(countryCode ? { countryCode } : {}),
      ...(sp?.bounds && typeof sp.bounds === 'object' ? { bounds: sp.bounds } : {}),
    };
    // Derived short label ("St. Moritz" from "St. Moritz, Grisons,
    // Switzerland"). Falls back to the full address when the place data
    // is too sparse to derive a clean head segment.
    const shortLabel = derivePlaceShortLabel(value) || address;
    return {
      lat,
      lng,
      coachCityText: shortLabel,
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
