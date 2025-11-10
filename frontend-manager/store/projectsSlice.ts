import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

import type { Project } from "@/lib/krapi";

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
    { krapi }: { krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getAll() returns Project[] directly, not wrapped in ApiResponse
      const projects = await krapi.projects.getAll();
      return Array.isArray(projects) ? projects : [];
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
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
    { id, krapi }: { id: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK get() returns Project directly, not wrapped in ApiResponse
      const project = await krapi.projects.get(id);
      return project;
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
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK create() returns Project directly, not wrapped in ApiResponse
      const project = await krapi.projects.create(data);
      return project;
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
    }: { id: string; updates: Partial<Project>; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK update() returns Project directly, not wrapped in ApiResponse
      const project = await krapi.projects.update(id, updates);
      return project;
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
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
      .addCase(fetchProjects.fulfilled, (state: ProjectsState, action) => {
        state.items = action.payload as Project[];
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchProjects.rejected, (state: ProjectsState, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed to fetch projects";
      })
      .addCase(fetchProjectById.pending, (state: ProjectsState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchProjectById.fulfilled,
        (state: ProjectsState, action) => {
          const project = action.payload as Project;
          const idx = state.items.findIndex(
            (p: Project) => p.id === project.id
          );
          if (idx !== -1) {
            state.items[idx] = project;
          } else {
            state.items.push(project);
          }
          state.currentProject = project;
          state.loading = false;
          state.error = null;
        }
      )
      .addCase(
        fetchProjectById.rejected,
        (state: ProjectsState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "Failed to fetch project";
        }
      )
      .addCase(createProject.fulfilled, (state: ProjectsState, action) => {
        state.items.push(action.payload as Project);
        state.loading = false;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state: ProjectsState, action) => {
        const project = action.payload as Project;
        state.items = state.items.map((p: Project) =>
          p.id === project.id ? project : p
        );
        if (state.currentProject?.id === project.id) {
          state.currentProject = project;
        }
        state.loading = false;
        state.error = null;
      });
  },
});

export const { setCurrentProject, clearCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
