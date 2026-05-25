import {
  buildCoachApplicationPath,
  buildCoachOnboardingPostVerifyRedirectPath,
  buildCoachSignupAuthSearch,
  buildCoachSignupEntryPath,
  clearCoachOnboardingIntent,
  consumeCoachOnboardingRedirectPath,
  filterCoachOnboardingUserTypes,
  getCoachOnboardingRedirectPath,
  getCustomerUserTypeForCoachSignup,
  hasCoachOnboardingProfileIntent,
  hasCoachOnboardingIntent,
  hasCoachOnboardingUrlSignal,
  isCoachApplicationReturnPath,
  isAuthSignupPathname,
  isCoachOnboardingQueryActive,
  isCoachProviderSignupUserType,
  isOnlyCustomerProfile,
  persistCoachOnboardingIntent,
  resolveCoachOnboardingRedirect,
  rewriteCoachSignupHref,
  shouldContinueCoachOnboarding,
  syncCoachOnboardingIntent,
} from './coachOnboarding';

describe('coachOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });
  it('detects provider signup user types', () => {
    expect(isCoachProviderSignupUserType('instructor')).toBe(true);
    expect(isCoachProviderSignupUserType('customer')).toBe(false);
  });

  it('builds coach application paths with referral codes', () => {
    expect(buildCoachApplicationPath({ ref: 'CODE01' })).toBe(
      '/coach-application?ref=CODE01'
    );
    expect(buildCoachSignupEntryPath({ ref: 'CODE01' })).toBe('/coach-signup?ref=CODE01');
  });

  it('recognizes coach application return paths', () => {
    expect(isCoachApplicationReturnPath('/coach-application?ref=ABC')).toBe(true);
    expect(isCoachApplicationReturnPath('/signup')).toBe(false);
  });

  it('rewrites legacy provider signup links', () => {
    expect(rewriteCoachSignupHref('/signup/instructor?ref=ABC')).toBe(
      '/coach-signup?ref=ABC'
    );
    expect(rewriteCoachSignupHref('/signup/customer')).toBe('/signup/customer');
  });

  it('filters provider types from onboarding signup choices', () => {
    const userTypes = [
      { userType: 'customer', roles: ['customer'] },
      { userType: 'instructor', roles: ['provider'] },
    ];
    expect(filterCoachOnboardingUserTypes(userTypes)).toEqual([
      { userType: 'customer', roles: ['customer'] },
    ]);
    expect(getCustomerUserTypeForCoachSignup(userTypes)).toBe('customer');
  });

  it('persists application path and resolves post-verify redirect to coach application', () => {
    persistCoachOnboardingIntent({ ref: 'CODE01' });
    expect(getCoachOnboardingRedirectPath()).toBe('/coach-application?ref=CODE01');
    expect(hasCoachOnboardingIntent()).toBe(true);
    expect(consumeCoachOnboardingRedirectPath()).toBe('/coach-application?ref=CODE01');
    expect(getCoachOnboardingRedirectPath()).toBe(null);
    clearCoachOnboardingIntent();
  });

  it('builds temporary post-verify redirect path helper', () => {
    expect(buildCoachOnboardingPostVerifyRedirectPath({ ref: 'CODE01' })).toBe(
      '/coaches?ref=CODE01'
    );
    expect(buildCoachOnboardingPostVerifyRedirectPath()).toBe('/coaches');
  });

  it('builds signup auth search with coach onboarding query param', () => {
    expect(buildCoachSignupAuthSearch({ ref: 'CODE01' })).toBe(
      '?coachOnboarding=1&ref=CODE01'
    );
    expect(buildCoachSignupAuthSearch()).toBe('?coachOnboarding=1');
    expect(isCoachOnboardingQueryActive('?coachOnboarding=1&ref=ABC')).toBe(true);
    expect(isCoachOnboardingQueryActive('?ref=ABC')).toBe(false);
  });

  it('resolves coach redirect from query param without localStorage', () => {
    expect(
      resolveCoachOnboardingRedirect({
        location: { pathname: '/signup', search: '?coachOnboarding=1&ref=CODE01' },
        from: null,
      })
    ).toBe('/coach-application?ref=CODE01');
  });

  it('detects coach onboarding intent from profile publicData after login', () => {
    const currentUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            pendingCoachApplication: true,
            coachReferralCode: 'CODE01',
          },
        },
      },
    };

    expect(hasCoachOnboardingProfileIntent(currentUser)).toBe(true);
    expect(
      shouldContinueCoachOnboarding({
        currentUser,
        location: { pathname: '/login', search: '' },
        from: null,
      })
    ).toBe(true);
    expect(
      resolveCoachOnboardingRedirect({
        currentUser,
        location: { pathname: '/login', search: '' },
        from: null,
      })
    ).toBe('/coach-application?ref=CODE01');
  });

  it('does not treat customer userType alone as coach intent', () => {
    const customerUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'customer',
          },
        },
      },
    };

    expect(hasCoachOnboardingProfileIntent(customerUser)).toBe(false);
    expect(isOnlyCustomerProfile(customerUser)).toBe(true);
    expect(
      resolveCoachOnboardingRedirect({
        currentUser: customerUser,
        location: { pathname: '/', search: '' },
        from: null,
      })
    ).toBe(null);
    expect(
      shouldContinueCoachOnboarding({
        currentUser: customerUser,
        location: { pathname: '/login', search: '' },
        from: null,
      })
    ).toBe(false);
  });

  it('does not treat instructor userType alone as coach intent', () => {
    const instructorUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'instructor',
          },
        },
      },
    };

    expect(hasCoachOnboardingProfileIntent(instructorUser)).toBe(false);
    expect(
      resolveCoachOnboardingRedirect({
        currentUser: instructorUser,
        location: { pathname: '/', search: '' },
        from: null,
      })
    ).toBe(null);
  });

  it('matches signup paths with optional user type segment', () => {
    expect(isAuthSignupPathname('/signup')).toBe(true);
    expect(isAuthSignupPathname('/signup/customer')).toBe(true);
    expect(isAuthSignupPathname('/login')).toBe(false);
  });

  it('syncs intent on verify-email when storage already has intent', () => {
    persistCoachOnboardingIntent({ ref: 'CODE01' });
    syncCoachOnboardingIntent({
      location: { pathname: '/verify-email', search: '?t=123' },
      from: null,
      pathname: '/verify-email',
    });
    expect(getCoachOnboardingRedirectPath()).toBe('/coach-application?ref=CODE01');
  });

  it('syncs intent on /signup/customer when coach query is present', () => {
    syncCoachOnboardingIntent({
      location: { pathname: '/signup/customer', search: '?coachOnboarding=1&ref=CODE01' },
      from: null,
      pathname: '/signup/customer',
    });
    expect(getCoachOnboardingRedirectPath()).toBe('/coach-application?ref=CODE01');
  });

  it('does not sync intent on normal customer signup', () => {
    syncCoachOnboardingIntent({
      location: { pathname: '/signup', search: '' },
      from: null,
      pathname: '/signup',
    });
    expect(getCoachOnboardingRedirectPath()).toBe(null);
  });

  it('does not sync intent on normal login', () => {
    syncCoachOnboardingIntent({
      location: { pathname: '/login', search: '' },
      from: null,
      pathname: '/login',
      currentUser: {
        id: 'user-1',
        attributes: {
          profile: {
            publicData: { userType: 'customer' },
          },
        },
      },
    });
    expect(getCoachOnboardingRedirectPath()).toBe(null);
  });

  it('detects join referral entry as coach url signal', () => {
    expect(
      hasCoachOnboardingUrlSignal({
        location: { pathname: '/join', search: '?ref=CODE01' },
      })
    ).toBe(true);
  });
});
