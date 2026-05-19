import { isPeakUpConversationView } from './peakUpConversationView';
import { transitions as bookingTransitions } from '../transactions/transactionProcessBooking';

const createTx = ({ processName = 'default-booking', lastTransition }) => ({
  attributes: {
    processName,
    lastTransition,
    transitions: [{ transition: lastTransition, by: 'customer' }],
  },
});

describe('isPeakUpConversationView', () => {
  it('returns true when passed only a transaction in inquiry state', () => {
    const tx = createTx({ lastTransition: bookingTransitions.INQUIRE });
    expect(isPeakUpConversationView(tx)).toBe(true);
  });

  it('returns false when passed only a transaction outside inquiry state', () => {
    const tx = createTx({ lastTransition: bookingTransitions.CONFIRM_PAYMENT });
    expect(isPeakUpConversationView(tx)).toBe(false);
  });

  it('supports legacy processName + transaction signature', () => {
    const tx = createTx({ lastTransition: bookingTransitions.INQUIRE });
    expect(isPeakUpConversationView('default-booking', tx)).toBe(true);
  });
});
