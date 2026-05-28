import {
  getSignupPathOptions,
  shouldUseSignupPathSelector,
} from './signupPaths';

describe('signupPaths', () => {
  const userTypes = [
    { userType: 'customer', roles: ['customer'] },
    { userType: 'coach', roles: ['provider'] },
    { userType: 'team', roles: ['provider'] },
  ];

  it('getSignupPathOptions resolves customer and team ids', () => {
    const opts = getSignupPathOptions(userTypes);
    expect(opts.customerUserType).toBe('customer');
    expect(opts.teamUserType).toBe('team');
    expect(opts.showCoachPath).toBe(true);
  });

  it('shouldUseSignupPathSelector when enabled and multiple paths exist', () => {
    expect(
      shouldUseSignupPathSelector({
        showSignupPathSelector: true,
        userTypes,
      })
    ).toBe(true);
    expect(
      shouldUseSignupPathSelector({
        showSignupPathSelector: false,
        userTypes,
      })
    ).toBe(false);
  });
});
