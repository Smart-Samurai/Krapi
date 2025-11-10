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
      // SDK getAll() returns Collection[] directly, not wrapped in ApiResponse
      const collections = await krapi.collections.getAll(projectId);
      return { projectId, collections: Array.isArray(collections) ? collections : [] };
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
      // SDK create() returns Collection directly, not wrapped in ApiResponse
      // Convert FieldDefinition[] to SDK format (validation needs to be Record<string, unknown>)
      const sdkData = {
        name: data.name,
        description: data.description,
        fields: data.fields.map((field) => ({
          name: field.name,
          type: field.type as string,
          required: field.required,
          unique: field.unique,
          indexed: field.indexed,
          default: field.default_value ?? field.default,
          validation: field.validation ? (field.validation as Record<string, unknown>) : undefined,
        })),
        indexes: data.indexes?.map((idx) => ({
          name: idx.name,
          fields: idx.fields,
          unique: idx.unique,
        })),
      };
      const collection = await krapi.collections.create(projectId, sdkData);
      return { projectId, collection };
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
      // SDK update() returns Collection directly, not wrapped in ApiResponse
      // Convert updates to SDK format (validation needs to be Record<string, unknown>)
      const sdkUpdates: {
        description?: string;
        fields?: Array<{
          name: string;
          type: string;
          required?: boolean;
          unique?: boolean;
          indexed?: boolean;
          default?: unknown;
          validation?: Record<string, unknown>;
        }>;
        indexes?: Array<{
          name: string;
          fields: string[];
          unique?: boolean;
        }>;
      } = {};
      if (updates.description !== undefined) sdkUpdates.description = updates.description;
      if (updates.fields) {
        sdkUpdates.fields = updates.fields.map((field) => ({
          name: field.name,
          type: field.type as string,
          required: field.required,
          unique: field.unique,
          indexed: field.indexed,
          default: field.default_value ?? field.default,
          validation: field.validation ? (field.validation as Record<string, unknown>) : undefined,
        }));
      }
      if (updates.indexes) {
        sdkUpdates.indexes = updates.indexes.map((idx) => ({
          name: idx.name,
          fields: idx.fields,
          unique: idx.unique,
        }));
      }
      const collection = await krapi.collections.update(
        projectId,
        collectionId,
        sdkUpdates
      );
      return { projectId, collection };
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
    }: { projectId: string; collectionId: string; krapi: KrapiWrapper },
    { getState: _getState, rejectWithValue }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK delete() returns { success: boolean } directly, not wrapped in ApiResponse
      const result = await krapi.collections.delete(projectId, collectionId);
      if (result.success) {
        return { projectId, collectionId };
      } else {
        return rejectWithValue("Failed to delete collection");
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
          const { projectId, collections } = action.payload as { projectId: string; collections: Collection[] };
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
            (action.payload as string) || "Failed to fetch collections";
        }
      )
      .addCase(
        createCollection.fulfilled,
        (state: CollectionsState, action) => {
          const { projectId, collection } = action.payload as { projectId: string; collection: Collection };
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
          const { projectId, collection } = action.payload as { projectId: string; collection: Collection };
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
          const { projectId, collectionId } = action.payload as { projectId: string; collectionId: string };
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
