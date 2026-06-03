const {
  resolveCoachEventCancelTransition,
  isCancelableMultiDayEventTransaction,
  CANCELABLE_EVENT_PROCESS_STATES,
} = require('./coachEventCancellationProcess');

const makeTransaction = (processName, lastTransition) => ({
  attributes: {
    processName,
    lastTransition,
  },
});

describe('coachEventCancellationProcess', () => {
  describe('resolveCoachEventCancelTransition', () => {
    it('resolves transition/cancel for purchased events', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/confirm-payment');
      expect(resolveCoachEventCancelTransition(tx)).toEqual({
        transition: 'transition/cancel',
        chainedTransition: null,
        processState: 'purchased',
        cancelCase: 'purchased',
        actor: 'operator',
        error: null,
      });
    });

    it('chains operator-dispute and cancel-from-disputed for delivered events', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/mark-delivered');
      expect(resolveCoachEventCancelTransition(tx)).toEqual({
        transition: 'transition/operator-dispute',
        chainedTransition: 'transition/cancel-from-disputed',
        processState: 'delivered',
        cancelCase: 'delivered',
        actor: 'operator',
        error: null,
      });
    });

    it('resolves cancel-from-disputed when already disputed', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/operator-dispute');
      expect(resolveCoachEventCancelTransition(tx)).toEqual({
        transition: 'transition/cancel-from-disputed',
        chainedTransition: null,
        processState: 'disputed',
        cancelCase: 'disputed',
        actor: 'operator',
        error: null,
      });
    });

    it('rejects canceled events', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/cancel');
      expect(resolveCoachEventCancelTransition(tx).error).toMatch(/cannot be canceled/);
    });

    it('rejects default-booking transactions', () => {
      const tx = makeTransaction('default-booking/release-1', 'transition/accept');
      expect(resolveCoachEventCancelTransition(tx).error).toMatch(/Unsupported/);
    });
  });

  describe('isCancelableMultiDayEventTransaction', () => {
    it('returns true for purchased and delivered states', () => {
      expect(
        isCancelableMultiDayEventTransaction(
          makeTransaction('default-purchase/release-1', 'transition/confirm-payment')
        )
      ).toBe(true);
      expect(
        isCancelableMultiDayEventTransaction(
          makeTransaction('default-purchase/release-1', 'transition/mark-delivered')
        )
      ).toBe(true);
    });

    it('returns false for canceled state', () => {
      expect(
        isCancelableMultiDayEventTransaction(
          makeTransaction('default-purchase/release-1', 'transition/cancel')
        )
      ).toBe(false);
    });
  });

  it('exports cancelable process states', () => {
    expect(CANCELABLE_EVENT_PROCESS_STATES.has('purchased')).toBe(true);
    expect(CANCELABLE_EVENT_PROCESS_STATES.has('canceled')).toBe(false);
  });
});
