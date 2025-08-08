import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { ProjectUser } from "@/lib/krapi";
import { buildKrapiFromState } from "./helpers";

interface UsersBucket {
  items: ProjectUser[];
  loading: boolean;
  error: string | null;
}

interface UsersState {
  byProjectId: Record<string, UsersBucket>;
}

const initialState: UsersState = {
  byProjectId: {},
};

export const fetchUsers = createAsyncThunk<
  { projectId: string; users: ProjectUser[] },
  { projectId: string; search?: string },
  { state: RootState }
>("users/fetchAll", async ({ projectId, search }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.users.getAll(projectId, { search, limit: 200 });
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch users");
    const users = Array.isArray((res as any).data) ? ((res as any).data as ProjectUser[]) : ((res as any).data.items as ProjectUser[]);
    return { projectId, users };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const createUser = createAsyncThunk<
  { projectId: string; user: ProjectUser },
  { projectId: string; payload: Parameters<ReturnType<typeof buildKrapiFromState>["users"]["create"]>[1] },
  { state: RootState }
>("users/create", async ({ projectId, payload }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.users.create(projectId, payload as any);
    if (!res.success || !res.data) return rejectWithValue("Failed to create user");
    return { projectId, user: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Create error");
  }
});

export const updateUser = createAsyncThunk<
  { projectId: string; user: ProjectUser },
  { projectId: string; userId: string; updates: Parameters<ReturnType<typeof buildKrapiFromState>["users"]["update"]>[2] },
  { state: RootState }
>("users/update", async ({ projectId, userId, updates }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.users.update(projectId, userId, updates as any);
    if (!res.success || !res.data) return rejectWithValue("Failed to update user");
    return { projectId, user: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Update error");
  }
});

export const deleteUser = createAsyncThunk<
  { projectId: string; userId: string },
  { projectId: string; userId: string },
  { state: RootState }
>("users/delete", async ({ projectId, userId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.users.delete(projectId, userId);
    if (!res.success) return rejectWithValue("Failed to delete user");
    return { projectId, userId };
  } catch (e: any) {
    return rejectWithValue(e.message || "Delete error");
  }
});

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.byProjectId[projectId].loading = true;
        state.byProjectId[projectId].error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        const { projectId, users } = action.payload;
        state.byProjectId[projectId] = { items: users, loading: false, error: null };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.byProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.byProjectId[projectId].loading = false;
        state.byProjectId[projectId].error = (action.payload as string) || "Failed";
      })
      .addCase(createUser.fulfilled, (state, action) => {
        const { projectId, user } = action.payload;
        state.byProjectId[projectId]?.items.push(user);
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const { projectId, user } = action.payload;
        const bucket = state.byProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.map((u) => (u.id === user.id ? user : u));
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        const { projectId, userId } = action.payload;
        const bucket = state.byProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((u) => u.id !== userId);
      });
  },
});

export default usersSlice.reducer;