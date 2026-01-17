/**
 * Configuration Module
 * Centralized configuration management for Universal Skill Hub
 */

const path = require('path');
const os = require('os');
const fs = require('fs').promises;

/**
 * Get default hub root directory based on platform
 */
function getDefaultHubRoot() {
  const home = os.homedir();
  return process.platform === 'win32'
    ? path.join(home, 'skills-hub')
    : path.join(home, '.skills-hub');
}

/**
 * Load configuration from .hub-config.json if exists
 */
async function loadConfigFromFile(hubRoot) {
  try {
    const configPath = path.join(hubRoot, '.hub-config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config.hubRoot || hubRoot;
  } catch {
    return hubRoot;
  }
}

/**
 * Initialize and export configuration
 */
async function createConfig() {
  const envHubRoot = process.env.HUB_ROOT;
  const defaultHubRoot = getDefaultHubRoot();
  const initialHubRoot = envHubRoot || defaultHubRoot;

  // Check if there's a config file override
  const hubRoot = await loadConfigFromFile(initialHubRoot);

  return {
    hubRoot,
    skillsDir: path.join(hubRoot, 'skills'),
    projectsDir: path.join(hubRoot, 'projects'),
    projectsFile: path.join(hubRoot, 'projects', 'project-manifest.json'),
    registryFile: path.join(hubRoot, 'registry.json'),
    tempDir: path.join(hubRoot, 'temp'),
    webUiDir: path.join(__dirname, 'web-ui'),
  };
}

module.exports = { createConfig, getDefaultHubRoot };
