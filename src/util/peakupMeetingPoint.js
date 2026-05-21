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
 * @param {Object} point
 * @returns {Object|null}
 */
export const normalizeStoredPreferredMeetingPoint = point => {
  if (!point || typeof point !== 'object') {
    return null;
  }
  const label = point.label != null ? String(point.label).trim() : '';
  if (!label) {
    return null;
  }
  const notes = point.notes != null ? String(point.notes).trim() : '';
  const id = point.id != null && String(point.id).trim() ? String(point.id).trim() : null;
  const lat = finiteNum(point.lat);
  const lng = finiteNum(point.lng);
  const zoom = finiteNum(point.zoom);
  if (!id) {
    return null;
  }
  const legacyAddress = point.address != null ? String(point.address).trim() : '';
  return {
    id,
    label,
    address: legacyAddress || label,
    notes,
    ...(lat != null && lng != null ? { lat, lng } : {}),
    ...(zoom != null ? { zoom } : {}),
  };
};

/**
 * Coach saved meeting points from listing author / profile `publicData`.
 *
 * @param {Object} [author] Sharetribe user (listing.author)
 * @returns {Array<Object>}
 */
export const coachPreferredMeetingPointsList = author => {
  const publicData = author?.attributes?.profile?.publicData || {};
  const raw = publicData.preferredMeetingPoints;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(normalizeStoredPreferredMeetingPoint)
    .filter(point => {
      if (!point) {
        return false;
      }
      const lat = finiteNum(point.lat);
      const lng = finiteNum(point.lng);
      return lat != null && lng != null;
    });
};

/**
 * @param {Array<Object>} points
 * @returns {{ peakupMeetingPointId?: string }}
 */
export const peakupMeetingPointInitialValues = points => {
  if (points.length === 1) {
    return { peakupMeetingPointId: points[0].id };
  }
  return {};
};

/**
 * @param {Object} values Final Form values
 * @param {Array<Object>} points
 * @returns {Object|null}
 */
export const peakupMeetingPointFromFormValues = (values, points) => {
  if (!points.length) {
    return null;
  }
  const idRaw = values?.peakupMeetingPointId;
  if (idRaw != null && String(idRaw).trim()) {
    return points.find(p => p.id === String(idRaw).trim()) || null;
  }
  if (points.length === 1) {
    return points[0];
  }
  return null;
};

/**
 * Shape stored on `transaction.protectedData.peakupMeetingPoint`.
 *
 * @param {Object} point
 * @returns {Object|null}
 */
export const peakupMeetingPointForProtectedData = point => {
  const normalized = normalizeStoredPreferredMeetingPoint(point);
  if (!normalized) {
    return null;
  }
  const { id, label, address, notes, lat, lng, zoom } = normalized;
  return {
    id,
    label,
    address,
    notes,
    ...(lat != null && lng != null ? { lat, lng } : {}),
    ...(zoom != null ? { zoom } : {}),
  };
};

/**
 * Merge selected meeting point into booking submit payload (drops form id field).
 *
 * @param {Object} values
 * @param {Array<Object>} preferredMeetingPoints
 * @returns {Object}
 */
export const appendPeakupMeetingPointToOrderValues = (values, preferredMeetingPoints) => {
  if (values?.peakupMeetingPoint && typeof values.peakupMeetingPoint === 'object') {
    const { peakupMeetingPointId: _drop, ...rest } = values;
    return rest;
  }
  const points = Array.isArray(preferredMeetingPoints) ? preferredMeetingPoints : [];
  if (!points.length) {
    return values;
  }
  const selected = peakupMeetingPointFromFormValues(values, points);
  const stored = peakupMeetingPointForProtectedData(selected);
  const { peakupMeetingPointId: _drop, ...rest } = values || {};
  if (!stored) {
    return rest;
  }
  logPeakupMeetingPointSelected(stored);
  return { ...rest, peakupMeetingPoint: stored };
};

/**
 * @param {Object} peakupMeetingPoint
 */
export const logPeakupMeetingPointSelected = peakupMeetingPoint => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MEETING POINT SELECTED]', peakupMeetingPoint);
  }
};

/**
 * @param {Object} peakupMeetingPoint
 */
export const logPeakupMeetingPointCheckout = peakupMeetingPoint => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MEETING POINT CHECKOUT]', peakupMeetingPoint);
  }
};

/**
 * @param {Object} peakupMeetingPoint
 */
/**
 * Deep-link search for Coach Map (`?coachId=&meetingPointId=`).
 *
 * @param {{ coachId?: string|null, meetingPointId?: string|null }} params
 * @returns {string|null} `?coachId=…` or null when coach id missing
 */
/**
 * Google Maps directions / search URL for a stored meeting point.
 *
 * @param {Object} meetingPoint `peakupMeetingPoint` or raw point
 * @returns {string|null}
 */
export const googleMapsDirectionsUrlForMeetingPoint = meetingPoint => {
  const stored = peakupMeetingPointForProtectedData(meetingPoint);
  if (!stored) {
    return null;
  }
  const { lat, lng, address, label } = stored;
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const destination = address || label;
  if (destination) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  }
  return null;
};

export const buildPeakUpCoachMapMeetingPointSearch = ({ coachId, meetingPointId }) => {
  const coach = coachId != null ? String(coachId).trim() : '';
  if (!coach) {
    return null;
  }
  const search = new URLSearchParams();
  search.set('coachId', coach);
  const mpId = meetingPointId != null ? String(meetingPointId).trim() : '';
  if (mpId) {
    search.set('meetingPointId', mpId);
  }
  return `?${search.toString()}`;
};

export const logPeakupMeetingPointTransaction = peakupMeetingPoint => {
  if (typeof console !== 'undefined' && console.log) {
    console.log('[PeakUp MEETING POINT TRANSACTION]', peakupMeetingPoint);
  }
};
