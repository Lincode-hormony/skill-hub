#!/usr/bin/env node

/**
 * Universal Skill Hub - Web Server
 *
 * 跨工具通用 Skills 管理系统
 * 支持 Claude Code, Cursor, Windsurf 等所有 AI 编程工具
 */

const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// 改进的 exec 函数，继承完整的环境变量
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

const app = express();
const PORT = process.env.PORT || 3000;

// 跨平台默认路径
const getDefaultHubRoot = () => {
  const home = os.homedir();
  return process.platform === 'win32' 
    ? path.join(home, 'skills-hub')
    : path.join(home, '.skills-hub');
};

// 配置
const HUB_ROOT = process.env.HUB_ROOT || getDefaultHubRoot();
const CONFIG = {
  hubRoot: HUB_ROOT,
  skillsDir: path.join(HUB_ROOT, 'skills'),
  projectsFile: path.join(HUB_ROOT, 'projects', 'project-manifest.json'),
  registryFile: path.join(HUB_ROOT, 'registry.json'),
};

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'web-ui')));

// 日志辅助
const log = (msg, color = '\x1b[0m') => console.log(`${color}${msg}\x1b[0m`);

/**
 * 确保 Hub 目录结构存在
 */
async function ensureHubStructure() {
  const dirs = [
    CONFIG.hubRoot,
    CONFIG.skillsDir,
    path.join(CONFIG.hubRoot, 'projects'),
    path.join(CONFIG.hubRoot, 'web-ui'),
    path.join(CONFIG.hubRoot, 'temp'),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // 忽略已存在错误
    }
  }

  // 创建空的 manifest 文件
  const manifestPath = CONFIG.projectsFile;
  try {
    await fs.access(manifestPath);
  } catch {
    await fs.writeFile(manifestPath, JSON.stringify({ projects: {} }, null, 2));
  }

  // 创建空的 registry 文件
  const registryPath = CONFIG.registryFile;
  try {
    await fs.access(registryPath);
  } catch {
    await fs.writeFile(registryPath, JSON.stringify({ skills: {} }, null, 2));
  }
}

/**
 * API: 获取所有已安装的 skills（支持标签筛选和搜索）
 */
app.get('/api/skills', async (req, res) => {
  try {
    const { tags, q } = req.query;
    const skills = [];

    // 读取 registry 获取自定义信息
    let registryData = { skills: {} };
    try {
      const registryContent = await fs.readFile(CONFIG.registryFile, 'utf-8');
      registryData = JSON.parse(registryContent);
    } catch {}

    // 扫描 skills 目录
    const entries = await fs.readdir(CONFIG.skillsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(CONFIG.skillsDir, entry.name);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        try {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const descMatch = content.match(/description: (.+)/);
          const size = await getDirectorySize(skillPath);

          // 获取自定义信息
          const customInfo = registryData.skills[entry.name] || {};

          skills.push({
            name: entry.name,
            displayName: customInfo.displayName || entry.name,
            description: descMatch ? descMatch[1].trim() : '无描述',
            tags: customInfo.tags || [],
            size,
            path: skillPath,
          });
        } catch (error) {
          // 跳过无效的 skill
        }
      }
    }

    // 筛选
    let filtered = skills;

    // 按标签筛选
    if (tags) {
      const filterTags = tags.split(',');
      filtered = filtered.filter(s =>
        filterTags.some(t => s.tags.includes(t))
      );
    }

    // 按关键词搜索
    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter(s =>
        s.displayName.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    res.json({ skills: filtered.sort((a, b) => a.displayName.localeCompare(b.displayName)) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 更新 skill 的自定义名称和标签
 */
app.put('/api/skills/:name', async (req, res) => {
  const { name } = req.params;
  const { displayName, tags } = req.body;

  try {
    log(`\n🏷️ 更新 skill: ${name}`, '\x1b[33m');

    // 读取 registry
    const registryContent = await fs.readFile(CONFIG.registryFile, 'utf-8');
    const registry = JSON.parse(registryContent);

    // 确保 skill 存在
    if (!registry.skills[name]) {
      registry.skills[name] = {};
    }

    // 更新自定义信息
    if (displayName !== undefined) {
      registry.skills[name].displayName = displayName;
    }
    if (tags !== undefined) {
      registry.skills[name].tags = tags;
    }

    // 保存 registry
    await fs.writeFile(CONFIG.registryFile, JSON.stringify(registry, null, 2));

    log(`✓ 更新成功: ${displayName || name} (${tags?.join(', ') || '无标签'})`, '\x1b[32m');

    res.json({
      success: true,
      message: `Skill "${name}" 已更新`
    });
  } catch (error) {
    log(`✗ 更新失败: ${error.message}`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 获取所有标签
 */
app.get('/api/tags', async (req, res) => {
  try {
    const tags = new Set();

    // 读取 registry
    try {
      const registryContent = await fs.readFile(CONFIG.registryFile, 'utf-8');
      const registry = JSON.parse(registryContent);

      // 收集所有标签
      Object.values(registry.skills || {}).forEach(skill => {
        (skill.tags || []).forEach(tag => tags.add(tag));
      });
    } catch {}

    res.json({
      tags: Array.from(tags).sort()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 获取设置
 */
app.get('/api/settings', async (req, res) => {
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
 * API: 更新存储位置
 */
app.put('/api/settings/storage', async (req, res) => {
  const { newHubRoot, migrate } = req.body;

  if (!newHubRoot) {
    return res.status(400).json({ error: '需要指定新的存储路径' });
  }

  try {
    // 展开路径中的 ~
    let expandedPath = newHubRoot;
    if (newHubRoot.startsWith('~/')) {
      expandedPath = path.join(os.homedir(), newHubRoot.substring(2));
    } else if (newHubRoot === '~') {
      expandedPath = os.homedir();
    }

    log(`\n⚙️ 更新存储位置...`, '\x1b[33m');
    log(`当前路径: ${CONFIG.hubRoot}`, '\x1b[36m');
    log(`新路径: ${expandedPath}`, '\x1b[36m');

    // 检查新路径是否可写
    try {
      await fs.mkdir(expandedPath, { recursive: true });
      await fs.access(expandedPath, fs.constants.W_OK);
    } catch (error) {
      return res.status(400).json({ error: `无法访问新路径: ${error.message}` });
    }

    // 如果需要迁移
    if (migrate) {
      log('开始迁移数据...', '\x1b[36m');

      const oldSkillsDir = CONFIG.skillsDir;
      const oldRegistryFile = CONFIG.registryFile;
      const oldProjectsDir = path.join(CONFIG.hubRoot, 'projects');

      const newSkillsDir = path.join(expandedPath, 'skills');
      const newRegistryFile = path.join(expandedPath, 'registry.json');
      const newProjectsDir = path.join(expandedPath, 'projects');

      // 创建新目录结构
      await fs.mkdir(newSkillsDir, { recursive: true });
      await fs.mkdir(newProjectsDir, { recursive: true });

      // 迁移 skills
      const oldSkills = await fs.readdir(oldSkillsDir);
      for (const skill of oldSkills) {
        const oldPath = path.join(oldSkillsDir, skill);
        const newPath = path.join(newSkillsDir, skill);
        const stat = await fs.stat(oldPath);
        if (stat.isDirectory()) {
          // 递归复制目录
          await copyDirectory(oldPath, newPath);
        } else {
          await fs.copyFile(oldPath, newPath);
        }
        log(`✓ 复制: ${skill}`, '\x1b[32m');
      }

      // 迁移 registry
      const registryContent = await fs.readFile(oldRegistryFile, 'utf-8');
      await fs.writeFile(newRegistryFile, registryContent);

      // 迁移 projects
      const oldProjectsManifest = path.join(oldProjectsDir, 'project-manifest.json');
      try {
        const projectsContent = await fs.readFile(oldProjectsManifest, 'utf-8');
        await fs.writeFile(path.join(newProjectsDir, 'project-manifest.json'), projectsContent);
      } catch {}

      log('✅ 数据迁移完成', '\x1b[32m');
    }

    // 更新配置文件（在原 hub root 创建 .hub-config.json）
    const configPath = path.join(CONFIG.hubRoot, '.hub-config.json');
    await fs.writeFile(configPath, JSON.stringify({ hubRoot: expandedPath, updatedAt: new Date().toISOString() }, null, 2));

    log(`✅ 配置已更新，请重启服务器以应用新路径`, '\x1b[32m');

    res.json({
      success: true,
      message: '存储位置已更新，请重启服务器',
      needsRestart: true
    });
  } catch (error) {
    log(`✗ 更新失败: ${error.message}`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * 解析 GitHub source 为仓库 URL 和子路径
 * 支持格式：
 * - owner/repo
 * - owner/repo/subpath/to/skill
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo/tree/branch/subpath
 */
function parseGitHubSource(source) {
  // 已经是完整 URL
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const url = new URL(source);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // 处理 https://github.com/owner/repo/tree/branch/subpath
    const treeIndex = pathParts.indexOf('tree');
    let repoOwner, repoName, subpath;

    if (treeIndex >= 2) {
      repoOwner = pathParts[treeIndex - 2];
      repoName = pathParts[treeIndex - 1];
      subpath = pathParts.slice(treeIndex + 2).join('/');
    } else {
      repoOwner = pathParts[0];
      repoName = pathParts[1];
      subpath = pathParts.slice(2).join('/');
    }

    return {
      repoUrl: `https://github.com/${repoOwner}/${repoName}`,
      subpath: subpath || '',
    };
  }

  // owner/repo 或 owner/repo/subpath 格式
  const parts = source.split('/');

  if (parts.length < 2) {
    throw new Error('无效的 source 格式');
  }

  return {
    repoUrl: `https://github.com/${parts[0]}/${parts[1]}`,
    subpath: parts.slice(2).join('/'),
  };
}

/**
 * API: 预览 GitHub 仓库中的 skills（安装前先查看）
 */
app.post('/api/skills/preview', async (req, res) => {
  const { source } = req.body;

  if (!source) {
    return res.status(400).json({ error: '需要指定 source' });
  }

  log(`\n🔍 预览 ${source}...`, '\x1b[33m');

  const tempDir = path.join(CONFIG.hubRoot, 'temp', `preview-${Date.now()}`);

  try {
    const { repoUrl, subpath } = parseGitHubSource(source);

    // 克隆仓库
    log(`克隆仓库 ${repoUrl}...`, '\x1b[36m');
    await execPromise(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}"`);

    // 确定扫描目录
    const scanDir = subpath ? path.join(tempDir, subpath) : tempDir;

    // 查找所有 skills
    const allSkills = await findAllSkillsInRepo(scanDir);

    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true });

    if (allSkills.length === 0) {
      return res.status(404).json({
        error: '未找到任何 skills',
        hint: '请确保仓库包含 SKILL.md 文件'
      });
    }

    // 格式化返回
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

    log(`✓ 找到 ${allSkills.length} 个 skill(s)\n`, '\x1b[32m');
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    log(`✗ 预览失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 安装已选择的 skills
 */
app.post('/api/skills/install', async (req, res) => {
  const { source, skills: selectedSkills } = req.body;

  if (!source) {
    return res.status(400).json({ error: '需要指定 source' });
  }

  if (!selectedSkills || selectedSkills.length === 0) {
    return res.status(400).json({ error: '需要选择至少一个 skill' });
  }

  log(`\n📦 从 ${source} 安装 ${selectedSkills.length} 个 skills...`, '\x1b[33m');

  const tempDir = path.join(CONFIG.hubRoot, 'temp', `repo-${Date.now()}`);

  try {
    const { repoUrl, subpath } = parseGitHubSource(source);

    // 克隆仓库
    log(`克隆仓库 ${repoUrl}...`, '\x1b[36m');
    await execPromise(`git clone --depth 1 --quiet "${repoUrl}" "${tempDir}"`);

    // 确定扫描目录
    const scanDir = subpath ? path.join(tempDir, subpath) : tempDir;

    // 查找所有 skills
    const allSkills = await findAllSkillsInRepo(scanDir);

    // 过滤出用户选择的
    const skillsToInstall = allSkills.filter(s => selectedSkills.includes(s.name));

    if (skillsToInstall.length === 0) {
      await fs.rm(tempDir, { recursive: true, force: true });
      return res.status(400).json({ error: '未找到选择的 skills' });
    }

    // 安装到 hub
    const installed = [];
    for (const skill of skillsToInstall) {
      const targetPath = path.join(CONFIG.skillsDir, skill.name);

      // 删除已存在的
      try {
        await fs.rm(targetPath, { recursive: true, force: true });
      } catch {}

      // 复制 skill 目录
      await copyDirectory(skill.path, targetPath);

      // 更新 registry
      await updateRegistry(skill);

      installed.push(skill.name);
      log(`✓ 安装: ${skill.name}`, '\x1b[32m');
    }

    // 清理临时目录
    await fs.rm(tempDir, { recursive: true, force: true });

    res.json({
      success: true,
      installed,
      message: `成功安装 ${installed.length} 个 skills`,
    });

    log(`\n✅ 安装完成!\n`, '\x1b[32m');
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    log(`✗ 安装失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 获取项目列表（兼容新旧数据格式）
 */
app.get('/api/projects', async (req, res) => {
  try {
    const content = await fs.readFile(CONFIG.projectsFile, 'utf-8');
    const manifest = JSON.parse(content);

    // 计算每个 skill 的使用统计（兼容新旧格式）
    const skillUsage = {};
    Object.entries(manifest.projects || {}).forEach(([projectName, project]) => {
      let skillsList = [];
      
      // 新格式：直接读取 skills 数组
      if (project.skills && Array.isArray(project.skills)) {
        skillsList = project.skills;
      }
      // 旧格式：从 tools 对象中提取
      else if (project.tools) {
        const allSkills = new Set();
        Object.values(project.tools).forEach(skills => {
          skills.forEach(s => allSkills.add(s));
        });
        skillsList = Array.from(allSkills);
      }

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
 * API: 为项目链接 skills（保留兼容性）
 */
app.post('/api/projects/:name/link', async (req, res) => {
  const projectName = req.params.name;
  const { skills, projectPath, tool = 'claude-code' } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: '需要指定 projectPath' });
  }

  if (!skills || skills.length === 0) {
    return res.status(400).json({ error: '需要指定至少一个 skill' });
  }

  try {
    log(`\n🔗 为项目 "${projectName}" (${tool}) 链接 skills...`, '\x1b[33m');

    const projectSkillsDir = path.join(projectPath, '.claude', 'skills');

    // 创建项目 skills 目录
    await fs.mkdir(projectSkillsDir, { recursive: true });

    // 链接每个 skill
    const linked = [];
    for (const skillName of skills) {
      const sourcePath = path.join(CONFIG.skillsDir, skillName);
      const targetPath = path.join(projectSkillsDir, skillName);

      // 删除已存在的（如果是符号链接或目录）
      try {
        const stats = await fs.lstat(targetPath);
        if (stats.isSymbolicLink()) {
          await fs.unlink(targetPath);
        } else {
          await fs.rm(targetPath, { recursive: true, force: true });
        }
      } catch {
        // 不存在，继续
      }

      // 创建符号链接（跨平台兼容）
      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
      await fs.symlink(sourcePath, targetPath, symlinkType);
      linked.push(skillName);
      log(`✓ 链接: ${skillName}`, '\x1b[32m');
    }

    // 更新 manifest（支持工具特定配置）
    await updateProjectManifestTool(projectName, projectPath, tool, skills);

    res.json({
      success: true,
      linked,
      message: `成功链接 ${linked.length} 个 skills`,
    });
  } catch (error) {
    log(`✗ 链接失败: ${error.message}`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 为项目生成 AGENTS.md
 * 支持两种模式：
 * 1. 扫描模式：扫描项目 .claude/skills/ 目录（Claude Code 链接后）
 * 2. 直接模式：根据提供的 skills 列表直接生成（Cursor/Windsurf）
 */
app.post('/api/projects/:name/sync', async (req, res) => {
  const projectName = req.params.name;
  const { projectPath, skills: providedSkills } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: '需要指定 projectPath' });
  }

  try {
    log(`\n🔄 为项目 "${projectName}" 生成 AGENTS.md...`, '\x1b[33m');

    let skills = [];

    // 如果前端提供了 skills 列表，直接使用（Cursor/Windsurf 模式）
    if (providedSkills && Array.isArray(providedSkills) && providedSkills.length > 0) {
      log(`使用提供的 skills 列表: ${providedSkills.join(', ')}`, '\x1b[36m');

      for (const skillName of providedSkills) {
        const skillPath = path.join(CONFIG.skillsDir, skillName);
        const skillMdPath = path.join(skillPath, 'SKILL.md');

        try {
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const descMatch = content.match(/description: (.+)/);

          skills.push({
            name: skillName,
            description: descMatch ? descMatch[1].trim() : '无描述',
            location: 'project',
          });
        } catch (error) {
          log(`⚠ 跳过无效的 skill: ${skillName}`, '\x1b[33m');
        }
      }
    } else {
      // 否则扫描项目目录（Claude Code 模式）
      log('扫描项目 .claude/skills/ 目录...', '\x1b[36m');

      const projectSkillsDir = path.join(projectPath, '.claude', 'skills');

      try {
        const entries = await fs.readdir(projectSkillsDir, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() || entry.isSymbolicLink()) {
            const skillPath = path.join(projectSkillsDir, entry.name);
            const skillMdPath = path.join(skillPath, 'SKILL.md');

            try {
              const content = await fs.readFile(skillMdPath, 'utf-8');
              const descMatch = content.match(/description: (.+)/);

              skills.push({
                name: entry.name,
                description: descMatch ? descMatch[1].trim() : '无描述',
                location: 'project',
              });
            } catch (error) {
              // 跳过无效的 skill
            }
          }
        }
      } catch (error) {
        // 目录不存在，返回空列表
        log('项目 .claude/skills/ 目录不存在', '\x1b[33m');
      }
    }

    // 生成 AGENTS.md 内容
    const agentsMd = generateAgentsMd(skills);
    const agentsPath = path.join(projectPath, 'AGENTS.md');

    await fs.writeFile(agentsPath, agentsMd);

    log(`✓ 生成 AGENTS.md: ${skills.length} 个 skills\n`, '\x1b[32m');

    res.json({
      success: true,
      skillsCount: skills.length,
      message: `成功生成 AGENTS.md (${skills.length} 个 skills)`,
    });
  } catch (error) {
    log(`✗ 生成失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 扫描项目的现有 skills
 */
app.post('/api/projects/scan', async (req, res) => {
  const { projectPath } = req.body;

  if (!projectPath) {
    return res.status(400).json({ error: '需要指定 projectPath' });
  }

  try {
    log(`\n🔍 扫描项目配置: ${projectPath}`, '\x1b[33m');

    const foundSkills = [];

    // 扫描 .claude/skills/ 目录
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
            // 不是有效的 skill 目录
          }
        }
      }

      log(`✓ 找到 ${foundSkills.length} 个 skills`, '\x1b[32m');
    } catch (error) {
      log(`⚠ .claude/skills/ 目录不存在或为空`, '\x1b[33m');
    }

    res.json({
      success: true,
      skills: foundSkills
    });

    log(`✅ 扫描完成\n`, '\x1b[32m');
  } catch (error) {
    log(`✗ 扫描失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 保存或更新项目配置（简化版）
 */
app.post('/api/projects/save', async (req, res) => {
  const { name, path: projectPath, skills = [] } = req.body;

  if (!name) {
    return res.status(400).json({ error: '需要指定项目名称' });
  }

  if (!projectPath) {
    return res.status(400).json({ error: '需要指定项目路径' });
  }

  try {
    log(`\n💾 保存项目配置: ${name}`, '\x1b[33m');

    const manifestPath = CONFIG.projectsFile;
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    // 更新或创建项目（简化的数据结构）
    manifest.projects[name] = {
      name,
      path: projectPath,
      skills: skills,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // 如果有 skills，则进行链接
    if (skills.length > 0) {
      // 创建 skills 目录
      const projectSkillsDir = path.join(projectPath, '.claude', 'skills');
      await fs.mkdir(projectSkillsDir, { recursive: true });

      // 为所有 skills 创建符号链接
      for (const skillName of skills) {
        const sourcePath = path.join(CONFIG.skillsDir, skillName);
        const targetPath = path.join(projectSkillsDir, skillName);

        // 只有当 Hub 中存在该 skill 时才尝试链接
        try {
          await fs.access(sourcePath);
          
          // 删除已存在的
          try {
            const stats = await fs.lstat(targetPath);
            if (stats.isSymbolicLink()) {
              await fs.unlink(targetPath);
            } else {
              await fs.rm(targetPath, { recursive: true, force: true });
            }
          } catch {}

          // 创建符号链接（跨平台兼容）
          const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
          await fs.symlink(sourcePath, targetPath, symlinkType);
          log(`✓ 链接: ${skillName}`, '\x1b[32m');
        } catch {
          log(`⚠ 跳过链接 (Hub 中未找到): ${skillName}`, '\x1b[33m');
        }
      }
    }

    // 生成 AGENTS.md（所有工具通用）
    const skillsData = await Promise.all(
      skills.map(async skillName => {
        // 先尝试从 Hub 获取描述
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
          // 如果 Hub 没有，尝试从项目本地获取（针对扫描到的外部 skill）
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

    const validSkills = skillsData; // 即使没有描述也包含在 AGENTS.md 中
    const agentsMd = generateAgentsMd(validSkills);
    const agentsPath = path.join(projectPath, 'AGENTS.md');
    await fs.writeFile(agentsPath, agentsMd);
    log(`✓ 生成 AGENTS.md`, '\x1b[32m');

    res.json({
      success: true,
      message: `项目 "${name}" 配置已保存`
    });

    log(`✅ 保存完成\n`, '\x1b[32m');
  } catch (error) {
    log(`✗ 保存失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 删除项目
 */
app.delete('/api/projects/:name', async (req, res) => {
  const projectName = req.params.name;

  try {
    log(`\n🗑️ 删除项目: ${projectName}`, '\x1b[33m');

    const manifestPath = CONFIG.projectsFile;
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    if (!manifest.projects[projectName]) {
      return res.status(404).json({ error: '项目不存在' });
    }

    // 删除项目配置（不删除实际文件和链接）
    delete manifest.projects[projectName];

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    res.json({
      success: true,
      message: `项目 "${projectName}" 已删除`
    });

    log(`✅ 删除完成\n`, '\x1b[32m');
  } catch (error) {
    log(`✗ 删除失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 卸载 skill（带依赖检查）
 */
app.delete('/api/skills/:name/uninstall', async (req, res) => {
  const skillName = req.params.name;

  try {
    log(`\n🗑️ 卸载 skill: ${skillName}`, '\x1b[33m');

    // 检查依赖
    const manifestPath = CONFIG.projectsFile;
    const content = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    const dependentProjects = [];
    Object.entries(manifest.projects || {}).forEach(([projName, proj]) => {
      Object.values(proj.tools || {}).forEach(skills => {
        if (skills.includes(skillName)) {
          dependentProjects.push(projName);
        }
      });
    });

    if (dependentProjects.length > 0) {
      return res.status(409).json({
        error: '无法卸载',
        reason: '该 skill 正在被以下项目使用',
        projects: dependentProjects
      });
    }

    // 删除 skill 目录
    const skillPath = path.join(CONFIG.skillsDir, skillName);
    await fs.rm(skillPath, { recursive: true, force: true });

    // 从 registry 中删除
    const registryPath = CONFIG.registryFile;
    const registryContent = await fs.readFile(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);
    delete registry.skills[skillName];
    await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));

    res.json({
      success: true,
      message: `Skill "${skillName}" 已卸载`
    });

    log(`✅ 卸载完成\n`, '\x1b[32m');
  } catch (error) {
    log(`✗ 卸载失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * API: 从项目导入 Skill 到 Hub
 */
app.post('/api/skills/import', async (req, res) => {
  const { skillName, projectPath } = req.body;

  if (!skillName || !projectPath) {
    return res.status(400).json({ error: '需要指定 skillName 和 projectPath' });
  }

  try {
    log(`\n📥 从项目导入 Skill: ${skillName}`, '\x1b[33m');

    // 源路径（项目中的 skill）
    const sourcePath = path.join(projectPath, '.claude', 'skills', skillName);
    const sourceSkillMd = path.join(sourcePath, 'SKILL.md');

    // 检查源是否存在
    try {
      await fs.access(sourceSkillMd);
    } catch {
      return res.status(404).json({ error: `项目中未找到 skill: ${skillName}` });
    }

    // 目标路径（Hub 中）
    const targetPath = path.join(CONFIG.skillsDir, skillName);

    // 检查 Hub 中是否已存在
    try {
      await fs.access(targetPath);
      return res.status(409).json({ error: `Hub 中已存在同名 skill: ${skillName}` });
    } catch {
      // 不存在，可以继续
    }

    // 复制整个 skill 目录到 Hub
    await copyDirectory(sourcePath, targetPath);

    // 读取描述信息
    const content = await fs.readFile(path.join(targetPath, 'SKILL.md'), 'utf-8');
    const descMatch = content.match(/description: (.+)/);
    const description = descMatch ? descMatch[1].trim() : '无描述';

    // 更新 registry
    await updateRegistry({ name: skillName, description });

    log(`✅ 导入成功: ${skillName}\n`, '\x1b[32m');

    res.json({
      success: true,
      message: `Skill "${skillName}" 已导入到 Hub`,
      description
    });
  } catch (error) {
    log(`✗ 导入失败: ${error.message}\n`, '\x1b[31m');
    res.status(500).json({ error: error.message });
  }
});

/**
 * 辅助函数：在仓库中查找所有 skills
 */
async function findAllSkillsInRepo(repoDir) {
  const skills = [];

  async function scan(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const skillMdPath = path.join(fullPath, 'SKILL.md');
        try {
          await fs.access(skillMdPath);
          const content = await fs.readFile(skillMdPath, 'utf-8');
          const descMatch = content.match(/description: (.+)/);

          skills.push({
            name: entry.name,
            description: descMatch ? descMatch[1].trim() : '无描述',
            path: fullPath,
          });
        } catch {
          // 不是 skill 目录，继续递归
          await scan(fullPath);
        }
      }
    }
  }

  await scan(repoDir);
  return skills;
}

/**
 * 辅助函数：复制目录
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
 * 辅助函数：获取目录大小
 */
async function getDirectorySize(dirPath) {
  let size = 0;

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

  return size;
}

/**
 * 辅助函数：更新 skill registry
 */
async function updateRegistry(skill) {
  const registryPath = CONFIG.registryFile;
  const content = await fs.readFile(registryPath, 'utf-8');
  const registry = JSON.parse(content);

  registry.skills[skill.name] = {
    description: skill.description,
    installedAt: new Date().toISOString(),
  };

  await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * 辅助函数：更新项目 manifest（旧版本兼容）
 */
async function updateProjectManifest(projectName, projectPath, skills) {
  return updateProjectManifestTool(projectName, projectPath, 'claude-code', skills);
}

/**
 * 辅助函数：更新项目的工具特定配置
 */
async function updateProjectManifestTool(projectName, projectPath, tool, skills) {
  const manifestPath = CONFIG.projectsFile;
  const content = await fs.readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);

  // 如果项目不存在，创建新的
  if (!manifest.projects[projectName]) {
    manifest.projects[projectName] = {
      path: projectPath,
      tools: {},
      createdAt: new Date().toISOString()
    };
  }

  // 更新特定工具的 skills
  if (!manifest.projects[projectName].tools) {
    manifest.projects[projectName].tools = {};
  }
  manifest.projects[projectName].tools[tool] = skills;
  manifest.projects[projectName].updatedAt = new Date().toISOString();

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * 辅助函数：生成 AGENTS.md 内容
 */
function generateAgentsMd(skills) {
  const skillTags = skills
    .map(s => `  <skill>
    <name>${s.name}</name>
    <description>${s.description}</description>
    <location>${s.location}</location>
  </skill>`)
    .join('\n\n');

  return `# AI Agents Configuration

<!-- Auto-generated by Universal Skill Hub -->

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively.

How to use skills:
- Invoke: Bash("openskills read <skill-name>")
- The skill content will load with detailed instructions
- Base directory provided for resolving bundled resources

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
</usage>

<available_skills>

${skillTags}

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
`;
}

// 启动服务器
async function start() {
  await ensureHubStructure();

  app.listen(PORT, () => {
    log('\n🚀 Universal Skill Hub 已启动!', '\x1b[32m');
    log(`📁 Hub 目录: ${CONFIG.hubRoot}`, '\x1b[36m');
    log(`🌐 Web UI: http://localhost:${PORT}`, '\x1b[36m');
    log(`📚 Skills 目录: ${CONFIG.skillsDir}`, '\x1b[36m');
    log('\n按 Ctrl+C 停止服务器\n', '\x1b[90m');
  });
}

start();
