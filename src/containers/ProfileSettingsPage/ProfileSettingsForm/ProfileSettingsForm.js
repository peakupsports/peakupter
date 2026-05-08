import React, { Component } from 'react';
import { compose } from 'redux';
import { Field, Form as FinalForm } from 'react-final-form';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';
import arrayMutators from 'final-form-arrays';

import { FormattedMessage, injectIntl, intlShape } from '../../../util/reactIntl';
import { ensureCurrentUser } from '../../../util/data';
import { propTypes } from '../../../util/types';
import * as validators from '../../../util/validators';
import { isUploadImageOverLimitError } from '../../../util/errors';
import { addScopePrefix, getPropsForCustomUserFieldInputs } from '../../../util/userHelpers';
import { PEAK_UP_COACH_PROFILE_KEYS } from '../../../config/configPeakUpCoachUserFields';

import {
  Form,
  Avatar,
  Button,
  ImageFromFile,
  IconSpinner,
  FieldTextInput,
  H4,
  CustomExtendedDataField,
} from '../../../components';

import css from './ProfileSettingsForm.module.css';

import FieldCoachMapLocation from './FieldCoachMapLocation';

/* userFieldProps use namespaced keys (e.g. pub_sports); raw keys alone never match */
const PEAK_UP_PROFILE_FIELD_KEYS = new Set(
  PEAK_UP_COACH_PROFILE_KEYS.map(k => addScopePrefix('public', k))
);

const PUB_SPORTS_KEY = addScopePrefix('public', 'sports');
const PUB_LANGUAGES_KEY = addScopePrefix('public', 'languages');
// NOTE: `peakupCoachBadges` is no longer rendered as a form field. Founder /
// Ambassador are admin-only via Console; Top coach / Certified coach are
// auto-derived from coach experience. The constant is kept in a Set used to
// hide the field even if the hosted Console user-fields asset still includes it.
const PUB_PEAK_BADGES_KEY = addScopePrefix('public', 'peakupCoachBadges');
const PUB_CURRENCY_KEY = addScopePrefix('public', 'currency');
const PUB_PRICE_FROM_KEY = addScopePrefix('public', 'priceFrom');

const PEAK_ROW_SPORTS_LANG_KEYS = new Set([PUB_SPORTS_KEY, PUB_LANGUAGES_KEY]);
// Hidden / hard-removed keys: never rendered as user-editable form fields.
const PEAK_HIDDEN_FIELD_KEYS = new Set([PUB_PEAK_BADGES_KEY]);
const PEAK_ROW_PRICING_KEYS = new Set([PUB_CURRENCY_KEY, PUB_PRICE_FROM_KEY]);

/** Sport left, languages right (Console user-field order can list languages first). */
const PEAK_SPORTS_LANG_COLUMN_ORDER = [PUB_SPORTS_KEY, PUB_LANGUAGES_KEY];

/** Price before currency (config order is currency → priceFrom). */
const PEAK_PRICING_DISPLAY_ORDER = [PUB_PRICE_FROM_KEY, PUB_CURRENCY_KEY];

/** Console user fields (public) — same row under display name */
const PUB_EXPERIENCE_KEY = addScopePrefix('public', 'experience');
const PUB_COUNTRY_KEY = addScopePrefix('public', 'country');

const ACCEPT_IMAGES = 'image/*';
const UPLOAD_CHANGE_DELAY = 2000; // Show spinner so that browser has time to load img srcset

const DisplayNameMaybe = props => {
  const { userTypeConfig, intl, embeddedInProfileHero } = props;

  const isDisabled = userTypeConfig?.defaultUserFields?.displayName === false;
  if (isDisabled) {
    return null;
  }

  const { required } = userTypeConfig?.displayNameSettings || {};
  const isRequired = required === true;

  const validateMaybe = isRequired
    ? {
        validate: validators.required(
          intl.formatMessage({
            id: 'ProfileSettingsForm.displayNameRequired',
          })
        ),
      }
    : {};

  const wrapClass = embeddedInProfileHero ? css.displayNameInHero : css.sectionContainer;

  return (
    <div className={wrapClass}>
      {!embeddedInProfileHero ? (
        <H4 as="h2" className={css.sectionTitle}>
          <FormattedMessage id="ProfileSettingsForm.displayNameHeading" />
        </H4>
      ) : null}
      <FieldTextInput
        className={css.row}
        type="text"
        id="displayName"
        name="displayName"
        label={intl.formatMessage({
          id: embeddedInProfileHero
            ? 'ProfileSettingsForm.displayNameHeading'
            : 'ProfileSettingsForm.displayNameLabel',
        })}
        placeholder={intl.formatMessage({
          id: 'ProfileSettingsForm.displayNamePlaceholder',
        })}
        {...validateMaybe}
      />
    </div>
  );
};

/**
 * ProfileSettingsForm
 * TODO: change to functional component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.formId] - The form id
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.userTypeConfig - The user type config
 * @param {string} props.userTypeConfig.userType - The user type
 * @param {Array<Object>} props.userFields - The user fields
 * @param {Object} [props.profileImage] - The profile image
 * @param {string} props.marketplaceName - The marketplace name
 * @param {Function} props.onImageUpload - The function to handle image upload
 * @param {Function} props.onSubmit - The function to handle form submission
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @param {propTypes.error} [props.uploadImageError] - The upload image error
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} [props.updateProfileError] - The update profile error
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
class ProfileSettingsFormComponent extends Component {
  constructor(props) {
    super(props);

    this.uploadDelayTimeoutId = null;
    this.state = { uploadDelay: false };
    this.submittedValues = {};
  }

  componentDidUpdate(prevProps) {
    // Upload delay is additional time window where Avatar is added to the DOM,
    // but not yet visible (time to load image URL from srcset)
    if (prevProps.uploadInProgress && !this.props.uploadInProgress) {
      this.setState({ uploadDelay: true });
      this.uploadDelayTimeoutId = window.setTimeout(() => {
        this.setState({ uploadDelay: false });
      }, UPLOAD_CHANGE_DELAY);
    }
  }

  componentWillUnmount() {
    window.clearTimeout(this.uploadDelayTimeoutId);
  }

  render() {
    return (
      <FinalForm
        {...this.props}
        mutators={{ ...arrayMutators }}
        render={fieldRenderProps => {
          const {
            className,
            currentUser,
            handleSubmit,
            intl,
            invalid,
            onImageUpload,
            pristine,
            profileImage,
            rootClassName,
            updateInProgress,
            updateProfileError,
            uploadImageError,
            uploadInProgress,
            form,
            formId,
            marketplaceName,
            values,
            userFields,
            userTypeConfig,
          } = fieldRenderProps;

          const user = ensureCurrentUser(currentUser);

          // First name
          const firstNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameLabel',
          });
          const firstNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNamePlaceholder',
          });
          const firstNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.firstNameRequired',
          });
          const firstNameRequired = validators.required(firstNameRequiredMessage);

          // Last name
          const lastNameLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameLabel',
          });
          const lastNamePlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNamePlaceholder',
          });
          const lastNameRequiredMessage = intl.formatMessage({
            id: 'ProfileSettingsForm.lastNameRequired',
          });
          const lastNameRequired = validators.required(lastNameRequiredMessage);

          // Bio
          const bioLabel = intl.formatMessage({
            id: 'ProfileSettingsForm.bioLabel',
          });
          const bioPlaceholder = intl.formatMessage({
            id: 'ProfileSettingsForm.bioPlaceholder',
          });

          const uploadingOverlay =
            uploadInProgress || this.state.uploadDelay ? (
              <div className={css.uploadingImageOverlay}>
                <IconSpinner />
              </div>
            ) : null;

          const hasUploadError = !!uploadImageError && !uploadInProgress;
          const errorClasses = classNames({ [css.avatarUploadError]: hasUploadError });
          const transientUserProfileImage = profileImage.uploadedImage || user.profileImage;
          const transientUser = { ...user, profileImage: transientUserProfileImage };

          // Ensure that file exists if imageFromFile is used
          const fileExists = !!profileImage.file;
          const fileUploadInProgress = uploadInProgress && fileExists;
          const delayAfterUpload = profileImage.imageId && this.state.uploadDelay;
          const imageFromFile =
            fileExists && (fileUploadInProgress || delayAfterUpload) ? (
              <ImageFromFile
                id={profileImage.id}
                className={errorClasses}
                rootClassName={css.uploadingImage}
                aspectWidth={1}
                aspectHeight={1}
                file={profileImage.file}
              >
                {uploadingOverlay}
              </ImageFromFile>
            ) : null;

          // Avatar is rendered in hidden during the upload delay
          // Upload delay smoothes image change process:
          // responsive img has time to load srcset stuff before it is shown to user.
          const avatarClasses = classNames(errorClasses, css.avatar, {
            [css.avatarInvisible]: this.state.uploadDelay,
          });
          const avatarComponent =
            !fileUploadInProgress && profileImage.imageId ? (
              <Avatar
                className={avatarClasses}
                renderSizes="(max-width: 767px) 96px, 240px"
                user={transientUser}
                disableProfileLink
              />
            ) : null;

          const chooseAvatarLabel =
            profileImage.imageId || fileUploadInProgress ? (
              <div className={css.avatarContainer}>
                {imageFromFile}
                {avatarComponent}
                <div className={css.changeAvatar}>
                  <FormattedMessage id="ProfileSettingsForm.changeAvatar" />
                </div>
              </div>
            ) : (
              <div className={css.avatarPlaceholder}>
                <div className={css.avatarPlaceholderText}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePicture" />
                </div>
                <div className={css.avatarPlaceholderTextMobile}>
                  <FormattedMessage id="ProfileSettingsForm.addYourProfilePictureMobile" />
                </div>
              </div>
            );

          const submitError = updateProfileError ? (
            <div className={css.error}>
              <FormattedMessage id="ProfileSettingsForm.updateProfileFailed" />
            </div>
          ) : null;

          const classes = classNames(rootClassName || css.root, className);
          const submitInProgress = updateInProgress;
          const submittedOnce = Object.keys(this.submittedValues).length > 0;
          const pristineSinceLastSubmit = submittedOnce && isEqual(values, this.submittedValues);
          const submitDisabled =
            invalid || pristine || pristineSinceLastSubmit || uploadInProgress || submitInProgress;

          const userFieldProps = getPropsForCustomUserFieldInputs(
            userFields,
            userTypeConfig?.userType,
            false
          );

          // Hard-hide any field listed in `PEAK_HIDDEN_FIELD_KEYS` even when it
          // still arrives from the Console-hosted user-fields asset
          // (Founder / Ambassador must remain admin-only).
          const peakUpFieldProps = userFieldProps.filter(
            p => PEAK_UP_PROFILE_FIELD_KEYS.has(p.key) && !PEAK_HIDDEN_FIELD_KEYS.has(p.key)
          );
          const coachPeakSportsLanguages = peakUpFieldProps
            .filter(p => PEAK_ROW_SPORTS_LANG_KEYS.has(p.key))
            .sort(
              (a, b) =>
                PEAK_SPORTS_LANG_COLUMN_ORDER.indexOf(a.key) -
                PEAK_SPORTS_LANG_COLUMN_ORDER.indexOf(b.key)
            );
          const coachPeakPricing = peakUpFieldProps
            .filter(p => PEAK_ROW_PRICING_KEYS.has(p.key))
            .sort(
              (a, b) =>
                PEAK_PRICING_DISPLAY_ORDER.indexOf(a.key) - PEAK_PRICING_DISPLAY_ORDER.indexOf(b.key)
            );
          const coachPeakRemaining = peakUpFieldProps.filter(
            p =>
              !PEAK_ROW_SPORTS_LANG_KEYS.has(p.key) &&
              !PEAK_ROW_PRICING_KEYS.has(p.key)
          );
          const otherUserFieldProps = userFieldProps.filter(
            p => !PEAK_UP_PROFILE_FIELD_KEYS.has(p.key) && !PEAK_HIDDEN_FIELD_KEYS.has(p.key)
          );
          const experienceFieldForHero = otherUserFieldProps.find(
            p => p.key === PUB_EXPERIENCE_KEY
          );
          const countryFieldForHero = otherUserFieldProps.find(p => p.key === PUB_COUNTRY_KEY);
          const otherUserFieldPropsRest = otherUserFieldProps.filter(
            p => p.key !== PUB_EXPERIENCE_KEY && p.key !== PUB_COUNTRY_KEY
          );
          let experienceHeroFieldProps = null;
          if (experienceFieldForHero) {
            const { key, ...rest } = experienceFieldForHero;
            experienceHeroFieldProps = { key, rest };
          }
          let countryHeroFieldProps = null;
          if (countryFieldForHero) {
            const { key, ...rest } = countryFieldForHero;
            countryHeroFieldProps = { key, rest };
          }

          const coachHasSportsAndLanguages =
            coachPeakSportsLanguages.some(p => p.key === PUB_SPORTS_KEY) &&
            coachPeakSportsLanguages.some(p => p.key === PUB_LANGUAGES_KEY);

          return (
            <Form
              className={classes}
              onSubmit={e => {
                this.submittedValues = values;
                handleSubmit(e);
              }}
            >
              <div className={classNames(css.sectionContainer, css.profileHeroSection)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.yourProfilePicture" />
                </H4>
                <div className={css.profilePictureLayout}>
                  <div className={css.profilePictureColLeft}>
                    <Field
                      accept={ACCEPT_IMAGES}
                      id="profileImage"
                      name="profileImage"
                      label={chooseAvatarLabel}
                      type="file"
                      form={null}
                      uploadImageError={uploadImageError}
                      disabled={uploadInProgress}
                    >
                      {fieldProps => {
                        const { accept, id, input, label, disabled, uploadImageError } = fieldProps;
                        const { name, type } = input;
                        const onChange = e => {
                          const file = e.target.files[0];
                          form.change(`profileImage`, file);
                          form.blur(`profileImage`);
                          if (file != null) {
                            const tempId = `${file.name}_${Date.now()}`;
                            onImageUpload({ id: tempId, file });
                          }
                        };

                        let error = null;

                        if (isUploadImageOverLimitError(uploadImageError)) {
                          error = (
                            <div className={css.error}>
                              <FormattedMessage id="ProfileSettingsForm.imageUploadFailedFileTooLarge" />
                            </div>
                          );
                        } else if (uploadImageError) {
                          error = (
                            <div className={css.error}>
                              <FormattedMessage id="ProfileSettingsForm.imageUploadFailed" />
                            </div>
                          );
                        }

                        return (
                          <div className={css.uploadAvatarWrapper}>
                            <label className={css.label} htmlFor={id}>
                              {label}
                            </label>
                            <input
                              accept={accept}
                              id={id}
                              name={name}
                              className={css.uploadAvatarInput}
                              disabled={disabled}
                              onChange={onChange}
                              type={type}
                            />
                            {error}
                          </div>
                        );
                      }}
                    </Field>
                    <div className={css.profilePictureColHelp}>
                      <div className={css.tip}>
                        <FormattedMessage id="ProfileSettingsForm.tip" />
                      </div>
                      <div className={css.fileInfo}>
                        <FormattedMessage id="ProfileSettingsForm.fileInfo" />
                      </div>
                    </div>
                  </div>
                  <div className={css.profilePictureColRight}>
                    <div className={css.nameFieldsInHero}>
                      <H4 as="h2" className={classNames(css.sectionTitle, css.subsectionTitle)}>
                        <FormattedMessage id="ProfileSettingsForm.yourName" />
                      </H4>
                      <div className={css.nameContainer}>
                        <FieldTextInput
                          className={css.firstName}
                          type="text"
                          id="firstName"
                          name="firstName"
                          label={firstNameLabel}
                          placeholder={firstNamePlaceholder}
                          validate={firstNameRequired}
                        />
                        <FieldTextInput
                          className={css.lastName}
                          type="text"
                          id="lastName"
                          name="lastName"
                          label={lastNameLabel}
                          placeholder={lastNamePlaceholder}
                          validate={lastNameRequired}
                        />
                      </div>
                    </div>
                    <DisplayNameMaybe
                      embeddedInProfileHero
                      userTypeConfig={userTypeConfig}
                      intl={intl}
                    />
                    {countryHeroFieldProps || experienceHeroFieldProps ? (
                      <div className={css.profileHeroMetaRow}>
                        {countryHeroFieldProps ? (
                          <div className={css.profileHeroMetaCol}>
                            <CustomExtendedDataField
                              key={countryHeroFieldProps.key}
                              {...countryHeroFieldProps.rest}
                              formId={formId}
                            />
                          </div>
                        ) : null}
                        {experienceHeroFieldProps ? (
                          <div className={css.profileHeroMetaCol}>
                            <CustomExtendedDataField
                              key={experienceHeroFieldProps.key}
                              {...experienceHeroFieldProps.rest}
                              formId={formId}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={css.sectionContainer}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.bioHeading" />
                </H4>
                <FieldTextInput
                  type="textarea"
                  id="bio"
                  name="bio"
                  label={bioLabel}
                  placeholder={bioPlaceholder}
                />
                <p className={css.extraInfo}>
                  <FormattedMessage id="ProfileSettingsForm.bioInfo" values={{ marketplaceName }} />
                </p>
              </div>
              {otherUserFieldPropsRest.length > 0 ? (
                <div className={css.sectionContainer}>
                  {otherUserFieldPropsRest.map(({ key, ...fieldProps }) => (
                    <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                  ))}
                </div>
              ) : null}

              {coachPeakSportsLanguages.length > 0 ? (
                <div className={classNames(css.sectionContainer, css.coachSportsLangSection)}>
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.sportsAndLanguagesHeading" />
                  </H4>
                  <div
                    className={
                      coachHasSportsAndLanguages ? css.coachSportsLangPair : css.coachRowTwoCol
                    }
                  >
                    {coachPeakSportsLanguages.map(({ key, ...fieldProps }) => (
                      <div key={key} className={css.coachSportsLangPairCol}>
                        <CustomExtendedDataField
                          {...fieldProps}
                          formId={formId}
                          checkboxTwoColumns={key === PUB_SPORTS_KEY && coachHasSportsAndLanguages}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Coach badges section removed: Founder / Ambassador are admin-only,
                  Top coach / Certified coach are auto-derived from experience. */}

              {coachPeakPricing.length > 0 ? (
                <div className={css.sectionContainer}>
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.coachSessionPriceHeading" />
                  </H4>
                  <p className={css.extraInfo}>
                    <FormattedMessage id="ProfileSettingsForm.coachSessionPriceInfo" />
                  </p>
                  <div className={css.coachRowTwoCol}>
                    {coachPeakPricing.map(({ key, ...fieldProps }) => (
                      <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={classNames(css.sectionContainer, css.lastSection)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage id="ProfileSettingsForm.coachLocationHeading" />
                </H4>
                <p className={css.extraInfo}>
                  {coachPeakPricing.length > 0 ? (
                    <FormattedMessage id="ProfileSettingsForm.coachLocationSectionInfo" />
                  ) : (
                    <FormattedMessage id="ProfileSettingsForm.coachLocationOnlyInfo" />
                  )}
                </p>
                {coachPeakRemaining.map(({ key, ...fieldProps }) => (
                  <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                ))}
                <FieldCoachMapLocation formId={formId} />
              </div>
              {submitError}
              <Button
                className={css.submitButton}
                type="submit"
                inProgress={submitInProgress}
                disabled={submitDisabled}
                ready={pristineSinceLastSubmit}
              >
                <FormattedMessage id="ProfileSettingsForm.saveChanges" />
              </Button>
            </Form>
          );
        }}
      />
    );
  }
}

const ProfileSettingsForm = compose(injectIntl)(ProfileSettingsFormComponent);

ProfileSettingsForm.displayName = 'ProfileSettingsForm';

export default ProfileSettingsForm;
