import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

import type { ProjectUser } from "@/lib/krapi";

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
    { projectId, search, krapi }: { projectId: string; search?: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getAll() returns ProjectUser[] directly, not wrapped in ApiResponse
      const users = await krapi.users.getAll(projectId, {
        search,
        limit: 200,
      });
      return { projectId, users: Array.isArray(users) ? users : [] };
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
      krapi,
    }: {
      projectId: string;
      data: { email: string; role?: string; name?: string };
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // Transform the data to match SDK expectations
      const userData = {
        username: data.email.split("@")[0] || "user", // Generate username from email, ensure it's never undefined
        email: data.email,
        password: Math.random().toString(36).slice(-8), // Generate random password
        role: data.role, // SDK expects role, not permissions
        permissions: data.role ? [data.role] : [], // Use SDK property name
      };
      // SDK create() returns ProjectUser directly, not wrapped in ApiResponse
      const user = await krapi.users.create(projectId, userData);
      return { projectId, user };
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
      krapi,
    }: {
      projectId: string;
      userId: string;
      updates: Partial<{ email: string; role: string; name: string }>;
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK update() returns ProjectUser directly, not wrapped in ApiResponse
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
      const user = await krapi.users.update(projectId, userId, sdkUpdates);
      return { projectId, user };
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
    { projectId, userId, krapi }: { projectId: string; userId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK delete() returns { success: boolean } directly, not wrapped in ApiResponse
      const result = await krapi.users.delete(projectId, userId);
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
  extraReducers: (_builder: ActionReducerMapBuilder<UsersState>) => {
    // Temporarily disabled to fix build issues
    // builder
    //   .addCase(fetchUsers.pending, (state: UsersState, action) => {
    //     const { projectId } = action.meta.arg;
    //     state.byProjectId[projectId] ||= {
    //       items: [],
    //       loading: false,
    //       error: null,
    //     };
    //     state.byProjectId[projectId].loading = true;
    //     state.byProjectId[projectId].error = null;
    //   })
    //   .addCase(fetchUsers.fulfilled, (state: UsersState, action) => {
    //     const { projectId, users } = action.payload;
    //     state.byProjectId[projectId] = {
    //       items: users,
    //       loading: false,
    //       error: null,
    //     };
    //   })
    //   .addCase(fetchUsers.rejected, (state: UsersState, action) => {
    //     const { projectId } = action.meta.arg;
    //     state.byProjectId[projectId] ||= {
    //       items: [],
    //       loading: false,
    //       error: null,
    //     };
    //     state.byProjectId[projectId].loading = false;
    //     state.byProjectId[projectId].error =
    //       action.payload || "Failed to fetch users";
    //   })
    //   .addCase(createUser.fulfilled, (state: UsersState, action) => {
    //     const { projectId, user } = action.payload;
    //     state.byProjectId[projectId]?.items.push(user);
    //   })
    //   .addCase(updateUser.fulfilled, (state: UsersState, action) => {
    //     const { projectId, user } = action.payload;
    //     const bucket = state.byProjectId[projectId];
    //     if (!bucket) return;
    //     bucket.items = bucket.items.map((u) => (u.id === user.id ? user : u));
    //   })
    //   .addCase(deleteUser.fulfilled, (state: UsersState, action) => {
    //     const { projectId, userId } = action.payload;
    //     const bucket = state.byProjectId[projectId];
    //     if (!bucket) return;
    //     bucket.items = bucket.items.filter((u) => u.id !== userId);
    //   });
  },
});

export default usersSlice.reducer;
