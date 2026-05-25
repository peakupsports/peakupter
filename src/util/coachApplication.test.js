import {
  buildCoachApplicationPayload,
  COACH_APPLICATION_STEPS,
  isCoachApplicationCheckboxChecked,
  validateCoachApplicationStep,
} from './coachApplication';

const messageForKey = key => key;

describe('coachApplication', () => {
  it('defines five wizard steps', () => {
    expect(COACH_APPLICATION_STEPS).toEqual([
      'referral',
      'personal',
      'coaching',
      'documents',
      'consent',
    ]);
  });

  it('requires hearAbout on referral step', () => {
    const errors = validateCoachApplicationStep('referral', {}, messageForKey);
    expect(errors.hearAboutPeakUpRequired).toBeDefined();
  });

  it('requires consent checkboxes on final step', () => {
    const errors = validateCoachApplicationStep('consent', {}, messageForKey);
    expect(errors.acceptLegalRequired).toBeDefined();
    expect(errors.acceptVerificationRequired).toBeDefined();
  });

  it('builds payload without optional files', async () => {
    const payload = await buildCoachApplicationPayload({
      fullName: 'Alex Coach',
      email: 'alex@example.com',
      acceptVerification: true,
    });
    expect(payload.fullName).toBe('Alex Coach');
    expect(payload.files.idDocument).toBeNull();
  });

  it('normalizes checkbox values for payload', async () => {
    const payload = await buildCoachApplicationPayload({
      applyingIndependently: 'yes',
    });
    expect(payload.applyingIndependently).toBe(true);
  });

  it('forces applyingIndependently false when ambassador code is present', async () => {
    const payload = await buildCoachApplicationPayload({
      ambassadorReferralCode: 'TEST123',
      applyingIndependently: 'yes',
      hearAboutPeakUp: 'ambassador',
    });
    expect(payload.applyingIndependently).toBe(false);
    expect(payload.ambassadorReferralCode).toBe('TEST123');
  });

  it('detects coach application checkbox states', () => {
    expect(isCoachApplicationCheckboxChecked(true)).toBe(true);
    expect(isCoachApplicationCheckboxChecked('yes')).toBe(true);
    expect(isCoachApplicationCheckboxChecked(false)).toBe(false);
    expect(isCoachApplicationCheckboxChecked(undefined)).toBe(false);
  });
});
