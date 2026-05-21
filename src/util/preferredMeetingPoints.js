const finiteNum = v => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

/**
 * Stable id for a coach preferred meeting point (stored in `publicData`).
 *
 * @returns {string}
 */
export const createPreferredMeetingPointId = () =>
  `peakup-mp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const emptyLocationValue = () => ({ search: '', selectedPlace: null });

/**
 * Blank row for Final Form `preferredMeetingPoints` FieldArray.
 *
 * @returns {{ id: string, label: string, notes: string, location: object }}
 */
export const createEmptyPreferredMeetingPointFormRow = () => ({
  id: createPreferredMeetingPointId(),
  label: '',
  notes: '',
  location: emptyLocationValue(),
});

/**
 * @param {Object} [location] Final Form location autocomplete value
 * @returns {string}
 */
export const addressFromMeetingPointLocation = (location = {}) => {
  const sp = location?.selectedPlace;
  const addr = sp?.address != null ? String(sp.address).trim() : '';
  if (addr) {
    return addr;
  }
  const search = typeof location.search === 'string' ? location.search.trim() : '';
  return search;
};

/**
 * @param {Object} [location]
 * @returns {{ lat: number|null, lng: number|null }}
 */
export const coordsFromMeetingPointLocation = (location = {}) => {
  const origin = location?.selectedPlace?.origin;
  return { lat: finiteNum(origin?.lat), lng: finiteNum(origin?.lng) };
};

/**
 * @param {Object} [row] Form row
 * @returns {Object|null} Stored point for `publicData.preferredMeetingPoints`
 */
export const storedPointFromFormRow = row => {
  if (!row || typeof row !== 'object') {
    return null;
  }
  const label = row.label != null ? String(row.label).trim() : '';
  const address = addressFromMeetingPointLocation(row.location);
  if (!label || !address) {
    return null;
  }
  const { lat, lng } = coordsFromMeetingPointLocation(row.location);
  const notesRaw = row.notes != null ? String(row.notes).trim() : '';
  const id =
    row.id != null && String(row.id).trim()
      ? String(row.id).trim()
      : createPreferredMeetingPointId();

  return {
    id,
    label,
    address,
    notes: notesRaw,
    ...(lat != null && lng != null ? { lat, lng } : {}),
  };
};

/**
 * @param {Array} [formRows]
 * @returns {Array<Object>}
 */
export const normalizePreferredMeetingPointsForPublicData = (formRows = []) => {
  if (!Array.isArray(formRows)) {
    return [];
  }
  return formRows.map(storedPointFromFormRow).filter(Boolean);
};

/**
 * @param {Object} point Stored `publicData.preferredMeetingPoints` item
 * @returns {Object|null} Form row
 */
export const formRowFromStoredPoint = point => {
  if (!point || typeof point !== 'object') {
    return null;
  }
  const label = point.label != null ? String(point.label).trim() : '';
  if (!label) {
    return null;
  }
  const address = point.address != null ? String(point.address).trim() : '';
  const notes = point.notes != null ? String(point.notes) : '';
  const lat = finiteNum(point.lat);
  const lng = finiteNum(point.lng);
  const id =
    point.id != null && String(point.id).trim()
      ? String(point.id).trim()
      : createPreferredMeetingPointId();

  let location = emptyLocationValue();
  if (address || (lat != null && lng != null)) {
    const display = address || `${lat}, ${lng}`;
    location = {
      search: display,
      selectedPlace:
        lat != null && lng != null
          ? { address: display, origin: { lat, lng } }
          : address
          ? { address: display }
          : null,
    };
  }

  return { id, label, notes, location };
};

/**
 * @param {Object} [publicData]
 * @returns {Array<Object>}
 */
export const preferredMeetingPointsFromPublicData = (publicData = {}) => {
  const raw = publicData?.preferredMeetingPoints;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(formRowFromStoredPoint).filter(Boolean);
};

/**
 * @param {Array} [formRows]
 * @returns {{ preferredMeetingPoints: Array<Object> }}
 */
export const publicDataPatchFromPreferredMeetingPoints = formRows => ({
  preferredMeetingPoints: normalizePreferredMeetingPointsForPublicData(formRows),
});
