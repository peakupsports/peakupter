import React, { useMemo } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isPeakUpMultiDayPurchaseTransaction } from '../../util/peakUpMultiDayPurchase';
import { getPeakUpMultiDayExperiencePhase } from '../../util/peakUpCoachBookingTransaction';
import { NamedLink } from '../NamedLink/NamedLink';

import dashboardCss from '../../containers/CoachDashboardPage/CoachDashboardPage.module.css';
import bookingsCardCss from '../BookingsSummaryCard/BookingsSummaryCard.module.css';
import css from './MultiDayExperiencesSummaryCard.module.css';

const isMultiDayExperienceEntry = entry =>
  isPeakUpMultiDayPurchaseTransaction(entry?.transaction);

const countMultiDayExperienceSegments = (segments = {}) => {
  const experiences = (segments.multiDayExperiences || []).filter(isMultiDayExperienceEntry);
  const pastEntries = (segments.past || []).filter(isMultiDayExperienceEntry);
  const reviewEntries = (segments.pendingReview || []).filter(isMultiDayExperienceEntry);

  let upcomingCount = 0;
  let activeCount = reviewEntries.length;

  experiences.forEach(entry => {
    const phase = getPeakUpMultiDayExperiencePhase(entry.transaction);

    if (phase === 'upcoming') {
      upcomingCount += 1;
      return;
    }

    if (phase === 'active' || phase == null) {
      activeCount += 1;
    }
  });

  return {
    upcomingCount,
    activeCount,
    pastCount: pastEntries.length,
  };
};

/**
 * Coach dashboard card — events (camps, clinics, retreats, multi-day experiences).
 *
 * @param {Object} props
 * @param {Object} [props.segments]
 * @param {boolean} [props.loading]
 * @param {string} [props.className]
 * @param {string} props.linkName
 */
const MultiDayExperiencesSummaryCard = props => {
  const intl = useIntl();
  const { segments, loading = false, className, linkName = 'CoachDashboardEventsPage' } = props;

  const { upcomingCount, activeCount, pastCount } = useMemo(
    () => countMultiDayExperienceSegments(segments),
    [segments]
  );

  const summaryLabel = intl.formatMessage({
    id: 'CoachDashboardPage.cardEventsSummaryAria',
    defaultMessage: 'Events summary',
  });

  return (
    <NamedLink className={classNames(dashboardCss.card, css.card, className)} name={linkName}>
      <span className={classNames(dashboardCss.cardIcon, css.cardIcon)} aria-hidden="true">
        <span className={css.iconGlyph}>⛺</span>
      </span>
      <h2 className={dashboardCss.cardTitle}>
        <FormattedMessage
          id="CoachDashboardPage.cardEventsTitle"
          defaultMessage="Events"
        />
      </h2>
      <p className={dashboardCss.cardHint}>
        <FormattedMessage
          id="CoachDashboardPage.cardEventsHint"
          defaultMessage="Camps, clinics, retreats and multi-day experiences."
        />
      </p>
      <ul className={bookingsCardCss.stats} aria-label={summaryLabel}>
        <li className={bookingsCardCss.statRow}>
          <span className={bookingsCardCss.statLabel}>
            <FormattedMessage
              id="CoachDashboardPage.cardEventsSummaryUpcoming"
              defaultMessage="Upcoming events"
            />
          </span>
          <span className={bookingsCardCss.statValue}>{loading ? '—' : upcomingCount}</span>
        </li>
        <li className={bookingsCardCss.statRow}>
          <span className={bookingsCardCss.statLabel}>
            <FormattedMessage
              id="CoachDashboardPage.cardEventsSummaryActive"
              defaultMessage="Active events"
            />
          </span>
          <span className={bookingsCardCss.statValue}>{loading ? '—' : activeCount}</span>
        </li>
        <li className={bookingsCardCss.statRow}>
          <span className={bookingsCardCss.statLabel}>
            <FormattedMessage
              id="CoachDashboardPage.cardEventsSummaryPast"
              defaultMessage="Past events"
            />
          </span>
          <span className={bookingsCardCss.statValue}>{loading ? '—' : pastCount}</span>
        </li>
      </ul>
      <span className={dashboardCss.cardCta}>
        <FormattedMessage
          id="CoachDashboardPage.cardEventsOpen"
          defaultMessage="Open events"
        />
      </span>
    </NamedLink>
  );
};

export default MultiDayExperiencesSummaryCard;
