import {
  buildCoachApplicationPath,
  buildCoachOnboardingPostVerifyRedirectPath,
  buildCoachOnboardingProfilePublicData,
  getCoachApplicantProfileRepairPayload,
  shouldRedirectToCoachApplication,
  buildCoachSignupAuthSearch,
  buildCoachSignupEntryPath,
  captureAmbassadorRefFromEntry,
  clearCoachOnboardingIntent,
  clearStalePostLoginRedirectStorage,
  consumeCoachOnboardingRedirectPath,
  ensureCoachApplicantProfilePayload,
  filterCoachOnboardingUserTypes,
  getProfileAmbassadorRef,
  getCoachOnboardingRedirectPath,
  getCustomerUserTypeForCoachSignup,
  getVerifyEmailGateState,
  getPostLoginRedirectState,
  isCurrentUserLoadedForPostLoginRedirect,
  isCurrentUserReadyForPostLoginDecision,
  parseEmailVerificationTokenFromSearch,
  COACH_DASHBOARD_PATH,
  hasAmbassadorDashboardAccess,
  hasCoachOnboardingProfileIntent,
  hasCoachOnboardingIntent,
  hasCoachOnboardingUrlSignal,
  isCoachApplicantProfile,
  isCoachApplicationReturnPath,
  isAuthSignupPathname,
  isCoachOnboardingQueryActive,
  isCoachProviderProfileUserType,
  isCoachProviderSignupUserType,
  isOnlyCustomerProfile,
  persistCoachOnboardingIntent,
  resolveCoachOnboardingRedirect,
  resolvePostLoginRedirect,
  resolvePostLoginRedirectTarget,
  resolvePostVerifyRedirect,
  resolveSignupAmbassadorRef,
  rewriteCoachSignupHref,
  rewriteHowItWorksJoinNowLinks,
  GROW_WITH_PEAKUP_CMS_PAGE_PATH,
  shouldContinueCoachOnboarding,
  syncCoachOnboardingIntent,
} from './coachOnboarding';
import { CUSTOMER_DASHBOARD_PATH } from './peakupBookingDashboard';
import { TEAM_DASHBOARD_PATH } from './peakupTeam';

describe('coachOnboarding', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('builds coach onboarding profile publicData with ambassador ref fields', () => {
    expect(buildCoachOnboardingProfilePublicData({ ref: 'TEST123' })).toEqual({
      userType: 'instructor',
      coachOnboardingIntent: true,
      pendingCoachApplication: true,
      ambassadorRef: 'TEST123',
      ambassadorReferralCode: 'TEST123',
      referredByAmbassador: 'TEST123',
      coachReferralCode: 'TEST123',
    });
  });

  it('shouldRedirectToCoachApplication covers pending and intent-only profiles', () => {
    const pendingUser = {
      id: 'u1',
      attributes: { profile: { publicData: { pendingCoachApplication: true } } },
    };
    const intentOnlyUser = {
      id: 'u2',
      attributes: {
        profile: { publicData: { coachOnboardingIntent: true, userType: 'customer' } },
      },
    };
    const submittedUser = {
      id: 'u3',
      attributes: {
        profile: {
          publicData: {
            coachOnboardingIntent: true,
            peakupCoachApplicant: true,
            userType: 'instructor',
          },
        },
      },
    };

    expect(shouldRedirectToCoachApplication(pendingUser)).toBe(true);
    expect(shouldRedirectToCoachApplication(intentOnlyUser)).toBe(false);
    expect(shouldRedirectToCoachApplication(submittedUser)).toBe(false);
  });

  it('getCoachApplicantProfileRepairPayload rebuilds flags from stored intent', () => {
    persistCoachOnboardingIntent({ ref: 'REPAIR01' });
    const user = {
      id: 'u1',
      attributes: { profile: { publicData: { userType: 'customer' } } },
    };

    expect(getCoachApplicantProfileRepairPayload(user)).toBe(null);
  });

  it('getCoachApplicantProfileRepairPayload still repairs profiles without customer/team type from stored intent', () => {
    persistCoachOnboardingIntent({ ref: 'REPAIR01' });
    const user = {
      id: 'u1',
      attributes: { profile: { publicData: {} } },
    };

    expect(getCoachApplicantProfileRepairPayload(user)).toEqual(
      buildCoachOnboardingProfilePublicData({ ref: 'REPAIR01' })
    );
  });

  it('ensureCoachApplicantProfilePayload does not coachify customer profiles on login repair', () => {
    persistCoachOnboardingIntent({ ref: 'AMB01' });
    const customerUser = {
      id: 'u1',
      attributes: {
        profile: { publicData: { userType: 'customer' } },
      },
    };

    expect(ensureCoachApplicantProfilePayload(customerUser, 'AMB01')).toBe(null);
  });

  it('captures ambassador ref from coach-signup URL and persists pre-login', () => {
    const ref = captureAmbassadorRefFromEntry({
      location: { pathname: '/coach-signup', search: '?ref=TEST123' },
      source: 'test',
    });

    expect(ref).toBe('TEST123');
    expect(getCoachOnboardingRedirectPath()).toBe('/coach-application?ref=TEST123');
  });

  it('resolves signup ambassador ref from storage when URL params are missing', () => {
    persistCoachOnboardingIntent({ ref: 'STORED01' });

    expect(
      resolveSignupAmbassadorRef({
        location: { pathname: '/signup', search: '' },
      })
    ).toBe('STORED01');
  });

  it('redirects pending coach with ambassadorReferralCode after login (case E)', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            pendingCoachApplication: true,
            ambassadorReferralCode: 'TEST123',
          },
        },
      },
    };

    expect(resolvePostLoginRedirect(pendingCoachUser)).toBe('/coach-application?ref=TEST123');
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

  it('persists application path in localStorage for entry flow only', () => {
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

  it('redirects generic users to login after email verification', () => {
    expect(resolvePostVerifyRedirect()).toBe('/login');
    expect(resolvePostVerifyRedirect(null)).toBe('/login');
  });

  it('redirects verified coach applicants to coach application after email verification', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            pendingCoachApplication: true,
            ambassadorRef: 'TEST123',
          },
        },
      },
    };

    expect(resolvePostVerifyRedirect(pendingCoachUser)).toBe('/coach-application?ref=TEST123');
  });

  it('redirects to login with coach onboarding query when intent is stored pre-login', () => {
    persistCoachOnboardingIntent({ ref: 'CODE01' });
    expect(resolvePostVerifyRedirect()).toBe('/login?coachOnboarding=1&ref=CODE01');
  });

  it('customer profile with stored coach intent redirects to customer dashboard, not coach-application', () => {
    persistCoachOnboardingIntent({ ref: 'FALLBACK' });
    const customerUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            userType: 'customer',
          },
        },
      },
    };

    expect(resolvePostLoginRedirectTarget(customerUser)).toBe(CUSTOMER_DASHBOARD_PATH);
    expect(resolvePostLoginRedirect(customerUser)).toBe(CUSTOMER_DASHBOARD_PATH);
  });

  it('redirects pending ambassador coach to application with profile ref (case A)', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'instructor',
            pendingCoachApplication: true,
            ambassadorRef: 'CODE01',
          },
        },
      },
    };

    expect(getProfileAmbassadorRef(pendingCoachUser)).toBe('CODE01');
    expect(resolveCoachOnboardingRedirect({ currentUser: pendingCoachUser })).toBe(
      '/coach-application?ref=CODE01'
    );
    expect(resolvePostLoginRedirect(pendingCoachUser)).toBe('/coach-application?ref=CODE01');
  });

  it('redirects pending coach to application without ref when profile has no ambassadorRef', () => {
    const pendingCoachUser = {
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

    expect(resolvePostLoginRedirect(pendingCoachUser)).toBe('/coach-application');
  });

  it('redirects existing coach to dashboard without pending application (case B)', () => {
    const existingCoachUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'instructor',
            coachOnboardingIntent: true,
          },
        },
      },
    };

    expect(isCoachApplicantProfile(existingCoachUser)).toBe(true);
    expect(isCoachProviderProfileUserType(existingCoachUser)).toBe(true);
    expect(resolveCoachOnboardingRedirect({ currentUser: existingCoachUser })).toBe(null);
    expect(resolvePostLoginRedirect(existingCoachUser)).toBe(COACH_DASHBOARD_PATH);
  });

  it('does not redirect founder/admin-style profiles without pendingCoachApplication', () => {
    const founderUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'instructor',
            coachOnboardingIntent: true,
            peakupCoachApplicant: true,
            ambassadorReferralCode: 'FOUNDER01',
          },
        },
      },
    };

    expect(resolvePostLoginRedirect(founderUser)).toBe(COACH_DASHBOARD_PATH);
    expect(resolveCoachOnboardingRedirect({ currentUser: founderUser })).toBe(null);
    expect(hasAmbassadorDashboardAccess(founderUser)).toBe(true);
  });

  it('redirects customer to customer dashboard (case C)', () => {
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
    expect(resolveCoachOnboardingRedirect({ currentUser: customerUser })).toBe(null);
    expect(shouldContinueCoachOnboarding({ currentUser: customerUser })).toBe(false);
    expect(resolvePostLoginRedirect(customerUser)).toBe(CUSTOMER_DASHBOARD_PATH);
  });

  it('redirects team accounts to team dashboard after login', () => {
    const incompleteTeamUser = {
      id: { uuid: 'team-user-1' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: {
            userType: 'team',
          },
        },
      },
    };

    expect(isCoachProviderProfileUserType(incompleteTeamUser)).toBe(false);
    expect(resolvePostLoginRedirect(incompleteTeamUser)).toBe(TEAM_DASHBOARD_PATH);
  });

  it('redirects complete team to team dashboard after login (V1)', () => {
    const completeTeamUser = {
      id: { uuid: 'team-user-2' },
      attributes: {
        profile: {
          displayName: 'Team Azzurro',
          publicData: {
            userType: 'team',
            teamCityText: 'St. Moritz, Switzerland',
            lat: 46.5,
            lng: 9.8,
            teamBio: 'Alpine ski crew.',
          },
        },
      },
    };

    expect(isCoachProviderProfileUserType(completeTeamUser)).toBe(false);
    expect(resolvePostLoginRedirect(completeTeamUser)).toBe(TEAM_DASHBOARD_PATH);
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

  it('does not redirect existing instructor with stale localStorage ref to application (case D)', () => {
    persistCoachOnboardingIntent({ ref: 'OLDREF' });
    const existingCoachUser = {
      id: 'user-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'instructor',
            coachOnboardingIntent: true,
          },
        },
      },
    };

    expect(resolvePostLoginRedirect(existingCoachUser)).toBe(COACH_DASHBOARD_PATH);
    expect(resolveCoachOnboardingRedirect({ currentUser: existingCoachUser })).toBe(null);
  });

  it('redirects verification token on landing to /verify-email (case A)', () => {
    expect(
      getVerifyEmailGateState({
        pathname: '/',
        search: '?t=TOKEN123',
      })
    ).toEqual({
      shouldBlockRoutes: true,
      target: '/verify-email?t=TOKEN123',
      verifyInProgress: false,
      verifySuccess: false,
      redirectDecisionComplete: false,
    });
  });

  it('redirects to coach application after verify success on verify-email (case A/B)', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            pendingCoachApplication: true,
            ambassadorRef: 'TEST123',
          },
        },
      },
    };

    expect(
      getVerifyEmailGateState({
        pathname: '/verify-email',
        search: '?t=TOKEN123',
        verifySuccess: true,
        emailIsVerified: true,
        verifyInProgress: false,
        currentUserFetchInProgress: false,
        currentUser: pendingCoachUser,
      })
    ).toEqual({
      shouldBlockRoutes: true,
      target: '/coach-application?ref=TEST123',
      verifyInProgress: false,
      verifySuccess: true,
      redirectDecisionComplete: false,
    });
  });

  it('redirects to login after verify success for non-coach users', () => {
    expect(
      getVerifyEmailGateState({
        pathname: '/verify-email',
        search: '?t=TOKEN123',
        verifySuccess: true,
        emailIsVerified: true,
        verifyInProgress: false,
        currentUserFetchInProgress: false,
      })
    ).toEqual({
      shouldBlockRoutes: true,
      target: '/login',
      verifyInProgress: false,
      verifySuccess: true,
      redirectDecisionComplete: false,
    });
  });

  it('allows verify-email route during active verification', () => {
    expect(
      getVerifyEmailGateState({
        pathname: '/verify-email',
        search: '?t=TOKEN123',
        verifyInProgress: true,
        emailIsVerified: false,
      })
    ).toMatchObject({
      shouldBlockRoutes: false,
      verifyInProgress: true,
    });
  });

  it('blocks landing while verify runs on wrong path', () => {
    expect(
      getVerifyEmailGateState({
        pathname: '/',
        search: '',
        verifyInProgress: true,
      })
    ).toMatchObject({
      shouldBlockRoutes: true,
      target: null,
      verifyInProgress: true,
    });
  });

  it('detects join referral entry as coach url signal', () => {
    expect(
      hasCoachOnboardingUrlSignal({
        location: { pathname: '/join', search: '?ref=CODE01' },
      })
    ).toBe(true);
  });

  it('blocks landing during post-login redirect to coach dashboard', () => {
    const coachUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            userType: 'instructor',
          },
        },
      },
    };

    expect(
      getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUser: coachUser,
        location: { pathname: '/', search: '' },
      })
    ).toEqual({
      pending: true,
      shouldBlockRoutes: true,
      target: COACH_DASHBOARD_PATH,
      atTarget: false,
      redirectDecisionComplete: false,
      currentUserLoaded: true,
      profileReady: true,
    });
  });

  it('blocks landing for customer at / until profile is ready (case A)', () => {
    expect(
      getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUserFetchInProgress: true,
        currentUser: null,
        location: { pathname: '/', search: '' },
      })
    ).toMatchObject({
      shouldBlockRoutes: true,
      target: null,
      redirectDecisionComplete: false,
      currentUserLoaded: false,
    });
  });

  it('completes customer redirect decision at customer dashboard after profile loads (case B)', () => {
    const customerUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            userType: 'customer',
          },
        },
      },
    };

    expect(
      getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUser: customerUser,
        location: { pathname: '/', search: '' },
      })
    ).toEqual({
      pending: true,
      shouldBlockRoutes: true,
      target: CUSTOMER_DASHBOARD_PATH,
      atTarget: false,
      redirectDecisionComplete: false,
      currentUserLoaded: true,
      profileReady: true,
    });
  });

  it('redirects ambassador coach to application after profile loads (case D)', () => {
    const pendingCoachUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            pendingCoachApplication: true,
            ambassadorRef: 'TEST123',
          },
        },
      },
    };

    expect(
      getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUser: pendingCoachUser,
        location: { pathname: '/', search: '' },
      })
    ).toEqual({
      pending: true,
      shouldBlockRoutes: true,
      target: '/coach-application?ref=TEST123',
      atTarget: false,
      redirectDecisionComplete: false,
      currentUserLoaded: true,
      profileReady: true,
    });
  });

  it('does not block landing for coaches during normal browsing', () => {
    const coachUser = {
      id: 'user-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: {
            userType: 'instructor',
          },
        },
      },
    };

    expect(
      getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: false,
        currentUser: coachUser,
        location: { pathname: '/', search: '' },
      })
    ).toEqual({
      pending: false,
      shouldBlockRoutes: false,
      target: null,
      atTarget: true,
      redirectDecisionComplete: false,
      currentUserLoaded: true,
      profileReady: true,
    });
  });

  it('detects current user profile readiness helpers', () => {
    expect(isCurrentUserLoadedForPostLoginRedirect(null)).toBe(false);
    expect(
      isCurrentUserLoadedForPostLoginRedirect({
        id: 'user-1',
        attributes: { profile: { publicData: {} } },
      })
    ).toBe(true);
    expect(
      isCurrentUserReadyForPostLoginDecision({
        id: 'user-1',
        attributes: {
          emailVerified: true,
          pendingEmail: null,
          profile: { publicData: {} },
        },
      })
    ).toBe(true);
  });

  it('clears stale post-login redirect storage keys', () => {
    localStorage.setItem('peakupCoachOnboarding', '{"active":true}');
    localStorage.setItem('coachOnboardingIntent', '1');
    localStorage.setItem('pendingCoachApplication', 'true');
    localStorage.setItem('ambassadorRef', 'X');
    localStorage.setItem('ref', 'X');
    localStorage.setItem('peakupAmbassadorRef', 'X');

    clearStalePostLoginRedirectStorage();

    expect(localStorage.getItem('peakupCoachOnboarding')).toBe(null);
    expect(localStorage.getItem('coachOnboardingIntent')).toBe(null);
    expect(localStorage.getItem('pendingCoachApplication')).toBe(null);
    expect(localStorage.getItem('ambassadorRef')).toBe(null);
    expect(localStorage.getItem('ref')).toBe(null);
    expect(localStorage.getItem('peakupAmbassadorRef')).toBe(null);
  });

  it('rewrites How it works Join Now CTA to the Grow with PeakUp CMS page', () => {
    const pageData = {
      sections: [
        {
          callToAction: {
            fieldType: 'internalButtonLink',
            content: 'Join Now',
            href: '/coach-signup',
          },
          blocks: [
            {
              callToAction: {
                fieldType: 'internalButtonLink',
                content: 'join now',
                href: '/coach-application',
              },
            },
          ],
        },
      ],
    };

    const result = rewriteHowItWorksJoinNowLinks(pageData, 'how-it-works');

    expect(result.sections[0].callToAction.href).toBe(GROW_WITH_PEAKUP_CMS_PAGE_PATH);
    expect(result.sections[0].blocks[0].callToAction.href).toBe(GROW_WITH_PEAKUP_CMS_PAGE_PATH);
  });

  it('does not rewrite Join Now on the Grow with PeakUp CMS page itself', () => {
    const pageData = {
      sections: [
        {
          callToAction: {
            fieldType: 'internalButtonLink',
            content: 'Join Now',
            href: '/coach-signup',
          },
        },
      ],
    };

    const result = rewriteHowItWorksJoinNowLinks(pageData, '4_instructors');

    expect(result.sections[0].callToAction.href).toBe('/coach-signup');
  });

  it('does not rewrite non–Join Now CTAs on How it works', () => {
    const pageData = {
      sections: [
        {
          callToAction: {
            fieldType: 'internalButtonLink',
            content: 'Find a coach',
            href: '/s',
          },
        },
      ],
    };

    const result = rewriteHowItWorksJoinNowLinks(pageData, 'howitworks');

    expect(result.sections[0].callToAction.href).toBe('/s');
  });

  describe('professional signup → email verification → login → /coach-application', () => {
    const buildNewCoachAfterSignup = (ref = 'AMB01') => ({
      id: 'new-coach-1',
      attributes: {
        emailVerified: false,
        pendingEmail: null,
        profile: {
          publicData: buildCoachOnboardingProfilePublicData({ ref }),
        },
      },
    });

    const buildVerifiedCoachAfterEmailVerify = (ref = 'AMB01') => ({
      id: 'new-coach-1',
      attributes: {
        emailVerified: true,
        pendingEmail: null,
        profile: {
          publicData: buildCoachOnboardingProfilePublicData({ ref }),
        },
      },
    });

    it('step 1 — coach signup persists intent and profile flags on the user', () => {
      captureAmbassadorRefFromEntry({
        location: { pathname: '/coach-signup', search: '?ref=AMB01' },
        source: 'integration-test',
      });

      const afterSignup = buildNewCoachAfterSignup('AMB01');

      expect(hasCoachOnboardingIntent()).toBe(true);
      expect(getCoachOnboardingRedirectPath()).toBe('/coach-application?ref=AMB01');
      expect(shouldRedirectToCoachApplication(afterSignup)).toBe(true);
      expect(isCurrentUserReadyForPostLoginDecision(afterSignup)).toBe(false);
    });

    it('step 2 — after email verification, verified coach is sent to /coach-application', () => {
      const verifiedCoach = buildVerifiedCoachAfterEmailVerify('AMB01');

      expect(
        getVerifyEmailGateState({
          pathname: '/verify-email',
          search: '?t=TOKEN123',
          verifySuccess: true,
          emailIsVerified: true,
          verifyInProgress: false,
          currentUserFetchInProgress: false,
          currentUser: verifiedCoach,
        }).target
      ).toBe('/coach-application?ref=AMB01');

      expect(resolvePostVerifyRedirect(verifiedCoach)).toBe('/coach-application?ref=AMB01');
    });

    it('step 2b — verify in a session without profile yet falls back to login with coach onboarding params', () => {
      persistCoachOnboardingIntent({ ref: 'AMB01' });

      expect(resolvePostVerifyRedirect(null)).toBe('/login?coachOnboarding=1&ref=AMB01');
    });

    it('step 3 — authenticated login page resolves to /coach-application for verified coach', () => {
      const verifiedCoach = buildVerifiedCoachAfterEmailVerify('AMB01');

      expect(resolvePostLoginRedirect(verifiedCoach)).toBe('/coach-application?ref=AMB01');
    });

    it('step 4 — marketplace is blocked until /coach-application is reached after login', () => {
      const verifiedCoach = buildVerifiedCoachAfterEmailVerify('AMB01');

      const onLanding = getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUser: verifiedCoach,
        location: { pathname: '/', search: '' },
      });

      expect(onLanding.shouldBlockRoutes).toBe(true);
      expect(onLanding.target).toBe('/coach-application?ref=AMB01');

      const atApplication = getPostLoginRedirectState({
        isAuthenticated: true,
        authSettling: false,
        postLoginRedirectPending: true,
        currentUser: verifiedCoach,
        location: { pathname: '/coach-application', search: '?ref=AMB01' },
      });

      expect(atApplication.redirectDecisionComplete).toBe(true);
      expect(atApplication.shouldBlockRoutes).toBe(false);
    });

    it('step 5 — global guard still redirects verified pending coaches off marketplace routes', () => {
      const verifiedCoach = buildVerifiedCoachAfterEmailVerify('AMB01');

      expect(resolveCoachOnboardingRedirect({ currentUser: verifiedCoach })).toBe(
        '/coach-application?ref=AMB01'
      );
      expect(shouldRedirectToCoachApplication(verifiedCoach)).toBe(true);
    });

    it('step 6 — customer profile with stale localStorage intent stays on customer dashboard', () => {
      persistCoachOnboardingIntent({ ref: 'AMB01' });

      const verifiedCustomer = {
        id: 'new-customer-1',
        attributes: {
          emailVerified: true,
          pendingEmail: null,
          profile: {
            publicData: { userType: 'customer' },
          },
        },
      };

      expect(resolvePostLoginRedirect(verifiedCustomer)).toBe(CUSTOMER_DASHBOARD_PATH);
      expect(resolvePostVerifyRedirect(verifiedCustomer)).toBe(CUSTOMER_DASHBOARD_PATH);
      expect(shouldRedirectToCoachApplication(verifiedCustomer)).toBe(false);
      expect(isCoachApplicantProfile(verifiedCustomer)).toBe(false);
    });

    it('customer signup after previously selecting Professional does not redirect to coach-application', () => {
      persistCoachOnboardingIntent({ ref: 'AMB01' });
      clearCoachOnboardingIntent();

      const verifiedCustomer = {
        id: 'customer-after-switch-1',
        attributes: {
          emailVerified: true,
          pendingEmail: null,
          profile: {
            publicData: { userType: 'customer' },
          },
        },
      };

      expect(hasCoachOnboardingIntent()).toBe(false);
      expect(resolvePostVerifyRedirect(verifiedCustomer)).toBe(CUSTOMER_DASHBOARD_PATH);
      expect(resolveCoachOnboardingRedirect({ currentUser: verifiedCustomer })).toBe(null);
    });
  });
});
