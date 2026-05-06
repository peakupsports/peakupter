import React from 'react';

import { FormattedDate, FormattedMessage } from '../../util/reactIntl';
import { DATE_TYPE_DATETIME } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * Lists individual PeakUp coaching sessions saved on the transaction protectedData (or checkout session).
 *
 * @param {{ peakupBookingSlots?: Array<{ bookingStart?: string|null, bookingEnd?: string|null }>|null }} props
 */
const LineItemPeakUpSessionsMaybe = ({ peakupBookingSlots, timeZone, dateType }) => {
  if (!Array.isArray(peakupBookingSlots) || peakupBookingSlots.length === 0) {
    return null;
  }

  const timeZoneMaybe = timeZone ? { timeZone } : null;
  const showTimes = dateType === DATE_TYPE_DATETIME;

  const validSlots = peakupBookingSlots
    .map(slot => {
      const startRaw = slot?.bookingStart;
      const endRaw = slot?.bookingEnd;
      if (!startRaw || !endRaw) return null;
      const start = new Date(startRaw);
      const end = new Date(endRaw);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
      return { start, end };
    })
    .filter(Boolean);

  if (!validSlots.length) return null;

  const datePartOpts = { weekday: 'short', month: 'short', day: 'numeric', ...timeZoneMaybe };
  const timePartOpts = { hour: 'numeric', minute: 'numeric', ...timeZoneMaybe };

  return (
    <div className={css.peakupSessionsWrap}>
      <div className={css.peakupSessionsHeading}>
        <FormattedMessage id="OrderBreakdown.peakupSessionsTitle" />
      </div>
      <ul className={css.peakupSessionsList}>
        {validSlots.map((slot, idx) => (
          <li
            key={`${slot.start.getTime()}-${slot.end.getTime()}-${idx}`}
            className={css.peakupSessionLine}
          >
            <span className={css.peakupSessionLineDate}>
              <FormattedDate value={slot.start} {...datePartOpts} />
            </span>
            {showTimes ? (
              <span className={css.peakupSessionLineTimes}>
                {' '}
                <FormattedDate value={slot.start} {...timePartOpts} />
                {' – '}
                <FormattedDate value={slot.end} {...timePartOpts} />
              </span>
            ) : (
              <span className={css.peakupSessionLineTimes}>
                {' '}
                <FormattedMessage id="OrderBreakdown.peakupSessionsThrough" />{' '}
                <FormattedDate value={slot.end} {...datePartOpts} />
              </span>
            )}
          </li>
        ))}
      </ul>
      <hr className={css.totalDivider} />
    </div>
  );
};

export default LineItemPeakUpSessionsMaybe;
