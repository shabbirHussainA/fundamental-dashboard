// rootReducer.js
import { combineReducers } from "@reduxjs/toolkit";
import auth from "./slicers/authSlice";
import company from "./slicers/companySlice";
import loan from "./slicers/loanSlice";
import notification from "./slicers/borrower/notificationSlice";
import investorProfile from "./slicers/Investor/investorProfileSlice";
import loanAdmins from "./slicers/loanAdminSlice";
import roles from "./slicers/roleSlice";
import menus from "./slicers/menuSlice";
import borrowerPayments from "./slicers/borrower/paymentsSlice";
import investorGroup from "./slicers/InvestorGroup/investorGroupSlice";
import dashboard from "./slicers/borrower/dashboardSlice";
import investorDashboard from "./slicers/Investor/investorDashboardSlice";
import adminDashboard from "./slicers/admin/adminDashboardSlice";
import deletedRecords from "./slicers/admin/deletedRecordSlice";
import config from "./slicers/admin/configSlice";
import investmentSummary from "./slicers/investmentSummarySlice";
import paymentForecast from "./slicers/paymentForecastSlice";

const appReducer = combineReducers({
  auth,
  company,
  loan,
  notification,
  investorProfile,
  loanAdmins,
  roles,
  menus,
  borrowerPayments,
  investorGroup,
  dashboard,
  investorDashboard,
  adminDashboard,
  deletedRecords,
  config,
  investmentSummary,
  paymentForecast,
});

const rootReducer = (state, action) => {
  if (action.type === 'LOGOUT') {
    state = undefined; // Reset entire Redux state
    localStorage.clear(); // Clear localStorage
  }
  return appReducer(state, action);
};

export default rootReducer;
