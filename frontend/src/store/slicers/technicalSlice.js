import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import technicalApi from "../../apis/technicals";

const initialState = {
  loading: false,
  error: null,
  technical_analysis: {},         // { "OANDA:USDCAD": { RECOMMENDATION, ... }, ... }
  query: {                        // keep last used inputs (prefill the layout form)
    symbols: "OANDA:USDCAD,OANDA:USDCHF,OANDA:USDJPY,OANDA:GBPUSD",
    screener: "forex",
    timeframe: "1d",
  },
};


export const getAnalysis = createAsyncThunk(
  "technicals/getAnalysis",
  async ({ symbols, screener, timeframe }, { rejectWithValue }) => {
    try {
      const res = await technicalApi.getRatings({ symbols, screener, timeframe });
      return res.data; // expects { analysis_data: {...} }
    } catch (err) {
      return rejectWithValue(
        err?.response?.data?.detail || err?.message || "Failed to fetch"
      );
    }
  }
);

const technicalsSlice = createSlice({
  name: "technicals",
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    setQuery(state, action) {
      const { symbols, screener, timeframe } = action.payload;
      state.query = { symbols, screener, timeframe };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAnalysis.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAnalysis.fulfilled, (state, action) => {
        state.loading = false;
        state.technical_analysis = action.payload?.analysis_data || {};
      })
      .addCase(getAnalysis.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch analysis data";
      });
  },
});

export const { clearError, setQuery } = technicalsSlice.actions;
export default technicalsSlice.reducer;
