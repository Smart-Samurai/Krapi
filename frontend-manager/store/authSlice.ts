import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import { toast } from "sonner";

import type { RootState } from "./index";

import type { AdminUser } from "@/lib/krapi";


// Types
export interface AuthState {
  user: (AdminUser & { scopes?: string[]; password_hash?: string }) | null;
  loading: boolean;
  error: string | null;
  sessionToken: string | null;
  apiKey: string | null;
  scopes: string[];
  isInitialized: boolean;
}

// Helper functions
const setCookie = (name: string, value: string, days = 7) => {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const removeCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

const getCookie = (name: string): string | null => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    if (!c) continue;
    while (c.charAt(0) === " ") {
      c = c.substring(1, c.length);
      if (!c) break;
    }
    if (c && c.indexOf(nameEQ) === 0)
      return c.substring(nameEQ.length, c.length);
  }
  return null;
};

// Async thunks
export const initializeAuth = createAsyncThunk(
  "auth/initialize",
  async (_args: Record<string, never> = {}) => {
    const storedToken =
      getCookie("session_token") || localStorage.getItem("session_token");
    const storedApiKey = localStorage.getItem("api_key");

    if (storedToken) {
      // Validate session via API route
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            "Content-Type": "application/json",
          },
        });
        
        if (!response.ok) {
          throw new Error("Session invalid");
        }
        
        const result = await response.json();
        if (result.success && result.user) {
          const storedScopes = localStorage.getItem("user_scopes");
          let userScopes: string[] = [];

          if (storedScopes) {
            try {
              userScopes = JSON.parse(storedScopes);
            } catch (_e) {
              // eslint-disable-next-line no-console
              console.error("Failed to parse stored scopes:", _e);
            }
          }

          return {
            user: { ...result.user, scopes: userScopes },
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
      } catch (_error) {
        // Session validation failed, clear stored data
        localStorage.removeItem("session_token");
        localStorage.removeItem("user_scopes");
        removeCookie("session_token");
        return { user: null, scopes: [], sessionToken: null };
      }
    } else if (storedApiKey) {
      // Validate API key via API route
      try {
        const response = await fetch("/api/auth/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ api_key: storedApiKey }),
        });
        
        if (!response.ok) {
          throw new Error("API key invalid");
        }
        
        const result = await response.json();
        if (result.success && result.user) {
          const userScopes = result.user.scopes || [];
          return {
            user: result.user,
            scopes: userScopes,
            sessionToken: result.session_token,
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
      } catch (_error) {
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
    { token }: { token: string },
    thunkAPI
  ) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error("Session invalid");
      }
      
      const result = await response.json();
      const responseData = result.success ? { success: true, data: result.user } : result;
      if (responseData.success && responseData.data) {
        const storedScopes = localStorage.getItem("user_scopes");
        let userScopes: string[] = [];

        if (storedScopes) {
          try {
            userScopes = JSON.parse(storedScopes);
          } catch (_e) {
            // eslint-disable-next-line no-console
            console.error("Failed to parse stored scopes:", _e);
          }
        }

        return {
          user: { ...responseData.data, scopes: userScopes },
          scopes: userScopes,
        };
      } else {
        thunkAPI.dispatch(clearAuthData());
        throw new Error("Session validation failed");
      }
    } catch (_error) {
      thunkAPI.dispatch(clearAuthData());
      throw _error;
    }
  }
);

export const validateApiKey = createAsyncThunk(
  "auth/validateApiKey",
  async ({ key }: { key: string }, thunkAPI) => {
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ api_key: key }),
      });
      
      if (!response.ok) {
        throw new Error("API key invalid");
      }
      
      const result = await response.json();
      if (result.success && result.session_token && result.user) {
        const userScopes = result.user.scopes || [];

        // Store in both localStorage and cookies
        localStorage.setItem("session_token", result.session_token);
        setCookie("session_token", result.session_token);
        localStorage.setItem("user_scopes", JSON.stringify(userScopes));

        return {
          user: result.user,
          scopes: userScopes,
          sessionToken: result.session_token,
        };
      } else {
        thunkAPI.dispatch(clearAuthData());
        throw new Error("API key validation failed");
      }
    } catch (_error) {
      thunkAPI.dispatch(clearAuthData());
      throw _error;
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (
    {
      username,
      password,
    }: { username: string; password: string },
    { getState: _getState }
  ) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Login failed" }));
      throw new Error(error.error || "Login failed");
    }

    const responseData = await response.json();

    if (responseData.success && responseData.session_token && responseData.user) {
      const userScopes = responseData.scopes || [];

      // Store in both localStorage and cookies
      localStorage.setItem("session_token", responseData.session_token);
      setCookie("session_token", responseData.session_token);
      localStorage.setItem("user_scopes", JSON.stringify(userScopes));

      return {
        user: responseData.user as AdminUser & { scopes?: string[] },
        scopes: userScopes,
        sessionToken: responseData.session_token,
      };
    } else {
      const errorMsg = responseData.error || "Unknown error";
      throw new Error(`Login failed: ${errorMsg}`);
    }
  }
);

export const loginWithApiKey = createAsyncThunk(
  "auth/loginWithApiKey",
  async (
    { apiKey }: { apiKey: string },
    { getState: _getState }
  ) => {
    const response = await fetch("/api/auth/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ api_key: apiKey }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "API key login failed" }));
      throw new Error(error.error || "API key login failed");
    }

    const responseData = await response.json();

    if (responseData.success && responseData.session_token && responseData.user) {
      const userScopes = responseData.user.scopes || [];

      // Store in both localStorage and cookies
      localStorage.setItem("session_token", responseData.session_token);
      setCookie("session_token", responseData.session_token);
      localStorage.setItem("api_key", apiKey);
      localStorage.setItem("user_scopes", JSON.stringify(userScopes));

      return {
        user: responseData.user as AdminUser & { scopes?: string[] },
        scopes: userScopes,
        sessionToken: responseData.session_token,
        apiKey,
      };
    } else {
      throw new Error("API key login failed");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_args: Record<string, never> = {}, { getState }) => {
    const state = getState() as RootState;
    const { sessionToken } = state.auth;

    try {
      if (sessionToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (_error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", _error);
      // Don't throw error on logout failure, just clear local data
    }

    // Clear all auth data
    localStorage.removeItem("session_token");
    localStorage.removeItem("api_key");
    localStorage.removeItem("user_scopes");
    removeCookie("session_token");
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
      .addCase(initializeAuth.fulfilled, (state: AuthState, action) => {
        state.user = action.payload.user as AdminUser & { scopes?: string[] };
        state.scopes = action.payload.scopes || [];
        state.sessionToken = action.payload.sessionToken || null;
        state.apiKey = action.payload.apiKey || null;
        state.loading = false;
        state.isInitialized = true;
      })
      .addCase(initializeAuth.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.error.message || "Initialization failed";
        state.isInitialized = true;
      })

      // Validate session
      .addCase(validateSession.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateSession.fulfilled, (state: AuthState, action) => {
        state.user = action.payload.user as AdminUser & { scopes?: string[] };
        state.scopes = action.payload.scopes;
        state.loading = false;
        state.error = null;
      })
      .addCase(validateSession.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.error.message || "Session validation failed";
      })

      // Validate API key
      .addCase(validateApiKey.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(validateApiKey.fulfilled, (state: AuthState, action) => {
        state.user = action.payload.user as AdminUser & { scopes?: string[] };
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.loading = false;
        state.error = null;
      })
      .addCase(validateApiKey.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.error.message || "API key validation failed";
      })

      // Login
      .addCase(login.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state: AuthState, action) => {
        state.user = action.payload.user as AdminUser & { scopes?: string[] };
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.loading = false;
        state.error = null;
        toast.success("Login successful");
      })
      .addCase(login.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.error.message || "Login failed";
        toast.error(action.error.message || "Invalid credentials");
      })

      // Login with API key
      .addCase(loginWithApiKey.pending, (state: AuthState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginWithApiKey.fulfilled, (state: AuthState, action) => {
        state.user = action.payload.user as AdminUser & { scopes?: string[] };
        state.scopes = action.payload.scopes;
        state.sessionToken = action.payload.sessionToken;
        state.apiKey = action.payload.apiKey;
        state.loading = false;
        state.error = null;
        toast.success("API key login successful");
      })
      .addCase(loginWithApiKey.rejected, (state: AuthState, action) => {
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
      .addCase(logout.rejected, (state: AuthState, action) => {
        state.loading = false;
        state.error = action.error.message || "Logout failed";
      });
  },
});

export const { clearAuthData, setError, clearError, setLoading } =
  authSlice.actions;
export default authSlice.reducer;
