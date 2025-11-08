/**
 * Testing HTTP Client for KRAPI SDK
 * 
 * HTTP-based testing methods for frontend applications.
 * Provides test project management, test execution, and data seeding.
 * 
 * @module http-clients/testing-http-client
 * @example
 * const client = new TestingHttpClient({ baseUrl: 'https://api.example.com' });
 * const testProject = await client.createTestProject({ name: 'test-project' });
 */
import { ApiResponse } from "../core";

import { BaseHttpClient } from "./base-http-client";

/**
 * Testing HTTP Client
 * 
 * HTTP client for testing operations.
 * 
 * @class TestingHttpClient
 * @extends {BaseHttpClient}
 * @example
 * const client = new TestingHttpClient({ baseUrl: 'https://api.example.com' });
 * const results = await client.runTests();
 */
export class TestingHttpClient extends BaseHttpClient {
  // Test Project Management
  async createTestProject(options?: {
    name?: string;
    with_collections?: boolean;
    with_documents?: boolean;
    document_count?: number;
  }): Promise<ApiResponse<Record<string, unknown>>> {
    return this.post<Record<string, unknown>>(
      "/testing/projects",
      options || {}
    );
  }

  async cleanup(projectId?: string): Promise<
    ApiResponse<{
      success: boolean;
      deleted: {
        projects: number;
        collections: number;
        documents: number;
        files: number;
        users: number;
      };
    }>
  > {
    const url = projectId
      ? `/testing/cleanup?project_id=${projectId}`
      : "/testing/cleanup";
    return this.delete<{
      success: boolean;
      deleted: {
        projects: number;
        collections: number;
        documents: number;
        files: number;
        users: number;
      };
    }>(url);
  }

  async runTests(testSuite?: string): Promise<
    ApiResponse<{
      results: Array<{
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          error?: string;
          duration: number;
        }>;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }>
  > {
    const url = testSuite ? `/testing/run?suite=${testSuite}` : "/testing/run";
    return this.post<{
      results: Array<{
        suite: string;
        tests: Array<{
          name: string;
          passed: boolean;
          error?: string;
          duration: number;
        }>;
      }>;
      summary: {
        total: number;
        passed: number;
        failed: number;
        duration: number;
      };
    }>(url);
  }

  async seedData(
    projectId: string,
    seedType: string,
    options?: Record<string, unknown>
  ): Promise<
    ApiResponse<{
      success: boolean;
      created: Record<string, number>;
    }>
  > {
    return this.post<{
      success: boolean;
      created: Record<string, number>;
    }>(`/testing/seed/${projectId}`, { seed_type: seedType, ...options });
  }

  // Test Data Management
  async getTestProjects(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.get<Record<string, unknown>[]>("/testing/projects");
  }

  async deleteTestProject(
    projectId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.delete<{ success: boolean }>(`/testing/projects/${projectId}`);
  }

  async resetTestData(
    projectId?: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    const url = projectId
      ? `/testing/reset?project_id=${projectId}`
      : "/testing/reset";
    return this.post<{ success: boolean }>(url);
  }

  // Test Scenarios
  async runScenario(
    scenarioName: string,
    options?: Record<string, unknown>
  ): Promise<
    ApiResponse<{
      success: boolean;
      results: Record<string, unknown>;
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      results: Record<string, unknown>;
      duration: number;
    }>(`/testing/scenarios/${scenarioName}`, options);
  }

  async getAvailableScenarios(): Promise<ApiResponse<string[]>> {
    return this.get<string[]>("/testing/scenarios");
  }

  // Performance Testing
  async runPerformanceTest(testConfig: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    iterations: number;
    concurrent_users: number;
    payload?: Record<string, unknown>;
  }): Promise<
    ApiResponse<{
      success: boolean;
      results: {
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        average_response_time: number;
        min_response_time: number;
        max_response_time: number;
        requests_per_second: number;
        errors: Array<{ status: number; message: string; count: number }>;
      };
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      results: {
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        average_response_time: number;
        min_response_time: number;
        max_response_time: number;
        requests_per_second: number;
        errors: Array<{ status: number; message: string; count: number }>;
      };
      duration: number;
    }>("/testing/performance", testConfig);
  }

  // Load Testing
  async runLoadTest(testConfig: {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    duration_seconds: number;
    users_per_second: number;
    payload?: Record<string, unknown>;
  }): Promise<
    ApiResponse<{
      success: boolean;
      results: {
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        average_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
        requests_per_second: number;
        errors: Array<{ status: number; message: string; count: number }>;
      };
      duration: number;
    }>
  > {
    return this.post<{
      success: boolean;
      results: {
        total_requests: number;
        successful_requests: number;
        failed_requests: number;
        average_response_time: number;
        p95_response_time: number;
        p99_response_time: number;
        requests_per_second: number;
        errors: Array<{ status: number; message: string; count: number }>;
      };
      duration: number;
    }>("/testing/load", testConfig);
  }
}
