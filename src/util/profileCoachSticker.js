import { listingHasPeakupBookingFlag } from './coachExplore';

/**
 * Mostra figurina + colonne coach se c’è segnale PeakUp/coach (listing o profilo).
 * Non richiede più solo peakupBookingListing, così funziona anche senza quel flag in Console.
 */
export const shouldShowPeakUpProfileSticker = (listings = [], profilePublicData = {}) => {
  const pd = profilePublicData || {};
  const list = Array.isArray(listings) ? listings : [];

  const profileCoachHints =
    (Array.isArray(pd.sports) && pd.sports.length > 0) ||
    (pd.coachLevel != null && String(pd.coachLevel).trim() !== '') ||
    (Array.isArray(pd.languages) && pd.languages.length > 0);

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
