import React from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { getBookingProcessStateInfo } from '../../util/peakupBookingRequestPopup';
import { NamedLink } from '../NamedLink/NamedLink';
import UserDisplayName from '../UserDisplayName/UserDisplayName';

import css from './PeakUpBookingDashboardPanel.module.css';

const SECTION_CONFIG = [
  { key: 'upcoming', titleId: 'PeakUpBookingDashboard.sectionUpcoming', accent: 'cyan' },
  { key: 'pending', titleId: 'PeakUpBookingDashboard.sectionPending', accent: 'amber' },
  { key: 'pendingReview', titleId: 'PeakUpBookingDashboard.sectionReview', accent: 'violet' },
  { key: 'past', titleId: 'PeakUpBookingDashboard.sectionPast', accent: 'neutral' },
  { key: 'canceled', titleId: 'PeakUpBookingDashboard.sectionCanceled', accent: 'danger' },
];

const STATUS_BADGE_CLASS = {
  upcoming: css.statusUpcoming,
  pending: css.statusPending,
  pendingReview: css.statusReview,
  past: css.statusPast,
  canceled: css.statusCanceled,
};

const BookingRow = ({ entry, intl, inboxTab, sectionKey }) => {
  const { transaction, role } = entry;
  const info = getBookingProcessStateInfo(transaction);
  const processName = info?.processName || 'default-booking';
  const processState = info?.processState || entry.state || '';
  const transactionRole = role === 'customer' ? 'customer' : 'provider';
  const counterparty = role === 'customer' ? transaction.provider : transaction.customer;
  const txId = transaction?.id?.uuid;
  const detailRoute = role === 'customer' ? 'OrderDetailsPage' : 'SaleDetailsPage';
  const bookingStart = transaction?.booking?.attributes?.start;

  const statusLabel = intl.formatMessage(
    {
      id: `InboxPage.${processName}.${processState}.status`,
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
          {bookingStart ? (
            <>
              {' · '}
              {intl.formatDate(new Date(bookingStart), {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </>
          ) : null}
        </p>
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

const DashboardSection = ({ sectionKey, titleId, accent, items, intl, inboxTab, limit = 5 }) => {
  const visible = (items || []).slice(0, limit);
  const accentClass = css[`sectionAccent${accent.charAt(0).toUpperCase()}${accent.slice(1)}`];

  return (
    <section
      className={classNames(css.section, accentClass)}
      aria-labelledby={`dashboard-section-${sectionKey}`}
    >
      <header className={css.sectionHeader}>
        <h2 id={`dashboard-section-${sectionKey}`} className={css.sectionTitle}>
          <FormattedMessage id={titleId} />
        </h2>
        <span className={css.sectionCount}>{items?.length || 0}</span>
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
            accent={section.accent}
            items={segments?.[section.key]}
            intl={intl}
            inboxTab={inboxTab}
          />
        ))}
      </div>
    </div>
  );
};

export default PeakUpBookingDashboardPanel;
