/**
 * File System Utilities
 * Reusable file system operations
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Get directory size recursively
 */
async function getDirectorySize(dirPath) {
  let size = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        size += stats.size;
      } else if (entry.isDirectory()) {
        size += await getDirectorySize(fullPath);
      }
    }
  } catch (error) {
    // If directory doesn't exist or can't be read, return 0
    return 0;
  }

  return size;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });

  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
    } else {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

/**
 * Ensure directory exists, create if not
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if already exists
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Ensure file exists, create with default content if not
 */
async function ensureFile(filePath, defaultContent) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, defaultContent);
  }
}

/**
 * Read JSON file safely
 */
async function readJsonFile(filePath, defaultValue = {}) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

/**
 * Write JSON file with pretty format
 */
async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Remove directory or file safely
 */
async function safeRemove(targetPath) {
  try {
    await fs.rm(targetPath, { recursive: true, force: true });
  } catch {
    // Ignore errors if path doesn't exist
  }
}

module.exports = {
  getDirectorySize,
  copyDirectory,
  ensureDirectory,
  ensureFile,
  readJsonFile,
  writeJsonFile,
  safeRemove,
};
