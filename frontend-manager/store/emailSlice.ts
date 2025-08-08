import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "./index";
import type { EmailConfig, EmailTemplate } from "@/lib/krapi";
import { buildKrapiFromState } from "./helpers";

interface EmailStateBucket<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface EmailTemplatesBucket {
  items: EmailTemplate[];
  loading: boolean;
  error: string | null;
}

interface EmailState {
  configByProjectId: Record<string, EmailStateBucket<EmailConfig>>;
  templatesByProjectId: Record<string, EmailTemplatesBucket>;
}

const initialState: EmailState = {
  configByProjectId: {},
  templatesByProjectId: {},
};

export const fetchEmailConfig = createAsyncThunk<
  { projectId: string; config: EmailConfig },
  { projectId: string },
  { state: RootState }
>("email/fetchConfig", async ({ projectId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.getConfig(projectId);
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch email config");
    return { projectId, config: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const updateEmailConfig = createAsyncThunk<
  { projectId: string; config: EmailConfig },
  { projectId: string; config: EmailConfig },
  { state: RootState }
>("email/updateConfig", async ({ projectId, config }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.updateConfig(projectId, config);
    if (!res.success || !res.data) return rejectWithValue("Failed to update email config");
    return { projectId, config: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Update error");
  }
});

export const testEmailConfig = createAsyncThunk<
  { projectId: string; ok: boolean },
  { projectId: string; email: string },
  { state: RootState }
>("email/testConfig", async ({ projectId, email }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.testConfig(projectId, email);
    if (!res.success) return rejectWithValue("Failed to test email config");
    return { projectId, ok: true };
  } catch (e: any) {
    return rejectWithValue(e.message || "Test error");
  }
});

export const fetchEmailTemplates = createAsyncThunk<
  { projectId: string; templates: EmailTemplate[] },
  { projectId: string },
  { state: RootState }
>("email/fetchTemplates", async ({ projectId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.getTemplates(projectId, { limit: 200 });
    if (!res.success || !res.data) return rejectWithValue("Failed to fetch templates");
    const templates = Array.isArray((res as any).data) ? ((res as any).data as EmailTemplate[]) : ((res as any).data.items as EmailTemplate[]);
    return { projectId, templates };
  } catch (e: any) {
    return rejectWithValue(e.message || "Fetch error");
  }
});

export const createEmailTemplate = createAsyncThunk<
  { projectId: string; template: EmailTemplate },
  { projectId: string; payload: { name: string; subject: string; body: string; variables: string[] } },
  { state: RootState }
>("email/createTemplate", async ({ projectId, payload }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.createTemplate(projectId, payload);
    if (!res.success || !res.data) return rejectWithValue("Failed to create template");
    return { projectId, template: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Create error");
  }
});

export const updateEmailTemplate = createAsyncThunk<
  { projectId: string; template: EmailTemplate },
  { projectId: string; templateId: string; updates: Partial<{ name: string; subject: string; body: string; variables: string[] }> },
  { state: RootState }
>("email/updateTemplate", async ({ projectId, templateId, updates }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.updateTemplate(projectId, templateId, updates);
    if (!res.success || !res.data) return rejectWithValue("Failed to update template");
    return { projectId, template: res.data };
  } catch (e: any) {
    return rejectWithValue(e.message || "Update error");
  }
});

export const deleteEmailTemplate = createAsyncThunk<
  { projectId: string; templateId: string },
  { projectId: string; templateId: string },
  { state: RootState }
>("email/deleteTemplate", async ({ projectId, templateId }, { getState, rejectWithValue }) => {
  try {
    const sdk = buildKrapiFromState(getState());
    const res = await sdk.email.deleteTemplate(projectId, templateId);
    if (!res.success) return rejectWithValue("Failed to delete template");
    return { projectId, templateId };
  } catch (e: any) {
    return rejectWithValue(e.message || "Delete error");
  }
});

const emailSlice = createSlice({
  name: "email",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEmailConfig.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= { data: null, loading: false, error: null };
        state.configByProjectId[projectId].loading = true;
        state.configByProjectId[projectId].error = null;
      })
      .addCase(fetchEmailConfig.fulfilled, (state, action) => {
        const { projectId, config } = action.payload;
        state.configByProjectId[projectId] = { data: config, loading: false, error: null };
      })
      .addCase(fetchEmailConfig.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= { data: null, loading: false, error: null };
        state.configByProjectId[projectId].loading = false;
        state.configByProjectId[projectId].error = (action.payload as string) || "Failed";
      })
      .addCase(updateEmailConfig.fulfilled, (state, action) => {
        const { projectId, config } = action.payload;
        state.configByProjectId[projectId] = { data: config, loading: false, error: null };
      })
      .addCase(fetchEmailTemplates.pending, (state, action) => {
        const { projectId } = action.meta.arg;
        state.templatesByProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.templatesByProjectId[projectId].loading = true;
        state.templatesByProjectId[projectId].error = null;
      })
      .addCase(fetchEmailTemplates.fulfilled, (state, action) => {
        const { projectId, templates } = action.payload;
        state.templatesByProjectId[projectId] = { items: templates, loading: false, error: null };
      })
      .addCase(fetchEmailTemplates.rejected, (state, action) => {
        const { projectId } = action.meta.arg;
        state.templatesByProjectId[projectId] ||= { items: [], loading: false, error: null };
        state.templatesByProjectId[projectId].loading = false;
        state.templatesByProjectId[projectId].error = (action.payload as string) || "Failed";
      })
      .addCase(createEmailTemplate.fulfilled, (state, action) => {
        const { projectId, template } = action.payload;
        state.templatesByProjectId[projectId]?.items.push(template);
      })
      .addCase(updateEmailTemplate.fulfilled, (state, action) => {
        const { projectId, template } = action.payload;
        const bucket = state.templatesByProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.map((t) => (t.id === template.id ? template : t));
      })
      .addCase(deleteEmailTemplate.fulfilled, (state, action) => {
        const { projectId, templateId } = action.payload;
        const bucket = state.templatesByProjectId[projectId];
        if (!bucket) return;
        bucket.items = bucket.items.filter((t) => t.id !== templateId);
      });
  },
});

export default emailSlice.reducer;