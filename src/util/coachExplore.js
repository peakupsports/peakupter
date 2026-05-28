import { coachCityLabel } from '../config/configCoachCity';
import { matchSportFilterKeys } from './sportFilterKeys';
import { getLowestCoachHourlyBookingPrice } from './coachHourlyPrice';

/** Hosted listing flag PeakUp booking (Flex accetta anche stringhe). */
export const listingHasPeakupBookingFlag = listing => {
  const v = listing?.attributes?.publicData?.peakupBookingListing;
  if (v === true) return true;
  if (typeof v === 'string') return v.toLowerCase() === 'true';
  return false;
};

const isTruthyPublicDataFlag = value => {
  if (value === true) return true;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

/**
 * Technical / internal listings hidden from public browse UI (search, coaches, map, profile gallery).
 * Does not affect pickRepresentativeListing, contact, checkout, or inbox when passed the full listing set.
 */
export const isListingHiddenFromPublic = listing => {
  if (listingHasPeakupBookingFlag(listing)) return true;
  const pd = listing?.attributes?.publicData || {};
  return isTruthyPublicDataFlag(pd.hiddenFromPublic);
};

/** @param {Object[]} listings */
export const filterListingsForPublicBrowsing = (listings = []) => {
  const list = Array.isArray(listings) ? listings : [];
  return list.filter(l => !isListingHiddenFromPublic(l));
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
export const normalizeSportKey = sport =>
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

// ───────────────────────── Seasonal sport ordering ─────────────────────────
//
// Shared seasonal sport order used by surfaces that need to surface
// in-season disciplines first (currently the LandingPage "Your sport"
// search dropdown). Keys are NORMALIZED (lowercase, no spaces / hyphens /
// underscores) so they line up with whatever casing/spacing the hosted
// Sharetribe Console category IDs use ("Sky Dive", "WakeBoarding",
// "Cross-Country", "TeleMark" all collapse to the same key via
// `normalizeSportKey`).
//
// Winter = November → April (months 10, 11, 0, 1, 2, 3) — same calendar
// boundary as `getCoachMapDisciplinesForSeason` in CoachMapPage so the
// two surfaces flip seasons together.
//
// Note on `telemark`: not currently in the platform sports taxonomy
// (`PROFILE_SPORT_DISPLAY_LABELS`, `SPORT_LABELS`, `peakUpCoachUserFields`,
// `getCoachMapDisciplinesForSeason`). Listed here so that the day a
// hosted category named "TeleMark" is added in Console, it appears in the
// correct seasonal slot without any extra code change. While dormant the
// extra entry is a harmless no-op (only surfaces when a matching
// category exists in the input list).
const SEARCH_SPORT_WINTER_ORDER = [
  'snowboard',
  'ski',
  'crosscountry',
  'telemark',
  'mtb',
  'tennis',
  'golf',
  'surf',
  'wakeboard',
  // `wakesurf` is a separate bookable sport (NOT a Wakeboard variant).
  // Listed adjacent to `wakeboard` so both surface together in the
  // off-season tail during winter.
  'wakesurf',
  'kitesurf',
  'skydive',
  'climbing',
  'fitness',
  'yoga',
];

const SEARCH_SPORT_SUMMER_ORDER = [
  'mtb',
  'surf',
  'wakeboard',
  // `wakesurf` is a separate top-level summer water sport — keeps its
  // own slot next to `wakeboard` / `kitesurf` in the summer lead-block.
  'wakesurf',
  'kitesurf',
  'skydive',
  'climbing',
  'tennis',
  'golf',
  'fitness',
  'yoga',
  'snowboard',
  'ski',
  'crosscountry',
  'telemark',
];

// Hosted Sharetribe Console category IDs sometimes use the gerund form
// (e.g. `WakeBoarding`) of a sport that the platform taxonomy stores
// under a shorter canonical key (`wakeboard`). After `normalizeSportKey`
// these collapse to `wakeboarding`/`wakeboard` and stop matching each
// other, which silently dumps the category into the leftover tail of
// the seasonal sort.
//
// This alias map resolves common gerund variants back to the canonical
// platform key BEFORE the seasonal index lookup. Scoped to the seasonal
// sort only — `normalizeSportKey` itself stays minimal so global filter
// matching, marker glyph dispatch, etc. behave exactly as before.
//
// Add new entries here as needed when a hosted category ID drifts from
// the canonical platform key. Keys/values are already normalised
// (lowercase, no whitespace / hyphens / underscores).
const SEARCH_SPORT_KEY_ALIASES = {
  wakeboarding: 'wakeboard',
  // Defensive alias: if a Console category is added as "Wakesurfing", it
  // collapses to `wakesurfing` after `normalizeSportKey` and resolves to
  // the canonical platform key `wakesurf`. The platform sports list uses
  // `wakesurf`; this alias only kicks in if hosted data drifts.
  wakesurfing: 'wakesurf',
  snowboarding: 'snowboard',
  skiing: 'ski',
  surfing: 'surf',
  kitesurfing: 'kitesurf',
  skydiving: 'skydive',
};

/**
 * Pick the seasonal sport order. Winter (Nov–Apr) leads with snow sports;
 * summer (May–Oct) leads with MTB / Surf and pushes snow sports to the back.
 * Date is injected so callers can unit-test deterministically.
 *
 * @param {Date} [date] defaults to current calendar date
 * @returns {string[]} array of normalised sport keys in seasonal order
 */
export const getSeasonalSportOrder = (date = new Date()) => {
  const month = typeof date.getMonth === 'function' ? date.getMonth() : new Date().getMonth();
  const isWinter = month >= 10 || month <= 3;
  return (isWinter ? SEARCH_SPORT_WINTER_ORDER : SEARCH_SPORT_SUMMER_ORDER).slice();
};

/**
 * Stable-sort `items` by the seasonal sport order. `getKey(item)` extracts
 * the sport key from each item (e.g. category id, listing publicData
 * sport, etc.) — the key is:
 *   1. normalised via `normalizeSportKey` (lowercase, alphanumeric only),
 *   2. resolved via `SEARCH_SPORT_KEY_ALIASES` so common gerund forms
 *      (`wakeboarding`, `snowboarding`, `skiing`, `surfing`,
 *      `kitesurfing`, `skydiving`) match their canonical platform key,
 *   3. matched against the seasonal order array.
 *
 * Items whose key is NOT in the seasonal order (after alias resolution)
 * are pushed to the tail in their original input order, so unknown /
 * future hosted categories are never silently dropped — they just
 * appear after the known sports.
 *
 * Pure / non-mutating: returns a new array, leaves the input untouched.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getKey
 * @param {Date} [date]
 * @returns {T[]} new array sorted by seasonal index, original order on ties
 */
export const sortSportsBySeason = (items, getKey, date) => {
  if (!Array.isArray(items)) return items;
  const order = getSeasonalSportOrder(date);
  const indexOf = key => {
    const normalized = normalizeSportKey(key);
    const canonical = SEARCH_SPORT_KEY_ALIASES[normalized] || normalized;
    const idx = order.indexOf(canonical);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  return items
    .map((item, originalIdx) => ({
      item,
      idx: indexOf(typeof getKey === 'function' ? getKey(item) : ''),
      originalIdx,
    }))
    .sort((a, b) => (a.idx !== b.idx ? a.idx - b.idx : a.originalIdx - b.originalIdx))
    .map(x => x.item);
};

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
 * Shape detector for "lat, lng" / "12.34, -56.78" style strings — two finite
 * decimal numbers separated by a comma. We must NEVER show such a string as a
 * coach's location label (the value is sometimes the unfiltered LocationAutocomplete
 * `search` field, e.g. when a user pastes raw coordinates).
 *
 * @param {*} value
 * @returns {boolean}
 */
const COORDINATE_LIKE_RE = /^\s*-?\d+(?:\.\d+)?\s*[,;]\s*-?\d+(?:\.\d+)?\s*$/;
export const looksLikeCoordinates = value =>
  typeof value === 'string' && COORDINATE_LIKE_RE.test(value);

/**
 * Trim a candidate location string and reject coordinate-shaped values.
 * Returns `null` when the value is not a usable human-readable label.
 *
 * @param {*} value
 * @returns {string|null}
 */
const sanitizeLocationText = value => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (looksLikeCoordinates(trimmed)) return null;
  return trimmed;
};

/**
 * Lightweight typographic normalization for location strings:
 *
 *   - "St.Moritz" → "St. Moritz"     (insert space after a period that is
 *                                     immediately followed by a letter,
 *                                     so abbreviated saints/markers render
 *                                     consistently regardless of how the
 *                                     coach typed them)
 *   - collapse runs of whitespace into a single space
 *   - dedupe identical adjacent tokens within a single segment
 *     ("Laax Laax" → "Laax")
 *
 * Segment-level deduplication ("Laax, Laax, Switzerland" → "Laax,
 * Switzerland") is handled separately by `cleanLocationAddress`, because
 * it operates on whole comma-delimited segments after this primitive
 * has cleaned each one individually.
 *
 * @param {*} value
 * @returns {string|null}
 */
const normalizeLocationText = value => {
  const cleaned = sanitizeLocationText(value);
  if (!cleaned) return null;
  let normalized = cleaned.replace(/\.([A-Za-z])/g, '. $1').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  // Dedupe identical adjacent tokens within a single segment, e.g.
  // "Laax Laax" → "Laax", "St. Moritz St. Moritz" → "St. Moritz".
  const tokens = normalized.split(' ');
  const dedupedTokens = [];
  for (const t of tokens) {
    if (
      dedupedTokens.length === 0 ||
      dedupedTokens[dedupedTokens.length - 1].toLowerCase() !== t.toLowerCase()
    ) {
      dedupedTokens.push(t);
    }
  }
  return dedupedTokens.join(' ');
};

/**
 * Take a free-form address (e.g. "St. Moritz, Maloja District, Grisons,
 * Switzerland") and return the first comma-delimited segment ("St. Moritz").
 * Coordinate-shaped values are rejected. This is the primitive used to
 * derive a short, premium-looking location label for figurine cards from
 * any saved location source — even legacy data that stored the full
 * Mapbox address in `publicData.coachCityText`.
 *
 * The returned segment is normalized via `normalizeLocationText`, so
 * "St.Moritz" (no space) renders as "St. Moritz" and accidental token
 * repetitions ("Laax Laax") collapse to a single token.
 *
 * @param {*} value
 * @returns {string|null}
 */
const firstAddressSegment = value => {
  const cleaned = sanitizeLocationText(value);
  if (!cleaned) return null;
  const head = cleaned.split(',')[0].trim();
  return normalizeLocationText(head);
};

/**
 * Clean a free-form address into a single, normalized line suitable for the
 * "Location" box on `ProfilePage`. Splits on commas, normalizes each segment
 * (whitespace + abbreviation spacing + intra-segment token dedup), drops
 * empty segments, and dedupes identical adjacent segments.
 *
 *   "Laax Laax, Grisons, Switzerland"      → "Laax, Grisons, Switzerland"
 *   "Laax, Laax, Switzerland"              → "Laax, Switzerland"
 *   "St.Moritz, Maloja District, Grisons,  → "St. Moritz, Maloja District,
 *    Switzerland"                              Grisons, Switzerland"
 *   "46.80, 9.25" (raw coordinates)        → null
 *
 * @param {*} value
 * @returns {string|null}
 */
const cleanLocationAddress = value => {
  const cleaned = sanitizeLocationText(value);
  if (!cleaned) return null;
  const segments = cleaned
    .split(',')
    .map(s => normalizeLocationText(s))
    .filter(Boolean);
  if (segments.length === 0) return null;
  const deduped = [];
  for (const seg of segments) {
    if (
      deduped.length === 0 ||
      deduped[deduped.length - 1].toLowerCase() !== seg.toLowerCase()
    ) {
      deduped.push(seg);
    }
  }
  return deduped.join(', ');
};

/**
 * Derive a short editorial label from the saved Mapbox autocomplete value
 * (`publicData.location` / `publicData.coachMapLocation`).
 *
 * Priority:
 *   1. `selectedPlace.name` / `selectedPlace.placeName` if set (Mapbox sometimes
 *      ships a primary place name alongside the full address).
 *   2. First comma-delimited segment of `selectedPlace.address`.
 *   3. First comma-delimited segment of the autocomplete `search` field (rarely
 *      different from `address`, but useful as a last resort).
 *
 * Examples:
 *   { selectedPlace: { address: 'St. Moritz, Grisons, Switzerland' } } → 'St. Moritz'
 *   { selectedPlace: { address: 'Laax, Grisons, Switzerland' } }       → 'Laax'
 *   { selectedPlace: { address: 'Lisbon, Portugal' } }                 → 'Lisbon'
 *
 * Coordinate-shaped strings (e.g. "46.80, 9.25") are explicitly rejected so
 * the figurina never shows raw lat/lng.
 *
 * @param {*} location  the Final Form value of `pub_coachMapLocation`, or the
 *                      Sharetribe `publicData.location` object
 * @returns {string|null}
 */
export const derivePlaceShortLabel = location => {
  if (!location || typeof location !== 'object') return null;
  const sp = location.selectedPlace || {};
  const fromName =
    firstAddressSegment(sp.name) ||
    firstAddressSegment(sp.placeName) ||
    firstAddressSegment(sp.text);
  if (fromName) return fromName;
  const fromAddr = firstAddressSegment(sp.address);
  if (fromAddr) return fromAddr;
  return firstAddressSegment(location.search);
};

/**
 * Try to extract a human-readable address from a LocationAutocomplete value or
 * a free-form string saved on `publicData.location`. Intentionally avoids the
 * `value.search` fallback that `normalizeExtendedDataTextForDisplay` uses,
 * because coaches sometimes paste raw coordinates into the search field.
 *
 * @param {*} loc
 * @returns {string|null}
 */
const readSelectedPlaceAddress = loc => {
  if (!loc) return null;
  if (typeof loc === 'string') return sanitizeLocationText(loc);
  if (typeof loc !== 'object') return null;
  const fromSelected =
    loc.selectedPlace && typeof loc.selectedPlace === 'object'
      ? sanitizeLocationText(loc.selectedPlace.address)
      : null;
  if (fromSelected) return fromSelected;
  const fromObj = sanitizeLocationText(loc.address);
  if (fromObj) return fromObj;
  return null;
};

/**
 * ISO-2 country code → display name in the given locale (e.g. `PT` + `en` →
 * `"Portugal"`). Falls back to the raw code when `Intl.DisplayNames` is not
 * available or the value is already a long-form name.
 *
 * @param {*} code
 * @param {string} [locale='en']
 * @returns {string|null}
 */
export const countryDisplayName = (code, locale = 'en') => {
  if (!code) return null;
  const cleaned = String(code).trim();
  if (!cleaned) return null;
  // Already a long-form name (e.g. "Portugal", "United States"): keep as-is.
  if (cleaned.length !== 2) return cleaned;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'region' });
    return dn.of(cleaned.toUpperCase()) || cleaned.toUpperCase();
  } catch {
    return cleaned.toUpperCase();
  }
};

// Reverse-mapping cache: per-locale Map<lowercased display name, ISO-2 code>.
// Built lazily by iterating the 26×26 letter pairs through `Intl.DisplayNames`,
// which gives us ~250 valid country codes mapped to their localized name.
// Cached because building the map costs ~500 `dn.of()` calls.
const _countryNameToCodeCache = new Map();
const buildCountryNameToCodeMap = (locale = 'en') => {
  const key = String(locale || 'en').toLowerCase();
  if (_countryNameToCodeCache.has(key)) {
    return _countryNameToCodeCache.get(key);
  }
  const map = new Map();
  let dn;
  try {
    dn = new Intl.DisplayNames([key], { type: 'region' });
  } catch {
    _countryNameToCodeCache.set(key, map);
    return map;
  }
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const code = String.fromCharCode(65 + i, 65 + j);
      let name;
      try {
        name = dn.of(code);
      } catch {
        continue;
      }
      if (!name || name === code) continue;
      const key = name.toLowerCase();
      // Don't overwrite existing entries: the FIRST matching code wins.
      // This protects against deprecated / ambiguous codes that share a
      // display name with a current code — e.g. `FX` (Metropolitan France,
      // deprecated) vs `FR` (France). Iterating A→Z, the canonical code
      // (FR) is registered first; the deprecated alias (FX) is skipped.
      if (!map.has(key)) {
        map.set(key, code);
      }
    }
  }
  _countryNameToCodeCache.set(key, map);
  return map;
};

/**
 * Reverse `Intl.DisplayNames`: localized country display name → ISO-2 code.
 * Tries the requested locale first, then falls back to English (covers the
 * common case where Mapbox returns English place names regardless of the
 * UI locale).
 *
 *   "Switzerland" → "CH"
 *   "Schweiz"     → "CH" (with locale 'de')
 *   "Italie"      → "IT" (with locale 'fr')
 *
 * @param {*} name
 * @param {string} [locale='en']
 * @returns {string} ISO-2 code uppercased, or '' when no match is found.
 */
export const countryDisplayNameToCode = (name, locale = 'en') => {
  if (typeof name !== 'string') return '';
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return '';
  const primary = buildCountryNameToCodeMap(locale);
  const fromPrimary = primary.get(trimmed);
  if (fromPrimary) return fromPrimary;
  if (String(locale || '').toLowerCase() !== 'en') {
    const fallback = buildCountryNameToCodeMap('en');
    const fromFallback = fallback.get(trimmed);
    if (fromFallback) return fromFallback;
  }
  return '';
};

/**
 * Derive an ISO-2 country code from a saved Mapbox autocomplete value
 * (`publicData.location` / `publicData.coachMapLocation`). Used to render
 * the country flag inside the figurina's location pill — the flag must
 * represent the **coaching place**, not the coach's nationality
 * (`publicData.country`).
 *
 * Priority:
 *   1. `selectedPlace.countryCode` if previously persisted by the form
 *      patcher (fast path for new saves).
 *   2. Last comma-delimited segment of `selectedPlace.address` matched
 *      against `Intl.DisplayNames` (e.g. "Switzerland" → "CH").
 *   3. Second-to-last segment, in case the address ends with a postal /
 *      administrative suffix (rare with Mapbox forward geocoding output,
 *      but possible).
 *   4. Same lookup against `location.search` as a last resort.
 *
 * @param {*} location
 * @param {string} [locale='en']
 * @returns {string} ISO-2 country code uppercased, or '' when undetermined.
 */
export const deriveCountryCodeFromPlace = (location, locale = 'en') => {
  if (!location || typeof location !== 'object') return '';
  const sp = location.selectedPlace || {};
  // 1. Fast path: explicit code captured at save time.
  const explicit =
    typeof sp.countryCode === 'string' && sp.countryCode.trim().length === 2
      ? sp.countryCode.trim().toUpperCase()
      : typeof sp.country === 'string' && sp.country.trim().length === 2
        ? sp.country.trim().toUpperCase()
        : '';
  if (explicit) return explicit;
  // 2/3/4: derive from address segments.
  const candidates = [sp.address, location.search];
  for (const candidate of candidates) {
    const cleaned = sanitizeLocationText(candidate);
    if (!cleaned) continue;
    const segments = cleaned
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (!segments.length) continue;
    // Try last segment first (most addresses end with country).
    const tail = segments[segments.length - 1];
    const fromTail = countryDisplayNameToCode(tail, locale);
    if (fromTail) return fromTail;
    if (segments.length > 1) {
      const tailMinus1 = segments[segments.length - 2];
      const fromTailM1 = countryDisplayNameToCode(tailMinus1, locale);
      if (fromTailM1) return fromTailM1;
    }
  }
  return '';
};

/**
 * Build a human-readable location label for a coach row (Coach Map sidebar
 * card + Mapbox popup). Coordinates must NEVER be returned as a primary label
 * — they are only meaningful for positioning the marker on the map.
 *
 * Sources, in order of preference:
 *   1. coach.locationLabel / coach.locationName / coach.workingLocationLabel /
 *      coach.cityCountry (caller-prepared overrides)
 *   2. profile publicData: locationName, workingLocationLabel, coachCityText,
 *      location.selectedPlace.address (geocoded address from LocationAutocomplete)
 *   3. listing publicData fallback: location.selectedPlace.address
 *   4. Composed `City, Country` from coachCity slug + country code
 *   5. Country alone (long-form display name from ISO-2 code)
 *
 * @param {Object} coach   `{ author, representativeListing, locationLabel?, … }`
 * @param {Object} [opts]
 * @param {Object} [opts.intl]   react-intl object (for locale-aware country names)
 * @param {string} [opts.locale] explicit locale (defaults to `intl.locale` or 'en')
 * @returns {string|null}        human-readable label, or `null` when nothing usable
 *                               is available — callers may then surface a "—" or
 *                               fall back to the raw coordinates if they really
 *                               want to.
 */
export const getCoachDisplayLocation = (coach, opts = {}) => {
  if (!coach) return null;
  const locale = opts.locale || opts.intl?.locale || 'en';

  const pd = coach.author?.attributes?.profile?.publicData || {};
  const lp = coach.representativeListing?.attributes?.publicData || {};

  const ordered = [
    coach.locationLabel,
    coach.locationName,
    coach.workingLocationLabel,
    coach.cityCountry,
    pd.locationName,
    pd.workingLocationLabel,
    pd.coachCityText,
    readSelectedPlaceAddress(pd.location),
    readSelectedPlaceAddress(lp.location),
  ];
  for (const candidate of ordered) {
    const cleaned = sanitizeLocationText(candidate);
    if (cleaned) return cleaned;
  }

  // Composed "City, Country" fallback — derive the city label from the
  // configured `coachCity` slug when available, then either source's country.
  const citySlug =
    pd.coachCity != null && String(pd.coachCity).trim()
      ? String(pd.coachCity).trim().toLowerCase()
      : '';
  const cityFromSlug = citySlug ? sanitizeLocationText(coachCityLabel(citySlug)) : null;
  const city =
    sanitizeLocationText(coach.city) || sanitizeLocationText(pd.city) || cityFromSlug;
  const countryRaw = coach.country || pd.country || lp.country || null;
  const country = sanitizeLocationText(countryDisplayName(countryRaw, locale));

  if (city && country && city !== country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
};

/**
 * Visual short location label for the figurina coach card.
 *
 * The figurina is the editorial face of the coach — it must read like a
 * place pill ("Laax", "St. Moritz", "Lisbon"), never a long Mapbox
 * address. The form in ProfileSettings now collects a SINGLE Mapbox
 * autocomplete value ("Where do you coach?") and we derive the short
 * label from that place at render time (and at save time, to keep
 * `publicData.coachCityText` in sync as a back-compat fallback).
 *
 * Sources, in order of preference:
 *   1. Caller-prepared overrides (`coach.locationLabel`, etc.) — short-cut
 *      to the first comma-delimited segment so even long override values
 *      collapse to a clean place name.
 *   2. Profile publicData explicit short-label fields (`locationName`,
 *      `workingLocationLabel`, `coachCityText`). Each is also shortened
 *      to its first segment, so legacy data that stored the full
 *      Mapbox address in `coachCityText` still renders as a clean place
 *      name on the figurina.
 *   3. Derived from the saved Mapbox autocomplete value
 *      (`pd.location.selectedPlace`). This is the canonical source for
 *      coaches who saved their profile after the single-field refactor.
 *   4. Listing-level Mapbox value (`lp.location.selectedPlace`).
 *   5. Composed `City, Country` from explicit fields / `coachCity` slug.
 *   6. Country alone (long-form from ISO-2 code).
 *
 * @param {Object} coach   `{ author, representativeListing, locationLabel?, … }`
 * @param {Object} [opts]
 * @param {Object} [opts.intl]   react-intl object (locale-aware country names)
 * @param {string} [opts.locale] explicit locale (defaults to `intl.locale` or 'en')
 * @returns {string|null}        short visual label, or `null` when nothing
 *                               usable is available. Callers must NOT
 *                               recover by surfacing the raw coordinates.
 */
export const getCoachShortLocationLabel = (coach, opts = {}) => {
  if (!coach) return null;
  const locale = opts.locale || opts.intl?.locale || 'en';

  const pd = coach.author?.attributes?.profile?.publicData || {};
  const lp = coach.representativeListing?.attributes?.publicData || {};

  // 1+2: Visual short-label sources, defensively shortened to first segment.
  // This makes legacy data with a long address in `coachCityText` collapse
  // to "St. Moritz" instead of leaking the Maloja District / Grisons /
  // Switzerland tail.
  const visualOrdered = [
    coach.locationLabel,
    coach.locationName,
    coach.workingLocationLabel,
    coach.cityCountry,
    pd.locationName,
    pd.workingLocationLabel,
    pd.coachCityText,
    pd.teamCityText,
  ];
  for (const candidate of visualOrdered) {
    const cleaned = firstAddressSegment(candidate);
    if (cleaned) return cleaned;
  }

  // 3+4: Derive from the saved Mapbox autocomplete value(s).
  const fromProfilePlace = derivePlaceShortLabel(pd.location);
  if (fromProfilePlace) return fromProfilePlace;
  const fromListingPlace = derivePlaceShortLabel(lp.location);
  if (fromListingPlace) return fromListingPlace;

  // 5+6: Composed City/Country / country-only fallback.
  const citySlug =
    pd.coachCity != null && String(pd.coachCity).trim()
      ? String(pd.coachCity).trim().toLowerCase()
      : '';
  const cityFromSlug = citySlug ? sanitizeLocationText(coachCityLabel(citySlug)) : null;
  const city =
    sanitizeLocationText(coach.city) || sanitizeLocationText(pd.city) || cityFromSlug;
  const countryRaw = coach.country || pd.country || lp.country || null;
  const country = sanitizeLocationText(countryDisplayName(countryRaw, locale));

  if (city && country && city !== country) return `${city}, ${country}`;
  if (city) return city;
  if (country) return country;
  return null;
};

/**
 * Full clean location label for the "Location" box on `ProfilePage`.
 *
 * Counterpart to `getCoachShortLocationLabel`. Where the short helper
 * collapses to a single place name for the figurina pill ("Laax",
 * "St. Moritz"), this helper preserves the full editorial address —
 * "Laax, Grisons, Switzerland" — so the right-column Location section
 * always reads as a complete, readable line. Both helpers share the
 * same input shape, so callers can render the figurina and the box
 * from the same source object.
 *
 * Sources, in order of preference:
 *   1. Caller-prepared full overrides (`coach.locationLabel`,
 *      `coach.locationName`, `coach.workingLocationLabel`) — left
 *      verbatim (just normalized) so embeddings can pass a curated
 *      multi-segment label.
 *   2. Profile publicData Mapbox geocoded address
 *      (`pd.location.selectedPlace.address`) — canonical source for
 *      coaches who saved their profile after the single-field refactor.
 *   3. Listing-level Mapbox address (`lp.location.selectedPlace.address`).
 *   4. Profile publicData explicit short fields (`pd.locationName`,
 *      `pd.workingLocationLabel`, `pd.coachCityText`) — used as-is
 *      (possibly already short, in which case the composed fallback
 *      below adds region/country).
 *   5. Composed `City, Region, Country` from explicit publicData fields
 *      / `coachCity` slug + ISO-2 country code.
 *   6. Final fallback: the short label (so the box never renders empty
 *      when only short data exists).
 *
 * Coordinate-shaped strings are rejected at every step (handled by
 * `sanitizeLocationText` inside the cleaning primitives).
 *
 * @param {Object} coach   `{ author, representativeListing, locationLabel?, … }`
 * @param {Object} [opts]
 * @param {Object} [opts.intl]   react-intl object (locale-aware country names)
 * @param {string} [opts.locale] explicit locale (defaults to `intl.locale` or 'en')
 * @returns {string|null}        full clean location label, or `null` when
 *                               no usable data exists.
 */
export const getCoachFullLocationLabel = (coach, opts = {}) => {
  if (!coach) return null;
  const locale = opts.locale || opts.intl?.locale || 'en';

  const pd = coach.author?.attributes?.profile?.publicData || {};
  const lp = coach.representativeListing?.attributes?.publicData || {};

  // 1. Caller-supplied full overrides. Cleaned (de-duplicated, spaced)
  //    but not collapsed to the first segment — so callers can
  //    intentionally pass a multi-segment label.
  for (const candidate of [
    coach.locationLabel,
    coach.locationName,
    coach.workingLocationLabel,
    coach.cityCountry,
  ]) {
    const full = cleanLocationAddress(candidate);
    if (full && full.includes(',')) return full;
  }

  // 2. Profile-level Mapbox geocoded address (primary canonical source).
  const profileFull = cleanLocationAddress(pd.location?.selectedPlace?.address);
  if (profileFull) return profileFull;

  // 3. Listing-level Mapbox geocoded address (legacy/fallback).
  const listingFull = cleanLocationAddress(lp.location?.selectedPlace?.address);
  if (listingFull) return listingFull;

  // 4. Caller / profile short fields with a comma already inside (e.g.
  //    "Laax, Grisons, Switzerland" stored verbatim in `coachCityText`
  //    by legacy data) — accept them as full labels.
  for (const candidate of [
    coach.locationLabel,
    coach.locationName,
    coach.workingLocationLabel,
    pd.locationName,
    pd.workingLocationLabel,
    pd.coachCityText,
  ]) {
    const full = cleanLocationAddress(candidate);
    if (full && full.includes(',')) return full;
  }

  // 5. Composed `City, Region, Country` from explicit fields / slug.
  const citySlug =
    pd.coachCity != null && String(pd.coachCity).trim()
      ? String(pd.coachCity).trim().toLowerCase()
      : '';
  const cityFromSlug = citySlug ? sanitizeLocationText(coachCityLabel(citySlug)) : null;
  const cityFromShort = firstAddressSegment(pd.coachCityText);
  const city =
    sanitizeLocationText(coach.city) ||
    sanitizeLocationText(pd.city) ||
    cityFromSlug ||
    cityFromShort;
  const region =
    sanitizeLocationText(coach.region) ||
    sanitizeLocationText(pd.region) ||
    sanitizeLocationText(pd.coachRegion) ||
    null;
  const countryRaw = coach.country || pd.country || lp.country || null;
  const country = sanitizeLocationText(countryDisplayName(countryRaw, locale));

  const composed = [city, region, country]
    .filter(Boolean)
    .filter((part, idx, arr) => idx === 0 || part.toLowerCase() !== arr[idx - 1].toLowerCase());
  if (composed.length >= 2) return composed.join(', ');

  // 6. Final fallback: short label (the box never renders empty when
  //    we have at least a single-token piece of location data).
  return getCoachShortLocationLabel(coach, opts);
};

/**
 * Medium-length location label for the **CoachMap sidebar card** and the
 * **Mapbox popup**. Format: `City, Country` (e.g. "St. Moritz,
 * Switzerland"), never the full Mapbox address with district / canton
 * tail and never the city alone when the country is recoverable.
 *
 * Why this is a separate helper:
 *   - `getCoachShortLocationLabel` returns just the city ("Laax") for
 *     the figurina pill and renders a country flag emoji next to it.
 *   - `getCoachFullLocationLabel` returns the full editorial address
 *     ("Laax, Grisons, Switzerland") for the right-column Location box
 *     on `ProfilePage`.
 *   - The map sidebar / popup need something in between: a single
 *     compact line that always reads as "City, Country", deduped and
 *     normalized.
 *
 * Country derivation is **strict to the coaching place**: only the
 * Mapbox geocode (`publicData.location.selectedPlace`) is consulted.
 * `publicData.country` (the coach's nationality) is intentionally
 * never used as a fallback here — an Italian coach working in
 * Switzerland must render as `"St. Moritz, Switzerland"`, not
 * `"St. Moritz, Italy"`. When the country can't be derived from the
 * Mapbox data the city alone is returned.
 *
 * Examples:
 *   "Lisbon, Lisbon, Portugal"            → "Lisbon, Portugal"
 *   "St.Moritz, Grisons, Switzerland"     → "St. Moritz, Switzerland"
 *   "Lenzerheide, Grisons, Switzerland"   → "Lenzerheide, Switzerland"
 *   coachCityText: "London", code: GB     → "London, United Kingdom"
 *   coachCityText: "Laax" (no Mapbox)     → "Laax"
 *   "46.80, 9.25" (raw coordinates)       → null
 *
 * @param {Object} coach   `{ author, representativeListing, locationLabel?, … }`
 * @param {Object} [opts]
 * @param {Object} [opts.intl]   react-intl object (locale-aware country names)
 * @param {string} [opts.locale] explicit locale (defaults to `intl.locale` or 'en')
 * @returns {string|null}        compact "City, Country" label, or just
 *                               the city when no country is recoverable,
 *                               or `null` when nothing usable is available.
 */
export const getCoachMapLocationLabel = (coach, opts = {}) => {
  if (!coach) return null;
  const locale = opts.locale || opts.intl?.locale || 'en';

  const pd = coach.author?.attributes?.profile?.publicData || {};
  const lp = coach.representativeListing?.attributes?.publicData || {};

  // 1. City: re-use the short helper (already normalized via
  //    `firstAddressSegment` + de-duplicated) and collapse any composed
  //    "City, Country" fallback back to a single token. This guarantees
  //    we never end up with "Lisbon, Portugal, Portugal" when the short
  //    helper itself had to fall back to a composed value.
  const cityRaw = getCoachShortLocationLabel(coach, { locale });
  const city = cityRaw ? sanitizeLocationText(cityRaw.split(',')[0]) : null;

  // 2. Country: STRICTLY from the Mapbox geocode of the coaching place.
  //    `pd.country` (nationality) is intentionally NOT used here — see
  //    JSDoc above for the rationale.
  const code =
    deriveCountryCodeFromPlace(pd.location, locale) ||
    deriveCountryCodeFromPlace(lp.location, locale);
  const country = code ? sanitizeLocationText(countryDisplayName(code, locale)) : null;

  if (!city && !country) return null;
  if (!country) return city;
  if (!city) return country;
  // Defensive: avoid degenerate "Switzerland, Switzerland" when the city
  // resolver itself fell back to the country name (rare, but possible).
  if (city.toLowerCase() === country.toLowerCase()) return city;
  return `${city}, ${country}`;
};

/**
 * Read sport-ish keys from a free-form publicData object. Supports several
 * field-name conventions we've seen across listings and coach profiles
 * (`sports[]`, `sport`, `coachSports[]`, `activities[]`, `activity`, `category`).
 *
 * @param {Object|null|undefined} pd a publicData-like object
 * @returns {string[]} deduped, normalised sport keys
 */
export const sportKeysFromPublicData = pd => {
  const data = pd || {};
  const raw = [];
  if (Array.isArray(data.sports)) raw.push(...data.sports);
  if (Array.isArray(data.teamSports)) raw.push(...data.teamSports);
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

const truthyPublicFlag = value => {
  if (value === true) return true;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
};

/** @param {Object|null|undefined} author listing.author */
export const isTeamAuthorUser = author => {
  const ut = author?.attributes?.profile?.publicData?.userType;
  return String(ut || '')
    .trim()
    .toLowerCase() === 'team';
};

/** Verified team eligible for public map / directory. */
export const isPublicVerifiedTeamAuthor = author => {
  if (!isTeamAuthorUser(author)) {
    return false;
  }
  const pd = author?.attributes?.profile?.publicData || {};
  if (!truthyPublicFlag(pd.peakupVerifiedTeam) && !truthyPublicFlag(pd.teamApproved)) {
    return false;
  }
  const visibility = String(pd.peakupTeamVisibility || 'public').toLowerCase();
  return visibility !== 'draft';
};

/**
 * Group listings by author and build coach rows for explore UI.
 * Excludes team provider accounts (see mergeTeamsByAuthor).
 *
 * @param {Object[]} denormalisedListings listings with `author`
 * @returns {Object[]} coach summaries
 */
export const mergeListingsByAuthor = denormalisedListings => {
  const publicListings = filterListingsForPublicBrowsing(denormalisedListings).filter(
    l => !isTeamAuthorUser(l.author)
  );
  const byAuthor = new Map();
  for (const listing of publicListings) {
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

    // Hourly booking listing price (single source of truth for coach hourly pricing UI).
    // Fixed-price listings are intentionally ignored for the hourly price display.
    const hourlyPrice = getLowestCoachHourlyBookingPrice(authorListings);

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
      hourlyPrice,
    });
  }
  return coaches;
};

/**
 * Group team provider listings into map/explore rows.
 *
 * @param {Object[]} denormalisedListings
 * @returns {Object[]}
 */
const teamPublicDataHasLatLng = pd => {
  const data = pd || {};
  const lat = typeof data.lat === 'number' ? data.lat : Number(data.lat);
  const lng = typeof data.lng === 'number' ? data.lng : Number(data.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return true;
  }
  const origin =
    data.teamLocation?.selectedPlace?.origin || data.location?.selectedPlace?.origin;
  return (
    origin != null &&
    Number.isFinite(origin.lat) &&
    Number.isFinite(origin.lng)
  );
};

/** Verified team row with coordinates for map pins (avoids circular import with peakupTeam). */
export const teamRowHasGeocodedBase = teamRow => {
  const geo = teamRow?.representativeListing?.attributes?.geolocation;
  if (geo?.lat != null && geo?.lng != null) {
    return true;
  }
  const pd = teamRow?.author?.attributes?.profile?.publicData;
  return teamPublicDataHasLatLng(pd);
};

export const mergeTeamsByAuthor = denormalisedListings => {
  const publicListings = filterListingsForPublicBrowsing(denormalisedListings).filter(l =>
    isTeamAuthorUser(l.author)
  );
  const byAuthor = new Map();
  for (const listing of publicListings) {
    const author = listing.author;
    const uuid = author?.id?.uuid;
    if (!uuid) continue;
    if (!isPublicVerifiedTeamAuthor(author)) continue;
    if (!byAuthor.has(uuid)) {
      byAuthor.set(uuid, []);
    }
    byAuthor.get(uuid).push(listing);
  }

  const teams = [];
  for (const [, authorListings] of byAuthor) {
    const representativeListing = pickRepresentativeListing(authorListings);
    if (!representativeListing?.author) continue;

    const hourlyPrice = getLowestCoachHourlyBookingPrice(authorListings);
    const sportKeys = new Set();
    extractSportKeysFromCoachProfile(representativeListing.author).forEach(k => sportKeys.add(k));
    const pd = representativeListing.author?.attributes?.profile?.publicData || {};
    const teamSports = pd.teamSports;
    if (Array.isArray(teamSports)) {
      teamSports.forEach(s => {
        const k = normalizeSportKey(s);
        if (k) sportKeys.add(k);
      });
    }
    for (const l of authorListings) {
      extractSportKeysFromListing(l).forEach(k => sportKeys.add(k));
    }

    const row = {
      entityType: 'team',
      authorUuid: representativeListing.author.id.uuid,
      author: representativeListing.author,
      representativeListing,
      sportKeys: [...sportKeys],
      hourlyPrice,
      teamTagline: pd.teamTagline || null,
    };

    if (teamRowHasGeocodedBase(row)) {
      teams.push(row);
    }
  }
  return teams;
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
 * @param {Object[]} teams from mergeTeamsByAuthor
 * @param {string} selectedSport
 * @returns {Object[]}
 */
export const filterTeamsBySport = (teams, selectedSport) => {
  const v = selectedSportToFilterHyphen(selectedSport);
  if (!v) return teams.slice();
  const keys = new Set(matchSportFilterKeys(v).map(normalizeSportKey));
  return teams.filter(t =>
    (t.sportKeys || []).some(sk => keys.has(normalizeSportKey(sk)))
  );
};

/**
 * Deep-link query for coach directory / map (?sport=&lat=&lng=&location=).
 *
 * @param {string} search window.location.search or equivalent
 * @returns {{ sportKey: string, userLat: number|null, userLng: number|null, locationLabel: string, coachId: string, meetingPointId: string, locate: boolean }}
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
  // Coach UUID from `?coachId=…` (used by the Coach Profile location
  // card to deep-link the Coach Map to the corresponding marker).
  // Trimmed only — UUID validation happens downstream when the value
  // is matched against the loaded coaches.
  const coachId = String(params.get('coachId') || '').trim();
  const teamId = String(params.get('teamId') || '').trim();
  const entity = String(params.get('entity') || 'all')
    .trim()
    .toLowerCase();
  const entityFilter = ['all', 'coaches', 'teams'].includes(entity) ? entity : 'all';
  const meetingPointId = String(params.get('meetingPointId') || '').trim();

  const locateRaw = String(params.get('locate') || '')
    .trim()
    .toLowerCase();
  const locate = locateRaw === '1' || locateRaw === 'true' || locateRaw === 'yes';

  return {
    sportKey,
    userLat,
    userLng,
    locationLabel,
    coachId,
    teamId,
    entityFilter,
    meetingPointId,
    locate,
  };
};

/**
 * Merge `locate=1` into a search string so landing / hero links preserve
 * e.g. `?sport=` from the global SportBar while signalling a one-shot
 * geolocation intent to CoachMapPage.
 *
 * @param {string} [search] `location.search` style, with or without leading `?`
 * @returns {string} `?` + merged query (always includes `locate=1`)
 */
export const mergeCoachMapLocateIntentSearch = search => {
  const raw =
    typeof search === 'string' && search.startsWith('?') ? search.slice(1) : String(search || '');
  const params = new URLSearchParams(raw);
  params.set('locate', '1');
  const qs = params.toString();
  return qs ? `?${qs}` : '?locate=1';
};

/**
 * `LocationAutocompleteInput` / geocoder contract: “Current location” resolves
 * to a place with an empty `address` string once details are loaded.
 *
 * @param {{ selectedPlace?: { address?: string, origin?: unknown } }|null|undefined} locationField
 * @returns {boolean}
 */
export const isLocationFieldCurrentLocation = locationField => {
  const sp = locationField?.selectedPlace;
  return !!(
    sp &&
    typeof sp.address === 'string' &&
    sp.address === '' &&
    sp.origin != null
  );
};

/**
 * Normalise geocoder `selectedPlace.origin` (Sharetribe SDK `LatLng` or plain
 * `{ lat, lng }`) for Coach Map query params.
 *
 * @param {unknown} origin
 * @returns {{ lat: number, lng: number }|null}
 */
export const normalizeGeocoderOriginLatLng = origin => {
  if (!origin) return null;
  const latRaw = typeof origin.lat === 'function' ? origin.lat() : origin.lat;
  const lngRaw = typeof origin.lng === 'function' ? origin.lng() : origin.lng;
  const lat = typeof latRaw === 'number' ? latRaw : Number.parseFloat(latRaw);
  const lng = typeof lngRaw === 'number' ? lngRaw : Number.parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
};

/**
 * Hero SearchCTA sport: dropdown (`pub_categoryLevel1`) wins; otherwise reuse
 * `?sport=` already on the landing URL (e.g. global SportBar).
 *
 * @param {unknown} pubCategoryLevel1 Final Form value from FilterCategories
 * @param {string} [pageSearch] `location.search` on `/`
 * @returns {string} normalised sport slug or ''
 */
export const resolveCoachMapSportKeyFromLandingForm = (pubCategoryLevel1, pageSearch) => {
  const fromForm = String(pubCategoryLevel1 || '')
    .trim()
    .toLowerCase();
  if (fromForm) return fromForm;
  const raw =
    typeof pageSearch === 'string' && pageSearch.startsWith('?')
      ? pageSearch.slice(1)
      : String(pageSearch || '');
  return String(new URLSearchParams(raw).get('sport') || '')
    .trim()
    .toLowerCase();
};

/**
 * Copy landing query keys (e.g. Topbar `?sport=`) and set `sport` when the
 * hero resolved a non-empty key.
 *
 * @param {string} [pageSearch]
 * @param {string} resolvedSportKey from {@link resolveCoachMapSportKeyFromLandingForm}
 * @returns {string} `?` + query or `''`
 */
export const mergeResolvedSportIntoPageSearchForCoachMap = (pageSearch, resolvedSportKey) => {
  const raw =
    typeof pageSearch === 'string' && pageSearch.startsWith('?')
      ? pageSearch.slice(1)
      : String(pageSearch || '');
  const params = new URLSearchParams(raw);
  if (resolvedSportKey) {
    params.set('sport', resolvedSportKey);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Coach Map URL for a **manual** geocoder place: `lat`/`lng`/`location` + optional
 * `sport`. Never includes `locate` / `_locatenonce` (camera follows explicit coords).
 *
 * @param {{ sportKey?: string, lat: number, lng: number, locationLabel?: string }} args
 * @returns {string} `?` + query (or `?` when nothing serialised)
 */
export const buildCoachMapSearchWithManualLocation = ({ sportKey, lat, lng, locationLabel }) => {
  const params = new URLSearchParams();
  const sk = String(sportKey || '')
    .trim()
    .toLowerCase();
  if (sk) params.set('sport', sk);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  const label = typeof locationLabel === 'string' ? locationLabel.trim() : '';
  if (label) params.set('location', label);
  params.delete('locate');
  params.delete('_locatenonce');
  const qs = params.toString();
  return qs ? `?${qs}` : '?';
};

/** Fired from Topbar (same user-gesture tick) so CoachMapPage runs geolocation before URL push. */
export const COACH_MAP_DIRECT_GEO_EVENT = 'peakup-coachmap:direct-geolocation';

/** Fired when landing/hero submit stored fresh coords in sessionStorage — Coach Map applies after navigation. */
export const COACH_MAP_APPLY_PRIMED_GEO_EVENT = 'peakup-coachmap:apply-primed-geo';

/** sessionStorage key — set from the landing "Find your coach" submit handler (user gesture). */
export const COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY = 'peakupCoachMapPrimedUserCoords';

/** Fired after Coach Map geolocation intent so the map panel can scroll into view on narrow viewports. */
export const COACH_MAP_SCROLL_PANEL_EVENT = 'peakup-coachmap:scroll-map-panel';

/**
 * Removes `locate` / `_locatenonce` so map can fall back to coach bounds after geolocation failure.
 *
 * @param {string} [search]
 * @returns {string} `?` + remaining query or `''`
 */
export const stripCoachMapLocateParamsFromSearch = search => {
  const raw =
    typeof search === 'string' && search.startsWith('?') ? search.slice(1) : String(search || '');
  const params = new URLSearchParams(raw);
  params.delete('locate');
  params.delete('_locatenonce');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

/**
 * Starts `navigator.geolocation.getCurrentPosition` from the current stack (form submit / click).
 * On success, writes {@link COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY} and emits {@link COACH_MAP_APPLY_PRIMED_GEO_EVENT}.
 * CoachMapPage consumes this after `history.push` to `/coach-map?…&locate=1` without losing the iOS/Safari gesture gate.
 */
export const startCoachMapLandingGeolocationPrimed = () => {
  if (typeof window === 'undefined' || !navigator?.geolocation?.getCurrentPosition) {
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      try {
        window.sessionStorage.setItem(
          COACH_MAP_LANDING_PRIMED_GEO_STORAGE_KEY,
          JSON.stringify({ lat, lng, t: Date.now() })
        );
      } catch (e) {
        // private mode / quota
      }
      window.dispatchEvent(new CustomEvent(COACH_MAP_APPLY_PRIMED_GEO_EVENT));
    },
    () => {},
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
  );
};

/**
 * Like {@link mergeCoachMapLocateIntentSearch} but always bumps `_locatenonce`
 * so `location.search` changes even when `locate=1` was already present — needed
 * for React Router to re-run the Coach Map geolocation effect on repeat clicks.
 *
 * Strips `mobilesearch` / `mobilemenu` query flags so a navigation from the
 * mobile topbar search modal does not leave the modal “open” in the URL (which
 * would cover the map).
 *
 * @param {string} [search]
 * @returns {string} `?` + query string
 */
export const coachMapSearchForFreshGeolocationIntent = search => {
  const merged = mergeCoachMapLocateIntentSearch(search);
  const params = new URLSearchParams(merged.startsWith('?') ? merged.slice(1) : '');
  params.delete('mobilesearch');
  params.delete('mobilemenu');
  params.set('_locatenonce', String(Date.now()));
  return `?${params.toString()}`;
};

/**
 * Opt-in / dev logging for the landing → coach-map geolocation flow.
 * In production, set `localStorage.DEBUG_COACH_MAP_LOCATE = '1'` and reload.
 *
 * @param {string} label
 * @param {unknown} [data]
 */
export const debugCoachMapLocate = (label, data) => {
  if (typeof window === 'undefined') return;
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    window.localStorage?.getItem('DEBUG_COACH_MAP_LOCATE') === '1';
  if (!enabled) return;
  console.debug(`[PeakUp coach-map locate] ${label}`, data);
};

/**
 * Loud `console.log` for coach-map geolocation / camera debugging.
 * Enable with `localStorage.DEBUG_COACH_MAP_LOCATE = '1'` in production, or use a dev build.
 *
 * @param {string} label
 * @param {unknown} [data]
 */
export const logCoachMapLocateVerbose = (label, data) => {
  if (typeof window === 'undefined') return;
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    window.localStorage?.getItem('DEBUG_COACH_MAP_LOCATE') === '1';
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.log(`[CoachMapLocate] ${label}`, data !== undefined ? data : '');
};

/**
 * Search/hash for {@link ../containers/PageBuilder/Primitives/Link/Link.js} when the target
 * is CoachMapPage. Hosted `internalButtonLink` CTAs often use `href: "/coach-map"` only — this
 * appends `locate=1` and, on the landing path (`/`), copies `sport` from the current location
 * when the href omits it (SportBar parity with `LandingHeroSection`).
 *
 * Deep links with `?coachId=` keep the href query unchanged (no `locate` injection).
 *
 * @param {{ pathname: string, search: string }} location `useLocation()` snapshot
 * @param {string} href internal href (path + optional `?query` + optional `#hash`)
 * @returns {{ search: string, hash: string }}
 */
export const buildCoachMapPageBuilderLinkTo = (location, href) => {
  const safeHref = typeof href === 'string' ? href : '';
  const hashIdx = safeHref.indexOf('#');
  const withoutHash = hashIdx >= 0 ? safeHref.slice(0, hashIdx) : safeHref;
  const hash = hashIdx >= 0 ? safeHref.slice(hashIdx) : '';

  const dummy = new URL(withoutHash || '/', 'http://local.peakup');
  const parsed = parseCoachExploreSearch(dummy.search);
  if (parsed.coachId) {
    return { search: dummy.search || '', hash };
  }

  const combined = new URLSearchParams(String(dummy.search || '').replace(/^\?/, ''));

  if (location?.pathname === '/') {
    const landing = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
    const sportFromLanding = landing.get('sport');
    if (sportFromLanding && !combined.get('sport')) {
      combined.set('sport', sportFromLanding);
    }
  }

  const qs = combined.toString();
  const searchBeforeLocate = qs ? `?${qs}` : '';
  return {
    search: mergeCoachMapLocateIntentSearch(searchBeforeLocate),
    hash,
  };
};

/**
 * Canonical *display* labels for the Snowboard / Ski discipline variants.
 *
 * Why this map exists:
 *   - URL slugs for variants are compound, separator-less words
 *     (`freestylesnowboard`, `freerideski`, `splittouring`, …). The
 *     generic title-case fallback in `formatCoachExploreSportSlug`
 *     can only capitalize the first letter of each *separator-delimited
 *     token*, so an URL like `/coaches?sport=freestylesnowboard`
 *     produces the cosmetically broken headline
 *     "Find your Freestylesnowboard coach".
 *   - This registry pins the human-readable label for each known
 *     variant slug. `formatCoachExploreSportSlug` consults it first and
 *     falls back to the title-case logic for anything else — so
 *     top-level sports (`snowboard`, `ski`, `mtb`, `crosscountry`, …)
 *     continue to flow through the existing path unchanged.
 *
 * Keys are stored in their fully normalized form (lower-case, no
 * separators) so callers can look up by the value coming out of
 * `normalizeSportKey` or by the raw `?sport=` slug verbatim — both
 * resolve to the same entry.
 *
 * Scope note:
 *   - This map is the *display* layer only. It does NOT affect
 *     filtering, routing, the SportBar chips, the CoachMap discipline
 *     tree, the figurine sticker labels, or `PROFILE_SPORT_DISPLAY_LABELS`
 *     — those each serve their own context and intentionally use
 *     different copy. Keep filter/routing keys untouched.
 *   - Both slug shapes for the same discipline are listed
 *     (`freerideski` + `freerideskiing`, `splitboard` + `splittouring`,
 *     `freestyleski` + `freestyleskiing`) so the registry tolerates
 *     whichever shape the URL / footer link / Console content uses.
 *
 * @type {Readonly<Record<string, string>>}
 */
export const SPORT_VARIANT_DISPLAY_LABELS = Object.freeze({
  freerideski: 'Freeride Ski',
  freerideskiing: 'Freeride Ski',
  freeridesnowboard: 'Freeride Snowboard',
  freestyleski: 'Freestyle Ski',
  freestyleskiing: 'Freestyle Ski',
  freestylesnowboard: 'Freestyle Snowboard',
  splitboard: 'Splitboard',
  splittouring: 'Splitboard',
  skitouring: 'Ski Touring',
});

/**
 * Format a sport slug for display in page titles / hero headlines.
 *
 * Resolution order:
 *   1. `SPORT_VARIANT_DISPLAY_LABELS` — pinned, human-readable labels
 *      for the Snowboard / Ski discipline variants whose URL slugs are
 *      compound separator-less words (the title-case fallback can't
 *      produce a good headline for these).
 *   2. Generic title-case of the slug, splitting on hyphens / spaces.
 *      This covers every top-level sport (`snowboard`, `ski`, `mtb`,
 *      `crosscountry`, …) and any future variant we haven't pinned
 *      yet — they at least get a stable "first-letter-up" rendering.
 *
 * The function is pure and locale-agnostic; for i18n-aware copy the
 * caller still wraps the result in `FormattedMessage` / `intl.formatMessage`
 * (see `CoachesPage` headline).
 *
 * @param {string} slug sport key / URL segment (`?sport=` value)
 * @returns {string} display-ready label, or '' for nullish / empty input
 */
export const formatCoachExploreSportSlug = slug => {
  const raw = String(slug || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');
  if (!raw) return '';

  // Variant lookup: collapse all separators so `freeride-ski`,
  // `freeride_ski`, `FREERIDE SKI` and `freerideski` all resolve to the
  // same entry, then consult the pinned-labels registry.
  const canonical = raw.replace(/[^a-z0-9]+/g, '');
  const pinned = SPORT_VARIANT_DISPLAY_LABELS[canonical];
  if (pinned) return pinned;

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
