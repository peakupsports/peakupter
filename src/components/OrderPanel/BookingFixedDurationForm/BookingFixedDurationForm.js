import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { timestampToDate } from '../../../util/dates';
import {
  peakupNormalizeSessionsForCheckout,
  peakupTimespanDatesFromSessions,
} from '../../../util/peakupBooking';
import { peakupBookingHoldRelease, peakupBookingHoldReserve } from '../../../util/api';
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

import css from './BookingFixedDurationForm.module.css';

// When the values of the form are updated we need to fetch
// lineItems from this template's backend for the EstimatedTransactionMaybe
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

  const isStartBeforeEnd = bookingStartTime < bookingEndTime;
  const seatsMaybe = seatsEnabled && seats > 0 ? { seats: parseInt(seats, 10) } : {};

  const priceVariantMaybe = priceVariantName ? { priceVariantName } : {};

  if (startDate && endDate && isStartBeforeEnd && !fetchLineItemsInProgress) {
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

const onPriceVariantChange = props => _value => {
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

const formatPeakupSessionSummary = (intl, timeZone, session) => {
  const start = timestampToDate(session.bookingStartTime);
  const end = timestampToDate(session.bookingEndTime);
  if (!start || !end) return '';
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
 */
export const BookingFixedDurationForm = props => {
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
    onSubmit,
    listingId,
    isOwnListing,
    onFetchTransactionLineItems,
    fetchLineItemsInProgress,
    ...rest
  } = props;

  const [seatsOptions, setSeatsOptions] = useState([1]);
  const [peakupSessions, setPeakupSessions] = useState([]);
  const [peakupSubmitMissing, setPeakupSubmitMissing] = useState(false);
  const formValuesRef = useRef({});

  const triggerPeakupLineItems = useCallback(
    (sessionsArg, valuesMaybe) => {
      if (!peakupMultiSlotBooking || !sessionsArg?.length || fetchLineItemsInProgress) {
        return;
      }
      const mergedValues = valuesMaybe || formValuesRef.current;
      const span = peakupTimespanDatesFromSessions(sessionsArg);
      if (!span) {
        return;
      }
      const seatsRaw = mergedValues?.seats;
      const seatsMaybe = seatsEnabled && seatsRaw > 0 ? { seats: parseInt(seatsRaw, 10) } : {};

      const priceVariantMaybe = mergedValues.priceVariantName
        ? { priceVariantName: mergedValues.priceVariantName }
        : {};

      onFetchTransactionLineItems({
        orderData: {
          bookingStart: span.bookingStart,
          bookingEnd: span.bookingEnd,
          peakupSessionCount: sessionsArg.length,
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

  const initialValuesMaybe =
    priceVariants.length > 1 && preselectedPriceVariant
      ? { initialValues: { priceVariantName: preselectedPriceVariant?.name } }
      : priceVariants.length === 1
      ? { initialValues: { priceVariantName: priceVariants?.[0]?.name || null } }
      : {};

  const minDurationStartingInInterval = priceVariants.reduce((min, priceVariant) => {
    return Math.min(min, priceVariant.bookingLengthInMinutes);
  }, Number.MAX_SAFE_INTEGER);
  const classes = classNames(rootClassName || css.root, className);

  return (
    <FinalForm
      {...initialValuesMaybe}
      {...rest}
      unitPrice={unitPrice}
      onSubmit={values => {
        if (peakupMultiSlotBooking) {
          if (!peakupSessions.length) {
            setPeakupSubmitMissing(true);
            return;
          }
          setPeakupSubmitMissing(false);
          return onSubmit({
            ...values,
            peakupBookingSlots: peakupSessions,
            peakupBookingHoldId: peakupHoldIdRef.current || undefined,
          });
        }
        return onSubmit(values);
      }}
      render={formRenderProps => {
        const {
          startDatePlaceholder,
          form,
          pristine,
          handleSubmit,
          listingId,
          startTimeInterval,
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
                const span = peakupTimespanDatesFromSessions(peakupSessions);
                return span ? { startDate: span.bookingStart, endDate: span.bookingEnd } : null;
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
        const submitDisabled =
          (isPriceVariationsInUse && !isPublishedListing) ||
          (peakupMultiSlotBooking ? peakupSessions.length === 0 : false);

        const addPeakupSessionFromPicker = () => {
          setPeakupSubmitMissing(false);
          if (!(startTime && endTime && priceVariantName && startDate && endDate)) {
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
            window.requestAnimationFrame(() => triggerPeakupLineItems(next, values));
            return next;
          });
        };

        const removePeakupSession = index => {
          setPeakupSessions(prev => {
            const next = prev.filter((_, i) => i !== index);
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
            setPeakupSubmitMissing(false);
          }
          const fn = onPriceVariantChange(formRenderProps);
          fn(pv);
        };

        const seatsBlocked = peakupMultiSlotBooking ? !peakupSessions.length : !startTime;

        return (
          <Form onSubmit={handleSubmit} className={classes} enforcePagePreloadFor="CheckoutPage">
            <PriceVariantFieldComponent
              priceVariants={priceVariants}
              priceVariantName={priceVariantName}
              onPriceVariantChange={onPriceVariantChangeWrapped}
              disabled={!isPublishedListing}
            />

            {monthlyTimeSlots && timeZone ? (
              <FieldDateAndTimeInput
                seatsEnabled={seatsEnabled}
                setSeatsOptions={setSeatsOptions}
                startDateInputProps={{
                  label: intl.formatMessage({ id: 'BookingFixedDurationForm.bookingStartTitle' }),
                  placeholderText: startDatePlaceholder,
                }}
                className={css.bookingDates}
                listingId={listingId}
                startTimeInterval={startTimeInterval}
                onFetchTimeSlots={onFetchTimeSlots}
                monthlyTimeSlots={monthlyTimeSlots}
                timeSlotsForDate={timeSlotsForDate}
                minDurationStartingInInterval={minDurationStartingInInterval}
                values={values}
                priceVariants={priceVariants}
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
                  <FormattedMessage id="BookingFixedDurationForm.peakupAddSession" />
                </SecondaryButton>

                <h6 className={css.peakupSessionsHeading}>
                  <FormattedMessage id="BookingFixedDurationForm.peakupSelectedSessionsTitle" />
                </h6>
                {!peakupSessions.length ? (
                  <p className={css.peakupSessionsHint}>
                    <FormattedMessage id="BookingFixedDurationForm.peakupEmptyCartHint" />
                  </p>
                ) : (
                  <ul className={css.peakupSessionsList}>
                    {peakupSessions.map((sess, idx) => (
                      <li
                        key={`${sess.bookingStartTime}-${sess.bookingEndTime}-${idx}`}
                        className={css.peakupSessionRow}
                      >
                        <span className={css.peakupSessionSummary}>
                          {formatPeakupSessionSummary(intl, timeZone, sess)}
                        </span>
                        <InlineTextButton
                          type="button"
                          className={css.peakupRemoveBtn}
                          onClick={() => removePeakupSession(idx)}
                        >
                          <FormattedMessage id="BookingFixedDurationForm.peakupRemoveSession" />
                        </InlineTextButton>
                      </li>
                    ))}
                  </ul>
                )}
                {peakupSubmitMissing ? (
                  <p className={css.peakupSubmitError} role="alert">
                    <FormattedMessage id="BookingFixedDurationForm.peakupSubmitRequiresSessions" />
                  </p>
                ) : null}
              </div>
            ) : null}

            {seatsEnabled ? (
              <FieldSelect
                name="seats"
                id="seats"
                disabled={seatsBlocked}
                showLabelAsDisabled={seatsBlocked}
                label={intl.formatMessage({ id: 'BookingFixedDurationForm.seatsTitle' })}
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
                      bookingStartTime: startTime,
                      bookingEndTime: endTime,
                      seats: seatsChoice,
                    },
                  });
                }}
              >
                <option disabled value="">
                  {intl.formatMessage({ id: 'BookingFixedDurationForm.seatsPlaceholder' })}
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
                  <FormattedMessage id="BookingFixedDurationForm.priceBreakdownTitle" />
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

            <FetchLineItemsError error={fetchLineItemsError} />

            <div className={css.submitButton}>
              <PrimaryButton
                type="submit"
                inProgress={fetchLineItemsInProgress}
                disabled={submitDisabled}
              >
                <FormattedMessage id="BookingFixedDurationForm.requestToBook" />
              </PrimaryButton>
            </div>

            <FinePrint
              payoutDetailsWarning={payoutDetailsWarning}
              isOwnListing={isOwnListingForm}
            />
          </Form>
        );
      }}
    />
  );
};

export default BookingFixedDurationForm;
