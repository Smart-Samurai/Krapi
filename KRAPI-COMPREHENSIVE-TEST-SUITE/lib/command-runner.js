/**
 * Command Runner
 * Executes shell commands and returns results
 */

import { exec } from "child_process";

export async function runCommand(command, options = {}) {
  return new Promise((resolve) => {
    exec(
      command,
      {
        ...options,
      },
      (error, stdout, stderr) => {
        resolve({
          success: !error,
          stdout: stdout || "",
          stderr: stderr || "",
          error,
        });
      }
    );
  });
}


