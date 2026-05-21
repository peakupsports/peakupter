import React from 'react';
import PropTypes from 'prop-types';

import { FormattedMessage } from '../../../util/reactIntl';
import { Modal } from '../../../components';
import InquiryForm from '../InquiryForm/InquiryForm';

import css from './ListingInquiryModal.module.css';

/**
 * PeakUp-styled inquiry modal for listing pages (booking/purchase processes).
 *
 * @param {Object} props
 * @param {string} props.id Modal id for scroll lock
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Function} props.onManageDisableScrolling
 * @param {string} [props.focusElementId]
 * @param {string} props.authorDisplayName Coach display name
 * @param {string} props.listingTitle Listing title fallback
 * @param {propTypes.error} props.sendInquiryError
 * @param {boolean} props.sendInquiryInProgress
 * @param {Function} props.onSubmitInquiry
 */
const ListingInquiryModal = props => {
  const {
    id,
    isOpen,
    onClose,
    onManageDisableScrolling,
    focusElementId,
    authorDisplayName,
    listingTitle,
    sendInquiryError,
    sendInquiryInProgress,
    onSubmitInquiry,
  } = props;

  const coachName = authorDisplayName || listingTitle || '';

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
      <div className={css.shell}>
        <h2 className={css.title}>
          <FormattedMessage
            id="InquiryForm.peakUpListingTitle"
            values={{ coachName, authorDisplayName, listingTitle }}
          />
        </h2>
        <span className={css.titleAccent} aria-hidden />
        <p className={css.subtitle}>
          <FormattedMessage id="InquiryForm.peakUpListingSubtitle" />
        </p>

        <InquiryForm
          className={css.inquiryForm}
          submitButtonWrapperClassName={css.submitButtonWrapper}
          fieldClassName={css.inquiryField}
          submitButtonRootClassName={css.submitButton}
          listingTitle={listingTitle}
          authorDisplayName={authorDisplayName}
          sendInquiryError={sendInquiryError}
          onSubmit={onSubmitInquiry}
          inProgress={sendInquiryInProgress}
          hideInquiryIcon
          hideHeading
          hideMessageLabel
          messagePlaceholderMessageId="InquiryForm.peakUpListingMessagePlaceholder"
          submitButtonMessageId="InquiryForm.submitButtonText"
        />
      </div>
    </Modal>
  );
};

ListingInquiryModal.propTypes = {
  id: PropTypes.string.isRequired,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onManageDisableScrolling: PropTypes.func.isRequired,
  focusElementId: PropTypes.string,
  authorDisplayName: PropTypes.string,
  listingTitle: PropTypes.string,
  sendInquiryError: PropTypes.object,
  sendInquiryInProgress: PropTypes.bool,
  onSubmitInquiry: PropTypes.func.isRequired,
};

export default ListingInquiryModal;
