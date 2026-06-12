import {
  getCustomerUserTypeForCoachSignup,
  hasCoachOnboardingIntent,
  hasCoachOnboardingProfileIntent,
  hasCoachOnboardingUrlSignal,
  isCoachApplicantProfile,
  isCoachOnboardingQueryActive,
  isCoachOnboardingReturn,
  isCoachProviderProfileUserType,
  isCoachSignupEntryPathname,
  shouldRedirectToCoachApplication,
} from './coachOnboarding';
import { PEAKUP_TEAM_USER_TYPE } from './peakupTeam';

export const SIGNUP_PATH_CLIENT = 'client';
export const SIGNUP_PATH_COACH = 'coach';
export const SIGNUP_PATH_TEAM = 'team';

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
 * Coach onboarding routes that default to Professionista until the user picks another path.
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @returns {boolean}
 */
export function isCoachOnboardingRouteForced({ location, from } = {}) {
  if (isCoachSignupEntryPathname(location?.pathname)) {
    return true;
  }
  if (isCoachOnboardingQueryActive(location?.search)) {
    return true;
  }
  if (isCoachOnboardingReturn(from)) {
    return true;
  }
  return false;
}

/**
 * Default coach path before the user makes an explicit Cliente/Team choice.
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @param {import('./types').propTypes.currentUser|null|undefined} [options.currentUser]
 * @returns {boolean}
 */
export function isCoachSignupPathDefault({ location, from, currentUser } = {}) {
  if (isCoachOnboardingRouteForced({ location, from })) {
    return true;
  }
  if (hasCoachOnboardingUrlSignal({ location, from })) {
    return true;
  }
  if (hasCoachOnboardingIntent()) {
    return true;
  }
  if (!currentUser?.id) {
    return false;
  }
  if (shouldRedirectToCoachApplication(currentUser)) {
    return true;
  }
  if (isCoachApplicantProfile(currentUser)) {
    return true;
  }
  if (
    hasCoachOnboardingProfileIntent(currentUser) &&
    !isCoachProviderProfileUserType(currentUser)
  ) {
    return true;
  }
  return false;
}

/** @deprecated Use isCoachSignupPathDefault */
export function isCoachSignupPathActive(options) {
  return isCoachSignupPathDefault(options);
}

/**
 * Active card in the PeakUp signup path selector (client / coach / team).
 *
 * @param {object} [options]
 * @param {import('react-router-dom').Location} [options.location]
 * @param {string|object|null} [options.from]
 * @param {import('./types').propTypes.currentUser|null|undefined} [options.currentUser]
 * @param {string|null|undefined} [options.selectedUserType]
 * @param {'client'|'coach'|'team'|null} [options.explicitSignupPath]
 * @param {Array} [options.userTypes]
 * @returns {'client'|'coach'|'team'|null}
 */
export function resolveActiveSignupPath({
  location,
  from,
  currentUser,
  selectedUserType,
  explicitSignupPath = null,
  userTypes = [],
} = {}) {
  const { customerUserType, teamUserType } = getSignupPathOptions(userTypes);

  if (
    explicitSignupPath === SIGNUP_PATH_CLIENT ||
    explicitSignupPath === SIGNUP_PATH_COACH ||
    explicitSignupPath === SIGNUP_PATH_TEAM
  ) {
    return explicitSignupPath;
  }

  if (isCoachSignupPathDefault({ location, from, currentUser })) {
    return SIGNUP_PATH_COACH;
  }

  if (teamUserType && selectedUserType === teamUserType) {
    return SIGNUP_PATH_TEAM;
  }

  if (customerUserType && selectedUserType === customerUserType) {
    return SIGNUP_PATH_CLIENT;
  }

  return null;
}
