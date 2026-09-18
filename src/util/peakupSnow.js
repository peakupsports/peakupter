import { fetchPeakUpSnowFromApi } from './api';

/**
 * Fetch SnowSure data for the ski resort nearest to the user's coordinates.
 *
 * @param {{ lat: number, lng: number }} coords
 * @returns {Promise<{ ok: boolean, snow: object }>}
 */
export const fetchPeakUpSnow = coords => {
  const lat = coords?.lat;
  const lng = coords?.lng;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Promise.reject(new Error('Valid coordinates are required'));
  }

  return fetchPeakUpSnowFromApi({ lat, lng });
};