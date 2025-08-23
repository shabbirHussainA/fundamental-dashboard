import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../api/authApi';
import { isTokenValid } from '../../utils/tokenValidity';

// Async Thunks
export const sendOtp = createAsyncThunk('auth/sendOtp', async ({email, role = 'borrower', recaptchaToken}, { rejectWithValue }) => {
  try {
    const response = await authApi.sendOtp(email, role, recaptchaToken);
    return response.data;
  } catch (error) {
    console.log('Send OTP Error:', error);
    return rejectWithValue(error.response?.data || 'Failed to send OTP');
  }
});

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp', 
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyOtp(email, otp);
      return response.data;
    } catch (error) {
      console.log('Verification Error:', error);
      console.log('Error Response:', error.response);
      return rejectWithValue(error.response?.data || 'Verification failed');
    }
  }
);

export const setPassword = createAsyncThunk('auth/setPassword', async ({ email, password, confirm_password }, { rejectWithValue }) => {
  try {
    const response = await authApi.setPassword(email, password, confirm_password);
    return response.data;
  } catch (error) {
    console.log('Set Password Error:', error);
    return rejectWithValue(error.response?.data || 'Failed to set password');
  }
});

export const login = createAsyncThunk('auth/login', async ({email, password, recaptchaToken}, { rejectWithValue }) => {
  try {
    const response = await authApi.login(email, password, recaptchaToken);
    return response.data;
  } catch (error) {
    console.log('Login Error:', error);
    return rejectWithValue(error.response?.data || 'Login failed');
  }
});

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getUser();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || 'Failed to get user profile');
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.refreshToken();
      return response.data;
    } catch (error) {
      console.log('refreshToken Error:', error);
      return rejectWithValue(error.response?.data || 'Failed to refresh token');
    }
  }
);

// 2FA Login actions
export const verifyLoginOtp = createAsyncThunk(
  'auth/verifyLoginOtp', 
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyLoginOtp(email, otp);
      return response.data;
    } catch (error) {
      console.log('Verify Login OTP Error:', error);
      return rejectWithValue(error.response?.data || 'Login OTP verification failed');
    }
  }
);

export const resendLoginOtp = createAsyncThunk(
  'auth/resendLoginOtp',
  async (email, { rejectWithValue }) => {
    try {
      const response = await authApi.resendLoginOtp(email);
      return response.data;
    } catch (error) {
      console.log('Resend Login OTP Error:', error);
      return rejectWithValue(error.response?.data || 'Failed to resend login OTP');
    }
  }
);

export const get2FAStatus = createAsyncThunk(
  'auth/get2FAStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.get2FAStatus();
      return response.data;
    } catch (error) {
      console.log('Get 2FA Status Error:', error);
      return rejectWithValue(error.response?.data || 'Failed to get 2FA status');
    }
  }
);

// Initial State
const token = localStorage.getItem('token');
const tokenData = isTokenValid(token);

const initialState = {
  user: tokenData.user,
  role: tokenData.role,
  email: tokenData.email,
  token: token || '',
  isLoggedIn: tokenData.valid || false,
  otpVerified: false,
  accessibleMenuPaths: tokenData.accessibleMenuPaths || [],
  loading: false,
  error: null,
  openPasswordModal: false,
  // 2FA related states
  loginOtpRequired: false,
  loginOtpEmail: '',
  loginOtpVerified: false,
  twoFactorStatus: null,
  resendingOtp: false
};

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    logout(state) {
      state.isLoggedIn = false;
      state.user = null;
      state.token = "";
      state.role = null;
      state.email = null;
      state.accessibleMenuPaths = [];
      localStorage.removeItem('token');
    },
    openPasswordModal(state, action) {
      state.openPasswordModal = action.payload;
    },
    setAccessibleMenuPaths(state, action) {
      state.accessibleMenuPaths = action.payload;
    },
    resetSignupState(state) {
      state.otpVerified = false;
      state.error = null;
      state.loading = false;
    },
    // 2FA related actions
    setLoginOtpRequired(state, action) {
      state.loginOtpRequired = action.payload.required;
      state.loginOtpEmail = action.payload.email || '';
    },
    clearLoginOtpState(state) {
      state.loginOtpRequired = false;
      state.loginOtpEmail = '';
      state.loginOtpVerified = false;
      state.resendingOtp = false;
    },
    set2FAStatus(state, action) {
      state.twoFactorStatus = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // sendOtp
      .addCase(sendOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.email = action.payload.email;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || action.payload.message;
      })
      
      // verifyOtp
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.loading = false;
        state.otpVerified = true;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'An error occurred during verification';
      })
      
      // setPassword
      .addCase(setPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setPassword.fulfilled, (state) => {
        state.loading = false;
        state.otpVerified = false;  // Reset after successful password set
      })
      .addCase(setPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || action.payload.message;
      })
      
      // login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        
        // Check if 2FA is required
        if (action.payload.requiresOtp) {
          state.loginOtpRequired = true;
          state.loginOtpEmail = action.payload.email;
          state.isLoggedIn = false; // Don't mark as logged in until OTP is verified
        } else {
          // Normal login completion
          const tokendata = isTokenValid(action.payload.token);
          
          state.isLoggedIn = true;
          state.role = tokendata.role;
          state.token = action.payload.token;
          state.user = tokendata.user;
          state.email = tokendata.email;
          
          // Handle accessibleMenuPaths for loan-admin
          if (tokendata.role === 'loan-admin') {
            const menuPaths = action.payload.accessibleMenuPaths || tokendata.accessibleMenuPaths || [];
            state.accessibleMenuPaths = menuPaths;
          } else {
            state.accessibleMenuPaths = tokendata.accessibleMenuPaths || [];
          }
          
          localStorage.setItem('token', action.payload.token);
          
          // Clear any existing 2FA state
          state.loginOtpRequired = false;
          state.loginOtpEmail = '';
          state.loginOtpVerified = false;
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || action.payload.message;
      })
      
      // getCurrentUser
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || action.payload;
        if (action.payload.accessibleMenuPaths) {
          state.accessibleMenuPaths = action.payload.accessibleMenuPaths;
        }
        if (action.payload.token) {
          state.token = action.payload.token;
          localStorage.setItem('token', action.payload.token);
        }
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || action.payload.message;
      })
      
      // refreshToken
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        const tokendata = isTokenValid(action.payload.token);
        state.loading = false;
        state.role = tokendata.role;
        state.token = action.payload.token;
        state.user = tokendata.user;
        state.email = tokendata.email;
        state.accessibleMenuPaths = tokendata.accessibleMenuPaths || [];
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || action.payload.message;
        // If refresh fails, logout the user
        state.isLoggedIn = false;
        state.user = null;
        state.token = "";
        state.role = null;
        state.email = null;
        state.accessibleMenuPaths = [];
        localStorage.removeItem('token');
      })
      
      // verifyLoginOtp
      .addCase(verifyLoginOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyLoginOtp.fulfilled, (state, action) => {
        const tokendata = isTokenValid(action.payload.token);
        
        state.loading = false;
        state.isLoggedIn = true;
        state.role = tokendata.role;
        state.token = action.payload.token;
        state.user = tokendata.user;
        state.email = tokendata.email;
        state.loginOtpVerified = true;
        
        // Handle accessibleMenuPaths for loan-admin
        if (tokendata.role === 'loan-admin') {
          const menuPaths = action.payload.accessibleMenuPaths || tokendata.accessibleMenuPaths || [];
          state.accessibleMenuPaths = menuPaths;
        } else {
          state.accessibleMenuPaths = tokendata.accessibleMenuPaths || [];
        }
        
        localStorage.setItem('token', action.payload.token);
        
        // Clear 2FA state
        state.loginOtpRequired = false;
        state.loginOtpEmail = '';
      })
      .addCase(verifyLoginOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error.message;
      })
      
      // resendLoginOtp
      .addCase(resendLoginOtp.pending, (state) => {
        state.resendingOtp = true;
        state.error = null;
      })
      .addCase(resendLoginOtp.fulfilled, (state) => {
        state.resendingOtp = false;
      })
      .addCase(resendLoginOtp.rejected, (state, action) => {
        state.resendingOtp = false;
        state.error = action.payload?.message || action.error.message;
      })
      
      // get2FAStatus
      .addCase(get2FAStatus.fulfilled, (state, action) => {
        state.twoFactorStatus = action.payload.twoFactorStatus;
      });
  },
});

export const { 
  clearError, 
  logout, 
  openPasswordModal, 
  setAccessibleMenuPaths, 
  resetSignupState,
  setLoginOtpRequired,
  clearLoginOtpState,
  set2FAStatus
} = authSlice.actions;
export default authSlice.reducer;