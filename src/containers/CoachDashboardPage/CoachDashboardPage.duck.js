import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError } from '../../util/errors';
import { refreshInboxNotifications } from '../../ducks/user.duck';
import {
  countUpcomingCoachSessions,
  fetchAllCoachSalesBookings,
} from '../CoachCalendarPage/coachCalendarBookings';
import { segmentBookingDashboardTransactions } from '../../util/peakupBookingDashboard';

const emptySegments = () => ({
  upcoming: [],
  past: [],
  pendingReview: [],
  pending: [],
  canceled: [],
});

const fetchDashboardStatsPayloadCreator = async (_, { extra: sdk, dispatch, rejectWithValue }) => {
  try {
    const [listingsResponse, salesTransactions] = await Promise.all([
      sdk.ownListings.query({ states: 'published', perPage: 1, page: 1 }),
      fetchAllCoachSalesBookings(sdk, dispatch),
    ]);

    const segments = segmentBookingDashboardTransactions(salesTransactions, 'provider');
    const operationalSales = Object.values(segments).flatMap(section =>
      section.map(entry => entry.transaction)
    );
    const upcomingSessionsCount = countUpcomingCoachSessions(operationalSales);

    return {
      activeListingsCount: listingsResponse?.data?.meta?.totalItems ?? 0,
      upcomingSessionsCount,
      salesTransactionsCount: operationalSales.length,
      segments,
    };
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const fetchDashboardStatsThunk = createAsyncThunk(
  'CoachDashboardPage/fetchStats',
  fetchDashboardStatsPayloadCreator
);

const coachDashboardSlice = createSlice({
  name: 'CoachDashboardPage',
  initialState: {
    activeListingsCount: null,
    upcomingSessionsCount: null,
    salesTransactionsCount: null,
    segments: emptySegments(),
    statsFetchInProgress: false,
    statsError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchDashboardStatsThunk.pending, state => {
        state.statsError = null;
        state.statsFetchInProgress = true;
      })
      .addCase(fetchDashboardStatsThunk.fulfilled, (state, action) => {
        state.statsFetchInProgress = false;
        state.activeListingsCount = action.payload.activeListingsCount;
        state.upcomingSessionsCount = action.payload.upcomingSessionsCount;
        state.salesTransactionsCount = action.payload.salesTransactionsCount;
        state.segments = action.payload.segments;
      })
      .addCase(fetchDashboardStatsThunk.rejected, (state, action) => {
        state.statsFetchInProgress = false;
        state.statsError = action.payload;
      });
  },
});

export const loadData = () => dispatch => {
  return Promise.all([
    dispatch(refreshInboxNotifications()),
    dispatch(fetchDashboardStatsThunk()).unwrap().catch(() => null),
  ]);
};

export default coachDashboardSlice.reducer;
