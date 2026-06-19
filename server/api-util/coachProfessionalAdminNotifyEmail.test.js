const { getPeakUpHqAdminNotifyEmails, parseAdminEmails } = require('./peakupHqAdminNotifyEmails');

const loadEmailBuilders = () => {
  jest.resetModules();
  process.env.REACT_APP_MARKETPLACE_ROOT_URL = 'https://peakup.com';
  return require('./coachProfessionalAdminNotifyEmail');
};

describe('getPeakUpHqAdminNotifyEmails', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAIL;
    delete process.env.PEAKUP_HQ_ADMIN_EMAIL;
    delete process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS;
    delete process.env.PEAKUP_HQ_ADMIN_EMAILS;
    delete process.env.COACH_APPLICATION_NOTIFY_EMAIL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers singular REACT_APP_PEAKUP_HQ_ADMIN_EMAIL', () => {
    process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAIL = 'Admin@PeakUp.com';
    expect(getPeakUpHqAdminNotifyEmails()).toEqual(['admin@peakup.com']);
  });

  it('merges server and plural env vars without duplicates', () => {
    process.env.PEAKUP_HQ_ADMIN_EMAIL = 'admin@peakupsports.com';
    process.env.REACT_APP_PEAKUP_HQ_ADMIN_EMAILS = 'admin@peakupsports.com,ops@peakupsports.com';
    expect(getPeakUpHqAdminNotifyEmails()).toEqual([
      'admin@peakupsports.com',
      'ops@peakupsports.com',
    ]);
  });

  it('falls back to legacy COACH_APPLICATION_NOTIFY_EMAIL', () => {
    process.env.COACH_APPLICATION_NOTIFY_EMAIL = 'legacy@peakupsports.com';
    expect(getPeakUpHqAdminNotifyEmails()).toEqual(['legacy@peakupsports.com']);
  });
});

describe('parseAdminEmails', () => {
  it('trims and lowercases comma-separated values', () => {
    expect(parseAdminEmails(' A@X.com , B@Y.com ')).toEqual(['a@x.com', 'b@y.com']);
  });
});

describe('buildCoachProfessionalSignupEmailContent', () => {
  const originalRootUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL;

  afterAll(() => {
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = originalRootUrl;
  });

  it('includes signup details and admin review link', () => {
    const { buildCoachProfessionalSignupEmailContent } = loadEmailBuilders();
    const { subject, text, html } = buildCoachProfessionalSignupEmailContent({
      firstName: 'Alex',
      lastName: 'River',
      email: 'alex@example.com',
      phone: '+41 79 000 00 00',
      sports: 'climbing',
      cityArea: 'Zurich',
      country: 'Switzerland',
      userId: 'user-uuid-1',
      submittedAt: '2026-06-14T10:00:00.000Z',
    });

    expect(subject).toBe('New Professional Signup – PeakUp');
    expect(text).toContain('First name: Alex');
    expect(text).toContain('Last name: River');
    expect(text).toContain('Email: alex@example.com');
    expect(text).toContain('Sports: climbing');
    expect(text).toContain('Location: Zurich, Switzerland');
    expect(text).toContain('http://peakup.com/admin/coach-applications');
    expect(html).toContain('Open coach applications');
  });
});

describe('buildCoachProfessionalApplicationEmailContent', () => {
  const originalRootUrl = process.env.REACT_APP_MARKETPLACE_ROOT_URL;

  afterAll(() => {
    process.env.REACT_APP_MARKETPLACE_ROOT_URL = originalRootUrl;
  });

  it('includes application details and direct review link', () => {
    const { buildCoachProfessionalApplicationEmailContent } = loadEmailBuilders();
    const { subject, text, html } = buildCoachProfessionalApplicationEmailContent({
      applicationId: 'app-123',
      fullName: 'Sam Peak',
      email: 'sam@example.com',
      phone: '+39 333 000 0000',
      mainSport: 'skiing',
      otherSports: 'mountaineering',
      cityArea: 'Milan',
      country: 'Italy',
      applicantUserId: 'user-uuid-2',
      submittedAt: '2026-06-14T11:00:00.000Z',
    });

    expect(subject).toBe('New Professional Application Ready for Review – PeakUp');
    expect(text).toContain('First name: Sam');
    expect(text).toContain('Last name: Peak');
    expect(text).toContain('Sports: skiing, mountaineering');
    expect(text).toContain('Application ID: app-123');
    expect(text).toContain('http://peakup.com/admin/coach-applications/app-123');
    expect(html).toContain('Review application');
  });
});
