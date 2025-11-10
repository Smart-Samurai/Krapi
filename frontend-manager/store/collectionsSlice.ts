import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

import type { Collection, CollectionField, CollectionIndex } from "@/lib/krapi";

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
    { projectId, krapi }: { projectId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // eslint-disable-next-line no-console
      console.log("🔍 [REDUX DEBUG] Fetching collections for project:", projectId);
      const response = await krapi.collections.getAll(projectId);
      // eslint-disable-next-line no-console
      console.log("🔍 [REDUX DEBUG] Collections getAll response:", response);
      
      // Handle different response formats
      if (Array.isArray(response)) {
        // eslint-disable-next-line no-console
        console.log("✅ [REDUX DEBUG] Response is array, returning:", response.length, "collections");
        return { projectId, collections: response };
      }
      
      if (response && typeof response === "object") {
        // Backend returns { success: true, collections: [...] }
        if ("collections" in response && Array.isArray(response.collections)) {
          // eslint-disable-next-line no-console
          console.log("✅ [REDUX DEBUG] Response has collections array, returning:", response.collections.length, "collections");
          return { projectId, collections: response.collections };
        }
        
        // Alternative format: { success: true, data: [...] }
        if ("data" in response && Array.isArray(response.data)) {
          // eslint-disable-next-line no-console
          console.log("✅ [REDUX DEBUG] Response has data array, returning:", response.data.length, "collections");
          return { projectId, collections: response.data };
        }
        
        // Check for ApiResponse format
        if ("success" in response && "data" in response) {
          const apiResponse = response as { success: boolean; data?: Collection[]; collections?: Collection[] };
          if (apiResponse.success) {
            const collections = apiResponse.collections || apiResponse.data || [];
            // eslint-disable-next-line no-console
            console.log("✅ [REDUX DEBUG] ApiResponse format, returning:", collections.length, "collections");
            return { projectId, collections };
          } else {
            // eslint-disable-next-line no-console
            console.error("❌ [REDUX DEBUG] ApiResponse failed:", (response as { error?: string }).error);
            return rejectWithValue((response as { error?: string }).error || "Failed to fetch collections");
          }
        }
      }
      
      // eslint-disable-next-line no-console
      console.warn("⚠️ [REDUX DEBUG] Unexpected response format, returning empty array:", response);
      return { projectId, collections: [] };
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("❌ [REDUX DEBUG] Exception fetching collections:", error);
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
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // eslint-disable-next-line no-console
      console.log("🔍 [REDUX DEBUG] Creating collection:", { projectId, data });
      const response = await krapi.collections.create(projectId, data);
      // eslint-disable-next-line no-console
      console.log("🔍 [REDUX DEBUG] Collection create response:", response);
      
      // If response is a Collection object directly (success case)
      if (response && typeof response === "object" && "id" in response && "name" in response) {
        // eslint-disable-next-line no-console
        console.log("✅ [REDUX DEBUG] Response is Collection object, returning:", response.id);
        return { projectId, collection: response as Collection };
      }
      
      // If response has success/data structure
      if (response && typeof response === "object" && "success" in response) {
        const apiResponse = response as { success: boolean; data?: Collection; collection?: Collection; error?: string; issues?: string[] };
        if (apiResponse.success && (apiResponse.data || apiResponse.collection)) {
          const collection = apiResponse.collection || apiResponse.data;
          // eslint-disable-next-line no-console
          console.log("✅ [REDUX DEBUG] ApiResponse success, returning collection:", collection?.id);
          return { projectId, collection: collection! };
        } else {
          // Extract detailed error message including validation issues
          const errorMessage = apiResponse.error || "Failed to create collection";
          const issues = apiResponse.issues;
          const fullError = issues && issues.length > 0 
            ? `${errorMessage}: ${issues.join(", ")}`
            : errorMessage;
          // eslint-disable-next-line no-console
          console.error("❌ [REDUX DEBUG] Collection create failed:", fullError);
          return rejectWithValue(fullError);
        }
      }
      
      // Fallback: assume response is a Collection
      // eslint-disable-next-line no-console
      console.warn("⚠️ [REDUX DEBUG] Unexpected response format, assuming Collection:", response);
      return { projectId, collection: response as Collection };
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error("❌ [REDUX DEBUG] Collection create exception:", error);
      
      // Try to extract error details from axios error
      let errorMessage = "Failed to create collection";
      let issues: string[] = [];
      
      if (error && typeof error === "object") {
        // Check for axios error with response data
        const axiosError = error as {
          response?: {
            data?: {
              error?: string;
              message?: string;
              issues?: string[];
            };
            status?: number;
          };
          message?: string;
        };
        
        if (axiosError.response?.data) {
          errorMessage = axiosError.response.data.error || axiosError.response.data.message || errorMessage;
          issues = axiosError.response.data.issues || [];
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      const fullError = issues.length > 0 
        ? `${errorMessage}: ${issues.join(", ")}`
        : errorMessage;
      
      // eslint-disable-next-line no-console
      console.error("❌ [REDUX DEBUG] Full error details:", { errorMessage, issues, fullError });
      return rejectWithValue(fullError);
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
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
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
    }: { projectId: string; collectionId: string; krapi: typeof krapi },
    { getState: _getState, rejectWithValue }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.collections.delete(projectId, collectionId);
      if (response.success) {
        return { projectId, collectionId };
      } else {
        return rejectWithValue(response.error || "Failed to delete collection");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete collection"
      );
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
        (state: CollectionsState, action) => {
          // Initialize bucket if it doesn't exist
          if (!state.byProjectId[action.meta.arg.projectId]) {
            state.byProjectId[action.meta.arg.projectId] = {
              items: [],
              loading: true,
              error: null,
            };
          } else {
            const bucket = state.byProjectId[action.meta.arg.projectId];
            if (bucket) {
              bucket.loading = true;
              bucket.error = null;
            }
          }
        }
      )
      .addCase(
        fetchCollections.fulfilled,
        (state: CollectionsState, action) => {
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
        (state: CollectionsState, action) => {
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
        (state: CollectionsState, action) => {
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
        (state: CollectionsState, action) => {
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
        (state: CollectionsState, action) => {
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
