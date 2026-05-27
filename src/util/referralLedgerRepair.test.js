const { getCoachApplication } = require('../../server/api-util/coachApplicationStore');
const {
  buildReferralLinkPatch,
  logReferralLedgerRepair,
} = require('../../server/api-util/referralLedgerRepair');
const { findReferralForCoach } = require('../../server/api-util/referralCoachLookup');
const { listAllReferrals } = require('../../server/api-util/referralLedgerStore');

jest.mock('../../server/api-util/coachApplicationStore', () => ({
  getCoachApplication: jest.fn(),
}));

describe('referralLedgerRepair', () => {
  it('builds patch to link referred coach from application applicantUserId', () => {
    getCoachApplication.mockReturnValue({
      id: 'app-1',
      applicantUserId: 'coach-1',
      email: 'alex@example.com',
      ambassadorReferralCode: 'GiangioPKUP01',
    });

    const entry = {
      id: 'ref-1',
      ambassadorUserId: 'ambassador-1',
      ambassadorReferralCode: 'GiangioPKUP01',
      applicationId: 'app-1',
      applicantEmail: 'alex@example.com',
      status: 'verified',
    };

    const { patch } = buildReferralLinkPatch(entry);
    expect(patch).toMatchObject({
      referredCoachUserId: 'coach-1',
      referredCoachEmail: 'alex@example.com',
    });
  });

  it('logs PeakUp REFERRAL LEDGER REPAIR payload', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logReferralLedgerRepair({
      coachUserId: 'coach-1',
      coachEmail: 'alex@example.com',
      ambassadorReferralCode: 'GiangioPKUP01',
      ambassadorUserId: 'ambassador-1',
      repaired: true,
      reason: 'ledger_link_repaired',
    });
    expect(spy).toHaveBeenCalledWith(
      '[PeakUp REFERRAL LEDGER REPAIR]',
      expect.objectContaining({
        coachUserId: 'coach-1',
        repaired: true,
        reason: 'ledger_link_repaired',
      })
    );
    spy.mockRestore();
  });

  it('finds referral by coach user id via linked application', () => {
    const referrals = listAllReferrals();
    const alexEntry = referrals.find(entry => entry.applicantEmail === 'alex@example.com');

    if (!alexEntry?.applicationId) {
      return;
    }

    getCoachApplication.mockReturnValue({
      id: alexEntry.applicationId,
      applicantUserId: '6a171550-7913-4bea-b32e-7f32ce10b2e7',
      email: 'alex@example.com',
    });

    const found = findReferralForCoach({
      coachUserId: '6a171550-7913-4bea-b32e-7f32ce10b2e7',
    });

    expect(found?.id).toBe(alexEntry.id);
    expect(found?.ambassadorUserId).toBeTruthy();
  });
});
