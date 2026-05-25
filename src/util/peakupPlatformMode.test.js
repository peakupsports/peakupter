import {
  PLATFORM_MODE_COACH,
  PLATFORM_MODE_CUSTOMER,
  PEAKUP_PLATFORM_MODE_STORAGE_KEY,
  canUseCoachPlatformMode,
  getDefaultPlatformModeForUser,
  readPlatformModeFromStorage,
  resolvePlatformMode,
  writePlatformModeToStorage,
} from './peakupPlatformMode';

const coachUser = {
  id: { uuid: 'coach-1' },
  attributes: {
    profile: {
      publicData: {
        userType: 'coach',
      },
    },
  },
};

const customerUser = {
  id: { uuid: 'customer-1' },
  attributes: {
    profile: {
      publicData: {
        userType: 'customer',
      },
    },
  },
};

describe('peakupPlatformMode', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('defaults coaches to coach mode', () => {
    expect(getDefaultPlatformModeForUser(coachUser)).toBe(PLATFORM_MODE_COACH);
    expect(canUseCoachPlatformMode(coachUser)).toBe(true);
  });

  it('defaults customers to customer mode', () => {
    expect(getDefaultPlatformModeForUser(customerUser)).toBe(PLATFORM_MODE_CUSTOMER);
    expect(canUseCoachPlatformMode(customerUser)).toBe(false);
  });

  it('restores stored mode for coaches', () => {
    writePlatformModeToStorage(PLATFORM_MODE_CUSTOMER);
    expect(resolvePlatformMode(coachUser, readPlatformModeFromStorage())).toBe(
      PLATFORM_MODE_CUSTOMER
    );
  });

  it('ignores stored mode for non-coaches', () => {
    writePlatformModeToStorage(PLATFORM_MODE_COACH);
    expect(resolvePlatformMode(customerUser, PLATFORM_MODE_COACH)).toBe(PLATFORM_MODE_CUSTOMER);
  });

  it('persists mode in sessionStorage', () => {
    writePlatformModeToStorage(PLATFORM_MODE_COACH);
    expect(window.sessionStorage.getItem(PEAKUP_PLATFORM_MODE_STORAGE_KEY)).toBe(
      PLATFORM_MODE_COACH
    );
  });
});
