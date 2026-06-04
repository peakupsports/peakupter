import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../util/reactIntl';

import { NamedLink } from '../NamedLink/NamedLink';
import PeakUpBookingDashboardPanel from '../PeakUpBookingDashboardPanel/PeakUpBookingDashboardPanel';

import css from './PeakUpBookingsDashboardLayout.module.css';

/**
 * Shared shell for role-specific booking detail pages (coach, team, customer).
 *
 * @param {Object} props
 * @param {string} props.backLinkName
 * @param {string} props.backMessageId
 * @param {string} props.eyebrowId
 * @param {string} props.titleId
 * @param {string} props.leadId
 * @param {'customer'|'provider'} props.role
 * @param {'orders'|'sales'} props.inboxTab
 * @param {Object} [props.segments]
 * @param {boolean} [props.loading]
 * @param {Object} [props.error]
 * @param {'lessons'|'events'|'all'} [props.dashboardView]
 */
const PeakUpBookingsDashboardLayout = props => {
  const {
    backLinkName,
    backMessageId,
    eyebrowId,
    titleId,
    leadId,
    role,
    inboxTab,
    segments,
    loading,
    error,
    dashboardView,
  } = props;

  return (
    <>
      <NamedLink className={css.backLink} name={backLinkName}>
        <FormattedMessage id={backMessageId} />
      </NamedLink>

      <header className={css.header}>
        <p className={css.eyebrow}>
          <FormattedMessage id={eyebrowId} />
        </p>
        <h1 className={css.title}>
          <FormattedMessage id={titleId} />
        </h1>
        <p className={css.lead}>
          <FormattedMessage id={leadId} />
        </p>
      </header>

      <PeakUpBookingDashboardPanel
        role={role}
        inboxTab={inboxTab}
        segments={segments}
        loading={loading}
        error={error}
        showIntro={false}
        dashboardView={dashboardView}
        rootClassName={classNames(css.bookingPanel)}
      />
    </>
  );
};

export default PeakUpBookingsDashboardLayout;
