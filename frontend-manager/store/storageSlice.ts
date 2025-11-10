import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

import type {
  FileInfo,
  StorageStats,
  StorageStatistics,
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
    { projectId, krapi }: { projectId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getFiles() returns FileInfo[] directly, not wrapped in ApiResponse
      const files = await krapi.storage.getFiles(projectId);
      return { projectId, files: Array.isArray(files) ? files : [] };
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
    { projectId, krapi }: { projectId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getStatistics() returns stats object directly, not wrapped in ApiResponse
      const stats = await krapi.storage.getStatistics(projectId);
      return { projectId, stats };
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
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK uploadFile() returns FileInfo directly, not wrapped in ApiResponse
      const fileInfo = await krapi.storage.uploadFile(projectId, file as File);
      return { projectId, file: fileInfo };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to upload file"
      );
    }
  }
);

export const updateFile = createAsyncThunk(
  "storage/updateFile",
  async (
    {
      projectId: _projectId,
      fileId: _fileId,
      updates: _updates,
      krapi: _krapi,
    }: {
      projectId: string;
      fileId: string;
      updates: {
        original_name?: string;
        metadata?: Record<string, unknown>;
        folder_id?: string | null;
      };
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // NOTE: updateFile is not exposed in KrapiWrapper - this method doesn't exist in the SDK
      // The SDK only has updateFileMetadata in the HTTP client, but it's not exposed in KrapiWrapper
      // This needs to be implemented in the SDK first before it can be used here
      throw new Error("updateFile is not available in the SDK. Please use updateFileMetadata through the HTTP client or implement updateFile in the SDK.");
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update file"
      );
    }
  }
);

export const deleteFile = createAsyncThunk(
  "storage/deleteFile",
  async (
    { projectId, fileId, krapi }: { projectId: string; fileId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK deleteFile() returns { success: boolean } directly, not wrapped in ApiResponse
      const result = await krapi.storage.deleteFile(projectId, fileId);
      if (result.success) {
        return { projectId, fileId };
      } else {
        return rejectWithValue("Failed to delete file");
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
      .addCase(fetchFiles.pending, (state: StorageState, action) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.filesByProjectId[projectId].loading = true;
        state.filesByProjectId[projectId].error = null;
      })
      .addCase(fetchFiles.fulfilled, (state: StorageState, action) => {
        const { projectId, files } = action.payload as { projectId: string; files: FileInfo[] };
        state.filesByProjectId[projectId] = {
          items: files,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchFiles.rejected, (state: StorageState, action) => {
        const { projectId } = action.meta.arg;
        state.filesByProjectId[projectId] ||= {
          items: [],
          loading: false,
          error: null,
        };
        state.filesByProjectId[projectId].loading = false;
        state.filesByProjectId[projectId].error =
          (action.payload as string) || "Failed to fetch files";
      })
      .addCase(uploadFile.fulfilled, (state: StorageState, action) => {
        const { projectId, file } = action.payload as { projectId: string; file: FileInfo };
        state.filesByProjectId[projectId]?.items.unshift(file);
      })
      .addCase(updateFile.fulfilled, (state: StorageState, action) => {
        const { projectId, file } = action.payload as { projectId: string; file: FileInfo };
        const bucket = state.filesByProjectId[projectId];
        if (!bucket) return;
        const index = bucket.items.findIndex((f) => f.id === file.id);
        if (index >= 0) {
          bucket.items[index] = file;
        }
      })
      .addCase(deleteFile.fulfilled, (state: StorageState, action) => {
        const { projectId, fileId } = action.payload as { projectId: string; fileId: string };
        const bucket = state.filesByProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((f) => f.id !== fileId);
      })
      .addCase(
        fetchStorageStats.pending,
        (state: StorageState, action) => {
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
        (state: StorageState, action) => {
          const { projectId, stats } = action.payload as { projectId: string; stats: StorageStatistics };
          state.statsByProjectId[projectId] = {
            data: stats,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchStorageStats.rejected,
        (state: StorageState, action) => {
          const { projectId } = action.meta.arg;
          state.statsByProjectId[projectId] ||= {
            data: null,
            loading: false,
            error: null,
          };
          state.statsByProjectId[projectId].loading = false;
          state.statsByProjectId[projectId].error =
            (action.payload as string) || "Failed to fetch stats";
        }
      );
  },
});

export default storageSlice.reducer;
