import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { FileInfo, StorageStats } from "@/lib/krapi";
import { buildKrapiFromState } from "./helpers";

interface FilesBucket {
  items: FileInfo[];
  loading: boolean;
  error: string | null;
}

interface StatsBucket {
  data: StorageStats | null;
  loading: boolean;
  error: string | null;
}

interface StorageState {
  filesByProjectId: Record<string, FilesBucket>;
  statsByProjectId: Record<string, StatsBucket>;
}

const initialState: StorageState = {
  filesByProjectId: {},
  statsByProjectId: {},
};

export const fetchFiles = createAsyncThunk<
  { projectId: string; files: FileInfo[] },
  { projectId: string },
  { state: RootState }
>("storage/fetchFiles", async ({ projectId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.storage.getFiles(projectId);
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch files");
    return { projectId, files: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const fetchStorageStats = createAsyncThunk<
  { projectId: string; stats: StorageStats },
  { projectId: string },
  { state: RootState }
>("storage/fetchStats", async ({ projectId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.storage.getStats(projectId);
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch stats");
    return { projectId, stats: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const uploadFile = createAsyncThunk<
  { projectId: string; file: FileInfo },
  { projectId: string; file: Blob | Buffer | { buffer: Buffer; originalname: string; mimetype: string } },
  { state: RootState }
>("storage/uploadFile", async ({ projectId, file }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.storage.uploadFile(projectId, file as any);
    if (!res.success || !res.data) return rejectWithValue("Failed to upload file");
    return { projectId, file: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Upload error");
  }
});

export const deleteFile = createAsyncThunk<
  { projectId: string; fileId: string },
  { projectId: string; fileId: string },
  { state: RootState }
>("storage/deleteFile", async ({ projectId, fileId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.storage.deleteFile(projectId, fileId);
    if (!res.success) return rejectWithValue("Failed to delete file");
    return { projectId, fileId };
  } catch (e: any) {
    return rejectWithValue(e.message || "Delete error");
  }
});

const storageSlice = createSlice({
  name: "storage",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFiles.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.filesByProjectId[projectId].loading = true;
        state.filesByProjectId[projectId].error = null;
      })
      .addCase(fetchFiles.fulfilled, (state, action) => {
        const { projectId, files } = action.payload;
        state.filesByProjectId[projectId] = { items: files, loading: false, error: null };
      })
      .addCase(fetchFiles.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.filesByProjectId[projectId].loading = false;
        state.filesByProjectId[projectId].error = (action.payload as string) || "Failed";
      })
      .addCase(uploadFile.fulfilled, (state, action) => {
        const { projectId, file } = action.payload;
        state.filesByProjectId[projectId]?.items.unshift(file);
      })
      .addCase(deleteFile.fulfilled, (state, action) => {
        const { projectId, fileId } = action.payload;
        const bucket = state.filesByProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((f) => f.id !== fileId);
      })
      .addCase(fetchStorageStats.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.statsByProjectId[projectId] ||= { data: null, loading: false, error: null };
        state.statsByProjectId[projectId].loading = true;
        state.statsByProjectId[projectId].error = null;
      })
      .addCase(fetchStorageStats.fulfilled, (state, action) => {
        const { projectId, stats } = action.payload;
        state.statsByProjectId[projectId] = { data: stats, loading: false, error: null };
      })
      .addCase(fetchStorageStats.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.statsByProjectId[projectId] ||= { data: null, loading: false, error: null };
        state.statsByProjectId[projectId].loading = false;
        state.statsByProjectId[projectId].error = (action.payload as string) || "Failed";
      });
  },
});

export default storageSlice.reducer;