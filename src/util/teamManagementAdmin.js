import { adminFetch } from './coachApplicationAdmin';

export const TEAM_SORT_IDS = ['name', 'signup', 'coaches', 'sport'];

export const TEAM_SORT_LABEL_IDS = {
  name: 'PeakUpHqTeamManagement.sortName',
  signup: 'PeakUpHqTeamManagement.sortSignup',
  coaches: 'PeakUpHqTeamManagement.sortCoaches',
  sport: 'PeakUpHqTeamManagement.sortSport',
};

export const TEAM_STATUS_LABEL_IDS = {
  verified_public: 'PeakUpHqTeamManagement.statusVerifiedPublic',
  verified_draft: 'PeakUpHqTeamManagement.statusVerifiedDraft',
  unverified: 'PeakUpHqTeamManagement.statusUnverified',
  application_pending: 'PeakUpHqTeamManagement.statusApplicationPending',
  application_need_more_info: 'PeakUpHqTeamManagement.statusApplicationNeedMoreInfo',
};

export const ROSTER_STATUS_LABEL_IDS = {
  member: 'PeakUpHqTeamManagement.rosterMember',
  invited: 'PeakUpHqTeamManagement.rosterInvited',
};

/**
 * @param {{ q?: string, sport?: string }} [params]
 */
export const fetchTeamManagementAdminList = (params = {}) => {
  const search = new URLSearchParams();
  if (params.q) {
    search.set('q', params.q);
  }
  if (params.sport) {
    search.set('sport', params.sport);
  }
  const qs = search.toString();
  return adminFetch(`/api/team-management-admin${qs ? `?${qs}` : ''}`);
};
