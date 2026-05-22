import {
  buildCoachApplicationPayload,
  COACH_APPLICATION_STEPS,
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
});
