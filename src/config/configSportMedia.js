import {
  extractSportKeysFromCoachProfile,
  extractSportKeysFromListing,
  normalizeSportKey,
} from '../util/coachExplore';

/**
 * =============================================================================
 *  PeakUp Sport-Media Library — TEMPORARY integration test
 * =============================================================================
 *
 * Cinematic / lifestyle sport visuals committed under `public/CoachPagePic/`.
 * Despite the legacy folder name, these assets are **not** coach portraits,
 * avatars, figurine card images, or listing gallery images. They are sport-
 * themed banners intended to power:
 *
 *   - dedicated sport landing pages (e.g. `/sports/snowboard`)
 *   - sport category section headers
 *   - footer sport navigation hubs
 *   - cinematic landing-page banners
 *   - marketing / promotional sections
 *   - fullscreen sport hero backgrounds
 *
 * ## Architectural separation (do not break)
 *
 * The library MUST stay decoupled from anything that displays a personal
 * image of a coach. In particular it must NEVER be auto-injected into:
 *
 *   - the figurina / `PeakUpCoachFigurineCard` photo frame
 *   - the coach avatar slot (`Avatar`, `AvatarLarge`, `ResponsiveImage`
 *     bound to `profileImage`)
 *   - the `ProfilePage` figurine sticker photo
 *   - the listing gallery (`ListingPage` `ImageCarousel`, etc.)
 *
 * The only consumers should be deliberately-styled sport-themed surfaces
 * that the user explicitly opts in.
 *
 * ## Filename policy (TEMPORARY)
 *
 * Filenames are used **exactly as they exist on disk** for this first
 * functional integration test, including the `Crosscoutry.jpg` typo. A
 * follow-up cleanup will rename the assets, deduplicate (e.g. `Snowboard1`
 * → `Snowboard`), compress, and add `@2x` / WebP variants. Until then,
 * any caller that imports a URL through this module is shielded from
 * the on-disk filename details.
 *
 * ## Future shape
 *
 * Each library entry is an object so we can extend it without breaking
 * the public API. Likely future fields:
 *
 *   { hero, background, thumbnail, poster, video, credit, focalPoint }
 *
 * Today only `hero` is populated; consumers should access values
 * through the helpers below rather than reaching into the library
 * directly, so we can evolve the storage shape without refactoring
 * call sites.
 * =============================================================================
 */

const ASSET_BASE = '/CoachPagePic';

/**
 * Strict sport → media-asset map. Keys are stored in their normalized
 * form (lower-case, no separators) so callers can pass any free-form
 * label through `normalizeSportKey` before lookup.
 *
 * Only the 8 sports we currently have artwork for are mapped — anything
 * else falls through to `SPORT_MEDIA_FALLBACK`. Aliases / discipline
 * variants (e.g. `freeridesnowboard`, `splittouring`, `kitesurfing`) are
 * intentionally NOT pre-aliased here; that's a follow-up once we know
 * which variants ship to production. Using the raw 8-key set keeps this
 * integration test honest about coverage gaps.
 *
 * @type {Readonly<Record<string, Readonly<{ hero: string }>>>}
 */
export const SPORT_MEDIA_LIBRARY = Object.freeze({
  snowboard: Object.freeze({ hero: `${ASSET_BASE}/Snowboard1.jpg` }),
  ski: Object.freeze({ hero: `${ASSET_BASE}/Ski.jpg` }),
  mtb: Object.freeze({ hero: `${ASSET_BASE}/MTB.jpg` }),
  golf: Object.freeze({ hero: `${ASSET_BASE}/Golf.jpg` }),
  tennis: Object.freeze({ hero: `${ASSET_BASE}/Tennis.jpg` }),
  kitesurf: Object.freeze({ hero: `${ASSET_BASE}/KiteSurf.jpg` }),
  skydive: Object.freeze({ hero: `${ASSET_BASE}/SkyDive.jpg` }),
  // Note: filename is `Crosscoutry.jpg` (typo) on disk — preserved
  // verbatim per the temporary-asset policy above. The MAP key
  // remains the canonical normalized sport key (`crosscountry`).
  crosscountry: Object.freeze({ hero: `${ASSET_BASE}/Crosscoutry.jpg` }),
});

/**
 * The set of canonical, normalized sport keys covered by the library.
 * Useful for callers that want to render a "supported sports" pill
 * row, or that want to assert at boot time that every sport in the
 * SportBar has a hero image (failing tests early when an asset is
 * missing).
 *
 * @type {readonly string[]}
 */
export const SPORT_MEDIA_KEYS = Object.freeze(Object.keys(SPORT_MEDIA_LIBRARY));

/**
 * Default hero image used when a sport has no entry in the library yet.
 * Snowboarding is the closest visual to PeakUp's brand identity, so
 * unmapped sports fall back to it instead of an empty / grey banner.
 *
 * Callers can override this per-call (`opts.fallback = '/some/other.jpg'`)
 * or disable it entirely (`opts.fallback = null`) when they prefer to
 * render nothing.
 *
 * @type {string}
 */
export const SPORT_MEDIA_FALLBACK = SPORT_MEDIA_LIBRARY.snowboard.hero;

/**
 * Look up a sport hero image URL by free-form sport key.
 *
 *   getSportHeroImage('snowboard')        → '/CoachPagePic/Snowboard1.jpg'
 *   getSportHeroImage('Cross-Country')    → '/CoachPagePic/Crosscoutry.jpg'
 *   getSportHeroImage('Kite Surf')        → '/CoachPagePic/KiteSurf.jpg'
 *   getSportHeroImage('🏂 Snowboard')      → '/CoachPagePic/Snowboard1.jpg'
 *   getSportHeroImage('yoga')             → SPORT_MEDIA_FALLBACK
 *   getSportHeroImage('yoga', { fallback: null }) → null
 *
 * @param {*} sportKey free-form sport label or normalized key
 * @param {Object} [opts]
 * @param {string|null} [opts.fallback] override the default fallback
 *   image; pass `null` to disable the fallback (returns `null` when
 *   no match)
 * @returns {string|null}
 */
export const getSportHeroImage = (sportKey, opts = {}) => {
  const fallback = 'fallback' in opts ? opts.fallback : SPORT_MEDIA_FALLBACK;
  const key = normalizeSportKey(sportKey);
  const entry = key ? SPORT_MEDIA_LIBRARY[key] : null;
  if (entry?.hero) return entry.hero;
  return fallback === null ? null : fallback;
};

/**
 * Walk a list of free-form sport keys and return the first one that
 * has a media-library entry. Used to support multi-sport coaches /
 * mixed-discipline pages: the helper stops at the first key with a
 * mapped asset and returns it in normalized form.
 *
 *   pickFirstMappedSportKey(['yoga', 'mtb', 'ski']) → 'mtb'
 *   pickFirstMappedSportKey(['Cross-Country', 'Yoga']) → 'crosscountry'
 *   pickFirstMappedSportKey(['yoga', 'pilates']) → null
 *
 * @param {Iterable<*>} sportKeys
 * @returns {string|null} normalized key or `null` when none match
 */
export const pickFirstMappedSportKey = sportKeys => {
  if (!sportKeys || typeof sportKeys[Symbol.iterator] !== 'function') return null;
  for (const k of sportKeys) {
    const norm = normalizeSportKey(k);
    if (norm && SPORT_MEDIA_LIBRARY[norm]) return norm;
  }
  return null;
};

/**
 * Convenience helper that resolves a sport hero image for a coach
 * record (the same shape returned by `mergeListingsByAuthor` and
 * consumed by `CoachCard` / `CoachMapPopup`).
 *
 * Sport-key resolution order:
 *
 *   1. Profile-level sports declared by the coach in Profile Settings
 *      (`extractSportKeysFromCoachProfile`). These are the coach's
 *      self-declared "primary" sports and win over listing-level
 *      sports.
 *   2. Listing-level sports from the representative listing.
 *   3. Pre-computed `coach.sportKeys` (already merged + normalized
 *      by `mergeListingsByAuthor`), as a final defensive fallback.
 *
 * The first sport in that walk that has a mapped library entry wins.
 *
 * NOTE: this helper is provided so future sport-themed surfaces (a
 * coach-specific landing banner, a "discover by sport" landing page,
 * marketing tiles, etc.) can resolve a relevant background without
 * each caller re-implementing the sport-key extraction. It does NOT
 * authorize any caller to inject these images into the figurina,
 * the avatar slot, or the listing gallery — see the architectural
 * separation note at the top of this module.
 *
 * @param {Object} coach `{ author, representativeListing, sportKeys? }`
 * @param {Object} [opts]
 * @param {string|null} [opts.fallback]
 * @returns {string|null}
 */
export const getSportHeroImageForCoach = (coach, opts = {}) => {
  const fallback = 'fallback' in opts ? opts.fallback : SPORT_MEDIA_FALLBACK;
  if (!coach) return fallback === null ? null : fallback;
  const profileKeys = extractSportKeysFromCoachProfile(coach.author) || [];
  const listingKeys = extractSportKeysFromListing(coach.representativeListing) || [];
  const mergedKeys = Array.isArray(coach.sportKeys) ? coach.sportKeys : [];
  const ordered = [...profileKeys, ...listingKeys, ...mergedKeys];
  const matched = pickFirstMappedSportKey(ordered);
  if (matched) return SPORT_MEDIA_LIBRARY[matched].hero;
  return fallback === null ? null : fallback;
};
