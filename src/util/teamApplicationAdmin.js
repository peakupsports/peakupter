import { adminFetch } from './coachApplicationAdmin';

export {
  APPLICATION_STATUSES,
  STATUS_LABEL_IDS,
  getStoredAdminToken,
  setStoredAdminToken,
} from './coachApplicationAdmin';

export const fetchTeamApplicationsList = () =>
  adminFetch('/api/team-applications').then(data => data.applications || []);

export const fetchTeamApplicationDetail = id =>
  adminFetch(`/api/team-applications/${id}`).then(data => data.application);

export const patchTeamApplicationStatus = (id, status) =>
  adminFetch(`/api/team-applications/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).then(data => data.application);
