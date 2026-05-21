import React from 'react';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { peakupMeetingPointForProtectedData } from '../../util/peakupMeetingPoint';

import css from './OrderBreakdown.module.css';

/**
 * Selected coach meeting point on checkout / transaction breakdown.
 *
 * @param {{ peakupMeetingPoint?: Object|null }} props
 */
const LineItemPeakUpMeetingPointMaybe = ({ peakupMeetingPoint }) => {
  const intl = useIntl();
  const stored = peakupMeetingPointForProtectedData(peakupMeetingPoint);

  if (!stored) {
    return null;
  }

  const { label, address, notes } = stored;
  const notesTrimmed = notes != null ? String(notes).trim() : '';

  const rows = [
    label
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupMeetingPointLabel',
            defaultMessage: 'Place',
          }),
          value: label,
          valueClassName: css.peakupPreBookingValue,
        }
      : null,
    address
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupMeetingPointAddress',
            defaultMessage: 'Address',
          }),
          value: address,
          valueClassName: css.peakupPreBookingValue,
        }
      : null,
    notesTrimmed
      ? {
          label: intl.formatMessage({
            id: 'OrderBreakdown.peakupMeetingPointNotes',
            defaultMessage: 'Notes',
          }),
          value: notesTrimmed,
          valueClassName: css.peakupPreBookingValueNotes,
        }
      : null,
  ].filter(Boolean);

  if (!rows.length) {
    return null;
  }

  return (
    <div className={css.peakupPreBookingWrap}>
      <div className={css.peakupPreBookingHeading}>
        <FormattedMessage
          id="OrderBreakdown.peakupMeetingPointTitle"
          defaultMessage="Meeting point"
        />
      </div>
      <dl className={css.peakupPreBookingList}>
        {rows.map(row => (
          <div key={row.label} className={css.peakupPreBookingRow}>
            <dt className={css.peakupPreBookingLabel}>{row.label}</dt>
            <dd className={row.valueClassName}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <hr className={css.totalDivider} />
    </div>
  );
};

export default LineItemPeakUpMeetingPointMaybe;
