import React from 'react';

import { Heading } from '../../components';
import CheckoutSessionsPreview from './CheckoutSessionsPreview';
import CheckoutMeetingPointMaybe from './CheckoutMeetingPointMaybe';
import css from './CheckoutPage.module.css';

const MobileOrderBreakdown = props => {
  const {
    breakdown,
    speculateTransactionErrorMessage,
    priceVariantName,
    booking,
    peakupBookingSlots,
    peakupMeetingPoint,
    timeZone,
    dateType,
    lineItems,
    intl,
  } = props;

  return (
    <div className={css.priceBreakdownContainer}>
      {priceVariantName ? (
        <div className={css.bookingPriceVariantMobile}>
          <Heading as="h3" rootClassName={css.priceVariantNameMobile}>
            {priceVariantName}
          </Heading>
        </div>
      ) : null}
      <CheckoutSessionsPreview
        className={css.sessionsSectionMobile}
        booking={booking}
        peakupBookingSlots={peakupBookingSlots}
        timeZone={timeZone}
        dateType={dateType}
        lineItems={lineItems}
        intl={intl}
      />
      <CheckoutMeetingPointMaybe
        className={css.sessionsSectionMobile}
        peakupMeetingPoint={peakupMeetingPoint}
      />
      {speculateTransactionErrorMessage}
      {breakdown}
    </div>
  );
};

export default MobileOrderBreakdown;
