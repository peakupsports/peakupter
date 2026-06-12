import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storableError } from '../util/errors';
import { repairCoachApplicantProfileThunk, setPostLoginRedirectPending } from './auth.duck';
import { fetchCurrentUser } from './user.duck';

// ================ Async Thunk ================ //

export const verifyEmail = createAsyncThunk(
  'emailVerification/verifyEmail',
  (verificationToken, { dispatch, rejectWithValue, extra: sdk }) => {
    if (!verificationToken) {
      return rejectWithValue(storableError(new Error('Missing verification token')));
    }

    dispatch(setPostLoginRedirectPending());

    return sdk.currentUser
      .verifyEmail({ verificationToken })
      .then(() => {
        // eslint-disable-next-line no-console
        console.log('[PeakUp Verify Success]');
        return dispatch(fetchCurrentUser({ enforce: true }))
          .then(() => dispatch(repairCoachApplicantProfileThunk()))
          .then(() => true);
      })
      .catch(e => {
        // eslint-disable-next-line no-console
        console.log('[PeakUp Verify Failed]', e?.message || e);
        return rejectWithValue(storableError(e));
      });
  },
  {
    condition: (verificationToken, { getState }) => {
      if (!verificationToken) {
        return false;
      }

      const state = getState();
      if (state.emailVerification.verificationInProgress) {
        return false;
      }

      if (state.emailVerification.isVerified) {
        return false;
      }

      const user = state.user?.currentUser;
      if (
        user?.id &&
        user.attributes?.emailVerified &&
        user.attributes?.pendingEmail == null
      ) {
        return false;
      }

      return true;
    },
  }
);

// Backward compatible wrapper for the thunk
export const verify = verificationToken => (dispatch, getState, sdk) => {
  return dispatch(verifyEmail(verificationToken));
};

// ================ Slice ================ //

const emailVerificationSlice = createSlice({
  name: 'emailVerification',
  initialState: {
    isVerified: false,
    verificationError: null,
    verificationInProgress: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(verifyEmail.pending, state => {
        state.verificationInProgress = true;
        state.verificationError = null;
      })
      .addCase(verifyEmail.fulfilled, state => {
        state.verificationInProgress = false;
        state.isVerified = true;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verificationInProgress = false;
        state.verificationError = action.payload;
      });
  },
});

export default emailVerificationSlice.reducer;
