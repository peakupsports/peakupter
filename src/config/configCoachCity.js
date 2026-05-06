/**
 * Città per il menu coach (profile settings). Le coordinate sono centri approssimativi per la mappa
 * sulla figurina; l’utente non inserisce più lat/lng a mano.
 */

/** @type {Record<string, { lat: number; lng: number } | null>} null = nessun punto mappa (es. "altro") */
export const COACH_CITY_CENTERS = {
  zurich: { lat: 47.3769, lng: 8.5417 },
  bern: { lat: 46.948, lng: 7.4474 },
  basel: { lat: 47.5596, lng: 7.5886 },
  geneva: { lat: 46.2044, lng: 6.1432 },
  lausanne: { lat: 46.5197, lng: 6.6323 },
  winterthur: { lat: 47.4984, lng: 8.7245 },
  lucerne: { lat: 47.0502, lng: 8.3093 },
  st_gallen: { lat: 47.4245, lng: 9.3767 },
  lugano: { lat: 46.0037, lng: 8.9511 },
  bellinzona: { lat: 46.195, lng: 9.0215 },
  davos: { lat: 46.8027, lng: 9.836 },
  zermatt: { lat: 46.0207, lng: 7.7491 },
  crans_montana: { lat: 46.3071, lng: 7.4857 },
  verbier: { lat: 46.0962, lng: 7.2285 },
  interlaken: { lat: 46.6863, lng: 7.8632 },
  laax: { lat: 46.9733, lng: 9.2568 },
  neuchatel: { lat: 46.9928, lng: 6.9319 },
  fribourg: { lat: 46.8065, lng: 7.1617 },
  chamonix: { lat: 45.9237, lng: 6.8694 },
  annecy: { lat: 45.8992, lng: 6.1294 },
  milan: { lat: 45.4642, lng: 9.19 },
  aosta: { lat: 45.7372, lng: 7.3206 },
  bolzano: { lat: 46.4983, lng: 11.3548 },
  innsbruck: { lat: 47.2692, lng: 11.4041 },
  munich: { lat: 48.1351, lng: 11.582 },
  other: null,
};

/** Etichette mostrate su profilo / figurina */
export const COACH_CITY_LABELS = {
  zurich: 'Zürich',
  bern: 'Bern',
  basel: 'Basel',
  geneva: 'Genève',
  lausanne: 'Lausanne',
  winterthur: 'Winterthur',
  lucerne: 'Luzern',
  st_gallen: 'St. Gallen',
  lugano: 'Lugano',
  bellinzona: 'Bellinzona',
  davos: 'Davos',
  zermatt: 'Zermatt',
  crans_montana: 'Crans-Montana',
  verbier: 'Verbier',
  interlaken: 'Interlaken',
  laax: 'Laax',
  neuchatel: 'Neuchâtel',
  fribourg: 'Fribourg',
  chamonix: 'Chamonix',
  annecy: 'Annecy',
  milan: 'Milano',
  aosta: 'Aosta',
  bolzano: 'Bolzano',
  innsbruck: 'Innsbruck',
  munich: 'München',
  other: 'Other / not listed',
};

/**
 * Righe per autocomplete testo città (label + slug), escluso "other".
 * @returns {{ slug: string, label: string }[]}
 */
export const coachCitySuggestionRows = () =>
  Object.entries(COACH_CITY_LABELS)
    .filter(([slug]) => slug !== 'other')
    .map(([slug, label]) => ({ slug, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));

/**
 * Opzioni enum Sharetribe (console + profile form), ordinate per label.
 */
export const coachCityEnumOptions = () =>
  Object.keys(COACH_CITY_CENTERS)
    .filter(k => k !== 'other')
    .sort((a, b) => (COACH_CITY_LABELS[a] || a).localeCompare(COACH_CITY_LABELS[b] || b, 'en'))
    .map(option => ({ option, label: COACH_CITY_LABELS[option] || option }))
    .concat([{ option: 'other', label: COACH_CITY_LABELS.other }]);

/**
 * Centro mappa per lo slug salvato in `publicData.coachCity`, se presente.
 * @param {string} slug
 * @returns {{ lat: number; lng: number } | null}
 */
export const coachCityCenter = slug => {
  const k = String(slug || '')
    .toLowerCase()
    .trim();
  if (!k || !(k in COACH_CITY_CENTERS)) return null;
  const c = COACH_CITY_CENTERS[k];
  return c && typeof c.lat === 'number' && typeof c.lng === 'number' ? c : null;
};

/**
 * @param {string} slug
 * @returns {string}
 */
export const coachCityLabel = slug => {
  const k = String(slug || '')
    .toLowerCase()
    .trim();
  if (!k) return '';
  return COACH_CITY_LABELS[k] || k;
};
