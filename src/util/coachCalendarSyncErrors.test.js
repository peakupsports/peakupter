import {
  extractCoachCalendarSyncErrorMessage,
  isAvailabilityExceptionOverlapError,
  serializeCoachCalendarSyncError,
} from './coachCalendarSyncErrors';

describe('coachCalendarSyncErrors', () => {
  it('extracts message from storable Sharetribe API error', () => {
    const error = {
      type: 'error',
      name: 'Error',
      message: 'update-listing-failed',
      status: 400,
      statusText: 'Bad Request',
      apiErrors: [
        {
          code: 'validation-invalid-value',
          title: 'Invalid value',
          detail: 'availabilityPlan.entries[0].endTime is invalid',
        },
      ],
    };

    const serialized = serializeCoachCalendarSyncError(error, {
      failedStep: 'updateAvailabilityPlan',
      listingId: 'listing-a',
      requestPayload: { tab: 'availability' },
    });

    expect(serialized.message).toBe('update-listing-failed');
    expect(serialized.status).toBe(400);
    expect(serialized.apiErrors).toHaveLength(1);
    expect(serialized.failedStep).toBe('updateAvailabilityPlan');
    expect(serialized.listingId).toBe('listing-a');
    expect(serialized.requestPayload).toEqual({ tab: 'availability' });
    expect(JSON.stringify(serialized.apiErrors)).toContain('validation-invalid-value');
  });

  it('does not return [object Object] when message is an object', () => {
    const error = {
      message: { code: 'validation-invalid-value', detail: 'Bad plan' },
      status: 400,
    };

    expect(extractCoachCalendarSyncErrorMessage(error)).toBe(
      '{"code":"validation-invalid-value","detail":"Bad plan"}'
    );
  });

  it('detects availability exception overlap errors', () => {
    expect(
      isAvailabilityExceptionOverlapError({
        message: 'Availability exception range overlaps with existing availability exceptions.',
        status: 400,
      })
    ).toBe(true);
  });

  it('unwraps nested Redux rejectWithValue payload', () => {
    const payload = {
      type: 'error',
      status: 409,
      apiErrors: [{ code: 'conflict', title: 'Conflict', detail: 'Already exists' }],
    };

    const serialized = serializeCoachCalendarSyncError({ payload });

    expect(serialized.status).toBe(409);
    expect(serialized.message).toContain('Conflict');
    expect(serialized.apiErrors).toHaveLength(1);
  });
});
