import { createAsyncThunk } from '@reduxjs/toolkit';

import { denormalisedResponseEntities } from '../util/data';
import { storableError } from '../util/errors';
import {
  buildPrivateDataWithArchivedIds,
  getArchivedConversationIds,
  hasIncomingMessageFromOtherParty,
  isTransactionArchived,
  normalizeTransactionUuid,
} from '../util/archivedConversations';

import { fetchCurrentUserNotifications, setCurrentUser } from './user.duck';

const updateProfileQueryParams = {
  expand: true,
  include: ['profileImage'],
  'fields.image': ['variants.square-small', 'variants.square-small2x'],
};

const updateArchivedConversationIds = (currentUser, nextIds, sdk) => {
  return sdk.currentUser
    .updateProfile(
      { privateData: buildPrivateDataWithArchivedIds(currentUser, nextIds) },
      updateProfileQueryParams
    )
    .then(response => {
      const entities = denormalisedResponseEntities(response);
      if (entities.length !== 1) {
        throw new Error('Expected a resource in the sdk.currentUser.updateProfile response');
      }
      return entities[0];
    });
};

export const archiveConversationThunk = createAsyncThunk(
  'archivedConversations/archiveConversation',
  async ({ transactionId }, { getState, dispatch, extra: sdk, rejectWithValue }) => {
    try {
      const currentUser = getState().user.currentUser;
      const txUuid = normalizeTransactionUuid(transactionId);

      if (!currentUser || !txUuid) {
        return rejectWithValue(storableError(new Error('Missing user or transaction')));
      }

      const ids = getArchivedConversationIds(currentUser);
      if (ids.includes(txUuid)) {
        return currentUser;
      }

      const updatedUser = await updateArchivedConversationIds(currentUser, [...ids, txUuid], sdk);
      dispatch(setCurrentUser(updatedUser));
      dispatch(fetchCurrentUserNotifications());
      return updatedUser;
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const unarchiveConversationThunk = createAsyncThunk(
  'archivedConversations/unarchiveConversation',
  async ({ transactionId }, { getState, dispatch, extra: sdk, rejectWithValue }) => {
    try {
      const currentUser = getState().user.currentUser;
      const txUuid = normalizeTransactionUuid(transactionId);

      if (!currentUser || !txUuid) {
        return rejectWithValue(storableError(new Error('Missing user or transaction')));
      }

      const ids = getArchivedConversationIds(currentUser);
      if (!ids.includes(txUuid)) {
        return currentUser;
      }

      const updatedUser = await updateArchivedConversationIds(
        currentUser,
        ids.filter(id => id !== txUuid),
        sdk
      );
      dispatch(setCurrentUser(updatedUser));
      dispatch(fetchCurrentUserNotifications());
      return updatedUser;
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

export const archiveConversation = transactionId => dispatch =>
  dispatch(archiveConversationThunk({ transactionId })).unwrap();

export const unarchiveConversation = transactionId => dispatch =>
  dispatch(unarchiveConversationThunk({ transactionId })).unwrap();

/**
 * Restore an archived thread when the other party sends a new message.
 *
 * @param {Function} dispatch
 * @param {Function} getState
 * @param {string|{ uuid: string }} txId
 * @param {Array} messages
 */
export const unarchiveConversationIfIncomingMessage = (dispatch, getState, txId, messages) => {
  const state = getState();
  const currentUser = state.user?.currentUser;
  const currentUserId = currentUser?.id?.uuid;
  const txUuid = normalizeTransactionUuid(txId);

  if (!currentUserId || !txUuid || !isTransactionArchived(currentUser, txUuid)) {
    return null;
  }

  if (!hasIncomingMessageFromOtherParty(messages, currentUserId)) {
    return null;
  }

  return dispatch(unarchiveConversation(txUuid));
};
