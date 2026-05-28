const {
  hasCoachVerificationPublicData,
  looksLikeLegacyCoachUser,
  buildLegacyCoachApprovalPatch,
} = require('./legacyCoachApprovalSharetribe');

describe('legacyCoachApprovalSharetribe', () => {
  it('recognizes manual verification flags', () => {
    expect(
      hasCoachVerificationPublicData({
        coachApproved: true,
      })
    ).toBe(true);
    expect(
      hasCoachVerificationPublicData({
        isVerifiedCoach: true,
      })
    ).toBe(true);
    expect(
      hasCoachVerificationPublicData({
        coachApplicationStatus: 'approved',
      })
    ).toBe(true);
  });

  it('detects legacy coach profile without approval flags', () => {
    const user = {
      id: { uuid: '11111111-1111-4111-8111-111111111111' },
      attributes: {
        profile: {
          displayName: 'Legacy Coach',
          publicData: {
            userType: 'provider',
            sports: ['ski'],
            priceFrom: '80',
          },
        },
      },
    };
    const result = looksLikeLegacyCoachUser(user);
    expect(result.eligible).toBe(true);
    expect(result.reason).toBe('coach_user_type');
  });

  it('skips team accounts', () => {
    const user = {
      attributes: {
        profile: {
          publicData: {
            userType: 'team',
            sports: ['ski'],
          },
        },
      },
    };
    expect(looksLikeLegacyCoachUser(user).eligible).toBe(false);
  });

  it('skips pure customer accounts without coach signals', () => {
    const user = {
      attributes: {
        profile: {
          publicData: {
            userType: 'customer',
          },
        },
      },
    };
    expect(looksLikeLegacyCoachUser(user).eligible).toBe(false);
  });

  it('builds legacy approval patch without overwriting existing values', () => {
    const patch = buildLegacyCoachApprovalPatch({
      userType: 'coach',
      coachApproved: true,
      approvalStatus: 'approved',
    });
    expect(patch.coachApproved).toBeUndefined();
    expect(patch.isVerifiedCoach).toBe(true);
    expect(patch.coachApplicationStatus).toBeUndefined();
  });
});
