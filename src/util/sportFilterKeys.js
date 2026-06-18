/**
 * Parent sports (Snowboard, Ski) aggregate listing sub-disciplines from publicData.sports.
 * Used by coach explore filters and SportBar winter accordion (Coach map).
 */

export const SNOWBOARD_SPORT_KEYS = [
  'snowboard',
  'freeridesnowboard',
  'freestylesnowboard',
  'splittouring',
];

export const SKI_SPORT_KEYS = ['ski', 'freerideskiing', 'skitouring', 'freestyleskiing'];

// Skateboard is the canonical platform key (`SPORT_LABELS.skateboard`).
// `skate` is kept as a back-compat alias for legacy coach data; the
// SportBar / CoachMap chip dispatches `skateboard` and the filter expands
// it to both keys via `matchSportFilterKeys`.
export const SKT_SPORT_KEYS = ['skate', 'skateboard'];

/** Slugs also used on sport CMS pages (/p/:pageId); extend as you add landing pages */
const PRIMARY_SPORT_PAGE_SLUGS = [
  ...SNOWBOARD_SPORT_KEYS,
  ...SKI_SPORT_KEYS,
  'surf',
  'mtb',
  'tennis',
  'yoga',
  'golf',
  'crosscountry',
  'wakeboard',
  // Separate top-level sport (not a Wakeboard variant). `matchSportFilterKeys`
  // does not need a special case — `wakesurf` maps to a single key just
  // like `surf` / `golf` / `tennis`.
  'wakesurf',
  'skydive',
  'fitness',
  'climbing',
  'canyoning',
  'kitesurf',
  'skateboard',
];

export const KNOWN_MARKETPLACE_SPORT_SLUG_SET = new Set(PRIMARY_SPORT_PAGE_SLUGS);

const normalizeHyphen = value =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-');

/**
 * Whether a CMS pageId looks like a sport landing (/p/ski-lessons → segment "ski").
 *
 * @param {string} pageId
 * @returns {boolean}
 */
export const pageIdHasKnownSportSegment = pageId => {
  const raw = String(pageId || '').toLowerCase();
  if (!raw) return false;
  const segments = raw.split(/[^a-z0-9]+/).filter(Boolean);
  return segments.some(seg => KNOWN_MARKETPLACE_SPORT_SLUG_SET.has(seg));
};

/**
 * Keys to match against coach listing sports when filtering by SportBar parent or leaf.
 *
 * @param {string} selectedSportNormalized hyphenated/lowercased sport key from UI
 * @returns {string[]}
 */
export const matchSportFilterKeys = selectedSportNormalized => {
  const v = normalizeHyphen(selectedSportNormalized);
  if (!v) return [];

  if (v === 'snowboard') return SNOWBOARD_SPORT_KEYS.slice();
  if (v === 'ski') return SKI_SPORT_KEYS.slice();
  // Skateboard chip should also match legacy `skate` coach entries.
  if (v === 'skateboard' || v === 'skate') return SKT_SPORT_KEYS.slice();

  return [v];
};
