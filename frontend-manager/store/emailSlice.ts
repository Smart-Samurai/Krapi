import {
  ActionReducerMapBuilder,
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import type { KrapiWrapper } from "@smartsamurai/krapi-sdk";

import type { EmailConfig, EmailTemplate } from "@/lib/krapi";

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
    { projectId, krapi }: { projectId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getConfig() returns EmailConfig directly, not wrapped in ApiResponse
      const config = await krapi.email.getConfig(projectId);
      return { projectId, config };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch email config"
      );
    }
  }
);

export const updateEmailConfig = createAsyncThunk(
  "email/updateConfig",
  async (
    {
      projectId,
      config,
      krapi,
    }: { projectId: string; config: EmailConfig; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK updateConfig() returns EmailConfig directly, not wrapped in ApiResponse
      // SDK expects { provider: string; settings: Record<string, unknown> }
      // EmailConfig has smtp_* properties, so we need to convert it
      const emailConfig = config as unknown as {
        smtp_host: string;
        smtp_port: number;
        smtp_user: string;
        smtp_password: string;
        smtp_secure: boolean;
        from_email: string;
        from_name: string;
        reply_to?: string;
        rate_limit?: number;
        enabled: boolean;
      };
      const sdkConfig = {
        provider: "smtp", // Default to smtp
        settings: {
          smtp_host: emailConfig.smtp_host,
          smtp_port: emailConfig.smtp_port,
          smtp_user: emailConfig.smtp_user,
          smtp_password: emailConfig.smtp_password,
          smtp_secure: emailConfig.smtp_secure,
          from_email: emailConfig.from_email,
          from_name: emailConfig.from_name,
          ...(emailConfig.reply_to && { reply_to: emailConfig.reply_to }),
          ...(emailConfig.rate_limit !== undefined && { rate_limit: emailConfig.rate_limit }),
          enabled: emailConfig.enabled,
        } as Record<string, unknown>,
      };
      const updatedConfig = await krapi.email.updateConfig(projectId, sdkConfig);
      return { projectId, config: updatedConfig };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update email config"
      );
    }
  }
);

export const testEmailConfig = createAsyncThunk(
  "email/testConfig",
  async (
    {
      projectId,
      email,
      krapi,
    }: { projectId: string; email: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK testConfig() returns { success: boolean, message?: string } directly, not wrapped in ApiResponse
      const result = await krapi.email.testConfig(projectId, email);
      if (result.success) {
        return { projectId, ok: true };
      } else {
        return rejectWithValue(result.message || "Failed to test email config");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to test email config"
      );
    }
  }
);

export const fetchEmailTemplates = createAsyncThunk(
  "email/fetchTemplates",
  async (
    { projectId, krapi }: { projectId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK getTemplates() returns EmailTemplate[] directly, not wrapped in ApiResponse
      const templates = await krapi.email.getTemplates(projectId);
      return { projectId, templates: Array.isArray(templates) ? templates : [] };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch templates"
      );
    }
  }
);

export const createEmailTemplate = createAsyncThunk(
  "email/createTemplate",
  async (
    {
      projectId,
      data,
      krapi,
    }: {
      projectId: string;
      data: {
        name: string;
        subject: string;
        body: string;
        variables: string[];
      };
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK createTemplate() returns EmailTemplate directly, not wrapped in ApiResponse
      const template = await krapi.email.createTemplate(projectId, data);
      return { projectId, template };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to create template"
      );
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
      krapi,
    }: {
      projectId: string;
      templateId: string;
      updates: Partial<{
        name: string;
        subject: string;
        body: string;
        variables: string[];
      }>;
      krapi: KrapiWrapper;
    },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK updateTemplate() returns EmailTemplate directly, not wrapped in ApiResponse
      const template = await krapi.email.updateTemplate(
        projectId,
        templateId,
        updates
      );
      return { projectId, template };
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to update template"
      );
    }
  }
);

export const deleteEmailTemplate = createAsyncThunk(
  "email/deleteTemplate",
  async (
    {
      projectId,
      templateId,
      krapi,
    }: { projectId: string; templateId: string; krapi: KrapiWrapper },
    {
      getState: _getState,
      rejectWithValue,
    }: { getState: unknown; rejectWithValue: (value: string) => unknown }
  ) => {
    try {
      // SDK deleteTemplate() returns { success: boolean } directly, not wrapped in ApiResponse
      const result = await krapi.email.deleteTemplate(projectId, templateId);
      if (result.success) {
        return { projectId, templateId };
      } else {
        return rejectWithValue("Failed to delete template");
      }
    } catch (error: unknown) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to delete template"
      );
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
      .addCase(fetchEmailConfig.pending, (state: EmailState, action) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= {
          data: null,
          loading: false,
          error: null,
        };
        state.configByProjectId[projectId].loading = true;
        state.configByProjectId[projectId].error = null;
      })
      .addCase(fetchEmailConfig.fulfilled, (state: EmailState, action) => {
        const { projectId, config } = action.payload as { projectId: string; config: EmailConfig };
        state.configByProjectId[projectId] = {
          data: config,
          loading: false,
          error: null,
        };
      })
      .addCase(fetchEmailConfig.rejected, (state: EmailState, action) => {
        const { projectId } = action.meta.arg;
        state.configByProjectId[projectId] ||= {
          data: null,
          loading: false,
          error: null,
        };
        state.configByProjectId[projectId].loading = false;
        state.configByProjectId[projectId].error =
          (action.payload as string) || "Failed to fetch email config";
      })
      .addCase(
        updateEmailConfig.fulfilled,
        (state: EmailState, action) => {
          const { projectId, config } = action.payload as { projectId: string; config: EmailConfig };
          state.configByProjectId[projectId] = {
            data: config,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchEmailTemplates.pending,
        (state: EmailState, action) => {
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
        (state: EmailState, action) => {
          const { projectId, templates } = action.payload as { projectId: string; templates: EmailTemplate[] };
          state.templatesByProjectId[projectId] = {
            items: templates,
            loading: false,
            error: null,
          };
        }
      )
      .addCase(
        fetchEmailTemplates.rejected,
        (state: EmailState, action) => {
          const { projectId } = action.meta.arg;
          state.templatesByProjectId[projectId] ||= {
            items: [],
            loading: false,
            error: null,
          };
          state.templatesByProjectId[projectId].loading = false;
          state.templatesByProjectId[projectId].error =
            (action.payload as string) || "Failed to fetch templates";
        }
      )
      .addCase(
        createEmailTemplate.fulfilled,
        (state: EmailState, action) => {
          const { projectId, template } = action.payload as { projectId: string; template: EmailTemplate };
          state.templatesByProjectId[projectId]?.items.push(template);
        }
      )
      .addCase(
        updateEmailTemplate.fulfilled,
        (state: EmailState, action) => {
          const { projectId, template } = action.payload as { projectId: string; template: EmailTemplate };
          const bucket = state.templatesByProjectId[projectId];
          if (!bucket) return;
          bucket.items = bucket.items.map((t) =>
            t.id === template.id ? template : t
          );
        }
      )
      .addCase(
        deleteEmailTemplate.fulfilled,
        (state: EmailState, action) => {
          const { projectId, templateId } = action.payload as { projectId: string; templateId: string };
          const bucket = state.templatesByProjectId[projectId];
          if (!bucket) return;
          bucket.items = bucket.items.filter((t) => t.id !== templateId);
        }
      );
  },
});

export default emailSlice.reducer;
