import { getCustomerUserTypeForCoachSignup } from './coachOnboarding';
import { PEAKUP_TEAM_USER_TYPE } from './peakupTeam';

/**
 * Resolve PeakUp signup path user-type ids from hosted `userTypes` config.
 *
 * @param {Array<{ userType: string, label?: string }>} [userTypes]
 * @returns {{ customerUserType: string|null, teamUserType: string|null, showCoachPath: boolean }}
 */
export const getSignupPathOptions = (userTypes = []) => {
  const customerUserType = getCustomerUserTypeForCoachSignup(userTypes);
  const teamConfig = userTypes.find(c => c.userType === PEAKUP_TEAM_USER_TYPE);
  const teamUserType = teamConfig?.userType || null;

  return {
    customerUserType,
    teamUserType,
    showCoachPath: true,
  };
};

/**
 * Whether the premium 3-card selector should replace the user-type dropdown.
 * Intentionally ignores `preselectedUserType` (e.g. coach-onboarding customer default)
 * so cards stay visible above the form on `/signup`.
 *
 * @param {Object} params
 * @param {boolean} params.showSignupPathSelector
 * @param {Array} [params.userTypes] Full hosted user types (include `team` for cards)
 * @returns {boolean}
 */
export const shouldUseSignupPathSelector = ({ showSignupPathSelector, userTypes }) => {
  if (!showSignupPathSelector) {
    return false;
  }
  const { customerUserType, teamUserType, showCoachPath } = getSignupPathOptions(userTypes);
  const pathCount =
    (customerUserType ? 1 : 0) + (showCoachPath ? 1 : 0) + (teamUserType ? 1 : 0);
  return pathCount >= 2;
};
