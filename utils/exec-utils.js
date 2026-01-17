/**
 * Process Execution Utilities
 * Improved exec function with full environment inheritance
 */

const { spawn } = require('child_process');

/**
 * Execute command with promise wrapper
 * Inherits full environment variables and supports cross-platform execution
 */
function execPromise(command, options = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, ...options.env };

    const proc = spawn(command, [], {
      ...options,
      env,
      shell: true,
      windowsHide: true
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        const error = new Error(stderr || `Command failed with exit code ${code}`);
        error.exitCode = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { execPromise };
