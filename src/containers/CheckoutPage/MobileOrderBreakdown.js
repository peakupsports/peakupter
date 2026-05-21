import React from 'react';

import { Heading } from '../../components';
import CheckoutSessionsPreview from './CheckoutSessionsPreview';
import css from './CheckoutPage.module.css';

const MobileOrderBreakdown = props => {
  const {
    breakdown,
    speculateTransactionErrorMessage,
    priceVariantName,
    booking,
    peakupBookingSlots,
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
      {speculateTransactionErrorMessage}
      {breakdown}
    </div>
  );
};

export default MobileOrderBreakdown;
