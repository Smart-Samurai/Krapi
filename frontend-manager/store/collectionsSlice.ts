import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { Collection, CollectionField, CollectionIndex } from "@/lib/krapi";

// Types
interface CollectionsBucket {
  items: Collection[];
  loading: boolean;
  error: string | null;
}

export interface CollectionsState {
  byProjectId: Record<string, CollectionsBucket>;
}

// Async thunks
export const fetchCollections = createAsyncThunk(
  "collections/fetchAll",
  async (
    { projectId, krapi }: { projectId: string; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.collections.getAll(projectId);
      if (response.success && response.data) {
        return { projectId, collections: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch collections");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch collections"
      );
    }
  }
);

export const createCollection = createAsyncThunk(
  "collections/create",
  async (
    {
      projectId,
      data,
      krapi,
    }: {
      projectId: string;
      data: {
        name: string;
        description?: string;
        fields: CollectionField[];
        indexes?: CollectionIndex[];
      };
      krapi: any;
    },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.collections.create(projectId, data);
      if (response.success && response.data) {
        return { projectId, collection: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to create collection");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create collection"
      );
    }
  }
);

export const updateCollection = createAsyncThunk(
  "collections/update",
  async (
    {
      projectId,
      collectionId,
      updates,
      krapi,
    }: {
      projectId: string;
      collectionId: string;
      updates: Partial<Collection>;
      krapi: any;
    },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.collections.update(
        projectId,
        collectionId,
        updates
      );
      if (response.success && response.data) {
        return { projectId, collection: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to update collection");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update collection"
      );
    }
  }
);

export const deleteCollection = createAsyncThunk(
  "collections/delete",
  async (
    {
      projectId,
      collectionId,
      krapi,
    }: { projectId: string; collectionId: string; krapi: any },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const response = await krapi.collections.delete(projectId, collectionId);
      if (response.success) {
        return { projectId, collectionId };
      } else {
        return rejectWithValue(response.error || "Failed to delete collection");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete collection");
    }
  }
);

// Initial state
const initialState: CollectionsState = {
  byProjectId: {},
};

// Slice
const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    clearCollections: (state: CollectionsState) => {
      state.byProjectId = {};
    },
    clearProjectCollections: (
      state: CollectionsState,
      action: PayloadAction<string>
    ) => {
      delete state.byProjectId[action.payload];
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<CollectionsState>) => {
    builder
      .addCase(
        fetchCollections.pending,
        (state: CollectionsState, action: any) => {
          // Initialize bucket if it doesn't exist
          if (!state.byProjectId[action.meta.arg.projectId]) {
            state.byProjectId[action.meta.arg.projectId] = {
              items: [],
              loading: true,
              error: null,
            };
          } else {
            state.byProjectId[action.meta.arg.projectId].loading = true;
            state.byProjectId[action.meta.arg.projectId].error = null;
          }
        }
      )
      .addCase(
        fetchCollections.fulfilled,
        (state: CollectionsState, action: any) => {
          const { projectId, collections } = action.payload;
          if (!state.byProjectId[projectId]) {
            state.byProjectId[projectId] = {
              items: [],
              loading: false,
              error: null,
            };
          }
          state.byProjectId[projectId].items = collections;
          state.byProjectId[projectId].loading = false;
          state.byProjectId[projectId].error = null;
        }
      )
      .addCase(
        fetchCollections.rejected,
        (state: CollectionsState, action: any) => {
          const projectId = action.meta.arg.projectId;
          if (!state.byProjectId[projectId]) {
            state.byProjectId[projectId] = {
              items: [],
              loading: false,
              error: null,
            };
          }
          state.byProjectId[projectId].loading = false;
          state.byProjectId[projectId].error =
            action.payload || "Failed to fetch collections";
        }
      )
      .addCase(
        createCollection.fulfilled,
        (state: CollectionsState, action: any) => {
          const { projectId, collection } = action.payload;
          if (!state.byProjectId[projectId]) {
            state.byProjectId[projectId] = {
              items: [],
              loading: false,
              error: null,
            };
          }
          state.byProjectId[projectId].items.push(collection);
          state.byProjectId[projectId].loading = false;
          state.byProjectId[projectId].error = null;
        }
      )
      .addCase(
        updateCollection.fulfilled,
        (state: CollectionsState, action: any) => {
          const { projectId, collection } = action.payload;
          if (state.byProjectId[projectId]) {
            const idx = state.byProjectId[projectId].items.findIndex(
              (c: Collection) => c.id === collection.id
            );
            if (idx !== -1) {
              state.byProjectId[projectId].items[idx] = collection;
            }
          }
          if (state.byProjectId[projectId]) {
            state.byProjectId[projectId].loading = false;
            state.byProjectId[projectId].error = null;
          }
        }
      )
      .addCase(
        deleteCollection.fulfilled,
        (state: CollectionsState, action: any) => {
          const { projectId, collectionId } = action.payload;
          if (state.byProjectId[projectId]) {
            state.byProjectId[projectId].items = state.byProjectId[
              projectId
            ].items.filter((c: Collection) => c.id !== collectionId);
          }
        }
      );
  },
});

export const { clearCollections, clearProjectCollections } =
  collectionsSlice.actions;
export default collectionsSlice.reducer;
