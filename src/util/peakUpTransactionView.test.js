import { getProcess } from '../transactions/transaction';
import { createTransaction } from './testData';
import { isPeakUpBookingTransactionView } from './peakUpTransactionView';

describe('isPeakUpBookingTransactionView', () => {
  it('returns true for default booking process outside inquiry states', () => {
    const process = getProcess('default-booking');
    const transaction = createTransaction({
      processName: 'default-booking/release-1',
      lastTransition: process.transitions.CONFIRM_PAYMENT,
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(true);
  });

  it('returns false for inquiry conversation view', () => {
    const transaction = createTransaction({
      processName: 'default-inquiry/release-1',
      lastTransition: 'transition/inquire',
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(false);
  });

  it('returns false for purchase process', () => {
    const transaction = createTransaction({
      processName: 'default-purchase/release-1',
    });

    expect(isPeakUpBookingTransactionView(transaction)).toBe(false);
  });
});
