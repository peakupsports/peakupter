const fs = require('fs');
const path = require('path');
const { removeReferralDataForDeletedApplication } = require('./referralTracking');
const { findReferralByApplicationId, LEDGER_DIR } = require('./referralLedgerStore');
const { ACTIVITY_DIR } = require('./referralActivityStore');

describe('removeReferralDataForDeletedApplication', () => {
  const applicationId = 'test-app-tracking-delete';
  const referralId = 'test-ref-tracking-delete';
  const ledgerPath = path.join(LEDGER_DIR, `${referralId}.json`);
  const activityPath = path.join(ACTIVITY_DIR, 'test-activity-delete.json');

  beforeEach(() => {
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        id: referralId,
        applicationId,
        ambassadorUserId: 'ambassador-1',
        applicantName: 'Coach',
        applicantEmail: 'coach@example.com',
        status: 'applied',
        createdAt: new Date().toISOString(),
      })
    );
    fs.writeFileSync(
      activityPath,
      JSON.stringify({
        id: 'test-activity-delete',
        ambassadorUserId: 'ambassador-1',
        type: 'coach_applied',
        meta: { applicationId, referralId },
        createdAt: new Date().toISOString(),
      })
    );
  });

  afterEach(() => {
    if (fs.existsSync(ledgerPath)) {
      fs.unlinkSync(ledgerPath);
    }
    if (fs.existsSync(activityPath)) {
      fs.unlinkSync(activityPath);
    }
  });

  it('removes ledger and activity for a deleted application', () => {
    const result = removeReferralDataForDeletedApplication(applicationId);

    expect(result.referralId).toBe(referralId);
    expect(findReferralByApplicationId(applicationId)).toBeNull();
    expect(fs.existsSync(ledgerPath)).toBe(false);
    expect(fs.existsSync(activityPath)).toBe(false);
  });
});
