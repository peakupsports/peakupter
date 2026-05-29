import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';

import { NamedLink } from '../NamedLink/NamedLink';

import dashboardCss from '../../containers/CoachDashboardPage/CoachDashboardPage.module.css';
import css from './BookingsSummaryCard.module.css';

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
    ctaId = 'CoachDashboardPage.cardOpen',
  } = props;

  const upcomingCount = segments?.upcoming?.length || 0;
  const pendingCount =
    (segments?.pending?.length || 0) + (segments?.pendingReview?.length || 0);
  const pastCount = segments?.past?.length || 0;

  const summaryLabel = intl.formatMessage({ id: 'PeakUpBookingDashboard.summaryAria' });

  return (
    <NamedLink className={classNames(dashboardCss.card, css.card, className)} name={linkName}>
      <span className={classNames(dashboardCss.cardIcon, css.bookingsCardIcon)} aria-hidden="true">
        <span className={css.iconGlyph}>📅</span>
      </span>
      <h2 className={dashboardCss.cardTitle}>
        <FormattedMessage id={titleId} />
      </h2>
      <p className={dashboardCss.cardHint}>
        <FormattedMessage id={hintId} />
      </p>
      <ul className={css.stats} aria-label={summaryLabel}>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id="PeakUpBookingDashboard.summaryUpcoming" />
          </span>
          <span className={css.statValue}>{loading ? '—' : upcomingCount}</span>
        </li>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id="PeakUpBookingDashboard.summaryPending" />
          </span>
          <span className={css.statValue}>{loading ? '—' : pendingCount}</span>
        </li>
        <li className={css.statRow}>
          <span className={css.statLabel}>
            <FormattedMessage id="PeakUpBookingDashboard.summaryPast" />
          </span>
          <span className={css.statValue}>{loading ? '—' : pastCount}</span>
        </li>
      </ul>
      <span className={dashboardCss.cardCta}>
        <FormattedMessage id={ctaId} />
      </span>
    </NamedLink>
  );
};

export default BookingsSummaryCard;
