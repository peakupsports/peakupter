import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { fetchMyTeamInvites, respondToTeamInvite } from '../../util/api';
import { storableError } from '../../util/errors';
import {
  logTeamInvitationInboxEvent,
  markTeamInvitationReadAt,
  TEAM_INVITATION_THREAD_TYPE,
} from '../../util/teamInvitationInbox';
import { fetchCurrentUserNotifications } from '../../ducks/user.duck';

const loadInvitePayloadCreator = async ({ teamId }, { rejectWithValue }) => {
  try {
    const res = await fetchMyTeamInvites();
    const invites = Array.isArray(res?.invites) ? res.invites : [];
    const invite = invites.find(item => String(item?.teamId) === String(teamId)) || null;
    if (!invite) {
      return rejectWithValue({ message: 'Invitation not found.', status: 404 });
    }
    return { invite };
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const loadTeamInvitationInboxPageData = createAsyncThunk(
  'TeamInvitationInboxPage/loadInvite',
  loadInvitePayloadCreator
);

const respondPayloadCreator = async ({ teamId, action }, { dispatch, rejectWithValue }) => {
  try {
    await respondToTeamInvite({ teamId, action });
    logTeamInvitationInboxEvent({
      threadType: TEAM_INVITATION_THREAD_TYPE,
      teamId,
      action,
    });
    dispatch(fetchCurrentUserNotifications());
    return { teamId, action };
  } catch (e) {
    return rejectWithValue(storableError(e));
  }
};

export const respondToTeamInvitationThunk = createAsyncThunk(
  'TeamInvitationInboxPage/respond',
  respondPayloadCreator
);

const teamInvitationInboxPageSlice = createSlice({
  name: 'TeamInvitationInboxPage',
  initialState: {
    invite: null,
    fetchInProgress: false,
    fetchError: null,
    respondInProgress: false,
    respondError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadTeamInvitationInboxPageData.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(loadTeamInvitationInboxPageData.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.invite = action.payload.invite;
      })
      .addCase(loadTeamInvitationInboxPageData.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
        state.invite = null;
      })
      .addCase(respondToTeamInvitationThunk.pending, state => {
        state.respondInProgress = true;
        state.respondError = null;
      })
      .addCase(respondToTeamInvitationThunk.fulfilled, state => {
        state.respondInProgress = false;
        state.invite = null;
      })
      .addCase(respondToTeamInvitationThunk.rejected, (state, action) => {
        state.respondInProgress = false;
        state.respondError = action.payload;
      });
  },
});

export default teamInvitationInboxPageSlice.reducer;

export const loadData = params => (dispatch, getState) => {
  const teamId = params?.teamId;
  const currentUserId = getState().user?.currentUser?.id?.uuid;
  if (currentUserId && teamId) {
    markTeamInvitationReadAt(currentUserId, teamId);
    dispatch(fetchCurrentUserNotifications());
  }
  return dispatch(loadTeamInvitationInboxPageData({ teamId })).unwrap().catch(() => null);
};

export const markTeamInvitationThreadRead = (userId, teamId) => dispatch => {
  if (!userId || !teamId) {
    return null;
  }
  markTeamInvitationReadAt(userId, teamId);
  return dispatch(fetchCurrentUserNotifications());
};
