import { createRoleDashboardSlice } from '../../util/peakupRoleDashboard.duck';
import { refreshInboxNotifications } from '../../ducks/user.duck';

const { reducer, loadData: loadSegments } = createRoleDashboardSlice(
  'TeamDashboardBookingsPage',
  'sale',
  'provider'
);

export const loadData = () => dispatch =>
  Promise.all([dispatch(refreshInboxNotifications()), dispatch(loadSegments())]);

export default reducer;
