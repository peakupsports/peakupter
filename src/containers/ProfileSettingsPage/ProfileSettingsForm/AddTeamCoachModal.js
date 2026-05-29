import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { fetchTeamRosterManage, inviteTeamCoach, searchTeamCoaches } from '../../../util/api';
import {
  normalizeTeamCoachEntity,
  extractCoachUserUuid,
  isVerifiedCoachForTeamRoster,
} from '../../../util/peakupTeam';

import { Button, Modal, TeamCoachRosterCard } from '../../../components';

import css from './AddTeamCoachModal.module.css';

const TAB_EMAIL = 'email';
const TAB_PROFILE = 'profile';

const INVITE_CTA = {
  ADD: 'add',
  LOADING: 'loading',
  SUCCESS: 'success',
  CONNECTED: 'connected',
  PENDING: 'pending',
  DECLINED: 'declined',
  NOT_VERIFIED: 'not_verified',
};

const buildRosterIndex = (coaches, declinedInviteIds = []) => {
  const index = {};
  (Array.isArray(declinedInviteIds) ? declinedInviteIds : []).forEach(coachId => {
    if (coachId) {
      index[coachId] = 'declined';
    }
  });
  (Array.isArray(coaches) ? coaches : []).forEach(coach => {
    const coachId = extractCoachUserUuid(coach);
    if (!coachId) {
      return;
    }
    const status = String(coach?.rosterStatus || 'active').toLowerCase();
    if (status === 'pending') {
      index[coachId] = 'pending';
    } else if (status === 'declined') {
      index[coachId] = 'declined';
    } else if (status === 'active') {
      index[coachId] = 'active';
    }
  });
  return index;
};

const resolveCoachAffiliationStatus = (coach, teamId) => {
  if (!teamId) {
    return null;
  }
  const pd = coach?.publicData || coach?.attributes?.profile?.publicData || {};
  const affiliatedTeamId = String(pd.peakupAffiliatedTeamId || '').trim();
  if (affiliatedTeamId !== teamId) {
    return null;
  }
  const status = String(pd.peakupAffiliationStatus || '').toLowerCase();
  if (status === 'pending') {
    return 'pending';
  }
  if (status === 'active') {
    return 'active';
  }
  if (status === 'removed') {
    return 'declined';
  }
  return null;
};

const resolveInviteCtaState = ({
  coachId,
  rosterIndex,
  inviteOutcomes,
  invitingId,
  isEligible,
}) => {
  if (invitingId === coachId) {
    return INVITE_CTA.LOADING;
  }
  if (inviteOutcomes[coachId] === INVITE_CTA.SUCCESS) {
    return INVITE_CTA.SUCCESS;
  }
  if (rosterIndex[coachId] === 'active') {
    return INVITE_CTA.CONNECTED;
  }
  if (rosterIndex[coachId] === 'pending') {
    return INVITE_CTA.PENDING;
  }
  if (rosterIndex[coachId] === 'declined') {
    return INVITE_CTA.DECLINED;
  }
  if (!isEligible) {
    return INVITE_CTA.NOT_VERIFIED;
  }
  return INVITE_CTA.ADD;
};

const inviteCtaMessageId = state => {
  switch (state) {
    case INVITE_CTA.LOADING:
      return 'AddTeamCoachModal.sendingInvitation';
    case INVITE_CTA.SUCCESS:
      return 'AddTeamCoachModal.invitationSent';
    case INVITE_CTA.CONNECTED:
      return 'AddTeamCoachModal.alreadyInTeam';
    case INVITE_CTA.PENDING:
      return 'AddTeamCoachModal.invitationPending';
    case INVITE_CTA.DECLINED:
      return 'AddTeamCoachModal.inviteAgain';
    case INVITE_CTA.NOT_VERIFIED:
      return 'AddTeamCoachModal.notVerifiedHint';
    default:
      return 'AddTeamCoachModal.inviteCoach';
  }
};

/**
 * Primary invite CTA for a search result row.
 */
const CoachResultInviteCta = props => {
  const { state, onInvite, inviteDisabled, compact = false } = props;
  const isActionable = state === INVITE_CTA.ADD || state === INVITE_CTA.DECLINED;

  return (
    <button
      type="button"
      className={classNames(
        css.inviteBtn,
        compact && css.inviteBtnCompact,
        state === INVITE_CTA.LOADING && css.inviteBtnLoading,
        state === INVITE_CTA.SUCCESS && css.inviteBtnSuccess,
        state === INVITE_CTA.PENDING && css.inviteBtnPending,
        state === INVITE_CTA.CONNECTED && css.inviteBtnConnected,
        state === INVITE_CTA.DECLINED && css.inviteBtnDeclined,
        state === INVITE_CTA.NOT_VERIFIED && css.inviteBtnNotVerified
      )}
      onClick={isActionable ? onInvite : undefined}
      disabled={!isActionable || inviteDisabled}
      aria-live="polite"
      aria-busy={state === INVITE_CTA.LOADING}
    >
      {state === INVITE_CTA.LOADING ? (
        <>
          <span className={css.inviteBtnSpinner} aria-hidden />
          <FormattedMessage id={inviteCtaMessageId(state)} />
        </>
      ) : (
        <FormattedMessage id={inviteCtaMessageId(state)} />
      )}
    </button>
  );
};

/**
 * Modal for inviting an independent PeakUp coach to a team roster.
 */
const AddTeamCoachModal = props => {
  const { isOpen, onClose, onInvited, className } = props;
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(TAB_EMAIL);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [rosterIndex, setRosterIndex] = useState({});
  const [inviteOutcomes, setInviteOutcomes] = useState({});
  const [teamId, setTeamId] = useState(null);
  const resultsBlockRef = useRef(null);

  const loadRosterIndex = useCallback(async () => {
    try {
      const res = await fetchTeamRosterManage();
      setTeamId(res?.teamId || null);
      setRosterIndex(buildRosterIndex(res?.coaches, res?.declinedInviteIds));
    } catch (e) {
      setTeamId(null);
      setRosterIndex({});
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setActiveTab(TAB_EMAIL);
      setInviteOutcomes({});
      setInvitingId(null);
      return;
    }
    loadRosterIndex();
  }, [isOpen, loadRosterIndex]);

  useEffect(() => {
    if (!isOpen || results.length === 0 || !resultsBlockRef.current) {
      return;
    }
    resultsBlockRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [isOpen, results.length]);

  const runSearch = useCallback(async () => {
    const q = String(query || '').trim();
    if (!q) {
      setError(
        intl.formatMessage({ id: 'AddTeamCoachModal.searchRequired' })
      );
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await searchTeamCoaches(q);
      const rawCoaches = Array.isArray(res?.coaches) ? res.coaches : [];
      const coaches = rawCoaches
        .map(coach => {
          const normalized = normalizeTeamCoachEntity(coach);
          if (!normalized && typeof console !== 'undefined') {
            // eslint-disable-next-line no-console
            console.warn('[AddTeamCoachModal] skipping malformed coach candidate', coach);
          }
          return normalized;
        })
        .filter(Boolean);

      if (rawCoaches.length > 0 && coaches.length === 0) {
        // eslint-disable-next-line no-console
        console.warn('[AddTeamCoachModal] all search results lacked valid user ids', rawCoaches);
        setError(intl.formatMessage({ id: 'AddTeamCoachModal.noResults' }));
        setResults([]);
        return;
      }

      if (coaches.length > 0 && typeof console !== 'undefined') {
        // eslint-disable-next-line no-console
        console.log('[AddTeamCoachModal] rendering coach candidates', coaches);
      }

      setResults(coaches);
      if (coaches.length === 0) {
        setError(intl.formatMessage({ id: 'AddTeamCoachModal.noResults' }));
        return;
      }

      setRosterIndex(prev => {
        const next = { ...prev };
        coaches.forEach(coach => {
          const coachId = extractCoachUserUuid(coach);
          if (!coachId || next[coachId]) {
            return;
          }
          const affiliationStatus = resolveCoachAffiliationStatus(coach, teamId);
          if (affiliationStatus) {
            next[coachId] = affiliationStatus;
          }
        });
        return next;
      });
    } catch (e) {
      setResults([]);
      setError(e?.message || intl.formatMessage({ id: 'AddTeamCoachModal.searchFailed' }));
    } finally {
      setSearching(false);
    }
  }, [intl, query, teamId]);

  const handleInvite = async coach => {
    const coachId = extractCoachUserUuid(coach);
    if (!coachId || invitingId) {
      return;
    }

    const isEligible =
      isVerifiedCoachForTeamRoster(coach) || coach?.rosterStatus === 'eligible';
    const ctaState = resolveInviteCtaState({
      coachId,
      rosterIndex,
      inviteOutcomes,
      invitingId,
      isEligible,
    });
    if (ctaState !== INVITE_CTA.ADD && ctaState !== INVITE_CTA.DECLINED) {
      return;
    }

    const coachEmail = coach?.email || coach?.attributes?.email || null;
    const previousStatus = rosterIndex[coachId] || 'none';

    setInvitingId(coachId);
    setError(null);
    try {
      await inviteTeamCoach({ coachId });
      // eslint-disable-next-line no-console
      console.log('[PeakUp TEAM COACH INVITE]', {
        teamId,
        coachUserId: coachId,
        coachEmail,
        previousStatus,
        nextStatus: 'pending',
      });
      setRosterIndex(prev => ({ ...prev, [coachId]: 'pending' }));
      setInviteOutcomes(prev => ({ ...prev, [coachId]: INVITE_CTA.SUCCESS }));
      window.setTimeout(() => {
        setInviteOutcomes(prev => {
          if (prev[coachId] !== INVITE_CTA.SUCCESS) {
            return prev;
          }
          const next = { ...prev };
          delete next[coachId];
          return next;
        });
      }, 2500);
      onInvited?.();
      loadRosterIndex();
    } catch (e) {
      const message = e?.message || intl.formatMessage({ id: 'AddTeamCoachModal.inviteFailed' });
      const lower = String(message).toLowerCase();
      if (lower.includes('already on your roster')) {
        setRosterIndex(prev => ({ ...prev, [coachId]: 'active' }));
      } else if (lower.includes('invitation is already pending') || lower.includes('already pending')) {
        setRosterIndex(prev => ({ ...prev, [coachId]: 'pending' }));
      } else {
        setError(message);
      }
    } finally {
      setInvitingId(null);
    }
  };
  const emailPlaceholder = intl.formatMessage({ id: 'AddTeamCoachModal.emailPlaceholder' });
  const profilePlaceholder = intl.formatMessage({
    id: 'AddTeamCoachModal.profilePlaceholder',
  });

  return (
    <Modal
      id="AddTeamCoachModal"
      className={css.modal}
      scrollLayerClassName={css.scrollLayer}
      containerClassName={classNames(css.container, className)}
      contentClassName={css.content}
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={() => {}}
      usePortal
      lightCloseButton
      closeOnOutsideClick
    >
      <div className={css.panel}>
        <header className={css.header}>
          <p className={css.eyebrow}>
            <FormattedMessage id="AddTeamCoachModal.eyebrow" />
          </p>
          <h2 className={css.title}>
            <FormattedMessage id="AddTeamCoachModal.title" />
          </h2>
          <p className={css.lead}>
            <FormattedMessage id="AddTeamCoachModal.lead" />
          </p>
        </header>

        <div className={css.scrollBody}>
          <div className={css.body}>
          <div className={css.tabsBlock}>
            <p className={css.tabsLabel}>
              <FormattedMessage id="AddTeamCoachModal.tabsLabel" />
            </p>
            <div className={css.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_EMAIL}
            className={classNames(css.tab, activeTab === TAB_EMAIL && css.tabActive)}
            onClick={() => {
              setActiveTab(TAB_EMAIL);
              setQuery('');
              setResults([]);
              setError(null);
            }}
          >
            <FormattedMessage id="AddTeamCoachModal.tabEmail" />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === TAB_PROFILE}
            className={classNames(css.tab, activeTab === TAB_PROFILE && css.tabActive)}
            onClick={() => {
              setActiveTab(TAB_PROFILE);
              setQuery('');
              setResults([]);
              setError(null);
            }}
          >
            <FormattedMessage id="AddTeamCoachModal.tabProfile" />
          </button>
            </div>
          </div>

          <div className={css.searchRow}>
          <label className={css.searchLabel} htmlFor="addTeamCoachQuery">
            {activeTab === TAB_EMAIL
              ? intl.formatMessage({ id: 'AddTeamCoachModal.emailLabel' })
              : intl.formatMessage({ id: 'AddTeamCoachModal.profileLabel' })}
          </label>
          <div className={css.searchControls}>
            <input
              id="addTeamCoachQuery"
              className={css.searchInput}
              type="text"
              value={query}
              placeholder={activeTab === TAB_EMAIL ? emailPlaceholder : profilePlaceholder}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch();
                }
              }}
            />
            <Button
              type="button"
              rootClassName={css.searchBtn}
              onClick={runSearch}
              inProgress={searching}
              disabled={searching}
            >
              <FormattedMessage id="AddTeamCoachModal.search" />
            </Button>
          </div>
        </div>

        {error ? <p className={css.error}>{error}</p> : null}

        {results.length > 0 ? (
          <div className={css.resultsBlock} ref={resultsBlockRef}>
            <p className={css.resultsLabel}>
              <FormattedMessage id="AddTeamCoachModal.resultsLabel" />
            </p>
            <ul className={css.results}>
            {results.map(coach => {
              const coachId = extractCoachUserUuid(coach);
              if (!coachId) {
                return null;
              }
              const isEligible =
                isVerifiedCoachForTeamRoster(coach) || coach?.rosterStatus === 'eligible';
              const cardStatus =
                rosterIndex[coachId] === 'pending'
                  ? 'pending'
                  : rosterIndex[coachId] === 'active'
                  ? 'active'
                  : rosterIndex[coachId] === 'declined'
                  ? 'declined'
                  : coach?.rosterStatus || (isEligible ? 'eligible' : 'not_verified');
              const ctaState = resolveInviteCtaState({
                coachId,
                rosterIndex,
                inviteOutcomes,
                invitingId,
                isEligible,
              });

              return (
                <li key={coachId} className={css.resultItem}>
                  <TeamCoachRosterCard
                    coach={coach}
                    rosterStatus={cardStatus}
                    variant="search"
                    className={css.searchResultCard}
                    footerAction={
                      <CoachResultInviteCta
                        compact
                        state={ctaState}
                        onInvite={() => handleInvite(coach)}
                        inviteDisabled={Boolean(invitingId)}
                      />
                    }
                  />
                </li>
              );
            })}
            </ul>
          </div>
        ) : null}
          </div>
        </div>

        <div className={css.footer}>
          <Button type="button" rootClassName={css.closeBtn} onClick={onClose}>
            <FormattedMessage id="AddTeamCoachModal.close" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddTeamCoachModal;
