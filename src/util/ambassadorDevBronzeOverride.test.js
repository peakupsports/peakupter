const {
  isGiangioDevAmbassadorBronzeOverride,
  resolveAmbassadorRewardsUnlockedWithDevOverride,
} = require('../../server/api-util/ambassadorDevBronzeOverride');

describe('ambassadorDevBronzeOverride (server)', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('is inactive outside development', () => {
    process.env.NODE_ENV = 'production';
    expect(
      isGiangioDevAmbassadorBronzeOverride({
        userId: '69e16a44-5217-4220-9f45-618ca5dcfe5d',
        email: 'giangiomac@gmail.com',
        referralCode: 'GiangioPKUP01',
      })
    ).toBe(false);
  });

  it('matches Giangio dev account in development', () => {
    process.env.NODE_ENV = 'development';
    expect(
      isGiangioDevAmbassadorBronzeOverride({
        email: 'giangiomac@gmail.com',
      })
    ).toBe(true);
    expect(
      isGiangioDevAmbassadorBronzeOverride({
        referralCode: 'giangiopkup01',
      })
    ).toBe(true);
  });

  it('resolves unlocked true only when override matches', () => {
    process.env.NODE_ENV = 'development';
    expect(
      resolveAmbassadorRewardsUnlockedWithDevOverride({
        email: 'giangiomac@gmail.com',
        storedUnlocked: false,
      }).unlocked
    ).toBe(true);
    expect(
      resolveAmbassadorRewardsUnlockedWithDevOverride({
        email: 'other@example.com',
        storedUnlocked: false,
      }).unlocked
    ).toBe(false);
  });
});
