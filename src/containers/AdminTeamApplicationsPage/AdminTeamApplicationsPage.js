import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  APPLICATION_STATUSES,
  STATUS_LABEL_IDS,
  fetchTeamApplicationsList,
  getStoredAdminToken,
  patchTeamApplicationStatus,
  setStoredAdminToken,
} from '../../util/teamApplicationAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../util/peakupAdmin';

import { Page, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHq/PeakUpHqAdminGate';

import sportTheme from '../SportPagesTheme.module.css';
import adminCss from '../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';

const STATUS_BADGE_CLASS = {
  [APPLICATION_STATUSES.PENDING]: adminCss.badgePending,
  [APPLICATION_STATUSES.APPROVED]: adminCss.badgeApproved,
  [APPLICATION_STATUSES.REJECTED]: adminCss.badgeRejected,
  [APPLICATION_STATUSES.NEED_MORE_INFO]: adminCss.badgeNeedMoreInfo,
};

const StatusBadge = ({ status }) => {
  const intl = useIntl();
  const labelId = STATUS_LABEL_IDS[status] || STATUS_LABEL_IDS[APPLICATION_STATUSES.PENDING];
  return (
    <span className={classNames(adminCss.badge, STATUS_BADGE_CLASS[status] || adminCss.badgePending)}>
      {intl.formatMessage({ id: labelId })}
    </span>
  );
};

const AdminGate = ({ onAuthenticated }) => {
  const intl = useIntl();
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setChecking(true);
    setStoredAdminToken(tokenInput.trim());
    try {
      await fetchTeamApplicationsList();
      onAuthenticated();
    } catch (err) {
      setStoredAdminToken(null);
      if (err.status === 401) {
        setError(intl.formatMessage({ id: 'AdminTeamApplicationsPage.gateInvalid' }));
      } else if (err.status === 503) {
        setError(intl.formatMessage({ id: 'AdminTeamApplicationsPage.gateNotConfigured' }));
      } else {
        setError(err.message || intl.formatMessage({ id: 'AdminTeamApplicationsPage.loadError' }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className={adminCss.glassCard}>
      <form className={adminCss.gateForm} onSubmit={handleSubmit}>
        <p className={adminCss.gateHint}>
          <FormattedMessage id="AdminTeamApplicationsPage.gateHint" />
        </p>
        <label className={adminCss.gateLabel} htmlFor="team-admin-token">
          <FormattedMessage id="AdminTeamApplicationsPage.gateLabel" />
        </label>
        <input
          id="team-admin-token"
          className={adminCss.gateInput}
          type="password"
          autoComplete="off"
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminTeamApplicationsPage.gatePlaceholder' })}
        />
        {error ? <p className={adminCss.gateError}>{error}</p> : null}
        <button
          type="submit"
          className={adminCss.primaryButton}
          disabled={checking || !tokenInput.trim()}
        >
          <FormattedMessage id="AdminTeamApplicationsPage.gateSubmit" />
        </button>
      </form>
    </section>
  );
};

const TeamApplicationsList = ({ applications, busyId, onStatus }) => {
  const intl = useIntl();

  if (applications.length === 0) {
    return (
      <p className={adminCss.emptyState}>
        <FormattedMessage id="AdminTeamApplicationsPage.empty" />
      </p>
    );
  }

  const formatDate = value => (value ? moment(value).format('D MMM YYYY, HH:mm') : '—');

  return (
    <>
      <div className={adminCss.desktopTable}>
        <div className={adminCss.tableWrap}>
          <table className={adminCss.table}>
            <thead>
              <tr>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colTeam" />
                </th>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colEmail" />
                </th>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colSport" />
                </th>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colLocation" />
                </th>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colStatus" />
                </th>
                <th>
                  <FormattedMessage id="AdminTeamApplicationsPage.colSubmitted" />
                </th>
                <th className={adminCss.colActions}>
                  <FormattedMessage id="AdminTeamApplicationsPage.colActions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr key={app.id}>
                  <td>{app.teamName || '—'}</td>
                  <td>{app.email || '—'}</td>
                  <td>{app.mainSport || '—'}</td>
                  <td>{app.cityArea || '—'}</td>
                  <td>
                    <StatusBadge status={app.status} />
                  </td>
                  <td>{formatDate(app.submittedAt)}</td>
                  <td className={adminCss.colActions}>
                    <div className={adminCss.actionsRow}>
                      <button
                        type="button"
                        className={classNames(adminCss.actionButton, adminCss.actionButtonApprove)}
                        disabled={busyId === app.id}
                        onClick={() => onStatus(app.id, APPLICATION_STATUSES.APPROVED)}
                      >
                        <FormattedMessage id="AdminTeamApplicationsPage.actionApprove" />
                      </button>
                      <button
                        type="button"
                        className={classNames(adminCss.actionButton, adminCss.actionButtonReject)}
                        disabled={busyId === app.id}
                        onClick={() => onStatus(app.id, APPLICATION_STATUSES.REJECTED)}
                      >
                        <FormattedMessage id="AdminTeamApplicationsPage.actionReject" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={adminCss.mobileCards}>
        {applications.map(app => (
          <article key={app.id} className={adminCss.appCard}>
            <div className={adminCss.appCardTop}>
              <span className={adminCss.rowLink}>{app.teamName || '—'}</span>
              <StatusBadge status={app.status} />
            </div>
            <div>{app.email}</div>
            <div>
              {app.mainSport || '—'} · {app.cityArea || '—'}
            </div>
            <div>{formatDate(app.submittedAt)}</div>
            <div className={adminCss.actionsRow}>
              <button
                type="button"
                className={classNames(adminCss.actionButton, adminCss.actionButtonApprove)}
                disabled={busyId === app.id}
                onClick={() => onStatus(app.id, APPLICATION_STATUSES.APPROVED)}
              >
                <FormattedMessage id="AdminTeamApplicationsPage.actionApprove" />
              </button>
              <button
                type="button"
                className={classNames(adminCss.actionButton, adminCss.actionButtonReject)}
                disabled={busyId === app.id}
                onClick={() => onStatus(app.id, APPLICATION_STATUSES.REJECTED)}
              >
                <FormattedMessage id="AdminTeamApplicationsPage.actionReject" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

/**
 * HQ admin dashboard for team / club applications.
 */
const AdminTeamApplicationsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const currentUser = useSelector(state => state.user.currentUser);
  const marketplaceName = config?.branding?.marketplaceName || 'PeakUp';

  const isHqAdmin = canAccessHqAdminApiViaSession(currentUser, config);
  const [tokenAuthenticated, setTokenAuthenticated] = useState(() => !!getStoredAdminToken());
  const hasDashboardAccess = hasPeakUpHqAdminDashboardAccess(
    currentUser,
    config,
    tokenAuthenticated
  );

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const title = intl.formatMessage(
    { id: 'AdminTeamApplicationsPage.schemaTitle' },
    { marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTeamApplicationsList();
      setApplications(Array.isArray(list) ? list : []);
    } catch (e) {
      if (e.status === 401 && !isHqAdmin) {
        setStoredAdminToken(null);
        setTokenAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'AdminTeamApplicationsPage.loadError' }));
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [intl, isHqAdmin]);

  useEffect(() => {
    if (hasDashboardAccess) {
      loadList();
    }
  }, [hasDashboardAccess, loadList]);

  const onStatus = async (id, status) => {
    setBusyId(id);
    setError(null);
    try {
      await patchTeamApplicationStatus(id, status);
      await loadList();
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'AdminTeamApplicationsPage.updateError' }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, adminCss.page)}
    >
      <PeakUpHqAdminGate>
        <TopbarContainer currentPage="AdminTeamApplicationsPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={adminCss.rail}>
            <header className={adminCss.header}>
              <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
                <FormattedMessage id="PeakUpHq.backToOverview" />
              </NamedLink>
              <p className={adminCss.eyebrow}>
                <FormattedMessage id="AdminTeamApplicationsPage.eyebrow" />
              </p>
              <h1 className={adminCss.title}>
                <FormattedMessage id="AdminTeamApplicationsPage.title" />
              </h1>
              <p className={adminCss.subtitle}>
                <FormattedMessage id="AdminTeamApplicationsPage.subtitle" />
              </p>
            </header>

            {!hasDashboardAccess ? (
              <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
            ) : (
              <section className={adminCss.glassCard}>
                <div className={adminCss.opsHeader}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="AdminTeamApplicationsPage.count"
                      values={{ count: applications.length }}
                    />
                  </span>
                  <div className={adminCss.toolbarActions}>
                    <button
                      type="button"
                      className={adminCss.secondaryButton}
                      onClick={loadList}
                      disabled={loading}
                    >
                      <FormattedMessage id="AdminTeamApplicationsPage.refresh" />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p className={adminCss.loadingState}>
                    <FormattedMessage id="AdminTeamApplicationsPage.loading" />
                  </p>
                ) : error ? (
                  <p className={adminCss.errorState}>{error}</p>
                ) : (
                  <TeamApplicationsList
                    applications={applications}
                    busyId={busyId}
                    onStatus={onStatus}
                  />
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

export default AdminTeamApplicationsPage;
