import React, { useEffect, useRef } from 'react';
import classNames from 'classnames';

import { FormattedMessage, intlShape } from '../../../util/reactIntl';
import {
  DATE_TYPE_DATE,
  DATE_TYPE_DATETIME,
  LINE_ITEM_DAY,
  LINE_ITEM_FIXED,
  LINE_ITEM_HOUR,
  LISTING_UNIT_TYPES,
} from '../../../util/types';
import { subtractTime } from '../../../util/dates';
import {
  getBookingProcessStateInfo,
  playBookingRequestNotificationSound,
} from '../../../util/peakupBookingRequestPopup';

import { Avatar, Modal, NamedLink, TimeRange, UserDisplayName } from '../../../components';

import css from './NewBookingRequestModal.module.css';

const MODAL_CONTENT_ID = 'NewBookingRequestModal.content';

const bookingTimeRangeProps = transaction => {
  const stateInfo = getBookingProcessStateInfo(transaction);
  const process = stateInfo?.process;
  if (!process) {
    return null;
  }
  if (process.getState(transaction) === process.states.INQUIRY || !transaction?.booking) {
    return null;
  }

  const hasLineItems = transaction?.attributes?.lineItems?.length > 0;
  const unitLineItem = hasLineItems
    ? transaction.attributes.lineItems.find(
        item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
      )
    : null;
  const lineItemUnitType = unitLineItem ? unitLineItem.code : null;
  const dateType = [LINE_ITEM_HOUR, LINE_ITEM_FIXED].includes(lineItemUnitType)
    ? DATE_TYPE_DATETIME
    : DATE_TYPE_DATE;

  const timeZone = transaction?.listing?.attributes?.availabilityPlan?.timezone || 'Etc/UTC';
  const { start, end, displayStart, displayEnd } = transaction.booking.attributes;
  const bookingStart = displayStart || start;
  const bookingEndRaw = displayEnd || end;
  const isDayBooking = [LINE_ITEM_DAY].includes(lineItemUnitType);
  const bookingEnd = isDayBooking
    ? subtractTime(bookingEndRaw, 1, 'days', timeZone)
    : bookingEndRaw;

  return { bookingStart, bookingEnd, dateType, timeZone };
};

const NotificationBellIcon = () => (
  <svg
    className={css.bellIcon}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M12 3a5 5 0 0 0-5 5v2.2c0 .8-.3 1.6-.8 2.2L4.6 15.2A1.5 1.5 0 0 0 6 18h12a1.5 1.5 0 0 0 1.4-2.8l-1.6-2.8a3.5 3.5 0 0 1-.8-2.2V8a5 5 0 0 0-5-5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M10 18.5a2 2 0 0 0 4 0"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Premium PeakUp popup for a new provider booking request (preauthorized).
 *
 * @param {Object} props
 * @param {string} props.id Modal scroll-lock id
 * @param {boolean} props.isOpen
 * @param {propTypes.transaction} props.transaction
 * @param {Function} props.onClose Dismiss only — does not mark inbox thread read
 * @param {Function} props.onManageDisableScrolling
 * @param {intlShape} props.intl
 * @param {boolean} [props.playSound]
 */
const NewBookingRequestModal = props => {
  const { id, isOpen, transaction, onClose, onManageDisableScrolling, intl, playSound = true } =
    props;
  const soundPlayedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !playSound || soundPlayedRef.current) {
      return;
    }
    soundPlayedRef.current = true;
    playBookingRequestNotificationSound();
  }, [isOpen, playSound]);

  useEffect(() => {
    if (!isOpen) {
      soundPlayedRef.current = false;
    }
  }, [isOpen]);

  if (!transaction) {
    return null;
  }

  const { customer, listing } = transaction;
  const stateInfo = getBookingProcessStateInfo(transaction);
  const processName = stateInfo?.processName || 'default-booking';
  const processState = stateInfo?.processState;
  const listingTitle = listing?.attributes?.title;
  const timeProps = bookingTimeRangeProps(transaction);

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
      usePortal
      closeOnOutsideClick
    >
      <div id={MODAL_CONTENT_ID} className={css.content}>
        <header className={css.header}>
          <div className={css.bellWrap}>
            <NotificationBellIcon />
            <span className={css.bellBadge} aria-hidden />
          </div>
          <div className={css.titleBlock}>
            <h2 className={css.title}>
              <FormattedMessage id="NewBookingRequestModal.title" />
            </h2>
            <span className={css.titleAccent} aria-hidden />
          </div>
        </header>

        <div className={css.customerRow}>
          <div className={css.avatarWrap}>
            <Avatar user={customer} />
          </div>
          <div className={css.customerMeta}>
            <p className={css.customerName}>
              <UserDisplayName user={customer} intl={intl} />
            </p>
            {listingTitle ? <p className={css.sessionTitle}>{listingTitle}</p> : null}
          </div>
        </div>

        <div className={css.bookingMeta}>
          {timeProps ? (
            <p className={css.bookingTime}>
              <TimeRange
                startDate={timeProps.bookingStart}
                endDate={timeProps.bookingEnd}
                dateType={timeProps.dateType}
                timeZone={timeProps.timeZone}
              />
            </p>
          ) : null}
          <span className={css.statusBadge}>
            <FormattedMessage
              id={`InboxPage.${processName}.${processState}.status`}
              values={{ transactionRole: 'provider' }}
            />
          </span>
        </div>

        <div className={css.actions}>
          <NamedLink
            className={css.primaryAction}
            name="SaleDetailsPage"
            params={{ id: transaction.id.uuid }}
            onClick={onClose}
          >
            <FormattedMessage id="NewBookingRequestModal.viewDetails" />
          </NamedLink>
          <button type="button" className={css.secondaryAction} onClick={onClose}>
            <FormattedMessage id="NewBookingRequestModal.goToInbox" />
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NewBookingRequestModal;
