/**
 * Base API client configuration
 */

import axios, { AxiosInstance } from 'axios';
import { config } from './config';

// Create axios instance with proper configuration
export const api: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: config.api.timeout,
  withCredentials: false,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  // Only add token if we're in a browser environment
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors globally
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);