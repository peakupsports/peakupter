import React from 'react';

import { FormattedMessage } from '../../util/reactIntl';
import { peakupMeetingPointForProtectedData } from '../../util/peakupMeetingPoint';

import css from './OrderBreakdown.module.css';

/**
 * Selected coach meeting point on checkout / transaction breakdown.
 *
 * @param {{ peakupMeetingPoint?: Object|null }} props
 */
const LineItemPeakUpMeetingPointMaybe = ({ peakupMeetingPoint }) => {
  const stored = peakupMeetingPointForProtectedData(peakupMeetingPoint);

  if (!stored) {
    return null;
  }

  const { label, address, notes } = stored;
  const notesTrimmed = notes != null ? String(notes).trim() : '';

  return (
    <div className={css.peakupPreBookingWrap}>
      <div className={css.peakupPreBookingHeading}>
        <FormattedMessage
          id="OrderBreakdown.peakupMeetingPointTitle"
          defaultMessage="Meeting point"
        />
      </div>
      <dl className={css.peakupPreBookingList}>
        <div className={css.peakupPreBookingRow}>
          <dt className={css.peakupPreBookingLabel}>
            <FormattedMessage
              id="OrderBreakdown.peakupMeetingPointLabel"
              defaultMessage="Place"
            />
          </dt>
          <dd className={css.peakupPreBookingValue}>{label}</dd>
        </div>
        {address ? (
          <div className={css.peakupPreBookingRow}>
            <dt className={css.peakupPreBookingLabel}>
              <FormattedMessage
                id="OrderBreakdown.peakupMeetingPointAddress"
                defaultMessage="Address"
              />
            </dt>
            <dd className={css.peakupPreBookingValue}>{address}</dd>
          </div>
        ) : null}
        {notesTrimmed ? (
          <div className={css.peakupPreBookingRow}>
            <dt className={css.peakupPreBookingLabel}>
              <FormattedMessage
                id="OrderBreakdown.peakupMeetingPointNotes"
                defaultMessage="Notes"
              />
            </dt>
            <dd className={css.peakupPreBookingValue}>{notesTrimmed}</dd>
          </div>
        ) : null}
      </dl>
      <hr className={css.totalDivider} />
    </div>
  );
};

export default LineItemPeakUpMeetingPointMaybe;
