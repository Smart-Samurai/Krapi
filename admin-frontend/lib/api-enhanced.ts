// ⚠️ WARNING: This module is not implemented yet and contains placeholder functions
// All functions in this file are marked as "not implemented" to prevent errors
// This file should be removed or properly implemented in the future

import axios, { AxiosResponse, AxiosRequestConfig } from "axios";
import { errorHandler } from "./error-handler";

// Placeholder interfaces - not implemented
interface ApiError {
  message: string;
  code?: string;
}

interface ApiContext {
  component: string;
  function: string;
  endpoint?: string;
  method?: string;
  params?: Record<string, unknown>;
}

// All functions are blocked and marked as not implemented
export const ContentAPI = {
  getAll: async (): Promise<never> => {
    console.warn("ContentAPI.getAll not implemented yet");
    throw new Error("ContentAPI.getAll not implemented yet");
  },

  getById: async (id: string): Promise<never> => {
    console.warn("ContentAPI.getById not implemented yet");
    throw new Error("ContentAPI.getById not implemented yet");
  },

  create: async (data: unknown): Promise<never> => {
    console.warn("ContentAPI.create not implemented yet");
    throw new Error("ContentAPI.create not implemented yet");
  },

  update: async (id: string, data: unknown): Promise<never> => {
    console.warn("ContentAPI.update not implemented yet");
    throw new Error("ContentAPI.update not implemented yet");
  },

  delete: async (id: string): Promise<never> => {
    console.warn("ContentAPI.delete not implemented yet");
    throw new Error("ContentAPI.delete not implemented yet");
  },

  upload: async (file: File): Promise<never> => {
    console.warn("ContentAPI.upload not implemented yet");
    throw new Error("ContentAPI.upload not implemented yet");
  },

  download: async (id: string): Promise<never> => {
    console.warn("ContentAPI.download not implemented yet");
    throw new Error("ContentAPI.download not implemented yet");
  },
};

export const RoutesAPI = {
  getAll: async (): Promise<never> => {
    console.warn("RoutesAPI.getAll not implemented yet");
    throw new Error("RoutesAPI.getAll not implemented yet");
  },

  getById: async (id: string): Promise<never> => {
    console.warn("RoutesAPI.getById not implemented yet");
    throw new Error("RoutesAPI.getById not implemented yet");
  },

  create: async (data: unknown): Promise<never> => {
    console.warn("RoutesAPI.create not implemented yet");
    throw new Error("RoutesAPI.create not implemented yet");
  },

  update: async (id: string, data: unknown): Promise<never> => {
    console.warn("RoutesAPI.update not implemented yet");
    throw new Error("RoutesAPI.update not implemented yet");
  },

  delete: async (id: string): Promise<never> => {
    console.warn("RoutesAPI.delete not implemented yet");
    throw new Error("RoutesAPI.delete not implemented yet");
  },
};

export const FilesAPI = {
  getAll: async (filters?: Record<string, unknown>): Promise<never> => {
    console.warn("FilesAPI.getAll not implemented yet");
    throw new Error("FilesAPI.getAll not implemented yet");
  },

  getById: async (id: string): Promise<never> => {
    console.warn("FilesAPI.getById not implemented yet");
    throw new Error("FilesAPI.getById not implemented yet");
  },

  upload: async (file: File): Promise<never> => {
    console.warn("FilesAPI.upload not implemented yet");
    throw new Error("FilesAPI.upload not implemented yet");
  },

  delete: async (id: string): Promise<never> => {
    console.warn("FilesAPI.delete not implemented yet");
    throw new Error("FilesAPI.delete not implemented yet");
  },

  download: async (id: string): Promise<never> => {
    console.warn("FilesAPI.download not implemented yet");
    throw new Error("FilesAPI.download not implemented yet");
  },
};

export const UsersAPI = {
  getAll: async (filters?: Record<string, unknown>): Promise<never> => {
    console.warn("UsersAPI.getAll not implemented yet");
    throw new Error("UsersAPI.getAll not implemented yet");
  },

  getById: async (id: string): Promise<never> => {
    console.warn("UsersAPI.getById not implemented yet");
    throw new Error("UsersAPI.getById not implemented yet");
  },

  create: async (data: unknown): Promise<never> => {
    console.warn("UsersAPI.create not implemented yet");
    throw new Error("UsersAPI.create not implemented yet");
  },

  update: async (id: string, data: unknown): Promise<never> => {
    console.warn("UsersAPI.update not implemented yet");
    throw new Error("UsersAPI.update not implemented yet");
  },

  delete: async (id: string): Promise<never> => {
    console.warn("UsersAPI.delete not implemented yet");
    throw new Error("UsersAPI.delete not implemented yet");
  },
};
