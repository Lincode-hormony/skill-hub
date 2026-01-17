/**
 * Settings Routes
 * API endpoints for settings management
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const os = require('os');

/**
 * Initialize settings routes with config
 */
function createSettingsRoutes(CONFIG, utils) {
  const { readJsonFile, writeJsonFile, safeRemove, copyDirectory, ensureDirectory } = utils.fileUtils;
  const { logSuccess, logError, logInfo } = utils.logger;
  const fs = require('fs').promises;

  /**
   * GET /api/settings
   * Get current settings
   */
  router.get('/', async (req, res) => {
    try {
      const settings = {
        hubRoot: CONFIG.hubRoot,
        skillsDir: CONFIG.skillsDir,
        projectsFile: CONFIG.projectsFile,
        registryFile: CONFIG.registryFile,
      };

      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/settings/storage
   * Update storage location with optional migration
   */
  router.put('/storage', async (req, res) => {
    const { newHubRoot, migrate } = req.body;

    if (!newHubRoot) {
      return res.status(400).json({ error: '需要指定新的存储路径' });
    }

    try {
      // Expand ~ in path
      let expandedPath = newHubRoot;
      if (newHubRoot.startsWith('~/')) {
        expandedPath = path.join(os.homedir(), newHubRoot.substring(2));
      } else if (newHubRoot === '~') {
        expandedPath = os.homedir();
      }

      logInfo(`\n⚙️ 更新存储位置...`);
      logInfo(`当前路径: ${CONFIG.hubRoot}`);
      logInfo(`新路径: ${expandedPath}`);

      // Check if new path is writable
      try {
        await ensureDirectory(expandedPath);
        await fs.access(expandedPath, fs.constants.W_OK);
      } catch (error) {
        return res.status(400).json({ error: `无法访问新路径: ${error.message}` });
      }

      // Migrate data if requested
      if (migrate) {
        logInfo('开始迁移数据...');

        const oldSkillsDir = CONFIG.skillsDir;
        const oldRegistryFile = CONFIG.registryFile;
        const oldProjectsDir = path.join(CONFIG.hubRoot, 'projects');

        const newSkillsDir = path.join(expandedPath, 'skills');
        const newRegistryFile = path.join(expandedPath, 'registry.json');
        const newProjectsDir = path.join(expandedPath, 'projects');

        // Create new directory structure
        await ensureDirectory(newSkillsDir);
        await ensureDirectory(newProjectsDir);

        // Migrate skills
        const oldSkills = await fs.readdir(oldSkillsDir);
        for (const skill of oldSkills) {
          const oldPath = path.join(oldSkillsDir, skill);
          const newPath = path.join(newSkillsDir, skill);
          const stat = await fs.stat(oldPath);
          if (stat.isDirectory()) {
            // Recursive copy directory
            await copyDirectory(oldPath, newPath);
          } else {
            await fs.copyFile(oldPath, newPath);
          }
          logSuccess(`✓ 复制: ${skill}`);
        }

        // Migrate registry
        const registryContent = await fs.readFile(oldRegistryFile, 'utf-8');
        await fs.writeFile(newRegistryFile, registryContent);

        // Migrate projects
        const oldProjectsManifest = path.join(oldProjectsDir, 'project-manifest.json');
        try {
          const projectsContent = await fs.readFile(oldProjectsManifest, 'utf-8');
          await fs.writeFile(path.join(newProjectsDir, 'project-manifest.json'), projectsContent);
        } catch {}

        logSuccess('✅ 数据迁移完成');
      }

      // Update config file (create .hub-config.json in original hub root)
      const configPath = path.join(CONFIG.hubRoot, '.hub-config.json');
      await fs.writeFile(
        configPath,
        JSON.stringify({ hubRoot: expandedPath, updatedAt: new Date().toISOString() }, null, 2)
      );

      logSuccess(`✅ 配置已更新，请重启服务器以应用新路径`);

      res.json({
        success: true,
        message: '存储位置已更新，请重启服务器',
        needsRestart: true
      });
    } catch (error) {
      logError(`✗ 更新失败: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createSettingsRoutes;
