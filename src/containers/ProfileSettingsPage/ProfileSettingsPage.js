import React from 'react';
import classNames from 'classnames';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { PROFILE_PAGE_PENDING_APPROVAL_VARIANT } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import {
  getCurrentUserTypeRoles,
  initialValuesForUserFields,
  isUserAuthorized,
  pickUserFieldsData,
  showCreateListingLinkForUser,
} from '../../util/userHelpers';
import {
  coachMapLocationFromPublicData,
  publicDataPatchFromCoachMapLocation,
} from '../../util/coachMapLocationForm';
import {
  preferredMeetingPointsFromPublicData,
  publicDataPatchFromPreferredMeetingPoints,
} from '../../util/preferredMeetingPoints';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import { H3, Page, UserNav, NamedLink, LayoutSingleColumn } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import ProfileSettingsForm from './ProfileSettingsForm/ProfileSettingsForm';

import { updateProfile, uploadImage } from './ProfileSettingsPage.duck';
import css from './ProfileSettingsPage.module.css';

const onImageUploadHandler = (values, fn) => {
  const { id, imageId, file } = values;
  if (file) {
    fn({ id, imageId, file });
  }
};

const ViewProfileLink = props => {
  const { userUUID, isUnauthorizedUser } = props;
  return userUUID && isUnauthorizedUser ? (
    <NamedLink
      className={css.profileLink}
      name="ProfilePageVariant"
      params={{ id: userUUID, variant: PROFILE_PAGE_PENDING_APPROVAL_VARIANT }}
    >
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : userUUID ? (
    <NamedLink className={css.profileLink} name="ProfilePage" params={{ id: userUUID }}>
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : null;
};

/**
 * ProfileSettingsPage
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.image - The image
 * @param {string} props.image.id - The image id
 * @param {propTypes.uuid} props.image.imageId - The image id
 * @param {File} props.image.file - The image file
 * @param {propTypes.image} props.image.uploadedImage - The uploaded image
 * @param {Function} props.onImageUpload - The image upload function
 * @param {Function} props.onUpdateProfile - The update profile function
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} props.updateProfileError - The update profile error
 * @param {propTypes.error} props.uploadImageError - The upload image error
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @returns {JSX.Element}
 */
export const ProfileSettingsPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    image,
    onImageUpload,
    onUpdateProfile,
    scrollingDisabled,
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  } = props;

  const { userFields, userTypes = [] } = config.user;
  const publicUserFields = userFields.filter(uf => uf.scope === 'public');

  const handleSubmit = (values, userType) => {
    const {
      firstName,
      lastName,
      displayName,
      bio: rawBio,
      pub_coachMapLocation,
      preferredMeetingPoints,
      teachingHoursStart,
      teachingHoursEnd,
      ...rest
    } = values;

    const displayNameMaybe = displayName
      ? { displayName: displayName.trim() }
      : { displayName: null };

    // Ensure that the optional bio is a string
    const bio = rawBio || '';

    const coachLocationPatch = publicDataPatchFromCoachMapLocation(pub_coachMapLocation);
    const meetingPointsPatch =
      publicDataPatchFromPreferredMeetingPoints(preferredMeetingPoints);

    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...displayNameMaybe,
      bio,
      /* coachCityText from form overwrites address derived from map; lat/lng/location come from map patch */
      publicData: {
        ...publicData,
        ...coachLocationPatch,
        ...meetingPointsPatch,
        ...(teachingHoursStart ? { teachingHoursStart } : { teachingHoursStart: null }),
        ...(teachingHoursEnd ? { teachingHoursEnd } : { teachingHoursEnd: null }),
        ...pickUserFieldsData(rest, 'public', userType, userFields),
      },
    };
    const uploadedImage = props.image;

    // Update profileImage only if file system has been accessed
    const updatedValues =
      uploadedImage && uploadedImage.imageId && uploadedImage.file
        ? { ...profile, profileImageId: uploadedImage.imageId }
        : profile;

    onUpdateProfile(updatedValues);
  };

  const user = ensureCurrentUser(currentUser);
  const { firstName, lastName, displayName, bio, publicData } = user?.attributes.profile;
  // I.e. the status is active, not pending-approval or banned
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);

  const { userType } = publicData || {};
  const profileImageId = user.profileImage ? user.profileImage.id : null;
  const profileImage = image || { imageId: profileImageId };
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const { provider: isCoachUser } = getCurrentUserTypeRoles(config, currentUser);
  const isDisplayNameIncluded = userTypeConfig?.defaultUserFields?.displayName !== false;
  // ProfileSettingsForm decides if it's allowed to show the input field.
  const displayNameMaybe = isDisplayNameIncluded && displayName ? { displayName } : {};

  const profileSettingsForm = user.id ? (
    <ProfileSettingsForm
      className={css.form}
      currentUser={currentUser}
      initialValues={{
        firstName,
        lastName,
        ...displayNameMaybe,
        bio,
        profileImage: user.profileImage,
        pub_coachMapLocation: coachMapLocationFromPublicData(publicData),
        preferredMeetingPoints: preferredMeetingPointsFromPublicData(publicData),
        teachingHoursStart: publicData?.teachingHoursStart || '',
        teachingHoursEnd: publicData?.teachingHoursEnd || '',
        ...initialValuesForUserFields(publicData, 'public', userType, userFields),
      }}
      profileImage={profileImage}
      onImageUpload={e => onImageUploadHandler(e, onImageUpload)}
      uploadInProgress={uploadInProgress}
      updateInProgress={updateInProgress}
      uploadImageError={uploadImageError}
      updateProfileError={updateProfileError}
      onSubmit={values => handleSubmit(values, userType)}
      marketplaceName={config.marketplaceName}
      userFields={publicUserFields}
      userTypeConfig={userTypeConfig}
      isCoachUser={isCoachUser}
    />
  ) : null;

  const title = intl.formatMessage({ id: 'ProfileSettingsPage.title' });

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);
  const showCoachCalendarLink = Boolean(isCoachUser);

  return (
    <Page
      className={classNames(css.root, css.peakUpPage)}
      title={title}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn
        mainColumnClassName={css.peakUpMainColumn}
        topbar={
          <>
            <TopbarContainer />
            <UserNav
              currentPage="ProfileSettingsPage"
              showManageListingsLink={showManageListingsLink}
              showCoachCalendarLink={showCoachCalendarLink}
            />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <header className={css.pageHeader}>
            <div className={css.pageHeaderText}>
              <p className={css.pageLabel}>
                <FormattedMessage
                  id={
                    isCoachUser
                      ? 'ProfileSettingsPage.pageLabel'
                      : 'ProfileSettingsPage.pageLabelCustomer'
                  }
                />
              </p>
              <H3 as="h1" className={css.heading}>
                <FormattedMessage id="ProfileSettingsPage.heading" />
              </H3>
              <p className={css.pageSubtitle}>
                <FormattedMessage
                  id={
                    isCoachUser
                      ? 'ProfileSettingsPage.pageSubtitle'
                      : 'ProfileSettingsPage.pageSubtitleCustomer'
                  }
                />
              </p>
            </div>
            <div className={css.pageHeaderAside}>
              <ViewProfileLink userUUID={user?.id?.uuid} isUnauthorizedUser={isUnauthorizedUser} />
            </div>
          </header>
          {profileSettingsForm}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    image,
    uploadImageError,
    uploadInProgress,
    updateInProgress,
    updateProfileError,
  } = state.ProfileSettingsPage;
  return {
    currentUser,
    image,
    scrollingDisabled: isScrollingDisabled(state),
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onImageUpload: data => dispatch(uploadImage(data)),
  onUpdateProfile: data => dispatch(updateProfile(data)),
});

const ProfileSettingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ProfileSettingsPageComponent);

export default ProfileSettingsPage;
