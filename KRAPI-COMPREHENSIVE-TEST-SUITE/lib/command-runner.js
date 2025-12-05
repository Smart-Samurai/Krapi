/**
 * Command Runner
 * Executes shell commands and returns results
 */

export async function runCommand(command, options = {}) {
  return new Promise((resolve) => {
    const { exec } = await import("child_process");
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


