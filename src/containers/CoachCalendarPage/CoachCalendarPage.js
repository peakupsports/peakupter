import React, { useMemo, useState } from 'react';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { LayoutSingleColumn, Page } from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import css from './CoachCalendarPage.module.css';

const MONDAY_WEEK_START = new Date(2024, 0, 8);

const LEGEND_ITEMS = [
  {
    status: 'available',
    labelId: 'CoachCalendarPage.statusAvailable',
    labelDefault: 'Available',
    statusClass: css.dayAvailable,
  },
  {
    status: 'partial',
    labelId: 'CoachCalendarPage.statusPartiallyBlocked',
    labelDefault: 'Partially blocked',
    statusClass: css.dayPartial,
  },
  {
    status: 'unavailable',
    labelId: 'CoachCalendarPage.statusUnavailable',
    labelDefault: 'Unavailable',
    statusClass: css.dayUnavailable,
  },
];

const EMPTY_DAY_SETTINGS = {
  allDayBlocked: false,
  blockedSlots: [],
};

const DEFAULT_NEW_SLOT = {
  start: '10:00',
  end: '11:00',
  reason: '',
};

/** Mock calendar events (bookings/camps) — separate from manual blockedSlots. Replace with API later. */
const MOCK_CALENDAR_EVENTS = [
  {
    id: 'evt-snowboard-camp',
    dateKey: '2026-05-28',
    type: 'camp',
    count: 2,
    label: 'Snowboard Camp',
  },
  {
    id: 'evt-surf-camp',
    dateKey: '2026-05-28',
    type: 'camp',
    count: 3,
    label: 'Surf Coaching',
  },
  {
    id: 'evt-mtb-booking',
    dateKey: '2026-06-14',
    type: 'booking',
    count: 1,
    label: 'Private MTB Session',
  },
];

const BOOKING_WARNING_TYPES = new Set(['booking', 'camp']);

/** Active bookings/camps for a date — never derived from blockedSlots. */
const getCalendarEventsForDate = dateKey =>
  MOCK_CALENDAR_EVENTS.filter(
    event => event.dateKey === dateKey && BOOKING_WARNING_TYPES.has(event.type)
  );

const toDateKey = date => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameCalendarDay = (a, b) => {
  if (!a || !b) {
    return false;
  }
  return toDateKey(a) === toDateKey(b);
};

const normalizeDaySettings = raw => {
  if (!raw) {
    return { ...EMPTY_DAY_SETTINGS };
  }

  if (raw.allDayBlocked !== undefined || Array.isArray(raw.blockedSlots)) {
    return {
      allDayBlocked: Boolean(raw.allDayBlocked),
      blockedSlots: Array.isArray(raw.blockedSlots) ? raw.blockedSlots : [],
    };
  }

  const legacySlots = [];
  if (raw.mode === 'unavailable' || raw.mode === 'all-day') {
    return { allDayBlocked: true, blockedSlots: [] };
  }
  if (raw.mode === 'partial' || raw.mode === 'custom') {
    legacySlots.push({
      id: `legacy-${Date.now()}`,
      start: raw.start || '09:00',
      end: raw.end || '17:00',
      reason: raw.note || '',
    });
    return { allDayBlocked: false, blockedSlots: legacySlots };
  }

  return { ...EMPTY_DAY_SETTINGS };
};

const getDayStatus = settings => {
  const normalized = normalizeDaySettings(settings);
  if (normalized.allDayBlocked) {
    return 'unavailable';
  }
  if (normalized.blockedSlots.length > 0) {
    return 'partial';
  }
  return 'available';
};

const getStatusClass = status => {
  if (status === 'unavailable') {
    return css.dayUnavailable;
  }
  if (status === 'partial') {
    return css.dayPartial;
  }
  return css.dayAvailable;
};

const buildMonthGrid = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmpty = (firstOfMonth.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < leadingEmpty; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

const CoachCalendarPageComponent = () => {
  const intl = useIntl();
  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);

  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [daySettings, setDaySettings] = useState(() => ({
    [todayKey]: {
      allDayBlocked: false,
      blockedSlots: [
        {
          id: 'demo-doctor',
          start: '10:00',
          end: '11:00',
          reason: 'Doctor',
        },
      ],
    },
  }));
  const [blockScope, setBlockScope] = useState('specific');
  const [newSlot, setNewSlot] = useState(DEFAULT_NEW_SLOT);

  const selectedDateKey = toDateKey(selectedDate);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const monthLabel = intl.formatDate(viewDate, { month: 'long', year: 'numeric' });
  const selectedWeekday = intl.formatDate(selectedDate, { weekday: 'long' });
  const selectedDateLabel = intl.formatDate(selectedDate, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const selectedDaySettings = normalizeDaySettings(daySettings[selectedDateKey]);
  const selectedDayStatus = getDayStatus(selectedDaySettings);
  const selectedCalendarEvents = useMemo(
    () => getCalendarEventsForDate(selectedDateKey),
    [selectedDateKey]
  );

  const calendarCells = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const updateSelectedDay = updater => {
    setDaySettings(prev => {
      const current = normalizeDaySettings(prev[selectedDateKey]);
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [selectedDateKey]: next };
    });
  };

  const goToPreviousMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDate = date => {
    setSelectedDate(date);
    const settings = normalizeDaySettings(daySettings[toDateKey(date)]);
    setBlockScope(settings.allDayBlocked ? 'all-day' : 'specific');
    setNewSlot({ ...DEFAULT_NEW_SLOT });
  };

  const handleNewSlotChange = (field, value) => {
    setNewSlot(prev => ({ ...prev, [field]: value }));
  };

  const handleAddBlockedSlot = event => {
    event.preventDefault();
    if (!newSlot.start || !newSlot.end) {
      return;
    }

    updateSelectedDay(current => ({
      allDayBlocked: false,
      blockedSlots: [
        ...current.blockedSlots,
        {
          id: `block-${Date.now()}`,
          start: newSlot.start,
          end: newSlot.end,
          reason: newSlot.reason.trim(),
        },
      ],
    }));

    setNewSlot({ ...DEFAULT_NEW_SLOT });
    setBlockScope('specific');
  };

  const handleBlockAllDay = () => {
    updateSelectedDay(() => ({
      allDayBlocked: true,
      blockedSlots: [],
    }));
    setBlockScope('all-day');
  };

  const handleClearDayBlocks = () => {
    updateSelectedDay(() => ({ ...EMPTY_DAY_SETTINGS }));
    setBlockScope('specific');
    setNewSlot({ ...DEFAULT_NEW_SLOT });
  };

  const handleRemoveBlockedSlot = slotId => {
    updateSelectedDay(current => ({
      ...current,
      allDayBlocked: false,
      blockedSlots: current.blockedSlots.filter(slot => slot.id !== slotId),
    }));
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
            <h1 className={css.heading}>
              <FormattedMessage id="CoachCalendarPage.heading" defaultMessage="Coach Calendar" />
            </h1>
            <p className={css.description}>
              <FormattedMessage
                id="CoachCalendarPage.description"
                defaultMessage="Manage your global availability for all services and bookings."
              />
            </p>
          </header>

          <div className={css.board}>
            <section
              className={classNames(css.card, css.calendarCard)}
              aria-label={intl.formatMessage({
                id: 'CoachCalendarPage.monthCalendarLabel',
                defaultMessage: 'Month calendar',
              })}
            >
              <div className={css.calendarToolbar}>
                <button
                  type="button"
                  className={css.monthNavButton}
                  onClick={goToPreviousMonth}
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.prevMonth',
                    defaultMessage: 'Previous month',
                  })}
                >
                  ‹
                </button>
                <h2 className={css.monthLabel}>{monthLabel}</h2>
                <button
                  type="button"
                  className={css.monthNavButton}
                  onClick={goToNextMonth}
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.nextMonth',
                    defaultMessage: 'Next month',
                  })}
                >
                  ›
                </button>
              </div>

              <div className={css.weekdayRow} role="row">
                {Array.from({ length: 7 }, (_, offset) => {
                  const weekdayDate = new Date(MONDAY_WEEK_START);
                  weekdayDate.setDate(MONDAY_WEEK_START.getDate() + offset);
                  return (
                    <div key={offset} className={css.weekdayCell} role="columnheader">
                      {intl.formatDate(weekdayDate, { weekday: 'short' })}
                    </div>
                  );
                })}
              </div>

              <div className={css.calendarGrid} role="grid">
                {calendarCells.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className={css.dayCellEmpty} role="gridcell" />;
                  }

                  const dateKey = toDateKey(date);
                  const isToday = isSameCalendarDay(date, today);
                  const isSelected = isSameCalendarDay(date, selectedDate);
                  const statusClass = getStatusClass(getDayStatus(daySettings[dateKey]));

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      role="gridcell"
                      className={classNames(css.dayCell, statusClass, {
                        [css.dayToday]: isToday,
                        [css.daySelected]: isSelected,
                      })}
                      onClick={() => handleSelectDate(date)}
                      aria-pressed={isSelected}
                      aria-label={intl.formatDate(date, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    >
                      <span className={css.dayNumber}>{date.getDate()}</span>
                      <span className={css.dayStatusBar} aria-hidden />
                    </button>
                  );
                })}
              </div>

              <ul
                className={css.legend}
                aria-label={intl.formatMessage({
                  id: 'CoachCalendarPage.legendTitle',
                  defaultMessage: 'Availability legend',
                })}
              >
                {LEGEND_ITEMS.map(item => (
                  <li key={item.status} className={css.legendItem}>
                    <span className={classNames(css.legendSwatch, item.statusClass)} aria-hidden />
                    <FormattedMessage id={item.labelId} defaultMessage={item.labelDefault} />
                  </li>
                ))}
              </ul>
            </section>

            <section className={classNames(css.card, css.dayDetailsCard)} aria-live="polite">
              <div className={css.dayDetailsHeader}>
                <p className={css.dayDetailsTitle}>
                  <FormattedMessage
                    id="CoachCalendarPage.blockedSlotsTitle"
                    defaultMessage="Blocked time on this day"
                  />
                </p>
                <p className={css.dayDetailsDate}>
                  {selectedDateLabel}
                  <span className={css.dayDetailsWeekday}> · {selectedWeekday}</span>
                </p>
              </div>
              {selectedDaySettings.allDayBlocked ? (
                <div className={classNames(css.agendaNote, css.agendaNoteUnavailable)}>
                  <FormattedMessage
                    id="CoachCalendarPage.fullDayBlockedNote"
                    defaultMessage="Entire day is blocked."
                  />
                </div>
              ) : selectedDaySettings.blockedSlots.length === 0 ? (
                <p className={css.emptySlots}>
                  <FormattedMessage
                    id="CoachCalendarPage.noBlocksToday"
                    defaultMessage="No blocked slots for this day."
                  />
                </p>
              ) : (
                <ul className={css.blockedSlotsList}>
                  {selectedDaySettings.blockedSlots.map(slot => (
                    <li key={slot.id} className={css.blockedSlotItem}>
                      <span className={css.blockedSlotTime}>
                        {slot.start}–{slot.end}
                      </span>
                      {slot.reason ? (
                        <span className={css.blockedSlotReason}>{slot.reason}</span>
                      ) : (
                        <span className={css.blockedSlotReasonMuted}>
                          <FormattedMessage
                            id="CoachCalendarPage.noBlockReason"
                            defaultMessage="No note"
                          />
                        </span>
                      )}
                      <button
                        type="button"
                        className={css.removeButton}
                        onClick={() => handleRemoveBlockedSlot(slot.id)}
                        aria-label={intl.formatMessage({
                          id: 'CoachCalendarPage.removeButton',
                          defaultMessage: 'Remove',
                        })}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className={css.savedHint}>
                <FormattedMessage
                  id="CoachCalendarPage.savedStatusHint"
                  defaultMessage="Changes apply locally until you connect your calendar."
                />
              </p>
            </section>

            <aside className={classNames(css.card, css.dayPanel)}>
              <div className={css.panelHeader}>
                <p className={css.panelEyebrow}>
                  <FormattedMessage
                    id="CoachCalendarPage.selectedDayLabel"
                    defaultMessage="Selected day"
                  />
                </p>
                <div className={css.panelTitleRow}>
                  <h2 className={css.panelDate}>{selectedDateLabel}</h2>
                  <span className={css.panelWeekday}>{selectedWeekday}</span>
                </div>
                <p className={css.agendaSummary}>
                  {selectedDaySettings.allDayBlocked ? (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaFullDayBlocked"
                      defaultMessage="Entire day blocked — no new bookings."
                    />
                  ) : selectedDaySettings.blockedSlots.length > 0 ? (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaPartialBlocked"
                      defaultMessage="{count, plural, one {# blocked range} other {# blocked ranges}} — other hours stay open."
                      values={{ count: selectedDaySettings.blockedSlots.length }}
                    />
                  ) : (
                    <FormattedMessage
                      id="CoachCalendarPage.agendaAvailable"
                      defaultMessage="Open for bookings — add blocks below if needed."
                    />
                  )}
                </p>
              </div>

              {selectedCalendarEvents.length > 0 ? (
                <div className={css.bookingWarning} role="status">
                  <p className={css.bookingWarningTitle}>
                    <FormattedMessage
                      id="CoachCalendarPage.bookingWarningTitle"
                      defaultMessage="Attention: this day already has active bookings."
                    />
                  </p>
                  <ul className={css.bookingWarningList}>
                    {selectedCalendarEvents.map(event => (
                      <li key={event.id} className={css.bookingWarningItem}>
                        <FormattedMessage
                          id="CoachCalendarPage.bookingWarningItem"
                          defaultMessage="{count, plural, one {# athlete booked} other {# athletes booked}} for {label}."
                          values={{ count: event.count, label: event.label }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className={css.panelBlock}>
                <button
                  type="button"
                  className={classNames(css.statusActionCard, css.statusActionAvailable, {
                    [css.statusActionCardActive]: selectedDayStatus === 'available',
                  })}
                  onClick={handleClearDayBlocks}
                >
                  <span className={css.statusActionBar} aria-hidden />
                  <span className={css.statusActionLabel}>
                    <FormattedMessage
                      id="CoachCalendarPage.statusAvailable"
                      defaultMessage="Available"
                    />
                  </span>
                  <span className={css.statusActionHint}>
                    <FormattedMessage
                      id="CoachCalendarPage.markAvailableButton"
                      defaultMessage="Mark as available"
                    />
                  </span>
                </button>

                <p className={css.panelSectionTitle}>
                  <FormattedMessage
                    id="CoachCalendarPage.blockTimeSectionTitle"
                    defaultMessage="Block unavailable time"
                  />
                </p>

                <div
                  className={css.scopeCardGrid}
                  role="radiogroup"
                  aria-label={intl.formatMessage({
                    id: 'CoachCalendarPage.blockScopeLegend',
                    defaultMessage: 'Block scope',
                  })}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={blockScope === 'all-day'}
                    className={classNames(css.scopeCard, css.scopeCardAllDay, {
                      [css.scopeCardActive]: blockScope === 'all-day',
                    })}
                    onClick={() => setBlockScope('all-day')}
                  >
                    <span className={css.scopeCardBar} aria-hidden />
                    <span className={css.scopeCardLabel}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDayOption"
                        defaultMessage="All day"
                      />
                    </span>
                    <span className={css.scopeCardHint}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockAllDayShort"
                        defaultMessage="Full day unavailable"
                      />
                    </span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={blockScope === 'specific'}
                    className={classNames(css.scopeCard, css.scopeCardSpecific, {
                      [css.scopeCardActive]: blockScope === 'specific',
                    })}
                    onClick={() => setBlockScope('specific')}
                  >
                    <span className={css.scopeCardBar} aria-hidden />
                    <span className={css.scopeCardLabel}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockSpecificOption"
                        defaultMessage="Specific time"
                      />
                    </span>
                    <span className={css.scopeCardHint}>
                      <FormattedMessage
                        id="CoachCalendarPage.blockSpecificShort"
                        defaultMessage="Partially blocked"
                      />
                    </span>
                  </button>
                </div>

                {blockScope === 'all-day' ? (
                  <button
                    type="button"
                    className={css.dangerButton}
                    onClick={handleBlockAllDay}
                    disabled={selectedDaySettings.allDayBlocked}
                  >
                    <FormattedMessage
                      id="CoachCalendarPage.blockAllDayButton"
                      defaultMessage="Block entire day"
                    />
                  </button>
                ) : (
                  <form className={css.addSlotForm} onSubmit={handleAddBlockedSlot}>
                    <div className={css.timeFields}>
                      <label className={css.timeField}>
                        <span className={css.fieldLabel}>
                          <FormattedMessage
                            id="CoachCalendarPage.startTimeLabel"
                            defaultMessage="Start time"
                          />
                        </span>
                        <input
                          className={css.fieldInput}
                          type="time"
                          value={newSlot.start}
                          onChange={e => handleNewSlotChange('start', e.target.value)}
                        />
                      </label>
                      <label className={css.timeField}>
                        <span className={css.fieldLabel}>
                          <FormattedMessage
                            id="CoachCalendarPage.endTimeLabel"
                            defaultMessage="End time"
                          />
                        </span>
                        <input
                          className={css.fieldInput}
                          type="time"
                          value={newSlot.end}
                          onChange={e => handleNewSlotChange('end', e.target.value)}
                        />
                      </label>
                    </div>
                    <label className={css.reasonField}>
                      <span className={css.reasonLabel}>
                        <FormattedMessage
                          id="CoachCalendarPage.reasonLabel"
                          defaultMessage="Reason (optional)"
                        />
                      </span>
                      <input
                        className={css.reasonInput}
                        type="text"
                        value={newSlot.reason}
                        placeholder={intl.formatMessage({
                          id: 'CoachCalendarPage.reasonPlaceholder',
                          defaultMessage: 'Add a note for this block',
                        })}
                        onChange={e => handleNewSlotChange('reason', e.target.value)}
                      />
                    </label>
                    <button type="submit" className={css.primaryButton}>
                      <FormattedMessage
                        id="CoachCalendarPage.addBlockedTimeButton"
                        defaultMessage="Add blocked time"
                      />
                    </button>
                  </form>
                )}
              </div>
            </aside>
          </div>
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default CoachCalendarPageComponent;
