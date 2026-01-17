#!/usr/bin/env node

/**
 * Universal Skill Hub - Web Server (Refactored)
 *
 * 跨工具通用 Skills 管理系统
 * 支持 Claude Code, Cursor, Windsurf 等所有 AI 编程工具
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import configuration
const { createConfig } = require('./config');

// Import utilities
const fileUtils = require('./utils/file-utils');
const skillUtils = require('./utils/skill-utils');
const execUtils = require('./utils/exec-utils');
const logger = require('./utils/logger');

// Import routes
const createSkillsRoutes = require('./routes/skills');
const createProjectsRoutes = require('./routes/projects');
const createSettingsRoutes = require('./routes/settings');
const createTagsRoutes = require('./routes/tags');

// Bundle utilities for routes
const utils = {
  fileUtils,
  skillUtils,
  execUtils,
  logger,
};

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Initialize server and configuration
 */
async function start() {
  const { log, logSuccess, logInfo, logDebug } = logger;

  // Load configuration
  const CONFIG = await createConfig();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.static(CONFIG.webUiDir));

  // Initialize routes
  app.use('/api/skills', createSkillsRoutes(CONFIG, utils));
  app.use('/api/projects', createProjectsRoutes(CONFIG, utils));
  app.use('/api/settings', createSettingsRoutes(CONFIG, utils));
  app.use('/api/tags', createTagsRoutes(CONFIG, utils));

  // Ensure hub structure exists
  await ensureHubStructure(CONFIG);

  // Start server
  app.listen(PORT, () => {
    log('');
    logSuccess('🚀 Universal Skill Hub 已启动!');
    logInfo(`📁 Hub 目录: ${CONFIG.hubRoot}`);
    logInfo(`🌐 Web UI: http://localhost:${PORT}`);
    logInfo(`📚 Skills 目录: ${CONFIG.skillsDir}`);
    log('');
    logDebug('按 Ctrl+C 停止服务器');
    log('');
  });
}

/**
 * Ensure Hub directory structure exists
 */
async function ensureHubStructure(CONFIG) {
  const { ensureDirectory, ensureFile, writeJsonFile } = fileUtils;
  const { logDebug } = logger;

  const dirs = [
    CONFIG.hubRoot,
    CONFIG.skillsDir,
    CONFIG.projectsDir,
    CONFIG.tempDir,
  ];

  for (const dir of dirs) {
    await ensureDirectory(dir);
  }

  // Create empty manifest file
  await ensureFile(
    CONFIG.projectsFile,
    JSON.stringify({ projects: {} }, null, 2)
  );

  // Create empty registry file
  await ensureFile(
    CONFIG.registryFile,
    JSON.stringify({ skills: {} }, null, 2)
  );

  logDebug('Hub 结构初始化完成');
}

// Start the server
start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
