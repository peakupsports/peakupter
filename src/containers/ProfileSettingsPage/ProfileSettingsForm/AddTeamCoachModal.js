import React, { useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { inviteTeamCoach, searchTeamCoaches } from '../../../util/api';

import { Button, Modal, TeamCoachRosterCard } from '../../../components';

import css from './AddTeamCoachModal.module.css';

const TAB_EMAIL = 'email';
const TAB_PROFILE = 'profile';

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

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError(null);
      setActiveTab(TAB_EMAIL);
    }
  }, [isOpen]);

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
      const coaches = Array.isArray(res?.coaches) ? res.coaches : [];
      setResults(coaches);
      if (coaches.length === 0) {
        setError(intl.formatMessage({ id: 'AddTeamCoachModal.noResults' }));
      }
    } catch (e) {
      setResults([]);
      setError(e?.message || intl.formatMessage({ id: 'AddTeamCoachModal.searchFailed' }));
    } finally {
      setSearching(false);
    }
  }, [intl, query]);

  const handleInvite = async coach => {
    const coachId = coach?.id?.uuid || coach?.id;
    if (!coachId) {
      return;
    }
    setInvitingId(coachId);
    setError(null);
    try {
      await inviteTeamCoach({ coachId });
      onInvited?.();
      onClose?.();
    } catch (e) {
      setError(e?.message || intl.formatMessage({ id: 'AddTeamCoachModal.inviteFailed' }));
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
      isOpen={isOpen}
      onClose={onClose}
      onManageDisableScrolling={() => {}}
      usePortal
      containerClassName={classNames(css.root, className)}
    >
      <div className={css.panel}>
        <h2 className={css.title}>
          <FormattedMessage id="AddTeamCoachModal.title" />
        </h2>
        <p className={css.lead}>
          <FormattedMessage id="AddTeamCoachModal.lead" />
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
            <Button type="button" onClick={runSearch} inProgress={searching} disabled={searching}>
              <FormattedMessage id="AddTeamCoachModal.search" />
            </Button>
          </div>
        </div>

        {error ? <p className={css.error}>{error}</p> : null}

        {results.length > 0 ? (
          <ul className={css.results}>
            {results.map(coach => {
              const coachId = coach?.id?.uuid || coach?.id;
              const status = coach?.rosterStatus || 'eligible';
              const canInvite = status === 'eligible';
              return (
                <li key={coachId} className={css.resultItem}>
                  <TeamCoachRosterCard coach={coach} rosterStatus={status} />
                  <div className={css.resultActions}>
                    {canInvite ? (
                      <Button
                        type="button"
                        onClick={() => handleInvite(coach)}
                        inProgress={invitingId === coachId}
                        disabled={Boolean(invitingId)}
                      >
                        <FormattedMessage id="AddTeamCoachModal.invite" />
                      </Button>
                    ) : (
                      <p className={css.notEligible}>
                        <FormattedMessage id="AddTeamCoachModal.notVerifiedHint" />
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className={css.footer}>
          <Button type="button" onClick={onClose}>
            <FormattedMessage id="AddTeamCoachModal.close" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AddTeamCoachModal;
