import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isScrollingDisabled } from '../../../ducks/ui.duck';
import {
  CANCELLATION_CASE_STATUSES,
  isActiveCancellationCaseStatus,
  fetchCancellationCaseDetail,
  fetchCancellationCasesList,
  patchCancellationCase,
  resolveCancellationCase,
  dismissCancellationCase,
  reopenCancellationCase,
  deleteCancellationCase,
} from '../../../util/cancellationAdmin';
import {
  getStoredAdminToken,
  setStoredAdminToken,
} from '../../../util/coachApplicationAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../../util/peakupAdmin';

import { Page, NamedLink } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';

import sportTheme from '../../SportPagesTheme.module.css';
import adminCss from '../../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';
import css from './PeakUpHqCancellationCenterPage.module.css';

const ACTIVE_STATUS_OPTIONS = [
  CANCELLATION_CASE_STATUSES.OPEN,
  CANCELLATION_CASE_STATUSES.IN_PROGRESS,
  CANCELLATION_CASE_STATUSES.REFUND_PENDING,
];

const formatStatusLabel = value =>
  (value || '')
    .split('_')
    .join(' ');

const statusBadgeClass = status => {
  switch (status) {
    case CANCELLATION_CASE_STATUSES.OPEN:
      return css.statusOpen;
    case CANCELLATION_CASE_STATUSES.IN_PROGRESS:
      return css.statusInProgress;
    case CANCELLATION_CASE_STATUSES.RESOLVED:
    case CANCELLATION_CASE_STATUSES.CLOSED:
      return css.statusResolved;
    case CANCELLATION_CASE_STATUSES.REFUND_PENDING:
      return css.statusRefundPending;
    case CANCELLATION_CASE_STATUSES.DISMISSED:
    case CANCELLATION_CASE_STATUSES.CANCELLED:
      return css.statusDismissed;
    default:
      return css.statusDefault;
  }
};

const StatusBadge = ({ status }) => (
  <span className={classNames(css.badge, statusBadgeClass(status))}>{formatStatusLabel(status)}</span>
);

const UrgencyBadge = ({ urgency }) => (
  <span
    className={classNames(
      css.badge,
      urgency === 'high' ? css.urgencyBadgeHigh : css.urgencyBadgeNormal
    )}
  >
    {formatStatusLabel(urgency || 'normal')}
  </span>
);

const CaseSummary = ({ summary }) => (
  <div className={css.summaryGrid}>
    <article className={css.summaryCard}>
      <p className={css.summaryLabel}>
        <FormattedMessage id="PeakUpHqCancellationCenterPage.summaryTotal" />
      </p>
      <p className={css.summaryValue}>{summary.total}</p>
    </article>
    <article className={css.summaryCard}>
      <p className={css.summaryLabel}>
        <FormattedMessage id="PeakUpHqCancellationCenterPage.summaryOpen" />
      </p>
      <p className={css.summaryValue}>{summary.openCount}</p>
    </article>
    <article
      className={classNames(css.summaryCard, summary.highUrgency > 0 && css.summaryCardHigh)}
    >
      <p className={css.summaryLabel}>
        <FormattedMessage id="PeakUpHqCancellationCenterPage.summaryHighUrgency" />
      </p>
      <p
        className={classNames(
          css.summaryValue,
          summary.highUrgency > 0 && css.summaryValueAlert
        )}
      >
        {summary.highUrgency}
      </p>
    </article>
  </div>
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
      await fetchCancellationCasesList();
      onAuthenticated();
    } catch (e) {
      setStoredAdminToken(null);
      if (e.status === 401) {
        setError(intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.gateInvalid' }));
      } else if (e.status === 503) {
        setError(intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.gateNotConfigured' }));
      } else {
        setError(e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.loadError' }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={adminCss.gateForm} onSubmit={handleSubmit}>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="PeakUpHqCancellationCenterPage.gateHint" />
      </p>
      <label className={adminCss.gateLabel} htmlFor="cancellation-admin-token">
        <FormattedMessage id="PeakUpHqCancellationCenterPage.gateLabel" />
      </label>
      <input
        id="cancellation-admin-token"
        className={adminCss.gateInput}
        type="password"
        autoComplete="off"
        value={token}
        onChange={event => setToken(event.target.value)}
        placeholder={intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.gatePlaceholder' })}
      />
      {error ? <p className={adminCss.gateError}>{error}</p> : null}
      <button type="submit" className={adminCss.exportButton} disabled={checking || !token.trim()}>
        <FormattedMessage id="PeakUpHqCancellationCenterPage.gateSubmit" />
      </button>
    </form>
  );
};

const formatTimestamp = (iso, intl) => {
  if (!iso) {
    return '—';
  }
  return intl.formatDate(new Date(iso), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PageHeader = () => (
  <header className={classNames(adminCss.header, css.pageHeader)}>
    <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
      <FormattedMessage id="PeakUpHq.backToOverview" />
    </NamedLink>
    <p className={adminCss.eyebrow}>
      <FormattedMessage id="PeakUpHqCancellationCenterPage.eyebrow" />
    </p>
    <h1 className={adminCss.title}>
      <FormattedMessage id="PeakUpHqCancellationCenterPage.title" />
    </h1>
    <p className={adminCss.subtitle}>
      <FormattedMessage id="PeakUpHqCancellationCenterPage.subtitle" />
    </p>
  </header>
);

const PeakUpHqCancellationCenterPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const currentUser = useSelector(state => state.user.currentUser);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const [tokenAuthenticated, setTokenAuthenticated] = useState(false);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [status, setStatus] = useState(CANCELLATION_CASE_STATUSES.OPEN);
  const [refundStatus, setRefundStatus] = useState('pending_review');
  const [reassignmentStatus, setReassignmentStatus] = useState('not_started');
  const [urgency, setUrgency] = useState('normal');

  const hasDashboardAccess = hasPeakUpHqAdminDashboardAccess(
    currentUser,
    config,
    tokenAuthenticated
  );
  const sessionAdmin = canAccessHqAdminApiViaSession(currentUser, config);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCancellationCasesList();
      setCases(list);
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    if (hasDashboardAccess) {
      loadCases();
    }
  }, [hasDashboardAccess, loadCases]);

  const summary = useMemo(() => {
    const openCount = cases.filter(c => isActiveCancellationCaseStatus(c.status)).length;
    const highUrgency = cases.filter(
      c => c.urgency === 'high' && isActiveCancellationCaseStatus(c.status)
    ).length;
    const pendingOutcome = cases.filter(
      c => c.cancellationOutcome === 'cancellation_pending' && isActiveCancellationCaseStatus(c.status)
    ).length;
    return { total: cases.length, openCount, highUrgency, pendingOutcome };
  }, [cases]);

  const isSelectedCaseActive = selectedDetail
    ? isActiveCancellationCaseStatus(selectedDetail.status)
    : false;

  const buildFormPatch = () => ({
    adminNotes,
    refundStatus,
    reassignmentStatus,
    urgency,
    status,
  });

  const refreshAfterCaseChange = async caseId => {
    await loadCases();
    if (caseId) {
      await loadDetail(caseId);
    }
  };

  const loadDetail = async caseId => {
    setSelectedId(caseId);
    setDetailLoading(true);
    try {
      const detail = await fetchCancellationCaseDetail(caseId);
      setSelectedDetail(detail);
      setAdminNotes(detail.adminNotes || '');
      setStatus(detail.status || CANCELLATION_CASE_STATUSES.OPEN);
      setRefundStatus(detail.refundStatus || 'pending_review');
      setReassignmentStatus(detail.reassignmentStatus || 'not_started');
      setUrgency(detail.urgency || 'normal');
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.loadError' }));
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedId) {
      return;
    }
    setSaveInProgress(true);
    setError(null);
    try {
      await patchCancellationCase(selectedId, buildFormPatch());
      await refreshAfterCaseChange(selectedId);
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.saveError' }));
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleResolveCase = async () => {
    if (!selectedId) {
      return;
    }
    setActionInProgress(true);
    setError(null);
    try {
      await resolveCancellationCase(selectedId, buildFormPatch());
      await refreshAfterCaseChange(selectedId);
    } catch (e) {
      setError(
        e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.resolveError' })
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDismissCase = async () => {
    if (!selectedId) {
      return;
    }
    const confirmed = window.confirm(
      intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.confirmDismiss' })
    );
    if (!confirmed) {
      return;
    }
    setActionInProgress(true);
    setError(null);
    try {
      await dismissCancellationCase(selectedId, buildFormPatch());
      await refreshAfterCaseChange(selectedId);
    } catch (e) {
      setError(
        e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.dismissError' })
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReopenCase = async () => {
    if (!selectedId) {
      return;
    }
    setActionInProgress(true);
    setError(null);
    try {
      await reopenCancellationCase(selectedId, buildFormPatch());
      await refreshAfterCaseChange(selectedId);
    } catch (e) {
      setError(
        e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.reopenError' })
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedId) {
      return;
    }
    const confirmed = window.confirm(
      intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.confirmDelete' })
    );
    if (!confirmed) {
      return;
    }
    setActionInProgress(true);
    setError(null);
    try {
      await deleteCancellationCase(selectedId);
      setSelectedId(null);
      setSelectedDetail(null);
      await loadCases();
    } catch (e) {
      setError(
        e.message || intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.deleteError' })
      );
    } finally {
      setActionInProgress(false);
    }
  };

  const handleLogout = () => {
    setStoredAdminToken(null);
    setTokenAuthenticated(false);
    setCases([]);
    setSelectedId(null);
    setSelectedDetail(null);
  };

  const title = intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.schemaTitle' });

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, adminCss.page)}
    >
      <PeakUpHqAdminGate>
        <TopbarContainer currentPage="PeakUpHqCancellationCenterPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={adminCss.rail}>
            <PageHeader />

            {!hasDashboardAccess ? (
              <section className={classNames(adminCss.glassCard, css.gateCard)}>
                <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
              </section>
            ) : (
              <>
                <div className={css.opsBar}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="PeakUpHqCancellationCenterPage.caseCount"
                      values={{ count: cases.length }}
                    />
                  </span>
                  <div className={adminCss.toolbarActions}>
                    <button
                      type="button"
                      className={adminCss.exportButton}
                      onClick={loadCases}
                      disabled={loading}
                    >
                      <FormattedMessage id="PeakUpHqCancellationCenterPage.refresh" />
                    </button>
                    {!sessionAdmin ? (
                      <button
                        type="button"
                        className={adminCss.secondaryButton}
                        onClick={handleLogout}
                      >
                        <FormattedMessage id="PeakUpHqCancellationCenterPage.logout" />
                      </button>
                    ) : null}
                  </div>
                </div>

                {error ? <p className={css.errorBanner}>{error}</p> : null}

                <CaseSummary summary={summary} />

                {loading ? (
                  <p className={css.stateCard}>
                    <FormattedMessage id="PeakUpHqCancellationCenterPage.loading" />
                  </p>
                ) : cases.length === 0 ? (
                  <p className={css.stateCard}>
                    <FormattedMessage id="PeakUpHqCancellationCenterPage.empty" />
                  </p>
                ) : (
                  <section
                    className={classNames(adminCss.glassCard, css.tableSection)}
                    aria-label={intl.formatMessage({ id: 'PeakUpHqCancellationCenterPage.title' })}
                  >
                    <div className={css.tableWrap}>
                      <table className={css.caseTable}>
                        <thead>
                          <tr>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colCoach" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colCustomer" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colSession" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colBookingAt" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colStatus" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colUrgency" />
                            </th>
                            <th>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colCreated" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cases.map(cancellationCase => (
                            <tr
                              key={cancellationCase.id}
                              className={classNames(css.caseRow, {
                                [css.caseRowSelected]: selectedId === cancellationCase.id,
                              })}
                              onClick={() => loadDetail(cancellationCase.id)}
                            >
                              <td>{cancellationCase.coachName}</td>
                              <td>{cancellationCase.customerName}</td>
                              <td>{cancellationCase.sessionTitle}</td>
                              <td className={css.cellMuted}>{cancellationCase.bookingAt}</td>
                              <td>
                                <StatusBadge status={cancellationCase.status} />
                              </td>
                              <td>
                                <UrgencyBadge urgency={cancellationCase.urgency} />
                              </td>
                              <td className={css.cellMuted}>
                                {formatTimestamp(cancellationCase.createdAt, intl)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {selectedId ? (
                  <section
                    className={classNames(adminCss.glassCard, css.detailPanel)}
                    aria-labelledby="cancellation-case-detail"
                  >
                    <h2 id="cancellation-case-detail" className={css.detailHeading}>
                      <FormattedMessage id="PeakUpHqCancellationCenterPage.detailTitle" />
                    </h2>
                    {detailLoading || !selectedDetail ? (
                      <p className={css.stateCard}>
                        <FormattedMessage id="PeakUpHqCancellationCenterPage.loading" />
                      </p>
                    ) : (
                      <>
                        <div className={css.detailGrid}>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colCoach" />
                            </p>
                            <p className={css.detailValue}>{selectedDetail.coachName}</p>
                          </div>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colCustomer" />
                            </p>
                            <p className={css.detailValue}>{selectedDetail.customerName}</p>
                          </div>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colSession" />
                            </p>
                            <p className={css.detailValue}>{selectedDetail.sessionTitle}</p>
                          </div>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colBookingAt" />
                            </p>
                            <p className={css.detailValue}>{selectedDetail.bookingAt}</p>
                          </div>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colOutcome" />
                            </p>
                            <p
                              className={classNames(
                                css.detailValue,
                                selectedDetail.cancellationOutcome === 'cancellation_pending'
                                  ? css.outcomePending
                                  : css.outcomeCancelled
                              )}
                            >
                              {selectedDetail.cancellationOutcome}
                            </p>
                          </div>
                          <div className={css.detailBlock}>
                            <p className={css.detailLabel}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colTransaction" />
                            </p>
                            <p className={css.detailValue}>{selectedDetail.transactionId}</p>
                          </div>
                        </div>

                        <div className={css.detailStatusRow}>
                          <StatusBadge status={selectedDetail.status} />
                          {!isSelectedCaseActive ? (
                            <span className={css.workflowMetaItem}>
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.statusInactiveHint" />
                            </span>
                          ) : null}
                        </div>

                        {selectedDetail.resolvedAt ||
                        selectedDetail.dismissedAt ||
                        selectedDetail.reopenedAt ? (
                          <div className={css.workflowMeta}>
                            {selectedDetail.resolvedAt ? (
                              <span className={css.workflowMetaItem}>
                                <FormattedMessage
                                  id="PeakUpHqCancellationCenterPage.resolvedAt"
                                  values={{
                                    date: formatTimestamp(selectedDetail.resolvedAt, intl),
                                  }}
                                />
                              </span>
                            ) : null}
                            {selectedDetail.dismissedAt ? (
                              <span className={css.workflowMetaItem}>
                                <FormattedMessage
                                  id="PeakUpHqCancellationCenterPage.dismissedAt"
                                  values={{
                                    date: formatTimestamp(selectedDetail.dismissedAt, intl),
                                  }}
                                />
                              </span>
                            ) : null}
                            {selectedDetail.reopenedAt ? (
                              <span className={css.workflowMetaItem}>
                                <FormattedMessage
                                  id="PeakUpHqCancellationCenterPage.reopenedAt"
                                  values={{
                                    date: formatTimestamp(selectedDetail.reopenedAt, intl),
                                  }}
                                />
                              </span>
                            ) : null}
                          </div>
                        ) : null}

                        <div className={css.formStack}>
                          {isSelectedCaseActive ? (
                            <div>
                              <label className={css.detailLabel} htmlFor="case-status">
                                <FormattedMessage id="PeakUpHqCancellationCenterPage.fieldStatus" />
                              </label>
                              <select
                                id="case-status"
                                className={css.selectField}
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                              >
                                {ACTIVE_STATUS_OPTIONS.map(value => (
                                  <option key={value} value={value}>
                                    {formatStatusLabel(value)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}

                          <div>
                            <label className={css.detailLabel} htmlFor="case-refund">
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.fieldRefund" />
                            </label>
                            <select
                              id="case-refund"
                              className={css.selectField}
                              value={refundStatus}
                              onChange={e => setRefundStatus(e.target.value)}
                            >
                              <option value="pending_review">pending_review</option>
                              <option value="refunded">refunded</option>
                              <option value="not_required">not_required</option>
                            </select>
                          </div>

                          <div>
                            <label className={css.detailLabel} htmlFor="case-reassignment">
                              <FormattedMessage
                                id="PeakUpHqCancellationCenterPage.fieldReassignment"
                              />
                            </label>
                            <select
                              id="case-reassignment"
                              className={css.selectField}
                              value={reassignmentStatus}
                              onChange={e => setReassignmentStatus(e.target.value)}
                            >
                              <option value="not_started">not_started</option>
                              <option value="in_progress">in_progress</option>
                              <option value="completed">completed</option>
                            </select>
                          </div>

                          <div>
                            <label className={css.detailLabel} htmlFor="case-urgency">
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.colUrgency" />
                            </label>
                            <select
                              id="case-urgency"
                              className={css.selectField}
                              value={urgency}
                              onChange={e => setUrgency(e.target.value)}
                            >
                              <option value="normal">normal</option>
                              <option value="high">high</option>
                            </select>
                          </div>

                          <div>
                            <label className={css.detailLabel} htmlFor="case-notes">
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.fieldNotes" />
                            </label>
                            <textarea
                              id="case-notes"
                              className={css.notesField}
                              value={adminNotes}
                              onChange={e => setAdminNotes(e.target.value)}
                              placeholder={intl.formatMessage({
                                id: 'PeakUpHqCancellationCenterPage.notesPlaceholder',
                              })}
                            />
                          </div>
                        </div>

                        <div className={css.actionRow}>
                          <button
                            type="button"
                            className={adminCss.exportButton}
                            onClick={handleSaveDetail}
                            disabled={saveInProgress || actionInProgress}
                          >
                            <FormattedMessage id="PeakUpHqCancellationCenterPage.save" />
                          </button>
                          {isSelectedCaseActive ? (
                            <>
                              <button
                                type="button"
                                className={adminCss.secondaryButton}
                                onClick={handleResolveCase}
                                disabled={saveInProgress || actionInProgress}
                              >
                                <FormattedMessage id="PeakUpHqCancellationCenterPage.markResolved" />
                              </button>
                              <button
                                type="button"
                                className={classNames(adminCss.secondaryButton, css.actionDanger)}
                                onClick={handleDismissCase}
                                disabled={saveInProgress || actionInProgress}
                              >
                                <FormattedMessage id="PeakUpHqCancellationCenterPage.dismissCase" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={adminCss.secondaryButton}
                              onClick={handleReopenCase}
                              disabled={saveInProgress || actionInProgress}
                            >
                              <FormattedMessage id="PeakUpHqCancellationCenterPage.reopenCase" />
                            </button>
                          )}
                          <button
                            type="button"
                            className={classNames(adminCss.secondaryButton, css.actionDanger)}
                            onClick={handleDeleteCase}
                            disabled={saveInProgress || actionInProgress}
                          >
                            <FormattedMessage id="PeakUpHqCancellationCenterPage.deleteCase" />
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                ) : null}
              </>
            )}
          </div>
        </main>

        <FooterContainer />
      </PeakUpHqAdminGate>
    </Page>
  );
};

export default PeakUpHqCancellationCenterPage;
