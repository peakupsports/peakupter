import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';

import { FormattedMessage } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import {
  pickPrimaryTierId,
  getTierBadgeLabel,
} from '../../../util/coachTier';
import { Modal, Avatar } from '../../../components';
import InquiryForm from '../../ListingPage/InquiryForm/InquiryForm';

import css from './ContactCoachModal.module.css';

/**
 * PeakUp premium "Contact coach" modal — visual shell around InquiryForm.
 * All inquiry behaviour stays in InquiryForm / ProfilePage handlers.
 */
const ContactCoachModal = props => {
  const {
    id,
    isOpen,
    onClose,
    onManageDisableScrolling,
    focusElementId,
    tierStyle,
    coachDisplayName,
    coachUser,
    tierId: tierIdProp,
    profilePublicData,
    sports = [],
    inquiryFormProps,
  } = props;

  const tierId = tierIdProp ?? pickPrimaryTierId(profilePublicData);
  const tierBadgeLabel = getTierBadgeLabel(tierId);
  const primaryTierBadgeClass = tierId ? css[`tierBadge_${tierId}`] : null;

  return (
    <Modal
      id={id}
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={css.container}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={onManageDisableScrolling}
      focusElementId={focusElementId}
      usePortal
      lightCloseButton
    >
      <div className={css.peakUpShell} style={tierStyle}>
        <header className={css.coachHeader}>
          <div className={css.coachHeaderMain}>
            {coachUser ? (
              <Avatar
                user={coachUser}
                className={css.coachAvatar}
                disableProfileLink
                renderSizes="48px"
              />
            ) : (
              <div className={css.coachAvatarPlaceholder} aria-hidden />
            )}
            <div className={css.coachHeaderText}>
              <p className={css.coachHeaderEyebrow}>
                <FormattedMessage
                  id="ProfilePage.coachInquiryEyebrow"
                  defaultMessage="Get in touch"
                />
              </p>
              <h3 className={css.coachHeaderName}>{coachDisplayName}</h3>
              {tierBadgeLabel ? (
                <span className={classNames(css.coachTierBadge, primaryTierBadgeClass)}>
                  {tierBadgeLabel}
                </span>
              ) : null}
            </div>
          </div>
          {sports.length > 0 ? (
            <div className={css.coachSports} aria-label="Sports">
              {sports.map(sport => (
                <span key={sport.key} className={css.coachSportChip} title={sport.label}>
                  <span className={css.coachSportEmoji} aria-hidden>
                    {sport.emoji}
                  </span>
                  <span className={css.coachSportLabel}>{sport.label}</span>
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <InquiryForm
          {...inquiryFormProps}
          hideInquiryIcon
          className={css.inquiryForm}
          submitButtonWrapperClassName={css.submitButtonWrapper}
          headingRootClassName={css.inquiryHeading}
          fieldClassName={css.inquiryField}
          submitButtonRootClassName={css.submitButton}
        />
      </div>
    </Modal>
  );
};

ContactCoachModal.defaultProps = {
  tierStyle: null,
  sports: [],
};

ContactCoachModal.propTypes = {
  id: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onManageDisableScrolling: PropTypes.func.isRequired,
  focusElementId: PropTypes.string,
  tierStyle: PropTypes.object,
  coachDisplayName: PropTypes.string.isRequired,
  coachUser: propTypes.currentUser,
  tierId: PropTypes.string,
  profilePublicData: PropTypes.object,
  sports: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      emoji: PropTypes.string,
      label: PropTypes.string.isRequired,
    })
  ),
  inquiryFormProps: PropTypes.object.isRequired,
};

export default ContactCoachModal;
