/**
 * Test Phases Runner
 * Runs all test phases in sequence
 */

import { runAuthUITests } from "../tests/frontend-ui/auth-ui.tests.js";
import { runDashboardUITests } from "../tests/frontend-ui/dashboard-ui.tests.js";
import { runProjectsUITests } from "../tests/frontend-ui/projects-ui.tests.js";
import { runCollectionsUITests } from "../tests/frontend-ui/collections-ui.tests.js";
import { runDocumentsUITests } from "../tests/frontend-ui/documents-ui.tests.js";
import { runStorageUITests } from "../tests/frontend-ui/storage-ui.tests.js";
import { runUsersUITests } from "../tests/frontend-ui/users-ui.tests.js";
import { runAPIKeysUITests } from "../tests/frontend-ui/api-keys-ui.tests.js";
import { runEmailUITests } from "../tests/frontend-ui/email-ui.tests.js";
import { runBackupUITests } from "../tests/frontend-ui/backup-ui.tests.js";
import { runSettingsUITests } from "../tests/frontend-ui/settings-ui.tests.js";
import { runMCPUITests } from "../tests/frontend-ui/mcp-ui.tests.js";
import { runActivityUITests } from "../tests/frontend-ui/activity-ui.tests.js";
import { runUIComponentsUITests } from "../tests/frontend-ui/ui-components-ui.tests.js";
import { runDataLogicUITests } from "../tests/frontend-ui/data-logic-ui.tests.js";
import { runErrorHandlingUITests } from "../tests/frontend-ui/error-handling-ui.tests.js";
import { runPerformanceUITests } from "../tests/frontend-ui/performance-ui.tests.js";

export async function runAllPhases(testSuite, page, log, shouldExitEarly, exitEarly, ensureBrowserOnline) {
  const phases = [
    { name: "Phase 1: Authentication & Access Control", fn: runAuthUITests },
    { name: "Phase 2: Dashboard & Overview", fn: runDashboardUITests },
    { name: "Phase 3: Project Management", fn: runProjectsUITests },
    { name: "Phase 4: Collections Management", fn: runCollectionsUITests },
    { name: "Phase 5: Documents Management", fn: runDocumentsUITests },
    { name: "Phase 6: Storage & Files", fn: runStorageUITests },
    { name: "Phase 7: Users Management", fn: runUsersUITests },
    { name: "Phase 8: API Keys Management", fn: runAPIKeysUITests },
    { name: "Phase 9: Email Configuration", fn: runEmailUITests },
    { name: "Phase 10: Backup & Restore", fn: runBackupUITests },
    { name: "Phase 11: Settings & Configuration", fn: runSettingsUITests },
    { name: "Phase 12: MCP Integration", fn: runMCPUITests },
    { name: "Phase 13: Activity & Logs", fn: runActivityUITests },
    { name: "Phase 14: Visual Elements & UI Components", fn: runUIComponentsUITests },
    { name: "Phase 15: Data Loading & Display Logic", fn: runDataLogicUITests },
    { name: "Phase 16: Error Handling & Edge Cases", fn: runErrorHandlingUITests },
    { name: "Phase 17: Performance & Optimization", fn: runPerformanceUITests },
  ];

  for (const phase of phases) {
    log(`📋 ${phase.name}`, "INFO");
    try {
      await phase.fn(testSuite, page);
    } catch (error) {
      log(`❌ ${phase.name} had errors: ${error.message}`, "ERROR");
      if (process.env.STOP_ON_FIRST_FAILURE === "true") {
        throw error;
      }
    }
    
    if (shouldExitEarly()) {
      await exitEarly(`Failure rate threshold exceeded after ${phase.name}`);
      return;
    }
    
    await ensureBrowserOnline();
  }
}


