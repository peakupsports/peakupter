const {
  SUBJECT,
  EVENT_SUBJECT,
  buildCoachCancellationNotificationEmailContent,
} = require('./coachCancellationNotificationEmail');

describe('buildCoachCancellationNotificationEmailContent', () => {
  it('uses the required subject and customer-first-name greeting', () => {
    const { subject, text } = buildCoachCancellationNotificationEmailContent({
      customerFirstName: 'Alex',
    });

    expect(subject).toBe(SUBJECT);
    expect(subject).toBe('Your PeakUp session has been cancelled');
    expect(text).toContain('Hi Alex,');
    expect(text).toContain('scheduling conflict');
    expect(text).toContain('refund process has already been initiated automatically');
    expect(text).toContain('PeakUp Sports Support');
  });

  it('uses event copy when cancelContext is event', () => {
    const { subject, text } = buildCoachCancellationNotificationEmailContent({
      customerFirstName: 'Alex',
      cancelContext: 'event',
    });

    expect(subject).toBe(EVENT_SUBJECT);
    expect(text).toContain('cancel the upcoming event');
    expect(text).toContain("PeakUp's cancellation policy");
  });

  it('falls back to a generic greeting when first name is missing', () => {
    const { text } = buildCoachCancellationNotificationEmailContent({});
    expect(text.startsWith('Hi,')).toBe(true);
  });
});
