import {
  getPeakUpHqUserEmail,
  isPeakUpHqAdmin,
  PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY,
  resolvePeakUpAdminConfig,
} from './peakupAdmin';

const adminUser = {
  id: { uuid: 'admin-user-uuid' },
  attributes: {
    email: 'ops@peakup.test',
    profile: {
      email: 'ops@peakup.test',
      publicData: { [PEAKUP_HQ_ADMIN_PUBLIC_DATA_KEY]: true },
    },
  },
};

const coachUser = {
  id: { uuid: 'coach-user-uuid' },
  attributes: {
    email: 'coach@peakup.test',
    profile: {
      email: 'coach@peakup.test',
      publicData: {},
    },
  },
};

describe('getPeakUpHqUserEmail', () => {
  it('reads email from currentUser.attributes.email', () => {
    expect(getPeakUpHqUserEmail(coachUser)).toBe('coach@peakup.test');
  });
});

describe('resolvePeakUpAdminConfig', () => {
  it('unwraps namespace-imported default export shape', () => {
    expect(
      resolvePeakUpAdminConfig({
        peakUpAdmin: {
          default: { userIds: ['uuid-1'], emails: ['ops@peakup.test'] },
        },
      })
    ).toEqual({
      userIds: ['uuid-1'],
      emails: ['ops@peakup.test'],
    });
  });
});

describe('isPeakUpHqAdmin', () => {
  it('returns true when publicData.peakUpHqAdmin is true', () => {
    expect(isPeakUpHqAdmin(adminUser, {})).toBe(true);
  });

  it('returns true when publicData.isAdmin is true', () => {
    expect(
      isPeakUpHqAdmin(
        {
          id: { uuid: 'user-1' },
          attributes: {
            email: 'user@peakup.test',
            profile: { publicData: { isAdmin: true } },
          },
        },
        {}
      )
    ).toBe(true);
  });

  it('returns true when user id is in config allowlist', () => {
    expect(
      isPeakUpHqAdmin(coachUser, {
        peakUpAdmin: { userIds: ['coach-user-uuid'], emails: [] },
      })
    ).toBe(true);
  });

  it('returns true when email is in config allowlist', () => {
    expect(
      isPeakUpHqAdmin(coachUser, {
        peakUpAdmin: { userIds: [], emails: ['coach@peakup.test'] },
      })
    ).toBe(true);
  });

  it('returns true when email is in development fallback allowlist', () => {
    const prevEnv = process.env.REACT_APP_ENV;
    process.env.REACT_APP_ENV = 'development';

    expect(
      isPeakUpHqAdmin(
        {
          id: { uuid: 'dev-user' },
          attributes: {
            email: 'giangiomac@gmail.com',
            profile: { publicData: {} },
          },
        },
        { peakUpAdmin: { userIds: [], emails: [], developmentHqAdminEmails: ['giangiomac@gmail.com'] } }
      )
    ).toBe(true);

    process.env.REACT_APP_ENV = prevEnv;
  });

  it('returns false for guests and non-admin users', () => {
    expect(isPeakUpHqAdmin(null, {})).toBe(false);
    expect(isPeakUpHqAdmin(coachUser, { peakUpAdmin: { userIds: [], emails: [] } })).toBe(false);
  });
});
