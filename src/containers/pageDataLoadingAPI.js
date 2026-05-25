/**
 * Export loadData calls from ducks modules of different containers
 */
import { loadData as AboutPageLoader } from './AboutPage/AboutPage.duck';
import { loadData as CoachApplicationPageLoader } from './CoachApplicationPage/CoachApplicationPage.duck';
import { loadData as AdminCoachApplicationsPageLoader } from './AdminCoachApplicationsPage/AdminCoachApplicationsPage.duck';
import { loadData as PeakUpHqDashboardPageLoader } from './PeakUpHq/PeakUpHqDashboardPage/PeakUpHqDashboardPage.duck';
import { loadData as PeakUpHqPlaceholderPageLoader } from './PeakUpHq/PeakUpHqPlaceholderPage/PeakUpHqPlaceholderPage.duck';
import { loadData as PeakUpHqAmbassadorsPageLoader } from './PeakUpHq/PeakUpHqAmbassadorsPage/PeakUpHqAmbassadorsPage.duck';
import { loadData as TermsPageLoader } from './TermsPage/TermsPage.duck';
import { loadData as PrivacyPageLoader } from './PrivacyPage/PrivacyPage.duck';
import { loadData as CookiesPageLoader } from './CookiesPage/CookiesPage.duck';
import { loadData as CancellationPolicyPageLoader } from './CancellationPolicyPage/CancellationPolicyPage.duck';
import { loadData as CoachEarningsPageLoader } from './CoachEarningsPage/CoachEarningsPage.duck';
import { loadData as AmbassadorProgramPageLoader } from './AmbassadorProgramPage/AmbassadorProgramPage.duck';
import { loadData as ReferralCenterPageLoader } from './ReferralCenterPage/ReferralCenterPage.duck';
import { loadData as AuthenticationPageLoader } from './AuthenticationPage/AuthenticationPage.duck';
import { loadData as LandingPageLoader } from './LandingPage/LandingPage.duck';
import { setInitialValues as CheckoutPageInitialValues } from './CheckoutPage/CheckoutPage.duck';
import { loadData as CMSPageLoader } from './CMSPage/CMSPage.duck';
import { loadData as ContactDetailsPageLoader } from './ContactDetailsPage/ContactDetailsPage.duck';
import { loadData as EditListingPageLoader } from './EditListingPage/EditListingPage.duck';
import { loadData as EmailVerificationPageLoader } from './EmailVerificationPage/EmailVerificationPage.duck';
import { loadData as InboxPageLoader } from './InboxPage/InboxPage.duck';
import { loadData as ListingPageLoader } from './ListingPage/ListingPage.duck';
import { loadData as MakeOfferPageLoader } from './MakeOfferPage/MakeOfferPage.duck';
import { loadData as ManageListingsPageLoader } from './ManageListingsPage/ManageListingsPage.duck';
import { loadData as PaymentMethodsPageLoader } from './PaymentMethodsPage/PaymentMethodsPage.duck';
import { loadData as PrivacyPolicyPageLoader } from './PrivacyPolicyPage/PrivacyPolicyPage.duck';
import { loadData as ProfilePageLoader } from './ProfilePage/ProfilePage.duck';
import { loadData as RequestQuotePageLoader } from './RequestQuotePage/RequestQuotePage.duck';
import { loadData as SearchPageLoader } from './SearchPage/SearchPage.duck';
import { loadData as CoachesExplorePageLoader } from './CoachesExplorePage/CoachesExplorePage.duck';
import { loadData as StripePayoutPageLoader } from './StripePayoutPage/StripePayoutPage.duck';
import {
  loadData as TransactionPageLoader,
  setInitialValues as TransactionPageInitialValues,
} from './TransactionPage/TransactionPage.duck';

const getPageDataLoadingAPI = () => {
  return {
    AboutPage: {
      loadData: AboutPageLoader,
    },
    CoachApplicationPage: {
      loadData: CoachApplicationPageLoader,
    },
    AdminCoachApplicationsPage: {
      loadData: AdminCoachApplicationsPageLoader,
    },
    PeakUpHQPage: {
      loadData: PeakUpHqDashboardPageLoader,
    },
    PeakUpHqFeaturedCoachesPage: {
      loadData: PeakUpHqPlaceholderPageLoader,
    },
    PeakUpHqAmbassadorsPage: {
      loadData: PeakUpHqAmbassadorsPageLoader,
    },
    PeakUpHqVerificationPage: {
      loadData: PeakUpHqPlaceholderPageLoader,
    },
    PeakUpHqReportsPage: {
      loadData: PeakUpHqPlaceholderPageLoader,
    },
    PeakUpHqPaymentsPage: {
      loadData: PeakUpHqPlaceholderPageLoader,
    },
    PeakUpHqActivityPage: {
      loadData: PeakUpHqPlaceholderPageLoader,
    },
    TermsPage: {
      loadData: TermsPageLoader,
    },
    PrivacyPage: {
      loadData: PrivacyPageLoader,
    },
    CookiesPage: {
      loadData: CookiesPageLoader,
    },
    CancellationPolicyPage: {
      loadData: CancellationPolicyPageLoader,
    },
    CoachEarningsPage: {
      loadData: CoachEarningsPageLoader,
    },
    AmbassadorProgramPage: {
      loadData: AmbassadorProgramPageLoader,
    },
    ReferralCenterPage: {
      loadData: ReferralCenterPageLoader,
    },
    AuthenticationPage: {
      loadData: AuthenticationPageLoader,
    },
    LandingPage: {
      loadData: LandingPageLoader,
    },
    CheckoutPage: {
      setInitialValues: CheckoutPageInitialValues,
    },
    CMSPage: {
      loadData: CMSPageLoader,
    },
    ContactDetailsPage: {
      loadData: ContactDetailsPageLoader,
    },
    EditListingPage: {
      loadData: EditListingPageLoader,
    },
    EmailVerificationPage: {
      loadData: EmailVerificationPageLoader,
    },
    InboxPage: {
      loadData: InboxPageLoader,
    },
    ListingPage: {
      loadData: ListingPageLoader,
    },
    MakeOfferPage: {
      loadData: MakeOfferPageLoader,
    },
    ManageListingsPage: {
      loadData: ManageListingsPageLoader,
    },
    PaymentMethodsPage: {
      loadData: PaymentMethodsPageLoader,
    },
    PrivacyPolicyPage: {
      loadData: PrivacyPolicyPageLoader,
    },
    ProfilePage: {
      loadData: ProfilePageLoader,
    },
    RequestQuotePage: {
      loadData: RequestQuotePageLoader,
    },
    SearchPage: {
      loadData: SearchPageLoader,
    },
    CoachesExplorePage: {
      loadData: CoachesExplorePageLoader,
    },
    StripePayoutPage: {
      loadData: StripePayoutPageLoader,
    },
    TransactionPage: {
      loadData: TransactionPageLoader,
      setInitialValues: TransactionPageInitialValues,
    },
  };
};

export default getPageDataLoadingAPI;
