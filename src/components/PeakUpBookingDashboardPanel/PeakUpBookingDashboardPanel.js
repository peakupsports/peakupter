import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getTransactionCopyProcessName, isPeakUpMultiDayPurchaseTransaction } from '../../util/peakUpMultiDayPurchase';
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

const SECTION_CONFIG = [
  {
    key: 'upcoming',
    titleId: 'PeakUpBookingDashboard.sectionLessonsUpcoming',
    defaultTitle: 'Upcoming lessons & sessions',
    accent: 'cyan',
  },
  {
    key: 'multiDayExperiences',
    titleId: 'PeakUpBookingDashboard.sectionUpcomingEvents',
    defaultTitle: 'Upcoming events',
    accent: 'emerald',
  },
  {
    key: 'pending',
    titleId: 'PeakUpBookingDashboard.sectionPending',
    defaultTitle: 'Open requests & pending',
    accent: 'amber',
  },
  {
    key: 'pendingReview',
    titleId: 'PeakUpBookingDashboard.sectionReview',
    defaultTitle: 'Waiting for review',
    accent: 'violet',
  },
  {
    key: 'past',
    titleId: 'PeakUpBookingDashboard.sectionPast',
    defaultTitle: 'Past bookings',
    accent: 'neutral',
  },
  {
    key: 'canceled',
    titleId: 'PeakUpBookingDashboard.sectionCanceled',
    defaultTitle: 'Canceled bookings',
    accent: 'danger',
  },
];

const STATUS_BADGE_CLASS = {
  upcoming: css.statusUpcoming,
  multiDayExperiences: css.statusMultiDay,
  pending: css.statusPending,
  pendingReview: css.statusReview,
  past: css.statusPast,
  canceled: css.statusCanceled,
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

const filterSectionItems = (sectionKey, items = []) => {
  if (sectionKey === 'upcoming') {
    return items.filter(entry => !isPeakUpMultiDayPurchaseTransaction(entry.transaction));
  }

  if (sectionKey === 'multiDayExperiences') {
    return items.filter(entry => isPeakUpMultiDayPurchaseTransaction(entry.transaction));
  }

  return items;
};

const DashboardSection = ({ sectionKey, titleId, defaultTitle, accent, items, intl, inboxTab, limit = 5 }) => {
  const filteredItems = filterSectionItems(sectionKey, items);
  const visible = filteredItems.slice(0, limit);
  const accentClass = css[`sectionAccent${accent.charAt(0).toUpperCase()}${accent.slice(1)}`];
  const sectionDomId =
    sectionKey === 'multiDayExperiences'
      ? PEAKUP_DASHBOARD_MULTI_DAY_SECTION_ID
      : `dashboard-section-${sectionKey}`;

  return (
    <section
      id={sectionDomId}
      className={classNames(css.section, accentClass)}
      aria-labelledby={`${sectionDomId}-title`}
    >
      <header className={css.sectionHeader}>
        <h2 id={`${sectionDomId}-title`} className={css.sectionTitle}>
          <FormattedMessage id={titleId} defaultMessage={defaultTitle} />
        </h2>
        <span className={css.sectionCount}>{filteredItems.length}</span>
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
              sectionKey={sectionKey}
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
 */
const PeakUpBookingDashboardPanel = props => {
  const intl = useIntl();
  const { inboxTab, segments, loading, error, rootClassName, showIntro = true } = props;
  const displaySegments = normalizeBookingDashboardSegmentsForDisplay(segments);

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
        {SECTION_CONFIG.map(section => (
          <DashboardSection
            key={section.key}
            sectionKey={section.key}
            titleId={section.titleId}
            defaultTitle={section.defaultTitle}
            accent={section.accent}
            items={displaySegments?.[section.key]}
            intl={intl}
            inboxTab={inboxTab}
          />
        ))}
      </div>
    </div>
  );
};

export default PeakUpBookingDashboardPanel;
