import {
  DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
  DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
  PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
  getPeakUpBookingPreferencesFromPublicData,
  isPeakUpBookingPreferencesTabCompleted,
  parsePeakUpBookingPreferencesFormFields,
  serializePeakUpBookingPreferencesFormFields,
} from './peakUpBookingPreferences';

describe('peakUpBookingPreferences', () => {
  it('returns defaults when publicData has no booking preferences', () => {
    expect(getPeakUpBookingPreferencesFromPublicData({})).toEqual({
      bookingConfirmationMode: DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
      minimumAdvanceNotice: DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
    });
  });

  it('parses stored booking preferences from publicData', () => {
    expect(
      parsePeakUpBookingPreferencesFormFields({
        bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
        minimumAdvanceNotice: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
      })
    ).toEqual({
      bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
      minimumAdvanceNotice: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
    });
  });

  it('serializes form values into publicData fields', () => {
    expect(
      serializePeakUpBookingPreferencesFormFields({
        bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
        minimumAdvanceNotice: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
      })
    ).toEqual({
      bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
      minimumAdvanceNotice: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
    });
  });

  it('falls back to defaults for invalid stored values', () => {
    expect(
      serializePeakUpBookingPreferencesFormFields({
        bookingConfirmationMode: 'invalid',
        minimumAdvanceNotice: 'invalid',
      })
    ).toEqual({
      bookingConfirmationMode: DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
      minimumAdvanceNotice: DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
    });
  });

  it('detects when booking preferences tab is completed', () => {
    expect(isPeakUpBookingPreferencesTabCompleted({})).toBe(false);
    expect(
      isPeakUpBookingPreferencesTabCompleted({
        bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
        minimumAdvanceNotice: PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
      })
    ).toBe(true);
  });
});
