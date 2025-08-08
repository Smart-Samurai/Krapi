import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Project } from "@/lib/krapi";
import type { RootState } from "./index";
import { buildKrapiFromState } from "./helpers";

interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

const initialState: ProjectsState = {
  items: [],
  loading: false,
  error: null,
};

export const fetchProjects = createAsyncThunk<Project[], void, { state: RootState }>(
  "projects/fetchAll",
  async (_arg, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.projects.getAll();
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to fetch projects");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Fetch error");
    }
  }
);

export const createProject = createAsyncThunk<Project, { name: string; description?: string }, { state: RootState }>(
  "projects/create",
  async (data, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.projects.create(data);
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to create project");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Create error");
    }
  }
);

export const updateProject = createAsyncThunk<Project, { id: string; updates: Partial<Project> }, { state: RootState }>(
  "projects/update",
  async ({ id, updates }, { getState, rejectWithValue }) => {
    try {
      const sdk = buildKrapiFromState(getState());
      const res = await sdk.projects.update(id, updates);
      if (!res.success || !res.data) return rejectWithValue(res.error || "Failed to update project");
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e.message || "Update error");
    }
  }
);

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "Failed";
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        state.items = state.items.map((p) => (p.id === action.payload.id ? action.payload : p));
      });
  },
});

export default projectsSlice.reducer;