import React, { useCallback, useRef, useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { timestampToDate } from '../../../util/dates';
import { peakupNormalizeSessionsForCheckout } from '../../../util/peakupBooking';
import { peakupPrimaryBookingDatesFromSessions } from '../../../util/peakupMultiSlotCheckout';
import {
  logPeakupHourlyMultiSlotTotal,
  logPeakupHourlySlotAdded,
  logPeakupHourlySlotRemoved,
  peakupFormatBookedHoursLabel,
  peakupHourlyCartTotalFormatted,
  peakupHourlySlotDurationHours,
  peakupHourlySlotSubtotalFormatted,
  peakupHourlyTotalBookedHours,
  peakupHourlyUnitPriceFormatted,
} from '../../../util/peakupHourlySlots';
import { propTypes } from '../../../util/types';
import { BOOKING_PROCESS_NAME } from '../../../transactions/transaction';

import {
  Form,
  H6,
  PrimaryButton,
  SecondaryButton,
  FieldSelect,
  InlineTextButton,
} from '../../../components';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';
import FieldDateAndTimeInput from './FieldDateAndTimeInput';

import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError.js';
import MeetingPointSelectMaybe from '../MeetingPointSelectMaybe/MeetingPointSelectMaybe';

import {
  appendPeakupMeetingPointToOrderValues,
  peakupMeetingPointInitialValues,
} from '../../../util/peakupMeetingPoint';

import css from './BookingTimeForm.module.css';

// When the values of the form are updated we need to fetch
// lineItems from this template's backend for the EstimatedTransactionMaybe
// In case you add more fields to the form, make sure you add
// the values here to the orderData object.
const handleFetchLineItems = props => formValues => {
  const {
    listingId,
    isOwnListing,
    fetchLineItemsInProgress,
    onFetchTransactionLineItems,
    seatsEnabled,
  } = props;
  const { bookingStartTime, bookingEndTime, seats, priceVariantName } = formValues.values;
  const startDate = bookingStartTime ? timestampToDate(bookingStartTime) : null;
  const endDate = bookingEndTime ? timestampToDate(bookingEndTime) : null;

  // Note: we expect values bookingStartTime and bookingEndTime to be strings
  // which is the default case when the value has been selected through the form
  const isStartBeforeEnd = bookingStartTime < bookingEndTime;
  const seatsMaybe = seatsEnabled && seats > 0 ? { seats: parseInt(seats, 10) } : {};

  const priceVariantMaybe = priceVariantName ? { priceVariantName } : {};

  if (bookingStartTime && bookingEndTime && isStartBeforeEnd && !fetchLineItemsInProgress) {
    const orderData = {
      bookingStart: startDate,
      bookingEnd: endDate,
      ...seatsMaybe,
      ...priceVariantMaybe,
    };
    onFetchTransactionLineItems({
      orderData,
      listingId,
      isOwnListing,
    });
  }
};

const onPriceVariantChange = props => value => {
  const { form: formApi, seatsEnabled } = props;

  formApi.batch(() => {
    formApi.change('bookingStartDate', null);
    formApi.change('bookingStartTime', null);
    formApi.change('bookingEndTime', null);
    if (seatsEnabled) {
      formApi.change('seats', 1);
    }
  });
};

const formatPeakupHourlySessionSummary = (intl, timeZone, session) => {
  const start = timestampToDate(session.bookingStartTime);
  const end = timestampToDate(session.bookingEndTime);
  if (!start || !end) {
    return '';
  }
  const dateOpts = { weekday: 'short', month: 'short', day: 'numeric', timeZone };
  const timeOpts = { hour: 'numeric', minute: 'numeric', timeZone };
  return `${intl.formatDate(start, dateOpts)} · ${intl.formatDate(
    start,
    timeOpts
  )}–${intl.formatDate(end, timeOpts)}`;
};

/**
 * A form for selecting booking time.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {propTypes.money} props.price - The unit price of the listing
 * @param {boolean} props.isOwnListing - Whether the listing is owned by the current user
 * @param {propTypes.uuid} props.listingId - The ID of the listing
 * @param {Object} props.monthlyTimeSlots - The monthly time slots
 * @param {Function} props.onFetchTimeSlots - The function to fetch the time slots
 * @param {string} props.timeZone - The time zone of the listing (e.g. "America/New_York")
 * @param {Function} props.onFetchTransactionLineItems - The function to fetch the transaction line items
 * @param {Object} props.lineItems - The line items
 * @param {boolean} props.fetchLineItemsInProgress - Whether line items are being fetched
 * @param {propTypes.error} props.fetchLineItemsError - The error for fetching line items
 * @param {string} [props.startDatePlaceholder] - The placeholder text for the start date
 * @param {string} [props.endDatePlaceholder] - The placeholder text for the end date
 * @param {number} props.dayCountAvailableForBooking - Number of days available for booking
 * @param {string} props.marketplaceName - Name of the marketplace
 * @param {Array<Object>} [props.priceVariants] - The price variants
 * @param {ReactNode} [props.priceVariantFieldComponent] - The component to use for the price variant field
 * @param {boolean} props.isPublishedListing - Whether the listing is published
 * @param {boolean} [props.peakupMultiSlotBooking] - PeakUp: cart of disjoint hourly slots
 * @returns {JSX.Element}
 */
export const BookingTimeForm = props => {
  const intl = useIntl();
  const {
    rootClassName,
    className,
    price: unitPrice,
    dayCountAvailableForBooking,
    marketplaceName,
    seatsEnabled,
    isPriceVariationsInUse,
    priceVariants = [],
    priceVariantFieldComponent: PriceVariantFieldComponent,
    preselectedPriceVariant,
    isPublishedListing,
    peakupMultiSlotBooking = false,
    preferredMeetingPoints = [],
    skipMeetingPointSelect = false,
    formId,
    onSubmit,
    listingId,
    isOwnListing,
    onFetchTransactionLineItems,
    fetchLineItemsInProgress,
    ...rest
  } = props;

  const [seatsOptions, setSeatsOptions] = useState([1]);
  const [peakupSessions, setPeakupSessions] = useState([]);
  const formValuesRef = useRef({});

  const triggerPeakupLineItems = useCallback(
    (sessionsArg, valuesMaybe) => {
      if (!peakupMultiSlotBooking || !sessionsArg?.length || fetchLineItemsInProgress) {
        return;
      }
      const mergedValues = valuesMaybe || formValuesRef.current;
      const primary = peakupPrimaryBookingDatesFromSessions(sessionsArg);
      if (!primary) {
        return;
      }
      const seatsRaw = mergedValues?.seats;
      const seatsMaybe = seatsEnabled && seatsRaw > 0 ? { seats: parseInt(seatsRaw, 10) } : {};
      const priceVariantMaybe = mergedValues?.priceVariantName
        ? { priceVariantName: mergedValues.priceVariantName }
        : {};
      const normalizedSlots = peakupNormalizeSessionsForCheckout(sessionsArg);
      const totalHours = peakupHourlyTotalBookedHours(sessionsArg);

      logPeakupHourlyMultiSlotTotal({
        slotCount: sessionsArg.length,
        totalHours,
        bookingStart: primary.bookingStart,
        bookingEnd: primary.bookingEnd,
      });

      onFetchTransactionLineItems({
        orderData: {
          bookingStart: primary.bookingStart,
          bookingEnd: primary.bookingEnd,
          peakupSessionCount: sessionsArg.length,
          peakupBookingSlots: normalizedSlots,
          ...seatsMaybe,
          ...priceVariantMaybe,
        },
        listingId,
        isOwnListing,
      });
    },
    [
      peakupMultiSlotBooking,
      seatsEnabled,
      fetchLineItemsInProgress,
      listingId,
      isOwnListing,
      onFetchTransactionLineItems,
    ]
  );

  const standardFetch = handleFetchLineItems(props);
  const noopFetch = useCallback(() => {}, []);
  const lineItemFetchHandler = peakupMultiSlotBooking ? noopFetch : standardFetch;

  const meetingPointInitial = skipMeetingPointSelect
    ? {}
    : peakupMeetingPointInitialValues(preferredMeetingPoints);
  const priceVariantInitial =
    priceVariants.length > 1 && preselectedPriceVariant
      ? { priceVariantName: preselectedPriceVariant?.name }
      : priceVariants.length === 1
      ? { priceVariantName: priceVariants?.[0]?.name }
      : {};
  const hasFormInitialValues =
    Object.keys(priceVariantInitial).length > 0 || Object.keys(meetingPointInitial).length > 0;
  const initialValuesMaybe = hasFormInitialValues
    ? { initialValues: { ...priceVariantInitial, ...meetingPointInitial } }
    : {};

  const submitWithMeetingPoint = values => {
    const withMeetingPoint = skipMeetingPointSelect
      ? values
      : appendPeakupMeetingPointToOrderValues(values, preferredMeetingPoints);
    if (peakupMultiSlotBooking && peakupSessions.length > 0) {
      return onSubmit({
        ...withMeetingPoint,
        peakupBookingSlots: peakupSessions,
      });
    }
    return onSubmit(withMeetingPoint);
  };

  const classes = classNames(rootClassName || css.root, className);

  return (
    <FinalForm
      {...initialValuesMaybe}
      {...rest}
      unitPrice={unitPrice}
      onSubmit={submitWithMeetingPoint}
      render={formRenderProps => {
        const {
          endDatePlaceholder,
          startDatePlaceholder,
          form,
          pristine,
          handleSubmit,
          values,
          monthlyTimeSlots,
          timeSlotsForDate,
          onFetchTimeSlots,
          timeZone,
          lineItems,
          fetchLineItemsInProgress,
          fetchLineItemsError,
          payoutDetailsWarning,
          isOwnListing: isOwnListingForm,
          finePrintComponent: FinePrint,
        } = formRenderProps;

        formValuesRef.current = values;

        const startTime = values?.bookingStartTime ? values.bookingStartTime : null;
        const endTime = values?.bookingEndTime ? values.bookingEndTime : null;
        const startDate = startTime ? timestampToDate(startTime) : null;
        const endDate = endTime ? timestampToDate(endTime) : null;
        const priceVariantName = values?.priceVariantName || null;

        let breakdownData =
          peakupMultiSlotBooking && peakupSessions.length > 0
            ? (() => {
                const primary = peakupPrimaryBookingDatesFromSessions(peakupSessions);
                return primary
                  ? { startDate: primary.bookingStart, endDate: primary.bookingEnd }
                  : null;
              })()
            : startDate && endDate
            ? {
                startDate,
                endDate,
              }
            : null;

        const showEstimatedBreakdown =
          breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

        const onHandleFetchLineItems = lineItemFetchHandler;
        const submitDisabled = isPriceVariationsInUse && !isPublishedListing;

        const cartTotalHours =
          peakupMultiSlotBooking && peakupSessions.length > 0
            ? peakupHourlyTotalBookedHours(peakupSessions)
            : 0;

        const addPeakupSessionFromPicker = () => {
          if (!(startTime && endTime && startDate && endDate)) {
            return;
          }
          const duplicate = peakupSessions.some(
            s =>
              String(s.bookingStartTime) === String(startTime) &&
              String(s.bookingEndTime) === String(endTime)
          );
          if (duplicate) {
            return;
          }
          const session = {
            bookingStartTime: startTime,
            bookingEndTime: endTime,
          };
          setPeakupSessions(prev => {
            const next = [...prev, session];
            logPeakupHourlySlotAdded(session, next.length);
            window.requestAnimationFrame(() => triggerPeakupLineItems(next, values));
            return next;
          });
        };

        const removePeakupSession = index => {
          setPeakupSessions(prev => {
            const removed = prev[index];
            const next = prev.filter((_, i) => i !== index);
            logPeakupHourlySlotRemoved(removed, next.length);
            window.requestAnimationFrame(() => {
              if (next.length) {
                triggerPeakupLineItems(next);
              }
            });
            return next;
          });
        };

        const onPriceVariantChangeWrapped = pv => {
          if (peakupMultiSlotBooking) {
            setPeakupSessions([]);
          }
          const fn = onPriceVariantChange(formRenderProps);
          fn(pv);
        };

        const seatsBlocked = peakupMultiSlotBooking
          ? peakupSessions.length === 0 && !startTime
          : !startTime;

        const hourlyRateFormatted = peakupHourlyUnitPriceFormatted(intl, unitPrice);
        const cartTotalFormatted =
          peakupMultiSlotBooking && peakupSessions.length > 0
            ? peakupHourlyCartTotalFormatted(intl, unitPrice, peakupSessions)
            : null;

        return (
          <Form onSubmit={handleSubmit} className={classes} enforcePagePreloadFor="CheckoutPage">
            {PriceVariantFieldComponent ? (
              <PriceVariantFieldComponent
                priceVariants={priceVariants}
                priceVariantName={priceVariantName}
                onPriceVariantChange={onPriceVariantChangeWrapped}
                disabled={!isPublishedListing}
              />
            ) : null}

            {monthlyTimeSlots && timeZone ? (
              <FieldDateAndTimeInput
                seatsEnabled={seatsEnabled}
                setSeatsOptions={setSeatsOptions}
                startDateInputProps={{
                  label: intl.formatMessage({ id: 'BookingTimeForm.bookingStartTitle' }),
                  placeholderText: startDatePlaceholder,
                }}
                endDateInputProps={{
                  label: intl.formatMessage({ id: 'BookingTimeForm.bookingEndTitle' }),
                  placeholderText: endDatePlaceholder,
                }}
                className={css.bookingDates}
                listingId={listingId}
                onFetchTimeSlots={onFetchTimeSlots}
                monthlyTimeSlots={monthlyTimeSlots}
                timeSlotsForDate={timeSlotsForDate}
                values={values}
                intl={intl}
                form={form}
                pristine={pristine}
                disabled={isPriceVariationsInUse && !priceVariantName}
                timeZone={timeZone}
                dayCountAvailableForBooking={dayCountAvailableForBooking}
                handleFetchLineItems={onHandleFetchLineItems}
              />
            ) : null}

            {peakupMultiSlotBooking ? (
              <div className={css.peakupSessionBlock}>
                <SecondaryButton
                  type="button"
                  className={css.peakupAddButton}
                  disabled={!(startTime && endTime)}
                  onClick={addPeakupSessionFromPicker}
                >
                  <FormattedMessage id="BookingTimeForm.peakupAddSlot" />
                </SecondaryButton>

                <h6 className={css.peakupSessionsHeading}>
                  <FormattedMessage id="BookingTimeForm.peakupSelectedSlotsTitle" />
                </h6>
                {!peakupSessions.length ? (
                  <p className={css.peakupSessionsHint}>
                    <FormattedMessage id="BookingTimeForm.peakupEmptyCartHint" />
                  </p>
                ) : (
                  <>
                    <ul className={css.peakupSessionsList}>
                      {peakupSessions.map((sess, idx) => {
                        const durationHours = peakupHourlySlotDurationHours(
                          sess.bookingStartTime,
                          sess.bookingEndTime
                        );
                        const subtotal = peakupHourlySlotSubtotalFormatted(
                          intl,
                          unitPrice,
                          sess.bookingStartTime,
                          sess.bookingEndTime
                        );
                        return (
                          <li
                            key={`${sess.bookingStartTime}-${sess.bookingEndTime}-${idx}`}
                            className={css.peakupSessionRow}
                          >
                            <div className={css.peakupSessionMain}>
                              <span className={css.peakupSessionSummary}>
                                {formatPeakupHourlySessionSummary(intl, timeZone, sess)}
                              </span>
                              <span className={css.peakupSessionMeta}>
                                {durationHours != null ? (
                                  <span>
                                    <FormattedMessage
                                      id="BookingTimeForm.peakupSlotDuration"
                                      values={{
                                        hours: peakupFormatBookedHoursLabel(durationHours),
                                      }}
                                    />
                                  </span>
                                ) : null}
                                {hourlyRateFormatted ? (
                                  <span>
                                    <FormattedMessage
                                      id="BookingTimeForm.peakupSlotHourlyRate"
                                      values={{ rate: hourlyRateFormatted }}
                                    />
                                  </span>
                                ) : null}
                                {subtotal ? (
                                  <span>
                                    <FormattedMessage
                                      id="BookingTimeForm.peakupSlotSubtotal"
                                      values={{ subtotal }}
                                    />
                                  </span>
                                ) : null}
                              </span>
                            </div>
                            <InlineTextButton
                              type="button"
                              className={css.peakupRemoveBtn}
                              onClick={() => removePeakupSession(idx)}
                            >
                              <FormattedMessage id="BookingTimeForm.peakupRemoveSlot" />
                            </InlineTextButton>
                          </li>
                        );
                      })}
                    </ul>
                    <p className={css.peakupCartTotal}>
                      <FormattedMessage
                        id="BookingTimeForm.peakupCartTotal"
                        values={{
                          hours: peakupFormatBookedHoursLabel(cartTotalHours),
                          count: peakupSessions.length,
                          total: cartTotalFormatted || '—',
                        }}
                      />
                    </p>
                  </>
                )}
              </div>
            ) : null}

            {seatsEnabled ? (
              <FieldSelect
                name="seats"
                id="seats"
                disabled={seatsBlocked}
                showLabelAsDisabled={seatsBlocked}
                label={intl.formatMessage({ id: 'BookingTimeForm.seatsTitle' })}
                className={css.fieldSeats}
                onChange={seatsChoice => {
                  if (peakupMultiSlotBooking && peakupSessions.length > 0) {
                    triggerPeakupLineItems(peakupSessions, {
                      ...values,
                      seats: seatsChoice,
                    });
                    return;
                  }
                  onHandleFetchLineItems({
                    values: {
                      priceVariantName,
                      bookingStartDate: startDate,
                      bookingStartTime: startTime,
                      bookingEndDate: endDate,
                      bookingEndTime: endTime,
                      seats: seatsChoice,
                    },
                  });
                }}
              >
                <option disabled value="">
                  {intl.formatMessage({ id: 'BookingTimeForm.seatsPlaceholder' })}
                </option>
                {seatsOptions.map(s => (
                  <option value={s} key={s}>
                    {s}
                  </option>
                ))}
              </FieldSelect>
            ) : null}

            {showEstimatedBreakdown ? (
              <div className={css.priceBreakdownContainer}>
                <H6 as="h3" className={css.bookingBreakdownTitle}>
                  <FormattedMessage id="BookingTimeForm.priceBreakdownTitle" />
                </H6>
                <hr className={css.totalDivider} />
                <EstimatedCustomerBreakdownMaybe
                  breakdownData={breakdownData}
                  lineItems={lineItems}
                  timeZone={timeZone}
                  currency={unitPrice.currency}
                  marketplaceName={marketplaceName}
                  processName={BOOKING_PROCESS_NAME}
                  peakupBookingSlots={
                    peakupMultiSlotBooking && peakupSessions.length > 0
                      ? peakupNormalizeSessionsForCheckout(peakupSessions)
                      : undefined
                  }
                />
              </div>
            ) : null}

            <MeetingPointSelectMaybe
              preferredMeetingPoints={preferredMeetingPoints}
              skip={skipMeetingPointSelect}
              formId={formId}
            />

            <FetchLineItemsError error={fetchLineItemsError} />

            <div className={css.submitButton}>
              <PrimaryButton
                type="submit"
                inProgress={fetchLineItemsInProgress}
                disabled={submitDisabled}
              >
                <FormattedMessage id="BookingTimeForm.requestToBook" />
              </PrimaryButton>
            </div>
            <FinePrint payoutDetailsWarning={payoutDetailsWarning} isOwnListing={isOwnListingForm} />
          </Form>
        );
      }}
    />
  );
};

export default BookingTimeForm;
