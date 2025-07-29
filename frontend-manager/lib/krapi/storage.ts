import KrapiClient, { KrapiResponse } from "./client";
import { FileInfo } from "./types";

export class KrapiStorage {
  private client: KrapiClient;

  constructor(client: KrapiClient) {
    this.client = client;
  }

  // List files
  async listFiles(params?: {
    projectId?: string;
  }): Promise<KrapiResponse<FileInfo[]>> {
    return this.client.request("storage", "files", "list", params);
  }

  // Get file info
  async getFile(fileId: string): Promise<KrapiResponse<FileInfo>> {
    return this.client.request("storage", "files", "get", { fileId });
  }

  // Upload file
  async uploadFile(
    file: File,
          metadata?: Record<string, unknown>
  ): Promise<KrapiResponse<FileInfo>> {
    const formData = new FormData();
    formData.append("file", file);

    if (metadata) {
      formData.append("metadata", JSON.stringify(metadata));
    }

    try {
      const response = await this.client
        .getAxiosInstance()
        .post("/storage/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
      return response.data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  // Delete file
  async deleteFile(fileId: string): Promise<KrapiResponse> {
    return this.client.request("storage", "files", "delete", { fileId });
  }

  // Download file
  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.client
      .getAxiosInstance()
      .get(`/storage/download/${fileId}`, {
        responseType: "blob",
      });
    return response.data;
  }

  // Get file URL
  getFileUrl(fileId: string): string {
    return `${
      this.client.getAxiosInstance().defaults.baseURL
    }/storage/download/${fileId}`;
  }
}

// Create storage instance from client
export function createKrapiStorage(client: KrapiClient): KrapiStorage {
  return new KrapiStorage(client);
}
