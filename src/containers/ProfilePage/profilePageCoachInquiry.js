import { createResourceLocatorString } from '../../util/routes';
import {
  hasPermissionToInitiateTransactions,
  isUserAuthorized,
} from '../../util/userHelpers';
import {
  NO_ACCESS_PAGE_INITIATE_TRANSACTIONS,
  NO_ACCESS_PAGE_USER_PENDING_APPROVAL,
} from '../../util/urlHelpers';
import { REQUEST } from '../../transactions/transaction';

export const PROFILE_COACH_INQUIRY_CONTACT_BUTTON_ID = 'profileCoachInquiryContactButton';

/**
 * Open coach inquiry modal on ProfilePage, or route to signup / no-access when needed.
 * Uses representative listing id in ListingPage state for post-signup return.
 */
export const handleProfileCoachContact = parameters => event => {
  const {
    currentUser,
    history,
    location,
    routes,
    listingId,
    setInquiryModalOpen,
    setListingPageInitialValues,
  } = parameters;

  if (event?.preventDefault) {
    event.preventDefault();
  }

  if (!listingId) {
    return;
  }

  if (!currentUser) {
    setListingPageInitialValues({ inquiryModalOpenForListingId: listingId });
    const state = { from: `${location.pathname}${location.search}${location.hash}` };
    history.push(createResourceLocatorString('SignupPage', routes, {}, {}), state);
  } else if (!isUserAuthorized(currentUser)) {
    history.push(
      createResourceLocatorString(
        'NoAccessPage',
        routes,
        { missingAccessRight: NO_ACCESS_PAGE_USER_PENDING_APPROVAL },
        {}
      )
    );
  } else if (!hasPermissionToInitiateTransactions(currentUser)) {
    history.push(
      createResourceLocatorString(
        'NoAccessPage',
        routes,
        { missingAccessRight: NO_ACCESS_PAGE_INITIATE_TRANSACTIONS },
        {}
      )
    );
  } else {
    setInquiryModalOpen(true);
  }
};

/**
 * Submit inquiry from ProfilePage modal (Sharetribe transaction + message).
 */
export const handleProfileCoachSubmitInquiry = parameters => values => {
  const { listing, onSendInquiry, setInquiryModalOpen, history, routes } = parameters;

  if (!listing?.id) {
    return;
  }

  const { message } = values;

  onSendInquiry(listing, message.trim())
    .then(txId => {
      setInquiryModalOpen(false);

      const unitType = listing.attributes?.publicData?.unitType;
      const transactionPage = unitType === REQUEST ? 'SaleDetailsPage' : 'OrderDetailsPage';
      history.push(createResourceLocatorString(transactionPage, routes, { id: txId.uuid }, {}));
    })
    .catch(() => {
      // Errors surface via sendInquiryError in ListingPage duck
    });
};
