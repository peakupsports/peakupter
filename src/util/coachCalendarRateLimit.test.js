import {
  COACH_CALENDAR_SYNC_RATE_LIMIT_COOLDOWN_MS,
  getCoachCalendarSyncRateLimitRemainingMs,
  isCoachCalendarSyncRateLimited,
  isSharetribeRateLimitError,
  markCoachCalendarSyncRateLimited,
  resetCoachCalendarSyncRateLimitForTests,
} from './coachCalendarRateLimit';

describe('coachCalendarRateLimit', () => {
  beforeEach(() => {
    resetCoachCalendarSyncRateLimitForTests();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('detects Sharetribe 429 errors', () => {
    expect(isSharetribeRateLimitError({ status: 429 })).toBe(true);
    expect(
      isSharetribeRateLimitError({
        apiErrors: [{ code: 'too-many-requests' }],
      })
    ).toBe(true);
    expect(isSharetribeRateLimitError({ status: 400 })).toBe(false);
  });

  it('blocks sync for 60 seconds after markCoachCalendarSyncRateLimited', () => {
    markCoachCalendarSyncRateLimited();
    expect(isCoachCalendarSyncRateLimited()).toBe(true);
    expect(getCoachCalendarSyncRateLimitRemainingMs()).toBe(
      COACH_CALENDAR_SYNC_RATE_LIMIT_COOLDOWN_MS
    );

    jest.advanceTimersByTime(COACH_CALENDAR_SYNC_RATE_LIMIT_COOLDOWN_MS);
    expect(isCoachCalendarSyncRateLimited()).toBe(false);
  });
});
