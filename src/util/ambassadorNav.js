/**
 * Ambassador ecosystem — coach-facing navigation helpers.
 */

import { getCurrentUserTypeRoles } from './userHelpers';

export const AMBASSADOR_SECTION_ROUTE_NAMES = ['AmbassadorProgramPage', 'ReferralCenterPage'];

/**
 * @param {string} [routeName]
 * @returns {boolean}
 */
export const isAmbassadorSectionRouteName = routeName =>
  Boolean(routeName && AMBASSADOR_SECTION_ROUTE_NAMES.includes(routeName));

/** @deprecated use AMBASSADOR_SECTION_ROUTE_NAMES */
export const AMBASSADOR_ECOSYSTEM_ROUTE_NAMES = AMBASSADOR_SECTION_ROUTE_NAMES;

/** @deprecated use isAmbassadorSectionRouteName */
export const isAmbassadorEcosystemRouteName = isAmbassadorSectionRouteName;

/**
 * Coach/provider profile menu — Ambassador section visibility.
 *
 * @param {Object} config
 * @param {import('../util/types').currentUser} currentUser
 * @returns {boolean}
 */
export const showAmbassadorMenuForUser = (config, currentUser) => {
  if (!currentUser) {
    return false;
  }

  const { provider: isProvider } = getCurrentUserTypeRoles(config, currentUser);
  return Boolean(isProvider);
};
