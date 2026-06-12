import {
  shouldShowCustomerSportBar,
  PROVIDER_SPORTBAR_EXCLUDED_ROUTE_NAMES,
} from './peakupCustomerSportBar';

describe('peakupCustomerSportBar', () => {
  it('shows SportBar on customer discovery pages when not in provider nav mode', () => {
    expect(
      shouldShowCustomerSportBar({
        currentPage: 'LandingPage',
        providerNavMode: false,
      })
    ).toBe(true);

    expect(
      shouldShowCustomerSportBar({
        currentPage: 'CustomerDashboardPage',
        providerNavMode: false,
      })
    ).toBe(true);

    expect(
      shouldShowCustomerSportBar({
        currentPage: 'ListingPage',
        providerNavMode: false,
      })
    ).toBe(true);

    expect(
      shouldShowCustomerSportBar({
        currentPage: 'ProfileSettingsPage',
        providerNavMode: false,
      })
    ).toBe(true);
  });

  it('hides SportBar in coach or team provider nav mode', () => {
    expect(
      shouldShowCustomerSportBar({
        currentPage: 'LandingPage',
        providerNavMode: true,
      })
    ).toBe(false);

    expect(
      shouldShowCustomerSportBar({
        currentPage: 'CustomerDashboardPage',
        providerNavMode: true,
      })
    ).toBe(false);
  });

  it('hides SportBar on coach, team, and admin routes even in customer mode', () => {
    [
      'CoachDashboardPage',
      'CoachCalendarPage',
      'CoachApplicationPage',
      'TeamDashboardPage',
      'PeakUpHQPage',
      'ManageListingsPage',
    ].forEach(routeName => {
      expect(PROVIDER_SPORTBAR_EXCLUDED_ROUTE_NAMES.has(routeName)).toBe(true);
      expect(
        shouldShowCustomerSportBar({
          currentPage: routeName,
          providerNavMode: false,
        })
      ).toBe(false);
    });
  });

  it('delegates CoachMapPage SportBar to the page-specific implementation', () => {
    expect(
      shouldShowCustomerSportBar({
        currentPage: 'CoachMapPage',
        providerNavMode: false,
      })
    ).toBe(false);
  });

  it('hides SportBar on instructor marketing CMS pages', () => {
    expect(
      shouldShowCustomerSportBar({
        currentPage: 'CMSPage:4_instructors',
        providerNavMode: false,
        cmsPageId: '4_instructors',
      })
    ).toBe(false);
  });
});
