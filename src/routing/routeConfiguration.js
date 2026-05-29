import React from 'react';
import loadable from '@loadable/component';

import getPageDataLoadingAPI from '../containers/pageDataLoadingAPI';
import LandingPage from '../containers/LandingPage/LandingPage';
const AboutPage = loadable(() =>
  import(/* webpackChunkName: "AboutPage" */ '../containers/AboutPage/AboutPage')
);
const CoachApplicationPage = loadable(() =>
  import(
    /* webpackChunkName: "CoachApplicationPage" */ '../containers/CoachApplicationPage/CoachApplicationPage'
  )
);
const TeamApplicationPage = loadable(() =>
  import(
    /* webpackChunkName: "TeamApplicationPage" */ '../containers/TeamApplicationPage/TeamApplicationPage'
  )
);
const AdminTeamApplicationsPage = loadable(() =>
  import(
    /* webpackChunkName: "AdminTeamApplicationsPage" */ '../containers/AdminTeamApplicationsPage/AdminTeamApplicationsPage'
  )
);
const CoachDashboardPage = loadable(() =>
  import(
    /* webpackChunkName: "CoachDashboardPage" */ '../containers/CoachDashboardPage/CoachDashboardPage'
  )
);
const JoinPage = loadable(() =>
  import(/* webpackChunkName: "JoinPage" */ '../containers/JoinPage/JoinPage')
);
const CoachSignupPage = loadable(() =>
  import(/* webpackChunkName: "CoachSignupPage" */ '../containers/CoachSignupPage/CoachSignupPage')
);
const AdminCoachApplicationsPage = loadable(() =>
  import(
    /* webpackChunkName: "AdminCoachApplicationsPage" */ '../containers/AdminCoachApplicationsPage/AdminCoachApplicationsPage'
  )
);
const PeakUpHQPage = loadable(() =>
  import(/* webpackChunkName: "PeakUpHQPage" */ '../containers/PeakUpHQPage/PeakUpHQPage')
);
const PeakUpHqAmbassadorsPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqAmbassadorsPage" */ '../containers/PeakUpHq/PeakUpHqAmbassadorsPage/PeakUpHqAmbassadorsPage'
  )
);
const PeakUpHqCancellationCenterPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqCancellationCenterPage" */ '../containers/PeakUpHq/PeakUpHqCancellationCenterPage/PeakUpHqCancellationCenterPage'
  )
);
const PeakUpHqPlaceholderPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqPlaceholderPage" */ '../containers/PeakUpHq/PeakUpHqPlaceholderPage/PeakUpHqPlaceholderPage'
  )
);
const PeakUpHqCoachManagementPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqCoachManagementPage" */ '../containers/PeakUpHq/PeakUpHqFeaturedCoachesPage/PeakUpHqFeaturedCoachesPage'
  )
);
const PeakUpHqCustomerManagementPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqCustomerManagementPage" */ '../containers/PeakUpHq/PeakUpHqCustomerManagementPage/PeakUpHqCustomerManagementPage'
  )
);
const PeakUpHqTeamManagementPage = loadable(() =>
  import(
    /* webpackChunkName: "PeakUpHqTeamManagementPage" */ '../containers/PeakUpHq/PeakUpHqTeamManagementPage/PeakUpHqTeamManagementPage'
  )
);
const TermsPage = loadable(() =>
  import(/* webpackChunkName: "TermsPage" */ '../containers/TermsPage/TermsPage')
);
const PrivacyPage = loadable(() =>
  import(/* webpackChunkName: "PrivacyPage" */ '../containers/PrivacyPage/PrivacyPage')
);
const CookiesPage = loadable(() =>
  import(/* webpackChunkName: "CookiesPage" */ '../containers/CookiesPage/CookiesPage')
);
const CancellationPolicyPage = loadable(() =>
  import(
    /* webpackChunkName: "CancellationPolicyPage" */ '../containers/CancellationPolicyPage/CancellationPolicyPage'
  )
);
const CoachEarningsPage = loadable(() =>
  import(
    /* webpackChunkName: "CoachEarningsPage" */ '../containers/CoachEarningsPage/CoachEarningsPage'
  )
);
const AmbassadorProgramPage = loadable(() =>
  import(
    /* webpackChunkName: "AmbassadorProgramPage" */ '../containers/AmbassadorProgramPage/AmbassadorProgramPage'
  )
);
const ReferralCenterPage = loadable(() =>
  import(
    /* webpackChunkName: "ReferralCenterPage" */ '../containers/ReferralCenterPage/ReferralCenterPage'
  )
);
import NotFoundPage from '../containers/NotFoundPage/NotFoundPage';
import PreviewResolverPage from '../containers/PreviewResolverPage/PreviewResolverPage';

// routeConfiguration needs to initialize containers first
// Otherwise, components will import form container eventually and
// at that point css bundling / imports will happen in wrong order.
import { NamedRedirect } from '../components';

const pageDataLoadingAPI = getPageDataLoadingAPI();

const AuthenticationPage = loadable(() => import(/* webpackChunkName: "AuthenticationPage" */ '../containers/AuthenticationPage/AuthenticationPage'));
const CheckoutPage = loadable(() => import(/* webpackChunkName: "CheckoutPage" */ '../containers/CheckoutPage/CheckoutPage'));
const CMSPage = loadable(() => import(/* webpackChunkName: "CMSPage" */ '../containers/CMSPage/CMSPage'));
const ContactDetailsPage = loadable(() => import(/* webpackChunkName: "ContactDetailsPage" */ '../containers/ContactDetailsPage/ContactDetailsPage'));
const EditListingPage = loadable(() => import(/* webpackChunkName: "EditListingPage" */ '../containers/EditListingPage/EditListingPage'));
const EmailVerificationPage = loadable(() => import(/* webpackChunkName: "EmailVerificationPage" */ '../containers/EmailVerificationPage/EmailVerificationPage'));
const InboxPage = loadable(() => import(/* webpackChunkName: "InboxPage" */ '../containers/InboxPage/InboxPage'));
const MakeOfferPage = loadable(() => import(/* webpackChunkName: "MakeOfferPage" */ '../containers/MakeOfferPage/MakeOfferPage'));
const ListingPageCoverPhoto = loadable(() => import(/* webpackChunkName: "ListingPageCoverPhoto" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCoverPhoto'));
const ListingPageCarousel = loadable(() => import(/* webpackChunkName: "ListingPageCarousel" */ /* webpackPrefetch: true */ '../containers/ListingPage/ListingPageCarousel'));
const ManageListingsPage = loadable(() => import(/* webpackChunkName: "ManageListingsPage" */ '../containers/ManageListingsPage/ManageListingsPage'));
const ManageAccountPage = loadable(() => import(/* webpackChunkName: "ManageAccountPage" */ '../containers/ManageAccountPage/ManageAccountPage'));
const PasswordChangePage = loadable(() => import(/* webpackChunkName: "PasswordChangePage" */ '../containers/PasswordChangePage/PasswordChangePage'));
const PasswordRecoveryPage = loadable(() => import(/* webpackChunkName: "PasswordRecoveryPage" */ '../containers/PasswordRecoveryPage/PasswordRecoveryPage'));
const PasswordResetPage = loadable(() => import(/* webpackChunkName: "PasswordResetPage" */ '../containers/PasswordResetPage/PasswordResetPage'));
const PaymentMethodsPage = loadable(() => import(/* webpackChunkName: "PaymentMethodsPage" */ '../containers/PaymentMethodsPage/PaymentMethodsPage'));
const PrivacyPolicyPage = loadable(() => import(/* webpackChunkName: "PrivacyPolicyPage" */ '../containers/PrivacyPolicyPage/PrivacyPolicyPage'));
const ProfilePage = loadable(() => import(/* webpackChunkName: "ProfilePage" */ '../containers/ProfilePage/ProfilePage'));
const ProfileSettingsPage = loadable(() => import(/* webpackChunkName: "ProfileSettingsPage" */ '../containers/ProfileSettingsPage/ProfileSettingsPage'));
const RequestQuotePage = loadable(() => import(/* webpackChunkName: "RequestQuotePage" */ '../containers/RequestQuotePage/RequestQuotePage'));
const SearchPageWithMap = loadable(() => import(/* webpackChunkName: "SearchPageWithMap" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithMap'));
const SearchPageWithGrid = loadable(() => import(/* webpackChunkName: "SearchPageWithGrid" */ /* webpackPrefetch: true */  '../containers/SearchPage/SearchPageWithGrid'));
const CoachesPage = loadable(() =>
  import(/* webpackChunkName: "CoachesPage" */ '../containers/CoachesPage/CoachesPage')
);
const CoachMapPage = loadable(() =>
  import(/* webpackChunkName: "CoachMapPage" */ '../containers/CoachMapPage/CoachMapPage')
);
const CoachCalendarPage = loadable(() =>
  import(/* webpackChunkName: "CoachCalendarPage" */ '../containers/CoachCalendarPage/CoachCalendarPage')
);
const StripePayoutPage = loadable(() => import(/* webpackChunkName: "StripePayoutPage" */ '../containers/StripePayoutPage/StripePayoutPage'));
const TransactionPage = loadable(() => import(/* webpackChunkName: "TransactionPage" */ '../containers/TransactionPage/TransactionPage'));
const NoAccessPage = loadable(() => import(/* webpackChunkName: "NoAccessPage" */ '../containers/NoAccessPage/NoAccessPage'));

// Styleguide helps you to review current components and develop new ones
const StyleguidePage = loadable(() => import(/* webpackChunkName: "StyleguidePage" */ '../containers/StyleguidePage/StyleguidePage'));

export const ACCOUNT_SETTINGS_PAGES = [
  'ContactDetailsPage',
  'PasswordChangePage',
  'StripePayoutPage',
  'PaymentMethodsPage',
  'ManageAccountPage'
];

// https://en.wikipedia.org/wiki/Universally_unique_identifier#Nil_UUID
const draftId = '00000000-0000-0000-0000-000000000000';
const draftSlug = 'draft';

const RedirectToLandingPage = () => <NamedRedirect name="LandingPage" />;

// NOTE: Most server-side endpoints are prefixed with /api. Requests to those
// endpoints are indended to be handled in the server instead of the browser and
// they will not render the application. So remember to avoid routes starting
// with /api and if you encounter clashing routes see server/index.js if there's
// a conflicting route defined there.

// Our routes are exact by default.
// See behaviour from Routes.js where Route is created.
const routeConfiguration = (layoutConfig, accessControlConfig) => {
  const isSearchPageWithMap = layoutConfig.searchPage?.variantType === 'map';
  const SearchPage = isSearchPageWithMap ? SearchPageWithMap : SearchPageWithGrid;
  const ListingPage = layoutConfig.listingPage?.variantType === 'carousel' 
    ? ListingPageCarousel 
    : ListingPageCoverPhoto;

  const isPrivateMarketplace = accessControlConfig?.marketplace?.private === true;
  const authForPrivateMarketplace = isPrivateMarketplace ? { auth: true } : {};
  
  return [
    {
      path: '/',
      name: 'LandingPage',
      component: LandingPage,
      loadData: pageDataLoadingAPI.LandingPage.loadData,
      // Hero SearchCTA / FilterLocation use Mapbox geocoding before any map is shown; deferring
      // mapbox-gl-js breaks predictions and throws "Mapbox libraries are required for GeocoderMapbox".
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/p/about',
      name: 'AboutPage',
      component: AboutPage,
      loadData: pageDataLoadingAPI.AboutPage.loadData,
    },
    {
      path: '/join',
      name: 'JoinPage',
      component: JoinPage,
    },
    {
      path: '/coach-signup',
      name: 'CoachSignupPage',
      component: CoachSignupPage,
    },
    {
      path: '/coach-application',
      name: 'CoachApplicationPage',
      component: CoachApplicationPage,
      loadData: pageDataLoadingAPI.CoachApplicationPage.loadData,
    },
    {
      path: '/team-application',
      name: 'TeamApplicationPage',
      component: TeamApplicationPage,
      auth: true,
      authPage: 'LoginPage',
      loadData: pageDataLoadingAPI.TeamApplicationPage.loadData,
    },
    {
      path: '/coach-dashboard',
      name: 'CoachDashboardPage',
      auth: true,
      authPage: 'LoginPage',
      component: CoachDashboardPage,
      loadData: pageDataLoadingAPI.CoachDashboardPage.loadData,
    },
    {
      path: '/coach-earnings',
      name: 'CoachEarningsPage',
      component: CoachEarningsPage,
      loadData: pageDataLoadingAPI.CoachEarningsPage.loadData,
    },
    {
      path: '/ambassador-program',
      name: 'AmbassadorProgramPage',
      component: AmbassadorProgramPage,
      loadData: pageDataLoadingAPI.AmbassadorProgramPage.loadData,
    },
    {
      path: '/referral-center',
      name: 'ReferralCenterPage',
      component: ReferralCenterPage,
      loadData: pageDataLoadingAPI.ReferralCenterPage.loadData,
    },
    {
      path: '/admin',
      name: 'PeakUpHQPage',
      component: PeakUpHQPage,
      auth: true,
      loadData: pageDataLoadingAPI.PeakUpHQPage.loadData,
    },
    {
      path: '/admin/coach-applications',
      name: 'AdminCoachApplicationsPage',
      component: AdminCoachApplicationsPage,
      auth: true,
      loadData: pageDataLoadingAPI.AdminCoachApplicationsPage.loadData,
    },
    {
      path: '/admin/team-applications',
      name: 'AdminTeamApplicationsPage',
      component: AdminTeamApplicationsPage,
      auth: true,
      loadData: pageDataLoadingAPI.AdminTeamApplicationsPage.loadData,
    },
    {
      path: '/admin/coach-applications/:applicationId',
      name: 'AdminCoachApplicationDetailPage',
      component: AdminCoachApplicationsPage,
      auth: true,
      loadData: pageDataLoadingAPI.AdminCoachApplicationsPage.loadData,
    },
    {
      path: '/admin/coach-management',
      name: 'PeakUpHqCoachManagementPage',
      auth: true,
      component: PeakUpHqCoachManagementPage,
      loadData: pageDataLoadingAPI.PeakUpHqCoachManagementPage.loadData,
    },
    {
      path: '/admin/customer-management',
      name: 'PeakUpHqCustomerManagementPage',
      auth: true,
      component: PeakUpHqCustomerManagementPage,
      loadData: pageDataLoadingAPI.PeakUpHqCustomerManagementPage.loadData,
    },
    {
      path: '/admin/team-management',
      name: 'PeakUpHqTeamManagementPage',
      auth: true,
      component: PeakUpHqTeamManagementPage,
      loadData: pageDataLoadingAPI.PeakUpHqTeamManagementPage.loadData,
    },
    {
      path: '/admin/featured-coaches',
      name: 'PeakUpHqFeaturedCoachesRedirect',
      auth: true,
      component: () => <NamedRedirect name="PeakUpHqCoachManagementPage" />,
    },
    {
      path: '/admin/ambassadors',
      name: 'PeakUpHqAmbassadorsPage',
      auth: true,
      component: PeakUpHqAmbassadorsPage,
      loadData: pageDataLoadingAPI.PeakUpHqAmbassadorsPage.loadData,
    },
    {
      path: '/admin/cancellation-center',
      name: 'PeakUpHqCancellationCenterPage',
      auth: true,
      component: PeakUpHqCancellationCenterPage,
      loadData: pageDataLoadingAPI.PeakUpHqCancellationCenterPage.loadData,
    },
    {
      path: '/admin/verification-center',
      name: 'PeakUpHqVerificationPage',
      auth: true,
      component: props => <PeakUpHqPlaceholderPage routeName="PeakUpHqVerificationPage" {...props} />,
      loadData: pageDataLoadingAPI.PeakUpHqVerificationPage.loadData,
    },
    {
      path: '/admin/reports',
      name: 'PeakUpHqReportsPage',
      auth: true,
      component: props => <PeakUpHqPlaceholderPage routeName="PeakUpHqReportsPage" {...props} />,
      loadData: pageDataLoadingAPI.PeakUpHqReportsPage.loadData,
    },
    {
      path: '/admin/payments',
      name: 'PeakUpHqPaymentsPage',
      auth: true,
      component: props => <PeakUpHqPlaceholderPage routeName="PeakUpHqPaymentsPage" {...props} />,
      loadData: pageDataLoadingAPI.PeakUpHqPaymentsPage.loadData,
    },
    {
      path: '/admin/activity',
      name: 'PeakUpHqActivityPage',
      auth: true,
      component: props => <PeakUpHqPlaceholderPage routeName="PeakUpHqActivityPage" {...props} />,
      loadData: pageDataLoadingAPI.PeakUpHqActivityPage.loadData,
    },
    {
      path: '/p/terms',
      name: 'TermsPage',
      component: TermsPage,
      loadData: pageDataLoadingAPI.TermsPage.loadData,
    },
    {
      path: '/p/privacy',
      name: 'PrivacyPage',
      component: PrivacyPage,
      loadData: pageDataLoadingAPI.PrivacyPage.loadData,
    },
    {
      path: '/p/cookies',
      name: 'CookiesPage',
      component: CookiesPage,
      loadData: pageDataLoadingAPI.CookiesPage.loadData,
    },
    {
      path: '/p/cancellation-policy',
      name: 'CancellationPolicyPage',
      component: CancellationPolicyPage,
      loadData: pageDataLoadingAPI.CancellationPolicyPage.loadData,
    },
    {
      path: '/p/privacy-policy',
      name: 'PrivacyPolicyAliasRedirect',
      component: () => <NamedRedirect name="PrivacyPage" />,
    },
    {
      path: '/p/cookie-policy',
      name: 'CookiePolicyAliasRedirect',
      component: () => <NamedRedirect name="CookiesPage" />,
    },
    {
      path: '/4_instructors',
      name: 'InstructorsPageRedirect',
      component: props => (
        <NamedRedirect name="CMSPage" params={{ pageId: '4_instructors' }} search={props.location?.search} />
      ),
    },
    {
      path: '/about',
      name: 'AboutPageRedirect',
      component: props => <NamedRedirect name="AboutPage" search={props.location?.search} />,
    },
    {
      path: '/p/:pageId',
      name: 'CMSPage',
      component: CMSPage,
      loadData: pageDataLoadingAPI.CMSPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    // NOTE: when the private marketplace feature is enabled, the '/s' route is disallowed by the robots.txt resource.
    // If you add new routes that start with '/s*' (e.g. /support), you should add them to the robotsPrivateMarketplace.txt file.
    {
      path: '/s',
      name: 'SearchPage',
      ...authForPrivateMarketplace,
      component: SearchPage,
      loadData: pageDataLoadingAPI.SearchPage.loadData,
      prioritizeMapLibraryLoading: isSearchPageWithMap,
    },
    {
      path: '/s/:listingType',
      name: 'SearchPageWithListingType',
      ...authForPrivateMarketplace,
      component: SearchPage,
      loadData: pageDataLoadingAPI.SearchPage.loadData,
      prioritizeMapLibraryLoading: isSearchPageWithMap,
    },
    {
      path: '/coaches',
      name: 'CoachesPage',
      ...authForPrivateMarketplace,
      component: CoachesPage,
      loadData: pageDataLoadingAPI.CoachesExplorePage.loadData,
    },
    {
      path: '/coach-map',
      name: 'CoachMapPage',
      ...authForPrivateMarketplace,
      component: CoachMapPage,
      loadData: pageDataLoadingAPI.CoachesExplorePage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/coach-calendar',
      name: 'CoachCalendarPage',
      auth: true,
      authPage: 'LoginPage',
      component: CoachCalendarPage,
    },
    {
      path: '/l',
      name: 'ListingBasePage',
      component: RedirectToLandingPage,
    },
    {
      path: '/l/:slug/:id',
      name: 'ListingPage',
      ...authForPrivateMarketplace,
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/l/:slug/:id/make-offer',
      name: 'MakeOfferPage',
      auth: true,
      component: MakeOfferPage,
      loadData: pageDataLoadingAPI.MakeOfferPage.loadData,
    },
    {
      path: '/l/:slug/:id/request-quote',
      name: 'RequestQuotePage',
      auth: true,
      component: RequestQuotePage,
      extraProps: { mode: 'request-quote' },
      loadData: pageDataLoadingAPI.RequestQuotePage.loadData,
    },
    {
      path: '/l/:slug/:id/checkout',
      name: 'CheckoutPage',
      auth: true,
      component: CheckoutPage,
      setInitialValues: pageDataLoadingAPI.CheckoutPage.setInitialValues,
    },
    {
      path: '/l/:slug/:id/:variant',
      name: 'ListingPageVariant',
      auth: true,
      authPage: 'LoginPage',
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/l/new',
      name: 'NewListingPage',
      auth: true,
      component: () => (
        <NamedRedirect
          name="EditListingPage"
          params={{ slug: draftSlug, id: draftId, type: 'new', tab: 'details' }}
        />
      ),
    },
    {
      path: '/l/:slug/:id/:type/:tab',
      name: 'EditListingPage',
      auth: true,
      component: EditListingPage,
      loadData: pageDataLoadingAPI.EditListingPage.loadData,
    },
    {
      path: '/l/:slug/:id/:type/:tab/:returnURLType',
      name: 'EditListingStripeOnboardingPage',
      auth: true,
      component: EditListingPage,
      loadData: pageDataLoadingAPI.EditListingPage.loadData,
    },

    // Canonical path should be after the `/l/new` path since they
    // conflict and `new` is not a valid listing UUID.
    {
      path: '/l/:id',
      name: 'ListingPageCanonical',
      ...authForPrivateMarketplace,
      component: ListingPage,
      loadData: pageDataLoadingAPI.ListingPage.loadData,
      prioritizeMapLibraryLoading: true,
    },
    {
      path: '/u',
      name: 'ProfileBasePage',
      component: RedirectToLandingPage,
    },
    {
      path: '/u/:id',
      name: 'ProfilePage',
      ...authForPrivateMarketplace,
      component: ProfilePage,
      loadData: pageDataLoadingAPI.ProfilePage.loadData,
    },
    {
      path: '/u/:id/:variant',
      name: 'ProfilePageVariant',
      auth: true,
      component: ProfilePage,
      loadData: pageDataLoadingAPI.ProfilePage.loadData,
    },
    {
      path: '/profile-settings',
      name: 'ProfileSettingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ProfileSettingsPage,
    },

    // Note: authenticating with IdP (e.g. Facebook) expects that /login path exists
    // so that in the error case users can be redirected back to the LoginPage
    // In case you change this, remember to update the route in server/api/auth/loginWithIdp.js
    {
      path: '/login',
      name: 'LoginPage',
      component: AuthenticationPage,
      extraProps: { tab: 'login' },
    },
    {
      path: '/signup',
      name: 'SignupPage',
      component: AuthenticationPage,
      extraProps: { tab: 'signup' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    {
      path: '/signup/:userType',
      name: 'SignupForUserTypePage',
      component: AuthenticationPage,
      extraProps: { tab: 'signup' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    {
      path: '/confirm',
      name: 'ConfirmPage',
      component: AuthenticationPage,
      extraProps: { tab: 'confirm' },
      loadData: pageDataLoadingAPI.AuthenticationPage.loadData,
    },
    {
      path: '/recover-password',
      name: 'PasswordRecoveryPage',
      component: PasswordRecoveryPage,
    },
    {
      path: '/inbox',
      name: 'InboxBasePage',
      auth: true,
      authPage: 'LoginPage',
      component: () => <NamedRedirect name="InboxPage" params={{ tab: 'sales' }} />,
    },
    {
      path: '/inbox/:tab',
      name: 'InboxPage',
      auth: true,
      authPage: 'LoginPage',
      component: InboxPage,
      loadData: pageDataLoadingAPI.InboxPage.loadData,
    },
    {
      path: '/order/:id',
      name: 'OrderDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: TransactionPage,
      extraProps: { transactionRole: 'customer' },
      loadData: (params, ...rest) =>
        pageDataLoadingAPI.TransactionPage.loadData({ ...params, transactionRole: 'customer' }, ...rest),
      setInitialValues: pageDataLoadingAPI.TransactionPage.setInitialValues,
    },
    {
      path: '/order/:id/details',
      name: 'OrderDetailsPageRedirect',
      auth: true,
      authPage: 'LoginPage',
      component: props => <NamedRedirect name="OrderDetailsPage" params={{ id: props.params?.id }} />,
    },
    {
      path: '/sale/:id',
      name: 'SaleDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: TransactionPage,
      extraProps: { transactionRole: 'provider' },
      loadData: pageDataLoadingAPI.TransactionPage.loadData,
    },
    {
      path: '/sale/:id/details',
      name: 'SaleDetailsPageRedirect',
      auth: true,
      authPage: 'LoginPage',
      component: props => <NamedRedirect name="SaleDetailsPage" params={{ id: props.params?.id }} />,
    },
    {
      path: '/listings',
      name: 'ManageListingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ManageListingsPage,
      loadData: pageDataLoadingAPI.ManageListingsPage.loadData,
    },
    {
      path: '/account',
      name: 'AccountSettingsPage',
      auth: true,
      authPage: 'LoginPage',
      component: () => <NamedRedirect name="ContactDetailsPage" />,
    },
    {
      path: '/account/contact-details',
      name: 'ContactDetailsPage',
      auth: true,
      authPage: 'LoginPage',
      component: ContactDetailsPage,
      loadData: pageDataLoadingAPI.ContactDetailsPage.loadData,
    },
    {
      path: '/account/change-password',
      name: 'PasswordChangePage',
      auth: true,
      authPage: 'LoginPage',
      component: PasswordChangePage,
    },
    {
      path: '/account/payments',
      name: 'StripePayoutPage',
      auth: true,
      authPage: 'LoginPage',
      component: StripePayoutPage,
      loadData: pageDataLoadingAPI.StripePayoutPage.loadData,
    },
    {
      path: '/account/payments/:returnURLType',
      name: 'StripePayoutOnboardingPage',
      auth: true,
      authPage: 'LoginPage',
      component: StripePayoutPage,
      loadData: pageDataLoadingAPI.StripePayoutPage.loadData,
    },
    {
      path: '/account/payment-methods',
      name: 'PaymentMethodsPage',
      auth: true,
      authPage: 'LoginPage',
      component: PaymentMethodsPage,
      loadData: pageDataLoadingAPI.PaymentMethodsPage.loadData,
    },
    {
      path: '/account/manage',
      name: 'ManageAccountPage',
      auth: true,
      authPage: 'LoginPage',
      component: ManageAccountPage,
    },
    {
      path: '/privacy-policy',
      name: 'PrivacyPolicyPage',
      component: PrivacyPolicyPage,
      loadData: pageDataLoadingAPI.PrivacyPolicyPage.loadData,
    },
    {
      path: '/styleguide',
      name: 'Styleguide',
      ...authForPrivateMarketplace,
      component: StyleguidePage,
    },
    {
      path: '/styleguide/g/:group',
      name: 'StyleguideGroup',
      ...authForPrivateMarketplace,
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component',
      name: 'StyleguideComponent',
      ...authForPrivateMarketplace,
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component/:example',
      name: 'StyleguideComponentExample',
      ...authForPrivateMarketplace,
      component: StyleguidePage,
    },
    {
      path: '/styleguide/c/:component/:example/raw',
      name: 'StyleguideComponentExampleRaw',
      ...authForPrivateMarketplace,
      component: StyleguidePage,
      extraProps: { raw: true },
    },
    {
      path: '/no-:missingAccessRight',
      name: 'NoAccessPage',
      component: NoAccessPage,
    },
    {
      path: '/notfound',
      name: 'NotFoundPage',
      component: props => <NotFoundPage {...props} />,
    },

    // Do not change this path!
    //
    // The API expects that the application implements /reset-password endpoint
    {
      path: '/reset-password',
      name: 'PasswordResetPage',
      component: PasswordResetPage ,
    },

    // Do not change this path!
    //
    // The API expects that the application implements /verify-email endpoint
    {
      path: '/verify-email',
      name: 'EmailVerificationPage',
      auth: true,
      authPage: 'LoginPage',
      component: EmailVerificationPage,
      loadData: pageDataLoadingAPI.EmailVerificationPage.loadData,
    },
    // Do not change this path!
    //
    // The API expects that the application implements /preview endpoint
    {
      path: '/preview',
      name: 'PreviewResolverPage',
      component: PreviewResolverPage ,
    },
  ];
};

export default routeConfiguration;
