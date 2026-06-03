const {
  resolveCoachBlockCancelTransition,
  resolveBookingCancelTransition,
  resolvePurchaseCancelTransition,
  getPurchaseProcessStateInfo,
  isTransitionUnavailable,
} = require('./coachBlockCancellationProcess');

const makeTransaction = (processName, lastTransition) => ({
  attributes: {
    processName,
    lastTransition,
  },
});

describe('coachBlockCancellationProcess', () => {
  describe('resolveBookingCancelTransition', () => {
    it('resolves provider-cancel from accepted booking', () => {
      const tx = makeTransaction('default-booking/release-1', 'transition/accept');
      expect(resolveBookingCancelTransition(tx)).toEqual({
        transition: 'transition/provider-cancel',
        actor: 'provider',
        chainedTransition: null,
        processState: 'accepted',
        error: null,
      });
    });

    it('returns error for unsupported lastTransition', () => {
      const tx = makeTransaction('default-booking/release-1', 'transition/unknown');
      expect(resolveBookingCancelTransition(tx).transition).toBeNull();
    });
  });

  describe('resolvePurchaseCancelTransition', () => {
    it('resolves operator cancel from purchased state', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/confirm-payment');
      expect(resolvePurchaseCancelTransition(tx)).toEqual({
        transition: 'transition/cancel',
        actor: 'operator',
        chainedTransition: null,
        processState: 'purchased',
        error: null,
      });
    });

    it('chains operator-dispute and cancel-from-disputed from delivered', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/mark-delivered');
      expect(resolvePurchaseCancelTransition(tx)).toEqual({
        transition: 'transition/operator-dispute',
        actor: 'operator',
        chainedTransition: 'transition/cancel-from-disputed',
        processState: 'delivered',
        error: null,
      });
    });

    it('resolves cancel-from-disputed when already disputed', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/operator-dispute');
      expect(resolvePurchaseCancelTransition(tx)).toEqual({
        transition: 'transition/cancel-from-disputed',
        actor: 'operator',
        chainedTransition: null,
        processState: 'disputed',
        error: null,
      });
    });
  });

  describe('resolveCoachBlockCancelTransition', () => {
    it('routes default-booking to provider transitions', () => {
      const tx = makeTransaction('default-booking/release-1', 'transition/accept');
      expect(resolveCoachBlockCancelTransition(tx).actor).toBe('provider');
    });

    it('routes default-purchase to operator transitions', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/confirm-payment');
      expect(resolveCoachBlockCancelTransition(tx).actor).toBe('operator');
    });

    it('rejects unsupported process', () => {
      const tx = makeTransaction('default-negotiation/release-1', 'transition/accept');
      expect(resolveCoachBlockCancelTransition(tx).error).toMatch(/Unsupported/);
    });
  });

  describe('getPurchaseProcessStateInfo', () => {
    it('maps confirm-payment to purchased', () => {
      const tx = makeTransaction('default-purchase/release-1', 'transition/confirm-payment');
      expect(getPurchaseProcessStateInfo(tx)).toEqual({
        processState: 'purchased',
        processName: 'default-purchase',
      });
    });
  });

  describe('isTransitionUnavailable', () => {
    it('returns true when transition missing from available list', () => {
      expect(
        isTransitionUnavailable('transition/cancel', ['transition/mark-delivered'])
      ).toBe(true);
    });

    it('returns false when transition is available', () => {
      expect(
        isTransitionUnavailable('transition/cancel', ['transition/cancel'])
      ).toBe(false);
    });
  });
});
