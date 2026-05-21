import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { Heading } from '../../../components';
import { peakupMeetingPointForProtectedData } from '../../../util/peakupMeetingPoint';

import AddressLinkMaybe from './AddressLinkMaybe';
import PeakUpMeetingPointMapCard from './PeakUpMeetingPointMapCard';

import breakdownCss from '../../../components/OrderBreakdown/OrderBreakdown.module.css';
import css from './TransactionPanel.module.css';

/**
 * Booking location on TransactionPage. PeakUp: mini-map when meeting point has coordinates;
 * otherwise text-only address. Non-PeakUp: listing location + Google Maps link.
 */
const BookingLocationMaybe = props => {
  const {
    className,
    rootClassName,
    listing,
    provider,
    protectedData,
    showBookingLocation,
    isPeakUpBookingTheme = false,
    mapsConfig,
  } = props;

  const classes = classNames(rootClassName || css.bookingLocationContainer, className);
  const meetingPoint = peakupMeetingPointForProtectedData(protectedData?.peakupMeetingPoint);
  const hasMeetingCoords =
    meetingPoint &&
    typeof meetingPoint.lat === 'number' &&
    typeof meetingPoint.lng === 'number' &&
    Number.isFinite(meetingPoint.lat) &&
    Number.isFinite(meetingPoint.lng);

  if (isPeakUpBookingTheme && meetingPoint) {
    if (hasMeetingCoords && showBookingLocation) {
      return (
        <PeakUpMeetingPointMapCard
          className={classes}
          meetingPoint={meetingPoint}
          provider={provider}
          listing={listing}
          mapsConfig={mapsConfig}
        />
      );
    }

    if (showBookingLocation) {
      return (
        <div className={classNames(breakdownCss.peakUpTheme, classes)}>
          <div className={breakdownCss.peakupPreBookingWrap}>
            <div className={breakdownCss.peakupPreBookingHeading}>
              <FormattedMessage id="TransactionPanel.bookingLocationHeading" />
            </div>
            <dl className={breakdownCss.peakupPreBookingList}>
              <div className={breakdownCss.peakupPreBookingRow}>
                <dt className={breakdownCss.peakupPreBookingLabel}>
                  <FormattedMessage id="OrderBreakdown.peakupMeetingPointLabel" />
                </dt>
                <dd className={breakdownCss.peakupPreBookingValue}>{meetingPoint.label}</dd>
              </div>
              {meetingPoint.address ? (
                <div className={breakdownCss.peakupPreBookingRow}>
                  <dt className={breakdownCss.peakupPreBookingLabel}>
                    <FormattedMessage id="OrderBreakdown.peakupMeetingPointAddress" />
                  </dt>
                  <dd className={breakdownCss.peakupPreBookingValue}>{meetingPoint.address}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>
      );
    }

    return null;
  }

  if (showBookingLocation) {
    const location = listing?.attributes?.publicData?.location || {};
    return (
      <div className={classes}>
        <Heading as="h3" rootClassName={css.sectionHeading}>
          <FormattedMessage id="TransactionPanel.bookingLocationHeading" />
        </Heading>
        <div className={css.bookingLocationContent}>
          <AddressLinkMaybe
            linkRootClassName={css.bookingLocationAddress}
            location={location}
            geolocation={listing?.attributes?.geolocation}
            showAddress={true}
          />
        </div>
      </div>
    );
  }

  return null;
};

export default BookingLocationMaybe;
