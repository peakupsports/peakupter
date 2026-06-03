import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { H6 } from '../../../components';

import css from './TransactionPanel.module.css';

// Functional component as a helper to build OrderBreakdown
const BreakdownMaybe = props => {
  const { className, rootClassName, orderBreakdown, processName, copyProcessName, priceVariantName, isPeakUpBookingTheme } =
    props;
  const displayProcessName = copyProcessName || processName;
  const classes = classNames(rootClassName || css.breakdownMaybe, className);

  return orderBreakdown ? (
    <div className={classes}>
      {priceVariantName ? (
        <div
          className={classNames(css.bookingPriceVariant, {
            [css.peakUpBookingPriceVariant]: isPeakUpBookingTheme,
          })}
        >
          <p>{priceVariantName}</p>
        </div>
      ) : null}

      <H6
        as="h3"
        className={classNames(css.orderBreakdownTitle, {
          [css.peakUpBookingBreakdownTitle]: isPeakUpBookingTheme,
        })}
      >
        <FormattedMessage id={`TransactionPanel.${displayProcessName}.orderBreakdownTitle`} />
      </H6>
      <hr
        className={classNames(css.totalDivider, {
          [css.peakUpBookingTotalDivider]: isPeakUpBookingTheme,
        })}
      />
      {orderBreakdown}
    </div>
  ) : null;
};

export default BreakdownMaybe;
