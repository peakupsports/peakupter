import React, { useMemo } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  googleMapsDirectionsUrlForMeetingPoint,
  peakupMeetingPointForProtectedData,
} from '../../../util/peakupMeetingPoint';
import { getMapProviderApiAccess, staticPeakUpMeetingPointMapImageUrl } from '../../../util/maps';

const DEFAULT_MEETING_POINT_STATIC_ZOOM = 14;

import { Avatar, ExternalLink } from '../../../components';

import breakdownCss from '../../../components/OrderBreakdown/OrderBreakdown.module.css';
import css from './PeakUpMeetingPointMapCard.module.css';

/**
 * Compact PeakUp mini-map for TransactionPage Location (static Mapbox, directions CTA).
 *
 * @param {Object} props
 * @param {Object} props.meetingPoint Normalized `peakupMeetingPoint`
 * @param {propTypes.user} props.provider Transaction provider (coach)
 * @param {Object} props.mapsConfig
 * @param {string} [props.className]
 */
const PeakUpMeetingPointMapCard = props => {
  const { meetingPoint: meetingPointRaw, provider, mapsConfig, className } = props;
  const intl = useIntl();
  const meetingPoint = peakupMeetingPointForProtectedData(meetingPointRaw);

  const lat = meetingPoint?.lat;
  const lng = meetingPoint?.lng;
  const hasCoords =
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const directionsUrl = googleMapsDirectionsUrlForMeetingPoint(meetingPoint);
  const mapZoom =
    typeof meetingPoint?.zoom === 'number' && Number.isFinite(meetingPoint.zoom)
      ? meetingPoint.zoom
      : DEFAULT_MEETING_POINT_STATIC_ZOOM;

  const mapSrc = useMemo(() => {
    if (!hasCoords || !mapsConfig || !getMapProviderApiAccess(mapsConfig)) {
      return null;
    }
    return staticPeakUpMeetingPointMapImageUrl(
      mapsConfig,
      { lat, lng },
      null,
      { width: 640, height: 360 },
      mapZoom
    );
  }, [hasCoords, mapsConfig, lat, lng, mapZoom]);

  if (!meetingPoint || !hasCoords || !mapSrc) {
    return null;
  }

  const mapAlt = intl.formatMessage(
    { id: 'TransactionPanel.peakUpMeetingPointMapAlt' },
    { place: meetingPoint.label }
  );

  return (
    <div className={classNames(breakdownCss.peakUpTheme, className)}>
      <div className={breakdownCss.peakupPreBookingWrap}>
        <div className={breakdownCss.peakupPreBookingHeading}>
          <FormattedMessage id="TransactionPanel.bookingLocationHeading" />
        </div>
        <p className={css.mapMeetHint}>
          <FormattedMessage id="TransactionPanel.peakUpMeetingPointMapHint" />
        </p>

        <div className={css.mapCard}>
          <div className={css.mapFrame}>
            <img
              className={css.mapImage}
              src={mapSrc}
              alt={mapAlt}
              loading="lazy"
              decoding="async"
              width={640}
              height={360}
            />
            <div className={css.mapOverlay} aria-hidden />
            <div className={css.mapPinBadge} aria-hidden>
              <span className={css.mapPinDot} />
              <span className={css.mapPinLabel}>{meetingPoint.label}</span>
            </div>
            {provider?.id ? (
              <div className={css.coachAvatarMarker} aria-hidden>
                <Avatar user={provider} disableProfileLink />
              </div>
            ) : null}
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

          {directionsUrl ? (
            <ExternalLink
              className={css.mapCtaLink}
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FormattedMessage id="TransactionPanel.peakUpMapDirections" />
            </ExternalLink>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PeakUpMeetingPointMapCard;
