import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

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

// Async thunks
export const fetchDocuments = createAsyncThunk(
  "documents/fetchAll",
  async (
    {
      projectId,
      collectionId,
      krapi,
    }: { projectId: string; collectionId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.documents.getAll(projectId, collectionId);
      if (response.success && response.data) {
        return { projectId, collectionId, documents: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch documents");
      }
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
      collectionId,
      data,
      krapi,
    }: {
      projectId: string;
      collectionId: string;
      data: Record<string, unknown>;
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.documents.create(
        projectId,
        collectionId,
        data
      );
      if (response.success && response.data) {
        return { projectId, collectionId, document: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to create document");
      }
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
      collectionId,
      id,
      data,
      krapi,
    }: {
      projectId: string;
      collectionId: string;
      id: string;
      data: Record<string, unknown>;
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.documents.update(
        projectId,
        collectionId,
        id,
        data
      );
      if (response.success && response.data) {
        return { projectId, collectionId, document: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to update document");
      }
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
      collectionId,
      id,
      krapi,
    }: { projectId: string; collectionId: string; id: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.documents.delete(
        projectId,
        collectionId,
        id
      );
      if (response.success) {
        return { projectId, collectionId, id };
      } else {
        return rejectWithValue(response.error || "Failed to delete document");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete document"
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
  extraReducers: (_builder: ActionReducerMapBuilder<DocumentsState>) => {
    // Temporarily disabled to fix build issues
    // builder
    //   .addCase(fetchDocuments.pending, (state: DocumentsState) => {
    //     state.loading = true;
    //     state.error = null;
    //   })
    //   .addCase(
    //     fetchDocuments.fulfilled,
    //     (
    //       state: DocumentsState,
    //       action
    //     ) => {
    //       const { projectId, collectionId, documents } = action.payload;
    //       const key = getDocumentsKey(projectId, collectionId);
    //       state.byKey[key] = documents;
    //       state.loading = false;
    //       state.error = null;
    //     }
    //   )
    //   .addCase(
    //     fetchDocuments.rejected,
    //     (state: DocumentsState, action) => {
    //       state.loading = false;
    //       state.error = action.payload || "Failed to fetch documents";
    //     }
    //   )
    //   .addCase(
    //     createDocument.fulfilled,
    //     (
    //       state: DocumentsState,
    //       action
    //     ) => {
    //       const { projectId, collectionId, document } = action.payload;
    //       const key = getDocumentsKey(projectId, collectionId);
    //       if (!state.byKey[key]) {
    //       state.byKey[key] = [];
    //       }
    //       state.byKey[key].push(document);
    //       state.loading = false;
    //       state.error = null;
    //     }
    //   )
    //   .addCase(
    //     updateDocument.fulfilled,
    //     (
    //       state: DocumentsState,
    //       action
    //     ) => {
    //       const { projectId, collectionId, document } = action.payload;
    //       const key = getDocumentsKey(projectId, collectionId);
    //       if (state.byKey[key]) {
    //         state.byKey[key] = state.byKey[key].map((d: Document) =>
    //           d.id === document.id ? document : d
    //         );
    //       }
    //       state.loading = false;
    //       state.error = null;
    //     }
    //   )
    //   .addCase(
    //     deleteDocument.fulfilled,
    //     (
    //       state: DocumentsState,
    //       action
    //     ) => {
    //       const { projectId, collectionId, id } = action.payload;
    //       const key = getDocumentsKey(projectId, collectionId);
    //       if (state.byKey[key]) {
    //         state.byKey[key] = state.byKey[key].filter(
    //           (d: Document) => d.id !== id
    //         );
    //       }
    //       state.loading = false;
    //       state.error = null;
    //     }
    //   );
  },
});

export const { clearDocuments, clearCollectionDocuments } =
  documentsSlice.actions;
export default documentsSlice.reducer;
