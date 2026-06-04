import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import {
  getTransactionCopyProcessName,
  isPeakUpMultiDayPurchaseTransaction,
} from '../../util/peakUpMultiDayPurchase';
import {
  getPeakUpCoachBookingSessionDates,
  getPeakUpMultiDayExperienceProtectedDates,
} from '../../util/peakUpCoachBookingTransaction';
import { getBookingProcessStateInfo } from '../../util/peakupBookingRequestPopup';
import {
  normalizeBookingDashboardSegmentsForDisplay,
  PEAKUP_DASHBOARD_MULTI_DAY_SECTION_ID,
} from '../../util/peakupBookingDashboard';
import { NamedLink } from '../NamedLink/NamedLink';
import UserDisplayName from '../UserDisplayName/UserDisplayName';

import css from './PeakUpBookingDashboardPanel.module.css';

/** Coach/customer bookings page — lessons and session requests only. */
export const PEAKUP_DASHBOARD_VIEW_LESSONS = 'lessons';

/** Coach events page — camps, clinics, retreats, purchase listings only. */
export const PEAKUP_DASHBOARD_VIEW_EVENTS = 'events';

/** Legacy combined layout (e.g. customer booking overview). */
export const PEAKUP_DASHBOARD_VIEW_ALL = 'all';

const isLessonTransaction = transaction =>
  !isPeakUpMultiDayPurchaseTransaction(transaction);

const isEventTransaction = transaction => isPeakUpMultiDayPurchaseTransaction(transaction);

const LESSONS_SECTION_CONFIG = [
  {
    key: 'upcoming',
    sourceKeys: ['upcoming'],
    titleId: 'PeakUpBookingDashboard.sectionLessonsUpcoming',
    defaultTitle: 'Upcoming lessons & sessions',
    accent: 'cyan',
    match: isLessonTransaction,
  },
  {
    key: 'pending',
    sourceKeys: ['pending'],
    titleId: 'PeakUpBookingDashboard.sectionPending',
    defaultTitle: 'Open requests & pending',
    accent: 'amber',
    match: isLessonTransaction,
  },
  {
    key: 'past',
    sourceKeys: ['past'],
    titleId: 'PeakUpBookingDashboard.sectionPast',
    defaultTitle: 'Past lessons',
    accent: 'neutral',
    match: isLessonTransaction,
  },
  {
    key: 'canceled',
    sourceKeys: ['canceled'],
    titleId: 'PeakUpBookingDashboard.sectionCanceled',
    defaultTitle: 'Canceled lessons',
    accent: 'danger',
    match: isLessonTransaction,
  },
];

const EVENTS_SECTION_CONFIG = [
  {
    key: 'multiDayExperiences',
    sourceKeys: ['multiDayExperiences'],
    titleId: 'PeakUpBookingDashboard.sectionUpcomingEvents',
    defaultTitle: 'Upcoming & active events',
    accent: 'emerald',
    match: isEventTransaction,
  },
  {
    key: 'pastEvents',
    sourceKeys: ['past'],
    titleId: 'PeakUpBookingDashboard.sectionPastEvents',
    defaultTitle: 'Past events',
    accent: 'neutral',
    match: isEventTransaction,
  },
  {
    key: 'canceledEvents',
    sourceKeys: ['canceled'],
    titleId: 'PeakUpBookingDashboard.sectionCanceledEvents',
    defaultTitle: 'Canceled events',
    accent: 'danger',
    match: isEventTransaction,
  },
];

const ALL_SECTION_CONFIG = [
  {
    key: 'upcoming',
    sourceKeys: ['upcoming'],
    titleId: 'PeakUpBookingDashboard.sectionLessonsUpcoming',
    defaultTitle: 'Upcoming lessons & sessions',
    accent: 'cyan',
    match: isLessonTransaction,
  },
  {
    key: 'multiDayExperiences',
    sourceKeys: ['multiDayExperiences'],
    titleId: 'PeakUpBookingDashboard.sectionUpcomingEvents',
    defaultTitle: 'Upcoming events',
    accent: 'emerald',
    match: isEventTransaction,
  },
  {
    key: 'pending',
    sourceKeys: ['pending'],
    titleId: 'PeakUpBookingDashboard.sectionPending',
    defaultTitle: 'Open requests & pending',
    accent: 'amber',
    match: null,
  },
  {
    key: 'pendingReview',
    sourceKeys: ['pendingReview'],
    titleId: 'PeakUpBookingDashboard.sectionReview',
    defaultTitle: 'Waiting for review',
    accent: 'violet',
    match: null,
  },
  {
    key: 'past',
    sourceKeys: ['past'],
    titleId: 'PeakUpBookingDashboard.sectionPast',
    defaultTitle: 'Past bookings',
    accent: 'neutral',
    match: null,
  },
  {
    key: 'canceled',
    sourceKeys: ['canceled'],
    titleId: 'PeakUpBookingDashboard.sectionCanceled',
    defaultTitle: 'Canceled bookings',
    accent: 'danger',
    match: null,
  },
];

const STATUS_BADGE_CLASS = {
  upcoming: css.statusUpcoming,
  multiDayExperiences: css.statusMultiDay,
  pending: css.statusPending,
  pendingReview: css.statusReview,
  past: css.statusPast,
  pastEvents: css.statusPast,
  canceled: css.statusCanceled,
  canceledEvents: css.statusCanceled,
};

const getSectionsForView = dashboardView => {
  if (dashboardView === PEAKUP_DASHBOARD_VIEW_LESSONS) {
    return LESSONS_SECTION_CONFIG;
  }
  if (dashboardView === PEAKUP_DASHBOARD_VIEW_EVENTS) {
    return EVENTS_SECTION_CONFIG;
  }
  return ALL_SECTION_CONFIG;
};

const resolveSectionItems = (section, segments) => {
  const items = (section.sourceKeys || []).flatMap(key => segments?.[key] || []);
  if (!section.match) {
    return items;
  }
  return items.filter(entry => section.match(entry.transaction));
};

const BookingRow = ({ entry, intl, inboxTab, sectionKey }) => {
  const { transaction, role } = entry;
  const info = getBookingProcessStateInfo(transaction);
  const processName = info?.processName || 'default-booking';
  const copyProcessName = getTransactionCopyProcessName(transaction, processName);
  const processState = info?.processState || entry.state || '';
  const transactionRole = role === 'customer' ? 'customer' : 'provider';
  const counterparty = role === 'customer' ? transaction.provider : transaction.customer;
  const txId = transaction?.id?.uuid;
  const detailRoute = role === 'customer' ? 'OrderDetailsPage' : 'SaleDetailsPage';
  const isMultiDay = isPeakUpMultiDayPurchaseTransaction(transaction);
  const protectedDates = isMultiDay ? getPeakUpMultiDayExperienceProtectedDates(transaction) : null;
  const sessionDates = isMultiDay ? protectedDates : getPeakUpCoachBookingSessionDates(transaction);
  const displayStart = isMultiDay
    ? protectedDates?.bookingStart
    : transaction?.booking?.attributes?.start || sessionDates?.bookingStart;
  const displayEnd = sessionDates?.bookingEnd;

  const formattedExperienceDates =
    displayStart &&
    intl.formatDateTimeRange(new Date(displayStart), new Date(displayEnd || displayStart), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const statusLabel = intl.formatMessage(
    {
      id: `InboxPage.${copyProcessName}.${processState}.status`,
      defaultMessage: processState || '—',
    },
    { transactionRole }
  );

  return (
    <li className={css.item}>
      <div className={css.itemMain}>
        <p className={css.itemTitle}>{transaction?.listing?.attributes?.title || '—'}</p>
        <p className={css.itemMeta}>
          <UserDisplayName user={counterparty} intl={intl} />
          {!isMultiDay && displayStart ? (
            <>
              {' · '}
              {displayEnd && displayEnd !== displayStart
                ? intl.formatDateTimeRange(new Date(displayStart), new Date(displayEnd), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : intl.formatDate(new Date(displayStart), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
            </>
          ) : null}
        </p>
        {isMultiDay && formattedExperienceDates ? (
          <p className={css.itemDates}>
            <span className={css.itemDatesIcon} aria-hidden="true">
              📅
            </span>
            <span>{formattedExperienceDates}</span>
          </p>
        ) : null}
      </div>
      <span className={classNames(css.itemStatus, STATUS_BADGE_CLASS[sectionKey])}>
        {statusLabel}
      </span>
      <div className={css.itemActions}>
        {txId ? (
          <NamedLink
            className={classNames(css.actionBtn, css.actionPrimary)}
            name={detailRoute}
            params={{ id: txId }}
          >
            <FormattedMessage id="PeakUpBookingDashboard.openBooking" />
          </NamedLink>
        ) : null}
        {txId ? (
          <NamedLink
            className={classNames(css.actionBtn, css.actionSecondary)}
            name="InboxPage"
            params={{ tab: inboxTab }}
          >
            <FormattedMessage id="PeakUpBookingDashboard.openInbox" />
          </NamedLink>
        ) : null}
      </div>
    </li>
  );
};

const DashboardSection = ({ section, items, intl, inboxTab, limit = 5 }) => {
  const visible = items.slice(0, limit);
  const accentClass = css[`sectionAccent${section.accent.charAt(0).toUpperCase()}${section.accent.slice(1)}`];
  const sectionDomId =
    section.key === 'multiDayExperiences'
      ? PEAKUP_DASHBOARD_MULTI_DAY_SECTION_ID
      : `dashboard-section-${section.key}`;

  return (
    <section
      id={sectionDomId}
      className={classNames(css.section, accentClass)}
      aria-labelledby={`${sectionDomId}-title`}
    >
      <header className={css.sectionHeader}>
        <h2 id={`${sectionDomId}-title`} className={css.sectionTitle}>
          <FormattedMessage id={section.titleId} defaultMessage={section.defaultTitle} />
        </h2>
        <span className={css.sectionCount}>{items.length}</span>
      </header>
      {visible.length === 0 ? (
        <p className={css.empty}>
          <FormattedMessage id="PeakUpBookingDashboard.sectionEmpty" />
        </p>
      ) : (
        <ul className={css.list}>
          {visible.map(entry => (
            <BookingRow
              key={entry.transaction?.id?.uuid}
              entry={entry}
              intl={intl}
              inboxTab={inboxTab}
              sectionKey={section.key}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * Operational booking overview — structured lists with links to transaction detail + inbox.
 *
 * @param {Object} props
 * @param {'customer'|'provider'} props.role
 * @param {'orders'|'sales'} props.inboxTab
 * @param {Object} props.segments
 * @param {boolean} [props.loading]
 * @param {Object} [props.error]
 * @param {string} [props.rootClassName]
 * @param {boolean} [props.showIntro]
 * @param {'lessons'|'events'|'all'} [props.dashboardView] Which section boxes to render.
 */
const PeakUpBookingDashboardPanel = props => {
  const intl = useIntl();
  const {
    inboxTab,
    segments,
    loading,
    error,
    rootClassName,
    showIntro = true,
    dashboardView = PEAKUP_DASHBOARD_VIEW_ALL,
  } = props;
  const displaySegments = normalizeBookingDashboardSegmentsForDisplay(segments);
  const sectionConfig = getSectionsForView(dashboardView);

  if (loading) {
    return (
      <p className={classNames(css.root, css.loading, rootClassName)}>
        <FormattedMessage id="PeakUpBookingDashboard.loading" />
      </p>
    );
  }

  if (error) {
    return (
      <p className={classNames(css.root, css.error, rootClassName)}>
        <FormattedMessage id="PeakUpBookingDashboard.error" />
      </p>
    );
  }

  return (
    <div className={classNames(css.root, rootClassName)}>
      {showIntro ? (
        <p className={css.intro}>
          <FormattedMessage id="PeakUpBookingDashboard.intro" />
        </p>
      ) : null}
      <div className={css.sections}>
        {sectionConfig.map(section => (
          <DashboardSection
            key={section.key}
            section={section}
            items={resolveSectionItems(section, displaySegments)}
            intl={intl}
            inboxTab={inboxTab}
          />
        ))}
      </div>
    </div>
  );
};

export default PeakUpBookingDashboardPanel;
