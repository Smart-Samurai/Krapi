import {
  createSlice,
  createAsyncThunk,
  PayloadAction,
  ActionReducerMapBuilder,
} from "@reduxjs/toolkit";
import { EmailConfig, EmailTemplate, createDefaultKrapi } from "@/lib/krapi";

// Types
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

export interface EmailState {
  configByProjectId: Record<string, EmailStateBucket<EmailConfig>>;
  templatesByProjectId: Record<string, EmailTemplatesBucket>;
}

// Initial state
const initialState: EmailState = {
  configByProjectId: {},
  templatesByProjectId: {},
};

// Async thunks
export const fetchEmailConfig = createAsyncThunk(
  "email/fetchConfig",
  async (
    { projectId }: { projectId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.getConfig(projectId);
      if (response.success && response.data) {
        return { projectId, config: response.data };
      } else {
        return rejectWithValue(
          response.error || "Failed to fetch email config"
        );
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch email config");
    }
  }
);

export const updateEmailConfig = createAsyncThunk(
  "email/updateConfig",
  async (
    { projectId, config }: { projectId: string; config: EmailConfig },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.updateConfig(projectId, config);
      if (response.success && response.data) {
        return { projectId, config: response.data };
      } else {
        return rejectWithValue(
          response.error || "Failed to update email config"
        );
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update email config");
    }
  }
);

export const testEmailConfig = createAsyncThunk(
  "email/testConfig",
  async (
    { projectId, email }: { projectId: string; email: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.testConfig(projectId, email);
      if (response.success) {
        return { projectId, ok: true };
      } else {
        return rejectWithValue(response.error || "Failed to test email config");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to test email config");
    }
  }
);

export const fetchEmailTemplates = createAsyncThunk(
  "email/fetchTemplates",
  async (
    { projectId }: { projectId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.getTemplates(projectId);
      if (response.success && response.data) {
        return { projectId, templates: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to fetch templates");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch templates");
    }
  }
);

export const createEmailTemplate = createAsyncThunk(
  "email/createTemplate",
  async (
    {
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
      };
    },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.createTemplate(projectId, data);
      if (response.success && response.data) {
        return { projectId, template: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to create template");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create template");
    }
  }
);

export const updateEmailTemplate = createAsyncThunk(
  "email/updateTemplate",
  async (
    {
      projectId,
      templateId,
      updates,
    }: {
      projectId: string;
      templateId: string;
      updates: Partial<{
        name: string;
        subject: string;
        body: string;
        variables: string[];
      }>;
    },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.updateTemplate(
        projectId,
        templateId,
        updates
      );
      if (response.success && response.data) {
        return { projectId, template: response.data };
      } else {
        return rejectWithValue(response.error || "Failed to update template");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update template");
    }
  }
);

export const deleteEmailTemplate = createAsyncThunk(
  "email/deleteTemplate",
  async (
    { projectId, templateId }: { projectId: string; templateId: string },
    { getState, rejectWithValue }: { getState: any; rejectWithValue: any }
  ) => {
    try {
      const client = createDefaultKrapi();
      const response = await client.email.deleteTemplate(projectId, templateId);
      if (response.success) {
        return { projectId, templateId };
      } else {
        return rejectWithValue(response.error || "Failed to delete template");
      }
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete template");
    }
  }
);

// Slice
const emailSlice = createSlice({
  name: "email",
  initialState,
  reducers: {},
  extraReducers: (builder: ActionReducerMapBuilder<EmailState>) => {
    builder
      .addCase(fetchEmailConfig.pending, (state: EmailState, action: any) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= {
          data: null,
          loading: false,
          error: null,
        };
        state.configByProjectId[projectId].loading = true;
        state.configByProjectId[projectId].error = null;
      })
      .addCase(fetchEmailConfig.fulfilled, (state: EmailState, action: any) => {
        const { projectId, config } = action.payload;
        state.configByProjectId[projectId] = {
          data: config,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchEmailConfig.rejected, (state: EmailState, action: any) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= {
          data: null,
          loading: false,
          error: null,
        };
        state.configByProjectId[projectId].loading = false;
        state.configByProjectId[projectId].error =
          action.payload || "Failed to fetch email config";
      })
      .addCase(
        updateEmailConfig.fulfilled,
        (state: EmailState, action: any) => {
          const { projectId, config } = action.payload;
          state.configByProjectId[projectId] = {
            data: config,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchEmailTemplates.pending,
        (state: EmailState, action: any) => {
          const { projectId } = action.meta.arg;
          state.templatesByProjectId[projectId] ||= {
            items: [],
            loading: false,
            error: null,
          };
          state.templatesByProjectId[projectId].loading = true;
          state.templatesByProjectId[projectId].error = null;
        }
      )
      .addCase(
        fetchEmailTemplates.fulfilled,
        (state: EmailState, action: any) => {
          const { projectId, templates } = action.payload;
          state.templatesByProjectId[projectId] = {
            items: templates,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchEmailTemplates.rejected,
        (state: EmailState, action: any) => {
          const { projectId } = action.meta.arg;
          state.templatesByProjectId[projectId] ||= {
            items: [],
            loading: false,
            error: null,
          };
          state.templatesByProjectId[projectId].loading = false;
          state.templatesByProjectId[projectId].error =
            action.payload || "Failed to fetch templates";
        }
      )
      .addCase(
        createEmailTemplate.fulfilled,
        (state: EmailState, action: any) => {
          const { projectId, template } = action.payload;
          state.templatesByProjectId[projectId]?.items.push(template);
        }
      )
      .addCase(
        updateEmailTemplate.fulfilled,
        (state: EmailState, action: any) => {
          const { projectId, template } = action.payload;
          const bucket = state.templatesByProjectId[projectId];
          if (!bucket) return;
          bucket.items = bucket.items.map((t) =>
            t.id === template.id ? template : t
          );
        }
      )
      .addCase(
        deleteEmailTemplate.fulfilled,
        (state: EmailState, action: any) => {
          const { projectId, templateId } = action.payload;
          const bucket = state.templatesByProjectId[projectId];
          if (!bucket) return;
          bucket.items = bucket.items.filter((t) => t.id !== templateId);
        }
      );
  },
});

export default emailSlice.reducer;
