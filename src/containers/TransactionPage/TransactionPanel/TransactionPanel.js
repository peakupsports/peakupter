import React, { Component } from 'react';
import classNames from 'classnames';

import { FormattedMessage, injectIntl, intlShape } from '../../../util/reactIntl';
import { propTypes } from '../../../util/types';
import { userDisplayNameAsString } from '../../../util/data';
import { isMobileSafari } from '../../../util/userAgent';
import { createSlug } from '../../../util/urlHelpers';
import { displayPrice } from '../../../util/configHelpers';
import { isPeakUpConversationView } from '../../../util/peakUpConversationView';
import {
  isContactSharingAllowed,
  noContactSharingBeforeBookingValidator,
  shouldBlockContactSharingInMessage,
} from '../../../util/peakupContactSharing';

import { AvatarLarge, NamedLink, UserDisplayName } from '../../../components';

import { stateDataShape } from '../TransactionPage.stateData';
import SendMessageForm from '../SendMessageForm/SendMessageForm';

// These are internal components that make this file more readable.
import BreakdownMaybe from './BreakdownMaybe';
import DetailCardHeadingsMaybe from './DetailCardHeadingsMaybe';
import DetailCardImage from './DetailCardImage';
import DeliveryInfoMaybe from './DeliveryInfoMaybe';
import BookingLocationMaybe from './BookingLocationMaybe';
import MeetingPointMaybe from './MeetingPointMaybe';
import FeedSection from './FeedSection';
import DiminishedActionButtonMaybe from './DiminishedActionButtonMaybe';
import PanelHeading from './PanelHeading';
import ConversationHeader from '../ConversationHeader/ConversationHeader';
import conversationHeaderCss from '../ConversationHeader/ConversationHeader.module.css';
import ConversationParticipantCard from '../ConversationParticipantCard/ConversationParticipantCard';

import css from './TransactionPanel.module.css';

// Helper function to get display names for different roles
const displayNames = (currentUser, provider, customer, intl) => {
  const authorDisplayName = <UserDisplayName user={provider} intl={intl} />;
  const customerDisplayName = <UserDisplayName user={customer} intl={intl} />;

  let otherUserDisplayName = '';
  let otherUserDisplayNameString = '';
  const currentUserIsCustomer =
    currentUser.id && customer?.id && currentUser.id.uuid === customer?.id?.uuid;
  const currentUserIsProvider =
    currentUser.id && provider?.id && currentUser.id.uuid === provider?.id?.uuid;

  if (currentUserIsCustomer) {
    otherUserDisplayName = authorDisplayName;
    otherUserDisplayNameString = userDisplayNameAsString(provider, '');
  } else if (currentUserIsProvider) {
    otherUserDisplayName = customerDisplayName;
    otherUserDisplayNameString = userDisplayNameAsString(customer, '');
  }

  return {
    authorDisplayName,
    customerDisplayName,
    otherUserDisplayName,
    otherUserDisplayNameString,
  };
};

const allowShowingExtraInfo = (showExtraInfo, transactionPartyInfo) => {
  const {
    isCustomer,
    isCustomerBanned,
    isCustomerDeleted,
    isProvider,
    isProviderBanned,
    isProviderDeleted,
  } = transactionPartyInfo;
  return (
    !!showExtraInfo &&
    ((isProvider && !isCustomerBanned && !isCustomerDeleted) ||
      (isCustomer && !isProviderBanned && !isProviderDeleted))
  );
};

/**
 * Transaction panel
 *
 * @component
 * @param {Object} props - The props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that extends the default class for the root element
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {string} props.transactionRole - The transaction role
 * @param {propTypes.listing} props.listing - The listing
 * @param {propTypes.user} props.customer - The customer
 * @param {propTypes.user} props.provider - The provider
 * @param {boolean} props.hasTransitions - Whether the transitions are shown
 * @param {propTypes.uuid} props.transactionId - The transaction id
 * @param {Array<propTypes.message>)} props.messages - The messages
 * @param {boolean} props.savePaymentMethodFailed - Whether the save payment method failed
 * @param {propTypes.error} props.fetchMessagesError - The fetch messages error
 * @param {boolean} props.sendMessageInProgress - Whether the send message is in progress
 * @param {propTypes.error} props.sendMessageError - The send message error
 * @param {Function} props.onOpenDisputeModal - The on open dispute modal function
 * @param {Function} props.onSendMessage - The on send message function
 * @param {stateDataShape} props.stateData - The state data
 * @param {boolean} props.showBookingLocation - Whether the booking location is shown
 * @param {React.ReactNode} props.activityFeed - The activity feed
 * @param {Function} props.actionButtons - The action buttons function
 * @param {React.ReactNode} props.orderBreakdown - The order breakdown
 * @param {React.ReactNode} props.orderPanel - The order panel
 * @param {object} props.config - The config
 * @param {intlShape} props.intl - The intl
 * @returns {JSX.Element} The TransactionPanel component
 */
export class TransactionPanelComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      sendMessageFormFocused: false,
    };
    this.isMobSaf = false;
    this.sendMessageFormName = 'TransactionPanel.SendMessageForm';

    this.onSendMessageFormFocus = this.onSendMessageFormFocus.bind(this);
    this.onSendMessageFormBlur = this.onSendMessageFormBlur.bind(this);
    this.onMessageSubmit = this.onMessageSubmit.bind(this);
    this.scrollToMessage = this.scrollToMessage.bind(this);
  }

  componentDidMount() {
    this.isMobSaf = isMobileSafari();
  }

  onSendMessageFormFocus() {
    this.setState({ sendMessageFormFocused: true });
    if (this.isMobSaf) {
      // Scroll to bottom
      window.scroll({ top: document.body.scrollHeight, left: 0, behavior: 'smooth' });
    }
  }

  onSendMessageFormBlur() {
    this.setState({ sendMessageFormFocused: false });
  }

  onMessageSubmit(values, form) {
    const message = values.message ? values.message.trim() : null;
    const { transactionId, onSendMessage, config, transaction } = this.props;

    if (!message) {
      return;
    }

    if (shouldBlockContactSharingInMessage(transaction, message)) {
      return;
    }

    onSendMessage(transactionId, message, config)
      .then(messageId => {
        form.reset();
        this.scrollToMessage(messageId);
      })
      .catch(e => {
        // Ignore, Redux handles the error
      });
  }

  scrollToMessage(messageId) {
    const selector = `#msg-${messageId.uuid}`;
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      });
    }
  }

  render() {
    const {
      rootClassName,
      className,
      currentUser,
      transaction,
      transactionRole,
      listing,
      customer,
      provider,
      transitions,
      processName,
      protectedData,
      messages,
      savePaymentMethodFailed = false,
      fetchMessagesError,
      sendMessageInProgress,
      sendMessageError,
      onOpenDisputeModal,
      showListingImage,
      intl,
      stateData = {},
      showBookingLocation = false,
      requestQuote,
      offer,
      activityFeed,
      actionButtons,
      isInquiryProcess,
      isConversationView: isConversationViewProp = false,
      isPeakUpBookingTheme = false,
      orderBreakdown,
      orderPanel,
      config,
      hasViewingRights,
      transactionFieldsComponent,
      onArchiveConversation,
      archiveConversationDisabled,
      listingUnavailable = false,
    } = this.props;

    const isConversationView =
      isConversationViewProp ||
      (transaction ? isPeakUpConversationView(transaction) : false);

    const hasTransitions = transitions.length > 0;
    const isCustomer = transactionRole === 'customer';
    const isProvider = transactionRole === 'provider';

    const listingDeleted = !!listing?.attributes?.deleted;
    const suppressListingLink = listingDeleted || listingUnavailable;
    const isCustomerBanned = !!customer?.attributes?.banned;
    const isCustomerDeleted = !!customer?.attributes?.deleted;
    const isProviderBanned = !!provider?.attributes?.banned;
    const isProviderDeleted = !!provider?.attributes?.deleted;

    const transactionPartyInfo = {
      isCustomer,
      isCustomerBanned,
      isCustomerDeleted,
      isProvider,
      isProviderBanned,
      isProviderDeleted,
    };

    const { authorDisplayName, customerDisplayName, otherUserDisplayNameString } = displayNames(
      currentUser,
      provider,
      customer,
      intl
    );

    const deletedListingTitle = intl.formatMessage({
      id: 'TransactionPanel.deletedListingTitle',
    });

    const listingTitle = listingDeleted ? deletedListingTitle : listing?.attributes?.title;
    const firstImage = listing?.images?.length > 0 ? listing?.images[0] : null;

    const listingType = listing?.attributes?.publicData?.listingType;
    const listingTypeConfigs = config.listing.listingTypes;
    const listingTypeConfig = listingTypeConfigs.find(conf => conf.listingType === listingType);
    const showPrice = isInquiryProcess && displayPrice(listingTypeConfig);
    const showBreakDown = stateData.showBreakDown !== false; // NOTE: undefined defaults to true due to historical reasons.

    const showSendMessageForm =
      !isCustomerBanned && !isCustomerDeleted && !isProviderBanned && !isProviderDeleted;

    // Only show order panel for users who have listing viewing rights, otherwise
    // show the detail card heading.
    const showOrderPanel =
      stateData.showOrderPanel && hasViewingRights && !isConversationView;
    const showDetailCardHeadings =
      (stateData.showDetailCardHeadings || !hasViewingRights) && !isConversationView;

    const deliveryMethod = protectedData?.deliveryMethod || 'none';
    const priceVariantName = protectedData?.priceVariantName;

    const otherUser = isCustomer ? provider : customer;

    const classes = classNames(rootClassName || css.root, className, {
      [css.peakUpConversationRoot]: isConversationView,
      [css.peakUpBookingRoot]: isPeakUpBookingTheme,
    });
    const containerClasses = classNames(css.container, {
      [css.peakUpConversationContainer]: isConversationView,
      [css.peakUpBookingContainer]: isPeakUpBookingTheme,
    });
    const txInfoClasses = classNames(css.txInfo, {
      [css.peakUpBookingMainColumn]: isPeakUpBookingTheme,
    });

    const conversationFeed = (
      <FeedSection
        rootClassName={css.peakUpConversationFeed}
        hasMessages={messages.length > 0}
        hasTransitions={hasTransitions}
        fetchMessagesError={fetchMessagesError}
        activityFeed={activityFeed}
        isConversation
        hideSectionHeading
      />
    );

    const contactSharingValidate = values => {
      if (isContactSharingAllowed(transaction)) {
        return {};
      }
      const contactError = noContactSharingBeforeBookingValidator(intl)(values.message);
      return contactError ? { message: contactError } : {};
    };

    const conversationSendForm = showSendMessageForm ? (
      <SendMessageForm
        formId={this.sendMessageFormName}
        rootClassName={css.peakUpConversationSendMessageForm}
        messagePlaceholder={intl.formatMessage(
          { id: 'TransactionPanel.sendMessagePlaceholder' },
          { name: otherUserDisplayNameString }
        )}
        inProgress={sendMessageInProgress}
        sendMessageError={sendMessageError}
        onFocus={this.onSendMessageFormFocus}
        onBlur={this.onSendMessageFormBlur}
        onSubmit={this.onMessageSubmit}
        validate={contactSharingValidate}
      />
    ) : (
      <div className={css.peakUpConversationSendingNotAllowed}>
        <FormattedMessage id="TransactionPanel.sendingMessageNotAllowed" />
      </div>
    );

    return (
      <div className={classes}>
        <div className={containerClasses}>
          {isConversationView ? (
            <div className={css.peakUpConversationShell}>
              <div className={css.peakUpConversationGrid}>
                <div className={css.peakUpChatColumn}>
                  <article className={css.peakUpChatCard}>
                    <ConversationHeader
                      rootClassName={classNames(
                        conversationHeaderCss.root,
                        conversationHeaderCss.peakUpChatEmbedded
                      )}
                      otherUser={otherUser}
                      isViewingCoach={isCustomer}
                      listing={listing}
                      provider={provider}
                      onArchiveConversation={onArchiveConversation}
                      archiveDisabled={archiveConversationDisabled}
                    />
                    <div className={css.peakUpChatBody}>{conversationFeed}</div>
                    <div className={css.peakUpChatComposer}>{conversationSendForm}</div>
                  </article>
                </div>
                <ConversationParticipantCard
                  otherUser={otherUser}
                  isViewingCoach={isCustomer}
                  listing={listing}
                  provider={provider}
                />
              </div>
              {stateData.showActionButtons ? (
                <>
                  <div className={css.mobileActionButtonSpacer} />
                  <div className={css.mobileActionButtons}>{actionButtons('mobile')}</div>
                </>
              ) : null}
            </div>
          ) : (
          <>
          <div className={txInfoClasses}>
            <article
              className={classNames({
                [css.peakUpBookingActivityCard]: isPeakUpBookingTheme,
              })}
            >
              <DetailCardImage
                rootClassName={classNames(css.imageWrapperMobile, {
                  [css.peakUpBookingImageMobile]: isPeakUpBookingTheme,
                })}
                avatarWrapperClassName={classNames(css.avatarWrapperMobile, {
                  [css.peakUpBookingAvatarMobile]: isPeakUpBookingTheme,
                })}
                listingTitle={listingTitle}
                image={firstImage}
                provider={provider}
                isCustomer={isCustomer}
                showListingImage={showListingImage}
                listingImageConfig={config.layout.listingImage}
              />
            {!isConversationView && isProvider ? (
              <div className={css.avatarWrapperProviderDesktop}>
                <AvatarLarge user={customer} className={css.avatarDesktop} />
              </div>
            ) : null}

            <PanelHeading
              processName={stateData.processName}
              copyProcessName={stateData.copyProcessName}
              processState={stateData.processState}
              showExtraInfo={allowShowingExtraInfo(stateData.showExtraInfo, transactionPartyInfo)}
              showPriceOnMobile={showPrice}
              price={listing?.attributes?.price}
              intl={intl}
              deliveryMethod={deliveryMethod}
              isPendingPayment={!!stateData.isPendingPayment}
              transactionRole={transactionRole}
              providerName={authorDisplayName}
              customerName={customerDisplayName}
              listingId={listing?.id?.uuid}
              listingTitle={listingTitle}
              listingDeleted={suppressListingLink}
              isPeakUpBookingTheme={isPeakUpBookingTheme}
            />

            {requestQuote}
            {offer}
            {transactionFieldsComponent}

            {!isInquiryProcess ? (
              <div
                className={classNames(css.orderDetails, {
                  [css.peakUpBookingOrderDetails]: isPeakUpBookingTheme,
                })}
              >
                <div
                  className={classNames(css.orderDetailsMobileSection, {
                    [css.peakUpBookingMobileSummary]: isPeakUpBookingTheme,
                  })}
                >
                  {showBreakDown ? (
                    <BreakdownMaybe
                      orderBreakdown={orderBreakdown}
                      processName={stateData.processName}
                      copyProcessName={stateData.copyProcessName}
                      priceVariantName={priceVariantName}
                      isPeakUpBookingTheme={isPeakUpBookingTheme}
                    />
                  ) : null}
                  <DiminishedActionButtonMaybe
                    id="mobile_disputeOrderButton"
                    showDispute={stateData.showDispute}
                    onOpenDisputeModal={onOpenDisputeModal}
                  />
                </div>

                {savePaymentMethodFailed ? (
                  <p className={css.genericError}>
                    <FormattedMessage
                      id="TransactionPanel.savePaymentMethodFailed"
                      values={{
                        paymentMethodsPageLink: (
                          <NamedLink name="PaymentMethodsPage">
                            <FormattedMessage id="TransactionPanel.paymentMethodsPageLink" />
                          </NamedLink>
                        ),
                      }}
                    />
                  </p>
                ) : null}
                <DeliveryInfoMaybe
                  className={css.deliveryInfoSection}
                  protectedData={protectedData}
                  listing={listing}
                  locale={config.localization.locale}
                />
                <MeetingPointMaybe
                  className={css.deliveryInfoSection}
                  protectedData={protectedData}
                  peakUpTheme={isPeakUpBookingTheme}
                />
                <BookingLocationMaybe
                  className={css.deliveryInfoSection}
                  listing={listing}
                  provider={provider}
                  protectedData={protectedData}
                  showBookingLocation={showBookingLocation}
                  isPeakUpBookingTheme={isPeakUpBookingTheme}
                  mapsConfig={config.maps}
                />
              </div>
            ) : null}
            <FeedSection
              rootClassName={
                isConversationView
                  ? css.peakUpConversationFeed
                  : isPeakUpBookingTheme
                  ? css.peakUpBookingFeed
                  : css.feedContainer
              }
              hasMessages={messages.length > 0}
              hasTransitions={hasTransitions}
              fetchMessagesError={fetchMessagesError}
              activityFeed={activityFeed}
              isConversation={isInquiryProcess || isConversationView}
              hideSectionHeading={isConversationView}
              isPeakUpBookingTheme={isPeakUpBookingTheme}
            />
            {showSendMessageForm ? (
              <SendMessageForm
                formId={this.sendMessageFormName}
                rootClassName={
                  isConversationView || isPeakUpBookingTheme
                    ? css.peakUpConversationSendMessageForm
                    : css.sendMessageForm
                }
                messagePlaceholder={intl.formatMessage(
                  { id: 'TransactionPanel.sendMessagePlaceholder' },
                  { name: otherUserDisplayNameString }
                )}
                inProgress={sendMessageInProgress}
                sendMessageError={sendMessageError}
                onFocus={this.onSendMessageFormFocus}
                onBlur={this.onSendMessageFormBlur}
                onSubmit={this.onMessageSubmit}
                validate={contactSharingValidate}
              />
            ) : (
              <div
                className={classNames(css.sendingMessageNotAllowed, {
                  [css.peakUpConversationSendingNotAllowed]: isPeakUpBookingTheme,
                })}
              >
                <FormattedMessage id="TransactionPanel.sendingMessageNotAllowed" />
              </div>
            )}

            {stateData.showActionButtons ? (
              <>
                <div className={css.mobileActionButtonSpacer}></div>
                <div
                  className={classNames(css.mobileActionButtons, {
                    [css.peakUpBookingMobileActions]: isPeakUpBookingTheme,
                  })}
                >
                  {actionButtons('mobile')}
                </div>
              </>
            ) : null}
            </article>
          </div>

          <div
            className={classNames(css.asideDesktop, {
              [css.peakUpBookingAside]: isPeakUpBookingTheme,
            })}
          >
            <div
              className={classNames(css.stickySection, {
                [css.noListingImage]: !showListingImage,
                [css.peakUpBookingSticky]: isPeakUpBookingTheme,
              })}
            >
              <div
                className={classNames(css.detailCard, {
                  [css.peakUpBookingSummaryCard]: isPeakUpBookingTheme,
                })}
              >
                <DetailCardImage
                  rootClassName={classNames(css.detailCardImageWrapper, {
                    [css.peakUpBookingSummaryImage]: isPeakUpBookingTheme,
                  })}
                  avatarWrapperClassName={classNames(css.avatarWrapperDesktop, {
                    [css.peakUpBookingSummaryAvatar]: isPeakUpBookingTheme,
                  })}
                  listingTitle={listingTitle}
                  image={firstImage}
                  provider={provider}
                  isCustomer={isCustomer}
                  showListingImage={showListingImage}
                  listingImageConfig={config.layout.listingImage}
                />

                <DetailCardHeadingsMaybe
                  showDetailCardHeadings={showDetailCardHeadings}
                  showListingImage={showListingImage}
                  isPeakUpBookingTheme={isPeakUpBookingTheme}
                  listingTitle={
                    suppressListingLink || !listing?.id?.uuid ? (
                      listingTitle
                    ) : (
                      <NamedLink
                        name="ListingPage"
                        params={{ id: listing.id.uuid, slug: createSlug(listingTitle) }}
                      >
                        {listingTitle}
                      </NamedLink>
                    )
                  }
                  showPrice={showPrice}
                  price={listing?.attributes?.price}
                  intl={intl}
                />
                {showOrderPanel ? orderPanel : null}
                {showBreakDown ? (
                  <BreakdownMaybe
                    className={css.breakdownContainer}
                    orderBreakdown={orderBreakdown}
                    processName={stateData.processName}
                    copyProcessName={stateData.copyProcessName}
                    priceVariantName={priceVariantName}
                    isPeakUpBookingTheme={isPeakUpBookingTheme}
                  />
                ) : null}

                {stateData.showActionButtons ? (
                  <div
                    className={classNames(css.desktopActionButtons, {
                      [css.peakUpBookingDesktopActions]: isPeakUpBookingTheme,
                    })}
                  >
                    {actionButtons('desktop')}
                  </div>
                ) : null}
              </div>
              <DiminishedActionButtonMaybe
                id="desktop_disputeOrderButton"
                showDispute={stateData.showDispute}
                onOpenDisputeModal={onOpenDisputeModal}
              />
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    );
  }
}

const TransactionPanel = injectIntl(TransactionPanelComponent);

export default TransactionPanel;
