import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isScrollingDisabled } from '../../../ducks/ui.duck';
import {
  fetchAmbassadorActivationsList,
  fetchAmbassadorAdminOverview,
  getStoredAdminToken,
  setStoredAdminToken,
} from '../../../util/coachApplicationAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../../util/peakupAdmin';
import { normalizeReferralCode } from '../../../util/referralCode';

import { Page, NamedLink } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';

import sportTheme from '../../SportPagesTheme.module.css';
import adminCss from '../../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';
import css from './PeakUpHqAmbassadorsPage.module.css';

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
      await fetchAmbassadorActivationsList();
      onAuthenticated();
    } catch (e) {
      setStoredAdminToken(null);
      if (e.status === 401) {
        setError(intl.formatMessage({ id: 'AdminAmbassadorsPage.gateInvalid' }));
      } else if (e.status === 503) {
        setError(intl.formatMessage({ id: 'AdminAmbassadorsPage.gateNotConfigured' }));
      } else {
        setError(e.message || intl.formatMessage({ id: 'AdminAmbassadorsPage.loadError' }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={adminCss.gateForm} onSubmit={handleSubmit}>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="AdminAmbassadorsPage.gateHint" />
      </p>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="AdminAmbassadorsPage.gateTokenHint" />
      </p>
      <label className={adminCss.gateLabel} htmlFor="ambassador-admin-token">
        <FormattedMessage id="AdminAmbassadorsPage.gateLabel" />
      </label>
      <input
        id="ambassador-admin-token"
        className={adminCss.gateInput}
        type="password"
        autoComplete="off"
        value={token}
        onChange={event => setToken(event.target.value)}
        placeholder={intl.formatMessage({ id: 'AdminAmbassadorsPage.gatePlaceholder' })}
      />
      {error ? <p className={adminCss.gateError}>{error}</p> : null}
      <button type="submit" className={adminCss.exportButton} disabled={checking || !token.trim()}>
        <FormattedMessage id="AdminAmbassadorsPage.gateSubmit" />
      </button>
    </form>
  );
};

const OverviewSummary = ({ summary }) => {
  if (!summary) {
    return null;
  }

  return (
    <div className={css.summaryGrid}>
      <article className={css.summaryCard}>
        <p className={css.summaryLabel}>
          <FormattedMessage id="AdminAmbassadorsPage.summaryAmbassadors" />
        </p>
        <p className={css.summaryValue}>{summary.ambassadorCount}</p>
      </article>
      <article className={css.summaryCard}>
        <p className={css.summaryLabel}>
          <FormattedMessage id="AdminAmbassadorsPage.summaryPayouts" />
        </p>
        <p className={css.summaryValue}>
          {summary.totalAmbassadorPayoutsFormatted || 'CHF 0.00'}
        </p>
      </article>
      <article className={css.summaryCard}>
        <p className={css.summaryLabel}>
          <FormattedMessage id="AdminAmbassadorsPage.summaryReferrals" />
        </p>
        <p className={css.summaryValue}>{summary.totalReferrals}</p>
      </article>
      <article className={css.summaryCard}>
        <p className={css.summaryLabel}>
          <FormattedMessage id="AdminAmbassadorsPage.summaryPending" />
        </p>
        <p className={css.summaryValue}>{summary.pendingVerifications}</p>
      </article>
      <article className={css.summaryCard}>
        <p className={css.summaryLabel}>
          <FormattedMessage id="AdminAmbassadorsPage.summarySuspicious" />
        </p>
        <p className={css.summaryValue}>{summary.suspiciousCount}</p>
      </article>
    </div>
  );
};

const ActivationsTable = ({ activations }) => {
  if (activations.length === 0) {
    return (
      <p className={css.emptyState}>
        <FormattedMessage id="AdminAmbassadorsPage.empty" />
      </p>
    );
  }

  return (
    <div className={css.tableWrap}>
      <table className={css.table}>
        <thead>
          <tr>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colCoach" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colEmail" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colActivated" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colReferralCode" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colTier" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colActiveReferrals" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colTotalRewards" />
            </th>
            <th>
              <FormattedMessage id="AdminAmbassadorsPage.colRewards" />
            </th>
          </tr>
        </thead>
        <tbody>
          {activations.map(item => (
            <tr key={item.id}>
              <td>{item.coachName}</td>
              <td>{item.email}</td>
              <td>{item.activatedAt ? moment(item.activatedAt).format('YYYY-MM-DD HH:mm') : '—'}</td>
              <td>
                <code className={css.code}>{normalizeReferralCode(item.referralCode) || '—'}</code>
              </td>
              <td>{item.ambassadorTier || 'bronze'}</td>
              <td>{item.activeReferrals ?? 0}</td>
              <td>
                {item.rewardsCurrency || 'CHF'}{' '}
                {((item.lifetimeRewardsMinor || 0) / 100).toFixed(2)}
              </td>
              <td>
                <FormattedMessage
                  id={
                    item.ambassadorRewardsUnlocked
                      ? 'AdminAmbassadorsPage.rewardsUnlocked'
                      : 'AdminAmbassadorsPage.rewardsLocked'
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * PeakUp HQ — Ambassador Program activations dashboard.
 */
const PeakUpHqAmbassadorsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const currentUser = useSelector(state => state.user.currentUser);
  const marketplaceName = config.marketplaceName;

  const isHqAdmin = canAccessHqAdminApiViaSession(currentUser, config);
  const [tokenAuthenticated, setTokenAuthenticated] = useState(() => !!getStoredAdminToken());
  const hasDashboardAccess = hasPeakUpHqAdminDashboardAccess(
    currentUser,
    config,
    tokenAuthenticated
  );
  const [activations, setActivations] = useState([]);
  const [overviewSummary, setOverviewSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const title = intl.formatMessage(
    { id: 'AdminAmbassadorsPage.schemaTitle' },
    { marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const overview = await fetchAmbassadorAdminOverview();
      setActivations(overview?.ambassadors || []);
      setOverviewSummary(overview?.summary || null);
    } catch (e) {
      if (e.status === 401 && !isHqAdmin) {
        setStoredAdminToken(null);
        setTokenAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'AdminAmbassadorsPage.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [intl, isHqAdmin]);

  useEffect(() => {
    if (hasDashboardAccess) {
      loadList();
    }
  }, [hasDashboardAccess, loadList]);

  const filteredActivations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return activations;
    }
    return activations.filter(item => {
      const haystack = `${item.coachName} ${item.email} ${item.referralCode}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activations, search]);

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
        <TopbarContainer currentPage="PeakUpHqAmbassadorsPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={adminCss.rail}>
            <header className={adminCss.header}>
              <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
                <FormattedMessage id="PeakUpHq.backToOverview" />
              </NamedLink>
              <p className={adminCss.eyebrow}>
                <FormattedMessage id="AdminAmbassadorsPage.eyebrow" />
              </p>
              <h1 className={adminCss.title}>
                <FormattedMessage id="AdminAmbassadorsPage.title" />
              </h1>
              <p className={adminCss.subtitle}>
                <FormattedMessage id="AdminAmbassadorsPage.subtitle" />
              </p>
            </header>

            {!hasDashboardAccess ? (
              <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
            ) : (
              <section className={adminCss.glassCard}>
                <OverviewSummary summary={overviewSummary} />
                <div className={adminCss.opsHeader}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="AdminAmbassadorsPage.count"
                      values={{ count: filteredActivations.length }}
                    />
                  </span>
                  <div className={adminCss.toolbarActions}>
                    <button type="button" className={adminCss.secondaryButton} onClick={loadList}>
                      <FormattedMessage id="AdminAmbassadorsPage.refresh" />
                    </button>
                    {!isHqAdmin ? (
                      <button type="button" className={adminCss.secondaryButton} onClick={handleLogout}>
                        <FormattedMessage id="AdminAmbassadorsPage.logout" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <label className={css.searchLabel} htmlFor="ambassador-admin-search">
                  <FormattedMessage id="AdminAmbassadorsPage.searchLabel" />
                </label>
                <input
                  id="ambassador-admin-search"
                  className={css.searchInput}
                  type="search"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder={intl.formatMessage({ id: 'AdminAmbassadorsPage.searchPlaceholder' })}
                />

                {loading ? (
                  <p className={adminCss.loadingState}>
                    <FormattedMessage id="AdminAmbassadorsPage.loading" />
                  </p>
                ) : error ? (
                  <p className={adminCss.errorState}>{error}</p>
                ) : (
                  <ActivationsTable activations={filteredActivations} />
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

export default PeakUpHqAmbassadorsPage;
