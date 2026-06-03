import { createRoleDashboardSlice } from '../../util/peakupRoleDashboard.duck';
import { refreshInboxNotifications } from '../../ducks/user.duck';
import { fetchAllCoachSalesBookings } from '../CoachCalendarPage/coachCalendarBookings';

const { reducer, loadData: loadSegments } = createRoleDashboardSlice(
  'CoachDashboardBookingsPage',
  'sale',
  'provider',
  {
    fetchTransactions: (sdk, dispatch) => fetchAllCoachSalesBookings(sdk, dispatch),
  }
);

export const loadData = () => dispatch =>
  Promise.all([dispatch(refreshInboxNotifications()), dispatch(loadSegments())]);

export default reducer;
