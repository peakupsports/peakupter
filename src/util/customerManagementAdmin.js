import { adminFetch } from './coachApplicationAdmin';

export const CUSTOMER_SORT_IDS = ['name', 'signup', 'bookings', 'activity'];

export const CUSTOMER_SORT_LABEL_IDS = {
  name: 'PeakUpHqCustomerManagement.sortName',
  signup: 'PeakUpHqCustomerManagement.sortSignup',
  bookings: 'PeakUpHqCustomerManagement.sortBookings',
  activity: 'PeakUpHqCustomerManagement.sortActivity',
};

export const CUSTOMER_STATUS_LABEL_IDS = {
  active: 'PeakUpHqCustomerManagement.statusActive',
  inactive: 'PeakUpHqCustomerManagement.statusInactive',
  new: 'PeakUpHqCustomerManagement.statusNew',
  registered: 'PeakUpHqCustomerManagement.statusRegistered',
};

/**
 * @param {{ q?: string }} [params]
 */
export const fetchCustomerManagementAdminList = (params = {}) => {
  const search = new URLSearchParams();
  if (params.q) {
    search.set('q', params.q);
  }
  const qs = search.toString();
  return adminFetch(`/api/customer-management-admin${qs ? `?${qs}` : ''}`);
};
