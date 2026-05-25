import { createSlice } from '@reduxjs/toolkit';

import {
  PLATFORM_MODE_CUSTOMER,
  readPlatformModeFromStorage,
  resolvePlatformMode,
  writePlatformModeToStorage,
} from '../util/peakupPlatformMode';

const initialState = {
  mode: PLATFORM_MODE_CUSTOMER,
  hydrated: false,
};

const peakupPlatformModeSlice = createSlice({
  name: 'peakupPlatformMode',
  initialState,
  reducers: {
    hydratePlatformMode: (state, action) => {
      const currentUser = action.payload;
      const storedMode = readPlatformModeFromStorage();
      state.mode = resolvePlatformMode(currentUser, storedMode);
      state.hydrated = true;
    },
    setPlatformMode: (state, action) => {
      state.mode = action.payload;
      state.hydrated = true;
      writePlatformModeToStorage(action.payload);
    },
    resetPlatformMode: state => {
      state.mode = PLATFORM_MODE_CUSTOMER;
      state.hydrated = false;
    },
  },
});

export const { hydratePlatformMode, setPlatformMode, resetPlatformMode } =
  peakupPlatformModeSlice.actions;

export default peakupPlatformModeSlice.reducer;

export const selectPlatformMode = state => state.peakupPlatformMode?.mode;
export const selectPlatformModeHydrated = state => state.peakupPlatformMode?.hydrated;
