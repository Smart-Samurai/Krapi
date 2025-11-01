/**
 * Storage HTTP Client for KRAPI SDK
 *
 * HTTP-based storage methods for frontend apps
 */

import { ApiResponse, PaginatedResponse } from "../core";
import {
  StoredFile,
  FileFolder,
  FileVersion,
  FilePermission,
  FileFilter,
  StorageStatistics,
  FileUrlRequest,
} from "../storage-service";

import { BaseHttpClient } from "./base-http-client";
export class StorageHttpClient extends BaseHttpClient {
  async getStorageInfo(projectId: string): Promise<{
    total_files: number;
    total_size: number;
    storage_used_percentage: number;
    quota: number;
  }> {
    const response = await this.get<{
      total_files: number;
      total_size: number;
      storage_used_percentage: number;
      quota: number;
    }>(`/projects/${projectId}/storage/info`);
    return response.data || {};
  }

  // File Management
  async uploadFile(
    projectId: string,
    file: File,
    options?: {
      folder_id?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      is_public?: boolean;
    }
  ): Promise<ApiResponse<StoredFile>> {
    const formData = new FormData();
    formData.append("file", file);

    if (options?.folder_id) {
      formData.append("folder_id", options.folder_id);
    }
    if (options?.tags) {
      formData.append("tags", JSON.stringify(options.tags));
    }
    if (options?.metadata) {
      formData.append("metadata", JSON.stringify(options.metadata));
    }
    if (options?.is_public !== undefined) {
      formData.append("is_public", options.is_public.toString());
    }

    return this.post<StoredFile>(
      `/projects/${projectId}/storage/upload`,
      formData
    );
  }

  async downloadFile(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<Blob>> {
    return this.get<Blob>(
      `/projects/${projectId}/storage/files/${fileId}/download`
    );
  }

  async getFile(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<StoredFile>> {
    return this.get<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}`
    );
  }

  async deleteFile(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/storage/files/${fileId}`
    );
  }

  async getFiles(
    projectId: string,
    options?: FileFilter & {
      limit?: number;
      offset?: number;
      sort_by?: string;
      sort_order?: "asc" | "desc";
    }
  ): Promise<PaginatedResponse<StoredFile>> {
    const params = new URLSearchParams();

    if (options?.folder_id) params.append("folder_id", options.folder_id);
    if (options?.mime_type) params.append("mime_type", options.mime_type);
    if (options?.file_extension)
      params.append("file_extension", options.file_extension);
    if (options?.tags) params.append("tags", JSON.stringify(options.tags));
    if (options?.uploaded_by) params.append("uploaded_by", options.uploaded_by);
    if (options?.is_public !== undefined)
      params.append("is_public", options.is_public.toString());
    if (options?.created_after)
      params.append("created_after", options.created_after);
    if (options?.created_before)
      params.append("created_before", options.created_before);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());
    if (options?.sort_by) params.append("sort_by", options.sort_by);
    if (options?.sort_order) params.append("sort_order", options.sort_order);

    const queryParams: Record<string, string> = {};
    params.forEach((value, key) => {
      queryParams[key] = value;
    });
    return this.getPaginated<StoredFile>(
      `/projects/${projectId}/storage/files`,
      queryParams
    );
  }

  // Folder Management
  async createFolder(
    projectId: string,
    folderData: {
      name: string;
      parent_id?: string;
      description?: string;
      is_public?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): Promise<ApiResponse<FileFolder>> {
    return this.post<FileFolder>(
      `/projects/${projectId}/storage/folders`,
      folderData
    );
  }

  async getFolders(
    projectId: string,
    parentFolderId?: string
  ): Promise<ApiResponse<FileFolder[]>> {
    const url = parentFolderId
      ? `/projects/${projectId}/storage/folders?parent_id=${parentFolderId}`
      : `/projects/${projectId}/storage/folders`;
    return this.get<FileFolder[]>(url);
  }

  async updateFolder(
    projectId: string,
    folderId: string,
    updates: Partial<FileFolder>
  ): Promise<ApiResponse<FileFolder>> {
    return this.put<FileFolder>(
      `/projects/${projectId}/storage/folders/${folderId}`,
      updates
    );
  }

  async deleteFolder(
    projectId: string,
    folderId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/storage/folders/${folderId}`
    );
  }

  // File Operations
  async copyFile(
    projectId: string,
    fileId: string,
    destination: {
      folder_id?: string;
      new_name?: string;
    }
  ): Promise<ApiResponse<StoredFile>> {
    return this.post<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/copy`,
      destination
    );
  }

  async moveFile(
    projectId: string,
    fileId: string,
    destination: {
      folder_id?: string;
      new_name?: string;
    }
  ): Promise<ApiResponse<StoredFile>> {
    return this.put<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/move`,
      destination
    );
  }

  async renameFile(
    projectId: string,
    fileId: string,
    newName: string
  ): Promise<ApiResponse<StoredFile>> {
    return this.put<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/rename`,
      { new_name: newName }
    );
  }

  // File Metadata
  async updateFileMetadata(
    projectId: string,
    fileId: string,
    metadata: Record<string, unknown>
  ): Promise<ApiResponse<StoredFile>> {
    return this.put<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/metadata`,
      { metadata }
    );
  }

  async addFileTags(
    projectId: string,
    fileId: string,
    tags: string[]
  ): Promise<ApiResponse<StoredFile>> {
    return this.post<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/tags`,
      { tags }
    );
  }

  async removeFileTags(
    projectId: string,
    fileId: string,
    tags: string[]
  ): Promise<ApiResponse<StoredFile>> {
    return this.delete<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/tags`,
      { tags }
    );
  }

  // File Access
  async getFileUrl(
    projectId: string,
    fileId: string,
    options?: FileUrlRequest
  ): Promise<ApiResponse<{ url: string; expires_at?: string }>> {
    const params = new URLSearchParams();
    if (options?.expires_in)
      params.append("expires_in", options.expires_in.toString());
    if (options?.access_type) params.append("access_type", options.access_type);

    const url = params.toString()
      ? `/projects/${projectId}/storage/files/${fileId}/url?${params}`
      : `/projects/${projectId}/storage/files/${fileId}/url`;

    return this.get<{ url: string; expires_at?: string }>(url);
  }

  async makeFilePublic(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<StoredFile>> {
    return this.put<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/public`,
      { is_public: true }
    );
  }

  async makeFilePrivate(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<StoredFile>> {
    return this.put<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/public`,
      { is_public: false }
    );
  }

  // File Permissions
  async getFilePermissions(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<FilePermission[]>> {
    return this.get<FilePermission[]>(
      `/projects/${projectId}/storage/files/${fileId}/permissions`
    );
  }

  async grantFilePermission(
    projectId: string,
    fileId: string,
    permission: {
      user_id?: string;
      role?: string;
      permission_type: "read" | "write" | "delete" | "admin";
      expires_at?: string;
    }
  ): Promise<ApiResponse<FilePermission>> {
    return this.post<FilePermission>(
      `/projects/${projectId}/storage/files/${fileId}/permissions`,
      permission
    );
  }

  async revokeFilePermission(
    projectId: string,
    fileId: string,
    permissionId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(
      `/projects/${projectId}/storage/files/${fileId}/permissions/${permissionId}`
    );
  }

  // File Versions
  async getFileVersions(
    projectId: string,
    fileId: string
  ): Promise<ApiResponse<FileVersion[]>> {
    return this.get<FileVersion[]>(
      `/projects/${projectId}/storage/files/${fileId}/versions`
    );
  }

  async uploadFileVersion(
    projectId: string,
    fileId: string,
    file: File
  ): Promise<ApiResponse<FileVersion>> {
    const formData = new FormData();
    formData.append("file", file);

    return this.post<FileVersion>(
      `/projects/${projectId}/storage/files/${fileId}/versions`,
      formData
    );
  }

  async restoreFileVersion(
    projectId: string,
    fileId: string,
    versionId: string
  ): Promise<ApiResponse<StoredFile>> {
    return this.post<StoredFile>(
      `/projects/${projectId}/storage/files/${fileId}/versions/${versionId}/restore`
    );
  }

  // Storage Analytics
  async getStorageStatistics(
    projectId: string
  ): Promise<ApiResponse<StorageStatistics>> {
    return this.get<StorageStatistics>(
      `/projects/${projectId}/storage/statistics`
    );
  }

  async getStorageQuota(projectId: string): Promise<
    ApiResponse<{
      used: number;
      limit: number;
      percentage: number;
    }>
  > {
    return this.get<{
      used: number;
      limit: number;
      percentage: number;
    }>(`/projects/${projectId}/storage/quota`);
  }

  // Bulk Operations
  async bulkDeleteFiles(
    projectId: string,
    fileIds: string[]
  ): Promise<ApiResponse<{ success: boolean; deleted_count: number }>> {
    return this.post<{ success: boolean; deleted_count: number }>(
      `/projects/${projectId}/storage/bulk-delete`,
      { file_ids: fileIds }
    );
  }

  async bulkMoveFiles(
    projectId: string,
    fileIds: string[],
    destination: {
      folder_id?: string;
    }
  ): Promise<ApiResponse<{ success: boolean; moved_count: number }>> {
    return this.post<{ success: boolean; moved_count: number }>(
      `/projects/${projectId}/storage/bulk-move`,
      {
        file_ids: fileIds,
        destination,
      }
    );
  }

  async bulkUpdateMetadata(
    projectId: string,
    fileIds: string[],
    metadata: Record<string, unknown>
  ): Promise<ApiResponse<{ success: boolean; updated_count: number }>> {
    return this.post<{ success: boolean; updated_count: number }>(
      `/projects/${projectId}/storage/bulk-update-metadata`,
      {
        file_ids: fileIds,
        metadata,
      }
    );
  }
}
