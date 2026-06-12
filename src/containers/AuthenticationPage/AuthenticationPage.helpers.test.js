import {
  buildCoachOnboardingProfilePublicData,
  clearCoachOnboardingIntent,
  hasCoachOnboardingIntent,
  persistCoachOnboardingIntent,
  shouldRedirectToCoachApplication,
} from '../../util/coachOnboarding';
import { PEAKUP_TEAM_USER_TYPE } from '../../util/peakupTeam';
import { SIGNUP_PATH_CLIENT, SIGNUP_PATH_COACH } from '../../util/signupPaths';
import { getHandleSubmitSignup, resolveSignupCoachPayload } from './AuthenticationPage.helpers';

describe('AuthenticationPage.helpers signup submit', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('customer signup clears stale coach intent and sends customer publicData only', () => {
    persistCoachOnboardingIntent({ ref: 'AMB01' });
    expect(hasCoachOnboardingIntent()).toBe(true);

    const submitSignup = jest.fn(() => Promise.resolve());
    const handleSubmit = getHandleSubmitSignup({
      submitSignup,
      userFields: [],
      getSignupSubmitContext: () => ({
        activeSignupPath: SIGNUP_PATH_CLIENT,
        coachSignupRef: 'AMB01',
      }),
    });

    handleSubmit({
      userType: 'customer',
      email: 'customer@example.com',
      password: 'secret-Pass123',
      fname: 'Casey',
      lname: 'Customer',
    });

    expect(hasCoachOnboardingIntent()).toBe(false);
    const payload = submitSignup.mock.calls[0][0];
    expect(payload.publicData).toEqual({ userType: 'customer' });
    expect(payload.coachOnboardingPublicData).toBeUndefined();
    expect(payload.activeSignupPath).toBe(SIGNUP_PATH_CLIENT);
  });

  it('customer submit uses client path even when coach path was active at render time', () => {
    const submitSignup = jest.fn(() => Promise.resolve());
    const handleSubmit = getHandleSubmitSignup({
      submitSignup,
      userFields: [],
      getSignupSubmitContext: () => ({
        activeSignupPath: SIGNUP_PATH_CLIENT,
        coachSignupRef: 'AMB01',
      }),
    });

    handleSubmit({
      userType: 'customer',
      email: 'customer@example.com',
      password: 'secret-Pass123',
      fname: 'Casey',
      lname: 'Customer',
    });

    const payload = submitSignup.mock.calls[0][0];
    expect(payload.publicData).toEqual({ userType: 'customer' });
    expect(payload.coachOnboardingPublicData).toBeUndefined();
  });

  it('team signup clears stale coach intent and omits coach flags from payload', () => {
    persistCoachOnboardingIntent({ ref: 'AMB01' });

    const submitSignup = jest.fn(() => Promise.resolve());
    const handleSubmit = getHandleSubmitSignup({
      submitSignup,
      userFields: [],
      getSignupSubmitContext: () => ({
        activeSignupPath: 'team',
        coachSignupRef: 'AMB01',
      }),
    });

    handleSubmit({
      userType: PEAKUP_TEAM_USER_TYPE,
      email: 'team@example.com',
      password: 'secret-Pass123',
      teamName: 'Alpine Ski Academy',
    });

    expect(hasCoachOnboardingIntent()).toBe(false);
    const payload = submitSignup.mock.calls[0][0];
    expect(payload.publicData).toEqual({ userType: PEAKUP_TEAM_USER_TYPE });
    expect(payload.coachOnboardingPublicData).toBeUndefined();
    expect(payload.firstName).toBe('Alpine Ski Academy');
  });

  it('coach signup includes coach onboarding publicData at submit time', () => {
    clearCoachOnboardingIntent();
    const submitSignup = jest.fn(() => Promise.resolve());
    const handleSubmit = getHandleSubmitSignup({
      submitSignup,
      userFields: [],
      getSignupSubmitContext: () => ({
        activeSignupPath: SIGNUP_PATH_COACH,
        coachSignupRef: 'AMB01',
      }),
    });

    handleSubmit({
      userType: 'customer',
      email: 'coach@example.com',
      password: 'secret-Pass123',
      fname: 'Coach',
      lname: 'Applicant',
    });

    expect(submitSignup).toHaveBeenCalledWith(
      expect.objectContaining({
        coachOnboardingPublicData: buildCoachOnboardingProfilePublicData({ ref: 'AMB01' }),
        activeSignupPath: SIGNUP_PATH_COACH,
      })
    );
  });

  it('resolveSignupCoachPayload only builds coach data for coach path', () => {
    expect(
      resolveSignupCoachPayload({
        activeSignupPath: SIGNUP_PATH_CLIENT,
        coachSignupRef: 'AMB01',
      })
    ).toEqual({
      isCoachSignup: false,
      coachOnboardingPublicData: null,
    });

    expect(
      resolveSignupCoachPayload({
        activeSignupPath: SIGNUP_PATH_COACH,
        coachSignupRef: 'AMB01',
      }).coachOnboardingPublicData
    ).toEqual(buildCoachOnboardingProfilePublicData({ ref: 'AMB01' }));
  });
});

describe('customer and team coach guardrails', () => {
  it('customer with stale coach flags does not trigger coach application redirect or banner logic', () => {
    const customerWithStaleFlags = {
      id: 'customer-1',
      attributes: {
        profile: {
          publicData: {
            userType: 'customer',
            coachOnboardingIntent: true,
            pendingCoachApplication: true,
          },
        },
      },
    };

    expect(shouldRedirectToCoachApplication(customerWithStaleFlags)).toBe(false);
  });

  it('team profile does not trigger coach application redirect', () => {
    const teamUser = {
      id: 'team-1',
      attributes: {
        profile: {
          publicData: {
            userType: PEAKUP_TEAM_USER_TYPE,
            pendingCoachApplication: true,
          },
        },
      },
    };

    expect(shouldRedirectToCoachApplication(teamUser)).toBe(false);
  });
});
