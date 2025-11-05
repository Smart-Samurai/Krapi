import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { Project, ProjectStats } from "@/lib/krapi";

// Types
export interface ProjectsState {
  items: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
}

// Async thunks
export const fetchProjects = createAsyncThunk(
  "projects/fetchAll",
  async (
    { krapi }: { krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.projects.getAll();
      console.log("🔍 [REDUX DEBUG] fetchProjects response:", response);
      
      // SDK getAll() returns Project[] directly, not wrapped in ApiResponse
      if (Array.isArray(response)) {
        console.log("✅ [REDUX DEBUG] Response is array, returning:", response.length, "projects");
        return response;
      }
      // Handle PaginatedResponse format (has data and pagination)
      if (response && typeof response === "object" && "data" in response && Array.isArray(response.data)) {
        console.log("✅ [REDUX DEBUG] Response has data array, returning:", response.data.length, "projects");
        return response.data;
      }
      // Handle ApiResponse format if SDK returns it
      if (response && typeof response === "object" && "success" in response && "data" in response) {
        if (response.success && response.data) {
          console.log("✅ [REDUX DEBUG] Response is ApiResponse, returning:", Array.isArray(response.data) ? response.data.length : "non-array", "items");
          return Array.isArray(response.data) ? response.data : [];
        } else {
          console.error("❌ [REDUX DEBUG] ApiResponse failed:", response.error);
          return rejectWithValue(response.error || "Failed to fetch projects");
        }
      }
      // If response is empty or unexpected format, return empty array
      console.warn("⚠️ [REDUX DEBUG] Unexpected response format, returning empty array:", response);
      return [];
    } catch (error: unknown) {
      console.error("❌ [REDUX DEBUG] Exception in fetchProjects:", error);
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch projects"
      );
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  "projects/fetchById",
  async (
    { id, krapi }: { id: string; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.projects.getById(id);
      if (response.success && response.data) {
        // Use SDK data directly - no transformation needed
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to fetch project");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch project"
      );
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (
    {
      data,
      krapi,
    }: {
      data: {
        name: string;
        description?: string;
        settings?: Record<string, unknown>;
      };
      krapi: any;
    },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      const response = await krapi.projects.create(data);
      if (response.success && response.data) {
        // Use SDK data directly - no transformation needed
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to create project");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create project"
      );
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async (
    {
      id,
      updates,
      krapi,
    }: { id: string; updates: Partial<Project>; krapi: any },
    {
      getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      console.log("🔍 [REDUX DEBUG] updateProject called with:", { id, updates });
      const response = await krapi.projects.update(id, updates);
      console.log("🔍 [REDUX DEBUG] updateProject response:", response);
      
      // SDK update() returns Project directly, not wrapped in ApiResponse
      if (response && typeof response === "object" && "id" in response) {
        console.log("✅ [REDUX DEBUG] Update response is Project object, returning:", response.id);
        return response;
      }
      // Handle ApiResponse format if SDK returns it
      if (response && typeof response === "object" && "success" in response && "data" in response) {
        if (response.success && response.data) {
          console.log("✅ [REDUX DEBUG] Update response is ApiResponse, returning:", response.data);
          return response.data;
        } else {
          console.error("❌ [REDUX DEBUG] Update ApiResponse failed:", response.error);
          return rejectWithValue(response.error || "Failed to update project");
        }
      }
      console.warn("⚠️ [REDUX DEBUG] Unexpected update response format:", response);
      return rejectWithValue("Failed to update project: Unexpected response format");
    } catch (error: unknown) {
      console.error("❌ [REDUX DEBUG] Exception in updateProject:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return rejectWithValue(`Failed to update project: ${errorMessage}`);
    }
  }
);

// Initial state
const initialState: ProjectsState = {
  items: [],
  currentProject: null,
  loading: false,
  error: null,
};

// Slice
const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    setCurrentProject: (
      state: ProjectsState,
      action: PayloadAction<Project>
    ) => {
      state.currentProject = action.payload;
    },
    clearCurrentProject: (state: ProjectsState) => {
      state.currentProject = null;
    },
  },
  extraReducers: (builder: ActionReducerMapBuilder<ProjectsState>) => {
    builder
      .addCase(fetchProjects.pending, (state: ProjectsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state: ProjectsState, action: any) => {
        state.items = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state: ProjectsState, action: any) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch projects";
      })
      .addCase(fetchProjectById.pending, (state: ProjectsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchProjectById.fulfilled,
        (state: ProjectsState, action: any) => {
          const idx = state.items.findIndex(
            (p: Project) => p.id === action.payload.id
          );
          if (idx !== -1) {
            state.items[idx] = action.payload;
          } else {
            state.items.push(action.payload);
          }
          state.currentProject = action.payload;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        fetchProjectById.rejected,
        (state: ProjectsState, action: any) => {
          state.loading = false;
          state.error = action.payload || "Failed to fetch project";
        }
      )
      .addCase(createProject.fulfilled, (state: ProjectsState, action: any) => {
        state.items.push(action.payload);
        state.loading = false;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state: ProjectsState, action: any) => {
        state.items = state.items.map((p: Project) =>
          p.id === action.payload.id ? action.payload : p
        );
        if (state.currentProject?.id === action.payload.id) {
          state.currentProject = action.payload;
        }
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setCurrentProject, clearCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
