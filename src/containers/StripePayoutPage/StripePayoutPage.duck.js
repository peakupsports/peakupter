import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { pick } from '../../util/common';
import { storableError } from '../../util/errors';
import * as log from '../../util/log';
import {
  createStripeAccount,
  updateStripeAccount,
  fetchStripeAccount,
} from '../../ducks/stripeConnectAccount.duck';
import { fetchCurrentUser } from '../../ducks/user.duck';

const normalizePayoutSaveError = err => {
  if (err && (err.apiErrors || err.type === 'error')) {
    return err;
  }
  return storableError(err);
};

const logPayoutSaveError = (err, isUpdateCall) => {
  const stored = normalizePayoutSaveError(err);
  const stripeMessage = stored.apiErrors?.[0]?.meta?.stripeMessage;
  log.error(err, 'save-payout-details-failed', { isUpdateCall, stripeMessage });
  if (stored.apiErrors?.length) {
    /* eslint-disable no-console */
    console.error('[PeakUp payout] API errors:', stored.apiErrors);
    /* eslint-enable no-console */
  } else if (err?.message) {
    /* eslint-disable no-console */
    console.error('[PeakUp payout]', err.message);
    /* eslint-enable no-console */
  }
  return stored;
};

// ================ Async thunks ================ //

const savePayoutDetailsPayloadCreator = (
  { values, isUpdateCall },
  { dispatch, extra: sdk, rejectWithValue }
) => {
  const upsertThunk = isUpdateCall ? updateStripeAccount : createStripeAccount;

  return dispatch(upsertThunk(values))
    .catch(err => rejectWithValue(logPayoutSaveError(err, isUpdateCall)));
};
export const savePayoutDetailsThunk = createAsyncThunk(
  'StripePayoutPage/savePayoutDetails',
  savePayoutDetailsPayloadCreator
);
// Backward compatible wrapper function
export const savePayoutDetails = (values, isUpdateCall) => async dispatch => {
  try {
    return await dispatch(savePayoutDetailsThunk({ values, isUpdateCall })).unwrap();
  } catch {
    // Errors are surfaced via stripeConnectAccount slice; avoid unhandled rejections.
    return undefined;
  }
};

// ================ Slice ================ //

const initialState = {
  payoutDetailsSaveInProgress: false,
  payoutDetailsSaved: false,
  fromReturnURL: false,
};

const stripePayoutPageSlice = createSlice({
  name: 'StripePayoutPage',
  initialState,
  reducers: {
    setInitialValues: (state, action) => {
      return { ...initialState, ...pick(action.payload, Object.keys(initialState)) };
    },
  },
  extraReducers: builder => {
    builder
      // Save Payout Details cases
      .addCase(savePayoutDetailsThunk.pending, state => {
        state.payoutDetailsSaveInProgress = true;
      })
      .addCase(savePayoutDetailsThunk.fulfilled, state => {
        state.payoutDetailsSaveInProgress = false;
        state.payoutDetailsSaved = true;
      })
      .addCase(savePayoutDetailsThunk.rejected, state => {
        state.payoutDetailsSaveInProgress = false;
      });
  },
});

// Export the action creators
export const { setInitialValues } = stripePayoutPageSlice.actions;

export default stripePayoutPageSlice.reducer;

// ================ Load Data ================ //

export const loadData = () => (dispatch, getState, sdk) => {
  // Clear state so that previously loaded data is not visible
  // in case this page load fails.
  dispatch(setInitialValues());
  const fetchCurrentUserOptions = {
    updateHasListings: false,
    updateNotifications: false,
  };

  return dispatch(fetchCurrentUser(fetchCurrentUserOptions)).then(response => {
    const currentUser = getState().user.currentUser;
    if (currentUser && currentUser.stripeAccount) {
      dispatch(fetchStripeAccount());
    }
    return response;
  });
};
