import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as log from '../util/log';
import { getAuthErrorMessage, logSignupError, storableError } from '../util/errors';
import { clearCurrentUser, fetchCurrentUser } from './user.duck';
import { createUserWithIdp } from '../util/api';
import {
  clearStalePostLoginRedirectStorage,
  ensureCoachApplicantProfilePayload,
  getCoachApplicantProfileRepairPayload,
  getCoachOnboardingProfilePublicData,
  isCustomerOrTeamProfile,
  readCoachOnboardingIntent,
} from '../util/coachOnboarding';

const authenticated = authInfo => authInfo?.isAnonymous === false;
const loggedInAs = authInfo => authInfo?.isLoggedInAs === true;

// ================ Initial State ================ //

const initialState = {
  isAuthenticated: false,

  // is marketplace operator logged in as a marketplace user
  isLoggedInAs: false,

  // scopes associated with current token
  authScopes: [],

  // auth info
  authInfoLoaded: false,

  // login
  loginError: null,
  loginInProgress: false,

  // logout
  logoutError: null,
  logoutInProgress: false,

  // signup
  signupError: null,
  signupInProgress: false,

  // confirm (create use with idp)
  confirmError: null,
  confirmInProgress: false,

  // Blocks LandingPage until post-login redirect completes (login/signup/IdP confirm).
  postLoginRedirectPending: false,
};

// ================ Async Thunks ================ //

const authInfoThunk = createAsyncThunk('auth/authInfo', (_, thunkAPI) => {
  const { extra: sdk } = thunkAPI;
  return sdk.authInfo().catch(e => {
    // Requesting auth info just reads the token from the token
    // store (i.e. cookies), and should not fail in normal
    // circumstances. If it fails, it's due to a programming
    // error. In that case we mark the operation done and dispatch
    // `null` success action that marks the user as unauthenticated.
    log.error(e, 'auth-info-failed');
    return null;
  });
});

const loginThunk = createAsyncThunk(
  'auth/login',
  ({ username, password }, thunkAPI) => {
    const { rejectWithValue, extra: sdk, dispatch } = thunkAPI;

    return sdk
      .login({ username, password })
      .then(() => dispatch(fetchCurrentUser({ afterLogin: true })))
      .then(() => dispatch(repairCoachApplicantProfileThunk()))
      .then(() => ({ username, password }))
      .catch(e => rejectWithValue(storableError(e)));
  },
  {
    condition: (_, { getState }) => {
      const state = getState();
      if (authenticationInProgress(state, 'loginInProgress')) {
        return false;
      }
    },
  }
);

const logoutThunk = createAsyncThunk(
  'auth/logout',
  (_, thunkAPI) => {
    const { rejectWithValue, extra: sdk, dispatch } = thunkAPI;

    return sdk
      .logout()
      .then(() => {
        dispatch(clearCurrentUser());
        log.clearUserId();
        return true;
      })
      .catch(e => rejectWithValue(storableError(e)));
  },
  {
    condition: (_, { getState }) => {
      const state = getState();
      if (authenticationInProgress(state, 'logoutInProgress')) {
        return false;
      }
    },
  }
);

const repairCoachApplicantProfileThunk = createAsyncThunk(
  'auth/repairCoachApplicantProfile',
  async (options, thunkAPI) => {
    const { extra: sdk, dispatch, getState } = thunkAPI;
    const currentUser = getState().user?.currentUser;

    if (isCustomerOrTeamProfile(currentUser)) {
      // eslint-disable-next-line no-console
      console.log('[PeakUp Coach Profile Repair SKIPPED]', {
        reason: 'customer-or-team-profile',
        profilePublicData: getCoachOnboardingProfilePublicData(currentUser),
        localStorageIntent: readCoachOnboardingIntent(),
      });
      return null;
    }

    const repairPayload =
      getCoachApplicantProfileRepairPayload(currentUser) ||
      ensureCoachApplicantProfilePayload(currentUser, options?.ref);
    if (!repairPayload) {
      return null;
    }

    // eslint-disable-next-line no-console
    console.log('[PeakUp Coach Profile Repair BEFORE updateProfile]', {
      repairPublicData: repairPayload,
      profilePublicDataBefore: getCoachOnboardingProfilePublicData(currentUser),
      localStorageIntent: readCoachOnboardingIntent(),
    });

    try {
      await sdk.currentUser.updateProfile({ publicData: repairPayload });
      await dispatch(fetchCurrentUser({ enforce: true }));
      // eslint-disable-next-line no-console
      console.log('[PeakUp Coach Profile Repair]', repairPayload);
      return repairPayload;
    } catch (e) {
      log.error(e, 'coach-applicant-profile-repair-failed');
      return null;
    }
  }
);

const applyCoachOnboardingProfileMaybe = (sdk, dispatch, coachOnboardingPublicData, email) => {
  if (!coachOnboardingPublicData || Object.keys(coachOnboardingPublicData).length === 0) {
    return Promise.resolve();
  }

  return sdk.currentUser
    .updateProfile({ publicData: coachOnboardingPublicData })
    .then(() => dispatch(fetchCurrentUser({ enforce: true })))
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('[PeakUp SIGNUP INTENT]', {
        phase: 'coach-profile-update-success',
        email,
        coachOnboardingPublicData,
        ambassadorRef: coachOnboardingPublicData?.ambassadorRef || null,
      });
    })
    .catch(profileError => {
      logSignupError(profileError, {
        phase: 'coach-profile-update-after-signup',
        email,
      });
      return null;
    });
};

const signupThunk = createAsyncThunk(
  'auth/signup',
  (params, thunkAPI) => {
    const { rejectWithValue, extra: sdk, dispatch } = thunkAPI;
    const { coachOnboardingPublicData, activeSignupPath, ...createParams } = params;
    const shouldMergeCoachPublicData =
      activeSignupPath === 'coach' &&
      coachOnboardingPublicData &&
      Object.keys(coachOnboardingPublicData).length > 0;
    const createParamsWithOnboarding = shouldMergeCoachPublicData
      ? {
          ...createParams,
          publicData: {
            ...(createParams.publicData || {}),
            ...coachOnboardingPublicData,
          },
        }
      : createParams;

    const localStorageIntent = readCoachOnboardingIntent();

    // eslint-disable-next-line no-console
    console.log('[PeakUp SHARETRIBE CREATE — FINAL PAYLOAD]', {
      activeSignupPath: activeSignupPath || null,
      coachOnboardingPublicData: coachOnboardingPublicData || null,
      coachOnboardingPublicDataIsNull: coachOnboardingPublicData == null,
      shouldMergeCoachPublicData,
      localStorageIntent,
      formPublicData: createParams.publicData || null,
      finalPublicDataSentToSharetribe: createParamsWithOnboarding.publicData || null,
      email: createParams.email,
    });

    return sdk.currentUser
      .create(createParamsWithOnboarding)
      .then(() =>
        dispatch(loginThunk({ username: createParams.email, password: createParams.password })).unwrap()
      )
      .then(() =>
        shouldMergeCoachPublicData
          ? applyCoachOnboardingProfileMaybe(
              sdk,
              dispatch,
              coachOnboardingPublicData,
              createParams.email
            )
          : null
      )
      .then(() => {
        if (shouldMergeCoachPublicData) {
          return dispatch(repairCoachApplicantProfileThunk());
        }
        clearStalePostLoginRedirectStorage();
        return null;
      })
      .then(() => params)
      .catch(e => {
        logSignupError(e, {
          phase: 'signup-create-or-login',
          email: createParams.email,
          firstName: createParams.firstName,
          lastName: createParams.lastName,
        });
        log.error(e, 'signup-failed', {
          email: createParams.email,
          firstName: createParams.firstName,
          lastName: createParams.lastName,
        });
        return rejectWithValue(storableError(e));
      });
  },
  {
    condition: (_, { getState }) => {
      const state = getState();
      if (authenticationInProgress(state, 'signupInProgress')) {
        return false;
      }
    },
  }
);

const signupWithIdpThunk = createAsyncThunk(
  'auth/signupWithIdp',
  (params, thunkAPI) => {
    const { rejectWithValue, extra: sdk, dispatch } = thunkAPI;
    const { coachOnboardingPublicData, ...idpParams } = params;
    const idpParamsWithCoach =
      coachOnboardingPublicData && Object.keys(coachOnboardingPublicData).length > 0
        ? {
            ...idpParams,
            publicData: {
              ...(idpParams.publicData || {}),
              ...coachOnboardingPublicData,
            },
          }
        : idpParams;

    return createUserWithIdp(idpParamsWithCoach)
      .then(() => dispatch(fetchCurrentUser({ afterLogin: true })))
      .then(() =>
        applyCoachOnboardingProfileMaybe(
          sdk,
          dispatch,
          coachOnboardingPublicData,
          idpParams.email || null
        )
      )
      .then(() => dispatch(repairCoachApplicantProfileThunk()))
      .then(() => params)
      .catch(e => {
        log.error(e, 'create-user-with-idp-failed', { params });
        return rejectWithValue(storableError(e));
      });
  },
  {
    condition: (_, { getState }) => {
      const state = getState();
      if (authenticationInProgress(state, 'confirmInProgress')) {
        return false;
      }
    },
  }
);

// ================ Slice ================ //

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearPostLoginRedirectPending: state => {
      state.postLoginRedirectPending = false;
    },
    setPostLoginRedirectPending: state => {
      state.postLoginRedirectPending = true;
    },
  },
  extraReducers: builder => {
    // Auth Info
    builder.addCase(authInfoThunk.fulfilled, (state, action) => {
      const payload = action.payload;
      state.authInfoLoaded = true;
      state.isAuthenticated = authenticated(payload);
      state.isLoggedInAs = loggedInAs(payload);
      state.authScopes = payload?.scopes || [];
    });

    // Login
    builder
      .addCase(loginThunk.pending, state => {
        state.loginInProgress = true;
        state.postLoginRedirectPending = true;
        state.loginError = null;
        state.logoutError = null;
        state.signupError = null;
      })
      .addCase(loginThunk.fulfilled, state => {
        state.loginInProgress = false;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loginInProgress = false;
        state.postLoginRedirectPending = false;
        state.loginError = getAuthErrorMessage(action.payload);
      });

    // Logout
    builder
      .addCase(logoutThunk.pending, state => {
        state.logoutInProgress = true;
        state.loginError = null;
        state.logoutError = null;
      })
      .addCase(logoutThunk.fulfilled, state => {
        state.logoutInProgress = false;
        state.isAuthenticated = false;
        state.isLoggedInAs = false;
        state.authScopes = [];
        state.postLoginRedirectPending = false;
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.logoutInProgress = false;
        state.logoutError = action.payload;
      });

    // Signup
    builder
      .addCase(signupThunk.pending, state => {
        state.signupInProgress = true;
        state.postLoginRedirectPending = true;
        state.loginError = null;
        state.signupError = null;
      })
      .addCase(signupThunk.fulfilled, state => {
        state.signupInProgress = false;
      })
      .addCase(signupThunk.rejected, (state, action) => {
        state.signupInProgress = false;
        state.postLoginRedirectPending = false;
        state.signupError = action.payload;
      });

    // Signup with IDP (Confirm)
    builder
      .addCase(signupWithIdpThunk.pending, state => {
        state.confirmInProgress = true;
        state.postLoginRedirectPending = true;
        state.loginError = null;
        state.confirmError = null;
      })
      .addCase(signupWithIdpThunk.fulfilled, state => {
        state.confirmInProgress = false;
        state.isAuthenticated = true;
      })
      .addCase(signupWithIdpThunk.rejected, (state, action) => {
        state.confirmInProgress = false;
        state.postLoginRedirectPending = false;
        state.confirmError = action.payload;
      });
  },
});

export { logoutThunk, repairCoachApplicantProfileThunk };
export const { clearPostLoginRedirectPending, setPostLoginRedirectPending } = authSlice.actions;
export default authSlice.reducer;

// ================ Selectors ================ //

export const authenticationInProgress = (state, nextInProgress = 'any') => {
  const { loginInProgress, logoutInProgress, signupInProgress, confirmInProgress } = state.auth;
  const anyInProgress =
    loginInProgress || logoutInProgress || signupInProgress || confirmInProgress;
  return nextInProgress === 'loginInProgress'
    ? loginInProgress || logoutInProgress || confirmInProgress
    : anyInProgress;
};

// ================ Thunk Wrappers ================ //
// These maintain the same API as the original thunks

export const login = (username, password) => dispatch => {
  return dispatch(loginThunk({ username, password }));
};

export const logout = () => dispatch => {
  return dispatch(logoutThunk()).unwrap();
};

export const signup = params => dispatch => {
  return dispatch(signupThunk(params));
};

export const signupWithIdp = params => dispatch => {
  return dispatch(signupWithIdpThunk(params)).unwrap();
};

export const authInfo = () => dispatch => {
  return dispatch(authInfoThunk()).unwrap();
};
