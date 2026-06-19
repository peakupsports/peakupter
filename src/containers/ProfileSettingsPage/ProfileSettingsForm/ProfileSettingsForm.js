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
import { PEAK_UP_TEAM_PROFILE_KEYS } from '../../../config/configPeakUpTeamUserFields';

import {
  Form,
  Avatar,
  Button,
  ImageFromFile,
  IconSpinner,
  FieldTextInput,
  FieldSelect,
  H4,
  CustomExtendedDataField,
} from '../../../components';

import css from './ProfileSettingsForm.module.css';

import FieldCoachMapLocation from './FieldCoachMapLocation';
import FieldTeamMapLocation from './FieldTeamMapLocation';
import FieldTeamSinceYear from './FieldTeamSinceYear';
import { FieldTeamPrimarySport, FieldTeamSecondarySport } from './FieldTeamIdentitySport';
import FieldCoachPrimarySport from './FieldCoachPrimarySport';
import CoachSportsManualSync from './CoachSportsManualSync';
import FieldPreferredMeetingPoints from './FieldPreferredMeetingPoints';
import ViewProfileLink from '../ViewProfileLink';
import TeamCoachesSection from './TeamCoachesSection';
import TeamInviteBanner from './TeamInviteBanner';

/* userFieldProps use namespaced keys (e.g. pub_sports); raw keys alone never match */
const PEAK_UP_PROFILE_FIELD_KEYS = new Set(
  PEAK_UP_COACH_PROFILE_KEYS.map(k => addScopePrefix('public', k))
);

const PEAK_TEAM_PROFILE_FIELD_KEYS = new Set(
  PEAK_UP_TEAM_PROFILE_KEYS.map(k => addScopePrefix('public', k))
);

const PUB_TEAM_FOUNDED_KEY = addScopePrefix('public', 'teamFoundedYear');
const PUB_TEAM_CITY_KEY = addScopePrefix('public', 'teamCityText');
const PUB_TEAM_TAGLINE_KEY = addScopePrefix('public', 'teamTagline');
const PUB_TEAM_WEBSITE_KEY = addScopePrefix('public', 'teamWebsite');
const PUB_TEAM_INSTAGRAM_KEY = addScopePrefix('public', 'teamInstagram');
const PUB_TEAM_COACH_COUNT_KEY = addScopePrefix('public', 'teamCoachCount');

const TEAM_DETAILS_FIELD_ORDER = [
  PUB_TEAM_TAGLINE_KEY,
  PUB_TEAM_WEBSITE_KEY,
  PUB_TEAM_INSTAGRAM_KEY,
];

const mergeTeamFieldConfigLabels = (fieldProps, intl) => {
  const labelIdByKey = {
    [PUB_TEAM_CITY_KEY]: 'ProfileSettingsForm.teamLocationLabel',
    [PUB_TEAM_TAGLINE_KEY]: 'ProfileSettingsForm.teamTaglineLabel',
    [PUB_TEAM_WEBSITE_KEY]: 'ProfileSettingsForm.teamWebsiteLabel',
    [PUB_TEAM_INSTAGRAM_KEY]: 'ProfileSettingsForm.teamInstagramLabel',
    [PUB_TEAM_COACH_COUNT_KEY]: 'ProfileSettingsForm.teamCoachCountLabel',
  };
  const labelId = labelIdByKey[fieldProps.key];
  if (!labelId || !fieldProps.fieldConfig) {
    return fieldProps;
  }
  return {
    ...fieldProps,
    fieldConfig: {
      ...fieldProps.fieldConfig,
      saveConfig: {
        ...fieldProps.fieldConfig.saveConfig,
        label: intl.formatMessage({ id: labelId }),
      },
    },
  };
};

const PUB_SPORTS_KEY = addScopePrefix('public', 'sports');
const PUB_LANGUAGES_KEY = addScopePrefix('public', 'languages');
// NOTE: `peakupCoachBadges` is no longer rendered as a form field. Founder /
// Ambassador are admin-only via Console; Top coach / Certified coach are
// auto-derived from coach experience. The constant is kept in a Set used to
// hide the field even if the hosted Console user-fields asset still includes it.
const PUB_PEAK_BADGES_KEY = addScopePrefix('public', 'peakupCoachBadges');
// NOTE: Coach hourly price now comes from the hourly booking listing only.
// These legacy profile fields are intentionally hidden (and should be removed
// from hosted user-fields config over time).
const PUB_CURRENCY_KEY = addScopePrefix('public', 'currency');
const PUB_PRICE_FROM_KEY = addScopePrefix('public', 'priceFrom');
// `coachCityText` is no longer a separate form field. It is now derived
// automatically from the single Mapbox autocomplete ("Where do you
// coach?") via `publicDataPatchFromCoachMapLocation` and stored in
// publicData only as a back-compat mirror of the short label. Hide it
// from the rendered form so coaches see ONE location field.
const PUB_COACH_CITY_TEXT_KEY = addScopePrefix('public', 'coachCityText');

const TEACHING_HOURS_START_DEFAULT = '09:00';
const TEACHING_HOURS_END_DEFAULT = '19:00';

const buildHourOptions = () =>
  Array.from({ length: 24 }, (_, hour) => {
    const hh = String(hour).padStart(2, '0');
    return { key: `${hh}:00`, label: `${hh}:00` };
  });

const HOUR_OPTIONS = buildHourOptions();

const PEAK_ROW_SPORTS_LANG_KEYS = new Set([PUB_SPORTS_KEY, PUB_LANGUAGES_KEY]);
// Hidden / hard-removed keys: never rendered as user-editable form fields.
const PEAK_HIDDEN_FIELD_KEYS = new Set([
  PUB_PEAK_BADGES_KEY,
  PUB_COACH_CITY_TEXT_KEY,
  PUB_CURRENCY_KEY,
  PUB_PRICE_FROM_KEY,
]);
const PEAK_ROW_PRICING_KEYS = new Set([PUB_CURRENCY_KEY, PUB_PRICE_FROM_KEY]);
/** Coach-only PeakUp public fields — hidden on client (customer) profile settings. */
const PEAK_COACH_ONLY_FIELD_KEYS = new Set([
  PUB_SPORTS_KEY,
  PUB_CURRENCY_KEY,
  PUB_PRICE_FROM_KEY,
  addScopePrefix('public', 'coachTravelNearby'),
]);

/** Sport left, languages right (Console user-field order can list languages first). */
const PEAK_SPORTS_LANG_COLUMN_ORDER = [PUB_SPORTS_KEY, PUB_LANGUAGES_KEY];

/** Price before currency (config order is currency → priceFrom). */
const PEAK_PRICING_DISPLAY_ORDER = [PUB_PRICE_FROM_KEY, PUB_CURRENCY_KEY];

/** Console user fields (public) — same row under display name */
const PUB_EXPERIENCE_KEY = addScopePrefix('public', 'experience');
const PUB_COUNTRY_KEY = addScopePrefix('public', 'country');

/** Team accounts: hide duplicate or HQ-only keys from the settings form. */
const TEAM_FORM_HIDDEN_FIELD_KEYS = new Set([
  addScopePrefix('public', 'teamSports'),
  addScopePrefix('public', 'teamBio'),
  addScopePrefix('public', 'teamCityText'),
  addScopePrefix('public', 'peakupTeamVisibility'),
  addScopePrefix('public', 'peakupVerifiedTeam'),
  addScopePrefix('public', 'teamApproved'),
  addScopePrefix('public', 'peakupTeamMemberIds'),
  addScopePrefix('public', 'peakupTeamPendingInviteIds'),
  PUB_TEAM_COACH_COUNT_KEY,
  PUB_TEAM_FOUNDED_KEY,
  PUB_LANGUAGES_KEY,
  PUB_EXPERIENCE_KEY,
  PUB_COUNTRY_KEY,
]);

const ACCEPT_IMAGES = 'image/*';
const UPLOAD_CHANGE_DELAY = 2000; // Show spinner so that browser has time to load img srcset

const DisplayNameMaybe = props => {
  const {
    userTypeConfig,
    intl,
    embeddedInProfileHero,
    embeddedInDisplayNameRow = false,
    isTeamUser = false,
  } = props;

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

  const wrapClass = embeddedInDisplayNameRow
    ? css.displayNameInHeroRowCol
    : embeddedInProfileHero
    ? css.displayNameInHero
    : css.sectionContainer;

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
          id: isTeamUser
            ? 'ProfileSettingsForm.teamDisplayNameLabel'
            : embeddedInProfileHero
            ? 'ProfileSettingsForm.displayNameHeading'
            : 'ProfileSettingsForm.displayNameLabel',
        })}
        placeholder={intl.formatMessage({
          id: isTeamUser
            ? 'ProfileSettingsForm.teamDisplayNamePlaceholder'
            : 'ProfileSettingsForm.displayNamePlaceholder',
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
 * @param {boolean} [props.isCoachUser] - Provider-role user: show coach profile fields and copy
 * @param {boolean} [props.isTeamUser] - Team / crew account: minimal crew brand settings
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
            isCoachUser = true,
            isTeamUser = false,
          } = fieldRenderProps;

          const isCoachProfileUser = isCoachUser && !isTeamUser;
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
            id: isTeamUser ? 'ProfileSettingsForm.teamBioLabel' : 'ProfileSettingsForm.bioLabel',
          });
          const bioPlaceholder = intl.formatMessage({
            id: isTeamUser
              ? 'ProfileSettingsForm.teamBioPlaceholder'
              : 'ProfileSettingsForm.bioPlaceholder',
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

          const classes = classNames(rootClassName || css.root, className, css.peakUpForm);
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
          const peakUpFieldProps = userFieldProps.filter(p => {
            if (PEAK_HIDDEN_FIELD_KEYS.has(p.key)) {
              return false;
            }
            if (isTeamUser) {
              return false;
            }
            if (!PEAK_UP_PROFILE_FIELD_KEYS.has(p.key)) {
              return false;
            }
            if (isCoachUser) {
              return true;
            }
            return p.key === PUB_LANGUAGES_KEY || p.key === PUB_SPORTS_KEY;
          });
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
          const coachPeakRemaining = peakUpFieldProps.filter(p => {
            if (PEAK_ROW_SPORTS_LANG_KEYS.has(p.key) || PEAK_ROW_PRICING_KEYS.has(p.key)) {
              return false;
            }
            if (!isCoachProfileUser && PEAK_COACH_ONLY_FIELD_KEYS.has(p.key)) {
              return false;
            }
            return true;
          });
          const otherUserFieldProps = userFieldProps.filter(p => {
            if (PEAK_HIDDEN_FIELD_KEYS.has(p.key)) {
              return false;
            }
            if (PEAK_UP_PROFILE_FIELD_KEYS.has(p.key)) {
              return false;
            }
            if (isTeamUser && PEAK_TEAM_PROFILE_FIELD_KEYS.has(p.key)) {
              return false;
            }
            if (isTeamUser && TEAM_FORM_HIDDEN_FIELD_KEYS.has(p.key)) {
              return false;
            }
            return true;
          });

          const teamFieldProps = isTeamUser
            ? userFieldProps
                .filter(
                  p =>
                    PEAK_TEAM_PROFILE_FIELD_KEYS.has(p.key) &&
                    !TEAM_FORM_HIDDEN_FIELD_KEYS.has(p.key)
                )
                .map(p => mergeTeamFieldConfigLabels(p, intl))
            : [];

          const teamDetailsFields = TEAM_DETAILS_FIELD_ORDER.map(key =>
            teamFieldProps.find(p => p.key === key)
          ).filter(Boolean);

          const experienceFieldForHero = isCoachProfileUser
            ? otherUserFieldProps.find(p => p.key === PUB_EXPERIENCE_KEY)
            : null;
          const countryFieldForHero = isTeamUser
            ? null
            : otherUserFieldProps.find(p => p.key === PUB_COUNTRY_KEY);
          const otherUserFieldPropsRest = otherUserFieldProps.filter(p => {
            if (p.key === PUB_COUNTRY_KEY || p.key === PUB_EXPERIENCE_KEY) {
              return false;
            }
            if (!isCoachProfileUser && PEAK_COACH_ONLY_FIELD_KEYS.has(p.key)) {
              return false;
            }
            return true;
          });
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
              {isCoachProfileUser ? <TeamInviteBanner /> : null}
              <div className={classNames(css.sectionContainer, css.profileHeroSection)}>
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage
                    id={
                      isTeamUser
                        ? 'ProfileSettingsForm.teamProfilePicture'
                        : 'ProfileSettingsForm.yourProfilePicture'
                    }
                  />
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
                      {isTeamUser ? (
                        <p className={css.extraInfo}>
                          <FormattedMessage id="ProfileSettingsForm.teamProfilePictureHelp" />
                        </p>
                      ) : (
                        <>
                          <div className={css.tip}>
                            <FormattedMessage id="ProfileSettingsForm.tip" />
                          </div>
                          <div className={css.fileInfo}>
                            <FormattedMessage id="ProfileSettingsForm.fileInfo" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={css.profilePictureColRight}>
                    {!isTeamUser ? (
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
                    ) : null}
                    {isCoachProfileUser ? (
                      <div className={css.profileHeroDisplayNameRow}>
                        <DisplayNameMaybe
                          embeddedInProfileHero
                          embeddedInDisplayNameRow
                          userTypeConfig={userTypeConfig}
                          intl={intl}
                          isTeamUser={false}
                        />
                        <div className={css.coachPrimarySportHeroCol}>
                          <FieldCoachPrimarySport formId={formId} />
                        </div>
                      </div>
                    ) : (
                      <DisplayNameMaybe
                        embeddedInProfileHero
                        userTypeConfig={userTypeConfig}
                        intl={intl}
                        isTeamUser={isTeamUser}
                      />
                    )}
                    {isTeamUser ? (
                      <div className={css.profileHeroMetaRow}>
                        <div className={css.teamSinceFieldCol}>
                          <FieldTeamSinceYear formId={formId} />
                        </div>
                        <div className={css.teamIdentitySportFieldCol}>
                          <FieldTeamPrimarySport formId={formId} />
                        </div>
                        <div className={css.teamIdentitySportFieldCol}>
                          <FieldTeamSecondarySport formId={formId} />
                        </div>
                      </div>
                    ) : null}
                    {!isTeamUser && (countryHeroFieldProps || experienceHeroFieldProps) ? (
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

              {isTeamUser ? (
                <div className={css.sectionContainer}>
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.teamMapLocationHeading" />
                  </H4>
                  <p className={css.extraInfo}>
                    <FormattedMessage id="ProfileSettingsForm.teamMapLocationInfo" />
                  </p>
                  <FieldTeamMapLocation formId={formId} />
                </div>
              ) : null}

              {isTeamUser ? (
                <div className={css.sectionContainer}>
                  <TeamCoachesSection />
                </div>
              ) : null}

              <div
                className={classNames(css.sectionContainer, {
                  [css.lastSection]:
                    !isCoachUser &&
                    !isTeamUser &&
                    coachPeakSportsLanguages.length === 0 &&
                    otherUserFieldPropsRest.length === 0 &&
                    teamDetailsFields.length === 0,
                })}
              >
                <H4 as="h2" className={css.sectionTitle}>
                  <FormattedMessage
                    id={
                      isTeamUser
                        ? 'ProfileSettingsForm.teamBioHeading'
                        : 'ProfileSettingsForm.bioHeading'
                    }
                  />
                </H4>
                <FieldTextInput
                  type="textarea"
                  id="bio"
                  name="bio"
                  label={bioLabel}
                  placeholder={bioPlaceholder}
                />
                <p className={css.extraInfo}>
                  <FormattedMessage
                    id={
                      isTeamUser
                        ? 'ProfileSettingsForm.teamBioInfo'
                        : isCoachUser
                        ? 'ProfileSettingsForm.bioInfo'
                        : 'ProfileSettingsForm.bioInfoCustomer'
                    }
                    values={{ marketplaceName }}
                  />
                </p>
              </div>
              {isTeamUser && teamDetailsFields.length > 0 ? (
                <div
                  className={classNames(css.sectionContainer, {
                    [css.lastSection]: coachPeakSportsLanguages.length === 0,
                  })}
                >
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.teamDetailsHeading" />
                  </H4>
                  <p className={css.extraInfo}>
                    <FormattedMessage id="ProfileSettingsForm.teamDetailsInfo" />
                  </p>
                  {teamDetailsFields.map(({ key, ...fieldProps }) => (
                    <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                  ))}
                </div>
              ) : null}
              {otherUserFieldPropsRest.length > 0 ? (
                <div className={css.sectionContainer}>
                  {otherUserFieldPropsRest.map(({ key, ...fieldProps }) => (
                    <CustomExtendedDataField key={key} {...fieldProps} formId={formId} />
                  ))}
                </div>
              ) : null}

              {coachPeakSportsLanguages.length > 0 ? (
                <div
                  className={classNames(css.sectionContainer, css.coachSportsLangSection, {
                    [css.lastSection]: !isCoachProfileUser,
                  })}
                >
                  {isCoachProfileUser ? <CoachSportsManualSync /> : null}
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage
                      id={
                        isTeamUser
                          ? 'ProfileSettingsForm.teamSportsHeading'
                          : isCoachUser
                          ? 'ProfileSettingsForm.sportsAndLanguagesHeading'
                          : coachHasSportsAndLanguages
                          ? 'ProfileSettingsForm.clientSportsAndLanguagesHeading'
                          : coachPeakSportsLanguages.some(p => p.key === PUB_SPORTS_KEY)
                          ? 'ProfileSettingsForm.clientFavoriteSportsHeading'
                          : 'ProfileSettingsForm.clientLanguagesHeading'
                      }
                    />
                  </H4>
                  {isTeamUser ? (
                    <p className={css.extraInfo}>
                      <FormattedMessage id="ProfileSettingsForm.teamSportsInfo" />
                    </p>
                  ) : null}
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

              {isCoachProfileUser && coachPeakPricing.length > 0 ? (
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

              {isCoachProfileUser ? (
                <div className={css.sectionContainer}>
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.teachingHoursHeading" />
                  </H4>
                  <p className={css.extraInfo}>
                    <FormattedMessage id="ProfileSettingsForm.teachingHoursInfo" />
                  </p>
                  <div className={css.coachRowTwoCol}>
                    <FieldSelect
                      id="teachingHoursStart"
                      name="teachingHoursStart"
                      label={intl.formatMessage({ id: 'ProfileSettingsForm.teachingHoursStartLabel' })}
                    >
                      <option value="">{TEACHING_HOURS_START_DEFAULT}</option>
                      {HOUR_OPTIONS.map(opt => (
                        <option key={`teach-start-${opt.key}`} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </FieldSelect>
                    <FieldSelect
                      id="teachingHoursEnd"
                      name="teachingHoursEnd"
                      label={intl.formatMessage({ id: 'ProfileSettingsForm.teachingHoursEndLabel' })}
                    >
                      <option value="">{TEACHING_HOURS_END_DEFAULT}</option>
                      {HOUR_OPTIONS.map(opt => (
                        <option key={`teach-end-${opt.key}`} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </FieldSelect>
                  </div>
                </div>
              ) : null}

              {isCoachProfileUser ? (
                <div className={css.sectionContainer}>
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
              ) : null}
              {isCoachProfileUser ? (
                <div className={classNames(css.sectionContainer, css.lastSection)}>
                  <H4 as="h2" className={css.sectionTitle}>
                    <FormattedMessage id="ProfileSettingsForm.preferredMeetingPointsHeading" />
                  </H4>
                  <p className={css.extraInfo}>
                    <FormattedMessage id="ProfileSettingsForm.preferredMeetingPointsInfo" />
                  </p>
                  <FieldPreferredMeetingPoints formId={formId} />
                </div>
              ) : null}
              {submitError}
              <div className={css.formActions}>
                <Button
                  className={css.submitButton}
                  type="submit"
                  inProgress={submitInProgress}
                  disabled={submitDisabled}
                  ready={pristineSinceLastSubmit}
                >
                  <FormattedMessage id="ProfileSettingsForm.saveChanges" />
                </Button>
                <ViewProfileLink
                  userUUID={this.props.profilePreviewUserUUID}
                  isUnauthorizedUser={this.props.profilePreviewUnauthorized}
                />
              </div>
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
