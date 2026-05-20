import {
  COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY,
  getCoachCalendarDaySettingsBlockCounts,
  loadCoachCalendarDaySettings,
  loadCoachCalendarDaySettingsSnapshot,
  migrateLegacyCoachCalendarDaySettingsKeys,
  saveCoachCalendarDaySettings,
} from './coachCalendarStorage';

describe('coachCalendarStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses one canonical storage key with envelope and updatedAt', () => {
    saveCoachCalendarDaySettings({
      '2026-05-20': { allDayBlocked: true, blockedSlots: [] },
    });

    const raw = window.localStorage.getItem(COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY);
    const parsed = JSON.parse(raw);

    expect(parsed.version).toBe(1);
    expect(parsed.updatedAt).toEqual(expect.any(String));
    expect(parsed.daySettings['2026-05-20'].allDayBlocked).toBe(true);

    const snapshot = loadCoachCalendarDaySettingsSnapshot();
    expect(snapshot.storageKey).toBe(COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY);
    expect(snapshot.daySettings['2026-05-20'].allDayBlocked).toBe(true);
    expect(snapshot.updatedAt).toBe(parsed.updatedAt);
  });

  it('reads legacy flat map stored under canonical key', () => {
    window.localStorage.setItem(
      COACH_CALENDAR_DAY_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        '2026-05-21': { allDayBlocked: false, blockedSlots: [{ id: 's1', start: '10:00', end: '12:00' }] },
      })
    );

    expect(loadCoachCalendarDaySettings()['2026-05-21'].blockedSlots).toHaveLength(1);
  });

  it('migrates legacy keys into canonical storage', () => {
    window.localStorage.setItem(
      'peakup.coachCalendar.daySettings',
      JSON.stringify({
        '2026-05-22': { allDayBlocked: true, blockedSlots: [] },
      })
    );

    migrateLegacyCoachCalendarDaySettingsKeys();

    expect(window.localStorage.getItem('peakup.coachCalendar.daySettings')).toBeNull();
    expect(loadCoachCalendarDaySettings()['2026-05-22'].allDayBlocked).toBe(true);
  });

  it('counts all-day blocked days and partial block days separately', () => {
    const counts = getCoachCalendarDaySettingsBlockCounts({
      '2026-05-01': { allDayBlocked: true, blockedSlots: [] },
      '2026-05-02': {
        allDayBlocked: false,
        blockedSlots: [{ id: 'a', start: '09:00', end: '10:00' }],
      },
      '2026-05-03': { allDayBlocked: false, blockedSlots: [] },
    });

    expect(counts.allDayBlockedCount).toBe(1);
    expect(counts.partialBlockDayCount).toBe(1);
  });
});
