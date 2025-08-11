import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { FileInfo, StorageStats, createDefaultKrapi } from "@/lib/krapi";

// Types
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

export interface StorageState {
  filesByProjectId: Record<string, FilesBucket>;
  statsByProjectId: Record<string, StatsBucket>;
}

// Initial state
const initialState: StorageState = {
  filesByProjectId: {},
  statsByProjectId: {},
};

// Async thunks
export const fetchFiles = createAsyncThunk(
  "storage/fetchFiles",
  async (
    { projectId }: { projectId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.storage.getFiles(projectId);
      if (response.success && response.data) {
        return { projectId, files: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch files");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch files");
    }
  }
);

export const fetchStorageStats = createAsyncThunk(
  "storage/fetchStats",
  async (
    { projectId }: { projectId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.storage.getStats(projectId);
      if (response.success && response.data) {
        return { projectId, stats: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch stats");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch stats");
    }
  }
);

export const uploadFile = createAsyncThunk(
  "storage/uploadFile",
  async (
    {
      projectId,
      file,
    }: {
      projectId: string;
      file:
        | Blob
        | Buffer
        | { buffer: Buffer; originalname: string; mimetype: string };
    },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.storage.uploadFile(projectId, file as any);
      if (response.success && response.data) {
        return { projectId, file: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to upload file");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to upload file");
    }
  }
);

export const deleteFile = createAsyncThunk(
  "storage/deleteFile",
  async (
    { projectId, fileId }: { projectId: string; fileId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.storage.deleteFile(projectId, fileId);
      if (response.success) {
        return { projectId, fileId };
      } else {
        return rejectWithValue(response.error || "Failed to delete file");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete file");
    }
  }
);

// Slice
const storageSlice = createSlice({
  name: "storage",
  initialState,
  reducers: {},
  extraReducers: (builder: ActionReducerMapBuilder<StorageState>) => {
    builder
      .addCase(fetchFiles.pending, (state: StorageState, action: any) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.filesByProjectId[projectId].loading = true;
        state.filesByProjectId[projectId].error = null;
      })
      .addCase(fetchFiles.fulfilled, (state: StorageState, action: any) => {
        const { projectId, files } = action.payload;
        state.filesByProjectId[projectId] = {
          items: files,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchFiles.rejected, (state: StorageState, action: any) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.filesByProjectId[projectId].loading = false;
        state.filesByProjectId[projectId].error =
          action.payload || "Failed to fetch files";
      })
      .addCase(uploadFile.fulfilled, (state: StorageState, action: any) => {
        const { projectId, file } = action.payload;
        state.filesByProjectId[projectId]?.items.unshift(file);
      })
      .addCase(deleteFile.fulfilled, (state: StorageState, action: any) => {
        const { projectId, fileId } = action.payload;
        const bucket = state.filesByProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((f) => f.id !== fileId);
      })
      .addCase(
        fetchStorageStats.pending,
        (state: StorageState, action: any) => {
          const { projectId } = action.meta.arg;
          state.statsByProjectId[projectId] ||= {
            data: null,
            loading: false,
            error: null,
          };
          state.statsByProjectId[projectId].loading = true;
          state.statsByProjectId[projectId].error = null;
        }
      )
      .addCase(
        fetchStorageStats.fulfilled,
        (state: StorageState, action: any) => {
          const { projectId, stats } = action.payload;
          state.statsByProjectId[projectId] = {
            data: stats,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchStorageStats.rejected,
        (state: StorageState, action: any) => {
          const { projectId } = action.meta.arg;
          state.statsByProjectId[projectId] ||= {
            data: null,
            loading: false,
            error: null,
          };
          state.statsByProjectId[projectId].loading = false;
          state.statsByProjectId[projectId].error =
            action.payload || "Failed to fetch stats";
        }
      );
  },
});

export default storageSlice.reducer;
