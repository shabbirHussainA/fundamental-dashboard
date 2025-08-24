import { configureStore } from '@reduxjs/toolkit';
import technicals from './slicers/technicalSlice';
const store = configureStore({
  reducer: {
    technicals,   // <-- key must be "technicals" to match your selector
  },
});

export default store