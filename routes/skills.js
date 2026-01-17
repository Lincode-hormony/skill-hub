/**
 * Skills Routes
 * API endpoints for skill management
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const os = require('os');

/**
 * Initialize skills routes with config
 */
function createSkillsRoutes(CONFIG, utils) {
  const { readJsonFile, writeJsonFile, safeRemove, copyDirectory, ensureDirectory } = utils.fileUtils;
  const { findAllSkillsInRepo, getSkillDescription, updateSkillRegistry, parseGitHubSource } = utils.skillUtils;
  const { execPromise } = utils.execUtils;
  const { logSuccess, logError, logWarning, logInfo, log } = utils.logger;

  /**
   * GET /api/skills
   * Get all installed skills with optional filtering
   */
  router.get('/', async (req, res) => {
    try {
      const { tags, q } = req.query;
      const skills = [];

      // Read registry for custom info
      const registryData = await readJsonFile(CONFIG.registryFile, { skills: {} });

      // Scan skills directory
      const entries = await require('fs').promises.readdir(CONFIG.skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(CONFIG.skillsDir, entry.name);

          try {
            const description = await getSkillDescription(skillPath);
            const size = await utils.fileUtils.getDirectorySize(skillPath);

            // Get custom info from registry
            const customInfo = registryData.skills[entry.name] || {};

            skills.push({
              name: entry.name,
              displayName: customInfo.displayName || entry.name,
              description,
              tags: customInfo.tags || [],
              size,
              path: skillPath,
            });
          } catch {
            // Skip invalid skills
          }
        }
      }

      // Apply filters
      let filtered = skills;

      // Filter by tags
      if (tags) {
        const filterTags = tags.split(',');
        filtered = filtered.filter(s =>
          filterTags.some(t => s.tags.includes(t))
        );
      }

      // Search by query
      if (q) {
        const query = q.toLowerCase();
        filtered = filtered.filter(s =>
          s.displayName.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some(t => t.toLowerCase().includes(query))
        );
      }

      res.json({
        skills: filtered.sort((a, b) => a.displayName.localeCompare(b.displayName))
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/skills/:name
   * Update skill custom name and tags
   */
  router.put('/:name', async (req, res) => {
    const { name } = req.params;
    const { displayName, tags } = req.body;

    try {
      logInfo(`\n🏷️ 更新 skill: ${name}`);

      // Read registry
      const registry = await readJsonFile(CONFIG.registryFile, { skills: {} });

      // Ensure skill exists in registry
      if (!registry.skills[name]) {
        registry.skills[name] = {};
      }

      // Update custom info
      if (displayName !== undefined) {
        registry.skills[name].displayName = displayName;
      }
      if (tags !== undefined) {
        registry.skills[name].tags = tags;
      }

      // Save registry
      await writeJsonFile(CONFIG.registryFile, registry);

      logSuccess(`✓ 更新成功: ${displayName || name} (${tags?.join(', ') || '无标签'})`);

      res.json({
        success: true,
        message: `Skill "${name}" 已更新`
      });
    } catch (error) {
      logError(`✗ 更新失败: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/skills/:name/uninstall
   * Uninstall a skill with dependency check
   */
  router.delete('/:name/uninstall', async (req, res) => {
    const { name } = req.params;

    try {
      logInfo(`\n🗑️ 卸载 skill: ${name}`);

      // Check dependencies
      const manifest = await readJsonFile(CONFIG.projectsFile, { projects: {} });
      const dependentProjects = [];

      Object.entries(manifest.projects || {}).forEach(([projName, proj]) => {
        const skillsList = proj.skills || [];
        if (skillsList.includes(name)) {
          dependentProjects.push(projName);
        }
      });

      if (dependentProjects.length > 0) {
        return res.status(409).json({
          error: '无法卸载',
          reason: '该 skill 正在被以下项目使用',
          projects: dependentProjects
        });
      }

      // Delete skill directory
      const skillPath = path.join(CONFIG.skillsDir, name);
      await safeRemove(skillPath);

      // Remove from registry
      const registry = await readJsonFile(CONFIG.registryFile, { skills: {} });
      delete registry.skills[name];
      await writeJsonFile(CONFIG.registryFile, registry);

      res.json({
        success: true,
        message: `Skill "${name}" 已卸载`
      });

      logSuccess(`✅ 卸载完成\n`);
    } catch (error) {
      logError(`✗ 卸载失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/skills/preview
   * Preview GitHub repository skills before installation
   */
  router.post('/preview', async (req, res) => {
    const { source } = req.body;

    if (!source) {
      return res.status(400).json({ error: '需要指定 source' });
    }

    logInfo(`\n🔍 预览 ${source}...`);

    const tempDir = path.join(CONFIG.tempDir, `preview-${Date.now()}`);

    try {
      const { repoUrl, subpath } = parseGitHubSource(source);

      // Clone repository
      logInfo(`克隆仓库 ${repoUrl}...`);
      await execPromise(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}"`);

      // Determine scan directory
      const scanDir = subpath ? path.join(tempDir, subpath) : tempDir;

      // Find all skills
      const allSkills = await findAllSkillsInRepo(scanDir);

      // Clean up temp directory
      await safeRemove(tempDir);

      if (allSkills.length === 0) {
        return res.status(404).json({
          error: '未找到任何 skills',
          hint: '请确保仓库包含 SKILL.md 文件'
        });
      }

      // Format response
      const formattedSkills = allSkills.map(s => ({
        name: s.name,
        description: s.description,
      }));

      res.json({
        success: true,
        source,
        repoUrl,
        isSingle: allSkills.length === 1,
        count: allSkills.length,
        skills: formattedSkills,
      });

      logSuccess(`✓ 找到 ${allSkills.length} 个 skill(s)\n`);
    } catch (error) {
      await safeRemove(tempDir);
      logError(`✗ 预览失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/skills/install
   * Install selected skills from GitHub
   */
  router.post('/install', async (req, res) => {
    const { source, skills: selectedSkills } = req.body;

    if (!source) {
      return res.status(400).json({ error: '需要指定 source' });
    }

    if (!selectedSkills || selectedSkills.length === 0) {
      return res.status(400).json({ error: '需要选择至少一个 skill' });
    }

    logInfo(`\n📦 从 ${source} 安装 ${selectedSkills.length} 个 skills...`);

    const tempDir = path.join(CONFIG.tempDir, `repo-${Date.now()}`);

    try {
      const { repoUrl, subpath } = parseGitHubSource(source);

      // Clone repository
      logInfo(`克隆仓库 ${repoUrl}...`);
      await execPromise(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}"`);

      // Determine scan directory
      const scanDir = subpath ? path.join(tempDir, subpath) : tempDir;

      // Find all skills
      const allSkills = await findAllSkillsInRepo(scanDir);

      // Filter to user selected
      const skillsToInstall = allSkills.filter(s => selectedSkills.includes(s.name));

      if (skillsToInstall.length === 0) {
        await safeRemove(tempDir);
        return res.status(400).json({ error: '未找到选择的 skills' });
      }

      // Install to hub
      const installed = [];
      for (const skill of skillsToInstall) {
        const targetPath = path.join(CONFIG.skillsDir, skill.name);

        // Remove if exists
        await safeRemove(targetPath);

        // Copy skill directory
        await copyDirectory(skill.path, targetPath);

        // Update registry
        await updateSkillRegistry(CONFIG.registryFile, skill);

        installed.push(skill.name);
        logSuccess(`✓ 安装: ${skill.name}`);
      }

      // Clean up temp directory
      await safeRemove(tempDir);

      res.json({
        success: true,
        installed,
        message: `成功安装 ${installed.length} 个 skills`,
      });

      logSuccess(`\n✅ 安装完成!\n`);
    } catch (error) {
      await safeRemove(tempDir);
      logError(`✗ 安装失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/skills/import
   * Import skill from project to Hub
   */
  router.post('/import', async (req, res) => {
    const { skillName, projectPath } = req.body;

    if (!skillName || !projectPath) {
      return res.status(400).json({ error: '需要指定 skillName 和 projectPath' });
    }

    try {
      logInfo(`\n📥 从项目导入 Skill: ${skillName}`);

      // Source path (skill in project)
      const sourcePath = path.join(projectPath, '.claude', 'skills', skillName);
      const sourceSkillMd = path.join(sourcePath, 'SKILL.md');

      // Check if source exists
      try {
        await require('fs').promises.access(sourceSkillMd);
      } catch {
        return res.status(404).json({ error: `项目中未找到 skill: ${skillName}` });
      }

      // Target path (in Hub)
      const targetPath = path.join(CONFIG.skillsDir, skillName);

      // Check if already exists in Hub
      try {
        await require('fs').promises.access(targetPath);
        return res.status(409).json({ error: `Hub 中已存在同名 skill: ${skillName}` });
      } catch {
        // Doesn't exist, can continue
      }

      // Copy entire skill directory to Hub
      await copyDirectory(sourcePath, targetPath);

      // Read description
      const description = await getSkillDescription(targetPath);

      // Update registry
      await updateSkillRegistry(CONFIG.registryFile, { name: skillName, description });

      logSuccess(`✅ 导入成功: ${skillName}\n`);

      res.json({
        success: true,
        message: `Skill "${skillName}" 已导入到 Hub`,
        description
      });
    } catch (error) {
      logError(`✗ 导入失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createSkillsRoutes;
