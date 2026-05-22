import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { useHistory, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import moment from 'moment';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  APPLICATION_STATUSES,
  coachApplicationDocumentUrl,
  deleteCoachApplication,
  fetchCoachApplicationDetail,
  fetchCoachApplicationsList,
  formatApplicationType,
  getStoredAdminToken,
  patchCoachApplicationStatus,
  setStoredAdminToken,
  STATUS_LABEL_IDS,
} from '../../util/coachApplicationAdmin';
import { downloadCoachApplicationsXlsx } from '../../util/coachApplicationExport';

import { Page } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import sportTheme from '../SportPagesTheme.module.css';
import css from './AdminCoachApplicationsPage.module.css';

const STATUS_BADGE_CLASS = {
  [APPLICATION_STATUSES.PENDING]: css.badgePending,
  [APPLICATION_STATUSES.APPROVED]: css.badgeApproved,
  [APPLICATION_STATUSES.REJECTED]: css.badgeRejected,
  [APPLICATION_STATUSES.NEED_MORE_INFO]: css.badgeNeedMoreInfo,
};

const APPLICATION_TYPE_LABEL_IDS = {
  ambassador_interest: 'AdminCoachApplicationsPage.typeAmbassadorInterest',
  independent: 'AdminCoachApplicationsPage.typeIndependent',
  referral: 'AdminCoachApplicationsPage.typeReferral',
  standard: 'AdminCoachApplicationsPage.typeStandard',
};

const HEAR_ABOUT_LABEL_IDS = {
  socialMedia: 'CoachApplicationPage.hearAbout.socialMedia',
  friendCoach: 'CoachApplicationPage.hearAbout.friendCoach',
  ambassador: 'CoachApplicationPage.hearAbout.ambassador',
  searchEngine: 'CoachApplicationPage.hearAbout.searchEngine',
  event: 'CoachApplicationPage.hearAbout.event',
  other: 'CoachApplicationPage.hearAbout.other',
};

const CERT_LABEL_IDS = {
  none: 'CoachApplicationPage.certification.none',
  national: 'CoachApplicationPage.certification.national',
  international: 'CoachApplicationPage.certification.international',
  federation: 'CoachApplicationPage.certification.federation',
  instructor: 'CoachApplicationPage.certification.instructor',
  other: 'CoachApplicationPage.certification.other',
};

const getDocIcon = fileName => {
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    return { emoji: '📄', className: css.docIconPdf };
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { emoji: '🖼', className: css.docIconImage };
  }
  return { emoji: '📎', className: '' };
};

const DocumentCard = ({ applicationId, file }) => {
  const icon = getDocIcon(file.originalName || file.fileName);
  const ext = (file.originalName || file.fileName || '').split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <a
      className={css.docCard}
      href={coachApplicationDocumentUrl(applicationId, file.fileName)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={classNames(css.docIcon, icon.className)} aria-hidden="true">
        {icon.emoji}
      </span>
      <span className={css.docMeta}>
        <p className={css.docName}>{file.originalName || file.fileName}</p>
        <p className={css.docType}>{ext}</p>
      </span>
      <span className={css.docArrow} aria-hidden="true">
        ↗
      </span>
    </a>
  );
};

const DetailPanel = ({ title, children, startOpen = true }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (startOpen && ref.current) {
      ref.current.open = true;
    }
  }, [startOpen]);

  return (
    <details ref={ref} className={css.detailPanel}>
      <summary className={css.detailPanelSummary}>{title}</summary>
      <div className={css.detailPanelBody}>{children}</div>
    </details>
  );
};

const DeleteApplicationConfirm = ({ applicantName, deleting, error, onCancel, onConfirm }) => (
  <div className={css.deleteConfirm} role="alertdialog" aria-labelledby="delete-confirm-title">
    <p id="delete-confirm-title" className={css.deleteConfirmTitle}>
      <FormattedMessage id="AdminCoachApplicationsPage.deleteConfirmTitle" />
    </p>
    <p className={css.deleteConfirmBody}>
      <FormattedMessage
        id="AdminCoachApplicationsPage.deleteConfirmBody"
        values={{ name: applicantName }}
      />
    </p>
    {error ? <p className={css.deleteConfirmError}>{error}</p> : null}
    <div className={css.deleteConfirmActions}>
      <button type="button" className={css.secondaryButton} onClick={onCancel} disabled={deleting}>
        <FormattedMessage id="AdminCoachApplicationsPage.deleteCancel" />
      </button>
      <button type="button" className={css.dangerButton} onClick={onConfirm} disabled={deleting}>
        <FormattedMessage id="AdminCoachApplicationsPage.deleteConfirmAction" />
      </button>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const intl = useIntl();
  const labelId = STATUS_LABEL_IDS[status] || STATUS_LABEL_IDS[APPLICATION_STATUSES.PENDING];
  return (
    <span className={classNames(css.badge, STATUS_BADGE_CLASS[status] || css.badgePending)}>
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
      await fetchCoachApplicationsList();
      onAuthenticated();
    } catch (err) {
      setStoredAdminToken(null);
      if (err.status === 401) {
        setError(intl.formatMessage({ id: 'AdminCoachApplicationsPage.gateInvalid' }));
      } else if (err.status === 503) {
        setError(intl.formatMessage({ id: 'AdminCoachApplicationsPage.gateNotConfigured' }));
      } else {
        setError(err.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.loadError' }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className={css.glassCard}>
      <form className={css.gateForm} onSubmit={handleSubmit}>
        <p className={css.gateHint}>
          <FormattedMessage id="AdminCoachApplicationsPage.gateHint" />
        </p>
        <label className={css.gateLabel} htmlFor="admin-token">
          <FormattedMessage id="AdminCoachApplicationsPage.gateLabel" />
        </label>
        <input
          id="admin-token"
          className={css.gateInput}
          type="password"
          autoComplete="off"
          value={tokenInput}
          onChange={e => setTokenInput(e.target.value)}
          placeholder={intl.formatMessage({ id: 'AdminCoachApplicationsPage.gatePlaceholder' })}
        />
        {error ? <p className={css.gateError}>{error}</p> : null}
        <button type="submit" className={css.primaryButton} disabled={checking || !tokenInput.trim()}>
          <FormattedMessage id="AdminCoachApplicationsPage.gateSubmit" />
        </button>
      </form>
    </section>
  );
};

const ApplicationFilters = ({ filters, onChange, sports, countries }) => {
  const intl = useIntl();

  return (
    <div className={css.toolbar}>
      <div className={css.field}>
        <label className={css.fieldLabel} htmlFor="filter-search">
          <FormattedMessage id="AdminCoachApplicationsPage.filterSearch" />
        </label>
        <input
          id="filter-search"
          className={css.fieldInput}
          type="search"
          value={filters.search}
          onChange={e => onChange({ search: e.target.value })}
          placeholder={intl.formatMessage({ id: 'AdminCoachApplicationsPage.filterSearchPlaceholder' })}
        />
      </div>
      <div className={css.field}>
        <label className={css.fieldLabel} htmlFor="filter-status">
          <FormattedMessage id="AdminCoachApplicationsPage.filterStatus" />
        </label>
        <select
          id="filter-status"
          className={css.fieldSelect}
          value={filters.status}
          onChange={e => onChange({ status: e.target.value })}
        >
          <option value="">{intl.formatMessage({ id: 'AdminCoachApplicationsPage.filterAll' })}</option>
          {Object.values(APPLICATION_STATUSES).map(status => (
            <option key={status} value={status}>
              {intl.formatMessage({ id: STATUS_LABEL_IDS[status] })}
            </option>
          ))}
        </select>
      </div>
      <div className={css.field}>
        <label className={css.fieldLabel} htmlFor="filter-sport">
          <FormattedMessage id="AdminCoachApplicationsPage.filterSport" />
        </label>
        <select
          id="filter-sport"
          className={css.fieldSelect}
          value={filters.sport}
          onChange={e => onChange({ sport: e.target.value })}
        >
          <option value="">{intl.formatMessage({ id: 'AdminCoachApplicationsPage.filterAll' })}</option>
          {sports.map(sport => (
            <option key={sport} value={sport}>
              {sport}
            </option>
          ))}
        </select>
      </div>
      <div className={css.field}>
        <label className={css.fieldLabel} htmlFor="filter-country">
          <FormattedMessage id="AdminCoachApplicationsPage.filterCountry" />
        </label>
        <select
          id="filter-country"
          className={css.fieldSelect}
          value={filters.country}
          onChange={e => onChange({ country: e.target.value })}
        >
          <option value="">{intl.formatMessage({ id: 'AdminCoachApplicationsPage.filterAll' })}</option>
          {countries.map(country => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>
      </div>
      <div className={css.field}>
        <label className={css.fieldLabel} htmlFor="filter-referral">
          <FormattedMessage id="AdminCoachApplicationsPage.filterReferral" />
        </label>
        <input
          id="filter-referral"
          className={css.fieldInput}
          type="text"
          value={filters.referral}
          onChange={e => onChange({ referral: e.target.value })}
          placeholder={intl.formatMessage({
            id: 'AdminCoachApplicationsPage.filterReferralPlaceholder',
          })}
        />
      </div>
      <button
        type="button"
        className={css.secondaryButton}
        onClick={() =>
          onChange({ search: '', status: '', sport: '', country: '', referral: '' })
        }
      >
        <FormattedMessage id="AdminCoachApplicationsPage.clearFilters" />
      </button>
    </div>
  );
};

const ApplicationsList = ({ applications, onOpen, onRequestDelete }) => {
  const intl = useIntl();

  if (applications.length === 0) {
    return (
      <p className={css.emptyState}>
        <FormattedMessage id="AdminCoachApplicationsPage.empty" />
      </p>
    );
  }

  const formatDate = value => (value ? moment(value).format('D MMM YYYY, HH:mm') : '—');
  const formatType = app => {
    const type = formatApplicationType(app);
    const id = APPLICATION_TYPE_LABEL_IDS[type] || APPLICATION_TYPE_LABEL_IDS.standard;
    return intl.formatMessage({ id });
  };

  return (
    <>
      <div className={css.desktopTable}>
        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colName" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colEmail" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colSport" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colLocation" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colReferral" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colType" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colStatus" /></th>
                <th><FormattedMessage id="AdminCoachApplicationsPage.colSubmitted" /></th>
                <th className={css.colActions}>
                  <FormattedMessage id="AdminCoachApplicationsPage.colActions" />
                </th>
              </tr>
            </thead>
            <tbody>
              {applications.map(app => (
                <tr
                  key={app.id}
                  className={css.tableRowInteractive}
                  onClick={() => onOpen(app.id)}
                  onKeyDown={e => e.key === 'Enter' && onOpen(app.id)}
                  tabIndex={0}
                  role="button"
                >
                  <td>
                    <span className={css.rowLink}>{app.fullName}</span>
                  </td>
                  <td>{app.email}</td>
                  <td>{app.mainSport}</td>
                  <td>
                    {[app.country, app.cityArea].filter(Boolean).join(' · ')}
                  </td>
                  <td>{app.ambassadorReferralCode || '—'}</td>
                  <td>{formatType(app)}</td>
                  <td>
                    <StatusBadge status={app.status} />
                  </td>
                  <td>{formatDate(app.submittedAt)}</td>
                  <td className={css.colActions}>
                    <button
                      type="button"
                      className={css.rowDeleteButton}
                      onClick={e => {
                        e.stopPropagation();
                        onRequestDelete(app);
                      }}
                      aria-label={intl.formatMessage(
                        { id: 'AdminCoachApplicationsPage.deleteApplicationAria' },
                        { name: app.fullName }
                      )}
                    >
                      <FormattedMessage id="AdminCoachApplicationsPage.deleteApplication" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={css.mobileCards}>
        {applications.map(app => (
          <article
            key={app.id}
            className={css.appCard}
            onClick={() => onOpen(app.id)}
            onKeyDown={e => e.key === 'Enter' && onOpen(app.id)}
            tabIndex={0}
            role="button"
          >
            <div className={css.appCardTop}>
              <span className={css.rowLink}>{app.fullName}</span>
              <StatusBadge status={app.status} />
            </div>
            <div>{app.email}</div>
            <div>
              {app.mainSport} · {[app.country, app.cityArea].filter(Boolean).join(', ')}
            </div>
            <div>
              <FormattedMessage id="AdminCoachApplicationsPage.colReferral" />:{' '}
              {app.ambassadorReferralCode || '—'}
            </div>
            <div>{formatDate(app.submittedAt)}</div>
            <button
              type="button"
              className={css.rowDeleteButton}
              onClick={e => {
                e.stopPropagation();
                onRequestDelete(app);
              }}
            >
              <FormattedMessage id="AdminCoachApplicationsPage.deleteApplication" />
            </button>
          </article>
        ))}
      </div>
    </>
  );
};

const DetailRow = ({ label, value }) => (
  <div className={css.detailRow}>
    <dt className={css.detailLabel}>{label}</dt>
    <dd className={css.detailValue}>{value || '—'}</dd>
  </div>
);

const ApplicationDetail = ({ applicationId, onBack, onStatusUpdated, onDeleted }) => {
  const intl = useIntl();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCoachApplicationDetail(applicationId);
      setApplication(data);
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [applicationId, intl]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatus = async status => {
    setUpdating(true);
    try {
      const updated = await patchCoachApplicationStatus(applicationId, status);
      setApplication(updated);
      onStatusUpdated(updated);
    } catch (e) {
      setError(e.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.updateError' }));
    } finally {
      setUpdating(false);
    }
  };

  const yesNo = value =>
    value
      ? intl.formatMessage({ id: 'AdminCoachApplicationsPage.yes' })
      : intl.formatMessage({ id: 'AdminCoachApplicationsPage.no' });

  const hearAboutLabel = key =>
    key && HEAR_ABOUT_LABEL_IDS[key]
      ? intl.formatMessage({ id: HEAR_ABOUT_LABEL_IDS[key] })
      : key || '—';

  const certLabel = key =>
    key && CERT_LABEL_IDS[key] ? intl.formatMessage({ id: CERT_LABEL_IDS[key] }) : key || '—';

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCoachApplication(applicationId);
      onDeleted(applicationId);
    } catch (e) {
      setDeleteError(
        e.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.deleteError' })
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <p className={css.loadingState}><FormattedMessage id="AdminCoachApplicationsPage.loading" /></p>;
  }

  if (error && !application) {
    return <p className={css.errorState}>{error}</p>;
  }

  if (!application) {
    return null;
  }

  const typeKey = formatApplicationType(application);
  const typeId = APPLICATION_TYPE_LABEL_IDS[typeKey] || APPLICATION_TYPE_LABEL_IDS.standard;

  return (
    <section className={css.glassCard}>
      <button type="button" className={css.backLink} onClick={onBack}>
        ← <FormattedMessage id="AdminCoachApplicationsPage.backToList" />
      </button>

      <div className={css.detailHero}>
        <div>
          <h2 className={css.detailHeroName}>{application.fullName}</h2>
          <p className={css.detailHeroEmail}>{application.email}</p>
        </div>
        <StatusBadge status={application.status} />
      </div>

      <div className={css.actionsRow}>
        <button
          type="button"
          className={classNames(css.actionButton, css.actionButtonApprove)}
          disabled={updating}
          onClick={() => handleStatus(APPLICATION_STATUSES.APPROVED)}
        >
          <FormattedMessage id="AdminCoachApplicationsPage.actionApprove" />
        </button>
        <button
          type="button"
          className={classNames(css.actionButton, css.actionButtonReject)}
          disabled={updating}
          onClick={() => handleStatus(APPLICATION_STATUSES.REJECTED)}
        >
          <FormattedMessage id="AdminCoachApplicationsPage.actionReject" />
        </button>
        <button
          type="button"
          className={classNames(css.actionButton, css.actionButtonInfo)}
          disabled={updating}
          onClick={() => handleStatus(APPLICATION_STATUSES.NEED_MORE_INFO)}
        >
          <FormattedMessage id="AdminCoachApplicationsPage.actionNeedMoreInfo" />
        </button>
        <button
          type="button"
          className={classNames(css.actionButton, css.actionButtonPending)}
          disabled={updating}
          onClick={() => handleStatus(APPLICATION_STATUSES.PENDING)}
        >
          <FormattedMessage id="AdminCoachApplicationsPage.actionResetPending" />
        </button>
      </div>

      {error ? <p className={css.errorState}>{error}</p> : null}

      <DetailPanel title={intl.formatMessage({ id: 'AdminCoachApplicationsPage.sectionPersonal' })}>
        <dl className={css.detailList}>
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.fullNameLabel' })}
            value={application.fullName}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.emailLabel' })}
            value={application.email}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.phoneLabel' })}
            value={application.phone}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.dateOfBirthLabel' })}
            value={application.dateOfBirth}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.countryLabel' })}
            value={application.country}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.cityAreaLabel' })}
            value={application.cityArea}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.languagesLabel' })}
            value={application.languagesSpoken}
          />
        </dl>
      </DetailPanel>

      <DetailPanel title={intl.formatMessage({ id: 'AdminCoachApplicationsPage.sectionCoaching' })}>
        <dl className={css.detailList}>
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.mainSportLabel' })}
            value={application.mainSport}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.otherSportsLabel' })}
            value={application.otherSports}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.yearsExperienceLabel' })}
            value={application.yearsExperience}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.certificationLevelLabel' })}
            value={certLabel(application.certificationLevel)}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.federationSchoolLabel' })}
            value={application.federationSchool}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.shortBioLabel' })}
            value={application.shortBio}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.instagramWebsiteLabel' })}
            value={application.instagramWebsite}
          />
        </dl>
      </DetailPanel>

      <DetailPanel title={intl.formatMessage({ id: 'AdminCoachApplicationsPage.sectionReferral' })}>
        <dl className={css.detailList}>
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.hearAboutLabel' })}
            value={hearAboutLabel(application.hearAboutPeakUp)}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'CoachApplicationPage.ambassadorCodeLabel' })}
            value={application.ambassadorReferralCode}
          />
          <DetailRow
            label={intl.formatMessage({
              id: 'CoachApplicationPage.applyingIndependentlyLabel',
            })}
            value={yesNo(application.applyingIndependently)}
          />
          <DetailRow
            label={intl.formatMessage({
              id: 'CoachApplicationPage.interestedInAmbassadorLabel',
            })}
            value={yesNo(application.interestedInAmbassador)}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'AdminCoachApplicationsPage.colType' })}
            value={intl.formatMessage({ id: typeId })}
          />
        </dl>
      </DetailPanel>

      <DetailPanel title={intl.formatMessage({ id: 'AdminCoachApplicationsPage.sectionDocuments' })}>
        {(application.savedFiles || []).length > 0 ? (
          <ul className={css.docGrid}>
            {application.savedFiles.map(file => (
              <li key={file.fileName}>
                <DocumentCard applicationId={application.id} file={file} />
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.emptyState}>
            <FormattedMessage id="AdminCoachApplicationsPage.noDocuments" />
          </p>
        )}
      </DetailPanel>

      <DetailPanel
        title={intl.formatMessage({ id: 'AdminCoachApplicationsPage.sectionMeta' })}
        startOpen={false}
      >
        <dl className={css.detailList}>
          <DetailRow
            label={intl.formatMessage({ id: 'AdminCoachApplicationsPage.colSubmitted' })}
            value={moment(application.submittedAt).format('D MMM YYYY, HH:mm')}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'AdminCoachApplicationsPage.colUpdated' })}
            value={moment(application.updatedAt).format('D MMM YYYY, HH:mm')}
          />
          <DetailRow
            label={intl.formatMessage({ id: 'AdminCoachApplicationsPage.applicationId' })}
            value={application.id}
          />
        </dl>
      </DetailPanel>

      <section className={css.dangerZone} aria-labelledby="delete-application-heading">
        <h3 id="delete-application-heading" className={css.dangerZoneTitle}>
          <FormattedMessage id="AdminCoachApplicationsPage.dangerZoneTitle" />
        </h3>
        <p className={css.dangerZoneHint}>
          <FormattedMessage id="AdminCoachApplicationsPage.dangerZoneHint" />
        </p>
        {deleteConfirmOpen ? (
          <DeleteApplicationConfirm
            applicantName={application.fullName}
            deleting={deleting}
            error={deleteError}
            onCancel={() => {
              setDeleteConfirmOpen(false);
              setDeleteError(null);
            }}
            onConfirm={handleDelete}
          />
        ) : (
          <button
            type="button"
            className={css.dangerButton}
            disabled={updating || deleting}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <FormattedMessage id="AdminCoachApplicationsPage.deleteApplication" />
          </button>
        )}
      </section>
    </section>
  );
};

/**
 * Internal MVP admin dashboard for coach applications (not linked in public nav).
 */
const AdminCoachApplicationsPage = () => {
  const intl = useIntl();
  const config = useConfiguration();
  const history = useHistory();
  const { applicationId } = useParams();
  const scrollingDisabled = useSelector(isScrollingDisabled);
  const marketplaceName = config.branding.marketplaceName || 'PeakUp';

  const [authenticated, setAuthenticated] = useState(() => !!getStoredAdminToken());
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    sport: '',
    country: '',
    referral: '',
  });
  const [pendingDelete, setPendingDelete] = useState(null);
  const [listDeleting, setListDeleting] = useState(false);
  const [listDeleteError, setListDeleteError] = useState(null);

  const title = intl.formatMessage(
    { id: 'AdminCoachApplicationsPage.schemaTitle' },
    { marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchCoachApplicationsList();
      setApplications(list);
    } catch (e) {
      if (e.status === 401) {
        setStoredAdminToken(null);
        setAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [intl]);

  useEffect(() => {
    if (authenticated) {
      loadList();
    }
  }, [authenticated, loadList]);

  const sports = useMemo(
    () => [...new Set(applications.map(a => a.mainSport).filter(Boolean))].sort(),
    [applications]
  );

  const countries = useMemo(
    () => [...new Set(applications.map(a => a.country).filter(Boolean))].sort(),
    [applications]
  );

  const filteredApplications = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const referral = filters.referral.trim().toLowerCase();

    return applications.filter(app => {
      if (filters.status && app.status !== filters.status) {
        return false;
      }
      if (filters.sport && app.mainSport !== filters.sport) {
        return false;
      }
      if (filters.country && app.country !== filters.country) {
        return false;
      }
      if (referral) {
        const code = (app.ambassadorReferralCode || '').toLowerCase();
        if (!code.includes(referral)) {
          return false;
        }
      }
      if (search) {
        const haystack = `${app.fullName} ${app.email}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }
      return true;
    });
  }, [applications, filters]);

  const openDetail = id => {
    history.push(`/admin/coach-applications/${id}`);
  };

  const backToList = () => {
    history.push('/admin/coach-applications');
  };

  const handleStatusUpdated = updated => {
    setApplications(prev =>
      prev.map(item => (item.id === updated.id ? { ...item, status: updated.status, updatedAt: updated.updatedAt } : item))
    );
  };

  const handleApplicationDeleted = deletedId => {
    setApplications(prev => prev.filter(item => item.id !== deletedId));
    if (applicationId === deletedId) {
      history.push('/admin/coach-applications');
    }
  };

  const handleExportExcel = () => {
    downloadCoachApplicationsXlsx(filteredApplications);
  };

  const handleConfirmListDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    setListDeleting(true);
    setListDeleteError(null);
    try {
      await deleteCoachApplication(pendingDelete.id);
      handleApplicationDeleted(pendingDelete.id);
      setPendingDelete(null);
    } catch (e) {
      setListDeleteError(
        e.message || intl.formatMessage({ id: 'AdminCoachApplicationsPage.deleteError' })
      );
    } finally {
      setListDeleting(false);
    }
  };

  const handleLogout = () => {
    setStoredAdminToken(null);
    setAuthenticated(false);
    setApplications([]);
    history.push('/admin/coach-applications');
  };

  return (
    <Page
      title={title}
      scrollingDisabled={scrollingDisabled}
      className={classNames(sportTheme.sportPremium, css.page)}
    >
      <TopbarContainer currentPage="AdminCoachApplicationsPage" chromeTheme="sportPremium" />

      <main className={css.main}>
        <div className={css.rail}>
          <header className={css.header}>
            <p className={css.eyebrow}>
              <FormattedMessage id="AdminCoachApplicationsPage.eyebrow" />
            </p>
            <h1 className={css.title}>
              <FormattedMessage id="AdminCoachApplicationsPage.title" />
            </h1>
            <p className={css.subtitle}>
              <FormattedMessage id="AdminCoachApplicationsPage.subtitle" />
            </p>
          </header>

          {!authenticated ? (
            <AdminGate onAuthenticated={() => setAuthenticated(true)} />
          ) : applicationId ? (
            <ApplicationDetail
              applicationId={applicationId}
              onBack={backToList}
              onStatusUpdated={handleStatusUpdated}
              onDeleted={handleApplicationDeleted}
            />
          ) : (
            <section className={css.glassCard}>
              <div className={css.opsHeader}>
                <span className={css.opsBadge}>
                  <FormattedMessage
                    id="AdminCoachApplicationsPage.count"
                    values={{ count: filteredApplications.length }}
                  />
                </span>
                <div className={css.toolbarActions}>
                  <button
                    type="button"
                    className={css.exportButton}
                    onClick={handleExportExcel}
                    disabled={loading || filteredApplications.length === 0}
                  >
                    <FormattedMessage id="AdminCoachApplicationsPage.exportExcel" />
                  </button>
                  <button type="button" className={css.secondaryButton} onClick={loadList}>
                    <FormattedMessage id="AdminCoachApplicationsPage.refresh" />
                  </button>
                  <button type="button" className={css.secondaryButton} onClick={handleLogout}>
                    <FormattedMessage id="AdminCoachApplicationsPage.logout" />
                  </button>
                </div>
              </div>

              <ApplicationFilters
                filters={filters}
                onChange={partial => setFilters(prev => ({ ...prev, ...partial }))}
                sports={sports}
                countries={countries}
              />

              {pendingDelete ? (
                <DeleteApplicationConfirm
                  applicantName={pendingDelete.fullName}
                  deleting={listDeleting}
                  error={listDeleteError}
                  onCancel={() => {
                    setPendingDelete(null);
                    setListDeleteError(null);
                  }}
                  onConfirm={handleConfirmListDelete}
                />
              ) : null}

              {loading ? (
                <p className={css.loadingState}>
                  <FormattedMessage id="AdminCoachApplicationsPage.loading" />
                </p>
              ) : error ? (
                <p className={css.errorState}>{error}</p>
              ) : (
                <ApplicationsList
                  applications={filteredApplications}
                  onOpen={openDetail}
                  onRequestDelete={app => {
                    setListDeleteError(null);
                    setPendingDelete(app);
                  }}
                />
              )}
            </section>
          )}
        </div>
      </main>

      <FooterContainer />
    </Page>
  );
};

export default AdminCoachApplicationsPage;
