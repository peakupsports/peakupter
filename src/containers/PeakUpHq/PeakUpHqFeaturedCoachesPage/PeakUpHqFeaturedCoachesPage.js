import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { isScrollingDisabled } from '../../../ducks/ui.duck';
import {
  APPLICATION_STATUSES,
  getStoredAdminToken,
  patchCoachApplicationStatus,
  setStoredAdminToken,
} from '../../../util/coachApplicationAdmin';
import {
  PARTNER_PRIORITY_LEVELS,
  PARTNER_PRIORITY_LEVEL_LABEL_IDS,
  TIER_FILTER_IDS,
  approveLegacyCoachAdmin,
  assignPartnerPriorityAdmin,
  clearPartnerPriorityAdmin,
  fetchCoachManagementAdminList,
} from '../../../util/coachManagementAdmin';
import {
  canAccessHqAdminApiViaSession,
  hasPeakUpHqAdminDashboardAccess,
} from '../../../util/peakupAdmin';

import {
  countryCodeToFlagEmoji,
  deriveCountryCodeFromPlace,
  getCoachShortLocationLabel,
} from '../../../util/coachExplore';
import { getTierBadgeLabel, getTierStyleVars } from '../../../util/coachTier';
import {
  PROFILE_SPORT_DISPLAY_LABELS,
  sportsForFigurinaOverlay,
} from '../../../util/profileCoachSticker';

import { Page, NamedLink, PeakUpLocationPin } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import FooterContainer from '../../FooterContainer/FooterContainer';
import PeakUpHqAdminGate from '../PeakUpHqAdminGate';

import sportTheme from '../../SportPagesTheme.module.css';
import adminCss from '../../AdminCoachApplicationsPage/AdminCoachApplicationsPage.module.css';
import css from './PeakUpHqFeaturedCoachesPage.module.css';

const DEFAULT_PARTNER_DRAFT = {
  level: 'partner',
  reason: '',
  until: '',
};

const FUTURE_STATUS_LABEL_IDS = {
  application_pending: 'PeakUpHqCoachManagement.futureStatus.applicationPending',
  application_need_more_info: 'PeakUpHqCoachManagement.futureStatus.applicationNeedMoreInfo',
  onboarding: 'PeakUpHqCoachManagement.futureStatus.onboarding',
  draft_profile: 'PeakUpHqCoachManagement.futureStatus.draftProfile',
  legacy_unverified: 'PeakUpHqCoachManagement.futureStatus.legacyUnverified',
  invited: 'PeakUpHqCoachManagement.futureStatus.invited',
};

const sortByDisplayName = (a, b) =>
  String(a?.displayName || '').localeCompare(String(b?.displayName || ''), undefined, {
    sensitivity: 'base',
  });

const formatCompactSportsLine = (intl, sports) => {
  const keys = sportsForFigurinaOverlay(sports);
  if (!keys.length) {
    return null;
  }
  return keys
    .map(sportRaw => {
      const key = String(sportRaw || '')
        .toLowerCase()
        .replace(/\s+/g, '');
      const fallback = PROFILE_SPORT_DISPLAY_LABELS[key] || String(sportRaw || '').trim();
      return intl.formatMessage(
        { id: `ProfilePage.sportSticker.${key}`, defaultMessage: fallback },
        {}
      );
    })
    .join(' · ');
};

const getCoachInitials = displayName => {
  const parts = String(displayName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Directory coach cell — photo, name, tier, location, compact base sports only.
 */
const CoachDirectoryCell = ({ coach }) => {
  const intl = useIntl();
  const publicData = coach?.publicData || {};
  const displayName = coach?.displayName || '—';
  const tierId = coach?.tierId || null;
  const tierStyle = tierId ? getTierStyleVars(tierId) : null;
  const tierBadgeLabel = getTierBadgeLabel(tierId);
  const sportsLine = formatCompactSportsLine(intl, coach.sports);

  const locationLabel = getCoachShortLocationLabel(
    { author: { attributes: { profile: { publicData } } } },
    { intl }
  );
  const locationCountryCode =
    deriveCountryCodeFromPlace(publicData.location, intl.locale) ||
    String(publicData.country || '')
      .trim()
      .slice(0, 2)
      .toUpperCase();
  const locationFlag =
    locationCountryCode && locationCountryCode.length === 2
      ? countryCodeToFlagEmoji(locationCountryCode)
      : '';

  return (
    <div className={css.coachIdentityCompact}>
      <div className={css.coachPhotoFrame} style={tierStyle}>
        {coach?.profileImageUrl ? (
          <img
            className={css.coachPhoto}
            src={coach.profileImageUrl}
            alt=""
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className={css.coachPhotoFallback} aria-hidden>
            {getCoachInitials(displayName)}
          </div>
        )}
      </div>
      <div className={css.coachIdentityMeta}>
        <div className={css.coachNameRow}>
          <p className={css.coachName}>{displayName}</p>
          {tierBadgeLabel ? (
            <span className={css.coachTierBadge} style={tierStyle}>
              {tierBadgeLabel}
            </span>
          ) : (
            <span className={css.coachTierMuted}>
              <FormattedMessage id="PeakUpHqCoachManagement.tierNone" />
            </span>
          )}
        </div>
        {locationLabel ? (
          <p className={css.coachLocation}>
            <PeakUpLocationPin size="sm" className={css.coachLocationPin} />
            <span className={css.coachLocationText}>{locationLabel}</span>
            {locationFlag ? (
              <span className={css.coachLocationFlag} aria-hidden>
                {locationFlag}
              </span>
            ) : null}
          </p>
        ) : null}
        {sportsLine ? (
          <p className={css.coachSports} title={sportsLine}>
            {sportsLine}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const CoachDirectoryMiniCell = ({ coach }) => {
  const displayName = coach?.displayName || '—';
  const tierId = coach?.tierId || null;
  const tierStyle = tierId ? getTierStyleVars(tierId) : null;

  return (
    <div className={css.coachIdentityCompact}>
      <div className={css.coachPhotoFrame} style={tierStyle}>
        {coach?.profileImageUrl ? (
          <img className={css.coachPhoto} src={coach.profileImageUrl} alt="" loading="lazy" />
        ) : (
          <div className={css.coachPhotoFallback} aria-hidden>
            {getCoachInitials(displayName)}
          </div>
        )}
      </div>
      <p className={css.coachName}>{displayName}</p>
    </div>
  );
};

const VerificationStatusCell = ({ coach }) => {
  if (coach.verified) {
    return (
      <span className={css.verificationBadgeVerified}>
        <FormattedMessage id="PeakUpHqCoachManagement.verificationVerified" />
      </span>
    );
  }
  return (
    <span className={css.verificationBadgeUnverified}>
      <FormattedMessage id="PeakUpHqCoachManagement.verificationUnverified" />
    </span>
  );
};

const usePartnerDraft = coach => {
  const [draft, setDraft] = useState({
    level: coach.partnerPriorityLevel || DEFAULT_PARTNER_DRAFT.level,
    reason: coach.partnerPriorityReason || '',
    until: coach.partnerPriorityUntil
      ? moment(coach.partnerPriorityUntil).format('YYYY-MM-DD')
      : '',
  });

  useEffect(() => {
    setDraft({
      level: coach.partnerPriorityLevel || DEFAULT_PARTNER_DRAFT.level,
      reason: coach.partnerPriorityReason || '',
      until: coach.partnerPriorityUntil
        ? moment(coach.partnerPriorityUntil).format('YYYY-MM-DD')
        : '',
    });
  }, [
    coach.partnerPriorityLevel,
    coach.partnerPriorityReason,
    coach.partnerPriorityUntil,
    coach.userId,
  ]);

  return [draft, setDraft];
};

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
      await fetchCoachManagementAdminList();
      onAuthenticated();
    } catch (e) {
      setStoredAdminToken(null);
      if (e.status === 401) {
        setError(intl.formatMessage({ id: 'PeakUpHqCoachManagement.gateInvalid' }));
      } else if (e.status === 503) {
        setError(intl.formatMessage({ id: 'PeakUpHqCoachManagement.gateNotConfigured' }));
      } else {
        setError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.loadError' }));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <form className={classNames(adminCss.gateForm, css.hqPanel)} onSubmit={handleSubmit}>
      <p className={adminCss.gateHint}>
        <FormattedMessage id="PeakUpHqCoachManagement.gateHint" />
      </p>
      <label className={adminCss.gateLabel} htmlFor="coach-management-admin-token">
        <FormattedMessage id="PeakUpHqCoachManagement.gateLabel" />
      </label>
      <input
        id="coach-management-admin-token"
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

const CoachDirectoryRow = ({ coach }) => {
  const intl = useIntl();
  const labelCoach = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colCoach' });
  const labelEmail = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colEmail' });
  const labelVerification = intl.formatMessage({
    id: 'PeakUpHqCoachManagement.colVerification',
  });

  return (
    <tr className={css.directoryRow}>
      <td className={css.colCoach} data-label={labelCoach}>
        <CoachDirectoryCell coach={coach} />
      </td>
      <td className={css.colEmail} data-label={labelEmail}>
        <span className={css.cellValue} title={coach.email || undefined}>
          {coach.email || '—'}
        </span>
      </td>
      <td className={css.colVerification} data-label={labelVerification}>
        <VerificationStatusCell coach={coach} />
      </td>
    </tr>
  );
};

const PartnerAssignPanel = ({ coaches, onSaved, onError, busyCoachId, setBusyCoachId }) => {
  const intl = useIntl();
  const [coachId, setCoachId] = useState('');
  const [draft, setDraft] = useState(DEFAULT_PARTNER_DRAFT);
  const isBusy = busyCoachId === 'assign';

  const handleAssign = async () => {
    if (!coachId) {
      return;
    }
    setBusyCoachId('assign');
    onError(null);
    try {
      await assignPartnerPriorityAdmin({
        coachId,
        level: draft.level,
        reason: draft.reason,
        until: draft.until || null,
      });
      setCoachId('');
      setDraft(DEFAULT_PARTNER_DRAFT);
      onSaved();
    } catch (e) {
      onError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerAssignError' }));
    } finally {
      setBusyCoachId(null);
    }
  };

  return (
    <div className={css.partnerAssignPanel}>
      <p className={css.partnerAssignHint}>
        <FormattedMessage id="PeakUpHqCoachManagement.partnerAssignHint" />
      </p>
      <div className={css.partnerAssignGrid}>
        <label className={css.partnerFieldCompact}>
          <span className={css.partnerFieldLabel}>
            <FormattedMessage id="PeakUpHqCoachManagement.partnerAssignCoach" />
          </span>
          <select
            className={css.partnerSelect}
            value={coachId}
            disabled={isBusy || coaches.length === 0}
            onChange={event => setCoachId(event.target.value)}
          >
            <option value="">
              {intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerAssignCoachPlaceholder' })}
            </option>
            {coaches.map(coach => (
              <option key={coach.userId} value={coach.userId}>
                {coach.displayName || coach.email || coach.userId}
              </option>
            ))}
          </select>
        </label>
        <label className={css.partnerFieldCompact}>
          <span className={css.partnerFieldLabel}>
            <FormattedMessage id="PeakUpHqCoachManagement.partnerLevel" />
          </span>
          <select
            className={css.partnerSelect}
            value={draft.level}
            disabled={isBusy}
            onChange={event => setDraft(prev => ({ ...prev, level: event.target.value }))}
          >
            {PARTNER_PRIORITY_LEVELS.map(level => (
              <option key={level} value={level}>
                {intl.formatMessage({ id: PARTNER_PRIORITY_LEVEL_LABEL_IDS[level] })}
              </option>
            ))}
          </select>
        </label>
        <label className={css.partnerFieldCompact}>
          <span className={css.partnerFieldLabel}>
            <FormattedMessage id="PeakUpHqCoachManagement.partnerReason" />
          </span>
          <input
            className={css.partnerInput}
            type="text"
            value={draft.reason}
            disabled={isBusy}
            placeholder={intl.formatMessage({
              id: 'PeakUpHqCoachManagement.partnerReasonPlaceholder',
            })}
            onChange={event => setDraft(prev => ({ ...prev, reason: event.target.value }))}
          />
        </label>
        <label className={css.partnerFieldCompact}>
          <span className={css.partnerFieldLabel}>
            <FormattedMessage id="PeakUpHqCoachManagement.partnerUntil" />
          </span>
          <input
            className={css.partnerInput}
            type="date"
            value={draft.until}
            disabled={isBusy}
            onChange={event => setDraft(prev => ({ ...prev, until: event.target.value }))}
          />
        </label>
        <button
          type="button"
          className={css.featureButton}
          disabled={isBusy || !coachId}
          onClick={handleAssign}
        >
          <FormattedMessage id="PeakUpHqCoachManagement.assignPartner" />
        </button>
      </div>
    </div>
  );
};

const FutureStatusBadge = ({ status }) => {
  const intl = useIntl();
  const labelId =
    FUTURE_STATUS_LABEL_IDS[status] || 'PeakUpHqCoachManagement.futureStatus.draftProfile';
  return (
    <span
      className={classNames(css.futureStatusBadge, {
        [css.futureStatusApplication]: status?.startsWith('application_'),
        [css.futureStatusInvited]: status === 'invited',
        [css.futureStatusLegacy]: status === 'legacy_unverified',
      })}
    >
      {intl.formatMessage({ id: labelId })}
    </span>
  );
};

const FutureCoachRow = ({ row, onSaved, onError, busyRowId, setBusyRowId }) => {
  const intl = useIntl();
  const isBusy = busyRowId === row.rowId;
  const sportsLine = formatCompactSportsLine(intl, row.sports);
  const submittedLabel = row.submittedAt
    ? moment(row.submittedAt).format('D MMM YYYY')
    : '—';

  const labelCoach = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colCoach' });
  const labelEmail = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colEmail' });
  const labelSport = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colSport' });
  const labelLocation = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colLocation' });
  const labelStatus = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colStatus' });
  const labelSubmitted = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colSubmitted' });
  const labelActions = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colActions' });

  const handleApprove = async () => {
    setBusyRowId(row.rowId);
    onError(null);
    try {
      if (row.sourceType === 'application' && row.applicationId) {
        await patchCoachApplicationStatus(row.applicationId, APPLICATION_STATUSES.APPROVED);
      } else if (row.userId) {
        const summary = await approveLegacyCoachAdmin({ userId: row.userId });
        const result = summary?.results?.[0];
        if (result?.status === 'error' || result?.status === 'skipped') {
          throw new Error(
            result?.reason ||
              intl.formatMessage({ id: 'PeakUpHqCoachManagement.futureApproveError' })
          );
        }
      }
      onSaved();
    } catch (e) {
      onError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.futureApproveError' }));
    } finally {
      setBusyRowId(null);
    }
  };

  const handleRequestMoreInfo = async () => {
    if (!row.applicationId) {
      return;
    }
    setBusyRowId(row.rowId);
    onError(null);
    try {
      await patchCoachApplicationStatus(
        row.applicationId,
        APPLICATION_STATUSES.NEED_MORE_INFO
      );
      onSaved();
    } catch (e) {
      onError(
        e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.futureNeedInfoError' })
      );
    } finally {
      setBusyRowId(null);
    }
  };

  const canViewApplication = Boolean(row.applicationId);
  const canRequestMoreInfo =
    row.sourceType === 'application' &&
    row.status === 'application_pending' &&
    Boolean(row.applicationId);
  const canApprove =
    (row.sourceType === 'application' && row.applicationId) ||
    (row.sourceType === 'profile' && row.userId);

  return (
    <tr className={css.futureRow}>
      <td className={css.colFutureCoach} data-label={labelCoach}>
        <CoachDirectoryMiniCell coach={row} />
      </td>
      <td className={css.colFutureEmail} data-label={labelEmail}>
        <span className={css.cellValue} title={row.email || undefined}>
          {row.email || '—'}
        </span>
      </td>
      <td className={css.colFutureSport} data-label={labelSport}>
        <span className={css.cellValue} title={sportsLine || undefined}>
          {sportsLine || '—'}
        </span>
      </td>
      <td className={css.colFutureLocation} data-label={labelLocation}>
        <span className={css.cellValue} title={row.location || undefined}>
          {row.location || '—'}
        </span>
      </td>
      <td className={css.colFutureStatus} data-label={labelStatus}>
        <FutureStatusBadge status={row.status} />
      </td>
      <td className={css.colFutureSubmitted} data-label={labelSubmitted}>
        <span className={css.cellValue}>{submittedLabel}</span>
      </td>
      <td className={css.colFutureActions} data-label={labelActions}>
        <div className={css.futureRowActions}>
          {canViewApplication ? (
            <NamedLink
              className={css.futureActionLink}
              name="AdminCoachApplicationDetailPage"
              params={{ applicationId: row.applicationId }}
            >
              <FormattedMessage id="PeakUpHqCoachManagement.actionViewApplication" />
            </NamedLink>
          ) : (
            <NamedLink className={css.futureActionLink} name="AdminCoachApplicationsPage">
              <FormattedMessage id="PeakUpHqCoachManagement.actionViewApplicationsList" />
            </NamedLink>
          )}
          {canApprove ? (
            <button
              type="button"
              className={css.featureButton}
              disabled={isBusy}
              onClick={handleApprove}
            >
              <FormattedMessage id="PeakUpHqCoachManagement.actionApprove" />
            </button>
          ) : null}
          {canRequestMoreInfo ? (
            <button
              type="button"
              className={css.removeButton}
              disabled={isBusy}
              onClick={handleRequestMoreInfo}
            >
              <FormattedMessage id="PeakUpHqCoachManagement.actionRequestMoreInfo" />
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
};

const PartnerPriorityRow = ({ coach, onSaved, onError, busyCoachId, setBusyCoachId }) => {
  const intl = useIntl();
  const [draft, setDraft] = usePartnerDraft(coach);
  const isBusy = busyCoachId === coach.userId;

  const handleSave = async () => {
    setBusyCoachId(coach.userId);
    onError(null);
    try {
      await assignPartnerPriorityAdmin({
        coachId: coach.userId,
        level: draft.level,
        reason: draft.reason,
        until: draft.until || null,
      });
      onSaved();
    } catch (e) {
      onError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerAssignError' }));
    } finally {
      setBusyCoachId(null);
    }
  };

  const handleRemove = async () => {
    setBusyCoachId(coach.userId);
    onError(null);
    try {
      await clearPartnerPriorityAdmin({ coachId: coach.userId });
      onSaved();
    } catch (e) {
      onError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerClearError' }));
    } finally {
      setBusyCoachId(null);
    }
  };

  const labelCoach = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colCoach' });
  const labelLevel = intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerLevel' });
  const labelReason = intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerReason' });
  const labelUntil = intl.formatMessage({ id: 'PeakUpHqCoachManagement.partnerUntil' });
  const labelActions = intl.formatMessage({ id: 'PeakUpHqCoachManagement.colActions' });
  const untilDisplay = coach.partnerPriorityUntil
    ? moment(coach.partnerPriorityUntil).format('D MMM YYYY')
    : '—';

  return (
    <tr className={css.partnerRow}>
      <td className={css.colPartnerCoach} data-label={labelCoach}>
        <CoachDirectoryMiniCell coach={coach} />
      </td>
      <td className={css.colPartnerLevel} data-label={labelLevel}>
        <select
          className={css.partnerSelect}
          value={draft.level}
          disabled={isBusy}
          onChange={event => setDraft(prev => ({ ...prev, level: event.target.value }))}
        >
          {PARTNER_PRIORITY_LEVELS.map(level => (
            <option key={level} value={level}>
              {intl.formatMessage({ id: PARTNER_PRIORITY_LEVEL_LABEL_IDS[level] })}
            </option>
          ))}
        </select>
      </td>
      <td className={css.colPartnerReason} data-label={labelReason}>
        <input
          className={css.partnerInput}
          type="text"
          value={draft.reason}
          disabled={isBusy}
          placeholder={intl.formatMessage({
            id: 'PeakUpHqCoachManagement.partnerReasonPlaceholder',
          })}
          onChange={event => setDraft(prev => ({ ...prev, reason: event.target.value }))}
        />
      </td>
      <td className={css.colPartnerUntil} data-label={labelUntil}>
        <input
          className={css.partnerInput}
          type="date"
          value={draft.until}
          disabled={isBusy}
          title={untilDisplay}
          onChange={event => setDraft(prev => ({ ...prev, until: event.target.value }))}
        />
      </td>
      <td className={css.colPartnerActions} data-label={labelActions}>
        <div className={css.partnerRowActions}>
          <button type="button" className={css.featureButton} disabled={isBusy} onClick={handleSave}>
            <FormattedMessage id="PeakUpHqCoachManagement.savePartner" />
          </button>
          <button type="button" className={css.removeButton} disabled={isBusy} onClick={handleRemove}>
            <FormattedMessage id="PeakUpHqCoachManagement.removePartner" />
          </button>
        </div>
      </td>
    </tr>
  );
};

/**
 * PeakUp HQ — Coach Management directory and partner priority administration.
 */
const PeakUpHqCoachManagementPage = () => {
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

  const [coaches, setCoaches] = useState([]);
  const [futureCoaches, setFutureCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [search, setSearch] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [filterOptions, setFilterOptions] = useState({ sports: [], countries: [] });
  const [busyCoachId, setBusyCoachId] = useState(null);
  const [busyFutureRowId, setBusyFutureRowId] = useState(null);

  const title = intl.formatMessage(
    { id: 'PeakUpHqCoachManagement.schemaTitle' },
    { marketplaceName }
  );

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCoachManagementAdminList({
        q: search.trim(),
        sport: sportFilter || undefined,
        country: countryFilter || undefined,
        tier: tierFilter || undefined,
      });
      setCoaches(result?.coaches || []);
      setFutureCoaches(result?.futureCoaches || []);
      setFilterOptions(result?.filterOptions || { sports: [], countries: [] });
    } catch (e) {
      if (e.status === 401 && !isHqAdmin) {
        setStoredAdminToken(null);
        setTokenAuthenticated(false);
      }
      setError(e.message || intl.formatMessage({ id: 'PeakUpHqCoachManagement.loadError' }));
    } finally {
      setLoading(false);
    }
  }, [countryFilter, intl, isHqAdmin, search, sportFilter, tierFilter]);

  useEffect(() => {
    if (!hasDashboardAccess) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      loadList();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hasDashboardAccess, loadList]);

  const partnerCount = useMemo(
    () => coaches.filter(c => c.partnerPriority).length,
    [coaches]
  );

  const directoryCoaches = useMemo(
    () => [...coaches].sort(sortByDisplayName),
    [coaches]
  );

  const partnerCoaches = useMemo(
    () => coaches.filter(c => c.partnerPriority).sort(sortByDisplayName),
    [coaches]
  );

  const assignableCoaches = useMemo(
    () => coaches.filter(c => !c.partnerPriority).sort(sortByDisplayName),
    [coaches]
  );

  const futureCoachCount = futureCoaches.length;

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
        <TopbarContainer currentPage="PeakUpHqCoachManagementPage" chromeTheme="sportPremium" />

        <main className={adminCss.main}>
          <div className={classNames(adminCss.rail, css.wideRail)}>
            <header className={adminCss.header}>
              <NamedLink name="PeakUpHQPage" className={adminCss.hqBackLink}>
                <FormattedMessage id="PeakUpHq.backToOverview" />
              </NamedLink>
              <p className={adminCss.eyebrow}>
                <FormattedMessage id="PeakUpHqCoachManagement.eyebrow" />
              </p>
              <h1 className={adminCss.title}>
                <FormattedMessage id="PeakUpHqCoachManagement.title" />
              </h1>
              <p className={adminCss.subtitle}>
                <FormattedMessage id="PeakUpHqCoachManagement.subtitle" />
              </p>
            </header>

            {!hasDashboardAccess ? (
              <AdminGate onAuthenticated={() => setTokenAuthenticated(true)} />
            ) : (
              <section className={classNames(adminCss.glassCard, css.hqPanel)}>
                <p className={css.rankingNotice}>
                  <FormattedMessage id="PeakUpHqCoachManagement.rankingNotice" />
                </p>
                <div className={css.opsLinkGrid}>
                  <NamedLink name="AdminCoachApplicationsPage" className={css.opsLinkCard}>
                    <FormattedMessage id="PeakUpHq.section.coachApplications.title" />
                  </NamedLink>
                  <NamedLink name="PeakUpHqAmbassadorsPage" className={css.opsLinkCard}>
                    <FormattedMessage id="PeakUpHqCoachManagement.linkAmbassadors" />
                  </NamedLink>
                  <NamedLink name="PeakUpHqVerificationPage" className={css.opsLinkCardMuted}>
                    <FormattedMessage id="PeakUpHq.section.verification.title" />
                  </NamedLink>
                  <NamedLink name="PeakUpHqTeamManagementPage" className={css.opsLinkCard}>
                    <FormattedMessage id="PeakUpHqCoachManagement.linkTeamAffiliations" />
                  </NamedLink>
                </div>

                <div className={adminCss.opsHeader}>
                  <span className={adminCss.opsBadge}>
                    <FormattedMessage
                      id="PeakUpHqCoachManagement.count"
                      values={{
                        count: coaches.length,
                        future: futureCoachCount,
                        partners: partnerCount,
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
                    <label className={css.searchLabel} htmlFor="coach-management-search">
                      <FormattedMessage id="PeakUpHqCoachManagement.searchLabel" />
                    </label>
                    <input
                      id="coach-management-search"
                      className={css.searchInput}
                      type="search"
                      value={search}
                      onChange={event => setSearch(event.target.value)}
                      placeholder={intl.formatMessage({
                        id: 'PeakUpHqCoachManagement.searchPlaceholder',
                      })}
                    />
                  </div>
                  <div className={css.filterField}>
                    <label className={css.searchLabel} htmlFor="coach-management-sport">
                      <FormattedMessage id="PeakUpHqCoachManagement.filterSport" />
                    </label>
                    <select
                      id="coach-management-sport"
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
                    <label className={css.searchLabel} htmlFor="coach-management-country">
                      <FormattedMessage id="PeakUpHqCoachManagement.filterCountry" />
                    </label>
                    <select
                      id="coach-management-country"
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
                    <label className={css.searchLabel} htmlFor="coach-management-tier">
                      <FormattedMessage id="PeakUpHqCoachManagement.filterTier" />
                    </label>
                    <select
                      id="coach-management-tier"
                      className={css.filterSelect}
                      value={tierFilter}
                      onChange={event => setTierFilter(event.target.value)}
                    >
                      <option value="">
                        {intl.formatMessage({ id: 'PeakUpHqCoachManagement.filterAll' })}
                      </option>
                      {TIER_FILTER_IDS.map(tier => (
                        <option key={tier} value={tier}>
                          {getTierBadgeLabel(tier)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {actionError ? <p className={adminCss.errorState}>{actionError}</p> : null}

                {loading ? (
                  <p className={adminCss.loadingState}>
                    <FormattedMessage id="PeakUpHqCoachManagement.loading" />
                  </p>
                ) : error ? (
                  <p className={adminCss.errorState}>{error}</p>
                ) : (
                  <>
                    <section
                      className={css.managementSection}
                      aria-labelledby="verified-coaches-heading"
                    >
                      <header className={css.sectionHeader}>
                        <h2 id="verified-coaches-heading" className={css.sectionTitle}>
                          <FormattedMessage id="PeakUpHqCoachManagement.verifiedTitle" />
                        </h2>
                        <p className={css.sectionSubtitle}>
                          <FormattedMessage id="PeakUpHqCoachManagement.verifiedSubtitle" />
                        </p>
                      </header>

                      {directoryCoaches.length === 0 ? (
                        <p className={css.emptyState}>
                          <FormattedMessage id="PeakUpHqCoachManagement.empty" />
                        </p>
                      ) : (
                        <div className={css.tableWrap}>
                          <table className={classNames(css.table, css.directoryTable)}>
                            <thead>
                              <tr>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colCoach" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colEmail" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colVerification" />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {directoryCoaches.map(coach => (
                                <CoachDirectoryRow key={coach.userId} coach={coach} />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section
                      className={classNames(css.managementSection, css.futureSection)}
                      aria-labelledby="future-coaches-heading"
                    >
                      <header className={css.sectionHeader}>
                        <h2 id="future-coaches-heading" className={css.sectionTitle}>
                          <FormattedMessage id="PeakUpHqCoachManagement.futureTitle" />
                        </h2>
                        <p className={css.sectionSubtitle}>
                          <FormattedMessage
                            id="PeakUpHqCoachManagement.futureSubtitle"
                            values={{ count: futureCoachCount }}
                          />
                        </p>
                      </header>

                      {futureCoaches.length === 0 ? (
                        <p className={css.emptyState}>
                          <FormattedMessage id="PeakUpHqCoachManagement.futureEmpty" />
                        </p>
                      ) : (
                        <div className={css.tableWrap}>
                          <table className={classNames(css.table, css.futureTable)}>
                            <thead>
                              <tr>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colCoach" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colEmail" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colSport" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colLocation" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colStatus" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colSubmitted" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colActions" />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {futureCoaches.map(row => (
                                <FutureCoachRow
                                  key={row.rowId}
                                  row={row}
                                  busyRowId={busyFutureRowId}
                                  setBusyRowId={setBusyFutureRowId}
                                  onSaved={loadList}
                                  onError={setActionError}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>

                    <section
                      className={classNames(css.managementSection, css.partnerSection)}
                      aria-labelledby="partner-priority-heading"
                    >
                      <header className={css.sectionHeader}>
                        <h2 id="partner-priority-heading" className={css.sectionTitle}>
                          <FormattedMessage id="PeakUpHqCoachManagement.partnerPriorityTitle" />
                        </h2>
                        <p className={css.sectionSubtitle}>
                          <FormattedMessage
                            id="PeakUpHqCoachManagement.partnerSectionSubtitle"
                            values={{ count: partnerCount }}
                          />
                        </p>
                      </header>

                      <PartnerAssignPanel
                        coaches={assignableCoaches}
                        busyCoachId={busyCoachId}
                        setBusyCoachId={setBusyCoachId}
                        onSaved={loadList}
                        onError={setActionError}
                      />

                      {partnerCoaches.length === 0 ? (
                        <p className={css.emptyState}>
                          <FormattedMessage id="PeakUpHqCoachManagement.partnerEmpty" />
                        </p>
                      ) : (
                        <div className={css.tableWrap}>
                          <table className={classNames(css.table, css.partnerTable)}>
                            <thead>
                              <tr>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colCoach" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.partnerLevel" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.partnerReason" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.partnerUntil" />
                                </th>
                                <th>
                                  <FormattedMessage id="PeakUpHqCoachManagement.colActions" />
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {partnerCoaches.map(coach => (
                                <PartnerPriorityRow
                                  key={coach.userId}
                                  coach={coach}
                                  busyCoachId={busyCoachId}
                                  setBusyCoachId={setBusyCoachId}
                                  onSaved={loadList}
                                  onError={setActionError}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
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

export default PeakUpHqCoachManagementPage;
