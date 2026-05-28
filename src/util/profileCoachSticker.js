import {
  coachCityCenter,
  coachCityLabel,
  resolveCoachLocationStickerSlug,
} from '../config/configCoachCity';
import { listingHasPeakupBookingFlag } from './coachExplore';
import { isPeakUpTeamUserType } from './peakupTeam';
import { normalizeExtendedDataTextForDisplay } from './fieldHelpers';

/**
 * I dati del form Impostazioni profilo (“Coach & sessions” + `publicData` Console) guidano la
 * figurina: `resolveCoachStickerDisplay(profile, listing)` è l’unica sorgente per sport, lingue,
 * prezzo, valuta, posizione e coordinate sulla Profile page.
 */

/** Emoji per sport salvati su `profile.publicData.sports` (normalizzazione minuscola). */
export const PROFILE_SPORT_EMOJI = {
  ski: '⛷️',
  snowboard: '🏂',
  surf: '🏄',
  mtb: '🚵',
  tennis: '🎾',
  golf: '⛳',
  climbing: '🧗',
  yoga: '🧘',
  skydive: '🪂',
  crosscountry: '🎿',
  wakeboard: '🏄',
  // `wakesurf` is a separate bookable sport, not a Wakeboard variant.
  // 🌊 keeps Wakesurf visually distinct from Wakeboard (🏄) and Surf (🏄)
  // — same disambiguation pattern used for Kitesurf 🪁 vs Surf 🏄.
  wakesurf: '🌊',
  kitesurf: '🪁',
  fitness: '💪',
  freeridesnowboard: '🏂',
  freestylesnowboard: '🏂',
  splittouring: '🏔️',
  freerideskiing: '⛷️',
  skitouring: '⛷️',
  freestyleskiing: '⛷️',
  skateboard: '🛹',
  skate: '🛹',
};

/**
 * Sulla figurina (overlay foto): freeride/freestyle snowboard + split touring → una sola entry snowboard.
 */
const FIGURINA_SNOWBOARD_FAMILY_KEYS = new Set([
  'freeridesnowboard',
  'freestylesnowboard',
  'splittouring',
]);

/**
 * Elenco sport per la figurina sulla foto: toglie varianti snowboard/split touring duplicate;
 * nella colonna destra del profilo resta l’elenco completo.
 *
 * @param {unknown} sports merged da {@link mergeCoachSports}
 * @returns {string[]}
 */
export const sportsForFigurinaOverlay = sports => {
  const list = (Array.isArray(sports) ? sports : []).map(s => String(s || '').trim()).filter(Boolean);
  const canon = raw =>
    String(raw || '')
      .toLowerCase()
      .trim()
      .replace(/[\s-_]+/g, '');

  /** @type {string[]} */
  const out = [];
  const seen = new Set();

  for (const s of list) {
    const k = canon(s);

    if (FIGURINA_SNOWBOARD_FAMILY_KEYS.has(k)) {
      if (!seen.has('snowboard')) {
        seen.add('snowboard');
        out.push('snowboard');
      }
      continue;
    }

    if (!k || seen.has(k)) {
      continue;
    }

    seen.add(k);
    out.push(s);
  }

  return out;
};

/**
 * Etichette display "umane" per i singoli sport: i compound (Console salva senza spazi)
 * vengono separati con la prima lettera maiuscola; il resto è Title-Case.
 *
 * Se aggiungi un nuovo sport in {@link PROFILE_SPORT_EMOJI}, aggiungi anche qui la label
 * pronta in inglese. Le traduzioni hostate restano comunque la fonte di verità via
 * `ProfilePage.sportSticker.<key>` (questa è solo il `defaultMessage`).
 */
// Display labels for each sport key. Casing/spelling MUST match the
// official platform sports list (Profile Settings + SportBar). Keep this
// table in sync with `SPORT_LABELS` in `src/components/SportBar/SportBar.js`
// and `WINTER_VARIANT_LABELS` (idem). Adding a new sport key here without
// adding it to those tables (and vice-versa) leads to mismatched chips
// vs. card/popup labels. `skate` is kept as a back-compat alias for legacy
// coach data – the official platform key is `skateboard`.
export const PROFILE_SPORT_DISPLAY_LABELS = {
  ski: 'Ski',
  snowboard: 'Snowboard',
  surf: 'Surf',
  mtb: 'MTB',
  tennis: 'Tennis',
  golf: 'Golf',
  climbing: 'Climbing',
  yoga: 'Yoga',
  skydive: 'Skydive',
  crosscountry: 'Cross-country',
  wakeboard: 'Wakeboard',
  // `wakesurf` is a separate top-level bookable sport on PeakUp, NOT a
  // Wakeboard variant. Keep it adjacent to `wakeboard` for readability;
  // canonical label casing matches the SportBar / Profile Settings list.
  wakesurf: 'Wakesurf',
  kitesurf: 'Kitesurf',
  fitness: 'Fitness',
  freeridesnowboard: 'Freeride snowboard',
  freestylesnowboard: 'Freestyle snowboard',
  splittouring: 'Split touring',
  freerideskiing: 'Freeride skiing',
  skitouring: 'Skitouring',
  freestyleskiing: 'Freeski',
  skateboard: 'Skateboard',
  skate: 'Skateboard',
};

const titleCaseSportLabel = raw => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

/**
 * Sport da `publicData.sports` → emoji + label (label via react-intl con defaultMessage).
 * @param {import('react-intl').intlShape} intl
 * @param {string[]|unknown} sports
 */
export const formatProfileSportsForSticker = (intl, sports) =>
  (sports || []).map(sportRaw => {
    const raw = String(sportRaw || '').trim();
    const key = raw.toLowerCase().replace(/\s+/g, '');
    const emoji = PROFILE_SPORT_EMOJI[key] || '🏅';
    const fallbackLabel = PROFILE_SPORT_DISPLAY_LABELS[key] || titleCaseSportLabel(raw) || key;
    const label = intl.formatMessage(
      { id: `ProfilePage.sportSticker.${key}`, defaultMessage: fallbackLabel },
      {}
    );
    return { key, emoji, label };
  });

/**
 * CoachMap-only display split: takes a coach's flat sports list and returns
 *   { mainEntries: [{key,emoji,label}], specialties: [string] }
 *
 * Why: Console saves both parents (snowboard / ski) and winter sub-disciplines
 * (freeridesnowboard, splittouring, ...) in the same `sports[]`. Rendering them
 * verbatim in the sidebar/popup produces noisy lines like
 * "Snowboard · Ski · Freeride Snowboard · Freestyle Snowboard ...".
 *
 * For the CoachMap views we instead show:
 *   • a "main sports" line with the parents only (deduped, parents implied
 *     from variants when missing);
 *   • a "specialties" sub-line with the variant short labels deduped by label
 *     (e.g. "Freeride · Freestyle · Ski Touring").
 *
 * Pure presentation – the underlying taxonomy is untouched.
 *
 * @param {import('react-intl').intlShape} intl
 * @param {string[]|unknown} sports
 * @returns {{ mainEntries: Array<{key:string,emoji:string,label:string}>, specialties: string[] }}
 */
const COACHMAP_VARIANT_PARENT = {
  skitouring: 'ski',
  freerideskiing: 'ski',
  freestyleskiing: 'ski',
  splittouring: 'snowboard',
  freeridesnowboard: 'snowboard',
  freestylesnowboard: 'snowboard',
};

// CoachMap-only short labels for variants shown inside the secondary row,
// where the parent chip ("Snowboard" / "Ski") already provides context. The
// canonical full labels live in `PROFILE_SPORT_DISPLAY_LABELS`. Keep casing
// in sync with the official sports list ("Split touring", "Skitouring",
// "Freeski") even when abbreviated.
const COACHMAP_VARIANT_FALLBACK_LABEL = {
  skitouring: 'Skitouring',
  splittouring: 'Split touring',
  freerideskiing: 'Freeride',
  freestyleskiing: 'Freeski',
  freeridesnowboard: 'Freeride',
  freestylesnowboard: 'Freestyle',
};

const normalizeCoachMapSportKey = s =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '');

export const splitCoachSportsForCoachMap = (intl, sports) => {
  const mainOrder = [];
  const mainSet = new Set();
  const specialtyOrder = [];
  const specialtySet = new Set();

  for (const raw of sports || []) {
    const k = normalizeCoachMapSportKey(raw);
    if (!k) continue;
    const parent = COACHMAP_VARIANT_PARENT[k];
    if (parent) {
      if (!mainSet.has(parent)) {
        mainSet.add(parent);
        mainOrder.push(parent);
      }
      const fallback = COACHMAP_VARIANT_FALLBACK_LABEL[k] || k;
      const specialty = intl
        ? intl.formatMessage({ id: `CoachMap.specialty.${k}`, defaultMessage: fallback }, {})
        : fallback;
      const dedupKey = String(specialty)
        .trim()
        .toLowerCase();
      if (specialty && !specialtySet.has(dedupKey)) {
        specialtySet.add(dedupKey);
        specialtyOrder.push(specialty);
      }
    } else if (!mainSet.has(k)) {
      mainSet.add(k);
      mainOrder.push(k);
    }
  }

  const mainEntries = formatProfileSportsForSticker(intl, mainOrder);
  return { mainEntries, specialties: specialtyOrder };
};

const EXPERIENCE_DEFAULTS = {
  hobby: 'Hobby',
  '0_5': '0–5 years',
  '5_10': '5–10 years',
  '10_15': '10–15 years',
  '15_20': '15–20 years',
  '20': '20+ years',
  '20+': '20+ years',
};

/**
 * Try to synthesise a complete "X–Y years" / "X+ years" / "X years" label from
 * a free-form experience value. Used as a fallback for anything that is NOT a
 * canonical enum key (`'15_20'`, `'20+'`, …) — covers Console hosted labels
 * (`'15-20'`, `'15–20 years'`, `'15 to 20 years'`), pasted free text and
 * raw numeric values (`'12'`, `12`, `'12 years'`).
 *
 * Returns `null` when nothing usable can be extracted, so the outer helper
 * can degrade gracefully.
 *
 * @param {string} raw
 * @param {import('react-intl').intlShape} intl
 * @returns {string|null}
 */
const synthesiseExperienceLabel = (raw, intl) => {
  const lower = String(raw)
    .toLowerCase()
    .trim();
  if (!lower) return null;
  if (lower === 'hobby') {
    return intl.formatMessage({
      id: 'ProfilePage.coachExperience_hobby',
      defaultMessage: 'Hobby',
    });
  }

  // Normalise dash variants (en/em/figure dash, hyphen-bullet, minus,
  // ASCII hyphen) and the verbose "X to Y" form to a single ASCII hyphen.
  const normalised = lower
    .replace(/[\u2010-\u2015\u2043\u2212-]/g, '-')
    .replace(/\s+to\s+/g, '-');

  const rangeMatch = normalised.match(/(\d+)\s*[-_]\s*(\d+)/);
  if (rangeMatch) {
    const [, low, high] = rangeMatch;
    return intl.formatMessage(
      {
        id: 'ProfilePage.coachExperience_range',
        defaultMessage: '{low}–{high} years',
      },
      { low, high }
    );
  }

  const numberMatch = normalised.match(/(\d+)/);
  if (numberMatch) {
    const n = numberMatch[1];
    const hasPlus = normalised.includes('+');
    if (hasPlus || Number(n) >= 20) {
      return intl.formatMessage(
        {
          id: 'ProfilePage.coachExperience_plus',
          defaultMessage: '{n}+ years',
        },
        { n }
      );
    }
    return intl.formatMessage(
      {
        id: 'ProfilePage.coachExperience_years',
        defaultMessage: '{n} years',
      },
      { n }
    );
  }

  return null;
};

/**
 * Testo esperienza da `publicData.experience`. Returns a complete localised
 * label (e.g. "15–20 years") for every shape we've seen in the wild:
 *   - canonical enum keys ('15_20', '20+', 'hobby', …)
 *   - ASCII / en-dash / em-dash ranges with or without "years"
 *     ('15-20', '15–20 years', '15 to 20 years')
 *   - plain numbers / numeric strings ('12', 12, '12 years')
 *
 * Never returns a bare "15-20" without the "years" suffix.
 *
 * @param {import('react-intl').intlShape} intl
 * @param {string|number} experienceKey
 * @returns {string|null}
 */
export const formatCoachExperienceLabel = (intl, experienceKey) => {
  if (experienceKey == null || experienceKey === '') {
    return null;
  }
  const k = String(experienceKey);
  const slug = k.replace(/\+/g, 'plus');

  // 1) Known canonical enum keys keep their dedicated translation entry,
  //    falling back to the curated `EXPERIENCE_DEFAULTS` defaults.
  if (EXPERIENCE_DEFAULTS[k] != null) {
    return intl.formatMessage(
      { id: `ProfilePage.coachExperience_${slug}`, defaultMessage: EXPERIENCE_DEFAULTS[k] },
      {}
    );
  }

  // 2) Free-form / Console hosted value → synthesise a complete label so the
  //    Experience box always reads "<range> years" instead of "15-20".
  const synthesised = synthesiseExperienceLabel(k, intl);
  if (synthesised) return synthesised;

  // 3) Last resort: return the raw value (typed as text) — better something
  //    than nothing, but `synthesiseExperienceLabel` covers virtually all
  //    realistic inputs, so this only runs for truly unparseable strings.
  return k;
};

/** Bandierine lingue coaching (codici corti Console). */
export const LANGUAGE_FLAGS = {
  it: '🇮🇹',
  en: '🇬🇧',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  pt: '🇵🇹',
};

export const stickerLanguageLabel = (intl, code) => {
  const c = String(code || '').toLowerCase();
  return intl.formatMessage({ id: `ProfilePage.coachLanguage_${c}`, defaultMessage: c });
};

/**
 * Lingue coaching sulla figurina → label i18n (la bandiera è già nel messaggio dove serve).
 * @param {import('react-intl').intlShape} intl
 * @param {string[]|unknown} languageCodes
 */
export const formatProfileLanguagesForSticker = (intl, languageCodes) => {
  const arr = Array.isArray(languageCodes) ? languageCodes : [];
  const seen = new Set();
  /** @type {{ key: string; label: string }[]} */
  const out = [];
  for (const raw of arr) {
    const code = String(raw || '').trim().toLowerCase();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    const labelRaw = stickerLanguageLabel(intl, code);
    const label = labelRaw != null ? String(labelRaw).trim() : '';
    if (!label) {
      continue;
    }
    out.push({
      key: code,
      label,
    });
  }
  return out;
};

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

const listingGeolocationPair = listing => {
  const g = listing?.attributes?.geolocation;
  if (!g) return { lat: null, lng: null };
  return { lat: finiteNum(g.lat), lng: finiteNum(g.lng) };
};

/**
 * Sports shown on the figurina: profile instructor fields + representative listing (deduped).
 */
export const mergeCoachSports = (profilePd = {}, listingPd = {}) => {
  const raw = [
    ...(Array.isArray(profilePd.sports) ? profilePd.sports : []),
    ...(Array.isArray(profilePd.coachSports) ? profilePd.coachSports : []),
    ...(Array.isArray(listingPd.sports) ? listingPd.sports : []),
    ...(Array.isArray(listingPd.coachSports) ? listingPd.coachSports : []),
  ];
  const seen = new Set();
  const out = [];
  for (const s of raw) {
    const k = String(s || '')
      .toLowerCase()
      .trim()
      .replace(/[\s-_]+/g, '');
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(String(s).trim());
  }
  return out;
};

/** Languages: profile (instructor) + listing fallback, deduped by code */
export const mergeCoachLanguages = (profilePd = {}, listingPd = {}) => {
  const raw = [
    ...(Array.isArray(profilePd.languages) ? profilePd.languages : []),
    ...(Array.isArray(profilePd.coachingLanguages) ? profilePd.coachingLanguages : []),
    ...(Array.isArray(listingPd.languages) ? listingPd.languages : []),
  ];
  const seen = new Set();
  const out = [];
  for (const code of raw) {
    const k = String(code || '')
      .toLowerCase()
      .trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
};

/**
 * Single source for figurina + sticker column: merges profile `publicData` with the representative listing.
 *
 * @param {Object} profilePd `user.attributes.profile.publicData`
 * @param {Object|null} listing denormalised listing or null
 */
export const resolveCoachStickerDisplay = (profilePd = {}, listing = null) => {
  const pd = profilePd || {};
  const lp = listing?.attributes?.publicData || {};
  const geoList = listingGeolocationPair(listing);

  const citySlug =
    pd.coachCity != null && String(pd.coachCity).trim()
      ? String(pd.coachCity)
          .toLowerCase()
          .trim()
      : '';
  const cityCoords = citySlug ? coachCityCenter(citySlug) : null;

  const originFromLocationField = pd.location?.selectedPlace?.origin;
  const latFromLocationObj = finiteNum(originFromLocationField?.lat);
  const lngFromLocationObj = finiteNum(originFromLocationField?.lng);

  const latResolved =
    finiteNum(pd.lat) ??
    finiteNum(pd.latitude) ??
    latFromLocationObj ??
    (cityCoords ? cityCoords.lat : null) ??
    geoList.lat;
  const lngResolved =
    finiteNum(pd.lng) ??
    finiteNum(pd.longitude) ??
    lngFromLocationObj ??
    (cityCoords ? cityCoords.lng : null) ??
    geoList.lng;

  const typedCity =
    pd.coachCityText != null && String(pd.coachCityText).trim()
      ? String(pd.coachCityText).trim()
      : '';

  const locationLine =
    typedCity ||
    (citySlug ? coachCityLabel(citySlug) : '') ||
    normalizeExtendedDataTextForDisplay(pd.location ?? lp.location) ||
    null;

  const locationStickerSlug =
    resolveCoachLocationStickerSlug(citySlug || null, typedCity || '', locationLine || '') || null;

  const sports = mergeCoachSports(pd, lp);
  const languages = mergeCoachLanguages(pd, lp);

  return {
    sports,
    languages,
    locationLine,
    lat: latResolved,
    lng: lngResolved,
    coachCitySlug: citySlug || null,
    locationStickerSlug,
  };
};

/**
 * Resolve a coach's map coordinates from any data shape we ship.
 *
 * Cascading sources (handled by {@link resolveCoachStickerDisplay}):
 *   1. `listing.attributes.geolocation` (representative listing pin)
 *   2. `profile.publicData.lat` / `lng` or `latitude` / `longitude`
 *   3. `profile.publicData.location.selectedPlace.origin` (LocationAutocomplete shape)
 *   4. `profile.publicData.coachCity` slug → configured city center
 *
 * Returns `null` if neither side has a finite numeric pair – so callers can
 * disable / hide map-targeting actions safely.
 *
 * @param {Object|null|undefined} coach aggregated coach row (author + representativeListing)
 * @returns {{ lat: number, lng: number } | null}
 */
export const getCoachCoordinates = coach => {
  if (!coach) return null;
  const profilePd = coach.author?.attributes?.profile?.publicData || {};
  const listing = coach.representativeListing || null;
  const sticker = resolveCoachStickerDisplay(profilePd, listing);
  const lat = typeof sticker.lat === 'number' && Number.isFinite(sticker.lat) ? sticker.lat : null;
  const lng = typeof sticker.lng === 'number' && Number.isFinite(sticker.lng) ? sticker.lng : null;
  if (lat == null || lng == null) return null;
  return { lat, lng };
};

/**
 * Mapping legacy/free-form per il campo `publicData.coachLevel` (es. "Ambassador",
 * "top coach", "certified-coach", "coach level 4"). Tutto viene normalizzato a snake_case
 * minuscolo, poi confrontato con questa tabella.
 */
const LEGACY_COACH_LEVEL_TO_BADGE_ID = {
  founder: 'founder',
  ambassador: 'ambassador',
  top_coach: 'top_coach',
  topcoach: 'top_coach',
  certified_coach: 'certified_coach',
  certifiedcoach: 'certified_coach',
};

/**
 * Normalizza una stringa (es. "Top Coach", "🔥 Ambassador", "TOP-COACH ⭐")
 * in una chiave usabile dalla tabella legacy. Strippa emoji/punteggiatura e
 * collassa eventuali underscore consecutivi/leading/trailing.
 * @param {unknown} raw
 * @returns {string}
 */
const normalizeLegacyCoachLevelKey = raw => {
  if (raw == null) return '';
  return String(raw)
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
};

/**
 * Tenta di estrarre badge id da un singolo "raw" value (stringa libera o snake-case-key).
 * @param {unknown} raw
 * @returns {string|null}
 */
const coerceBadgeIdFromRawValue = raw => {
  const norm = normalizeLegacyCoachLevelKey(raw);
  if (!norm) return null;
  if (PEAKUP_COACH_BADGE_PRIORITY[norm] != null) return norm;
  if (LEGACY_COACH_LEVEL_TO_BADGE_ID[norm]) return LEGACY_COACH_LEVEL_TO_BADGE_ID[norm];
  return null;
};

/**
 * Espande un valore "lista di badge" che può arrivare in shape diverse:
 * array, stringa singola, stringa CSV, oppure plain object `{founder: true, …}`.
 * @param {unknown} raw
 * @returns {string[]}
 */
const expandBadgeListValue = raw => {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map(coerceBadgeIdFromRawValue).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/[,;|]/)
      .map(coerceBadgeIdFromRawValue)
      .filter(Boolean);
  }
  if (typeof raw === 'object') {
    const out = [];
    for (const [key, val] of Object.entries(raw)) {
      if (val === true || val === 'true' || val === '1') {
        const m = coerceBadgeIdFromRawValue(key);
        if (m) out.push(m);
      }
    }
    return out;
  }
  return [];
};

/**
 * Badges you set in profile `publicData` (see Console). Sources, checked in order:
 *   1. `peakupCoachBadges` (array, CSV string, single string, or boolean map)
 *   2. boolean flags (`peakupBadgeFounder`, `peakupBadgeAmbassador`, …)
 *   3. legacy free-form text in `coachLevel` (es. `"Ambassador"`, `"Top Coach"`)
 *
 * Tutte le shape vengono normalizzate ai badge id stabili usati altrove
 * (`founder`, `ambassador`, `top_coach`, `certified_coach`).
 *
 * @returns {string[]} stable ids for `ProfilePage.stickerBadge_<id>`
 */
export const resolvePeakupCoachBadgeIds = (profilePd = {}) => {
  const pd = profilePd || {};

  // (1) Array / stringa / oggetto: campo principale `peakupCoachBadges`.
  const fromList = expandBadgeListValue(pd.peakupCoachBadges);
  if (fromList.length) return fromList;

  // (2) Boolean flags singoli.
  const ids = [];
  const t = v => v === true || v === 'true' || v === '1';
  if (t(pd.peakupBadgeFounder)) ids.push('founder');
  if (t(pd.peakupBadgeAmbassador)) ids.push('ambassador');
  if (t(pd.peakupBadgeTopCoach)) ids.push('top_coach');
  if (t(pd.peakupBadgeCertifiedCoach)) ids.push('certified_coach');
  if (ids.length) return ids;

  // (3) Legacy: stringa o array su `coachLevel` (es. "Ambassador", "TOP-COACH",
  //     "Certified Coach Level 4"). Se non abbiamo niente di altro, derivare il badge
  //     da qui mantiene il ranking allineato con la pill mostrata sulla figurina.
  const legacyList = expandBadgeListValue(pd.coachLevel);
  if (legacyList.length) return legacyList;

  return [];
};

/**
 * Priorità ordinata dei badge PeakUp per il ranking (Featured coach landing).
 * Maggiore = più importante. Founder > Ambassador > Top coach > Certified coach > Coach level 4 > nessuno.
 *
 * @type {Object<string, number>}
 */
export const PEAKUP_COACH_BADGE_PRIORITY = {
  founder: 50,
  ambassador: 40,
  top_coach: 30,
  certified_coach: 20,
};

/**
 * Badges that can ONLY be set manually by an admin via Console / API and are
 * never auto-derived. The remaining tiers (top_coach, certified_coach) are
 * computed from coach data (see `resolveDisplayBadgeIds`).
 */
const ADMIN_ONLY_BADGE_IDS = new Set(['founder', 'ambassador']);

/**
 * Threshold (years) above which a coach is auto-elevated to `top_coach`.
 */
const TOP_COACH_MIN_YEARS = 10;

/**
 * Parse a coach `experience` value into a "minimum years" lower bound.
 *
 * Robust against the multiple shapes the value can arrive in (form key,
 * Console hosted label, free-form string, plain number):
 *   'hobby'                  -> 0
 *   '0_5'                    -> 0
 *   '5_10'                   -> 5
 *   '10_15'  / '10-15'       -> 10
 *   '15_20'  / '15-20'       -> 15
 *   '15–20 years'            -> 15   (en dash)
 *   '15—20 years'            -> 15   (em dash)
 *   '15 to 20 years'         -> 15
 *   '20'  / '20+' / '20 +'   -> 20
 *   '20 years +'             -> 20
 *   '12 years' / '12'  / 12  -> 12
 *
 * Anything unrecognised returns 0.
 *
 * @param {unknown} raw
 * @returns {number}
 */
export const parseExperienceMinYears = raw => {
  if (raw == null) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? Math.trunc(raw) : 0;

  let s = String(raw).toLowerCase().trim();
  if (!s || s === 'hobby') return 0;

  // Normalise dash variants (hyphen, en dash U+2013, em dash U+2014, figure dash
  // U+2012, hyphen-bullet U+2043, minus sign U+2212) into a single ASCII hyphen.
  s = s.replace(/[\u2010-\u2015\u2043\u2212-]/g, '-');
  // "15 to 20" → "15-20"
  s = s.replace(/\s+to\s+/g, '-');
  // strip unit words ("years", "year", "yrs", "yr", "y")
  s = s.replace(/\b(years?|yrs?|y)\b/g, '');
  // strip everything that is not digit / + / - / _ (kills stray punctuation/spaces)
  s = s.replace(/[^0-9+\-_]/g, '');
  // hyphen and underscore are both range separators
  s = s.replace(/-/g, '_');
  // strip leading/trailing separators / pluses
  s = s.replace(/^[_+]+|[_+]+$/g, '');

  if (!s) return 0;

  // range "a_b" → low end
  const range = s.match(/^(\d+)_(\d+)$/);
  if (range) return Number(range[1]);

  // pure number
  const num = s.match(/^(\d+)$/);
  if (num) return Number(num[1]);

  // last-resort: first integer found anywhere
  const firstInt = s.match(/(\d+)/);
  if (firstInt) return Number(firstInt[1]);

  return 0;
};

/**
 * publicData keys that may carry the coach experience value, in order of
 * preference. Different code paths / Console asset versions have used slightly
 * different keys, so we look them up uniformly here.
 */
const COACH_EXPERIENCE_PD_KEYS = [
  'experience',
  'peakupCoachExperience',
  'coachExperience',
  'experienceYears',
];

const readCoachExperienceRaw = pd => {
  if (!pd || typeof pd !== 'object') return null;
  for (const k of COACH_EXPERIENCE_PD_KEYS) {
    const v = pd[k];
    if (v != null && String(v).trim() !== '') return v;
  }
  return null;
};

/**
 * Display badge ids actually shown on coach UI (CoachCard, CoachMapPopup,
 * ProfilePage figurine, sidebar avatar ring, selected-marker glow…).
 *
 * Logic:
 *   1. Admin-only manual badges (founder / ambassador) win when set on
 *      `publicData.peakupCoachBadges` (or legacy boolean / `coachLevel`).
 *   2. Otherwise auto-derive from coach experience (read from any of the
 *      known publicData keys — see `COACH_EXPERIENCE_PD_KEYS`):
 *        experience years >= 10  -> ['top_coach']
 *        otherwise               -> ['certified_coach']
 *
 * Returns a single-element array so all existing consumers (sort by priority,
 * pickPrimaryTierId, verified-seal lookup) keep working without changes.
 *
 * @param {Object|null|undefined} profilePd `user.attributes.profile.publicData`
 * @returns {string[]}
 */
export const resolveDisplayBadgeIds = (profilePd = {}) => {
  const adminOnly = resolvePeakupCoachBadgeIds(profilePd).filter(id =>
    ADMIN_ONLY_BADGE_IDS.has(id)
  );
  if (adminOnly.length > 0) {
    const top = [...adminOnly].sort(
      (a, b) => (PEAKUP_COACH_BADGE_PRIORITY[b] || 0) - (PEAKUP_COACH_BADGE_PRIORITY[a] || 0)
    )[0];
    return [top];
  }
  const yrs = parseExperienceMinYears(readCoachExperienceRaw(profilePd));
  return yrs >= TOP_COACH_MIN_YEARS ? ['top_coach'] : ['certified_coach'];
};

/**
 * Restituisce la priorità più alta tra i badge passati. 0 se nessuno.
 *
 * @param {string[]} badgeIds output di {@link resolvePeakupCoachBadgeIds}
 * @returns {number}
 */
export const peakupCoachBadgePriorityFor = badgeIds => {
  if (!Array.isArray(badgeIds) || badgeIds.length === 0) return 0;
  let best = 0;
  for (const id of badgeIds) {
    const p = PEAKUP_COACH_BADGE_PRIORITY[id] || 0;
    if (p > best) best = p;
  }
  return best;
};

/**
 * Score recensioni "bayesian-light" per ranking landing: combina media e numero
 * (un coach con 12 recensioni @4.6 batte uno con 1 recensione @5.0).
 *
 * @param {{ reviewAverage?: number|null, reviewCount?: number|null } | undefined} c
 * @returns {number}
 */
export const peakupCoachReviewScore = c => {
  const avg = typeof c?.reviewAverage === 'number' ? c.reviewAverage : 0;
  const count = typeof c?.reviewCount === 'number' ? c.reviewCount : 0;
  if (count <= 0 || avg <= 0) return 0;
  // Smoothing: 5 recensioni "neutre" da 3.0 stelle assicurano stabilità per i nuovi profili.
  const PRIOR = 5;
  const PRIOR_AVG = 3.0;
  return ((PRIOR * PRIOR_AVG) + (count * avg)) / (PRIOR + count);
};

/**
 * Comparator per ordinare i coach nella landing "Featured":
 *   1) score recensioni (media + volume) — chi ha recensioni vince su chi non ne ha
 *   2) numero recensioni (tie-breaker dello score)
 *   3) priorità badge (Founder > Ambassador > Top coach > Certified > Coach level 4)
 *   4) nome alfabetico (tie-breaker finale)
 *
 * @param {{ author?: any, reviewAverage?: number|null, reviewCount?: number|null, badgePriority?: number }} a
 * @param {{ author?: any, reviewAverage?: number|null, reviewCount?: number|null, badgePriority?: number }} b
 */
export const comparePeakupFeaturedCoaches = (a, b) => {
  const sa = peakupCoachReviewScore(a);
  const sb = peakupCoachReviewScore(b);
  if (sa !== sb) return sb - sa;

  const ca = a?.reviewCount || 0;
  const cb = b?.reviewCount || 0;
  if (ca !== cb) return cb - ca;

  const pa = typeof a?.badgePriority === 'number'
    ? a.badgePriority
    : peakupCoachBadgePriorityFor(resolveDisplayBadgeIds(a?.author?.attributes?.profile?.publicData));
  const pb = typeof b?.badgePriority === 'number'
    ? b.badgePriority
    : peakupCoachBadgePriorityFor(resolveDisplayBadgeIds(b?.author?.attributes?.profile?.publicData));
  if (pa !== pb) return pb - pa;

  const na = (a?.author?.attributes?.profile?.displayName || '').toLowerCase();
  const nb = (b?.author?.attributes?.profile?.displayName || '').toLowerCase();
  return na.localeCompare(nb);
};

const VERIFIED_SEAL_BADGE_IDS = new Set(['founder', 'certified_coach', 'top_coach']);

/**
 * Mostra il sigillo “Verified coach” sulla card prezzo se il profilo ha badge di fiducia
 * oppure `publicData.peakupVerifiedCoach` (Console / estensioni dati).
 *
 * @param {Object} profilePd `user.attributes.profile.publicData`
 * @returns {boolean}
 */
export const coachStickerShowsVerifiedSeal = (profilePd = {}) => {
  const pd = profilePd || {};
  if (pd.peakupVerifiedCoach === true || pd.peakupVerifiedCoach === 'true' || pd.peakupVerifiedCoach === 1) {
    return true;
  }
  return resolvePeakupCoachBadgeIds(pd).some(id => VERIFIED_SEAL_BADGE_IDS.has(id));
};

/**
 * True se `profile.publicData` ha almeno un segnale coach proveniente dalle impostazioni dinamiche
 * (sport, lingue, prezzo/valuta, posizione, geo, badge, livello, esperienza).
 */
export const hasPeakUpCoachProfilePublicData = (profilePublicData = {}) => {
  const pd = profilePublicData || {};
  if (Array.isArray(pd.sports) && pd.sports.length > 0) return true;
  if (Array.isArray(pd.languages) && pd.languages.length > 0) return true;
  if (pd.coachLevel != null && String(pd.coachLevel).trim() !== '') return true;
  if (pd.experience != null && String(pd.experience).trim() !== '') return true;
  if (finiteNum(pd.lat) != null || finiteNum(pd.lng) != null) return true;
  if (finiteNum(pd.latitude) != null || finiteNum(pd.longitude) != null) return true;
  if (finiteNum(pd.location?.selectedPlace?.origin?.lat) != null) return true;
  if (finiteNum(pd.location?.selectedPlace?.origin?.lng) != null) return true;
  if (pd.coachCity != null && String(pd.coachCity).trim() !== '') return true;
  if (pd.coachCityText != null && String(pd.coachCityText).trim() !== '') return true;
  if (normalizeExtendedDataTextForDisplay(pd.location)) return true;
  if (resolvePeakupCoachBadgeIds(pd).length > 0) return true;
  return false;
};

/**
 * Mostra figurina + layout coach se il profilo o i listing danno segnali PeakUp/coach.
 * Con i campi “Coach & sessions”, basta compilare il profilo: non serve un listing.
 */
const COACH_PROVIDER_USER_TYPE_IDS = new Set(['coach', 'provider', 'instructor', 'seller']);
const CUSTOMER_USER_TYPE_IDS = new Set(['customer', 'member', 'buyer']);

const normalizeProfileUserTypeId = profilePublicData => {
  const raw = profilePublicData?.userType;
  return raw != null ? String(raw).trim().toLowerCase() : '';
};

/** `publicData.userType` explicitly marks a coach/provider account. */
export const isExplicitCoachProviderUserType = (profilePublicData = {}) => {
  const userType = normalizeProfileUserTypeId(profilePublicData);
  return userType.length > 0 && COACH_PROVIDER_USER_TYPE_IDS.has(userType);
};

/** `publicData.userType` explicitly marks a customer/member account. */
export const isExplicitCustomerUserType = (profilePublicData = {}) => {
  const userType = normalizeProfileUserTypeId(profilePublicData);
  return userType.length > 0 && CUSTOMER_USER_TYPE_IDS.has(userType);
};

/**
 * Coach-only profile signals (excludes sports/languages — members share those fields).
 */
export const hasPeakUpCoachOnlyProfilePublicData = (profilePublicData = {}) => {
  const pd = profilePublicData || {};
  if (pd.coachLevel != null && String(pd.coachLevel).trim() !== '') return true;
  if (pd.experience != null && String(pd.experience).trim() !== '') return true;
  if (finiteNum(pd.lat) != null || finiteNum(pd.lng) != null) return true;
  if (finiteNum(pd.latitude) != null || finiteNum(pd.longitude) != null) return true;
  if (finiteNum(pd.location?.selectedPlace?.origin?.lat) != null) return true;
  if (finiteNum(pd.location?.selectedPlace?.origin?.lng) != null) return true;
  if (pd.coachCity != null && String(pd.coachCity).trim() !== '') return true;
  if (pd.coachCityText != null && String(pd.coachCityText).trim() !== '') return true;
  if (normalizeExtendedDataTextForDisplay(pd.location)) return true;
  if (resolvePeakupCoachBadgeIds(pd).length > 0) return true;
  return false;
};

export const hasPeakUpListingCoachHints = (listings = []) => {
  const list = Array.isArray(listings) ? listings : [];
  return list.some(l => {
    const pub = l?.attributes?.publicData || {};
    return (
      listingHasPeakupBookingFlag(l) ||
      (Array.isArray(pub.sports) && pub.sports.length > 0) ||
      (pub.coachLevel != null && String(pub.coachLevel).trim() !== '')
    );
  });
};

/**
 * Coach figurina layout eligibility for ProfilePage (provider accounts use full hints).
 */
export const isCoachProfileStickerEligible = (
  listings = [],
  profilePublicData = {},
  userTypeRoles = {}
) => {
  const pd = profilePublicData || {};
  if (isPeakUpTeamUserType(pd)) {
    return false;
  }
  const coachOnlyProfile = hasPeakUpCoachOnlyProfilePublicData(pd);
  const listingHints = hasPeakUpListingCoachHints(listings);
  const isProvider = Boolean(userTypeRoles?.provider);
  const isCustomer = Boolean(userTypeRoles?.customer);

  if (isExplicitCustomerUserType(pd)) {
    return coachOnlyProfile || listingHints;
  }

  if (isExplicitCoachProviderUserType(pd)) {
    return shouldShowPeakUpProfileSticker(listings, pd, userTypeRoles);
  }

  if (isProvider && !isCustomer) {
    return shouldShowPeakUpProfileSticker(listings, pd, userTypeRoles);
  }

  if (isProvider && isCustomer) {
    return coachOnlyProfile || listingHints;
  }

  if (isCustomer && !isProvider) {
    return coachOnlyProfile || listingHints;
  }

  return coachOnlyProfile || listingHints;
};

/**
 * PeakUp member (customer) profile: community layout, not coach figurina.
 *
 * @param {Array} listings
 * @param {Object} profilePublicData
 * @param {{ customer?: boolean; provider?: boolean }} [userTypeRoles]
 * @returns {boolean}
 */
export const isPeakUpCustomerMemberProfile = (
  listings = [],
  profilePublicData = {},
  userTypeRoles = {}
) => {
  const pd = profilePublicData || {};

  if (isExplicitCoachProviderUserType(pd)) {
    return false;
  }

  if (isExplicitCustomerUserType(pd)) {
    return true;
  }

  const isProvider = Boolean(userTypeRoles?.provider);
  const isCustomer = Boolean(userTypeRoles?.customer);

  if (isProvider && !isCustomer) {
    return false;
  }

  const coachStickerEligible = isCoachProfileStickerEligible(listings, pd, userTypeRoles);

  // PeakUp member accounts: marketplace config marks customer-only (not provider).
  if (isCustomer && !isProvider) {
    return !coachStickerEligible;
  }

  return false;
};

/**
 * Coach onboarding / applicant flags on profile publicData (set at coach signup).
 *
 * @param {Object} profilePublicData
 * @returns {boolean}
 */
export const hasCoachOnboardingProfilePublicData = (profilePublicData = {}) => {
  const pd = profilePublicData || {};
  return (
    pd.coachOnboardingIntent === true ||
    pd.pendingCoachApplication === true ||
    pd.peakupCoachApplicant === true
  );
};

/**
 * PeakUp coach figurina + dark profile shell.
 * Identity (userType, provider role, onboarding flags) wins over empty profile/listings.
 *
 * @param {Array} listings
 * @param {Object} profilePublicData
 * @param {{ customer?: boolean; provider?: boolean }|null} [userTypeRoles]
 * @returns {boolean}
 */
export const shouldShowPeakUpProfileSticker = (
  listings = [],
  profilePublicData = {},
  userTypeRoles = null
) => {
  const pd = profilePublicData || {};
  const list = Array.isArray(listings) ? listings : [];
  const roles = userTypeRoles || {};

  if (isPeakUpTeamUserType(pd)) {
    return false;
  }

  const profileCoachHints = hasPeakUpCoachProfilePublicData(pd);
  const listingCoachHints = hasPeakUpListingCoachHints(list);
  const hintBasedCoach = !list.length ? profileCoachHints : listingCoachHints || profileCoachHints;

  // Explicit customer accounts: coach shell only when profile/listings carry coach signals.
  if (isExplicitCustomerUserType(pd) && !isExplicitCoachProviderUserType(pd)) {
    return hintBasedCoach;
  }

  if (isExplicitCoachProviderUserType(pd)) {
    return true;
  }

  if (hasCoachOnboardingProfilePublicData(pd)) {
    return true;
  }

  if (roles.provider && !roles.customer) {
    return true;
  }

  return hintBasedCoach;
};
