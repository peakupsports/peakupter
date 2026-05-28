import React, { useCallback, useEffect, useState } from 'react';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import {
  cancelTeamCoachInvite,
  fetchTeamRosterManage,
  removeTeamCoachMember,
} from '../../../util/api';

import { Button, H4, TeamCoachRosterCard } from '../../../components';

import AddTeamCoachModal from './AddTeamCoachModal';
import css from './TeamCoachesSection.module.css';

/**
 * Team Profile Settings — connect independent PeakUp coaches to the organization.
 * Coaches keep their own accounts, reviews, bookings, and payouts.
 */
const TeamCoachesSection = () => {
  const intl = useIntl();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadRoster = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTeamRosterManage();
      setCoaches(Array.isArray(res?.coaches) ? res.coaches : []);
    } catch (e) {
      setCoaches([]);
      setError(e?.message || 'Failed to load coaches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  const handleRemove = async coach => {
    const coachId = coach?.id?.uuid || coach?.id;
    if (
      !coachId ||
      !window.confirm(intl.formatMessage({ id: 'ProfileSettingsForm.teamCoachesRemoveConfirm' }))
    ) {
      return;
    }
    setActionId(coachId);
    try {
      await removeTeamCoachMember({ coachId });
      await loadRoster();
    } catch (e) {
      setError(e?.message || 'Failed to remove coach.');
    } finally {
      setActionId(null);
    }
  };

  const handleCancelInvite = async coach => {
    const coachId = coach?.id?.uuid || coach?.id;
    if (!coachId) {
      return;
    }
    setActionId(coachId);
    try {
      await cancelTeamCoachInvite({ coachId });
      await loadRoster();
    } catch (e) {
      setError(e?.message || 'Failed to cancel invitation.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className={css.root}>
      <div className={css.header}>
        <div>
          <H4 as="h2" className={css.title}>
            <FormattedMessage id="ProfileSettingsForm.teamCoachesHeading" />
          </H4>
          <p className={css.lead}>
            <FormattedMessage id="ProfileSettingsForm.teamCoachesInfo" />
          </p>
        </div>
        <Button type="button" className={css.addBtn} onClick={() => setModalOpen(true)}>
          <FormattedMessage id="ProfileSettingsForm.teamCoachesAdd" />
        </Button>
      </div>

      {loading ? (
        <p className={css.status}>
          <FormattedMessage id="ProfileSettingsForm.teamCoachesLoading" />
        </p>
      ) : null}

      {error && !loading ? <p className={css.error}>{error}</p> : null}

      {!loading && coaches.length === 0 ? (
        <div className={css.empty}>
          <p className={css.emptyTitle}>
            <FormattedMessage id="ProfileSettingsForm.teamCoachesEmptyTitle" />
          </p>
          <p className={css.emptyLead}>
            <FormattedMessage id="ProfileSettingsForm.teamCoachesEmptyLead" />
          </p>
        </div>
      ) : null}

      {!loading && coaches.length > 0 ? (
        <ul className={css.grid}>
          {coaches.map(coach => {
            const coachId = coach?.id?.uuid || coach?.id;
            const status = coach?.rosterStatus || 'active';
            return (
              <li key={coachId} className={css.gridItem}>
                <TeamCoachRosterCard
                  coach={coach}
                  rosterStatus={status}
                  onRemove={status === 'active' ? handleRemove : undefined}
                  onCancelInvite={status === 'pending' ? handleCancelInvite : undefined}
                />
                {actionId === coachId ? (
                  <span className={css.actionOverlay} aria-hidden>
                    …
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <AddTeamCoachModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInvited={loadRoster}
      />
    </div>
  );
};

export default TeamCoachesSection;
