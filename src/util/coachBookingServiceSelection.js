import { types as sdkTypes } from './sdkLoader';
import { convertMoneyToNumber, formatCurrencyMajorUnit } from './currency';
import { isAllowedListingCurrency } from './fieldHelpers';
import { extractSportKeysFromListing, normalizeSportKey } from './coachExplore';
import { formatProfileSportsForSticker, PROFILE_SPORT_EMOJI } from './profileCoachSticker';
import { isPeakUpMultiDayExperienceListing } from './peakUpMultiDayExperienceListing';
import {
  getPeakupCustomerBookingListingPriceAmount,
  isPeakupCustomerHourlyBookingListing,
  isPeakupCustomerPriceVariationBookingListing,
  isPeakupCustomerPurchaseListing,
} from './coachBookingNavigation';
import { getPeakUpMultiDayExperienceListingDates } from './peakUpMultiDayExperienceListing';
import {
  PEAKUP_COACH_BADGE_PRIORITY,
  resolveDisplayBadgeIds,
  resolvePeakupCoachBadgeIds,
} from './profileCoachSticker';
import { TIER_BADGE_DEFAULT_LABELS, TIER_BADGE_MESSAGE_IDS } from './coachTier';

export const SERVICE_GROUP_LESSONS = 'lessons';
export const SERVICE_GROUP_CAMPS_EVENTS = 'campsEvents';

const MAX_SERVICE_CARD_BADGES = 2;

const BADGE_PRIORITY = ['bestPrice', 'privateLesson', 'camp', 'event', 'kidsFriendly'];

/** Trust tiers shown in the service-selection coach header (max 2). */
const SERVICE_MODAL_TRUST_BADGE_IDS = ['founder', 'ambassador', 'top_coach', 'certified_coach'];

const resolveCoachBookingServiceTrustBadgeIds = (profilePd = {}) => {
  const fromProfile = resolvePeakupCoachBadgeIds(profilePd).filter(id =>
    SERVICE_MODAL_TRUST_BADGE_IDS.includes(id)
  );
  const fromDisplay = resolveDisplayBadgeIds(profilePd).filter(id =>
    SERVICE_MODAL_TRUST_BADGE_IDS.includes(id)
  );
  const merged = [...new Set([...fromProfile, ...fromDisplay])];
  return merged
    .sort((a, b) => (PEAKUP_COACH_BADGE_PRIORITY[b] || 0) - (PEAKUP_COACH_BADGE_PRIORITY[a] || 0))
    .slice(0, 2);
};

/**
 * Up to two coach trust badges for the service-selection modal header.
 *
 * @param {Object} intl
 * @param {Object} [profilePd]
 * @returns {Array<{ id: string, label: string }>}
 */
export const resolveCoachBookingServiceTrustBadges = (intl, profilePd = {}) =>
  resolveCoachBookingServiceTrustBadgeIds(profilePd).map(id => ({
    id,
    label: intl.formatMessage({
      id: TIER_BADGE_MESSAGE_IDS[id],
      defaultMessage: TIER_BADGE_DEFAULT_LABELS[id] || id,
    }),
  }));

/**
 * @param {Object} intl
 * @param {Object} [profilePd]
 * @returns {string[]}
 */
export const resolveCoachBookingServiceTrustBadgeLabels = (intl, profilePd = {}) =>
  resolveCoachBookingServiceTrustBadges(intl, profilePd).map(b => b.label);

const { Money } = sdkTypes;

const stripHtml = html =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * @param {string} text
 * @param {number} [maxLength=140]
 * @returns {string|null}
 */
export const truncatePlainText = (text, maxLength = 140) => {
  const plain = stripHtml(text);
  if (!plain) {
    return null;
  }
  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength - 1).trim()}…`;
};

/**
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string|null}
 */
export const formatCoachBookingServiceSportLabel = (listing, intl) => {
  const keys = [
    ...new Set(
      extractSportKeysFromListing(listing)
        .map(k => normalizeSportKey(k))
        .filter(Boolean)
    ),
  ];
  if (keys.length === 0) {
    return null;
  }
  return formatProfileSportsForSticker(intl, keys)
    .map(entry => entry.label)
    .join(', ');
};

/**
 * Marketplace-style money string without trailing .00 when whole units.
 *
 * @param {Object} intl
 * @param {Object} money sdk Money
 * @returns {string}
 */
export const formatCoachBookingServiceCardMoney = (intl, money) => {
  const major = convertMoneyToNumber(money);
  const rounded = Math.round(major);
  if (Math.abs(major - rounded) < 0.005) {
    return formatCurrencyMajorUnit(intl, money.currency, String(rounded));
  }
  return intl.formatNumber(major, {
    style: 'currency',
    currency: money.currency,
    currencyDisplay: 'symbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

/**
 * @param {Object} listing
 * @param {Object} intl
 * @param {string} marketplaceCurrency
 * @returns {{ prefix: string|null, amount: string, suffix: string|null }|null}
 */
export const formatCoachBookingServicePriceDisplay = (listing, intl, marketplaceCurrency) => {
  const amountSubunits = getPeakupCustomerBookingListingPriceAmount(listing);
  if (amountSubunits == null) {
    return null;
  }

  const currency =
    listing?.attributes?.price?.currency || marketplaceCurrency || 'CHF';

  if (!isAllowedListingCurrency(currency)) {
    return null;
  }

  const money = new Money(amountSubunits, currency);
  const amount = formatCoachBookingServiceCardMoney(intl, money);
  const pd = listing?.attributes?.publicData || {};

  if (isPeakupCustomerPurchaseListing(listing)) {
    return {
      prefix: null,
      amount,
      suffix: intl.formatMessage({
        id: 'CoachBookingServiceSelection.priceSuffixTotal',
        defaultMessage: 'total',
      }),
    };
  }

  const unitType = pd.unitType;
  const hasMultipleVariants =
    isPeakupCustomerPriceVariationBookingListing(listing) &&
    Array.isArray(pd.priceVariants) &&
    pd.priceVariants.length > 1;

  const suffixByUnit = {
    hour: intl.formatMessage({
      id: 'CoachBookingServiceSelection.priceSuffixHour',
      defaultMessage: '/ hour',
    }),
    day: intl.formatMessage({
      id: 'CoachBookingServiceSelection.priceSuffixDay',
      defaultMessage: '/ day',
    }),
    night: intl.formatMessage({
      id: 'CoachBookingServiceSelection.priceSuffixNight',
      defaultMessage: '/ night',
    }),
  };

  const suffix = suffixByUnit[unitType] || null;
  const useFromPrefix =
    hasMultipleVariants || isPeakupCustomerHourlyBookingListing(listing) || unitType === 'day';

  return {
    prefix: useFromPrefix
      ? intl.formatMessage({
          id: 'CoachBookingServiceSelection.pricePrefixFrom',
          defaultMessage: 'From',
        })
      : null,
    amount,
    suffix,
  };
};

/** @deprecated Use formatCoachBookingServicePriceDisplay */
export const formatCoachBookingServicePriceLine = (listing, intl, marketplaceCurrency) => {
  const display = formatCoachBookingServicePriceDisplay(listing, intl, marketplaceCurrency);
  if (!display) {
    return null;
  }
  return [display.prefix, display.amount, display.suffix].filter(Boolean).join(' ');
};

const KIDS_FRIENDLY_PATTERN = /\b(kids?|children|youth|junior|family)\b/i;

/**
 * @param {Object} listing
 * @returns {boolean}
 */
export const isCoachBookingServiceKidsFriendly = listing => {
  const pd = listing?.attributes?.publicData || {};
  const title = listing?.attributes?.title || '';
  const description = listing?.attributes?.description || '';
  const blob = `${title} ${description} ${JSON.stringify(pd)}`;
  return KIDS_FRIENDLY_PATTERN.test(blob);
};

/**
 * @param {Object} listing
 * @param {Object} options
 * @param {boolean} [options.isBestPrice=false]
 * @returns {string[]}
 */
export const resolveCoachBookingServiceBadgeIds = (listing, { isBestPrice = false } = {}) => {
  const badges = [];
  if (isBestPrice) {
    badges.push('bestPrice');
  }

  const listingTypeRaw = String(listing?.attributes?.publicData?.listingType || '').toLowerCase();

  if (isPeakUpMultiDayExperienceListing(listing) || /camp|retreat|clinic/.test(listingTypeRaw)) {
    badges.push('camp');
  } else if (isPeakupCustomerPurchaseListing(listing)) {
    badges.push('event');
  }

  if (isPeakupCustomerHourlyBookingListing(listing)) {
    badges.push('privateLesson');
  }

  if (isCoachBookingServiceKidsFriendly(listing)) {
    badges.push('kidsFriendly');
  }

  return BADGE_PRIORITY.filter(id => badges.includes(id)).slice(0, MAX_SERVICE_CARD_BADGES);
};

/**
 * @param {Object} listing
 * @returns {typeof SERVICE_GROUP_LESSONS | typeof SERVICE_GROUP_CAMPS_EVENTS}
 */
export const getCoachBookingServiceGroup = listing =>
  isPeakupCustomerPurchaseListing(listing)
    ? SERVICE_GROUP_CAMPS_EVENTS
    : SERVICE_GROUP_LESSONS;

const startOfDayMs = date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * One-line camp/event schedule hint (date range or duration).
 *
 * @param {Object} listing
 * @param {Object} intl
 * @returns {string|null}
 */
export const formatCoachBookingServiceCampDetail = (listing, intl) => {
  if (!isPeakupCustomerPurchaseListing(listing)) {
    return null;
  }

  const pd = listing?.attributes?.publicData || {};
  const { experienceStartDate, experienceEndDate } = getPeakUpMultiDayExperienceListingDates(pd);
  const start = experienceStartDate ? new Date(experienceStartDate) : null;
  const end = experienceEndDate ? new Date(experienceEndDate) : null;

  if (!start || Number.isNaN(start.getTime())) {
    return null;
  }

  const endDate = end && !Number.isNaN(end.getTime()) ? end : start;
  const startMs = startOfDayMs(start);
  const endMs = startOfDayMs(endDate);

  if (endMs > startMs) {
    const dayCount = Math.round((endMs - startMs) / 86400000) + 1;
    const sameMonth =
      start.getUTCFullYear() === endDate.getUTCFullYear() &&
      start.getUTCMonth() === endDate.getUTCMonth();

    if (dayCount >= 2) {
      if (sameMonth) {
        const startLabel = intl.formatDate(start, { month: 'short', day: 'numeric' });
        const endDay = intl.formatDate(endDate, { day: 'numeric' });
        return `${startLabel} – ${endDay}`;
      }
      return `${intl.formatDate(start, { month: 'short', day: 'numeric' })} – ${intl.formatDate(endDate, { month: 'short', day: 'numeric' })}`;
    }
  }

  const spanDays =
    endMs >= startMs ? Math.round((endMs - startMs) / 86400000) + 1 : 1;
  if (spanDays > 1) {
    return intl.formatMessage(
      { id: 'CoachBookingServiceSelection.campDurationDays', defaultMessage: '{count} days' },
      { count: spanDays }
    );
  }

  return intl.formatDate(start, { month: 'short', day: 'numeric' });
};

/**
 * Section labels when a coach sells both lessons and camps/events.
 *
 * @param {Array<Object>} cards
 * @returns {{ showGrouping: boolean, sections: Array<{ id: string, cards: Object[] }> }}
 */
export const groupCoachBookingServiceCards = cards => {
  const list = Array.isArray(cards) ? cards : [];
  const lessons = list.filter(c => c.serviceGroup === SERVICE_GROUP_LESSONS);
  const campsEvents = list.filter(c => c.serviceGroup === SERVICE_GROUP_CAMPS_EVENTS);
  const showGrouping = lessons.length > 0 && campsEvents.length > 0;

  const sections = [];
  if (lessons.length > 0) {
    sections.push({ id: SERVICE_GROUP_LESSONS, cards: lessons });
  }
  if (campsEvents.length > 0) {
    sections.push({ id: SERVICE_GROUP_CAMPS_EVENTS, cards: campsEvents });
  }

  return { showGrouping, sections };
};

/**
 * Primary sport key on listing for thumbnail fallback.
 *
 * @param {Object} listing
 * @returns {string|null}
 */
export const pickCoachBookingServiceSportKey = listing => {
  const keys = extractSportKeysFromListing(listing)
    .map(k => normalizeSportKey(k))
    .filter(Boolean);
  return keys[0] || null;
};

/**
 * Emoji fallback when listing has no photo.
 *
 * @param {string|null} sportKey
 * @returns {string}
 */
export const coachBookingServiceSportEmoji = sportKey =>
  (sportKey && PROFILE_SPORT_EMOJI[sportKey]) || '🏅';

/**
 * Card rows for the profile service-selection modal.
 *
 * @param {Object} params
 * @param {Object[]} params.listings sorted bookable listings
 * @param {Object} params.intl
 * @param {string} params.marketplaceCurrency
 * @returns {Array<Object>}
 */
export const buildCoachBookingServiceCards = ({ listings, intl, marketplaceCurrency }) => {
  const list = Array.isArray(listings) ? listings : [];
  const priceAmounts = list
    .map(l => getPeakupCustomerBookingListingPriceAmount(l))
    .filter(n => n != null);
  const minPrice = priceAmounts.length > 0 ? Math.min(...priceAmounts) : null;

  return list.map(listing => {
    const listingId = listing?.id?.uuid;
    const title = String(listing?.attributes?.title || '').trim();
    const description = truncatePlainText(listing?.attributes?.description, 160);
    const sportLabel = formatCoachBookingServiceSportLabel(listing, intl);
    const priceDisplay = formatCoachBookingServicePriceDisplay(listing, intl, marketplaceCurrency);
    const priceAmount = getPeakupCustomerBookingListingPriceAmount(listing);
    const isBestPrice =
      minPrice != null && priceAmount != null && priceAmount === minPrice && list.length > 1;
    const sportKey = pickCoachBookingServiceSportKey(listing);
    const firstImage = listing?.images?.[0] || null;

    const serviceGroup = getCoachBookingServiceGroup(listing);
    const campDetail =
      serviceGroup === SERVICE_GROUP_CAMPS_EVENTS
        ? formatCoachBookingServiceCampDetail(listing, intl)
        : null;

    return {
      listing,
      listingId,
      title,
      description,
      sportLabel,
      sportKey,
      sportEmoji: coachBookingServiceSportEmoji(sportKey),
      firstImage,
      priceDisplay,
      serviceGroup,
      campDetail,
      badgeIds: resolveCoachBookingServiceBadgeIds(listing, { isBestPrice }),
    };
  });
};
