import React from 'react';

import { formatMoney } from '../../util/currency';
import { propTypes } from '../../util/types';
import { formatProfileSportsForSticker } from '../../util/profileCoachSticker';
import {
  DATE_TYPE_DATE,
  DATE_TYPE_DATETIME,
  LINE_ITEM_FIXED,
  LINE_ITEM_HOUR,
  LISTING_UNIT_TYPES,
} from '../../util/types';

import { AvatarMedium } from '../../components';

import CheckoutSessionsPreview from './CheckoutSessionsPreview';
import CheckoutMeetingPointMaybe from './CheckoutMeetingPointMaybe';

import css from './CheckoutPage.module.css';

/**
 * Compact luxury booking summary for PeakUp checkout (desktop).
 *
 * @component
 * @param {Object} props
 * @param {propTypes.listing} props.listing - The listing
 * @param {propTypes.user} props.author - The author
 * @param {ReactNode} props.speculateTransactionErrorMessage - The speculate transaction error message
 * @param {boolean} props.showPrice - Whether to show the price (inquiry only)
 * @param {ReactNode} props.breakdown - The breakdown
 * @param {intlShape} props.intl - The intl object
 * @param {propTypes.booking} [props.booking]
 * @param {string} [props.timeZone]
 * @param {Array} [props.lineItems]
 * @param {Array} [props.peakupBookingSlots]
 */
const DetailsSideCard = props => {
  const {
    listing,
    author,
    speculateTransactionErrorMessage,
    showPrice,
    breakdown,
    intl,
    booking,
    timeZone,
    lineItems,
    peakupBookingSlots,
    peakupMeetingPoint,
  } = props;

  const { price, publicData } = listing?.attributes || {};
  const sportsFormatted = formatProfileSportsForSticker(intl, publicData?.sports);
  const primarySport = sportsFormatted.length > 0 ? sportsFormatted[0] : null;
  const coachName = author?.attributes?.profile?.displayName;

  const unitLineItem = Array.isArray(lineItems)
    ? lineItems.find(item => LISTING_UNIT_TYPES.includes(item.code) && !item.reversal)
    : null;
  const lineItemUnitType = unitLineItem?.code;
  const dateType = [LINE_ITEM_HOUR, LINE_ITEM_FIXED].includes(lineItemUnitType)
    ? DATE_TYPE_DATETIME
    : DATE_TYPE_DATE;

  return (
    <aside className={css.summaryColumnDesktop} role="complementary">
      <div className={css.detailsContainerDesktop}>
        <div className={css.summaryCoachHeader}>
          <div className={css.summaryAvatarFloat}>
            <AvatarMedium user={author} disableProfileLink />
          </div>
          <div className={css.summaryCoachMeta}>
            {coachName ? <p className={css.summaryCoachName}>{coachName}</p> : null}
            {primarySport ? (
              <div className={css.sportMeta}>
                <span className={css.sportMetaEmoji} aria-hidden>
                  {primarySport.emoji}
                </span>
                <span>{primarySport.label}</span>
              </div>
            ) : null}
            {showPrice && price ? (
              <p className={css.summaryListingPrice}>{formatMoney(intl, price)}</p>
            ) : null}
          </div>
        </div>

        {speculateTransactionErrorMessage}

        <CheckoutSessionsPreview
          booking={booking}
          peakupBookingSlots={peakupBookingSlots}
          timeZone={timeZone}
          dateType={dateType}
          lineItems={lineItems}
          intl={intl}
        />

        <CheckoutMeetingPointMaybe peakupMeetingPoint={peakupMeetingPoint} />

        {!!breakdown ? <div className={css.summaryTotalsBlock}>{breakdown}</div> : null}
      </div>
    </aside>
  );
};

export default DetailsSideCard;
