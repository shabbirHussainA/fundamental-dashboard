// src/apis/technicals.js
import axiosInstance from "../config/axios";

const technicalApi = {
  // call as technicalApi.getRatings({ symbols, screener, timeframe })
  getRatings: ({ symbols, screener, timeframe }) =>
    axiosInstance.get("/get_analysis", {
      params: {
        // keep the string as-is; axios will encode it
        symbols,       // e.g. "OANDA:USDCAD,OANDA:USDCHF,OANDA:USDJPY"
        screener,      // e.g. "forex"
        timeframe,     // e.g. "1d"
      },
    }),
  getHeatMap:()=> axiosInstance.get("/get_heatmap")
};

export default technicalApi;
