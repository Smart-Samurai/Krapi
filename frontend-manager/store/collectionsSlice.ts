import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { Collection } from "@/lib/krapi";
import { buildKrapiFromState } from "./helpers";

interface CollectionsState {
  byProjectId: Record<string, { items: Collection[]; loading: boolean; error: string | null }>;
}

const initialState: CollectionsState = {
  byProjectId: {},
};

export const fetchCollections = createAsyncThunk<Collection[], { projectId: string }, { state: RootState }>(
  "collections/fetchAll",
  async ({ projectId }, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.collections.getAll(projectId);
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to fetch collections");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Fetch error");
    }
  }
);

export const createCollection = createAsyncThunk<Collection, { projectId: string; payload: { name: string; description?: string; fields: any[] } }, { state: RootState }>(
  "collections/create",
  async ({ projectId, payload }, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.collections.create(projectId, payload as any);
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to create collection");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Create error");
    }
  }
);

export const updateCollection = createAsyncThunk<Collection, { projectId: string; name: string; updates: Partial<Collection> }, { state: RootState }>(
  "collections/update",
  async ({ projectId, name, updates }, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.collections.update(projectId, name, updates);
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to update collection");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Update error");
    }
  }
);

export const deleteCollection = createAsyncThunk<string, { projectId: string; name: string }, { state: RootState }>(
  "collections/delete",
  async ({ projectId, name }, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.collections.delete(projectId, name);
      if (!res.success) return rejectWithValue(res.error || "Failed to delete collection");
      return name;
    } catch (e: any) {
      return rejectWithValue(e.message || "Delete error");
    }
  }
);

const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCollections.pending, (state, action) => {
        const { projectId } = action.meta.arg as { projectId: string };
        state.byProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.byProjectId[projectId].loading = true;
        state.byProjectId[projectId].error = null;
      })
      .addCase(fetchCollections.fulfilled, (state, action) => {
        // projectId not in payload; recover from meta
        const { projectId } = action.meta.arg as { projectId: string };
        state.byProjectId[projectId] = { items: action.payload, loading: false, error: null };
      })
      .addCase(fetchCollections.rejected, (state, action) => {
        const { projectId } = action.meta.arg as { projectId: string };
        state.byProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.byProjectId[projectId].loading = false;
        state.byProjectId[projectId].error = (action.payload as string) || "Failed";
      })
      .addCase(createCollection.fulfilled, (state, action) => {
        const { projectId } = (action.meta.arg as any);
        state.byProjectId[projectId]?.items.push(action.payload);
      })
      .addCase(updateCollection.fulfilled, (state, action) => {
        const { projectId, name } = (action.meta.arg as any);
        const bucket = state.byProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.map((c) => (c.name === name ? action.payload : c));
      })
      .addCase(deleteCollection.fulfilled, (state, action) => {
        const { projectId } = (action.meta.arg as any);
        const bucket = state.byProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((c) => c.name !== action.payload);
      });
  },
});

export default collectionsSlice.reducer;