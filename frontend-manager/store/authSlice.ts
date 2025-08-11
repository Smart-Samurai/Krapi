import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { KrapiSDK, AdminUser, createDefaultKrapi } from "@/lib/krapi";
import { toast } from "sonner";

// Types
export interface AuthState {
  user: (AdminUser & { scopes?: string[] }) | null;
  loading: boolean;
  error: string | null;
  sessionToken: string | null;
  apiKey: string | null;
  scopes: string[];
  isInitialized: boolean;
}

// Helper functions
const setCookie = (name: string, value: string, days: number = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const removeCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_: void, { dispatch }: { dispatch: any }) => {
    const storedToken =
      getCookie("session_token") || localStorage.getItem("session_token");
    const storedApiKey = localStorage.getItem("api_key");
    const client = createDefaultKrapi();

    if (storedToken) {
      client.setSessionToken(storedToken);
      // Validate session
      try {
        const response = await client.auth.getCurrentUser();
        if (response.success && response.data) {
          const storedScopes = localStorage.getItem("user_scopes");
          let userScopes: string[] = [];

          if (storedScopes) {
            try {
              userScopes = JSON.parse(storedScopes);
            } catch (e) {
              console.error("Failed to parse stored scopes:", e);
            }
          }

          return {
            user: { ...response.data, scopes: userScopes },
            scopes: userScopes,
            sessionToken: storedToken,
          };
        } else {
          // Session is invalid, clear stored data
          localStorage.removeItem("session_token");
          localStorage.removeItem("user_scopes");
          removeCookie("session_token");
          return { user: null, scopes: [], sessionToken: null };
        }
      } catch (error) {
        // Session validation failed, clear stored data
        localStorage.removeItem("session_token");
        localStorage.removeItem("user_scopes");
        removeCookie("session_token");
        return { user: null, scopes: [], sessionToken: null };
      }
    } else if (storedApiKey) {
      client.setApiKey(storedApiKey);
      // Validate API key
      try {
        const response = await client.auth.adminApiLogin(storedApiKey);
        if (response.success && response.data) {
          const userScopes = response.data.user.scopes || [];
          return {
            user: response.data.user,
            scopes: userScopes,
            sessionToken: response.data.session_token,
            apiKey: storedApiKey,
          };
        } else {
          // API key is invalid, clear stored data
          localStorage.removeItem("api_key");
          return {
            user: null,
            scopes: [],
            sessionToken: null,
            apiKey: null,
          };
        }
      } catch (error) {
        // API key validation failed, clear stored data
        localStorage.removeItem("api_key");
        return {
          user: null,
          scopes: [],
          sessionToken: null,
          apiKey: null,
        };
      }
    } else {
      // No stored auth
      return {
        user: null,
        scopes: [],
        sessionToken: null,
        apiKey: null,
      };
    }
  }
);

export const validateSession = createAsyncThunk(
  "auth/validateSession",
  async (
    { client, token }: { client: KrapiSDK; token: string },
    { dispatch }: { dispatch: any }
  ) => {
    try {
      const response = await client.auth.getCurrentUser();
      if (response.success && response.data) {
        const storedScopes = localStorage.getItem("user_scopes");
        let userScopes: string[] = [];

        if (storedScopes) {
          try {
            userScopes = JSON.parse(storedScopes);
          } catch (e) {
            console.error("Failed to parse stored scopes:", e);
          }
        }

        return {
          user: { ...response.data, scopes: userScopes },
          scopes: userScopes,
        };
      } else {
        dispatch(clearAuthData());
        throw new Error("Session validation failed");
      }
    } catch (error) {
      dispatch(clearAuthData());
      throw error;
    }
  }
);

export const validateApiKey = createAsyncThunk(
  "auth/validateApiKey",
  async (
    { client, key }: { client: KrapiSDK; key: string },
    { dispatch }: { dispatch: any }
  ) => {
    try {
      const response = await client.auth.adminApiLogin(key);
      if (response.success && response.data) {
        const userScopes = response.data.user.scopes || [];

        // Store in both localStorage and cookies
        localStorage.setItem("session_token", response.data.session_token);
        setCookie("session_token", response.data.session_token);
        localStorage.setItem("user_scopes", JSON.stringify(userScopes));
        client.setSessionToken(response.data.session_token);

        return {
          user: response.data.user,
          scopes: userScopes,
          sessionToken: response.data.session_token,
        };
      } else {
        dispatch(clearAuthData());
        throw new Error("API key validation failed");
      }
    } catch (error) {
      dispatch(clearAuthData());
      throw error;
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (
    { username, password }: { username: string; password: string },
    { getState }: { getState: any }
  ) => {
    const state = getState() as { auth: AuthState };
    const { sessionToken } = state.auth;

    const client = createDefaultKrapi();
    if (sessionToken) {
      client.setSessionToken(sessionToken);
    }

    const response = await client.auth.adminLogin({ username, password });
    if (response.success && response.data) {
      const userScopes = response.data.user.scopes || [];

      // Store in both localStorage and cookies
      localStorage.setItem("session_token", response.data.session_token);
      setCookie("session_token", response.data.session_token);
      localStorage.setItem("user_scopes", JSON.stringify(userScopes));

      client.setSessionToken(response.data.session_token);

      return {
        user: response.data.user,
        scopes: userScopes,
        sessionToken: response.data.session_token,
      };
    } else {
      throw new Error("Login failed");
    }
  }
);

export const loginWithApiKey = createAsyncThunk(
  "auth/loginWithApiKey",
  async (apiKey: string, { getState }: { getState: any }) => {
    const state = getState() as { auth: AuthState };
    const { sessionToken } = state.auth;

    const client = createDefaultKrapi();
    if (sessionToken) {
      client.setSessionToken(sessionToken);
    }

    const response = await client.auth.adminApiLogin(apiKey);
    if (response.success && response.data) {
      const userScopes = response.data.user.scopes || [];

      // Store in both localStorage and cookies
      localStorage.setItem("session_token", response.data.session_token);
      setCookie("session_token", response.data.session_token);
      localStorage.setItem("api_key", apiKey);
      localStorage.setItem("user_scopes", JSON.stringify(userScopes));

      client.setSessionToken(response.data.session_token);

      return {
        user: response.data.user,
        scopes: userScopes,
        sessionToken: response.data.session_token,
        apiKey,
      };
    } else {
      throw new Error("API key login failed");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_: void, { getState }: { getState: any }) => {
    const state = getState() as { auth: AuthState };
    const { sessionToken } = state.auth;

    const client = createDefaultKrapi();
    if (sessionToken) {
      client.setSessionToken(sessionToken);
    }

    try {
      if (sessionToken) {
        await client.auth.logout();
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Don't throw error on logout failure, just clear local data
    }

    // Clear all auth data
    localStorage.removeItem("session_token");
    localStorage.removeItem("api_key");
    localStorage.removeItem("user_scopes");
    removeCookie("session_token");

    if (client) {
      client.clearAuth();
    }
  }
);

// Initial state
const initialState: AuthState = {
  user: null,
  loading: true,
  error: null,
  sessionToken: null,
  apiKey: null,
  scopes: [],
  isInitialized: false,
};

// Slice
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthData: (state: AuthState) => {
      state.user = null;
      state.scopes = [];
      state.sessionToken = null;
      state.apiKey = null;
      state.error = null;
      localStorage.removeItem("session_token");
      localStorage.removeItem("api_key");
      localStorage.removeItem("user_scopes");
      removeCookie("session_token");
    },
    setError: (state: AuthState, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state: AuthState) => {
      state.error = null;
    },
    setLoading: (state: AuthState, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<AuthState>) => {
    builder
      // Initialize auth
      .addCase(initializeAuth.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state: AuthState, action: any) => {
        state.user = action.payload.user;
        state.scopes = action.payload.scopes || [];
        state.sessionToken = action.payload.sessionToken || null;
        state.apiKey = action.payload.apiKey || null;
        state.loading = false;
        state.isInitialized = true;
      })
      .addCase(initializeAuth.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "Initialization failed";
        state.isInitialized = true;
      })

      // Validate session
      .addCase(validateSession.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateSession.fulfilled, (state: AuthState, action: any) => {
        state.user = action.payload.user;
        state.scopes = action.payload.scopes;
        state.loading = false;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "Session validation failed";
      })

      // Validate API key
      .addCase(validateApiKey.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateApiKey.fulfilled, (state: AuthState, action: any) => {
        state.user = action.payload.user;
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.loading = false;
        state.error = null;
      })
      .addCase(validateApiKey.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "API key validation failed";
      })

      // Login
      .addCase(login.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state: AuthState, action: any) => {
        state.user = action.payload.user;
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.loading = false;
        state.error = null;
        toast.success("Login successful");
      })
      .addCase(login.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "Login failed";
        toast.error(action.error.message || "Invalid credentials");
      })

      // Login with API key
      .addCase(loginWithApiKey.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithApiKey.fulfilled, (state: AuthState, action: any) => {
        state.user = action.payload.user;
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.apiKey = action.payload.apiKey;
        state.loading = false;
        state.error = null;
        toast.success("API key login successful");
      })
      .addCase(loginWithApiKey.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "API key login failed";
        toast.error(action.error.message || "Invalid API key");
      })

      // Logout
      .addCase(logout.pending, (state: AuthState) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state: AuthState) => {
        state.user = null;
        state.scopes = [];
        state.sessionToken = null;
        state.apiKey = null;
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state: AuthState, action: any) => {
        state.loading = false;
        state.error = action.error.message || "Logout failed";
      });
  },
});

export const { clearAuthData, setError, clearError, setLoading } =
  authSlice.actions;
export default authSlice.reducer;
