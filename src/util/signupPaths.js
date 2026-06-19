import { getCustomerUserTypeForCoachSignup } from './coachOnboarding';
import { PEAKUP_TEAM_USER_TYPE } from './peakupTeam';

/** Signup path card ids — distinct from Sharetribe `userType` (coach path uses customer type). */
export const SIGNUP_PATH_IDS = {
  CUSTOMER: 'customer',
  COACH: 'coach',
  TEAM: 'team',
};

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

/**
 * Which signup path card should show the active state.
 * Coach onboarding keeps `userType` on the customer id — path must be tracked separately.
 *
 * @param {Object} params
 * @param {string|null|undefined} params.userType Final Form `userType` value
 * @param {boolean} [params.isCoachOnboardingActive] Coach/professional onboarding signal
 * @param {Array} [params.userTypes] Hosted user types for path card resolution
 * @returns {'customer'|'coach'|'team'|null}
 */
export const resolveSelectedSignupPath = ({
  userType,
  isCoachOnboardingActive,
  userTypes,
}) => {
  const { customerUserType, teamUserType } = getSignupPathOptions(userTypes);

  if (isCoachOnboardingActive) {
    return SIGNUP_PATH_IDS.COACH;
  }
  if (teamUserType && userType === teamUserType) {
    return SIGNUP_PATH_IDS.TEAM;
  }
  if (customerUserType && userType === customerUserType) {
    return SIGNUP_PATH_IDS.CUSTOMER;
  }
  return null;
};
