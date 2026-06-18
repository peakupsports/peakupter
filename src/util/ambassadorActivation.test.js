import {
  buildReferralCodeBase,
  canAccessAmbassadorActivation,
  formatReferralCode,
  generateUniqueReferralCode,
  isAmbassadorActive,
  isVerifiedCoachForAmbassador,
} from './ambassadorActivation';
import { PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY } from './peakupAdmin';

const adminUser = {
  id: { uuid: 'admin-user-uuid' },
  attributes: {
    email: 'ops@peakup.test',
    state: 'active',
    profile: {
      publicData: { [PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY]: true },
    },
  },
};

const verifiedCoachUser = {
  id: { uuid: 'coach-user-uuid' },
  attributes: {
    email: 'coach@peakup.test',
    state: 'active',
    profile: {
      publicData: {
        userType: 'coach',
        peakupVerifiedCoach: true,
      },
    },
  },
};

describe('ambassadorActivation', () => {
  it('detects active ambassador profile flag', () => {
    expect(
      isAmbassadorActive({
        attributes: { profile: { publicData: { ambassadorActive: true } } },
      })
    ).toBe(true);
    expect(
      isAmbassadorActive({
        attributes: { profile: { publicData: {} } },
      })
    ).toBe(false);
  });

  it('builds readable referral code bases', () => {
    expect(buildReferralCodeBase('Javier')).toBe('Javier');
    expect(buildReferralCodeBase('Gian Luca')).toBe('GianLuca');
  });

  it('formats referral codes with PKUP suffix in uppercase', () => {
    expect(formatReferralCode('Javier', 1)).toBe('JAVIERPKUP01');
    expect(formatReferralCode('Gian Luca', 1)).toBe('GIANLUCAPKUP01');
  });

  it('avoids duplicate referral codes', () => {
    const taken = new Set(['JAVIERPKUP01']);
    expect(generateUniqueReferralCode('Javier', taken)).toBe('JAVIERPKUP02');
  });

  it('allows PeakUp HQ admins to access ambassador activation', () => {
    expect(canAccessAmbassadorActivation({}, adminUser)).toBe(true);
  });

  it('allows verified coaches via seal, approval flags, or listings', () => {
    expect(canAccessAmbassadorActivation({}, verifiedCoachUser)).toBe(true);
    expect(
      isVerifiedCoachForAmbassador(
        {},
        {
          id: { uuid: 'approved-coach' },
          attributes: {
            state: 'active',
            profile: { publicData: { userType: 'coach', coachApproved: true } },
          },
        }
      )
    ).toBe(true);
    expect(
      isVerifiedCoachForAmbassador(
        { userTypes: [{ id: 'coach', roles: ['provider'] }] },
        {
          id: { uuid: 'listed-coach' },
          attributes: {
            state: 'active',
            profile: { publicData: { userType: 'coach' } },
          },
        },
        { hasListings: true }
      )
    ).toBe(true);
  });

  it('blocks unverified non-admin users', () => {
    expect(
      canAccessAmbassadorActivation(
        {},
        {
          id: { uuid: 'customer' },
          attributes: {
            state: 'active',
            profile: { publicData: { userType: 'customer' } },
          },
        }
      )
    ).toBe(false);
  });
});
