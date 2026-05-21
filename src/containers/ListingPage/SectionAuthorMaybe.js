import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import {
  isInquiryProcessAlias,
  isNegotiationProcessAlias,
  OFFER,
} from '../../transactions/transaction';

import { Heading } from '../../components';
import UserCard from './UserCard/UserCard';
import ListingInquiryModal from './ListingInquiryModal/ListingInquiryModal';

import css from './ListingPage.module.css';

const CONTACT_USER_LINK = 'inquiryModalContactUserLink';

const SectionAuthorMaybe = props => {
  const {
    title,
    listing,
    authorDisplayName,
    onContactUser,
    isInquiryModalOpen,
    onCloseInquiryModal,
    sendInquiryError,
    sendInquiryInProgress,
    onSubmitInquiry,
    currentUser,
    onManageDisableScrolling,
  } = props;

  if (!listing.author) {
    return null;
  }

  const transactionProcessAlias = listing?.attributes?.publicData?.transactionProcessAlias || '';
  const unitType = listing?.attributes?.publicData?.unitType || '';
  const isInquiryProcess = isInquiryProcessAlias(transactionProcessAlias);
  const isNegotiationProcess = isNegotiationProcessAlias(transactionProcessAlias);
  const showContact = !(isInquiryProcess || (isNegotiationProcess && unitType === OFFER));

  return (
    <section id="author" className={css.sectionAuthor}>
      <Heading as="h2" rootClassName={css.sectionHeadingWithExtraMargin}>
        <FormattedMessage id="ListingPage.aboutProviderTitle" />
      </Heading>
      <UserCard
        user={listing.author}
        currentUser={currentUser}
        onContactUser={onContactUser}
        showContact={showContact}
        contactLinkId={CONTACT_USER_LINK}
      />
      <ListingInquiryModal
        id="ListingPage.inquiry"
        isOpen={isInquiryModalOpen}
        onClose={onCloseInquiryModal}
        onManageDisableScrolling={onManageDisableScrolling}
        focusElementId={CONTACT_USER_LINK}
        listingTitle={title}
        authorDisplayName={authorDisplayName}
        sendInquiryError={sendInquiryError}
        onSubmitInquiry={onSubmitInquiry}
        sendInquiryInProgress={sendInquiryInProgress}
      />
    </section>
  );
};

export default SectionAuthorMaybe;
