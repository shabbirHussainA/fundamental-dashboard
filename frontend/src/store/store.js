import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer"; // ✅ Import the new root reducer

const isDevelopment = true;

const store = configureStore({
  reducer: rootReducer, // ✅ Use rootReducer here
  devTools: isDevelopment,
});

export default store;
