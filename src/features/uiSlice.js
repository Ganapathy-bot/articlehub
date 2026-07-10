import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    searchInput: "",
    selectedTopic: "all",
  },
  reducers: {
    setInput: (state, action) => {
      state.searchInput = action.payload;
    },
    setSelectedTopic: (state, action) => {
      state.selectedTopic = action.payload;
    },
  },
});

export const { setInput, setSelectedTopic } = uiSlice.actions;

export const selectUserInput = (state) => state.ui.searchInput;
export const selectSelectedTopic = (state) => state.ui.selectedTopic;

export default uiSlice.reducer;
