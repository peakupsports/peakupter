import {
  getSignupPathOptions,
  isCoachSignupPathActive,
  resolveActiveSignupPath,
  shouldUseSignupPathSelector,
  SIGNUP_PATH_CLIENT,
  SIGNUP_PATH_COACH,
  SIGNUP_PATH_TEAM,
} from './signupPaths';
import { persistCoachOnboardingIntent } from './coachOnboarding';

describe('signupPaths', () => {
  const userTypes = [
    { userType: 'customer', roles: ['customer'] },
    { userType: 'coach', roles: ['provider'] },
    { userType: 'team', roles: ['provider'] },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('getSignupPathOptions resolves customer and team ids', () => {
    const opts = getSignupPathOptions(userTypes);
    expect(opts.customerUserType).toBe('customer');
    expect(opts.teamUserType).toBe('team');
    expect(opts.showCoachPath).toBe(true);
  });

  it('shouldUseSignupPathSelector when enabled and multiple paths exist', () => {
    expect(
      shouldUseSignupPathSelector({
        showSignupPathSelector: true,
        userTypes,
      })
    ).toBe(true);
    expect(
      shouldUseSignupPathSelector({
        showSignupPathSelector: false,
        userTypes,
      })
    ).toBe(false);
  });

  it('resolveActiveSignupPath selects coach for coach onboarding query', () => {
    expect(
      resolveActiveSignupPath({
        location: { pathname: '/signup', search: '?coachOnboarding=1' },
        selectedUserType: 'customer',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_COACH);
  });

  it('resolveActiveSignupPath selects coach for coach-signup entry', () => {
    expect(
      resolveActiveSignupPath({
        location: { pathname: '/coach-signup', search: '' },
        selectedUserType: 'customer',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_COACH);
  });

  it('resolveActiveSignupPath selects coach for stored onboarding intent', () => {
    persistCoachOnboardingIntent({ ref: 'AMB01' });

    expect(
      resolveActiveSignupPath({
        location: { pathname: '/signup', search: '' },
        selectedUserType: 'customer',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_COACH);
  });

  it('resolveActiveSignupPath selects coach for pending coach application profile', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            pendingCoachApplication: true,
            userType: 'instructor',
          },
        },
      },
    };

    expect(
      resolveActiveSignupPath({
        location: { pathname: '/signup', search: '' },
        currentUser: pendingCoachUser,
        selectedUserType: 'customer',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_COACH);
  });

  it('resolveActiveSignupPath keeps client selected on plain signup', () => {
    expect(
      resolveActiveSignupPath({
        location: { pathname: '/signup', search: '' },
        selectedUserType: 'customer',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_CLIENT);
  });

  it('resolveActiveSignupPath selects team when team user type is chosen', () => {
    expect(
      resolveActiveSignupPath({
        location: { pathname: '/signup', search: '' },
        selectedUserType: 'team',
        userTypes,
      })
    ).toBe(SIGNUP_PATH_TEAM);
  });

  it('isCoachSignupPathActive follows coach onboarding signals only', () => {
    expect(
      isCoachSignupPathActive({
        location: { pathname: '/signup', search: '?coachOnboarding=1' },
      })
    ).toBe(true);
    expect(
      isCoachSignupPathActive({
        location: { pathname: '/signup', search: '' },
      })
    ).toBe(false);
  });
});
