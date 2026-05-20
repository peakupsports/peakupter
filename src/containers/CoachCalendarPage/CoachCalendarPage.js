import React, { useMemo, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { H1, LayoutSingleColumn, Page } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './CoachCalendarPage.module.css';

const dayLabels = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const initialWeeklyAvailability = {
  Monday: { available: true, start: '09:00', end: '17:00' },
  Tuesday: { available: true, start: '09:00', end: '17:00' },
  Wednesday: { available: true, start: '09:00', end: '17:00' },
  Thursday: { available: true, start: '09:00', end: '17:00' },
  Friday: { available: true, start: '09:00', end: '17:00' },
  Saturday: { available: false, start: '10:00', end: '14:00' },
  Sunday: { available: false, start: '10:00', end: '14:00' },
};

const initialBlockedSlots = [
  {
    id: 'block-1',
    date: '2026-05-22',
    start: '13:00',
    end: '15:00',
    reason: 'Team strategy review',
  },
  {
    id: 'block-2',
    date: '2026-05-24',
    start: '11:30',
    end: '12:30',
    reason: 'Personal planning',
  },
];

const CoachCalendarPageComponent = () => {
  const intl = useIntl();
  const [weeklyAvailability, setWeeklyAvailability] = useState(initialWeeklyAvailability);
  const [blockedSlots, setBlockedSlots] = useState(initialBlockedSlots);
  const [newBlock, setNewBlock] = useState({ date: '', start: '09:00', end: '10:00', reason: '' });

  const blockedSlotsByDay = useMemo(() => {
    return blockedSlots.reduce((acc, slot) => {
      const parsed = new Date(slot.date);
      if (!isNaN(parsed)) {
        const weekday = intl.formatDate(parsed, { weekday: 'long' });
        return {
          ...acc,
          [weekday]: [...(acc[weekday] || []), slot],
        };
      }
      return acc;
    }, {});
  }, [blockedSlots, intl]);

  const toggleDayAvailability = day => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        available: !prev[day].available,
      },
    }));
  };

  const updateDayTime = (day, field, value) => {
    setWeeklyAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleNewBlockChange = event => {
    const { name, value } = event.target;
    setNewBlock(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddBlockedTime = event => {
    event.preventDefault();
    if (!newBlock.date || !newBlock.start || !newBlock.end) {
      return;
    }

    setBlockedSlots(prev => [
      ...prev,
      {
        id: `block-${Date.now()}`,
        date: newBlock.date,
        start: newBlock.start,
        end: newBlock.end,
        reason: newBlock.reason,
      },
    ]);

    setNewBlock({ date: '', start: '09:00', end: '10:00', reason: '' });
  };

  const handleRemoveBlockedSlot = slotId => {
    setBlockedSlots(prev => prev.filter(slot => slot.id !== slotId));
  };

  return (
    <Page
      className={classNames(css.root, css.peakUpPage)}
      title={intl.formatMessage({ id: 'CoachCalendarPage.title' })}
    >
      <LayoutSingleColumn
        mainColumnClassName={css.mainColumn}
        topbar={
          <>
            <TopbarContainer />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          <header className={css.header}>
            <span className={css.badge}>
              <FormattedMessage id="CoachCalendarPage.badge" />
            </span>
            <H1 className={css.heading}>
              <FormattedMessage id="CoachCalendarPage.heading" />
            </H1>
            <p className={css.description}>
              <FormattedMessage id="CoachCalendarPage.description" />
            </p>
          </header>

          <div className={css.board}>
            <section className={css.card}>
              <div className={css.cardHeader}>
                <h2 className={css.cardTitle}>
                  <FormattedMessage id="CoachCalendarPage.weeklyAvailabilityTitle" />
                </h2>
                <p className={css.cardSubtitle}>
                  <FormattedMessage id="CoachCalendarPage.weeklyAvailabilityDescription" />
                </p>
              </div>

              <div className={css.availabilityRows}>
                {dayLabels.map(day => {
                  const dayAvailability = weeklyAvailability[day];
                  const availableLabel = dayAvailability.available
                    ? intl.formatMessage({ id: 'CoachCalendarPage.availableLabel' })
                    : intl.formatMessage({ id: 'CoachCalendarPage.unavailableLabel' });

                  return (
                    <div key={day} className={css.dayRow}>
                      <div className={css.dayLabel}>
                        <p className={css.dayName}>{day}</p>
                        <p className={css.dayMeta}>
                          {availableLabel} · {dayAvailability.start} – {dayAvailability.end}
                        </p>
                      </div>

                      <div className={css.controls}>
                        <button
                          type="button"
                          className={classNames(css.toggleButton, {
                            [css.active]: dayAvailability.available,
                          })}
                          onClick={() => toggleDayAvailability(day)}
                          aria-pressed={dayAvailability.available}
                        >
                          {availableLabel}
                        </button>
                        <div className={css.timeFields}>
                          <label className={css.timeField}>
                            <span className={css.fieldLabel}>
                              <FormattedMessage id="CoachCalendarPage.startTimeLabel" />
                            </span>
                            <input
                              className={css.fieldInput}
                              type="time"
                              value={dayAvailability.start}
                              disabled={!dayAvailability.available}
                              onChange={e => updateDayTime(day, 'start', e.target.value)}
                            />
                          </label>
                          <label className={css.timeField}>
                            <span className={css.fieldLabel}>
                              <FormattedMessage id="CoachCalendarPage.endTimeLabel" />
                            </span>
                            <input
                              className={css.fieldInput}
                              type="time"
                              value={dayAvailability.end}
                              disabled={!dayAvailability.available}
                              onChange={e => updateDayTime(day, 'end', e.target.value)}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className={css.card}>
              <div className={css.cardHeader}>
                <h2 className={css.cardTitle}>
                  <FormattedMessage id="CoachCalendarPage.blockSpecificTimeTitle" />
                </h2>
                <p className={css.cardSubtitle}>
                  <FormattedMessage id="CoachCalendarPage.blockSpecificTimeDescription" />
                </p>
              </div>

              <form className={css.listBlock} onSubmit={handleAddBlockedTime}>
                <label className={css.fieldLabel}>
                  <span>{intl.formatMessage({ id: 'CoachCalendarPage.blockDateLabel' })}</span>
                  <input
                    className={css.fieldInput}
                    type="date"
                    name="date"
                    value={newBlock.date}
                    onChange={handleNewBlockChange}
                  />
                </label>

                <div className={css.gridSplit}>
                  <label className={css.fieldLabel}>
                    <span>{intl.formatMessage({ id: 'CoachCalendarPage.startTimeLabel' })}</span>
                    <input
                      className={css.fieldInput}
                      type="time"
                      name="start"
                      value={newBlock.start}
                      onChange={handleNewBlockChange}
                    />
                  </label>
                  <label className={css.fieldLabel}>
                    <span>{intl.formatMessage({ id: 'CoachCalendarPage.endTimeLabel' })}</span>
                    <input
                      className={css.fieldInput}
                      type="time"
                      name="end"
                      value={newBlock.end}
                      onChange={handleNewBlockChange}
                    />
                  </label>
                </div>

                <label className={css.fieldLabel}>
                  <span>{intl.formatMessage({ id: 'CoachCalendarPage.reasonLabel' })}</span>
                  <input
                    className={css.fieldInput}
                    type="text"
                    name="reason"
                    value={newBlock.reason}
                    placeholder={intl.formatMessage({ id: 'CoachCalendarPage.reasonPlaceholder' })}
                    onChange={handleNewBlockChange}
                  />
                </label>

                <button type="submit" className={css.primaryButton}>
                  <FormattedMessage id="CoachCalendarPage.blockTimeButton" />
                </button>
              </form>
            </section>

            <section className={css.card}>
              <div className={css.cardHeader}>
                <h2 className={css.cardTitle}>
                  <FormattedMessage id="CoachCalendarPage.upcomingBlockedTimesTitle" />
                </h2>
                <p className={css.cardSubtitle}>
                  <FormattedMessage id="CoachCalendarPage.upcomingBlockedTimesDescription" />
                </p>
              </div>
              <div className={css.listBlock}>
                {blockedSlots.length === 0 ? (
                  <p className={css.emptyState}>
                    <FormattedMessage id="CoachCalendarPage.noBlockedSlots" />
                  </p>
                ) : (
                  blockedSlots.map(slot => (
                    <div key={slot.id} className={css.blockedItem}>
                      <div className={css.blockedInfo}>
                        <p className={css.blockedDate}>{slot.date}</p>
                        <p className={css.blockedTime}>
                          {slot.start} – {slot.end}
                        </p>
                        {slot.reason ? (
                          <p className={css.blockedReason}>{slot.reason}</p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className={css.removeButton}
                        onClick={() => handleRemoveBlockedSlot(slot.id)}
                      >
                        <FormattedMessage id="CoachCalendarPage.removeButton" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className={css.card}>
              <div className={css.cardHeader}>
                <h2 className={css.cardTitle}>
                  <FormattedMessage id="CoachCalendarPage.availabilityPreviewTitle" />
                </h2>
                <p className={css.cardSubtitle}>
                  <FormattedMessage id="CoachCalendarPage.availabilityPreviewDescription" />
                </p>
              </div>
              <div className={css.previewGrid}>
                {dayLabels.map(day => {
                  const dayAvailability = weeklyAvailability[day];
                  const blockedForDay = blockedSlotsByDay[day] || [];

                  return (
                    <div key={day} className={css.previewCard}>
                      <div className={css.previewHeader}>
                        <p className={css.previewDay}>{day}</p>
                        <p className={css.previewStatus}>
                          {dayAvailability.available
                            ? intl.formatMessage({ id: 'CoachCalendarPage.availableLabel' })
                            : intl.formatMessage({ id: 'CoachCalendarPage.unavailableLabel' })}
                        </p>
                      </div>
                      {dayAvailability.available ? (
                        <p className={css.previewTime}>
                          {dayAvailability.start} – {dayAvailability.end}
                        </p>
                      ) : (
                        <p className={css.previewTime}>
                          {intl.formatMessage({ id: 'CoachCalendarPage.dailyUnavailableText' })}
                        </p>
                      )}
                      {blockedForDay.length > 0 ? (
                        <div className={css.previewBlocks}>
                          {blockedForDay.map(slot => (
                            <span key={slot.id} className={css.blockChip}>
                              {slot.start}–{slot.end}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={css.previewEmpty}>
                          <FormattedMessage id="CoachCalendarPage.noBlocksToday" />
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default CoachCalendarPageComponent;
