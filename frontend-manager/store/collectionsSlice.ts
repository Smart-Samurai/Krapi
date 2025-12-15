import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type { Collection, CollectionField, CollectionIndex } from "@/lib/krapi";

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
    { projectId }: { projectId: string },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        // eslint-disable-next-line no-console
        console.error("[CollectionsSlice] No auth token found in cookies/localStorage");
        return rejectWithValue("Authentication required");
      }

      // eslint-disable-next-line no-console
      console.log("[CollectionsSlice] Fetching collections for project:", projectId, "Token exists:", !!token);

      const response = await fetch(`/api/krapi/k1/projects/${projectId}/collections`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies in request
      });

      // eslint-disable-next-line no-console
      console.log("[CollectionsSlice] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch collections" }));
        // eslint-disable-next-line no-console
        console.error("[CollectionsSlice] API error:", error);
        return rejectWithValue(error.error || "Failed to fetch collections");
      }

      const result = await response.json();
      // API returns { success: true, collections: [...] }
      const collections = result.success ? (result.collections || result.data || []) : [];
      return { projectId, collections: Array.isArray(collections) ? collections : [] };
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
    }: {
      projectId: string;
      data: {
        name: string;
        description?: string;
        fields: CollectionField[];
        indexes?: CollectionIndex[];
      };
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

      // Convert fields to SDK format
      const sdkData = {
        name: data.name,
        description: data.description,
        fields: data.fields.map((field) => ({
          name: field.name,
          type: field.type as string,
          required: field.required,
          unique: field.unique,
          indexed: field.indexed,
          default: (field as { default_value?: unknown; default?: unknown }).default_value ?? (field as { default_value?: unknown; default?: unknown }).default,
          validation: (field as { validation?: Record<string, unknown> }).validation,
        })),
        indexes: data.indexes?.map((idx) => ({
          name: idx.name,
          fields: idx.fields,
          unique: idx.unique,
        })),
      };

      const response = await fetch(`/api/krapi/k1/projects/${projectId}/collections`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sdkData),
        credentials: "include", // Include cookies in request
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create collection" }));
        const errorData = error.error || error.message || "Failed to create collection";
        const issues = error.issues || [];
        const fullError = issues.length > 0 
          ? `${errorData}: ${issues.join(", ")}`
          : errorData;
        return rejectWithValue(fullError);
      }

      const result = await response.json();
      // API returns { success: true, collection: {...} }
      return { projectId, collection: result.success ? (result.collection || result.data) : null };
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
    }: {
      projectId: string;
      collectionId: string;
      updates: Partial<Collection>;
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

      // Convert updates to SDK format
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
          default: (field as { default_value?: unknown; default?: unknown }).default_value ?? (field as { default_value?: unknown; default?: unknown }).default,
          validation: (field as { validation?: Record<string, unknown> }).validation,
        }));
      }
      if (updates.indexes) {
        sdkUpdates.indexes = updates.indexes.map((idx) => ({
          name: idx.name,
          fields: idx.fields,
          unique: idx.unique,
        }));
      }

      const response = await fetch(`/api/krapi/k1/projects/${projectId}/collections/${collectionId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sdkUpdates),
        credentials: "include", // Include cookies in request
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update collection" }));
        return rejectWithValue(error.error || "Failed to update collection");
      }

      const result = await response.json();
      // API returns { success: true, collection: {...} }
      return { projectId, collection: result.success ? (result.collection || result.data) : null };
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
    }: { projectId: string; collectionId: string },
    { getState: _getState, rejectWithValue }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const token = getAuthToken();
      if (!token) {
        return rejectWithValue("Authentication required");
      }

      const response = await fetch(`/api/krapi/k1/projects/${projectId}/collections/${collectionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies in request
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete collection" }));
        return rejectWithValue(error.error || "Failed to delete collection");
      }

      const result = await response.json();
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
