import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import {
  FileInfo,
  StorageStats,
} from "@/lib/krapi";

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
    { projectId, krapi }: { projectId: string; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.storage.getFiles(projectId);
      if (response.success && response.data) {
        return { projectId, files: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch files");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch files"
      );
    }
  }
);

export const fetchStorageStats = createAsyncThunk(
  "storage/fetchStats",
  async (
    { projectId, krapi }: { projectId: string; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.storage.getStats(projectId);
      if (response.success && response.data) {
        // Use SDK data directly - no transformation needed
        return { projectId, stats: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch stats");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch stats"
      );
    }
  }
);

export const uploadFile = createAsyncThunk(
  "storage/uploadFile",
  async (
    {
      projectId,
      file,
      krapi,
    }: {
      projectId: string;
      file:
        | Blob
        | Buffer
        | { buffer: Buffer; originalname: string; mimetype: string };
      krapi: any;
    },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.storage.uploadFile(projectId, file);
      if (response.success && response.data) {
        return { projectId, file: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to upload file");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    }
  }
);

export const deleteFile = createAsyncThunk(
  "storage/deleteFile",
  async (
    { projectId, fileId, krapi }: { projectId: string; fileId: string; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.storage.deleteFile(projectId, fileId);
      if (response.success) {
        return { projectId, fileId };
      } else {
        return rejectWithValue(response.error || "Failed to delete file");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete file"
      );
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
