/**
 * PeakUp user role detection — single import path for account settings and HQ UI.
 * Wraps Sharetribe marketplace userType roles with PeakUp team/coach/customer semantics.
 */
import {
  getCurrentUserTypeRoles as getMarketplaceUserTypeRoles,
  showCreateListingLinkForUser,
  showPaymentDetailsForUser,
} from './userHelpers';
import { isTeamProviderProfileUserType } from './peakupTeam';

export { getMarketplaceUserTypeRoles as getCurrentUserTypeRoles };

/**
 * @param {*} config Marketplace configuration
 * @param {*} currentUser Sharetribe user entity
 * @returns {{
 *   roles: { customer?: boolean; provider?: boolean };
 *   isTeamUser: boolean;
 *   isCoachUser: boolean;
 *   isCustomerUser: boolean;
 *   showCoachCalendarLink: boolean;
 * }}
 */
export const getPeakUpUserRoleFlags = (config, currentUser) => {
  const roles = getMarketplaceUserTypeRoles(config, currentUser);
  const isTeamUser = isTeamProviderProfileUserType(currentUser);
  const isCoachUser = Boolean(roles.provider) && !isTeamUser;
  const isCustomerUser = Boolean(roles.customer) && !isCoachUser && !isTeamUser;

  return {
    roles,
    isTeamUser,
    isCoachUser,
    isCustomerUser,
    showCoachCalendarLink: isCoachUser,
  };
};

/**
 * Shared UserNav + account settings tab props for ContactDetails, Password, Payments, etc.
 *
 * @param {*} config
 * @param {*} currentUser
 * @param {string} currentPage Route name, e.g. 'PasswordChangePage'
 */
export const getPeakUpAccountSettingsShellProps = (config, currentUser, currentPage) => {
  const { showCoachCalendarLink } = getPeakUpUserRoleFlags(config, currentUser);
  const { showPayoutDetails, showPaymentMethods } = showPaymentDetailsForUser(
    config,
    currentUser
  );

  return {
    showManageListingsLink: showCreateListingLinkForUser(config, currentUser),
    showCoachCalendarLink,
    accountSettingsNavProps: {
      currentPage,
      showPaymentMethods,
      showPayoutDetails,
    },
  };
};
