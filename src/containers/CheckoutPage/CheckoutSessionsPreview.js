import React, { useMemo } from 'react';
import classNames from 'classnames';

import { FormattedDate, FormattedMessage } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import {
  DATE_TYPE_DATETIME,
  LINE_ITEM_DAY,
  LINE_ITEM_HOUR,
  LINE_ITEM_NIGHT,
  LISTING_UNIT_TYPES,
} from '../../util/types';
import { subtractTime } from '../../util/dates';

import css from './CheckoutPage.module.css';

const datePartOpts = timeZone => (timeZone ? { timeZone } : {});

const timePartOpts = timeZone => ({
  hour: 'numeric',
  minute: 'numeric',
  ...datePartOpts(timeZone),
});

const sessionDateOpts = timeZone => ({
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  ...datePartOpts(timeZone),
});

/**
 * @param {Date} start
 * @param {Date} end
 * @returns {string|null}
 */
const formatDurationBetween = (start, end, unitCode) => {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return null;

  if (unitCode === LINE_ITEM_DAY || unitCode === LINE_ITEM_NIGHT) {
    const days = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
    return `${days}${unitCode === LINE_ITEM_NIGHT ? ' night' : ' day'}${days === 1 ? '' : 's'}`;
  }

  const hours = ms / (1000 * 60 * 60);
  if (hours >= 1 && Math.abs(hours - Math.round(hours)) < 0.02) {
    return `${Math.round(hours)}h`;
  }
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
};

/**
 * @param {Array} lineItems
 * @returns {{ lineTotal: object, code: string }|null}
 */
const getUnitPurchaseFromLineItems = lineItems => {
  if (!Array.isArray(lineItems)) return null;
  const unitLineItem = lineItems.find(
    item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal
  );
  return unitLineItem || null;
};

/**
 * @param {Object} booking
 * @param {string} unitCode
 */
const bookingToSessionRange = (booking, unitCode) => {
  if (!booking?.attributes) return null;
  const { start, end, displayStart, displayEnd } = booking.attributes;
  const localStart = new Date(displayStart || start);
  const localEndRaw = new Date(displayEnd || end);
  if (Number.isNaN(localStart.getTime()) || Number.isNaN(localEndRaw.getTime())) return null;

  const showInclusiveEndDate = unitCode === LINE_ITEM_DAY;
  const localEnd = showInclusiveEndDate ? subtractTime(localEndRaw, 1, 'days') : localEndRaw;

  return { start: localStart, end: localEnd };
};

/**
 * Visual-only session rows for PeakUp checkout summary (single session today; list-ready for multi-slot).
 *
 * @param {Object} props
 * @param {propTypes.booking} [props.booking]
 * @param {{ bookingStart?: string, bookingEnd?: string }} [props.bookingDates] - checkout session storage dates before speculate tx
 * @param {Array<{bookingStart?: string, bookingEnd?: string}>} [props.peakupBookingSlots]
 * @param {string} [props.timeZone]
 * @param {string} props.dateType
 * @param {Array} [props.lineItems]
 * @param {import('react-intl').intlShape} props.intl
 * @param {string} [props.className]
 */
const CheckoutSessionsPreview = props => {
  const { booking, bookingDates, peakupBookingSlots, timeZone, dateType, lineItems, intl, className } =
    props;

  const showTimes = dateType === DATE_TYPE_DATETIME;
  const unitPurchase = getUnitPurchaseFromLineItems(lineItems);
  const unitCode = unitPurchase?.code || LINE_ITEM_HOUR;
  const sessionPrice = unitPurchase?.lineTotal
    ? formatMoney(intl, unitPurchase.lineTotal)
    : null;

  const rows = useMemo(() => {
    const slotRows = (Array.isArray(peakupBookingSlots) ? peakupBookingSlots : [])
      .map((slot, idx) => {
        const startRaw = slot?.bookingStart;
        const endRaw = slot?.bookingEnd;
        if (!startRaw || !endRaw) return null;
        const start = new Date(startRaw);
        const end = new Date(endRaw);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
        return {
          id: `slot-${start.getTime()}-${idx}`,
          start,
          end,
          durationLabel: formatDurationBetween(start, end, unitCode),
        };
      })
      .filter(Boolean);

    if (slotRows.length > 0) {
      return slotRows;
    }

    const range = bookingToSessionRange(booking, unitCode);
    if (range) {
      return [
        {
          id: `booking-${range.start.getTime()}`,
          start: range.start,
          end: range.end,
          durationLabel: formatDurationBetween(range.start, range.end, unitCode),
        },
      ];
    }

    const startRaw = bookingDates?.bookingStart ?? bookingDates?.startDate;
    const endRaw = bookingDates?.bookingEnd ?? bookingDates?.endDate;
    if (startRaw && endRaw) {
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return [
          {
            id: `order-dates-${start.getTime()}`,
            start,
            end,
            durationLabel: formatDurationBetween(start, end, unitCode),
          },
        ];
      }
    }

    return [];
  }, [booking, bookingDates, peakupBookingSlots, unitCode]);

  if (!rows.length) {
    return null;
  }

  return (
    <section className={classNames(css.sessionsSection, className)} aria-labelledby="checkout-sessions-heading">
      <h3 id="checkout-sessions-heading" className={css.sessionsHeading}>
        <FormattedMessage id="CheckoutPage.sessionsHeading" />
      </h3>
      <ul className={css.sessionsList}>
        {rows.map(row => (
          <li key={row.id} className={css.sessionRow}>
            <span className={css.sessionDate}>
              <FormattedDate value={row.start} {...sessionDateOpts(timeZone)} />
            </span>
            {showTimes ? (
              <>
                <span className={css.sessionSep} aria-hidden>
                  ·
                </span>
                <span className={css.sessionTimes}>
                  <FormattedDate value={row.start} {...timePartOpts(timeZone)} />
                  <span className={css.sessionTimeDash}>–</span>
                  <FormattedDate value={row.end} {...timePartOpts(timeZone)} />
                </span>
              </>
            ) : null}
            {row.durationLabel ? (
              <>
                <span className={css.sessionSep} aria-hidden>
                  ·
                </span>
                <span className={css.sessionDuration}>{row.durationLabel}</span>
              </>
            ) : null}
            {sessionPrice ? (
              <>
                <span className={css.sessionSep} aria-hidden>
                  ·
                </span>
                <span className={css.sessionPrice}>{sessionPrice}</span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CheckoutSessionsPreview;
