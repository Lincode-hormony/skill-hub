/**
 * Projects Routes
 * API endpoints for project management
 */

const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * Initialize projects routes with config
 */
function createProjectsRoutes(CONFIG, utils) {
  const { readJsonFile, writeJsonFile, safeRemove, ensureDirectory } = utils.fileUtils;
  const { getSkillDescription, generateAgentsMd } = utils.skillUtils;
  const { logSuccess, logError, logWarning, logInfo } = utils.logger;
  const fs = require('fs').promises;

  /**
   * GET /api/projects
   * Get all projects with skill usage statistics
   */
  router.get('/', async (req, res) => {
    try {
      const manifest = await readJsonFile(CONFIG.projectsFile, { projects: {} });

      // Calculate skill usage statistics
      const skillUsage = {};
      Object.entries(manifest.projects || {}).forEach(([projectName, project]) => {
        const skillsList = project.skills || [];

        skillsList.forEach(skillName => {
          if (!skillUsage[skillName]) {
            skillUsage[skillName] = [];
          }
          skillUsage[skillName].push(projectName);
        });
      });

      res.json({ ...manifest, skillUsage });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/scan
   * Scan project for existing skills
   */
  router.post('/scan', async (req, res) => {
    const { projectPath } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: '需要指定 projectPath' });
    }

    try {
      logInfo(`\n🔍 扫描项目配置: ${projectPath}`);

      const foundSkills = [];

      // Scan .claude/skills/ directory
      const projectSkillsDir = path.join(projectPath, '.claude', 'skills');

      try {
        const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() || entry.isSymbolicLink()) {
            const skillMdPath = path.join(projectSkillsDir, entry.name, 'SKILL.md');
            try {
              await fs.access(skillMdPath);
              foundSkills.push(entry.name);
            } catch {
              // Not a valid skill directory
            }
          }
        }

        logSuccess(`✓ 找到 ${foundSkills.length} 个 skills`);
      } catch (error) {
        logWarning(`⚠ .claude/skills/ 目录不存在或为空`);
      }

      res.json({
        success: true,
        skills: foundSkills
      });

      logSuccess(`✅ 扫描完成\n`);
    } catch (error) {
      logError(`✗ 扫描失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/save
   * Save or update project configuration
   */
  router.post('/save', async (req, res) => {
    const { name, path: projectPath, skills = [] } = req.body;

    if (!name) {
      return res.status(400).json({ error: '需要指定项目名称' });
    }

    if (!projectPath) {
      return res.status(400).json({ error: '需要指定项目路径' });
    }

    try {
      logInfo(`\n💾 保存项目配置: ${name}`);

      const manifest = await readJsonFile(CONFIG.projectsFile, { projects: {} });

      // Update or create project
      manifest.projects[name] = {
        name,
        path: projectPath,
        skills: skills,
        updatedAt: new Date().toISOString()
      };

      await writeJsonFile(CONFIG.projectsFile, manifest);

      // If there are skills, create links
      if (skills.length > 0) {
        // Create skills directory
        const projectSkillsDir = path.join(projectPath, '.claude', 'skills');
        await ensureDirectory(projectSkillsDir);

        // Create symbolic links for all skills
        for (const skillName of skills) {
          const sourcePath = path.join(CONFIG.skillsDir, skillName);
          const targetPath = path.join(projectSkillsDir, skillName);

          // Only try to link if skill exists in Hub
          try {
            await fs.access(sourcePath);

            // Remove if exists
            try {
              const stats = await fs.lstat(targetPath);
              if (stats.isSymbolicLink()) {
                await fs.unlink(targetPath);
              } else {
                await safeRemove(targetPath);
              }
            } catch {}

            // Create symbolic link (cross-platform compatible)
            const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
            await fs.symlink(sourcePath, targetPath, symlinkType);
            logSuccess(`✓ 链接: ${skillName}`);
          } catch {
            logWarning(`⚠ 跳过链接 (Hub 中未找到): ${skillName}`);
          }
        }
      }

      // Generate AGENTS.md (universal for all tools)
      const skillsData = await Promise.all(
        skills.map(async skillName => {
          // Try to get description from Hub first
          const hubSkillMdPath = path.join(CONFIG.skillsDir, skillName, 'SKILL.md');
          const projectSkillMdPath = path.join(projectPath, '.claude', 'skills', skillName, 'SKILL.md');

          try {
            const content = await fs.readFile(hubSkillMdPath, 'utf-8');
            const descMatch = content.match(/description: (.+)/);
            return {
              name: skillName,
              description: descMatch ? descMatch[1].trim() : '无描述',
              location: 'project',
            };
          } catch {
            // If not in Hub, try from project local (for scanned external skills)
            try {
              const content = await fs.readFile(projectSkillMdPath, 'utf-8');
              const descMatch = content.match(/description: (.+)/);
              return {
                name: skillName,
                description: descMatch ? descMatch[1].trim() : '无描述',
                location: 'project',
              };
            } catch {
              return {
                name: skillName,
                description: '无描述 (本地 Skill)',
                location: 'project',
              };
            }
          }
        })
      );

      const agentsMd = generateAgentsMd(skillsData);
      const agentsPath = path.join(projectPath, 'AGENTS.md');
      await fs.writeFile(agentsPath, agentsMd);
      logSuccess(`✓ 生成 AGENTS.md`);

      res.json({
        success: true,
        message: `项目 "${name}" 配置已保存`
      });

      logSuccess(`✅ 保存完成\n`);
    } catch (error) {
      logError(`✗ 保存失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/projects/:name
   * Delete project configuration
   */
  router.delete('/:name', async (req, res) => {
    const { name } = req.params;

    try {
      logInfo(`\n🗑️ 删除项目: ${name}`);

      const manifest = await readJsonFile(CONFIG.projectsFile, { projects: {} });

      if (!manifest.projects[name]) {
        return res.status(404).json({ error: '项目不存在' });
      }

      // Delete project config (not actual files and links)
      delete manifest.projects[name];

      await writeJsonFile(CONFIG.projectsFile, manifest);

      res.json({
        success: true,
        message: `项目 "${name}" 已删除`
      });

      logSuccess(`✅ 删除完成\n`);
    } catch (error) {
      logError(`✗ 删除失败: ${error.message}\n`);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createProjectsRoutes;
