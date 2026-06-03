import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isPeakUpMultiDayPurchaseTransaction } from '../../util/peakUpMultiDayPurchase';

import { NamedLink } from '../NamedLink/NamedLink';

import dashboardCss from '../../containers/CoachDashboardPage/CoachDashboardPage.module.css';
import css from './BookingsSummaryCard.module.css';

const isLessonBookingEntry = entry =>
  !isPeakUpMultiDayPurchaseTransaction(entry?.transaction);

const countLessonBookingSegments = (segments = {}, { lessonsOnly = false } = {}) => {
  const filterLessons = entries => (entries || []).filter(isLessonBookingEntry);

  const upcomingCount = filterLessons(segments.upcoming).length;
  const pendingEntries = [...(segments.pending || []), ...(segments.pendingReview || [])];
  const pendingCount = lessonsOnly ? filterLessons(pendingEntries).length : pendingEntries.length;
  const pastCount = lessonsOnly
    ? filterLessons(segments.past).length
    : (segments.past || []).length;

  return { upcomingCount, pendingCount, pastCount };
};

/**
 * Compact dashboard card — booking segment counts with link to the full booking view.
 *
 * @param {Object} props
 * @param {Object} [props.segments]
 * @param {boolean} [props.loading]
 * @param {string} [props.className]
 * @param {string} props.linkName
 * @param {string} props.titleId
 * @param {string} props.hintId
 * @param {string} [props.ctaId]
 * @param {string} [props.summaryUpcomingId]
 * @param {string} [props.summaryPendingId]
 * @param {string} [props.summaryPastId]
 * @param {boolean} [props.excludeMultiDayFromPast] When true, counts only default-booking
 *   lessons — excludes multi-day experiences from upcoming, pending, and past.
 */
const BookingsSummaryCard = props => {
  const intl = useIntl();
  const {
    segments,
    loading = false,
    className,
    linkName,
    titleId,
    hintId,
    ctaId = 'CoachDashboardPage.cardBookingsOpen',
    summaryUpcomingId = 'PeakUpBookingDashboard.summaryUpcoming',
    summaryPendingId = 'PeakUpBookingDashboard.summaryPending',
    summaryPastId = 'PeakUpBookingDashboard.summaryPast',
    excludeMultiDayFromPast = false,
  } = props;

  const { upcomingCount, pendingCount, pastCount } = countLessonBookingSegments(segments, {
    lessonsOnly: excludeMultiDayFromPast,
  });

  const summaryLabel = intl.formatMessage({ id: 'PeakUpBookingDashboard.summaryAria' });

  return (
    <NamedLink className={classNames(dashboardCss.card, css.card, className)} name={linkName}>
      <span className={classNames(dashboardCss.cardIcon, css.bookingsCardIcon)} aria-hidden="true">
        <span className={css.iconGlyph}>📅</span>
      </span>
      <h2 className={dashboardCss.cardTitle}>
        <FormattedMessage id={titleId} defaultMessage="My Bookings" />
      </h2>
      <p className={dashboardCss.cardHint}>
        <FormattedMessage
          id={hintId}
          defaultMessage="Upcoming lessons, pending requests, and past sessions."
        />
      </p>
      <ul className={css.stats} aria-label={summaryLabel}>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id={summaryUpcomingId} defaultMessage="Upcoming lessons" />
          </span>
          <span className={css.statValue}>{loading ? '—' : upcomingCount}</span>
        </li>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id={summaryPendingId} defaultMessage="Pending requests" />
          </span>
          <span className={css.statValue}>{loading ? '—' : pendingCount}</span>
        </li>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id={summaryPastId} defaultMessage="Past lessons" />
          </span>
          <span className={css.statValue}>{loading ? '—' : pastCount}</span>
        </li>
      </ul>
      <span className={dashboardCss.cardCta}>
        <FormattedMessage id={ctaId} defaultMessage="Open bookings" />
      </span>
    </NamedLink>
  );
};

export default BookingsSummaryCard;
