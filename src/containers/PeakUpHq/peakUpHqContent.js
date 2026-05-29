/**
 * PeakUp HQ navigation and dashboard section registry.
 * Grouped for the three core user hubs + operational workflows.
 */

const coreHub = (id, routeName, icon, titleId, descriptionId) => ({
  id,
  routeName,
  icon,
  titleId,
  descriptionId,
  live: true,
  group: 'core',
});

const workflowSection = (id, routeName, icon, titleId, descriptionId, live = true) => ({
  id,
  routeName,
  icon,
  titleId,
  descriptionId,
  live,
  group: 'workflows',
});

const platformSection = (id, routeName, icon, titleId, descriptionId, live = false) => ({
  id,
  routeName,
  icon,
  titleId,
  descriptionId,
  live,
  group: 'platform',
});

export const PEAKUP_HQ_NAV_GROUPS = [
  {
    id: 'core',
    labelId: 'PeakUpHq.nav.group.core',
    sections: [
      coreHub(
        'coach-management',
        'PeakUpHqCoachManagementPage',
        'coaches',
        'PeakUpHq.section.coachManagement.title',
        'PeakUpHq.section.coachManagement.description'
      ),
      coreHub(
        'customer-management',
        'PeakUpHqCustomerManagementPage',
        'customers',
        'PeakUpHq.section.customerManagement.title',
        'PeakUpHq.section.customerManagement.description'
      ),
      coreHub(
        'team-management',
        'PeakUpHqTeamManagementPage',
        'teams',
        'PeakUpHq.section.teamManagement.title',
        'PeakUpHq.section.teamManagement.description'
      ),
    ],
  },
  {
    id: 'workflows',
    labelId: 'PeakUpHq.nav.group.workflows',
    sections: [
      workflowSection(
        'coach-applications',
        'AdminCoachApplicationsPage',
        'applications',
        'PeakUpHq.section.coachApplications.title',
        'PeakUpHq.section.coachApplications.description'
      ),
      workflowSection(
        'team-applications',
        'AdminTeamApplicationsPage',
        'applications',
        'PeakUpHq.section.teamApplications.title',
        'PeakUpHq.section.teamApplications.description'
      ),
      workflowSection(
        'ambassadors',
        'PeakUpHqAmbassadorsPage',
        'ambassadors',
        'PeakUpHq.section.ambassadors.title',
        'PeakUpHq.section.ambassadors.description'
      ),
      workflowSection(
        'cancellation-center',
        'PeakUpHqCancellationCenterPage',
        'cancellations',
        'PeakUpHq.section.cancellations.title',
        'PeakUpHq.section.cancellations.description'
      ),
    ],
  },
  {
    id: 'platform',
    labelId: 'PeakUpHq.nav.group.platform',
    sections: [
      platformSection(
        'verification',
        'PeakUpHqVerificationPage',
        'verification',
        'PeakUpHq.section.verification.title',
        'PeakUpHq.section.verification.description'
      ),
      platformSection(
        'reports',
        'PeakUpHqReportsPage',
        'reports',
        'PeakUpHq.section.reports.title',
        'PeakUpHq.section.reports.description'
      ),
      platformSection(
        'payments',
        'PeakUpHqPaymentsPage',
        'payments',
        'PeakUpHq.section.payments.title',
        'PeakUpHq.section.payments.description'
      ),
      platformSection(
        'activity',
        'PeakUpHqActivityPage',
        'activity',
        'PeakUpHq.section.activity.title',
        'PeakUpHq.section.activity.description'
      ),
    ],
  },
];

/** Flat list — backwards compatible with existing imports. */
export const PEAKUP_HQ_SECTIONS = PEAKUP_HQ_NAV_GROUPS.flatMap(group => group.sections);

export const getPeakUpHqSectionByRouteName = routeName =>
  PEAKUP_HQ_SECTIONS.find(section => section.routeName === routeName);

export const getPeakUpHqSectionById = id => PEAKUP_HQ_SECTIONS.find(section => section.id === id);
