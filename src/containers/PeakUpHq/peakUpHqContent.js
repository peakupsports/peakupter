/**
 * PeakUp HQ navigation and dashboard section registry.
 * Extend this list when new admin tools ship.
 */

export const PEAKUP_HQ_SECTIONS = [
  {
    id: 'coach-applications',
    routeName: 'AdminCoachApplicationsPage',
    icon: 'applications',
    titleId: 'PeakUpHq.section.coachApplications.title',
    descriptionId: 'PeakUpHq.section.coachApplications.description',
    live: true,
  },
  {
    id: 'featured-coaches',
    routeName: 'PeakUpHqFeaturedCoachesPage',
    icon: 'featured',
    titleId: 'PeakUpHq.section.featuredCoaches.title',
    descriptionId: 'PeakUpHq.section.featuredCoaches.description',
    live: false,
  },
  {
    id: 'cancellation-center',
    routeName: 'PeakUpHqCancellationCenterPage',
    icon: 'cancellations',
    titleId: 'PeakUpHq.section.cancellations.title',
    descriptionId: 'PeakUpHq.section.cancellations.description',
    live: true,
  },
  {
    id: 'ambassadors',
    routeName: 'PeakUpHqAmbassadorsPage',
    icon: 'ambassadors',
    titleId: 'PeakUpHq.section.ambassadors.title',
    descriptionId: 'PeakUpHq.section.ambassadors.description',
    live: true,
  },
  {
    id: 'verification',
    routeName: 'PeakUpHqVerificationPage',
    icon: 'verification',
    titleId: 'PeakUpHq.section.verification.title',
    descriptionId: 'PeakUpHq.section.verification.description',
    live: false,
  },
  {
    id: 'reports',
    routeName: 'PeakUpHqReportsPage',
    icon: 'reports',
    titleId: 'PeakUpHq.section.reports.title',
    descriptionId: 'PeakUpHq.section.reports.description',
    live: false,
  },
  {
    id: 'payments',
    routeName: 'PeakUpHqPaymentsPage',
    icon: 'payments',
    titleId: 'PeakUpHq.section.payments.title',
    descriptionId: 'PeakUpHq.section.payments.description',
    live: false,
  },
  {
    id: 'activity',
    routeName: 'PeakUpHqActivityPage',
    icon: 'activity',
    titleId: 'PeakUpHq.section.activity.title',
    descriptionId: 'PeakUpHq.section.activity.description',
    live: false,
  },
];

export const getPeakUpHqSectionByRouteName = routeName =>
  PEAKUP_HQ_SECTIONS.find(section => section.routeName === routeName);

export const getPeakUpHqSectionById = id => PEAKUP_HQ_SECTIONS.find(section => section.id === id);
