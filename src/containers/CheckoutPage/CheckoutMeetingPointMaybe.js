import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';
import { peakupMeetingPointForProtectedData } from '../../util/peakupMeetingPoint';

import css from './CheckoutPage.module.css';

/**
 * Meeting point summary on PeakUp checkout (sessions block area).
 *
 * @param {Object} props
 * @param {Object} [props.peakupMeetingPoint]
 * @param {string} [props.className]
 */
const CheckoutMeetingPointMaybe = props => {
  const { peakupMeetingPoint, className } = props;
  const stored = peakupMeetingPointForProtectedData(peakupMeetingPoint);

  if (!stored) {
    return null;
  }

  const notesTrimmed = stored.notes != null ? String(stored.notes).trim() : '';

  return (
    <section
      className={classNames(css.meetingPointSection, className)}
      aria-labelledby="checkout-meeting-point-heading"
    >
      <h3 id="checkout-meeting-point-heading" className={css.meetingPointHeading}>
        <FormattedMessage id="CheckoutPage.meetingPointHeading" />
      </h3>
      <p className={css.meetingPointLabel}>{stored.label}</p>
      {stored.address ? <p className={css.meetingPointAddress}>{stored.address}</p> : null}
      {notesTrimmed ? <p className={css.meetingPointNotes}>{notesTrimmed}</p> : null}
    </section>
  );
};

export default CheckoutMeetingPointMaybe;
