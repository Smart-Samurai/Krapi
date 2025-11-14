import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
  PayloadAction,
} from "@reduxjs/toolkit";

import type { Project } from "@/lib/krapi";

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
    _args: Record<string, never> = {},
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

      const response = await fetch("/api/projects", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch projects" }));
        return rejectWithValue(error.error || "Failed to fetch projects");
      }

      const result = await response.json();
      return result.success ? (result.data || result.projects || []) : [];
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch projects"
      );
    }
  }
);

export const fetchProjectById = createAsyncThunk(
  "projects/fetchById",
  async (
    { id }: { id: string },
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

      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to fetch project" }));
        return rejectWithValue(error.error || "Failed to fetch project");
      }

      const result = await response.json();
      return result.success ? (result.data || result.project) : null;
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
    }: {
      data: {
        name: string;
        description?: string;
        settings?: Record<string, unknown>;
      };
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

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to create project" }));
        return rejectWithValue(error.error || "Failed to create project");
      }

      const result = await response.json();
      return result.success ? (result.data || result.project) : null;
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
    }: { id: string; updates: Partial<Project> },
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

      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to update project" }));
        return rejectWithValue(error.error || "Failed to update project");
      }

      const result = await response.json();
      return result.success ? (result.data || result.project) : null;
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update project"
      );
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
