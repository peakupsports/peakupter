const {
  buildAmbassadorWelcomeEmailContent,
} = require('./ambassadorWelcomeEmail');
const { getConfiguredProvider } = require('./peakupTransactionalEmail');

describe('buildAmbassadorWelcomeEmailContent', () => {
  it('includes tier, referral code, links, and locked rewards copy', () => {
    const { subject, text, html } = buildAmbassadorWelcomeEmailContent({
      coachName: 'Giangio',
      referralCode: 'GiangioPKUP01',
      referralLink: 'https://peakup.com/join?ref=GiangioPKUP01',
      referralCenterLink: 'https://peakup.com/referral-center',
      ambassadorTier: 'bronze',
      rewardsUnlocked: false,
    });

    expect(subject).toBe('Welcome to the PeakUp Ambassador Program');
    expect(text).toContain('Ambassador tier: Bronze');
    expect(text).toContain('GiangioPKUP01');
    expect(text).toContain('https://peakup.com/join?ref=GiangioPKUP01');
    expect(text).toContain('https://peakup.com/referral-center');
    expect(text).toContain('rewards are locked');
    expect(html).toContain('Open Referral Center');
    expect(html).not.toContain('motion.div');
  });

  it('uses unlocked rewards copy when rewards are active', () => {
    const { text } = buildAmbassadorWelcomeEmailContent({
      coachName: 'Coach',
      referralCode: 'CODE01',
      referralLink: 'https://peakup.com/join?ref=CODE01',
      referralCenterLink: 'https://peakup.com/referral-center',
      rewardsUnlocked: true,
    });

    expect(text).toContain('rewards are active');
  });
});

describe('getConfiguredProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.RESEND_API_KEY;
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.PEAKUP_TRANSACTIONAL_EMAIL_WEBHOOK_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers resend when RESEND_API_KEY is set', () => {
    process.env.RESEND_API_KEY = 're_test';
    expect(getConfiguredProvider()).toBe('resend');
  });

  it('returns postmark when POSTMARK_SERVER_TOKEN is set', () => {
    process.env.POSTMARK_SERVER_TOKEN = 'pm_test';
    expect(getConfiguredProvider()).toBe('postmark');
  });

  it('returns null when no provider is configured', () => {
    expect(getConfiguredProvider()).toBeNull();
  });
});
