import { mergeIntlMessages } from './mergeIntlMessages';

describe('mergeIntlMessages', () => {
  it('lets hosted translations override generic template keys', () => {
    const merged = mergeIntlMessages(
      { 'ListingPage.title': 'Local title' },
      { 'ListingPage.title': 'Hosted title' }
    );

    expect(merged['ListingPage.title']).toBe('Hosted title');
  });

  it('keeps local PeakUp dashboard copy over hosted assets', () => {
    const merged = mergeIntlMessages(
      {
        'PeakUpBookingDashboard.sectionLessonsUpcoming': 'Upcoming lessons & sessions',
        'PeakUpBookingDashboard.sectionUpcomingEvents': 'Upcoming events',
        'CoachDashboardPage.cardEventsTitle': 'Events',
      },
      {
        'PeakUpBookingDashboard.sectionLessonsUpcoming': 'Hosted upcoming bookings',
        'PeakUpBookingDashboard.sectionUpcomingEvents': 'Hosted camps',
        'CoachDashboardPage.cardEventsTitle': 'Hosted events',
      }
    );

    expect(merged['PeakUpBookingDashboard.sectionLessonsUpcoming']).toBe(
      'Upcoming lessons & sessions'
    );
    expect(merged['PeakUpBookingDashboard.sectionUpcomingEvents']).toBe('Upcoming events');
    expect(merged['CoachDashboardPage.cardEventsTitle']).toBe('Events');
  });
});
