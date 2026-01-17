/**
 * Logger Utility
 * Centralized logging with color support
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Log message with optional color
 */
function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

/**
 * Log success message
 */
function logSuccess(msg) {
  log(msg, colors.green);
}

/**
 * Log error message
 */
function logError(msg) {
  log(msg, colors.red);
}

/**
 * Log warning message
 */
function logWarning(msg) {
  log(msg, colors.yellow);
}

/**
 * Log info message
 */
function logInfo(msg) {
  log(msg, colors.blue);
}

/**
 * Log debug message
 */
function logDebug(msg) {
  log(msg, colors.gray);
}

module.exports = {
  log,
  logSuccess,
  logError,
  logWarning,
  logInfo,
  logDebug,
  colors,
};
