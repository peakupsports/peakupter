/* TEMP DEMO COACHES FOR MARKETING REEL – REMOVE BEFORE PRODUCTION */

/**
 * Frontend-only fictional coaches injected on the Coach Map page so the
 * platform looks internationally active in screenshots / marketing reels.
 * This is the SINGLE source of truth for all demo data – to remove, just
 * delete this file and the two import lines it adds to:
 *   • src/containers/CoachMapPage/CoachMapPage.js
 *   • (read-only) src/containers/CoachMapPage/CoachMap3D/CoachMapPopup.js
 *   • (read-only) src/components/CoachCard/CoachCard.js
 *
 * Removal is also `git grep` friendly: every consumer guards on `coach.isDemo`
 * so deleting this file + clearing those guards is mechanical.
 *
 * ------------------------------------------------------------------------
 * IMAGE SOURCING (Unsplash)
 * ------------------------------------------------------------------------
 * Each demo coach references an Unsplash `photoId` (the slug after
 * `images.unsplash.com/photo-…`). The IDs were hand-picked from the
 * Unsplash search pages referenced in the ticket so they map sport ←→
 * vibe (snowboarder, surfer, golf player, yoga instructor …). The full
 * URL is built by `buildDemoProfileImage` with `?w=240/480&h=… &fit=crop
 * &crop=faces&q=80&auto=format`, mirroring the Sharetribe image variant
 * shape (`square-small` / `square-small2x`) so CoachCard / CoachMapPopup
 * render them via the standard ResponsiveImage pipeline – no special
 * casing needed downstream.
 *
 * Ethnicity / region: chosen as best-effort given action shots dominate
 * Unsplash's sports indexes. To swap any photo, replace its `photoId`
 * here – it's the only place to change.
 *
 * ------------------------------------------------------------------------
 * DATA SHAPE
 * ------------------------------------------------------------------------
 * Rows are produced with the same shape as `mergeListingsByAuthor` plus
 * the duck's enrichment (`reviewCount`, `reviewAverage`), so consumers
 * receive a coach row indistinguishable from a real one. Each row also
 * carries `isDemo: true` (and `author.attributes.profile.publicData.isDemo`)
 * so the UI can disable booking / contact and tag the coach name.
 *
 * ------------------------------------------------------------------------
 * DISTRIBUTION (44 coaches)
 * ------------------------------------------------------------------------
 *  • Main density: Switzerland + Alps (~14, incl. Como / Saas-Fee /
 *    Interlaken)
 *  • Snow worldwide: 3 (Niseko, Whistler, Aspen)
 *  • Surf: 5 (Algarve, Taghazout, Jeffreys Bay, Uluwatu, Byron Bay)
 *  • MTB: 1 international (Finale Ligure)
 *  • Golf: 4 (Crans-Montana, St Andrews, Dubai, Vilamoura, Pebble Beach)
 *  • Tennis: 2 (Marbella, Paris) + 1 in CH
 *  • Yoga: 3 (Ubud, Koh Phangan, Nosara)
 *  • Fitness: 3 (Venice Beach, London, Koh Phangan dual)
 *  • Climbing: 3 (Yosemite, Fontainebleau, Kalymnos)
 *  • Skateboard: 3 (Venice, Barcelona, Lisbon)
 *  • Kitesurf: 2 (Tarifa, Maui)
 *  • Wakeboard: 2 (Como, Mission Bay)
 *  • Cross-country: 1 (Holmenkollen)
 *  • Freeski (variant of Ski): 1 (Saas-Fee)
 *  • Skydive: 1 (Interlaken)
 *
 * Sport keys used here MUST come from the official platform sports list
 * (see `PROFILE_SPORT_DISPLAY_LABELS` / `SPORT_LABELS`).
 *
 * Tier mix kept rare-at-the-top:
 *   1 Founder · 7 Ambassadors · 22 Top coaches · 14 Certified coaches.
 */

export const DEMO_COACHES_ENABLED = true;

/** Suffixed on every demo `displayName` so demo data is unambiguous in UI. */
const DEMO_TAG = '(DEMO)';

/**
 * Friendly toast/alert text shown when the user attempts to book or contact
 * a demo coach. Centralised so all demo surfaces show the same copy. We
 * deliberately keep it ASCII-only so it works in `window.alert()` on every
 * locale without font fallback issues.
 */
export const DEMO_DISABLED_ACTION_MESSAGE = 'Booking and contact will be available soon.';

/**
 * Show the friendly "coming soon" message for blocked demo actions. Wrapped
 * so consumers don't have to decide between alert / toast / modal — if we
 * later swap to a nicer toast, all call sites pick it up automatically.
 *
 * @returns {void}
 */
export const notifyDemoActionUnavailable = () => {
  if (typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(DEMO_DISABLED_ACTION_MESSAGE);
  }
};

/**
 * Convenience type-guard. Truth-checks both flat / nested forms so callers
 * don't have to remember which one the demo emits.
 *
 * @param {Object|null|undefined} coach
 * @returns {boolean}
 */
export const isDemoCoach = coach =>
  Boolean(coach?.isDemo || coach?.author?.attributes?.profile?.publicData?.isDemo);

/**
 * Demo-only price formatter. Returns the coach's profile price as a clean
 * symbol-prefixed integer string (e.g. "€95", "$140", "£80", "CHF 220",
 * "JPY 28,000") so the marketing reel feels internationally realistic
 * without going through the marketplace-level `formatMoney` pipeline
 * (which forces 2 decimals and, on single-currency Sharetribe setups,
 * normalises every Money to the marketplace currency).
 *
 * Uses the existing react-intl `intl.formatNumber` so locale grouping
 * separators stay consistent with the rest of the UI. Falls back to a
 * naive "{CODE} {amount}" string if the runtime can't format the
 * currency (very old browsers, exotic ISO codes).
 *
 * @param {import('react-intl').intlShape} intl
 * @param {Object} publicData author profile public data
 * @returns {string|null} formatted price (e.g. "€95") or null when missing
 */
export const formatDemoPrice = (intl, publicData) => {
  if (!publicData || !publicData.currency) return null;
  const amount = Number(publicData.priceFrom);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  try {
    return intl.formatNumber(amount, {
      style: 'currency',
      currency: publicData.currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      useGrouping: true,
    });
  } catch (e) {
    return `${publicData.currency} ${amount}`;
  }
};

/**
 * Build a Sharetribe-shaped `profileImage` object from an Unsplash photo
 * ID. Returns the same shape ResponsiveImage / Avatar already consume for
 * real users, so CoachCard's image branch lights up without needing any
 * code changes downstream.
 *
 * @param {string} photoId Unsplash photo slug (after `photo-`).
 * @returns {Object} image entity with `square-small` + `square-small2x` variants.
 */
const buildDemoProfileImage = photoId => {
  const url = w =>
    `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${w}&fit=crop&crop=faces&q=80&auto=format`;
  return {
    id: { uuid: `demo-img-${photoId}`, type: 'image' },
    type: 'image',
    attributes: {
      variants: {
        'square-small': {
          name: 'square-small',
          width: 240,
          height: 240,
          url: url(240),
        },
        'square-small2x': {
          name: 'square-small2x',
          width: 480,
          height: 480,
          url: url(480),
        },
      },
    },
  };
};

/**
 * Build a coach row matching `mergeListingsByAuthor` + duck enrichment.
 *
 * @param {Object} input
 * @param {string} input.uuid          stable slug for author + listing UUIDs
 * @param {string} input.displayName   first + last name (DEMO tag added auto)
 * @param {string} input.abbreviatedName 2-letter Avatar fallback initials
 * @param {string} input.city          location label ("St. Moritz, CH")
 * @param {number} input.lat
 * @param {number} input.lng
 * @param {string[]} input.sports      keys from `PROFILE_SPORT_EMOJI`
 * @param {string[]} input.languages   ISO codes ["en","it","de","fr","es","pt"]
 * @param {number} input.priceFrom     major units (e.g. 280 for "from 280 CHF")
 * @param {string} [input.currency]    ISO 4217 — defaults to CHF
 * @param {('founder'|'ambassador'|'top_coach'|'certified_coach')} input.tier
 * @param {number} input.reviewAverage 0–5 (e.g. 4.8)
 * @param {number} input.reviewCount   integer
 * @param {string} input.photoId       Unsplash photo slug
 * @param {string} [input.bio]         short blurb (kept for completeness)
 * @returns {Object} coach row
 */
const makeDemoCoach = ({
  uuid,
  displayName,
  abbreviatedName,
  city,
  lat,
  lng,
  sports,
  languages,
  priceFrom,
  currency = 'CHF',
  tier,
  reviewAverage,
  reviewCount,
  photoId,
  bio,
}) => {
  const authorUuid = `demo-author-${uuid}`;
  const listingUuid = `demo-listing-${uuid}`;

  // Sync the demo `experience` value with the configured demo tier so the
  // auto-derived display tier (see `resolveDisplayBadgeIds`) matches what we
  // want to showcase on the map. Founder / Ambassador are admin-only and read
  // from `peakupCoachBadges`; Top coach is auto-derived from >= 10 years and
  // Certified coach is the default for everyone else.
  const demoExperienceForTier = {
    founder: '15_20',
    ambassador: '15_20',
    top_coach: '10_15',
    certified_coach: '5_10',
  };

  const profilePublicData = {
    sports,
    languages,
    priceFrom,
    currency,
    coachCityText: city,
    lat,
    lng,
    peakupCoachBadges: [tier],
    peakupVerifiedCoach: true,
    experience: demoExperienceForTier[tier] || '5_10',
    bio,
    isDemo: true,
  };

  const author = {
    id: { uuid: authorUuid, type: 'user' },
    type: 'user',
    attributes: {
      profile: {
        displayName: `${displayName} ${DEMO_TAG}`,
        abbreviatedName,
        publicData: profilePublicData,
      },
    },
    profileImage: buildDemoProfileImage(photoId),
  };

  const representativeListing = {
    id: { uuid: listingUuid, type: 'listing' },
    type: 'listing',
    attributes: {
      title: `${displayName} – ${city}`,
      geolocation: { lat, lng },
      publicData: { sports, peakupBookingListing: true },
      price: null,
    },
    author,
  };

  return {
    authorUuid,
    author,
    representativeListing,
    sportKeys: sports,
    minPrice: null,
    reviewAverage,
    reviewCount,
    isDemo: true,
  };
};

// ───────────────────────── Demo roster ─────────────────────────────────────
// Hand-curated to spread evenly across regions. Each `photoId` is a real
// Unsplash slug picked from the search pages referenced in the ticket.

export const DEMO_COACHES = [
  // ─── Switzerland & Alps (main density) ───────────────────────────────────
  makeDemoCoach({
    uuid: 'laax-mara',
    displayName: 'Mara Hartmann',
    abbreviatedName: 'MH',
    city: 'Laax, CH',
    lat: 46.8074,
    lng: 9.2602,
    sports: ['snowboard', 'freestylesnowboard'],
    languages: ['de', 'en', 'it'],
    priceFrom: 220,
    currency: 'CHF',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 87,
    photoId: '1551524559-8af4e6624178',
    bio: 'Park & pipe snowboard coach based at Crap Sogn Gion. Built lines for two Swiss freestyle teams.',
  }),
  makeDemoCoach({
    uuid: 'st-moritz-elena',
    displayName: 'Elena Bianchi',
    abbreviatedName: 'EB',
    city: 'St. Moritz, CH',
    lat: 46.4983,
    lng: 9.8419,
    sports: ['ski', 'freerideskiing'],
    languages: ['it', 'en', 'de', 'fr'],
    priceFrom: 320,
    currency: 'CHF',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 142,
    photoId: '1596473535762-ce7f43470748',
    bio: 'Off-piste freeride specialist. Engadin lines from Corvatsch to Diavolezza.',
  }),
  makeDemoCoach({
    uuid: 'verbier-louis',
    displayName: 'Louis Berger',
    abbreviatedName: 'LB',
    city: 'Verbier, CH',
    lat: 46.0962,
    lng: 7.2272,
    sports: ['ski', 'skitouring', 'freerideskiing'],
    languages: ['fr', 'en', 'de'],
    priceFrom: 380,
    currency: 'CHF',
    tier: 'founder',
    reviewAverage: 5.0,
    reviewCount: 168,
    photoId: '1565992441121-4367c2967103',
    bio: 'PeakUp Sports founding coach. Splitboard & freeride veteran on the Mont Fort traverse.',
  }),
  makeDemoCoach({
    uuid: 'zermatt-noah',
    displayName: 'Noah Zünd',
    abbreviatedName: 'NZ',
    city: 'Zermatt, CH',
    lat: 46.0207,
    lng: 7.7491,
    sports: ['ski'],
    languages: ['de', 'en'],
    priceFrom: 260,
    currency: 'CHF',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 41,
    photoId: '1551698618-1dfe5d97d256',
    bio: 'All-mountain ski coach. Patient with intermediates, focused on edge work.',
  }),
  makeDemoCoach({
    uuid: 'davos-julia',
    displayName: 'Julia Frei',
    abbreviatedName: 'JF',
    city: 'Davos, CH',
    lat: 46.7996,
    lng: 9.8384,
    sports: ['snowboard', 'freeridesnowboard'],
    languages: ['de', 'en'],
    priceFrom: 240,
    currency: 'CHF',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 76,
    photoId: '1488580923008-6f98dfbd7a25',
    bio: 'Backcountry snowboard sessions in Parsenn & Jakobshorn. Avalanche-aware terrain reading.',
  }),
  makeDemoCoach({
    uuid: 'lenzerheide-tobias',
    displayName: 'Tobias Schmid',
    abbreviatedName: 'TS',
    city: 'Lenzerheide, CH',
    lat: 46.7286,
    lng: 9.5567,
    sports: ['mtb'],
    languages: ['de', 'en', 'it'],
    priceFrom: 180,
    currency: 'CHF',
    tier: 'certified_coach',
    reviewAverage: 4.8,
    reviewCount: 53,
    photoId: '1575548393466-0df1618ba410',
    bio: 'Bikepark + flow trail coach. Brake-modulation drills and jump progression.',
  }),
  makeDemoCoach({
    uuid: 'crans-montana-philippe',
    displayName: 'Philippe Rey',
    abbreviatedName: 'PR',
    city: 'Crans-Montana, CH',
    lat: 46.3119,
    lng: 7.4794,
    sports: ['golf'],
    languages: ['fr', 'en', 'de'],
    priceFrom: 220,
    currency: 'CHF',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 64,
    photoId: '1535131749006-b7f58c99034b',
    bio: 'Plateau Bonvin host coach. Course management, putting & alpine bunker play.',
  }),
  makeDemoCoach({
    uuid: 'geneva-clara',
    displayName: 'Clara Moreau',
    abbreviatedName: 'CM',
    city: 'Geneva, CH',
    lat: 46.2044,
    lng: 6.1432,
    sports: ['tennis'],
    languages: ['fr', 'en', 'es'],
    priceFrom: 140,
    currency: 'CHF',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 38,
    photoId: '1545809074-59472b3f5ecc',
    bio: 'Junior + adult tennis coach. Spin variety, footwork patterns, mental routines.',
  }),
  makeDemoCoach({
    uuid: 'chamonix-margaux',
    displayName: 'Margaux Dubois',
    abbreviatedName: 'MD',
    city: 'Chamonix, FR',
    lat: 45.9237,
    lng: 6.8694,
    sports: ['ski', 'skitouring', 'freerideskiing'],
    languages: ['fr', 'en'],
    priceFrom: 340,
    currency: 'EUR',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 121,
    photoId: '1498576260462-eefc9d0ce9f7',
    bio: 'Vallée Blanche & Aiguille du Midi specialist. UIAGM-trained ski mountaineer.',
  }),
  makeDemoCoach({
    uuid: 'innsbruck-felix',
    displayName: 'Felix Gruber',
    abbreviatedName: 'FG',
    city: 'Innsbruck, AT',
    lat: 47.2692,
    lng: 11.4041,
    sports: ['snowboard', 'freeridesnowboard', 'mtb'],
    languages: ['de', 'en'],
    priceFrom: 200,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.8,
    reviewCount: 92,
    photoId: '1584890131712-18ee8e3ed49c',
    bio: 'Winter freeride / summer enduro. Nordkette in winter, Bikepark Innsbruck in summer.',
  }),
  makeDemoCoach({
    uuid: 'cortina-giovanni',
    displayName: 'Giovanni Lazzari',
    abbreviatedName: 'GL',
    city: 'Cortina d\u2019Ampezzo, IT',
    lat: 46.5379,
    lng: 12.1357,
    sports: ['ski'],
    languages: ['it', 'en', 'de'],
    priceFrom: 230,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.75,
    reviewCount: 47,
    photoId: '1616255381275-5b99f05a8793',
    bio: 'Dolomiti Superski coach. Carving fundamentals + scenic Sella Ronda days.',
  }),
  // ─── Snow worldwide ──────────────────────────────────────────────────────
  // Variant tag intentionally omitted (was 'freeridesnowboard'). This coach
  // is geographically far from the European cluster (lng +140°E vs +9°E),
  // so including the variant tag would expand the filter bounds for
  // "Snowboard > Freeride" to a 131° longitude span and force fitBounds
  // to a globe view. The coach still appears under the Snowboard parent
  // filter (which is expected to span the world) and on the map at their
  // real coordinates — only the per-variant filter visibility was scoped
  // to the regional cluster.
  makeDemoCoach({
    uuid: 'niseko-yuki',
    displayName: 'Yuki Tanaka',
    abbreviatedName: 'YT',
    city: 'Niseko, JP',
    lat: 42.8047,
    lng: 140.6874,
    sports: ['snowboard'],
    languages: ['en'],
    priceFrom: 28000,
    currency: 'JPY',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 81,
    photoId: '1647644768239-6e937d5e9743',
    bio: 'Powder snowboarding in the Annupuri trees. Tree-line reading and pillow lines.',
  }),
  // Variant tag intentionally omitted (was 'freestylesnowboard') for the
  // same reason as Niseko above — Whistler is at lng -122.96°W, which
  // would push the "Snowboard > Freestyle" bounds across the Atlantic.
  // The coach still appears under the Snowboard parent and as a marker
  // at their real coordinates.
  makeDemoCoach({
    uuid: 'whistler-isaac',
    displayName: 'Isaac Bennett',
    abbreviatedName: 'IB',
    city: 'Whistler, CA',
    lat: 50.1163,
    lng: -122.9574,
    sports: ['snowboard'],
    languages: ['en', 'fr'],
    priceFrom: 290,
    currency: 'CAD',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 58,
    photoId: '1599405653894-8a595f692abf',
    bio: 'Park & jump progression at Blackcomb. Slope-style athlete background.',
  }),
  // Variant tag intentionally omitted (was 'freerideskiing') for the same
  // reason as Niseko / Whistler above — Aspen is at lng -106.82°W, which
  // would push the "Ski > Freeride" bounds across the Atlantic. The coach
  // still appears under the Ski parent and as a marker at their real
  // coordinates.
  makeDemoCoach({
    uuid: 'aspen-katie',
    displayName: 'Katie Sullivan',
    abbreviatedName: 'KS',
    city: 'Aspen, US',
    lat: 39.1911,
    lng: -106.8175,
    sports: ['ski'],
    languages: ['en', 'es'],
    priceFrom: 380,
    currency: 'USD',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 134,
    photoId: '1535640597419-853d35e6364f',
    bio: 'Highland Bowl regular. Steep & deep coaching with two former US team athletes.',
  }),
  // ─── Surf worldwide ──────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'algarve-rui',
    displayName: 'Rui Costa',
    abbreviatedName: 'RC',
    city: 'Lagos, PT',
    lat: 37.0997,
    lng: -8.6735,
    sports: ['surf'],
    languages: ['pt', 'en', 'es'],
    priceFrom: 90,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 109,
    photoId: '1486432155089-343c871b640f',
    bio: 'Algarve point-breaks specialist. Beginner to intermediate, longboard or shortboard.',
  }),
  makeDemoCoach({
    uuid: 'taghazout-omar',
    displayName: 'Omar El Idrissi',
    abbreviatedName: 'OE',
    city: 'Taghazout, MA',
    lat: 30.5419,
    lng: -9.7106,
    sports: ['surf'],
    languages: ['en', 'fr'],
    priceFrom: 700,
    currency: 'MAD',
    tier: 'certified_coach',
    reviewAverage: 4.8,
    reviewCount: 65,
    photoId: '1601505804121-45e2c5506c94',
    bio: 'Anchor Point local. Right-hand point breaks and Moroccan reef coaching.',
  }),
  makeDemoCoach({
    uuid: 'jbay-thandi',
    displayName: 'Thandi Naidoo',
    abbreviatedName: 'TN',
    city: 'Jeffreys Bay, ZA',
    lat: -34.0496,
    lng: 24.9133,
    sports: ['surf'],
    languages: ['en'],
    priceFrom: 1500,
    currency: 'ZAR',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 154,
    photoId: '1556762019-657ac042d6b5',
    bio: 'Supertubes coach with two WSL Africa titles. Fast-rail technique on long rights.',
  }),
  makeDemoCoach({
    uuid: 'uluwatu-made',
    displayName: 'Made Putra',
    abbreviatedName: 'MP',
    city: 'Uluwatu, ID',
    lat: -8.8146,
    lng: 115.0863,
    sports: ['surf'],
    languages: ['en'],
    priceFrom: 80,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 97,
    photoId: '1559628234-d70bb7959a92',
    bio: 'Bukit reef breaks. Reading swell windows and timing for Padang & Uluwatu.',
  }),
  makeDemoCoach({
    uuid: 'byron-jasmine',
    displayName: 'Jasmine Carter',
    abbreviatedName: 'JC',
    city: 'Byron Bay, AU',
    lat: -28.6474,
    lng: 153.6020,
    sports: ['surf'],
    languages: ['en'],
    priceFrom: 110,
    currency: 'AUD',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 51,
    photoId: '1489633908075-1c914e8ee5ea',
    bio: 'Wategos Beach longboarding & beginner-friendly coaching, single-fin specialist.',
  }),
  // ─── MTB international ───────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'finale-luca',
    displayName: 'Luca Romano',
    abbreviatedName: 'LR',
    city: 'Finale Ligure, IT',
    lat: 44.1697,
    lng: 8.3422,
    sports: ['mtb'],
    languages: ['it', 'en', 'de'],
    priceFrom: 150,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 88,
    photoId: '1534146789009-76ed5060ec70',
    bio: 'Liguria enduro coach. Rocky tech descents and shuttle-day trail selection.',
  }),
  // ─── Golf worldwide ──────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'standrews-ewan',
    displayName: 'Ewan MacLeod',
    abbreviatedName: 'EM',
    city: 'St Andrews, UK',
    lat: 56.3398,
    lng: -2.7967,
    sports: ['golf'],
    languages: ['en'],
    priceFrom: 200,
    currency: 'GBP',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 117,
    photoId: '1611374243147-44a702c2d44c',
    bio: 'Old Course-bred PGA pro. Wind play, links bumps and pot-bunker recoveries.',
  }),
  makeDemoCoach({
    uuid: 'dubai-omar',
    displayName: 'Omar Al-Farsi',
    abbreviatedName: 'OF',
    city: 'Dubai, AE',
    lat: 25.0760,
    lng: 55.1438,
    sports: ['golf'],
    languages: ['en'],
    priceFrom: 1200,
    currency: 'AED',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 73,
    photoId: '1591491640784-3232eb748d4b',
    bio: 'Emirates Golf Club coach. TrackMan-driven sessions and short-game labs.',
  }),
  makeDemoCoach({
    uuid: 'algarve-tiago',
    displayName: 'Tiago Pereira',
    abbreviatedName: 'TP',
    city: 'Vilamoura, PT',
    lat: 37.0758,
    lng: -8.1183,
    sports: ['golf'],
    languages: ['pt', 'en', 'es'],
    priceFrom: 130,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 42,
    photoId: '1535132011086-b8818f016104',
    bio: 'Vilamoura Old Course coaching. Tempo work and bunker fundamentals.',
  }),
  // ─── Yoga / Fitness ──────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'ubud-anya',
    displayName: 'Anya Wijaya',
    abbreviatedName: 'AW',
    city: 'Ubud, ID',
    lat: -8.5069,
    lng: 115.2625,
    sports: ['yoga'],
    languages: ['en'],
    priceFrom: 60,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 132,
    photoId: '1574406280735-351fc1a7c5e0',
    bio: 'Vinyasa & yin retreats in the rice terraces. 500-h RYT, ten years of Ubud teaching.',
  }),
  makeDemoCoach({
    uuid: 'kohphangan-niran',
    displayName: 'Niran Suksawat',
    abbreviatedName: 'NS',
    city: 'Koh Phangan, TH',
    lat: 9.7333,
    lng: 100.0167,
    sports: ['yoga', 'fitness'],
    languages: ['en'],
    priceFrom: 1500,
    currency: 'THB',
    tier: 'certified_coach',
    reviewAverage: 4.75,
    reviewCount: 49,
    photoId: '1607962837359-5e7e89f86776',
    bio: 'Beach yoga + functional fitness camps. Mobility and breathwork-led sessions.',
  }),
  makeDemoCoach({
    uuid: 'venice-marcus',
    displayName: 'Marcus Reed',
    abbreviatedName: 'MR',
    city: 'Venice Beach, US',
    lat: 33.9850,
    lng: -118.4695,
    sports: ['fitness'],
    languages: ['en', 'es'],
    priceFrom: 95,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 104,
    photoId: '1517836357463-d25dfeac3438',
    bio: 'Outdoor strength & conditioning at Muscle Beach. Athlete prep, calisthenics base.',
  }),
  // ─── Tennis ──────────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'marbella-sofia',
    displayName: 'Sof\u00eda Ruiz',
    abbreviatedName: 'SR',
    city: 'Marbella, ES',
    lat: 36.5099,
    lng: -4.8861,
    sports: ['tennis'],
    languages: ['es', 'en', 'fr'],
    priceFrom: 110,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 96,
    photoId: '1595435742656-5272d0b3fa82',
    bio: 'Costa del Sol clay specialist. Heavy topspin and point-construction drills.',
  }),
  makeDemoCoach({
    uuid: 'paris-arnaud',
    displayName: 'Arnaud Lef\u00e8vre',
    abbreviatedName: 'AL',
    city: 'Paris, FR',
    lat: 48.8566,
    lng: 2.3522,
    sports: ['tennis'],
    languages: ['fr', 'en'],
    priceFrom: 130,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 44,
    photoId: '1554068865-24cecd4e34b8',
    bio: 'Bois de Boulogne courts. Match tactics, serve patterns, return positioning.',
  }),
  // ─── Climbing ────────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'yosemite-jordan',
    displayName: 'Jordan Hayes',
    abbreviatedName: 'JH',
    city: 'Yosemite, US',
    lat: 37.8651,
    lng: -119.5383,
    sports: ['climbing'],
    languages: ['en', 'es'],
    priceFrom: 240,
    currency: 'USD',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 138,
    photoId: '1502126324834-38f8e02d7160',
    bio: 'Big-wall mentor on El Capitan & Half Dome. Multi-pitch and trad rack management.',
  }),
  makeDemoCoach({
    uuid: 'fontainebleau-sebastien',
    displayName: 'S\u00e9bastien Garnier',
    abbreviatedName: 'SG',
    city: 'Fontainebleau, FR',
    lat: 48.4047,
    lng: 2.7012,
    sports: ['climbing'],
    languages: ['fr', 'en'],
    priceFrom: 120,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 92,
    photoId: '1577434150790-3bfe143fe4f2',
    bio: 'Bouldering coach across the Bleau forest. Movement skills and route reading.',
  }),
  makeDemoCoach({
    uuid: 'kalymnos-eleni',
    displayName: 'Eleni Pap\u00e1s',
    abbreviatedName: 'EP',
    city: 'Kalymnos, GR',
    lat: 36.9483,
    lng: 26.9819,
    sports: ['climbing'],
    languages: ['el', 'en'],
    priceFrom: 95,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.8,
    reviewCount: 61,
    photoId: '1522163182402-834f871fd851',
    bio: 'Aegean limestone sport-climbing host. From beginner top-rope to 7a tufas.',
  }),
  // ─── Skateboard ──────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'venice-ryder',
    displayName: 'Ryder Park',
    abbreviatedName: 'RP',
    city: 'Venice Beach, US',
    lat: 33.9928,
    lng: -118.4737,
    sports: ['skateboard'],
    languages: ['en'],
    priceFrom: 80,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 88,
    photoId: '1517124792960-0f4701b9bd20',
    bio: 'Venice skatepark local. Bowl carving, transition skating and street tricks.',
  }),
  makeDemoCoach({
    uuid: 'barcelona-mar',
    displayName: 'Mar Vidal',
    abbreviatedName: 'MV',
    city: 'Barcelona, ES',
    lat: 41.3851,
    lng: 2.1734,
    sports: ['skateboard'],
    languages: ['ca', 'es', 'en'],
    priceFrom: 70,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.75,
    reviewCount: 57,
    photoId: '1499083773823-5000fa2b23e4',
    bio: 'MACBA + Parallel sessions. Flatground fundamentals, ledges, manuals and ollies.',
  }),
  makeDemoCoach({
    uuid: 'lisbon-rodrigo',
    displayName: 'Rodrigo Sant\u2019Ana',
    abbreviatedName: 'RS',
    city: 'Lisbon, PT',
    lat: 38.7223,
    lng: -9.1393,
    sports: ['skateboard'],
    languages: ['pt', 'en'],
    priceFrom: 65,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.7,
    reviewCount: 42,
    photoId: '1591311337241-cecfd26f1da1',
    bio: 'LX Factory + Belem skate spots. Cruiser commuting and beginner-friendly progression.',
  }),
  // ─── Kitesurf ────────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'tarifa-aitana',
    displayName: 'Aitana Romero',
    abbreviatedName: 'AR',
    city: 'Tarifa, ES',
    lat: 36.0136,
    lng: -5.6063,
    sports: ['kitesurf'],
    languages: ['es', 'en'],
    priceFrom: 130,
    currency: 'EUR',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 102,
    photoId: '1611517533081-a74f3d409ce9',
    bio: 'Levante & Poniente winds expert. IKO certified instruction from zero to freestyle.',
  }),
  makeDemoCoach({
    uuid: 'maui-keoni',
    displayName: 'Keoni Kahale',
    abbreviatedName: 'KK',
    city: 'Maui, US',
    lat: 20.7984,
    lng: -156.3319,
    sports: ['kitesurf'],
    languages: ['en'],
    priceFrom: 180,
    currency: 'USD',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 124,
    photoId: '1607537826539-0eb279b56804',
    bio: 'Kanaha Beach Park host. Big-wave kitesurf, foiling, and wave-riding workshops.',
  }),
  // ─── Wakeboard ───────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'lakecomo-stefano',
    displayName: 'Stefano Conti',
    abbreviatedName: 'SC',
    city: 'Como, IT',
    lat: 45.8081,
    lng: 9.0852,
    sports: ['wakeboard'],
    languages: ['it', 'en'],
    priceFrom: 110,
    currency: 'EUR',
    tier: 'certified_coach',
    reviewAverage: 4.75,
    reviewCount: 48,
    photoId: '1531001602318-1916852b9205',
    bio: 'Lake Como cable park & boat sessions. Edge-control basics through air tricks.',
  }),
  makeDemoCoach({
    uuid: 'missionbay-cody',
    displayName: 'Cody Reynolds',
    abbreviatedName: 'CR',
    city: 'Mission Bay, US',
    lat: 32.7903,
    lng: -117.2375,
    sports: ['wakeboard'],
    languages: ['en'],
    priceFrom: 130,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 71,
    photoId: '1484634410561-aa51b83c27d6',
    bio: 'San Diego boat-pull wakeboarding. Pop-out timing, surface tricks, wake-to-wake jumps.',
  }),
  // ─── Cross-country ───────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'holmenkollen-ingrid',
    displayName: 'Ingrid Solberg',
    abbreviatedName: 'IS',
    city: 'Holmenkollen, NO',
    lat: 59.9636,
    lng: 10.6680,
    sports: ['crosscountry'],
    languages: ['no', 'en'],
    priceFrom: 1400,
    currency: 'NOK',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 86,
    photoId: '1700957952693-a9028dfa323c',
    bio: 'Nordic ski coach on the Holmenkollen trails. Classic and skate-skating technique.',
  }),
  // ─── Freeski (variant of Ski) ────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'saasfee-jonas',
    displayName: 'Jonas K\u00e4lin',
    abbreviatedName: 'JK',
    city: 'Saas-Fee, CH',
    lat: 46.1083,
    lng: 7.9269,
    sports: ['ski', 'freestyleskiing'],
    languages: ['de', 'en'],
    priceFrom: 280,
    currency: 'CHF',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 79,
    photoId: '1642367943176-d1b7d3ce4100',
    bio: 'Saas-Fee glacier freeski camps. Park progression, switch riding and rail technique.',
  }),
  // ─── Skydive ─────────────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'interlaken-andreas',
    displayName: 'Andreas Brunner',
    abbreviatedName: 'AB',
    city: 'Interlaken, CH',
    lat: 46.6863,
    lng: 7.8632,
    sports: ['skydive'],
    languages: ['de', 'en', 'fr'],
    priceFrom: 420,
    currency: 'CHF',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 113,
    photoId: '1659221876406-31a3746f41b9',
    bio: 'Tandem & AFF skydive over the Bernese Alps. Thousands of jumps, USPA & SFCH rated.',
  }),
  // ─── Yoga (extra international) ──────────────────────────────────────────
  makeDemoCoach({
    uuid: 'nosara-camila',
    displayName: 'Camila Rojas',
    abbreviatedName: 'CR',
    city: 'Nosara, CR',
    lat: 9.9786,
    lng: -85.6536,
    sports: ['yoga'],
    languages: ['es', 'en'],
    priceFrom: 70,
    currency: 'USD',
    tier: 'top_coach',
    reviewAverage: 4.9,
    reviewCount: 96,
    photoId: '1543604055-dede4512686d',
    bio: 'Nosara beach yoga retreats. Hatha & restorative practice with breathwork-led classes.',
  }),
  // ─── Fitness (extra international) ───────────────────────────────────────
  makeDemoCoach({
    uuid: 'london-darius',
    displayName: 'Darius Whitfield',
    abbreviatedName: 'DW',
    city: 'London, UK',
    lat: 51.5074,
    lng: -0.1278,
    sports: ['fitness'],
    languages: ['en'],
    priceFrom: 100,
    currency: 'GBP',
    tier: 'top_coach',
    reviewAverage: 4.85,
    reviewCount: 89,
    photoId: '1571019614242-c5c5dee9f50b',
    bio: 'Hyde Park outdoor sessions. S&C, kettlebells, and London marathon prep cycles.',
  }),
  // ─── Golf (extra US) ─────────────────────────────────────────────────────
  makeDemoCoach({
    uuid: 'pebblebeach-walter',
    displayName: 'Walter Hayes',
    abbreviatedName: 'WH',
    city: 'Pebble Beach, US',
    lat: 36.5685,
    lng: -121.9498,
    sports: ['golf'],
    languages: ['en'],
    priceFrom: 320,
    currency: 'USD',
    tier: 'ambassador',
    reviewAverage: 4.95,
    reviewCount: 131,
    photoId: '1701428180979-67cf3a5c6ad1',
    bio: 'Pebble Beach links coach. Wind play on coastal Pacific holes and approach shots.',
  }),
];

/**
 * Merge real coaches with demo coaches, preserving the order of real
 * coaches (production data still ranks first by reviewCount as the duck
 * sets up). Demo coaches are skipped if a real coach happens to share the
 * same `authorUuid` (impossible with the `demo-` prefix today, but cheap
 * to guard against future ID collisions).
 *
 * @param {Object[]} realCoaches `state.CoachesExplorePage.coaches`
 * @returns {Object[]} merged list with demo entries appended
 */
export const mergeDemoIntoCoaches = realCoaches => {
  if (!DEMO_COACHES_ENABLED) return realCoaches;
  const realIds = new Set((realCoaches || []).map(c => c.authorUuid));
  const onlyNew = DEMO_COACHES.filter(c => !realIds.has(c.authorUuid));
  return [...(realCoaches || []), ...onlyNew];
};
