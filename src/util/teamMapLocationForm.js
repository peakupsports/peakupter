import { derivePlaceShortLabel, getCoachMapLocationLabel } from './coachExplore';
import {
  coachMapLocationFromPublicData,
  originFromPublicDataLocationField,
  publicDataPatchFromCoachMapLocation,
} from './coachMapLocationForm';

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
 * Final Form value for team crew-base Mapbox field.
 * Prefers `teamLocation`, then legacy `location`, then top-level lat/lng.
 *
 * @param {Object} [publicData]
 */
export const teamMapLocationFromPublicData = (publicData = {}) => {
  const pd = publicData || {};
  const teamLoc = pd.teamLocation;
  if (teamLoc?.selectedPlace?.origin) {
    const { lat, lng } = originFromPublicDataLocationField({ location: teamLoc });
    if (lat != null && lng != null) {
      const search = typeof teamLoc.search === 'string' ? teamLoc.search.trim() : '';
      const addr =
        teamLoc.selectedPlace?.address?.trim() ||
        pd.teamCityText?.trim() ||
        search ||
        `${lat}, ${lng}`;
      return {
        search: search || addr,
        selectedPlace: {
          address: addr,
          origin: { lat, lng },
          ...(teamLoc.selectedPlace.bounds ? { bounds: teamLoc.selectedPlace.bounds } : {}),
        },
      };
    }
  }
  const fromCoach = coachMapLocationFromPublicData({
    ...pd,
    coachCityText: pd.teamCityText || pd.coachCityText,
  });
  if (fromCoach?.selectedPlace?.origin) {
    return fromCoach;
  }
  return { search: pd.teamCityText || '', selectedPlace: null };
};

/**
 * Merge into profile `publicData` from `pub_teamMapLocation`.
 *
 * @param {*} value
 */
export const publicDataPatchFromTeamMapLocation = value => {
  const base = publicDataPatchFromCoachMapLocation(value);
  const shortLabel =
    derivePlaceShortLabel(value) || base.coachCityText || base.location?.selectedPlace?.address;
  const teamLocation =
    base.location != null
      ? {
          predictions: base.location.predictions || [],
          search: base.location.search || '',
          selectedPlace: base.location.selectedPlace,
        }
      : null;

  return {
    lat: base.lat,
    lng: base.lng,
    teamCityText: shortLabel || base.coachCityText,
    teamLocation,
    location: teamLocation,
  };
};

/**
 * @param {Object} [publicData]
 * @returns {boolean}
 */
export const hasValidTeamMapLocation = (publicData = {}) => {
  const pd = publicData || {};
  const lat = finiteNum(pd.lat) ?? finiteNum(pd.latitude);
  const lng = finiteNum(pd.lng) ?? finiteNum(pd.longitude);
  if (lat != null && lng != null) {
    return true;
  }
  const { lat: latT, lng: lngT } = originFromPublicDataLocationField({
    location: pd.teamLocation,
  });
  if (latT != null && lngT != null) {
    return true;
  }
  const { lat: latL, lng: lngL } = originFromPublicDataLocationField(pd);
  return latL != null && lngL != null;
};

/**
 * Compact "City, Country" label for team map popup / sidebar.
 *
 * @param {{ author?: Object; representativeListing?: Object|null }} teamRow
 * @param {Object} [opts]
 */
export const getTeamMapLocationLabel = (teamRow, opts = {}) => {
  if (!teamRow) {
    return null;
  }
  const pd = teamRow.author?.attributes?.profile?.publicData || {};
  const cityText = pd.teamCityText != null ? String(pd.teamCityText).trim() : '';
  if (cityText) {
    const head = cityText.split(',')[0].trim();
    return head || cityText;
  }
  return getCoachMapLocationLabel(teamRow, opts);
};

export const isValidTeamMapLocationFieldValue = value => {
  const origin = value?.selectedPlace?.origin;
  const lat = finiteNum(origin?.lat);
  const lng = finiteNum(origin?.lng);
  return lat != null && lng != null;
};
