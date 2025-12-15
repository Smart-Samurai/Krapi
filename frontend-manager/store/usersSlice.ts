import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";

import type { ProjectUser } from "@/lib/krapi";

// Helper to get auth token from cookies/localStorage
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "session_token" && value) return value;
  }
  return localStorage.getItem("session_token");
}

// Types
interface UsersBucket {
  items: ProjectUser[];
  loading: boolean;
  error: string | null;
}

export interface UsersState {
  byProjectId: Record<string, UsersBucket>;
}

// Initial state
const initialState: UsersState = {
  byProjectId: {},
};

// Async thunks
export const fetchUsers = createAsyncThunk(
  "users/fetchAll",
  async (
    { projectId, search }: { projectId: string; search?: string },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue("Authentication required");
      }

      const searchParams = new URLSearchParams();
      if (search) searchParams.set("search", search);
      searchParams.set("limit", "200");

      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/users?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to fetch users" }));
        return rejectWithValue(error.error || "Failed to fetch users");
      }

      const result = await response.json();
      return { projectId, users: result.success ? result.data || [] : [] };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch users"
      );
    }
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (
    {
      projectId,
      data,
    }: {
      projectId: string;
      data: { email: string; password?: string; username?: string; role?: string; name?: string };
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue("Authentication required");
      }

      // Transform the data to match SDK expectations
      const userData = {
        username: data.username || data.email.split("@")[0] || "user",
        email: data.email,
        password: data.password || Math.random().toString(36).slice(-8), // Use provided password or fallback
        role: data.role,
        permissions: data.role ? [data.role] : [],
        name: data.name, // Also pass name if available
      };

      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/users`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to create user" }));
        return rejectWithValue(error.error || "Failed to create user");
      }

      const result = await response.json();
      return { projectId, user: result.success ? result.data : null };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create user"
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  "users/update",
  async (
    {
      projectId,
      userId,
      updates,
    }: {
      projectId: string;
      userId: string;
      updates: Partial<{ email: string; role: string; name: string }>;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue("Authentication required");
      }

      // Transform frontend updates format to SDK format
      const sdkUpdates: {
        username?: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        permissions?: string[];
        is_active?: boolean;
        metadata?: Record<string, unknown>;
      } = {};
      if (updates.email) sdkUpdates.email = updates.email;
      if (updates.role) sdkUpdates.role = updates.role;
      if (updates.name) {
        const nameParts = updates.name.split(" ");
        sdkUpdates.first_name = nameParts[0] || "";
        sdkUpdates.last_name = nameParts.slice(1).join(" ") || "";
      }

      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/users/${userId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sdkUpdates),
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to update user" }));
        return rejectWithValue(error.error || "Failed to update user");
      }

      const result = await response.json();
      return { projectId, user: result.success ? result.data : null };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update user"
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (
    { projectId, userId }: { projectId: string; userId: string },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue("Authentication required");
      }

      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Failed to delete user" }));
        return rejectWithValue(error.error || "Failed to delete user");
      }

      const result = await response.json();
      if (result.success) {
        return { projectId, userId };
      } else {
        return rejectWithValue("Failed to delete user");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete user"
      );
    }
  }
);

// Slice
const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder: ActionReducerMapBuilder<UsersState>) => {
    builder
      .addCase(fetchUsers.pending, (state: UsersState, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.byProjectId[projectId].loading = true;
        state.byProjectId[projectId].error = null;
      })
      .addCase(fetchUsers.fulfilled, (state: UsersState, action) => {
        const { projectId, users } = action.payload as {
          projectId: string;
          users: ProjectUser[];
        };
        state.byProjectId[projectId] = {
          items: users,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchUsers.rejected, (state: UsersState, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.byProjectId[projectId].loading = false;
        state.byProjectId[projectId].error =
          (action.payload as string) || "Failed to fetch users";
      })
      .addCase(createUser.pending, (state: UsersState, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.byProjectId[projectId].loading = true;
        state.byProjectId[projectId].error = null;
      })
      .addCase(createUser.fulfilled, (state: UsersState, action) => {
        const { projectId, user } = action.payload as {
          projectId: string;
          user: ProjectUser;
        };
        if (user) {
          state.byProjectId[projectId] ||= {
            items: [],
            loading: false,
            error: null,
          };
          state.byProjectId[projectId].items.push(user);
          state.byProjectId[projectId].loading = false;
        }
      })
      .addCase(createUser.rejected, (state: UsersState, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.byProjectId[projectId].loading = false;
        state.byProjectId[projectId].error =
          (action.payload as string) || "Failed to create user";
      })
      .addCase(updateUser.fulfilled, (state: UsersState, action) => {
        const { projectId, user } = action.payload as {
          projectId: string;
          user: ProjectUser;
        };
        if (user) {
          const bucket = state.byProjectId[projectId];
          if (!bucket) return;
          bucket.items = bucket.items.map((u) => (u.id === user.id ? user : u));
        }
      })
      .addCase(deleteUser.fulfilled, (state: UsersState, action) => {
        const { projectId, userId } = action.payload as {
          projectId: string;
          userId: string;
        };
        const bucket = state.byProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((u) => u.id !== userId);
      });
  },
});

export default usersSlice.reducer;
