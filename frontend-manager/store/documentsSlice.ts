import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type { Document } from "@/lib/krapi";

// Types
export interface DocumentsState {
  byKey: Record<string, Document[]>;
  loading: boolean;
  error: string | null;
}

// Helper function to generate key
const getDocumentsKey = (projectId: string, collectionId: string) =>
  `${projectId}:${collectionId}`;

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

// Async thunks
export const fetchDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (
    {
      projectId,
      collectionName,
    }: { projectId: string; collectionName: string },
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
        `/api/client/krapi/k1/projects/${projectId}/collections/${collectionName}/documents`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies in request
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch documents" }));
        return rejectWithValue(error.error || "Failed to fetch documents");
      }

      const result = await response.json();
      // API returns { success: true, data: [...] }
      const documents = result.success ? (result.data || []) : [];
      return { projectId, collectionId: collectionName, documents: Array.isArray(documents) ? documents : [] };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch documents"
      );
    }
  }
);

export const createDocument = createAsyncThunk(
  "documents/create",
  async (
    {
      projectId,
      collectionName,
      data,
    }: {
      projectId: string;
      collectionName: string;
      data: Record<string, unknown>;
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

      const response = await fetch(
        `/api/client/krapi/k1/projects/${projectId}/collections/${collectionName}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
          credentials: "include", // Include cookies in request
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create document" }));
        return rejectWithValue(error.error || "Failed to create document");
      }

      const result = await response.json();
      // API returns { success: true, data: document }
      if (result.success && result.data) {
        return { projectId, collectionId: collectionName, document: result.data as Document };
      }
      return rejectWithValue("Failed to create document: Invalid response");
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create document"
      );
    }
  }
);

export const updateDocument = createAsyncThunk(
  "documents/update",
  async (
    {
      projectId,
      collectionName,
      id,
      data,
    }: {
      projectId: string;
      collectionName: string;
      id: string;
      data: Record<string, unknown>;
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

      const response = await fetch(
        `/api/client/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data }),
          credentials: "include", // Include cookies in request
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update document" }));
        return rejectWithValue(error.error || "Failed to update document");
      }

      const result = await response.json();
      // API returns { success: true, data: document }
      const document = result.success && result.data ? result.data : null;
      return { projectId, collectionId: collectionName, document: document as Document | null };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update document"
      );
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "documents/delete",
  async (
    {
      projectId,
      collectionName,
      id,
    }: { projectId: string; collectionName: string; id: string },
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
        `/api/client/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include", // Include cookies in request
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to delete document" }));
        return rejectWithValue(error.error || "Failed to delete document");
      }

      const result = await response.json();
      if (result.success) {
        return { projectId, collectionId: collectionName, id };
      } else {
        return rejectWithValue("Failed to delete document");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete document"
      );
    }
  }
);

export const searchDocuments = createAsyncThunk(
  "documents/search",
  async (
    {
      projectId,
      collectionName,
      query,
      sessionToken,
    }: {
      projectId: string;
      collectionName: string;
      query: string;
      sessionToken: string;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await fetch(
        `/api/krapi/k1/projects/${projectId}/collections/${collectionName}/documents/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            query,
            text: query,
            limit: 100,
            offset: 0,
          }),
          credentials: "include", // Include cookies in request
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Search failed" }));
        throw new Error(error.error || "Search failed");
      }

      const result = await response.json();
      if (result.success && result.data) {
        return {
          projectId,
          collectionId: collectionName,
          documents: Array.isArray(result.data) ? result.data : [result.data],
        };
      } else {
        return rejectWithValue("Search returned no results");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to search documents"
      );
    }
  }
);

// Initial state
const initialState: DocumentsState = {
  byKey: {},
  loading: false,
  error: null,
};

// Slice
const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {
    clearDocuments: (state: DocumentsState) => {
      state.byKey = {};
      state.error = null;
    },
    clearCollectionDocuments: (
      state: DocumentsState,
      action: PayloadAction<{ projectId: string; collectionId: string }>
    ) => {
      const { projectId, collectionId } = action.payload;
      const key = getDocumentsKey(projectId, collectionId);
      delete state.byKey[key];
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<DocumentsState>) => {
    // Search documents
    builder
      .addCase(searchDocuments.pending, (state: DocumentsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        searchDocuments.fulfilled,
        (
          state: DocumentsState,
          action
        ) => {
          const payload = action.payload as { projectId: string; collectionId: string; documents: Document[] };
          const { projectId, collectionId, documents } = payload;
          const key = getDocumentsKey(projectId, collectionId);
          state.byKey[key] = documents;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        searchDocuments.rejected,
        (state: DocumentsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to search documents";
        }
      )
      .addCase(fetchDocuments.pending, (state: DocumentsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDocuments.fulfilled,
        (
          state: DocumentsState,
          action
        ) => {
          const payload = action.payload as { projectId: string; collectionId: string; documents: Document[] };
          const { projectId, collectionId, documents } = payload;
          const key = getDocumentsKey(projectId, collectionId);
          // Replace the array - server response is authoritative
          state.byKey[key] = documents;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        fetchDocuments.rejected,
        (state: DocumentsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to fetch documents";
        }
      )
      .addCase(
        createDocument.fulfilled,
        (
          state: DocumentsState,
          action
        ) => {
          const payload = action.payload as { projectId: string; collectionId: string; document: Document | null };
          const { projectId, collectionId, document } = payload;
          if (!document) return;
          const key = getDocumentsKey(projectId, collectionId);
          if (!state.byKey[key]) {
            state.byKey[key] = [];
          }
          state.byKey[key].push(document);
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        createDocument.rejected,
        (state: DocumentsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to create document";
        }
      )
      .addCase(
        updateDocument.fulfilled,
        (
          state: DocumentsState,
          action
        ) => {
          const payload = action.payload as { projectId: string; collectionId: string; document: Document | null };
          const { projectId, collectionId, document } = payload;
          if (!document) return;
          const key = getDocumentsKey(projectId, collectionId);
          if (state.byKey[key]) {
            state.byKey[key] = state.byKey[key].map((d: Document) =>
              d.id === document.id ? document : d
            );
          }
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        updateDocument.rejected,
        (state: DocumentsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to update document";
        }
      )
      .addCase(
        deleteDocument.fulfilled,
        (
          state: DocumentsState,
          action
        ) => {
          const payload = action.payload as { projectId: string; collectionId: string; id: string };
          const { projectId, collectionId, id } = payload;
          const key = getDocumentsKey(projectId, collectionId);
          if (state.byKey[key]) {
            state.byKey[key] = state.byKey[key].filter(
              (d: Document) => d.id !== id
            );
          }
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        deleteDocument.rejected,
        (state: DocumentsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to delete document";
        }
      );
  },
});

export const { clearDocuments, clearCollectionDocuments } =
  documentsSlice.actions;
export default documentsSlice.reducer;
