import { coachCityCenter, coachCityLabel } from '../config/configCoachCity';
import { listingHasPeakupBookingFlag } from './coachExplore';
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
 * Sport da `publicData.sports` → emoji + label (label via react-intl con defaultMessage).
 * @param {import('react-intl').intlShape} intl
 * @param {string[]|unknown} sports
 */
export const formatProfileSportsForSticker = (intl, sports) =>
  (sports || []).map(sportRaw => {
    const raw = String(sportRaw || '').trim();
    const key = raw.toLowerCase().replace(/\s+/g, '');
    const emoji = PROFILE_SPORT_EMOJI[key] || '🏅';
    const label = intl.formatMessage(
      { id: `ProfilePage.sportSticker.${key}`, defaultMessage: raw || key },
      {}
    );
    return { key, emoji, label };
  });

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
 * Testo esperienza da `publicData.experience`.
 * @param {import('react-intl').intlShape} intl
 * @param {string} experienceKey
 */
export const formatCoachExperienceLabel = (intl, experienceKey) => {
  if (experienceKey == null || experienceKey === '') {
    return null;
  }
  const k = String(experienceKey);
  const slug = k.replace(/\+/g, 'plus');
  const defaultMessage = EXPERIENCE_DEFAULTS[k] ?? k;
  return intl.formatMessage(
    { id: `ProfilePage.coachExperience_${slug}`, defaultMessage: defaultMessage },
    {}
  );
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

  const sports = mergeCoachSports(pd, lp);
  const languages = mergeCoachLanguages(pd, lp);

  const priceFrom = pd.priceFrom ?? lp.priceFrom;
  const currency = pd.currency ?? lp.currency ?? 'CHF';

  return {
    sports,
    languages,
    priceFrom,
    currency,
    locationLine,
    lat: latResolved,
    lng: lngResolved,
  };
};

/**
 * Badges you set in profile `publicData` (see Console): array or booleans.
 *
 * Array `peakupCoachBadges`: e.g. ['ambassador', 'top_coach', 'certified_coach', 'coach_level_4']
 * Booleans: peakupBadgeAmbassador, peakupBadgeTopCoach, peakupBadgeCertifiedCoach, peakupBadgeCoachLevel4
 *
 * @returns {string[]} stable ids for `ProfilePage.stickerBadge_<id>`
 */
export const resolvePeakupCoachBadgeIds = (profilePd = {}) => {
  const pd = profilePd || {};
  const fromArray = pd.peakupCoachBadges;
  if (Array.isArray(fromArray) && fromArray.length) {
    return fromArray
      .map(x =>
        String(x || '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '_')
      )
      .filter(Boolean);
  }
  const ids = [];
  const t = v => v === true || v === 'true' || v === '1';
  if (t(pd.peakupBadgeAmbassador)) ids.push('ambassador');
  if (t(pd.peakupBadgeTopCoach)) ids.push('top_coach');
  if (t(pd.peakupBadgeCertifiedCoach)) ids.push('certified_coach');
  if (t(pd.peakupBadgeCoachLevel4) || t(pd.certificateCoach4) || t(pd.certifiedCoachLevel4)) {
    ids.push('coach_level_4');
  }
  return ids;
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
  if (pd.priceFrom != null && String(pd.priceFrom).trim() !== '') return true;
  if (pd.currency != null && String(pd.currency).trim() !== '') return true;
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
export const shouldShowPeakUpProfileSticker = (listings = [], profilePublicData = {}) => {
  const pd = profilePublicData || {};
  const list = Array.isArray(listings) ? listings : [];

  const profileCoachHints = hasPeakUpCoachProfilePublicData(pd);

  const listingCoachHints = list.some(l => {
    const pub = l?.attributes?.publicData || {};
    return (
      listingHasPeakupBookingFlag(l) ||
      (Array.isArray(pub.sports) && pub.sports.length > 0) ||
      (pub.coachLevel != null && String(pub.coachLevel).trim() !== '')
    );
  });

  if (!list.length) {
    return profileCoachHints;
  }

  return listingCoachHints || profileCoachHints;
};
