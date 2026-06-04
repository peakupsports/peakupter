import {
  DEFAULT_PEAKUP_BOOKING_CONFIRMATION_MODE,
  DEFAULT_PEAKUP_MINIMUM_ADVANCE_NOTICE,
  PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT,
  PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST,
  PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT_TRANSITION,
  PEAKUP_MINIMUM_ADVANCE_NOTICE_48H,
  getPeakUpBookingConfirmPaymentTransition,
  getPeakUpBookingPanelHeadingMessageIds,
  getPeakUpTransactionBookingConfirmationMode,
  getPeakUpBookingPreferencesFromPublicData,
  isPeakUpInstantBookingTransaction,
  isPeakUpBookingPreferencesTabCompleted,
  parsePeakUpBookingPreferencesFormFields,
  resolvePeakUpCheckoutBookingConfirmationMode,
  serializePeakUpBookingPreferencesFormFields,
} from './peakUpBookingPreferences';
import * as bookingProcess from '../transactions/transactionProcessBooking';

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

  it('defaults checkout mode to request when listing mode is missing', () => {
    expect(resolvePeakUpCheckoutBookingConfirmationMode({})).toBe(
      PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST
    );
    expect(
      resolvePeakUpCheckoutBookingConfirmationMode({
        bookingConfirmationMode: PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT,
      })
    ).toBe(PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT);
  });

  it('picks confirm-payment transition from booking mode', () => {
    expect(
      getPeakUpBookingConfirmPaymentTransition(bookingProcess, PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT)
    ).toBe(bookingProcess.transitions.CONFIRM_PAYMENT_INSTANT);
    expect(
      getPeakUpBookingConfirmPaymentTransition(bookingProcess, PEAKUP_BOOKING_CONFIRMATION_MODE_REQUEST)
    ).toBe(bookingProcess.transitions.CONFIRM_PAYMENT);
  });

  it('reads booking mode snapshot from transaction protectedData', () => {
    const listing = { attributes: { publicData: { bookingConfirmationMode: 'instant' } } };
    const tx = {
      attributes: { protectedData: { peakupBookingConfirmationMode: 'request' } },
    };
    expect(getPeakUpTransactionBookingConfirmationMode(tx, listing)).toBe('request');
    expect(isPeakUpInstantBookingTransaction(tx, listing)).toBe(false);
  });

  it('returns instant panel heading copy after confirm-payment-instant', () => {
    expect(
      getPeakUpBookingPanelHeadingMessageIds({
        processName: 'default-booking',
        transactionRole: 'customer',
        processState: 'accepted',
        lastTransition: PEAKUP_BOOKING_CONFIRMATION_MODE_INSTANT_TRANSITION,
      })
    ).toEqual({
      titleId: 'TransactionPage.default-booking.customer.accepted-instant.title',
      extraInfoId: 'TransactionPage.default-booking.customer.accepted-instant.extraInfo',
    });
  });
});
