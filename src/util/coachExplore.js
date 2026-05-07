import { matchSportFilterKeys } from './sportFilterKeys';

/** Hosted listing flag PeakUp booking (Flex accetta anche stringhe). */
export const listingHasPeakupBookingFlag = listing => {
  const v = listing?.attributes?.publicData?.peakupBookingListing;
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
};

// Normalises a free-form sport label into a comparable key.
// Strips emojis, punctuation, accents-as-separators, whitespace, hyphens and
// underscores. Both sides of the SportBar filter pass through this, so the
// listing/profile data and the SportBar slug end up on the same shape.
//
// Examples:
//   'Surf'        → 'surf'
//   '🏄 Surf'     → 'surf'
//   'Cross-country' → 'crosscountry'
//   'freeride_snowboard' → 'freeridesnowboard'
const normalizeSportKey = sport =>
  String(sport || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');

/** @param {string} value sport bar value (e.g. snowboard, freeridesnowboard) */
export const selectedSportToFilterHyphen = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

/**
 * ISO 3166-1 alpha-2 → regional indicator flag emoji (e.g. CH → 🇨🇭).
 *
 * @param {string} code
 * @returns {string}
 */
export const countryCodeToFlagEmoji = code => {
  if (!code || typeof code !== 'string' || code.length !== 2) {
    return '';
  }
  const u = code.toUpperCase();
  const A = 'A'.charCodeAt(0);
  try {
    return String.fromCodePoint(0x1f1e6 + u.charCodeAt(0) - A, 0x1f1e6 + u.charCodeAt(1) - A);
  } catch {
    return '';
  }
};

/**
 * Read sport-ish keys from a free-form publicData object. Supports several
 * field-name conventions we've seen across listings and coach profiles
 * (`sports[]`, `sport`, `coachSports[]`, `activities[]`, `activity`, `category`).
 *
 * @param {Object|null|undefined} pd a publicData-like object
 * @returns {string[]} deduped, normalised sport keys
 */
const sportKeysFromPublicData = pd => {
  const data = pd || {};
  const raw = [];
  if (Array.isArray(data.sports)) raw.push(...data.sports);
  if (typeof data.sport === 'string') raw.push(data.sport);
  if (Array.isArray(data.coachSports)) raw.push(...data.coachSports);
  if (Array.isArray(data.activities)) raw.push(...data.activities);
  if (typeof data.activity === 'string') raw.push(data.activity);
  if (typeof data.category === 'string') raw.push(data.category);
  return [...new Set(raw.map(normalizeSportKey).filter(Boolean))];
};

/**
 * Read sport-ish keys from listing publicData (supports multiple conventions).
 *
 * @param {Object} listing denormalised listing
 * @returns {string[]} normalised sport keys (e.g. freeridesnowboard)
 */
export const extractSportKeysFromListing = listing =>
  sportKeysFromPublicData(listing?.attributes?.publicData);

/**
 * Read sport-ish keys from a coach's profile publicData. Coaches can declare
 * the sports they teach at the profile level (ProfileSettingsPage → "Coach &
 * sessions"), independently from any specific listing. Used together with
 * listing-level keys so the SportBar filter matches what the CoachCard shows.
 *
 * @param {Object|null|undefined} author user with `attributes.profile.publicData`
 * @returns {string[]} normalised sport keys
 */
export const extractSportKeysFromCoachProfile = author =>
  sportKeysFromPublicData(author?.attributes?.profile?.publicData);

export const pickRepresentativeListing = listings => {
  if (!listings?.length) {
    return null;
  }
  const peakup = listings.find(l => listingHasPeakupBookingFlag(l));
  if (peakup) return peakup;
  const withGeo = listings.find(l => l.attributes?.geolocation?.lat != null);
  return withGeo || listings[0];
};

/**
 * Group listings by author and build coach rows for explore UI.
 *
 * @param {Object[]} denormalisedListings listings with `author`
 * @returns {Object[]} coach summaries
 */
export const mergeListingsByAuthor = denormalisedListings => {
  const byAuthor = new Map();
  for (const listing of denormalisedListings) {
    const author = listing.author;
    const uuid = author?.id?.uuid;
    if (!uuid) continue;
    if (!byAuthor.has(uuid)) {
      byAuthor.set(uuid, []);
    }
    byAuthor.get(uuid).push(listing);
  }

  const coaches = [];
  for (const [, authorListings] of byAuthor) {
    const representativeListing = pickRepresentativeListing(authorListings);
    if (!representativeListing?.author) continue;

    const sportKeys = new Set();
    // Coach-level sports come first so coaches who declared sports only on
    // their profile (e.g. "Surf") still pass the SportBar filter even when no
    // listing publicData carries the sport keys.
    extractSportKeysFromCoachProfile(representativeListing.author).forEach(k =>
      sportKeys.add(k)
    );
    let minPrice = null;
    for (const l of authorListings) {
      extractSportKeysFromListing(l).forEach(k => sportKeys.add(k));
      const price = l.attributes?.price;
      if (price != null && typeof price.amount === 'number' && price.currency) {
        if (!minPrice || price.amount < minPrice.amount) {
          minPrice = price;
        }
      }
    }

    coaches.push({
      authorUuid: representativeListing.author.id.uuid,
      author: representativeListing.author,
      representativeListing,
      sportKeys: [...sportKeys],
      minPrice,
    });
  }
  return coaches;
};

/**
 * @param {Object[]} coaches from mergeListingsByAuthor
 * @param {string} selectedSport raw sport key from SportBar ('' = all)
 * @returns {Object[]}
 */
export const filterCoachesBySport = (coaches, selectedSport) => {
  const v = selectedSportToFilterHyphen(selectedSport);
  if (!v) return coaches.slice();

  const keys = new Set(matchSportFilterKeys(v).map(normalizeSportKey));
  return coaches.filter(c =>
    (c.sportKeys || []).some(sk => keys.has(normalizeSportKey(sk)))
  );
};

/**
 * Deep-link query for coach directory / map (?sport=&lat=&lng=&location=).
 *
 * @param {string} search window.location.search or equivalent
 */
export const parseCoachExploreSearch = search => {
  const raw =
    typeof search === 'string' && search.startsWith('?') ? search.slice(1) : String(search || '');
  const params = new URLSearchParams(raw);
  const sportKey = String(params.get('sport') || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

  const userLatParsed = Number.parseFloat(params.get('lat'));
  const userLngParsed = Number.parseFloat(params.get('lng'));
  const userLat = Number.isFinite(userLatParsed) ? userLatParsed : null;
  const userLng = Number.isFinite(userLngParsed) ? userLngParsed : null;
  const locationLabel = String(params.get('location') || '').trim();

  return { sportKey, userLat, userLng, locationLabel };
};

/**
 * @param {string} slug sport key / URL segment
 * @returns {string}
 */
export const formatCoachExploreSportSlug = slug => {
  const raw = String(slug || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  if (!raw) return '';
  return raw
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const deg2rad = deg => (deg * Math.PI) / 180;

/**
 * Haversine distance in km (coach listing geolocation ↔ user/search origin).
 *
 * @returns {number|null}
 */
export const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  if (
    typeof lat1 !== 'number' ||
    typeof lng1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lng2 !== 'number' ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return null;
  }
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Sort merged coach rows by distance to user's coordinates using each row's representative listing geolocation.
 * Rows without usable geolocation are pushed to the end.
 *
 * @param {Object[]} coaches from mergeListingsByAuthor enrich flow
 */
export const sortCoachRowsByDistanceKm = (coaches, userLat, userLng) => {
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) {
    return coaches.slice();
  }
  return [...coaches]
    .map(c => {
      const geo = c.representativeListing?.attributes?.geolocation;
      const lat = geo?.lat;
      const lng = geo?.lng;
      const km =
        typeof lat === 'number' && typeof lng === 'number'
          ? haversineDistanceKm(userLat, userLng, lat, lng)
          : null;
      return { row: c, km };
    })
    .sort((a, b) => {
      if (a.km == null && b.km == null) return 0;
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    })
    .map(x => x.row);
};

/**
 * Plain bounds for Redux (serializable). SW / NE corners.
 *
 * @param {{ lat: number, lng: number }[]} coords
 * @returns {{ swLat: number, swLng: number, neLat: number, neLng: number } | null}
 */
export const boundsPlainFromCoordinates = coords => {
  const valid = coords.filter(c => c && Number.isFinite(c.lat) && Number.isFinite(c.lng));
  if (!valid.length) {
    return null;
  }
  let south = valid[0].lat;
  let north = valid[0].lat;
  let west = valid[0].lng;
  let east = valid[0].lng;
  for (const c of valid) {
    south = Math.min(south, c.lat);
    north = Math.max(north, c.lat);
    west = Math.min(west, c.lng);
    east = Math.max(east, c.lng);
  }
  const padLat = Math.max((north - south) * 0.15, 0.08);
  const padLng = Math.max((east - west) * 0.15, 0.12);
  return {
    swLat: south - padLat,
    swLng: west - padLng,
    neLat: north + padLat,
    neLng: east + padLng,
  };
};

export const fallbackAlpsBoundsPlain = () => ({
  swLat: 45.55,
  swLng: 5.4,
  neLat: 48.25,
  neLng: 11.35,
});

/**
 * @param {{ swLat: number, swLng: number, neLat: number, neLng: number } | null | undefined} plain
 * @param {Object} sdkTypes Sharetribe SDK types (LatLng, LatLngBounds)
 */
export const sdkBoundsFromPlain = (plain, sdkTypes) => {
  if (!plain) return null;
  const { LatLng, LatLngBounds } = sdkTypes;
  return new LatLngBounds(
    new LatLng(plain.swLat, plain.swLng),
    new LatLng(plain.neLat, plain.neLng)
  );
};
