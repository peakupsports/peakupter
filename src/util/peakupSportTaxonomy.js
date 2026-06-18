import { normalizeSportKey } from './coachExplore';
import { SKI_SPORT_KEYS, SKT_SPORT_KEYS, SNOWBOARD_SPORT_KEYS } from './sportFilterKeys';

// Canonical top-level PeakUp sports shown in the global SportBar navigation.
// The Landing hero "Your sport" dropdown should mirror THIS taxonomy instead
// of rendering every hosted category as-is.
export const PEAKUP_TOP_LEVEL_SPORT_LABELS = Object.freeze({
  surf: 'Surf',
  mtb: 'MTB',
  tennis: 'Tennis',
  golf: 'Golf',
  climbing: 'Climbing',
  canyoning: 'Canyoning',
  yoga: 'Yoga',
  skydive: 'Skydive',
  fitness: 'Fitness',
  wakeboard: 'Wakeboard',
  wakesurf: 'Wakesurf',
  kitesurf: 'Kitesurf',
  skateboard: 'Skateboard',
  snowboard: 'Snowboard',
  ski: 'Ski',
  crosscountry: 'Cross-country',
});

export const PEAKUP_TOP_LEVEL_SPORT_ORDER = Object.freeze([
  'surf',
  'mtb',
  'tennis',
  'golf',
  'climbing',
  'canyoning',
  'yoga',
  'skydive',
  'fitness',
  'wakeboard',
  'wakesurf',
  'kitesurf',
  'skateboard',
  'snowboard',
  'ski',
  'crosscountry',
]);

export const PEAKUP_WINTER_VARIANT_LABELS = Object.freeze({
  skitouring: 'Skitouring',
  splittouring: 'Split touring',
  freerideskiing: 'Freeride skiing',
  freeridesnowboard: 'Freeride snowboard',
  freestylesnowboard: 'Freestyle snowboard',
  freestyleskiing: 'Freeski',
});

const SPORT_KEY_ALIASES = Object.freeze({
  wakeboarding: 'wakeboard',
  wakesurfing: 'wakesurf',
  snowboarding: 'snowboard',
  skiing: 'ski',
  surfing: 'surf',
  kitesurfing: 'kitesurf',
  skydiving: 'skydive',
  mountainbike: 'mtb',
  mountainbiking: 'mtb',
  freerideski: 'freerideskiing',
  freestyleski: 'freestyleskiing',
  splitboard: 'splittouring',
  skate: 'skateboard',
});

const buildTopLevelSportMap = () => {
  const map = {};

  PEAKUP_TOP_LEVEL_SPORT_ORDER.forEach(key => {
    map[normalizeSportKey(key)] = key;
  });

  SNOWBOARD_SPORT_KEYS.forEach(key => {
    map[normalizeSportKey(key)] = 'snowboard';
  });

  SKI_SPORT_KEYS.forEach(key => {
    map[normalizeSportKey(key)] = 'ski';
  });

  SKT_SPORT_KEYS.forEach(key => {
    map[normalizeSportKey(key)] = 'skateboard';
  });

  return Object.freeze(map);
};

const TOP_LEVEL_SPORT_BY_KEY = buildTopLevelSportMap();

/**
 * Resolve a free-form / hosted sport key to the canonical top-level PeakUp
 * sport used by the SportBar navigation.
 *
 * Examples:
 *   wakeboarding        -> wakeboard
 *   freeridesnowboard   -> snowboard
 *   freestyleski        -> ski
 *   splitboard          -> snowboard
 *   skate               -> skateboard
 *
 * Unknown / legacy values return '' so consumers can filter them out.
 */
export const toPeakUpTopLevelSportKey = value => {
  const normalized = normalizeSportKey(value);
  if (!normalized) return '';
  const canonical = SPORT_KEY_ALIASES[normalized] || normalized;
  return TOP_LEVEL_SPORT_BY_KEY[canonical] || '';
};

export const getPeakUpTopLevelSportOptions = () =>
  PEAKUP_TOP_LEVEL_SPORT_ORDER.map(key => ({
    id: key,
    name: PEAKUP_TOP_LEVEL_SPORT_LABELS[key] || key,
  }));

/**
 * Stable-sort arbitrary top-level sport items by the shared PeakUp canonical
 * order used by the SportBar navigation.
 *
 * Unknown keys are preserved at the tail in original order so consumers can
 * opt in safely without losing future / experimental items.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string} getKey
 * @returns {T[]}
 */
export const sortByPeakUpTopLevelSportOrder = (items, getKey) => {
  if (!Array.isArray(items)) return items;

  const orderIndex = PEAKUP_TOP_LEVEL_SPORT_ORDER.reduce((acc, key, index) => {
    acc[key] = index;
    return acc;
  }, {});

  return items
    .map((item, originalIndex) => {
      const normalizedKey = toPeakUpTopLevelSportKey(typeof getKey === 'function' ? getKey(item) : '');
      return {
        item,
        originalIndex,
        orderIndex:
          normalizedKey && Object.prototype.hasOwnProperty.call(orderIndex, normalizedKey)
            ? orderIndex[normalizedKey]
            : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((a, b) =>
      a.orderIndex !== b.orderIndex ? a.orderIndex - b.orderIndex : a.originalIndex - b.originalIndex
    )
    .map(entry => entry.item);
};

const getHostedCategoryMatch = category => {
  const idTopLevelKey = toPeakUpTopLevelSportKey(category?.id);
  const nameTopLevelKey = toPeakUpTopLevelSportKey(category?.name);

  const normalizedId = normalizeSportKey(category?.id);
  const normalizedName = normalizeSportKey(category?.name);

  if (idTopLevelKey && normalizedId === idTopLevelKey) {
    return { topLevelKey: idTopLevelKey, priority: 0 };
  }

  if (nameTopLevelKey && normalizedName === nameTopLevelKey) {
    return { topLevelKey: nameTopLevelKey, priority: 1 };
  }

  if (idTopLevelKey) {
    return { topLevelKey: idTopLevelKey, priority: 2 };
  }

  if (nameTopLevelKey) {
    return { topLevelKey: nameTopLevelKey, priority: 3 };
  }

  return null;
};

/**
 * Build the Landing hero category list from hosted categories while enforcing
 * the canonical SportBar taxonomy:
 *   - filters out unrelated / legacy categories not in PeakUp's sport system
 *   - collapses known variants to their top-level parent (e.g. Freeride
 *     Snowboard -> Snowboard)
 *   - keeps the original hosted category id so existing form values still work
 *   - normalizes the visible label to the canonical SportBar label
 *   - orders the result exactly like the SportBar navigation
 */
export const mapHostedCategoriesToPeakUpTopLevelSports = categories => {
  if (!Array.isArray(categories)) return [];

  const bestCategoryByTopLevelKey = new Map();

  categories.forEach(category => {
    const match = getHostedCategoryMatch(category);
    if (!match) {
      return;
    }

    const existing = bestCategoryByTopLevelKey.get(match.topLevelKey);
    if (existing && existing.priority <= match.priority) return;

    bestCategoryByTopLevelKey.set(match.topLevelKey, {
      priority: match.priority,
      category: {
        ...category,
        name: PEAKUP_TOP_LEVEL_SPORT_LABELS[match.topLevelKey] || category?.name || match.topLevelKey,
      },
    });
  });

  return PEAKUP_TOP_LEVEL_SPORT_ORDER.map(key => bestCategoryByTopLevelKey.get(key)?.category).filter(Boolean);
};
