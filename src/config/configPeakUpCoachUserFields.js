/**
 * PeakUp: campi profilo coach / istruttore (publicData).
 * Uniti in configHelpers.mergeUserConfig con `union(..., peakUpCoachUserFields)` così compaiono
 * anche con asset Console, senza dover duplicare tutto in user-fields.json.
 *
 * Le stesse chiavi sono la sorgente dati per la figurina (`resolveCoachStickerDisplay` in
 * profileCoachSticker.js) e per `shouldShowPeakUpProfileSticker` quando il coach compila il profilo.
 *
 * Nota: posizione mappa coach = campo dedicato in ProfileSettingsForm (`FieldCoachMapLocation`),
 * con lat/lng globali; non usiamo più il menu elenco città SV.
 */

import getCountryCodes from '../translations/countryCodes';

// NOTE: Coach hourly price is derived from the hourly booking listing only.

/** ISO-2 country codes for coach nationality (`publicData.country`). */
export const PEAKUP_COACH_PROFILE_COUNTRY_KEY = 'country';

/** Chiavi `publicData` scritte dal blocco “Coach & sessions” (e lette sulla Profile page).
 *
 * Nota: `peakupCoachBadges` è mantenuto in lista per compatibilità con i dati
 * salvati lato Console (admin-only Founder/Ambassador), ma non è più esposto
 * come form field nel ProfileSettings — vedi nota sotto sull'entry rimossa.
 */
/**
 * `publicData` key for Profile Settings “Languages you coach” (`pub_languages` in the form).
 * @see ProfileSettingsForm.js `PUB_LANGUAGES_KEY` / pickUserFieldsData → `languages`
 */
export const PEAKUP_COACH_PROFILE_LANGUAGE_KEY = 'languages';

export const PEAK_UP_COACH_PROFILE_KEYS = [
  'sports',
  PEAKUP_COACH_PROFILE_LANGUAGE_KEY,
  'peakupCoachBadges',
  'coachCityText',
  'coachTravelNearby',
];

/** Stesso ordine / set degli sport usati in SportBar / footer di mercato. */
const PRIMARY_SPORT_ORDER = [
  'surf',
  'mtb',
  'tennis',
  'golf',
  'climbing',
  'yoga',
  'skydive',
  'fitness',
  'wakeboard',
  // `wakesurf` is a separate bookable sport on PeakUp (NOT a Wakeboard
  // variant). Listed next to `wakeboard` for adjacency in the Profile
  // Settings multi-enum; treated as its own canonical sport key.
  'wakesurf',
  'kitesurf',
  'snowboard',
  'ski',
  'crosscountry',
];

const WINTER_SPORT_EXTRAS = [
  'skitouring',
  'splittouring',
  'freerideskiing',
  'freeridesnowboard',
  'freestylesnowboard',
  'freestyleskiing',
  'skateboard',
];

const SPORT_LABELS = {
  surf: 'Surf',
  mtb: 'MTB',
  tennis: 'Tennis',
  golf: 'Golf',
  climbing: 'Climbing',
  yoga: 'Yoga',
  skydive: 'Skydive',
  fitness: 'Fitness',
  wakeboard: 'Wakeboard',
  wakesurf: 'Wakesurf',
  kitesurf: 'Kitesurf',
  snowboard: 'Snowboard',
  ski: 'Ski',
  crosscountry: 'Cross-country',
  skitouring: 'Skitouring',
  splittouring: 'Split touring',
  freerideskiing: 'Freeride skiing',
  freeridesnowboard: 'Freeride snowboard',
  freestylesnowboard: 'Freestyle snowboard',
  freestyleskiing: 'Freeski',
  skateboard: 'Skateboard',
};

const sportEnumOptions = () => {
  const seen = new Set();
  const keys = [];
  for (const k of [...PRIMARY_SPORT_ORDER, ...WINTER_SPORT_EXTRAS]) {
    if (seen.has(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys.map(option => ({
    option,
    label: SPORT_LABELS[option] || option,
  }));
};

/** Central PeakUp sport library (SportBar + coach profile + team identity). */
export const PEAKUP_SPORT_ENUM_OPTIONS = sportEnumOptions();

const languageEnumOptions = [
  { option: 'it', label: 'Italiano' },
  { option: 'en', label: 'English' },
  { option: 'de', label: 'Deutsch' },
  { option: 'fr', label: 'Français' },
  { option: 'es', label: 'Español' },
  { option: 'pt', label: 'Português' },
];

/** ISO-3166-1 alpha-2 options for coach nationality (figurina flag + search). */
const countryEnumOptions = () => {
  const seen = new Set();
  return getCountryCodes('en')
    .filter(({ code }) => {
      if (!code || seen.has(code)) {
        return false;
      }
      seen.add(code);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ code, name }) => ({ option: code, label: name }));
};

export const peakUpCoachUserFields = [
  {
    key: PEAKUP_COACH_PROFILE_COUNTRY_KEY,
    scope: 'public',
    schemaType: 'enum',
    enumOptions: countryEnumOptions(),
    showConfig: {
      label: 'Country',
    },
    saveConfig: {
      label: 'Country',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'Select your country',
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'sports',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: sportEnumOptions(),
    showConfig: {
      label: 'Sports you coach',
    },
    saveConfig: {
      label: 'Sports you coach',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'Select one or more',
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'languages',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: languageEnumOptions,
    showConfig: {
      label: 'Coaching languages',
    },
    saveConfig: {
      label: 'Languages you coach',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  // NOTE: `peakupCoachBadges` form field intentionally removed.
  // Founder / Ambassador are admin-only (set via Console / API on
  // `publicData.peakupCoachBadges`).
  // Top coach / Certified coach are auto-derived from `experience` years —
  // see `resolveDisplayBadgeIds` in `src/util/profileCoachSticker.js`.
  // NOTE: Coach hourly price must come from the hourly booking listing only
  // (`listing.attributes.price`). We intentionally do NOT expose or store a
  // profile-level hourly price anymore.
  {
    // Visual short label shown on the profile, the figurina coach card,
    // the CoachCard sidebar, and the CoachMap popup. This is the user-
    // facing "where I'm based" copy — kept short, readable and editorial
    // (e.g. "Laax", "Zermatt", "Chamonix"). It is intentionally separate
    // from the precise Mapbox map pin (`pub_coachMapLocation`), which
    // only drives map positioning and distance.
    key: 'coachCityText',
    scope: 'public',
    schemaType: 'shortText',
    showConfig: {
      label: 'Location',
    },
    saveConfig: {
      label: 'Location shown on your profile',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'e.g. Laax, Zermatt, Chamonix…',
    },
    helpTextTranslationId: 'PeakUpCoachUserFields.coachCityTextHelp',
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'coachTravelNearby',
    scope: 'public',
    schemaType: 'boolean',
    showConfig: {
      label: 'Availability',
    },
    saveConfig: {
      label: 'Are you available to coach in nearby areas?',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
];
