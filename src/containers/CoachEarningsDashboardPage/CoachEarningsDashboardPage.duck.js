import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError } from '../../util/errors';
import { fetchAllCoachSalesBookings } from '../CoachCalendarPage/coachCalendarBookings';
import {
  deriveCoachEarningsFromSalesTransactions,
  PLACEHOLDER_EARNINGS_DASHBOARD,
} from './coachEarningsDashboardData';

const fetchCoachEarningsPayloadCreator = async (_, { extra: sdk, dispatch, rejectWithValue }) => {
  try {
    const [listingsResponse, salesTransactions] = await Promise.all([
      sdk.ownListings.query({ states: 'published', perPage: 1, page: 1 }),
      fetchAllCoachSalesBookings(sdk, dispatch),
    ]);
    const earnings = deriveCoachEarningsFromSalesTransactions(salesTransactions);

    return {
      ...earnings,
      activeListingsCount: listingsResponse?.data?.meta?.totalItems ?? 0,
    };
  } catch (error) {
    return rejectWithValue(storableError(error));
  }
};

export const fetchCoachEarningsDashboardThunk = createAsyncThunk(
  'CoachEarningsDashboardPage/fetchEarnings',
  fetchCoachEarningsPayloadCreator
);

const coachEarningsDashboardSlice = createSlice({
  name: 'CoachEarningsDashboardPage',
  initialState: {
    overview: PLACEHOLDER_EARNINGS_DASHBOARD.overview,
    transactions: [],
    activeListingsCount: null,
    fetchInProgress: false,
    fetchError: null,
    hasLoaded: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchCoachEarningsDashboardThunk.pending, state => {
        state.fetchError = null;
        state.fetchInProgress = true;
      })
      .addCase(fetchCoachEarningsDashboardThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.hasLoaded = true;
        state.overview = action.payload.overview;
        state.transactions = action.payload.transactions;
        state.activeListingsCount = action.payload.activeListingsCount;
      })
      .addCase(fetchCoachEarningsDashboardThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.hasLoaded = true;
        state.fetchError = action.payload;
      });
  },
});

export const loadData = () => dispatch =>
  dispatch(fetchCoachEarningsDashboardThunk()).unwrap().catch(() => null);

export default coachEarningsDashboardSlice.reducer;
