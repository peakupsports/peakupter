import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isScrollingDisabled } from '../../../ducks/ui.duck';
import {
  getStoredAdminToken,
  setStoredAdminToken,
} from '../../../util/coachApplicationAdmin';
import {
  CUSTOMER_SORT_IDS,
  CUSTOMER_SORT_LABEL_IDS,
  CUSTOMER_STATUS_LABEL_IDS,
  fetchCustomerManagementAdminList,
} from '../../../util/customerManagementAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../../util/peakupAdmin';
import {
  AvatarCell,
  customerHasBookings,
  formatActivityDate,
  isActiveCustomer,
  isNewCustomer,
  sortCustomers,
} from '../hqManagementHelpers';

import { Page, NamedLink } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';

import sportTheme from '../../SportPagesTheme.module.css';
import adminCss from '../../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';
import css from '../PeakUpHqFeaturedCoachesPage/PeakUpHqFeaturedCoachesPage.module.css';

const CustomerStatusBadge = ({ status }) => {
  const intl = useIntl();
  const labelId = CUSTOMER_STATUS_LABEL_IDS[status] || CUSTOMER_STATUS_LABEL_IDS.registered;
  return (
    <span
      className={classNames(css.futureStatusBadge, {
        [css.futureStatusInvited]: status === 'active',
        [css.futureStatusApplication]: status === 'new',
      })}
    >
      {intl.formatMessage({ id: labelId })}
    </span>
  );
};

const CustomerDirectoryTable = ({ customers, intl }) => (
  <div className={css.tableWrap}>
    <table className={classNames(css.table, css.directoryTable, css.customerDirectoryTable)}>
      <thead>
        <tr>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colCoach" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colEmail" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colLocation" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCustomerManagement.colSignup" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCustomerManagement.colBookings" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCustomerManagement.colLastActivity" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colStatus" />
          </th>
        </tr>
      </thead>
      <tbody>
        {customers.map(customer => (
          <tr key={customer.userId} className={css.directoryRow}>
            <td
              className={css.colCoach}
              data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colCoach' })}
            >
              <AvatarCell
                displayName={customer.displayName}
                imageUrl={customer.profileImageUrl}
              />
            </td>
            <td
              className={css.colEmail}
              data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colEmail' })}
            >
              <span className={css.cellValue} title={customer.email || undefined}>
                {customer.email || '—'}
              </span>
            </td>
            <td
              data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colLocation' })}
            >
              <span className={css.cellValue} title={customer.location || undefined}>
                {customer.location || '—'}
              </span>
            </td>
            <td
              data-label={intl.formatMessage({ id: 'PeakUpHqCustomerManagement.colSignup' })}
            >
              {formatActivityDate(customer.signupAt)}
            </td>
            <td
              data-label={intl.formatMessage({ id: 'PeakUpHqCustomerManagement.colBookings' })}
            >
              {customer.bookingCount}
            </td>
            <td
              data-label={intl.formatMessage({
                id: 'PeakUpHqCustomerManagement.colLastActivity',
              })}
            >
              {formatActivityDate(customer.lastActivityAt)}
            </td>
            <td
              data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colStatus' })}
            >
              <CustomerStatusBadge status={customer.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HqModuleSection = ({ sectionId, titleId, subtitleId, subtitleValues, emptyId, rows, children }) => (
  <section className={css.managementSection} aria-labelledby={sectionId}>
    <header className={css.sectionHeader}>
      <h2 id={sectionId} className={css.sectionTitle}>
        <FormattedMessage id={titleId} />
      </h2>
      {subtitleId ? (
        <p className={css.sectionSubtitle}>
          <FormattedMessage id={subtitleId} values={subtitleValues} />
        </p>
      ) : null}
    </header>
    {rows.length === 0 ? (
      <p className={css.emptyState}>
        <FormattedMessage id={emptyId} />
      </p>
    ) : (
      children
    )}
  </section>
);

const AdminGate = ({ onAuthenticated }) => {
  const intl = useIntl();
  const [token, setToken] = useState(getStoredAdminToken() || '');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async event => {
    event.preventDefault();
    setChecking(true);
    setError(null);
    setStoredAdminToken(token.trim());
    try {
      await fetchCustomerManagementAdminList();
      onAuthenticated();
    } catch (e) {
      setStoredAdminToken(null);
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCustomerManagement.loadError' }));
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={classNames(adminCss.gateForm, css.hqPanel)} onSubmit={handleSubmit}>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="PeakUpHqCoachManagement.gateHint" />
      </p>
      <label className={adminCss.gateLabel} htmlFor="customer-management-admin-token">
        <FormattedMessage id="PeakUpHqCoachManagement.gateLabel" />
      </label>
      <input
        id="customer-management-admin-token"
        className={adminCss.gateInput}
        type="password"
        autoComplete="off"
        value={token}
        onChange={event => setToken(event.target.value)}
        placeholder={intl.formatMessage({ id: 'PeakUpHqCoachManagement.gatePlaceholder' })}
      />
      {error ? <p className={adminCss.gateError}>{error}</p> : null}
      <button type="submit" className={adminCss.exportButton} disabled={checking || !token.trim()}>
        <FormattedMessage id="PeakUpHqCoachManagement.gateSubmit" />
      </button>
    </form>
  );
};

const PeakUpHqCustomerManagementPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const currentUser = useSelector(state => state.user.currentUser);

  const isHqAdmin = canAccessHqAdminApiViaSession(currentUser, config);
  const [tokenAuthenticated, setTokenAuthenticated] = useState(() => !!getStoredAdminToken());
  const hasDashboardAccess = hasPeakUpHqAdminDashboardAccess(
    currentUser,
    config,
    tokenAuthenticated
  );

  const [customers, setCustomers] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ countries: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortKey, setSortKey] = useState('activity');
  const [sortDirection, setSortDirection] = useState('desc');

  const title = intl.formatMessage(
    { id: 'PeakUpHqCustomerManagement.schemaTitle' },
    { marketplaceName: config.marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomerManagementAdminList({ q: search.trim() });
      setCustomers(result?.customers || []);
      setFilterOptions(result?.filterOptions || { countries: [] });
    } catch (e) {
      if (e.status === 401 && !isHqAdmin) {
        setStoredAdminToken(null);
        setTokenAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCustomerManagement.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [intl, isHqAdmin, search]);

  useEffect(() => {
    if (!hasDashboardAccess) {
      return undefined;
    }
    const timer = window.setTimeout(() => loadList(), 300);
    return () => window.clearTimeout(timer);
  }, [hasDashboardAccess, loadList]);

  const filteredCustomers = useMemo(() => {
    let list = customers;
    if (countryFilter) {
      const needle = countryFilter.toLowerCase();
      list = list.filter(c => String(c.location || '').toLowerCase().includes(needle));
    }
    return sortCustomers(list, sortKey, sortDirection);
  }, [countryFilter, customers, sortDirection, sortKey]);

  const activeCustomers = useMemo(
    () => filteredCustomers.filter(isActiveCustomer),
    [filteredCustomers]
  );
  const newCustomers = useMemo(
    () => filteredCustomers.filter(isNewCustomer),
    [filteredCustomers]
  );
  const customersWithBookings = useMemo(
    () => filteredCustomers.filter(customerHasBookings),
    [filteredCustomers]
  );

  const handleLogout = () => {
    setStoredAdminToken(null);
    setTokenAuthenticated(false);
  };

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, adminCss.page)}
    >
      <PeakUpHqAdminGate>
        <TopbarContainer currentPage="PeakUpHqCustomerManagementPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={classNames(adminCss.rail, css.wideRail)}>
            <header className={adminCss.header}>
              <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
                <FormattedMessage id="PeakUpHq.backToOverview" />
              </NamedLink>
              <p className={adminCss.eyebrow}>
                <FormattedMessage id="PeakUpHqCustomerManagement.eyebrow" />
              </p>
              <h1 className={adminCss.title}>
                <FormattedMessage id="PeakUpHqCustomerManagement.title" />
              </h1>
              <p className={adminCss.subtitle}>
                <FormattedMessage id="PeakUpHqCustomerManagement.subtitle" />
              </p>
            </header>

            {!hasDashboardAccess ? (
              <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
            ) : (
              <section className={classNames(adminCss.glassCard, css.hqPanel)}>
                <p className={css.rankingNotice}>
                  <FormattedMessage id="PeakUpHqCustomerManagement.notice" />
                </p>

                <div className={adminCss.opsHeader}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="PeakUpHqCustomerManagement.count"
                      values={{
                        count: filteredCustomers.length,
                        active: activeCustomers.length,
                        withBookings: customersWithBookings.length,
                      }}
                    />
                  </span>
                  <div className={adminCss.toolbarActions}>
                    <button type="button" className={adminCss.secondaryButton} onClick={loadList}>
                      <FormattedMessage id="PeakUpHqCoachManagement.refresh" />
                    </button>
                    {!isHqAdmin ? (
                      <button type="button" className={adminCss.secondaryButton} onClick={handleLogout}>
                        <FormattedMessage id="PeakUpHqCoachManagement.logout" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className={css.filterRowWide}>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="customer-management-search">
                      <FormattedMessage id="PeakUpHqCoachManagement.searchLabel" />
                    </label>
                    <input
                      id="customer-management-search"
                      className={css.searchInput}
                      type="search"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder={intl.formatMessage({
                        id: 'PeakUpHqCustomerManagement.searchPlaceholder',
                      })}
                    />
                  </div>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="customer-management-country">
                      <FormattedMessage id="PeakUpHqCoachManagement.filterCountry" />
                    </label>
                    <select
                      id="customer-management-country"
                      className={css.filterSelect}
                      value={countryFilter}
                      onChange={event => setCountryFilter(event.target.value)}
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'PeakUpHqCoachManagement.filterAll' })}
                      </option>
                      {(filterOptions.countries || []).map(country => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="customer-management-sort">
                      <FormattedMessage id="PeakUpHqCustomerManagement.sortLabel" />
                    </label>
                    <select
                      id="customer-management-sort"
                      className={css.filterSelect}
                      value={`${sortKey}:${sortDirection}`}
                      onChange={event => {
                        const [key, direction] = event.target.value.split(':');
                        setSortKey(key);
                        setSortDirection(direction);
                      }}
                    >
                      {CUSTOMER_SORT_IDS.flatMap(key => [
                        <option key={`${key}:asc`} value={`${key}:asc`}>
                          {intl.formatMessage({ id: CUSTOMER_SORT_LABEL_IDS[key] })} ↑
                        </option>,
                        <option key={`${key}:desc`} value={`${key}:desc`}>
                          {intl.formatMessage({ id: CUSTOMER_SORT_LABEL_IDS[key] })} ↓
                        </option>,
                      ])}
                    </select>
                  </div>
                </div>

                {loading ? (
                  <p className={adminCss.loadingState}>
                    <FormattedMessage id="PeakUpHqCoachManagement.loading" />
                  </p>
                ) : error ? (
                  <p className={adminCss.errorState}>{error}</p>
                ) : (
                  <>
                    <HqModuleSection
                      sectionId="customer-directory-heading"
                      titleId="PeakUpHqCustomerManagement.directoryTitle"
                      subtitleId="PeakUpHqCustomerManagement.directorySubtitle"
                      subtitleValues={{ count: filteredCustomers.length }}
                      emptyId="PeakUpHqCustomerManagement.empty"
                      rows={filteredCustomers}
                    >
                      <CustomerDirectoryTable customers={filteredCustomers} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="active-customers-heading"
                      titleId="PeakUpHqCustomerManagement.activeTitle"
                      subtitleId="PeakUpHqCustomerManagement.activeSubtitle"
                      subtitleValues={{ count: activeCustomers.length }}
                      emptyId="PeakUpHqCustomerManagement.activeEmpty"
                      rows={activeCustomers}
                    >
                      <CustomerDirectoryTable customers={activeCustomers} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="new-customers-heading"
                      titleId="PeakUpHqCustomerManagement.newTitle"
                      subtitleId="PeakUpHqCustomerManagement.newSubtitle"
                      subtitleValues={{ count: newCustomers.length }}
                      emptyId="PeakUpHqCustomerManagement.newEmpty"
                      rows={newCustomers}
                    >
                      <CustomerDirectoryTable customers={newCustomers} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="customers-with-bookings-heading"
                      titleId="PeakUpHqCustomerManagement.withBookingsTitle"
                      subtitleId="PeakUpHqCustomerManagement.withBookingsSubtitle"
                      subtitleValues={{ count: customersWithBookings.length }}
                      emptyId="PeakUpHqCustomerManagement.withBookingsEmpty"
                      rows={customersWithBookings}
                    >
                      <CustomerDirectoryTable customers={customersWithBookings} intl={intl} />
                    </HqModuleSection>

                    <section
                      className={classNames(css.managementSection, css.futureSection)}
                      aria-labelledby="vip-customers-heading"
                    >
                      <header className={css.sectionHeader}>
                        <h2 id="vip-customers-heading" className={css.sectionTitle}>
                          <FormattedMessage id="PeakUpHqCustomerManagement.vipTitle" />
                        </h2>
                        <p className={css.sectionSubtitle}>
                          <FormattedMessage id="PeakUpHqCustomerManagement.vipSubtitle" />
                        </p>
                      </header>
                      <p className={css.emptyState}>
                        <FormattedMessage id="PeakUpHqCustomerManagement.vipEmpty" />
                      </p>
                    </section>
                  </>
                )}
              </section>
            )}
          </div>
        </main>

        <FooterContainer />
      </PeakUpHqAdminGate>
    </Page>
  );
};

export default PeakUpHqCustomerManagementPage;
