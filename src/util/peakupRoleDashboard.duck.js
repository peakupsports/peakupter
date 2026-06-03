import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError } from './errors';
import {
  fetchAllDashboardTransactions,
  normalizeBookingDashboardSegmentsForDisplay,
  segmentBookingDashboardTransactions,
} from './peakupBookingDashboard';

const emptySegments = () => ({
  upcoming: [],
  multiDayExperiences: [],
  past: [],
  pendingReview: [],
  pending: [],
  canceled: [],
});

/**
 * @param {string} sliceName
 * @param {'order'|'sale'} only
 * @param {'customer'|'provider'} role
 * @param {{ fetchTransactions?: Function }} [options]
 */
export const createRoleDashboardSlice = (sliceName, only, role, options = {}) => {
  const fetchTransactions =
    options.fetchTransactions ||
    ((sdk, dispatch) => fetchAllDashboardTransactions(sdk, dispatch, { only }));

  const fetchSegmentsThunk = createAsyncThunk(
    `${sliceName}/fetchSegments`,
    async (_, { extra: sdk, dispatch, rejectWithValue }) => {
      try {
        const transactions = await fetchTransactions(sdk, dispatch);
        return segmentBookingDashboardTransactions(transactions, role);
      } catch (e) {
        return rejectWithValue(storableError(e));
      }
    }
  );

  const slice = createSlice({
    name: sliceName,
    initialState: {
      segments: emptySegments(),
      fetchInProgress: false,
      fetchError: null,
    },
    reducers: {},
    extraReducers: builder => {
      builder
        .addCase(fetchSegmentsThunk.pending, state => {
          state.fetchInProgress = true;
          state.fetchError = null;
        })
        .addCase(fetchSegmentsThunk.fulfilled, (state, action) => {
          state.fetchInProgress = false;
          state.segments = normalizeBookingDashboardSegmentsForDisplay(action.payload);
        })
        .addCase(fetchSegmentsThunk.rejected, (state, action) => {
          state.fetchInProgress = false;
          state.fetchError = action.payload;
        });
    },
  });

  const loadData = () => dispatch => dispatch(fetchSegmentsThunk());

  return {
    reducer: slice.reducer,
    fetchSegmentsThunk,
    loadData,
  };
};
