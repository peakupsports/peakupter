/**
 * PeakUp Teams — entity helpers (userType `team`, roster, visibility).
 * Coaches remain independent; teams are an optional organization layer.
 */

import { getCoachShortLocationLabel, normalizeSportKey } from './coachExplore';
import { hasValidTeamMapLocation } from './teamMapLocationForm';

export const PEAKUP_TEAM_USER_TYPE = 'team';

export const PEAKUP_AFFILIATION_ACTIVE = 'active';
export const PEAKUP_AFFILIATION_PENDING = 'pending';
export const PEAKUP_AFFILIATION_REMOVED = 'removed';

const truthy = value =>
  value === true || value === 'true' || value === 1 || value === '1';

const finiteNum = n => (typeof n === 'number' && Number.isFinite(n) ? n : null);

export const normalizeProfileUserType = profilePublicData => {
  const raw = profilePublicData?.userType;
  return raw != null ? String(raw).trim().toLowerCase() : '';
};

/** @param {Object} [profilePublicData] */
export const isPeakUpTeamUserType = (profilePublicData = {}) =>
  normalizeProfileUserType(profilePublicData) === PEAKUP_TEAM_USER_TYPE;

/**
 * Team profile uses dedicated layout (not coach figurina, not customer card).
 * @param {Object} profilePublicData
 * @param {{ customer?: boolean; provider?: boolean }} [userTypeRoles]
 */
export const isPeakUpTeamProfile = (profilePublicData = {}, userTypeRoles = {}) => {
  if (!isPeakUpTeamUserType(profilePublicData)) {
    return false;
  }
  if (userTypeRoles?.customer && !userTypeRoles?.provider) {
    return false;
  }
  return true;
};

/** @param {Object} [user] Sharetribe user entity */
export const isPeakUpTeamUser = (user = null) =>
  isPeakUpTeamUserType(user?.attributes?.profile?.publicData);

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export const isTeamProviderProfileUserType = currentUser => {
  if (!currentUser?.id) {
    return false;
  }
  return isPeakUpTeamUserType(currentUser?.attributes?.profile?.publicData);
};

/**
 * Team verified for public surfaces (map, directory, profile).
 * @param {Object} [profilePublicData]
 */
export const isPeakUpVerifiedTeam = (profilePublicData = {}) => {
  const pd = profilePublicData || {};
  if (!truthy(pd.peakupVerifiedTeam) && !truthy(pd.teamApproved)) {
    return false;
  }
  const visibility = String(pd.peakupTeamVisibility || 'public').toLowerCase();
  return visibility !== 'draft';
};

/**
 * @param {Object} [profilePublicData]
 * @returns {string[]}
 */
export const getPeakupTeamMemberIds = (profilePublicData = {}) => {
  const raw = profilePublicData?.peakupTeamMemberIds;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(id => String(id || '').trim()).filter(Boolean);
};

/**
 * @param {Object} [profilePublicData]
 * @returns {string[]}
 */
export const getPeakupTeamSports = (profilePublicData = {}) => {
  const raw = profilePublicData?.teamSports || profilePublicData?.sports;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(s => normalizeSportKey(s)).filter(Boolean);
};

/**
 * Team identity form: primary sport (`teamSports[0]`).
 *
 * @param {Object} [profilePublicData]
 * @returns {string}
 */
export const getTeamPrimarySportFormValue = profilePublicData => {
  const sports = getPeakupTeamSports(profilePublicData);
  return sports[0] || '';
};

/** @deprecated use getTeamPrimarySportFormValue */
export const getTeamMainSportFormValue = getTeamPrimarySportFormValue;

/**
 * Team identity form: optional secondary sport (`teamSports[1]`).
 *
 * @param {Object} [profilePublicData]
 * @returns {string}
 */
export const getTeamSecondarySportFormValue = profilePublicData => {
  const sports = getPeakupTeamSports(profilePublicData);
  return sports[1] || '';
};

/**
 * @param {string|null|undefined} primaryRaw
 * @param {string|null|undefined} secondaryRaw
 * @returns {{ teamSports: string[] }}
 */
export const teamIdentitySportsFormValuesToPublicData = (primaryRaw, secondaryRaw) => {
  const primary = normalizeSportKey(String(primaryRaw || '').trim());
  let secondary = normalizeSportKey(String(secondaryRaw || '').trim());
  if (secondary && primary && secondary === primary) {
    secondary = '';
  }
  const teamSports = [];
  if (primary) {
    teamSports.push(primary);
  }
  if (secondary) {
    teamSports.push(secondary);
  }
  return { teamSports };
};

/** @deprecated use teamIdentitySportsFormValuesToPublicData */
export const teamMainSportFormValueToPublicData = primaryRaw =>
  teamIdentitySportsFormValuesToPublicData(primaryRaw, null);

/**
 * Short location label for team profile hero (teamCityText + Mapbox fallbacks).
 * @param {{ author?: Object; representativeListing?: Object|null }} teamRow
 * @param {Object} [opts]
 */
export const getTeamShortLocationLabel = (teamRow, opts = {}) => {
  if (!teamRow) {
    return null;
  }
  const pd = teamRow.author?.attributes?.profile?.publicData || {};
  const cityText = pd.teamCityText != null ? String(pd.teamCityText).trim() : '';
  if (cityText) {
    return cityText.split(',')[0].trim() || cityText;
  }
  return getCoachShortLocationLabel(teamRow, opts);
};

/**
 * Team HQ coordinates for map (same cascade as coaches).
 * @param {{ author?: Object; representativeListing?: Object|null }} teamRow
 */
export const getTeamCoordinates = teamRow => {
  const author = teamRow?.author;
  const pd = author?.attributes?.profile?.publicData || {};
  const listing = teamRow?.representativeListing;
  const geo = listing?.attributes?.geolocation;
  if (geo?.lat != null && geo?.lng != null) {
    return { lat: geo.lat, lng: geo.lng };
  }
  const lat = finiteNum(pd.lat) ?? finiteNum(pd.latitude);
  const lng = finiteNum(pd.lng) ?? finiteNum(pd.longitude);
  if (lat != null && lng != null) {
    return { lat, lng };
  }
  const teamOrigin = pd.teamLocation?.selectedPlace?.origin;
  if (teamOrigin?.lat != null && teamOrigin?.lng != null) {
    return { lat: teamOrigin.lat, lng: teamOrigin.lng };
  }
  const origin = pd.location?.selectedPlace?.origin;
  if (origin?.lat != null && origin?.lng != null) {
    return { lat: origin.lat, lng: origin.lng };
  }
  return null;
};

/** Teams without geocoded base do not appear on the coach map. */
export const teamRowHasMapCoordinates = teamRow => {
  if (getTeamCoordinates(teamRow)) {
    return true;
  }
  return hasValidTeamMapLocation(teamRow?.author?.attributes?.profile?.publicData);
};

/**
 * @param {Object} coachUser
 * @returns {boolean}
 */
export const isVerifiedCoachForTeamRoster = (coachUser = null) => {
  const pd = coachUser?.attributes?.profile?.publicData || {};
  return (
    truthy(pd.peakupVerifiedCoach) ||
    truthy(pd.coachApproved) ||
    truthy(pd.profileVerified)
  );
};

/**
 * Public roster: active affiliation + verified coach.
 * @param {Object[]} memberUsers denormalised users
 * @param {string} teamId
 */
export const filterPublicTeamRosterMembers = (memberUsers = [], teamId = '') => {
  const tid = String(teamId || '').trim();
  return (Array.isArray(memberUsers) ? memberUsers : []).filter(u => {
    if (!isVerifiedCoachForTeamRoster(u)) {
      return false;
    }
    const pd = u?.attributes?.profile?.publicData || {};
    if (String(pd.peakupAffiliatedTeamId || '').trim() !== tid) {
      return false;
    }
    const status = String(pd.peakupAffiliationStatus || PEAKUP_AFFILIATION_ACTIVE).toLowerCase();
    return status === PEAKUP_AFFILIATION_ACTIVE;
  });
};

/**
 * Coach affiliation badge data for profile.
 * @param {Object} coachPublicData
 * @param {Object|null} teamUser optional preloaded team user
 */
export const resolveCoachTeamAffiliation = (coachPublicData = {}, teamUser = null) => {
  const teamId = String(coachPublicData?.peakupAffiliatedTeamId || '').trim();
  if (!teamId) {
    return null;
  }
  const status = String(coachPublicData?.peakupAffiliationStatus || '').toLowerCase();
  if (status === PEAKUP_AFFILIATION_REMOVED) {
    return null;
  }
  const teamPd = teamUser?.attributes?.profile?.publicData || {};
  const teamName =
    teamUser?.attributes?.profile?.displayName ||
    coachPublicData?.peakupAffiliatedTeamName ||
    null;
  if (!teamName && status === PEAKUP_AFFILIATION_PENDING) {
    return { teamId, teamName: null, status: PEAKUP_AFFILIATION_PENDING, isPublic: false };
  }
  if (!isPeakUpVerifiedTeam(teamPd) && status !== PEAKUP_AFFILIATION_PENDING) {
    return null;
  }
  return {
    teamId,
    teamName,
    status: status || PEAKUP_AFFILIATION_ACTIVE,
    isPublic: status === PEAKUP_AFFILIATION_ACTIVE && isPeakUpVerifiedTeam(teamPd),
  };
};

/** Listing flag for team commerce listings. */
export const listingHasPeakupTeamListingFlag = listing => {
  const v = listing?.attributes?.publicData?.peakupTeamListing;
  return truthy(v);
};

/**
 * Entity filter for coach map / explore.
 * @param {'all'|'coaches'|'teams'} entityFilter
 * @param {'coach'|'team'} entityType
 */
export const matchesEntityFilter = (entityFilter, entityType) => {
  const f = String(entityFilter || 'all').toLowerCase();
  if (f === 'all') {
    return true;
  }
  if (f === 'coaches') {
    return entityType === 'coach';
  }
  if (f === 'teams') {
    return entityType === 'team';
  }
  return true;
};

/**
 * Sport filter for team rows.
 * @param {Object} teamRow
 * @param {Set<string>} filterKeys normalized sport keys
 */
export const teamRowMatchesSportKeys = (teamRow, filterKeys) => {
  if (!filterKeys || filterKeys.size === 0) {
    return true;
  }
  const keys = new Set([
    ...getPeakupTeamSports(teamRow?.author?.attributes?.profile?.publicData),
    ...(teamRow.sportKeys || []).map(normalizeSportKey),
  ]);
  for (const k of filterKeys) {
    if (keys.has(k)) {
      return true;
    }
  }
  return false;
};

export const TEAM_PROFILE_SETTINGS_PATH = '/profile-settings';

/** V1 Team dashboard shell — swap to `TeamDashboardPage` when the full crew hub ships. */
export const TEAM_DASHBOARD_ROUTE_NAME = 'ProfileSettingsPage';

/**
 * NamedLink target for Team dashboard home (logo, menu, post-login).
 *
 * @returns {{ linkName: string }}
 */
export const resolveTeamDashboardLink = () => ({
  linkName: TEAM_DASHBOARD_ROUTE_NAME,
});

/**
 * Whether the current route is the Team dashboard shell.
 *
 * @param {string|null|undefined} pageName
 * @returns {boolean}
 */
export const isTeamDashboardRoute = pageName => pageName === TEAM_DASHBOARD_ROUTE_NAME;

/**
 * Minimal V1 team profile completeness for post-login redirect.
 *
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {boolean}
 */
export const isTeamProfileComplete = currentUser => {
  if (!currentUser?.id) {
    return false;
  }
  const profile = currentUser.attributes?.profile || {};
  const pd = profile.publicData || {};
  if (!isPeakUpTeamUserType(pd)) {
    return false;
  }

  const displayName = String(profile.displayName || pd.teamName || '').trim();
  const hasName = displayName.length > 0;

  const cityText = String(pd.teamCityText || '').trim();
  const hasLocation = hasValidTeamMapLocation(pd) || cityText.length > 0;

  const bio = String(pd.teamBio || profile.bio || '').trim();
  const tagline = String(pd.teamTagline || '').trim();
  const hasStory = bio.length > 0 || tagline.length > 0;

  return hasName && hasLocation && hasStory;
};

/**
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string|null}
 */
export const buildTeamProfilePath = currentUser => {
  const uuid = currentUser?.id?.uuid;
  if (!uuid) {
    return null;
  }
  return `/u/${uuid}`;
};

/**
 * Post-login redirect for team accounts.
 * V1: always profile settings until a dedicated Team dashboard exists.
 * Future: complete crews may route to Team dashboard (roster, invites, map pin, etc.).
 *
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {string|null}
 */
export const resolveTeamPostLoginRedirectTarget = currentUser => {
  if (!isTeamProviderProfileUserType(currentUser)) {
    return null;
  }
  return TEAM_PROFILE_SETTINGS_PATH;
};

/**
 * NamedLink target for the topbar logo when signed in as a team account.
 * V1: same as post-login — Team profile settings (not customer landing, not coach dashboard).
 *
 * @param {import('./types').propTypes.currentUser|null|undefined} currentUser
 * @returns {{ linkName: string, linkParams?: Object }|null}
 */
export const resolveTeamLogoLink = currentUser => {
  if (!isTeamProviderProfileUserType(currentUser)) {
    return null;
  }
  return resolveTeamDashboardLink();
};
