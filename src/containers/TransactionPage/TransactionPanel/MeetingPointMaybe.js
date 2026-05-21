import React, { useEffect } from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { Heading } from '../../../components';
import LineItemPeakUpMeetingPointMaybe from '../../../components/OrderBreakdown/LineItemPeakUpMeetingPointMaybe';
import {
  logPeakupMeetingPointTransaction,
  peakupMeetingPointForProtectedData,
} from '../../../util/peakupMeetingPoint';

import breakdownCss from '../../../components/OrderBreakdown/OrderBreakdown.module.css';
import css from './TransactionPanel.module.css';

/**
 * Selected meeting point on TransactionPage (customer + provider).
 *
 * @param {Object} props
 * @param {Object} [props.protectedData]
 * @param {string} [props.className]
 * @param {string} [props.rootClassName]
 * @param {boolean} [props.peakUpTheme] Use PeakUp session card styling (label/value rows)
 */
const MeetingPointMaybe = props => {
  const { protectedData, className, rootClassName, peakUpTheme = false } = props;
  const stored = peakupMeetingPointForProtectedData(protectedData?.peakupMeetingPoint);

  useEffect(() => {
    if (stored) {
      logPeakupMeetingPointTransaction(stored);
    }
  }, [stored?.id]);

  if (!stored) {
    return null;
  }

  if (peakUpTheme) {
    return (
      <div className={classNames(breakdownCss.peakUpTheme, className)}>
        <LineItemPeakUpMeetingPointMaybe peakupMeetingPoint={protectedData?.peakupMeetingPoint} />
      </div>
    );
  }

  const classes = classNames(rootClassName || css.bookingLocationContainer, className);
  const notesTrimmed = stored.notes != null ? String(stored.notes).trim() : '';

  return (
    <div className={classes}>
      <Heading as="h3" rootClassName={css.meetingPointBlockHeading}>
        <FormattedMessage id="TransactionPanel.meetingPointHeading" />
      </Heading>
      <div className={classNames(css.bookingLocationContent, css.meetingPointContent)}>
        <p className={css.meetingPointLabel}>{stored.label}</p>
        {stored.address ? <p className={css.meetingPointAddress}>{stored.address}</p> : null}
        {notesTrimmed ? <p className={css.meetingPointNotes}>{notesTrimmed}</p> : null}
      </div>
    </div>
  );
};

export default MeetingPointMaybe;
