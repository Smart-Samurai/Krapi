import { createSlice } from "@reduxjs/toolkit";

// Types
export interface UIState {
  isBusy: boolean;
  busyCount: number;
  globalBusyCount: number;
}

// Initial state
const initialState: UIState = {
  isBusy: false,
  busyCount: 0,
  globalBusyCount: 0,
};

// Slice
const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    beginBusy: (state: UIState) => {
      state.busyCount += 1;
      state.globalBusyCount += 1;
      state.isBusy = true;
    },
    endBusy: (state: UIState) => {
      state.busyCount = Math.max(0, state.busyCount - 1);
      state.globalBusyCount = Math.max(0, state.globalBusyCount - 1);
      state.isBusy = state.busyCount > 0;
    },
    resetBusy: (state: UIState) => {
      state.busyCount = 0;
      state.globalBusyCount = 0;
      state.isBusy = false;
    },
    beginGlobalBusy: (state: UIState) => {
      state.globalBusyCount += 1;
    },
    endGlobalBusy: (state: UIState) => {
      state.globalBusyCount = Math.max(0, state.globalBusyCount - 1);
    },
  },
});

export const { beginBusy, endBusy, resetBusy, beginGlobalBusy, endGlobalBusy } =
  uiSlice.actions;
export default uiSlice.reducer;
