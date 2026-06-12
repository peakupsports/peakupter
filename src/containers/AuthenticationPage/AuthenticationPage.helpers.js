import Cookies from 'js-cookie';

import { isEmpty } from '../../util/common';
import { pickUserFieldsData, addScopePrefix } from '../../util/userHelpers';
import { PEAKUP_TEAM_USER_TYPE } from '../../util/peakupTeam';
import {
  buildCoachOnboardingProfilePublicData,
  clearCoachOnboardingIntent,
  readCoachOnboardingIntent,
} from '../../util/coachOnboarding';
import { SIGNUP_PATH_COACH } from '../../util/signupPaths';

/**
 * Filters out configured user-field entries, returning only the remaining key/value pairs.
 *
 * The signup and IdP confirm flows destructure a set of known identity fields from the form submit
 * values and handles the remaining fields as `protectedData`.
 * This helper picks those key/value pairs that are not configured as user fields.
 *
 * @param {Object} values - submit values from the form
 * @param {Array<{ scope: string, key: string }>} userFieldConfigs - Configured user field definitions.
 * @returns {Object} Remaining key/value pairs (non-user-field entries).
 */
export const getNonUserFieldParams = (values, userFieldConfigs) => {
  const userFieldKeys = userFieldConfigs.map(({ scope, key }) => addScopePrefix(scope, key));

  return Object.entries(values).reduce((picked, [key, value]) => {
    const isUserFieldKey = userFieldKeys.includes(key);

    return isUserFieldKey
      ? picked
      : {
          ...picked,
          [key]: value,
        };
  }, {});
};

/**
 * @param {Object} submitValues
 * @param {string} userType
 * @param {Array} userFields
 * @returns {Object}
 */
export const buildSignupPublicData = (submitValues, userType, userFields) => {
  const pickedPublic = !isEmpty(submitValues)
    ? pickUserFieldsData(submitValues, 'public', userType, userFields)
    : {};

  return {
    userType,
    ...pickedPublic,
  };
};

/**
 * Builds extended data (public/private/protected) for the created currentUser entity.
 *
 * @param {Object} submitValues - Unhandled form submit values
 * @param {string} userType - The user type
 * @param {Array} userFields - User field configurations
 * @returns {{ publicData: Object, privateData?: Object, protectedData?: Object } | {}}
 */
export const getExtendedDataMaybe = (submitValues, userType, userFields) => {
  if (!userType && isEmpty(submitValues)) {
    return {};
  }

  const extendedData = {
    publicData: buildSignupPublicData(submitValues, userType, userFields),
  };

  if (!isEmpty(submitValues)) {
    extendedData.privateData = pickUserFieldsData(submitValues, 'private', userType, userFields);
    extendedData.protectedData = {
      ...pickUserFieldsData(submitValues, 'protected', userType, userFields),
      ...getNonUserFieldParams(submitValues, userFields),
    };
  }

  return extendedData;
};

/**
 * @param {Object} [context]
 * @param {'client'|'coach'|'team'|null|undefined} [context.activeSignupPath]
 * @param {string} [context.coachSignupRef]
 * @returns {{ isCoachSignup: boolean, coachOnboardingPublicData: object|null }}
 */
export const resolveSignupCoachPayload = ({ activeSignupPath, coachSignupRef } = {}) => {
  const isCoachSignup = activeSignupPath === SIGNUP_PATH_COACH;
  const coachOnboardingPublicData = isCoachSignup
    ? buildCoachOnboardingProfilePublicData({ ref: coachSignupRef })
    : null;

  return { isCoachSignup, coachOnboardingPublicData };
};

/**
 * Creates a submit handler for the signup form.
 * Coach onboarding flags are resolved at submit time from the active signup path,
 * not from render-time props (avoids stale coach payload after switching to Customer).
 *
 * @param {Object} params
 * @param {Function} params.submitSignup
 * @param {Array} params.userFields
 * @param {() => { activeSignupPath?: 'client'|'coach'|'team'|null, coachSignupRef?: string }} [params.getSignupSubmitContext]
 * @returns {(values: Object) => Promise|void}
 */
export const getHandleSubmitSignup = ({ submitSignup, userFields, getSignupSubmitContext }) => values => {
  const submitContext =
    typeof getSignupSubmitContext === 'function' ? getSignupSubmitContext() : {};
  const { isCoachSignup, coachOnboardingPublicData } = resolveSignupCoachPayload(submitContext);
  const { userType, email, password, fname, lname, displayName, teamName, ...rest } = values;

  if (!isCoachSignup) {
    clearCoachOnboardingIntent();
  }

  const isTeamSignup = userType === PEAKUP_TEAM_USER_TYPE;

  const identityFields = isTeamSignup
    ? (() => {
        const normalizedTeamName = String(teamName || '').trim();
        return {
          firstName: normalizedTeamName,
          lastName: normalizedTeamName,
          displayName: normalizedTeamName,
        };
      })()
    : {
        firstName: fname.trim(),
        lastName: lname.trim(),
        ...(displayName ? { displayName: displayName.trim() } : {}),
      };

  const submitParams = {
    email,
    password,
    ...identityFields,
    ...getExtendedDataMaybe(rest, userType, userFields),
    activeSignupPath: submitContext.activeSignupPath || null,
    ...(isCoachSignup && coachOnboardingPublicData
      ? { coachOnboardingPublicData }
      : {}),
  };

  // eslint-disable-next-line no-console
  console.log('[PeakUp SIGNUP SUBMIT — BEFORE DISPATCH]', {
    activeSignupPath: submitContext.activeSignupPath || null,
    formUserType: userType,
    isCoachSignup,
    publicData: submitParams.publicData || null,
    coachOnboardingPublicData: coachOnboardingPublicData || null,
    coachOnboardingPublicDataIsNull: coachOnboardingPublicData == null,
    localStorageIntent: readCoachOnboardingIntent(),
  });

  return submitSignup(submitParams).catch(() => undefined);
};

/**
 * Creates a submit handler for confirming signup data after SSO.
 *
 * @param {Object} params
 * @param {Object} params.authInfo
 * @param {Function} params.submitSingupWithIdp
 * @param {Array} params.userFields
 * @param {() => { activeSignupPath?: 'client'|'coach'|'team'|null, coachSignupRef?: string }} [params.getSignupSubmitContext]
 * @returns {(values: Object) => void}
 */
export const getHandleSubmitConfirm = ({
  authInfo,
  submitSingupWithIdp,
  userFields,
  getSignupSubmitContext,
}) => values => {
  const submitContext =
    typeof getSignupSubmitContext === 'function' ? getSignupSubmitContext() : {};
  const { isCoachSignup, coachOnboardingPublicData } = resolveSignupCoachPayload(submitContext);
  const { idpToken, email, firstName, lastName, idpId } = authInfo;

  const {
    userType,
    email: newEmail,
    firstName: newFirstName,
    lastName: newLastName,
    displayName,
    ...rest
  } = values;

  if (!isCoachSignup) {
    clearCoachOnboardingIntent();
  }

  const displayNameMaybe = displayName ? { displayName: displayName.trim() } : {};

  const authParams = {
    ...(newEmail !== email && { email: newEmail }),
    ...(newFirstName !== firstName && { firstName: newFirstName }),
    ...(newLastName !== lastName && { lastName: newLastName }),
  };

  const extendedDataMaybe = getExtendedDataMaybe(rest, userType, userFields);
  const publicData = isCoachSignup
    ? {
        ...(extendedDataMaybe.publicData || {}),
        ...(coachOnboardingPublicData || {}),
      }
    : extendedDataMaybe.publicData || { userType };

  // eslint-disable-next-line no-console
  console.log('[PeakUp SIGNUP CONFIRM SUBMIT]', {
    activeSignupPath: submitContext.activeSignupPath || null,
    formUserType: userType,
    isCoachSignup,
    publicData,
    coachOnboardingPublicData: coachOnboardingPublicData || null,
  });

  submitSingupWithIdp({
    idpToken,
    idpId,
    ...authParams,
    ...displayNameMaybe,
    ...extendedDataMaybe,
    ...(Object.keys(publicData).length > 0 ? { publicData } : {}),
    ...(isCoachSignup && coachOnboardingPublicData
      ? { coachOnboardingPublicData }
      : {}),
  });
};

/**
 * Reads authentication info persisted in `st-authinfo` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthInfoFromCookies = () => {
  return Cookies.get('st-authinfo')
    ? JSON.parse(Cookies.get('st-authinfo').replace('j:', ''))
    : null;
};

/**
 * Reads authentication error persisted in `st-autherror` cookie.
 *
 * @returns {Object | null}
 */
export const getAuthErrorFromCookies = () => {
  return Cookies.get('st-autherror')
    ? JSON.parse(Cookies.get('st-autherror').replace('j:', ''))
    : null;
};
