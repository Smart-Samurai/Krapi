import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { Project, ProjectStats, createDefaultKrapi } from "@/lib/krapi";

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
    _arg: void,
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.projects.getAll();
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to fetch projects");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch projects");
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  "projects/fetchById",
  async (
    { id }: { id: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.projects.getById(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to fetch project");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch project");
    }
  }
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (
    data: { name: string; description?: string; settings?: any },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.projects.create(data);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to create project");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create project");
    }
  }
);

export const updateProject = createAsyncThunk(
  "projects/update",
  async (
    { id, updates }: { id: string; updates: Partial<Project> },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.projects.update(id, updates);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error || "Failed to update project");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update project");
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
