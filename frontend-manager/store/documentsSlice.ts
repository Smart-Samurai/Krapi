import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { Document } from "@/lib/krapi";
import { buildKrapiFromState } from "./helpers";

interface Bucket {
  items: Document[];
  loading: boolean;
  error: string | null;
}
interface DocumentsState {
  byKey: Record<string, Bucket>; // key = `${projectId}:${collectionId}`
}

const initialState: DocumentsState = { byKey: {} };

const keyOf = (projectId: string, collectionId: string) => `${projectId}:${collectionId}`;

export const fetchDocuments = createAsyncThunk<
  { projectId: string; collectionId: string; data: Document[] },
  { projectId: string; collectionId: string },
  { state: RootState }
>("documents/fetchAll", async ({ projectId, collectionId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.documents.getAll(projectId, collectionId, { limit: 200 });
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch documents");
    const data = Array.isArray((res as any).data) ? ((res as any).data as Document[]) : ((res as any).data.items as Document[]);
    return { projectId, collectionId, data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const createDocument = createAsyncThunk<
  { projectId: string; collectionId: string; doc: Document },
  { projectId: string; collectionId: string; data: Record<string, any> },
  { state: RootState }
>("documents/create", async ({ projectId, collectionId, data }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.documents.create(projectId, collectionId, data);
    if (!res.success || !res.data) return rejectWithValue("Failed to create document");
    return { projectId, collectionId, doc: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Create error");
  }
});

export const updateDocument = createAsyncThunk<
  { projectId: string; collectionId: string; doc: Document },
  { projectId: string; collectionId: string; id: string; data: Record<string, any> },
  { state: RootState }
>("documents/update", async ({ projectId, collectionId, id, data }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.documents.update(projectId, collectionId, id, data);
    if (!res.success || !res.data) return rejectWithValue("Failed to update document");
    return { projectId, collectionId, doc: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Update error");
  }
});

export const deleteDocument = createAsyncThunk<
  { projectId: string; collectionId: string; id: string },
  { projectId: string; collectionId: string; id: string },
  { state: RootState }
>("documents/delete", async ({ projectId, collectionId, id }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.documents.delete(projectId, collectionId, id);
    if (!res.success) return rejectWithValue("Failed to delete document");
    return { projectId, collectionId, id };
  } catch (e: any) {
    return rejectWithValue(e.message || "Delete error");
  }
});

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state, action) => {
        const { projectId, collectionId } = action.meta.arg;
        const key = keyOf(projectId, collectionId);
        state.byKey[key] ||= { items: [], loading: false, error: null };
        state.byKey[key].loading = true;
        state.byKey[key].error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        const { projectId, collectionId, data } = action.payload;
        const key = keyOf(projectId, collectionId);
        state.byKey[key] = { items: data, loading: false, error: null };
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        const { projectId, collectionId } = action.meta.arg;
        const key = keyOf(projectId, collectionId);
        state.byKey[key] ||= { items: [], loading: false, error: null };
        state.byKey[key].loading = false;
        state.byKey[key].error = (action.payload as string) || "Failed";
      })
      .addCase(createDocument.fulfilled, (state, action) => {
        const { projectId, collectionId, doc } = action.payload;
        const key = keyOf(projectId, collectionId);
        state.byKey[key]?.items.push(doc);
      })
      .addCase(updateDocument.fulfilled, (state, action) => {
        const { projectId, collectionId, doc } = action.payload;
        const key = keyOf(projectId, collectionId);
        const bucket = state.byKey[key];
        if (!bucket) return;
        bucket.items = bucket.items.map((d) => (d.id === doc.id ? doc : d));
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        const { projectId, collectionId, id } = action.payload;
        const key = keyOf(projectId, collectionId);
        const bucket = state.byKey[key];
        if (!bucket) return;
        bucket.items = bucket.items.filter((d) => d.id !== id);
      });
  },
});

export default documentsSlice.reducer;