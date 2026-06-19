import React, { useCallback } from 'react';
import { Form as FinalForm, FormSpy } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import classNames from 'classnames';
import { useHistory, useLocation } from 'react-router-dom';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';

import { Form, PrimaryButton, FieldTextInput, CustomExtendedDataField } from '../../../components';

import FieldSelectUserType from '../FieldSelectUserType';
import SignupPathSelector from '../SignupPathSelector/SignupPathSelector';
import UserFieldPhoneNumber from '../UserFieldPhoneNumber';

import {
  clearCoachOnboardingIntent,
  COACH_ONBOARDING_QUERY_PARAM,
  getCustomerUserTypeForCoachSignup,
  isCoachOnboardingReturn,
} from '../../../util/coachOnboarding';
import {
  getSignupPathOptions,
  resolveSelectedSignupPath,
  shouldUseSignupPathSelector,
} from '../../../util/signupPaths';

import css from './SignupForm.module.css';

const getSoleUserTypeMaybe = userTypes =>
  Array.isArray(userTypes) && userTypes.length === 1 ? userTypes[0].userType : null;

const isPasswordUsedMoreThanOnce = formValues => {
  const pw = formValues.password;
  const hasPasswordString = pw != null && pw.length >= validators.PASSWORD_MIN_LENGTH;

  if (hasPasswordString) {
    const isPasswordRepeated = Object.values(formValues).filter(v => v === pw).length > 1;
    return isPasswordRepeated;
  }
  return false;
};

const SignupFormComponent = props => (
  <FinalForm
    {...props}
    mutators={{ ...arrayMutators }}
    initialValues={{
      userType:
        props.preselectedUserType ||
        getCustomerUserTypeForCoachSignup(props.userTypes) ||
        getSoleUserTypeMaybe(props.userTypes),
    }}
    render={formRenderProps => {
      const {
        rootClassName,
        className,
        formId,
        handleSubmit,
        inProgress,
        invalid,
        intl,
        termsAndConditions,
        preselectedUserType,
        userTypes,
        userFields,
        values,
        form,
        showSignupPathSelector,
        pathSelectorUserTypes,
        coachSignupTo,
        onUserTypeChange,
        isCoachOnboardingActive,
        onClearCoachOnboarding,
      } = formRenderProps;

      const { userType } = values || {};
      const typesForPathCards = pathSelectorUserTypes || userTypes;
      const usePathSelector = shouldUseSignupPathSelector({
        showSignupPathSelector,
        userTypes: typesForPathCards,
      });
      const { customerUserType, teamUserType } = getSignupPathOptions(typesForPathCards);

      // email
      const emailRequired = validators.required(
        intl.formatMessage({
          id: 'SignupForm.emailRequired',
        })
      );
      const emailValid = validators.emailFormatValid(
        intl.formatMessage({
          id: 'SignupForm.emailInvalid',
        })
      );

      // password
      const passwordRequiredMessage = intl.formatMessage({
        id: 'SignupForm.passwordRequired',
      });
      const passwordMinLengthMessage = intl.formatMessage(
        {
          id: 'SignupForm.passwordTooShort',
        },
        {
          minLength: validators.PASSWORD_MIN_LENGTH,
        }
      );
      const passwordMaxLengthMessage = intl.formatMessage(
        {
          id: 'SignupForm.passwordTooLong',
        },
        {
          maxLength: validators.PASSWORD_MAX_LENGTH,
        }
      );
      const passwordMinLength = validators.minLength(
        passwordMinLengthMessage,
        validators.PASSWORD_MIN_LENGTH
      );
      const passwordMaxLength = validators.maxLength(
        passwordMaxLengthMessage,
        validators.PASSWORD_MAX_LENGTH
      );
      const passwordRequired = validators.requiredStringNoTrim(passwordRequiredMessage);
      const passwordValidators = validators.composeValidators(
        passwordRequired,
        passwordMinLength,
        passwordMaxLength
      );

      // Custom user fields. Since user types are not supported here,
      // only fields with no user type id limitation are selected.
      const userFieldProps = getPropsForCustomUserFieldInputs(userFields, userType);

      const noUserTypes = !userType && !(userTypes?.length > 0);
      const userTypeConfig = userTypes.find(config => config.userType === userType);
      const showDefaultUserFields = userType || noUserTypes;
      const showCustomUserFields = (userType || noUserTypes) && userFieldProps?.length > 0;

      const classes = classNames(rootClassName || css.root, className);
      const submitInProgress = inProgress;
      const submitDisabled = invalid || submitInProgress || isPasswordUsedMoreThanOnce(values);

      const handlePathSelect = nextType => {
        const isCustomerPath = Boolean(customerUserType && nextType === customerUserType);
        const isTeamPath = Boolean(teamUserType && nextType === teamUserType);
        if ((isCustomerPath || isTeamPath) && typeof onClearCoachOnboarding === 'function') {
          onClearCoachOnboarding();
        }
        form.change('userType', nextType);
        if (typeof onUserTypeChange === 'function') {
          onUserTypeChange(nextType);
        }
      };

      const formBody = (
        <>
          <FieldSelectUserType
            name="userType"
            userTypes={userTypes}
            hasExistingUserType={!!preselectedUserType || usePathSelector}
            intl={intl}
          />

          {showDefaultUserFields ? (
            <div className={css.defaultUserFields}>
              <FieldTextInput
                type="email"
                id={formId ? `${formId}.email` : 'email'}
                name="email"
                autoComplete="email"
                label={intl.formatMessage({
                  id: 'SignupForm.emailLabel',
                })}
                placeholder={intl.formatMessage({
                  id: 'SignupForm.emailPlaceholder',
                })}
                validate={validators.composeValidators(emailRequired, emailValid)}
              />
              <div className={css.name}>
                <FieldTextInput
                  className={css.firstNameRoot}
                  type="text"
                  id={formId ? `${formId}.fname` : 'fname'}
                  name="fname"
                  autoComplete="given-name"
                  label={intl.formatMessage({
                    id: 'SignupForm.firstNameLabel',
                  })}
                  placeholder={intl.formatMessage({
                    id: 'SignupForm.firstNamePlaceholder',
                  })}
                  validate={validators.required(
                    intl.formatMessage({
                      id: 'SignupForm.firstNameRequired',
                    })
                  )}
                />
                <FieldTextInput
                  className={css.lastNameRoot}
                  type="text"
                  id={formId ? `${formId}.lname` : 'lname'}
                  name="lname"
                  autoComplete="family-name"
                  label={intl.formatMessage({
                    id: 'SignupForm.lastNameLabel',
                  })}
                  placeholder={intl.formatMessage({
                    id: 'SignupForm.lastNamePlaceholder',
                  })}
                  validate={validators.required(
                    intl.formatMessage({
                      id: 'SignupForm.lastNameRequired',
                    })
                  )}
                />
              </div>

              <FieldTextInput
                className={css.password}
                type="password"
                id={formId ? `${formId}.password` : 'password'}
                name="password"
                autoComplete="new-password"
                label={intl.formatMessage({
                  id: 'SignupForm.passwordLabel',
                })}
                placeholder={intl.formatMessage({
                  id: 'SignupForm.passwordPlaceholder',
                })}
                validate={passwordValidators}
              />

              <UserFieldPhoneNumber
                formName="SignupForm"
                className={css.row}
                userTypeConfig={userTypeConfig}
                intl={intl}
              />
            </div>
          ) : null}

          {showCustomUserFields ? (
            <div className={css.customFields}>
              {userFieldProps.map(({ key, ...fieldProps }) => (
                <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
              ))}
            </div>
          ) : null}

          <div className={css.bottomWrapper}>
            {termsAndConditions}
            {isPasswordUsedMoreThanOnce(values) ? (
              <div className={css.error}>
                <FormattedMessage id="SignupForm.passwordRepeatedOnOtherFields" />
              </div>
            ) : null}
            <PrimaryButton type="submit" inProgress={submitInProgress} disabled={submitDisabled}>
              <FormattedMessage id="SignupForm.signUp" />
            </PrimaryButton>
          </div>
        </>
      );

      return (
        <Form className={classes} onSubmit={handleSubmit}>
          {usePathSelector ? (
            <div className={css.signupSplit}>
              <aside className={css.signupSplitPaths} aria-label="Join PeakUp">
                <FormSpy subscription={{ values: true }}>
                  {({ values: formValues }) => (
                    <SignupPathSelector
                      splitLayout
                      userTypes={typesForPathCards}
                      selectedSignupPath={resolveSelectedSignupPath({
                        userType: formValues?.userType ?? userType,
                        isCoachOnboardingActive,
                        userTypes: typesForPathCards,
                      })}
                      onSelectUserType={handlePathSelect}
                      coachSignupTo={coachSignupTo}
                    />
                  )}
                </FormSpy>
              </aside>
              <div className={css.signupSplitForm}>{formBody}</div>
            </div>
          ) : (
            formBody
          )}
        </Form>
      );
    }}
  />
);

/**
 * A component that renders the signup form.
 *
 * @component
 * @param {Object} props
 * @param {string} props.rootClassName - The root class name that overrides the default class css.root
 * @param {string} props.className - The class that extends the root class
 * @param {string} props.formId - The form id
 * @param {boolean} props.inProgress - Whether the form is in progress
 * @param {ReactNode} props.termsAndConditions - The terms and conditions
 * @param {string} props.preselectedUserType - The preselected user type
 * @param {propTypes.userTypes} props.userTypes - The user types
 * @param {propTypes.listingFields} props.userFields - The user fields
 * @param {boolean} [props.showSignupPathSelector] - Show 3-card PeakUp path selector
 * @param {propTypes.userTypes} [props.pathSelectorUserTypes] - Full user types for path cards (incl. team)
 * @param {Object} [props.coachSignupTo] - NamedLink `to` for coach path card
 * @param {(userType: string) => void} [props.onUserTypeChange] - Sync selected type to parent (e.g. SSO)
 * @param {boolean} [props.isCoachOnboardingActive] - Professional/coach onboarding path is active
 * @returns {JSX.Element}
 */
const SignupForm = props => {
  const intl = useIntl();
  const history = useHistory();
  const location = useLocation();

  const onClearCoachOnboarding = useCallback(() => {
    clearCoachOnboardingIntent();
    const params = new URLSearchParams(String(location.search || '').replace(/^\?/, ''));
    const hadCoachQuery = params.has(COACH_ONBOARDING_QUERY_PARAM);
    if (hadCoachQuery) {
      params.delete(COACH_ONBOARDING_QUERY_PARAM);
    }
    const fromIsCoachReturn =
      location.state?.from && isCoachOnboardingReturn(location.state.from);
    if (!hadCoachQuery && !fromIsCoachReturn) {
      return;
    }
    history.replace({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
      state: fromIsCoachReturn ? undefined : location.state,
    });
  }, [history, location]);

  return (
    <SignupFormComponent
      {...props}
      intl={intl}
      onClearCoachOnboarding={onClearCoachOnboarding}
    />
  );
};

export default SignupForm;
