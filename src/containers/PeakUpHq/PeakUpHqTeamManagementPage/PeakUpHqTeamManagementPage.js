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
  ROSTER_STATUS_LABEL_IDS,
  TEAM_SORT_IDS,
  TEAM_SORT_LABEL_IDS,
  TEAM_STATUS_LABEL_IDS,
  fetchTeamManagementAdminList,
} from '../../../util/teamManagementAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../../util/peakupAdmin';
import { AvatarCell, formatActivityDate, sortTeams } from '../hqManagementHelpers';

import { Page, NamedLink } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';

import sportTheme from '../../SportPagesTheme.module.css';
import adminCss from '../../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';
import css from '../PeakUpHqFeaturedCoachesPage/PeakUpHqFeaturedCoachesPage.module.css';

const TeamStatusBadge = ({ status }) => {
  const intl = useIntl();
  const labelId = TEAM_STATUS_LABEL_IDS[status] || TEAM_STATUS_LABEL_IDS.unverified;
  return (
    <span
      className={classNames(css.futureStatusBadge, {
        [css.futureStatusApplication]: String(status).startsWith('application_'),
        [css.futureStatusInvited]: status === 'verified_public',
      })}
    >
      {intl.formatMessage({ id: labelId })}
    </span>
  );
};

const TeamDirectoryTable = ({ teams, intl }) => (
  <div className={css.tableWrap}>
    <table className={classNames(css.table, css.directoryTable, css.teamDirectoryTable)}>
      <thead>
        <tr>
          <th>
            <FormattedMessage id="PeakUpHqTeamManagement.colTeam" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colLocation" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqTeamManagement.colSport" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqTeamManagement.colOwner" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqTeamManagement.colCoaches" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCustomerManagement.colSignup" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colStatus" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colActions" />
          </th>
        </tr>
      </thead>
      <tbody>
        {teams.map(team => (
          <tr key={team.rowId || team.teamId} className={css.directoryRow}>
            <td
              className={css.colCoach}
              data-label={intl.formatMessage({ id: 'PeakUpHqTeamManagement.colTeam' })}
            >
              <AvatarCell displayName={team.teamName} imageUrl={team.profileImageUrl} />
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colLocation' })}>
              <span className={css.cellValue} title={team.location || undefined}>
                {team.location || '—'}
              </span>
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqTeamManagement.colSport' })}>
              {team.mainSport || '—'}
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqTeamManagement.colOwner' })}>
              <span className={css.cellValue} title={team.ownerEmail || undefined}>
                {team.ownerEmail || '—'}
              </span>
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqTeamManagement.colCoaches' })}>
              {team.coachCount}
              {team.pendingInviteCount > 0 ? ` (+${team.pendingInviteCount})` : ''}
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCustomerManagement.colSignup' })}>
              {formatActivityDate(team.signupAt)}
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colStatus' })}>
              <TeamStatusBadge status={team.status} />
              {team.partnerPriority ? (
                <span className={css.partnerStatusBadge} style={{ marginTop: 4 }}>
                  <FormattedMessage id="PeakUpHqCoachManagement.statusPartnerBadge" />
                </span>
              ) : null}
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colActions' })}>
              {team.applicationId ? (
                <NamedLink className={css.futureActionLink} name="AdminTeamApplicationsPage">
                  <FormattedMessage id="PeakUpHqTeamManagement.actionViewApplication" />
                </NamedLink>
              ) : team.teamId ? (
                <NamedLink
                  className={css.futureActionLink}
                  name="ProfilePage"
                  params={{ id: team.teamId }}
                >
                  <FormattedMessage id="PeakUpHqTeamManagement.actionViewTeam" />
                </NamedLink>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TeamRosterTable = ({ rows, intl }) => (
  <div className={css.tableWrap}>
    <table className={classNames(css.table, css.teamRosterTable)}>
      <thead>
        <tr>
          <th>
            <FormattedMessage id="PeakUpHqTeamManagement.colTeam" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colCoach" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colEmail" />
          </th>
          <th>
            <FormattedMessage id="PeakUpHqCoachManagement.colStatus" />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.rowId} className={css.directoryRow}>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqTeamManagement.colTeam' })}>
              {row.teamName || '—'}
            </td>
            <td
              className={css.colCoach}
              data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colCoach' })}
            >
              <AvatarCell
                displayName={row.coachDisplayName}
                imageUrl={row.coachProfileImageUrl}
              />
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colEmail' })}>
              <span className={css.cellValue} title={row.coachEmail || undefined}>
                {row.coachEmail || '—'}
              </span>
            </td>
            <td data-label={intl.formatMessage({ id: 'PeakUpHqCoachManagement.colStatus' })}>
              <span className={css.futureStatusBadge}>
                {intl.formatMessage({
                  id:
                    ROSTER_STATUS_LABEL_IDS[row.rosterStatus] ||
                    ROSTER_STATUS_LABEL_IDS.member,
                })}
              </span>
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
      await fetchTeamManagementAdminList();
      onAuthenticated();
    } catch (e) {
      setStoredAdminToken(null);
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqTeamManagement.loadError' }));
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={classNames(adminCss.gateForm, css.hqPanel)} onSubmit={handleSubmit}>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="PeakUpHqCoachManagement.gateHint" />
      </p>
      <label className={adminCss.gateLabel} htmlFor="team-management-admin-token">
        <FormattedMessage id="PeakUpHqCoachManagement.gateLabel" />
      </label>
      <input
        id="team-management-admin-token"
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

const PeakUpHqTeamManagementPage = () => {
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

  const [teams, setTeams] = useState([]);
  const [pendingTeams, setPendingTeams] = useState([]);
  const [approvedTeams, setApprovedTeams] = useState([]);
  const [partnerTeams, setPartnerTeams] = useState([]);
  const [teamCoaches, setTeamCoaches] = useState([]);
  const [teamInvitations, setTeamInvitations] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ sports: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const title = intl.formatMessage(
    { id: 'PeakUpHqTeamManagement.schemaTitle' },
    { marketplaceName: config.marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeamManagementAdminList({
        q: search.trim(),
        sport: sportFilter || undefined,
      });
      setTeams(result?.teams || []);
      setPendingTeams(result?.pendingTeams || []);
      setApprovedTeams(result?.approvedTeams || []);
      setPartnerTeams(result?.partnerTeams || []);
      setTeamCoaches(result?.teamCoaches || []);
      setTeamInvitations(result?.teamInvitations || []);
      setFilterOptions(result?.filterOptions || { sports: [] });
    } catch (e) {
      if (e.status === 401 && !isHqAdmin) {
        setStoredAdminToken(null);
        setTokenAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqTeamManagement.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [intl, isHqAdmin, search, sportFilter]);

  useEffect(() => {
    if (!hasDashboardAccess) {
      return undefined;
    }
    const timer = window.setTimeout(() => loadList(), 300);
    return () => window.clearTimeout(timer);
  }, [hasDashboardAccess, loadList]);

  const sortedTeams = useMemo(
    () => sortTeams(teams, sortKey, sortDirection),
    [sortDirection, sortKey, teams]
  );
  const sortedApproved = useMemo(
    () => sortTeams(approvedTeams, sortKey, sortDirection),
    [approvedTeams, sortDirection, sortKey]
  );
  const sortedPending = useMemo(
    () => sortTeams(pendingTeams, sortKey, sortDirection),
    [pendingTeams, sortDirection, sortKey]
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
        <TopbarContainer currentPage="PeakUpHqTeamManagementPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={classNames(adminCss.rail, css.wideRail)}>
            <header className={adminCss.header}>
              <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
                <FormattedMessage id="PeakUpHq.backToOverview" />
              </NamedLink>
              <p className={adminCss.eyebrow}>
                <FormattedMessage id="PeakUpHqTeamManagement.eyebrow" />
              </p>
              <h1 className={adminCss.title}>
                <FormattedMessage id="PeakUpHqTeamManagement.title" />
              </h1>
              <p className={adminCss.subtitle}>
                <FormattedMessage id="PeakUpHqTeamManagement.subtitle" />
              </p>
            </header>

            {!hasDashboardAccess ? (
              <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
            ) : (
              <section className={classNames(adminCss.glassCard, css.hqPanel)}>
                <p className={css.rankingNotice}>
                  <FormattedMessage id="PeakUpHqTeamManagement.notice" />
                </p>

                <div className={css.opsLinkGrid}>
                  <NamedLink name="AdminTeamApplicationsPage" className={css.opsLinkCard}>
                    <FormattedMessage id="PeakUpHq.section.teamApplications.title" />
                  </NamedLink>
                  <NamedLink name="PeakUpHqCoachManagementPage" className={css.opsLinkCard}>
                    <FormattedMessage id="PeakUpHqCoachManagement.linkTeamAffiliations" />
                  </NamedLink>
                </div>

                <div className={adminCss.opsHeader}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="PeakUpHqTeamManagement.count"
                      values={{
                        teams: sortedTeams.length,
                        pending: sortedPending.length,
                        coaches: teamCoaches.length,
                        partners: partnerTeams.length,
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
                    <label className={css.searchLabel} htmlFor="team-management-search">
                      <FormattedMessage id="PeakUpHqCoachManagement.searchLabel" />
                    </label>
                    <input
                      id="team-management-search"
                      className={css.searchInput}
                      type="search"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder={intl.formatMessage({
                        id: 'PeakUpHqTeamManagement.searchPlaceholder',
                      })}
                    />
                  </div>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="team-management-sport">
                      <FormattedMessage id="PeakUpHqCoachManagement.filterSport" />
                    </label>
                    <select
                      id="team-management-sport"
                      className={css.filterSelect}
                      value={sportFilter}
                      onChange={event => setSportFilter(event.target.value)}
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'PeakUpHqCoachManagement.filterAll' })}
                      </option>
                      {(filterOptions.sports || []).map(sport => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="team-management-sort">
                      <FormattedMessage id="PeakUpHqTeamManagement.sortLabel" />
                    </label>
                    <select
                      id="team-management-sort"
                      className={css.filterSelect}
                      value={`${sortKey}:${sortDirection}`}
                      onChange={event => {
                        const [key, direction] = event.target.value.split(':');
                        setSortKey(key);
                        setSortDirection(direction);
                      }}
                    >
                      {TEAM_SORT_IDS.flatMap(key => [
                        <option key={`${key}:asc`} value={`${key}:asc`}>
                          {intl.formatMessage({ id: TEAM_SORT_LABEL_IDS[key] })} ↑
                        </option>,
                        <option key={`${key}:desc`} value={`${key}:desc`}>
                          {intl.formatMessage({ id: TEAM_SORT_LABEL_IDS[key] })} ↓
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
                      sectionId="team-directory-heading"
                      titleId="PeakUpHqTeamManagement.directoryTitle"
                      subtitleId="PeakUpHqTeamManagement.directorySubtitle"
                      subtitleValues={{ count: sortedTeams.length }}
                      emptyId="PeakUpHqTeamManagement.directoryEmpty"
                      rows={sortedTeams}
                    >
                      <TeamDirectoryTable teams={sortedTeams} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="pending-teams-heading"
                      titleId="PeakUpHqTeamManagement.pendingTitle"
                      subtitleId="PeakUpHqTeamManagement.pendingSubtitle"
                      subtitleValues={{ count: sortedPending.length }}
                      emptyId="PeakUpHqTeamManagement.pendingEmpty"
                      rows={sortedPending}
                    >
                      <TeamDirectoryTable teams={sortedPending} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="approved-teams-heading"
                      titleId="PeakUpHqTeamManagement.approvedTitle"
                      subtitleId="PeakUpHqTeamManagement.approvedSubtitle"
                      subtitleValues={{ count: sortedApproved.length }}
                      emptyId="PeakUpHqTeamManagement.approvedEmpty"
                      rows={sortedApproved}
                    >
                      <TeamDirectoryTable teams={sortedApproved} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="team-coaches-heading"
                      titleId="PeakUpHqTeamManagement.coachesTitle"
                      subtitleId="PeakUpHqTeamManagement.coachesSubtitle"
                      subtitleValues={{ count: teamCoaches.length }}
                      emptyId="PeakUpHqTeamManagement.coachesEmpty"
                      rows={teamCoaches}
                    >
                      <TeamRosterTable rows={teamCoaches} intl={intl} />
                    </HqModuleSection>

                    <HqModuleSection
                      sectionId="team-invitations-heading"
                      titleId="PeakUpHqTeamManagement.invitationsTitle"
                      subtitleId="PeakUpHqTeamManagement.invitationsSubtitle"
                      subtitleValues={{ count: teamInvitations.length }}
                      emptyId="PeakUpHqTeamManagement.invitationsEmpty"
                      rows={teamInvitations}
                    >
                      <TeamRosterTable rows={teamInvitations} intl={intl} />
                    </HqModuleSection>

                    <section
                      className={classNames(css.managementSection, css.partnerSection)}
                      aria-labelledby="partner-teams-heading"
                    >
                      <header className={css.sectionHeader}>
                        <h2 id="partner-teams-heading" className={css.sectionTitle}>
                          <FormattedMessage id="PeakUpHqTeamManagement.partnerTitle" />
                        </h2>
                        <p className={css.sectionSubtitle}>
                          <FormattedMessage
                            id="PeakUpHqTeamManagement.partnerSubtitle"
                            values={{ count: partnerTeams.length }}
                          />
                        </p>
                      </header>
                      {partnerTeams.length === 0 ? (
                        <p className={css.emptyState}>
                          <FormattedMessage id="PeakUpHqTeamManagement.partnerEmpty" />
                        </p>
                      ) : (
                        <TeamDirectoryTable teams={partnerTeams} intl={intl} />
                      )}
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

export default PeakUpHqTeamManagementPage;
