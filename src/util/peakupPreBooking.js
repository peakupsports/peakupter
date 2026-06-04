import { PEAKUP_COACH_PROFILE_LANGUAGE_KEY } from '../config/configPeakUpCoachUserFields';

import {
  canonicalizeSportKey,
  extractSportKeysFromCoachProfile,
  extractSportKeysFromListing,
  normalizeSportKey,
} from './coachExplore';
import { getFieldValue } from './fieldHelpers';
import {
  formatProfileLanguagesForSticker,
  formatProfileSportsForSticker,
} from './profileCoachSticker';

export const PEAKUP_PRE_BOOKING_PARTICIPANT_TYPES = ['self', 'child', 'group'];

export const PEAKUP_PRE_BOOKING_SKILL_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

const PARTICIPANT_MESSAGE_IDS = {
  self: 'PreBookingIntroModal.participantType.self',
  child: 'PreBookingIntroModal.participantType.child',
  group: 'PreBookingIntroModal.participantType.group',
};

const SKILL_MESSAGE_IDS = {
  beginner: 'ProfilePage.memberLevel_beginner',
  intermediate: 'ProfilePage.memberLevel_intermediate',
  advanced: 'ProfilePage.memberLevel_advanced',
  expert: 'ProfilePage.memberLevel_expert',
};

/**
 * Sport options for the pre-booking modal: main sports + variants from coach/listing data.
 *
 * @param {import('./reactIntl').intlShape} intl
 * @param {Object|null|undefined} listing
 * @param {Object|null|undefined} author
 * @returns {Array<{ value: string, label: string }>}
 */
const sportOptionsFromKeys = (intl, sportKeys) => {
  if (!sportKeys.length) {
    return [];
  }
  return formatProfileSportsForSticker(intl, sportKeys)
    .map(entry => ({ value: entry.key, label: entry.label }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const resolvePreBookingSportOptions = (intl, listing, author) => {
  const keys = new Set();
  extractSportKeysFromListing(listing).forEach(k => {
    const normalized = normalizeSportKey(k);
    if (normalized) {
      keys.add(normalized);
    }
  });
  extractSportKeysFromCoachProfile(author).forEach(k => {
    const normalized = normalizeSportKey(k);
    if (normalized) {
      keys.add(normalized);
    }
  });

  return sportOptionsFromKeys(intl, Array.from(keys));
};

/**
 * Sport options for pre-booking: listing sports when present, otherwise coach profile.
 *
 * @param {import('./reactIntl').intlShape} intl
 * @param {Object|null|undefined} listing
 * @param {Object|null|undefined} author
 * @returns {Array<{ value: string, label: string }>}
 */
export const resolvePreBookingSportOptionsForListing = (intl, listing, author) => {
  const listingKeys = extractSportKeysFromListing(listing)
    .map(k => canonicalizeSportKey(k))
    .filter(Boolean);
  const uniqueListingKeys = [...new Set(listingKeys)];
  if (uniqueListingKeys.length > 0) {
    return sportOptionsFromKeys(intl, uniqueListingKeys);
  }
  return resolvePreBookingSportOptions(intl, listing, author);
};

/**
 * Coach languages saved via Profile Settings → same `publicData` key as
 * `initialValuesForUserFields` / `pickUserFieldsData` (`languages`, form field `pub_languages`).
 *
 * @param {Object|null|undefined} publicData
 * @returns {string[]}
 */
export const coachLanguagesFromProfilePublicData = publicData => {
  const raw = getFieldValue(publicData, PEAKUP_COACH_PROFILE_LANGUAGE_KEY);
  if (raw == null) {
    return [];
  }
  const list = Array.isArray(raw) ? raw : [raw];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const code = String(item || '')
      .trim()
      .toLowerCase();
    if (!code || seen.has(code)) {
      continue;
    }
    seen.add(code);
    out.push(code);
  }
  return out;
};

/**
 * Session language options from coach Profile Settings only (multi-enum `languages`).
 *
 * @param {import('./reactIntl').intlShape} intl
 * @param {Object|null|undefined} author
 * @returns {Array<{ value: string, label: string }>}
 */
export const resolvePreBookingLanguageOptions = (intl, author) => {
  const publicData = author?.attributes?.profile?.publicData;
  const resolvedLanguages = coachLanguagesFromProfilePublicData(publicData);
  const resolvedLanguageOptions = formatProfileLanguagesForSticker(intl, resolvedLanguages)
    .map(entry => ({ value: entry.key, label: entry.label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // eslint-disable-next-line no-console
  console.log('[PeakUp PREBOOKING LANGUAGES]', {
    authorId: author?.id?.uuid ?? null,
    publicData,
    resolvedLanguages,
    resolvedLanguageOptions,
  });

  return resolvedLanguageOptions;
};

/**
 * @param {import('./reactIntl').intlShape} intl
 * @returns {Array<{ value: string, label: string }>}
 */
export const getPreBookingParticipantTypeOptions = intl =>
  PEAKUP_PRE_BOOKING_PARTICIPANT_TYPES.map(value => ({
    value,
    label: intl.formatMessage({
      id: PARTICIPANT_MESSAGE_IDS[value],
      defaultMessage: value,
    }),
  }));

/**
 * @param {import('./reactIntl').intlShape} intl
 * @returns {Array<{ value: string, label: string }>}
 */
export const getPreBookingSkillLevelOptions = intl =>
  PEAKUP_PRE_BOOKING_SKILL_LEVELS.map(value => ({
    value,
    label: intl.formatMessage({
      id: SKILL_MESSAGE_IDS[value],
      defaultMessage: value,
    }),
  }));

/**
 * @param {number} [max=12]
 * @returns {Array<{ value: string, label: string }>}
 */
export const getPreBookingParticipantCountOptions = (max = 12) =>
  Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    return { value: String(n), label: String(n) };
  });

/**
 * Normalize modal values for orderData / transaction protectedData.
 *
 * @param {Object} values
 * @param {Array<{ value: string, label: string }>} sportOptions
 * @param {Array<{ value: string, label: string }>} [languageOptions=[]]
 * @returns {Object|null}
 */
export const normalizePeakupPreBookingDetails = (
  values,
  sportOptions = [],
  languageOptions = []
) => {
  const sport = values?.sport?.trim?.() || '';
  const participantType = values?.participantType?.trim?.() || '';
  const skillLevel = values?.skillLevel?.trim?.() || '';
  const sessionLanguage = values?.sessionLanguage?.trim?.() || '';
  const countRaw = values?.participantCount;
  const participantCount = Number.parseInt(countRaw, 10);

  const requiresSessionLanguage = languageOptions.length > 0;

  if (
    !sport ||
    !participantType ||
    !skillLevel ||
    !Number.isInteger(participantCount) ||
    (requiresSessionLanguage && !sessionLanguage)
  ) {
    return null;
  }

  const sportOption = sportOptions.find(o => o.value === sport);
  const languageOption = languageOptions.find(o => o.value === sessionLanguage);
  const sessionLanguageMaybe = sessionLanguage
    ? {
        sessionLanguage,
        sessionLanguageLabel: languageOption?.label || sessionLanguage,
      }
    : {};

  return {
    sport,
    sportLabel: sportOption?.label || sport,
    participantType,
    skillLevel,
    participantCount,
    ...sessionLanguageMaybe,
  };
};

/**
 * Wrap booking form submit: require pre-booking details before checkout (except own listing).
 *
 * @param {Object} params
 * @param {Function} params.onSubmit
 * @param {Object|null|undefined} params.peakupPreBooking
 * @param {Function} [params.onRequirePreBooking]
 * @param {boolean} [params.isOwnListing=false]
 * @returns {Function}
 */
export const createBookingSubmitHandler = ({
  onSubmit,
  peakupPreBooking,
  peakupMeetingPoint,
  onRequirePreBooking,
  isOwnListing = false,
}) => values => {
  if (!isOwnListing && !peakupPreBooking) {
    if (typeof onRequirePreBooking === 'function') {
      onRequirePreBooking();
    }
    return undefined;
  }
  const preBookingMaybe = peakupPreBooking ? { peakupPreBooking } : {};
  const meetingPointMaybe =
    peakupMeetingPoint && typeof peakupMeetingPoint === 'object' ? { peakupMeetingPoint } : {};
  return onSubmit({ ...values, ...preBookingMaybe, ...meetingPointMaybe });
};
