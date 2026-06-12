import { PEAKUP_HQ_ROUTE_NAMES, isPeakUpHqRouteName } from './peakupAdmin';
import { isInstructorsCmsPage } from './coachOnboarding';

/**
 * Routes where the global Topbar SportBar must never render — coach/team tools,
 * listing management, and internal admin surfaces.
 */
export const PROVIDER_SPORTBAR_EXCLUDED_ROUTE_NAMES = new Set([
  'CoachDashboardPage',
  'CoachDashboardBookingsPage',
  'CoachDashboardEventsPage',
  'CoachCalendarPage',
  'CoachApplicationPage',
  'CoachSignupPage',
  'TeamApplicationPage',
  'TeamDashboardPage',
  'TeamDashboardBookingsPage',
  'NewListingPage',
  'EditListingPage',
  'EditListingStripeOnboardingPage',
  'ManageListingsPage',
  'CoachEarningsPage',
  'StripePayoutPage',
  'StripePayoutOnboardingPage',
  ...PEAKUP_HQ_ROUTE_NAMES,
]);

/**
 * CoachMapPage injects its own SportBar (winter variants + mobile rail).
 */
export const CUSTOMER_SPORTBAR_PAGE_OVERRIDES = new Set(['CoachMapPage']);

/**
 * @param {string|null|undefined} currentPage
 * @returns {string|null}
 */
export const resolveSportBarRouteName = currentPage => {
  if (typeof currentPage !== 'string' || !currentPage) {
    return null;
  }
  if (currentPage.startsWith('CMSPage:')) {
    return 'CMSPage';
  }
  if (currentPage.startsWith('InboxPage:')) {
    return 'InboxPage';
  }
  return currentPage;
};

/**
 * Whether the global Topbar SportBar should render for the current route.
 *
 * Show when the user is browsing in customer/discovery mode (`!providerNavMode`).
 * Hide on coach/team provider surfaces and PeakUp HQ admin routes.
 *
 * @param {{
 *   currentPage?: string|null,
 *   providerNavMode?: boolean,
 *   cmsPageId?: string|null,
 * }} params
 * @returns {boolean}
 */
export const shouldShowCustomerSportBar = ({
  currentPage = null,
  providerNavMode = false,
  cmsPageId = null,
} = {}) => {
  if (providerNavMode) {
    return false;
  }

  const routeName = resolveSportBarRouteName(currentPage);

  if (routeName && CUSTOMER_SPORTBAR_PAGE_OVERRIDES.has(routeName)) {
    return false;
  }

  if (routeName && PROVIDER_SPORTBAR_EXCLUDED_ROUTE_NAMES.has(routeName)) {
    return false;
  }

  if (routeName && isPeakUpHqRouteName(routeName)) {
    return false;
  }

  if (routeName === 'InstructorsPage') {
    return false;
  }

  if (routeName === 'CMSPage' && cmsPageId && isInstructorsCmsPage(cmsPageId)) {
    return false;
  }

  return true;
};
