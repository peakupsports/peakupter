const fs = require('fs');
const path = require('path');
const {
  filterValidReferralsForAggregates,
  isReferralRecordValidForAggregates,
} = require('./referralAggregateUtils');
const { LEDGER_DIR } = require('./referralLedgerStore');
const { SUBMISSIONS_DIR } = require('./coachApplicationStore');

describe('referralAggregateUtils', () => {
  const validApplicationIds = new Set(['app-keep']);

  it('excludes referrals whose application was deleted', () => {
    const referrals = [
      { id: 'ref-1', applicationId: 'app-keep', status: 'verified' },
      { id: 'ref-2', applicationId: 'app-deleted', status: 'active' },
    ];

    const { validReferrals, deletedUsersFiltered } = filterValidReferralsForAggregates(
      referrals,
      validApplicationIds
    );

    expect(validReferrals).toHaveLength(1);
    expect(validReferrals[0].id).toBe('ref-1');
    expect(deletedUsersFiltered).toHaveLength(1);
    expect(deletedUsersFiltered[0].reason).toBe('application_deleted_or_rejected');
  });

  it('excludes referrals without an application id', () => {
    expect(
      isReferralRecordValidForAggregates({ id: 'ref-x', applicationId: null }, validApplicationIds)
    ).toBe(false);
  });
});

describe('referral delete cleanup integration', () => {
  const applicationId = 'test-app-delete-cleanup';
  const referralId = 'test-ref-delete-cleanup';
  const appDir = path.join(SUBMISSIONS_DIR, applicationId);
  const ledgerPath = path.join(LEDGER_DIR, `${referralId}.json`);

  beforeEach(() => {
    fs.mkdirSync(appDir, { recursive: true });
    fs.writeFileSync(
      path.join(appDir, 'submission.json'),
      JSON.stringify({
        id: applicationId,
        fullName: 'Deleted Coach',
        email: 'deleted@example.com',
        status: 'approved',
        ambassadorReferralCode: 'TESTCODE',
        submittedAt: new Date().toISOString(),
      })
    );
    fs.writeFileSync(
      ledgerPath,
      JSON.stringify({
        id: referralId,
        applicationId,
        ambassadorUserId: 'ambassador-1',
        applicantName: 'Deleted Coach',
        applicantEmail: 'deleted@example.com',
        status: 'verified',
        createdAt: new Date().toISOString(),
      })
    );
  });

  afterEach(() => {
    if (fs.existsSync(appDir)) {
      fs.rmSync(appDir, { recursive: true, force: true });
    }
    if (fs.existsSync(ledgerPath)) {
      fs.unlinkSync(ledgerPath);
    }
  });

  it('filters out ledger rows after application directory is removed', () => {
    fs.rmSync(appDir, { recursive: true, force: true });

    const { validReferrals } = filterValidReferralsForAggregates([
      JSON.parse(fs.readFileSync(ledgerPath, 'utf8')),
    ]);

    expect(validReferrals).toHaveLength(0);
  });
});
