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

/** Chiavi `publicData` scritte dal blocco “Coach & sessions” (e lette sulla Profile page). */
export const PEAK_UP_COACH_PROFILE_KEYS = [
  'sports',
  'languages',
  'currency',
  'priceFrom',
  'coachCityText',
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
  'skate',
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
  skate: 'Skate',
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

const languageEnumOptions = [
  { option: 'it', label: 'Italiano' },
  { option: 'en', label: 'English' },
  { option: 'de', label: 'Deutsch' },
  { option: 'fr', label: 'Français' },
  { option: 'es', label: 'Español' },
  { option: 'pt', label: 'Português' },
];

export const peakUpCoachUserFields = [
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
      label: 'Languages you coach in',
      displayInSignUp: false,
      isRequired: false,
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'currency',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'CHF', label: 'CHF (Swiss franc)' },
      { option: 'EUR', label: 'EUR (Euro)' },
    ],
    showConfig: {
      label: 'Session price currency',
    },
    saveConfig: {
      label: 'Price currency',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'CHF or EUR',
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'priceFrom',
    scope: 'public',
    schemaType: 'long',
    showConfig: {
      label: 'Starting price',
    },
    saveConfig: {
      label: 'Starting price (per session, whole units)',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'e.g. 80',
    },
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
  {
    key: 'coachCityText',
    scope: 'public',
    schemaType: 'shortText',
    showConfig: {
      label: 'City or area',
    },
    saveConfig: {
      label: 'City or area (shown on your profile)',
      displayInSignUp: false,
      isRequired: false,
      placeholderMessage: 'e.g. Laax, Chamonix, Tokyo…',
    },
    helpTextTranslationId: 'PeakUpCoachUserFields.coachCityTextHelp',
    userTypeConfig: {
      limitToUserTypeIds: false,
      userTypeIds: [],
    },
  },
];
