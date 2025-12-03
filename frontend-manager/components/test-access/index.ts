/**
 * Test Access Components
 *
 * Components for the test-access page.
 *
 * @module components/test-access
 */

export { HealthStatusCard } from "./HealthStatusCard";
export { TestProjectsCard } from "./TestProjectsCard";
export { DiagnosticsCard } from "./DiagnosticsCard";
export { IntegrationTestsCard } from "./IntegrationTestsCard";
export { useTestAccess } from "./useTestAccess";

export type {
  TestResult,
  TestSuite,
  HealthCheck,
  DiagnosticResult,
  TestProject,
  RunningState,
} from "./types";

export type { UseTestAccessReturn } from "./useTestAccess";

