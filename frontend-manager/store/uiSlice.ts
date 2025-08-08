import { createSlice } from "@reduxjs/toolkit";

interface UiState {
  globalBusyCount: number;
}

const initialState: UiState = {
  globalBusyCount: 0,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    beginBusy(state) {
      state.globalBusyCount += 1;
    },
    endBusy(state) {
      state.globalBusyCount = Math.max(0, state.globalBusyCount - 1);
    },
    resetBusy(state) {
      state.globalBusyCount = 0;
    },
  },
});

export const { beginBusy, endBusy, resetBusy } = uiSlice.actions;
export default uiSlice.reducer;