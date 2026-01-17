/**
 * Universal Skill Hub - Application Logic
 * Modular JavaScript for frontend functionality
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE = '/api';
  const TOOLS = {
    'claude-code': { name: 'Claude Code', icon: '🤖' },
    'cursor': { name: 'Cursor', icon: '✨' },
    'windsurf': { name: 'Windsurf', icon: '🌊' }
  };

  // State
  const state = {
    availableSkills: [],
    selectedSkills: new Set(),
    currentPreviewSource: '',
    projectsData: {},
    currentProject: null,
    currentEditProject: null,
    projectToolSkills: {
      'claude-code': new Set(),
      'cursor': new Set(),
      'windsurf': new Set()
    },
    allSkillsData: [],
    allTagsList: [],
    activeTagsFilter: new Set(),
    currentEditingSkill: null
  };

  // Utility Functions
  const utils = {
    formatSize(bytes) {
      if (bytes < 1024) return bytes + 'B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    },

    showMessage(message, type = 'success') {
      const area = document.getElementById('message-area');
      area.innerHTML = `<div class="alert ${type}">${message}</div>`;
      setTimeout(() => area.innerHTML = '', 5000);
    },

    async fetchAPI(url, options = {}) {
      const response = await fetch(url, options);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }
      return response.json();
    }
  };

  // API Functions
  const api = {
    async getSkills() {
      return utils.fetchAPI(`${API_BASE}/skills`);
    },

    async getProjects() {
      return utils.fetchAPI(`${API_BASE}/projects`);
    },

    async getTags() {
      return utils.fetchAPI(`${API_BASE}/tags`);
    },

    async updateSkill(name, data) {
      return utils.fetchAPI(`${API_BASE}/skills/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    async uninstallSkill(name) {
      return utils.fetchAPI(`${API_BASE}/skills/${encodeURIComponent(name)}/uninstall`, {
        method: 'DELETE'
      });
    },

    async saveProject(data) {
      return utils.fetchAPI(`${API_BASE}/projects/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },

    async deleteProject(name) {
      return utils.fetchAPI(`${API_BASE}/projects/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
    },

    async scanProject(projectPath) {
      return utils.fetchAPI(`${API_BASE}/projects/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath })
      });
    },

    async importSkill(skillName, projectPath) {
      return utils.fetchAPI(`${API_BASE}/skills/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName, projectPath })
      });
    },

    async previewSkills(source) {
      return utils.fetchAPI(`${API_BASE}/skills/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
    },

    async installSkills(source, skills) {
      return utils.fetchAPI(`${API_BASE}/skills/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, skills })
      });
    },

    async getSettings() {
      return utils.fetchAPI(`${API_BASE}/settings`);
    },

    async updateStorageSettings(newHubRoot, migrate) {
      return utils.fetchAPI(`${API_BASE}/settings/storage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHubRoot, migrate })
      });
    }
  };

  // Tab Management
  const tabs = {
    init() {
      document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.switch(tab.dataset.tab);
        });
      });
    },

    switch(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
      if (activeTab) {
        activeTab.classList.add('active');
      }

      const activeContent = document.getElementById(tabName);
      if (activeContent) {
        activeContent.classList.add('active');
      }

      // Load data based on tab
      if (tabName === 'manage') {
        projects.load();
      } else if (tabName === 'skills-mgr') {
        skillsManagement.load();
      }
    }
  };

  // Stats Management
  const stats = {
    async load() {
      try {
        const data = await api.getProjects();
        state.projectsData = data;

        const projectCount = Object.keys(data.projects || {}).length;
        const skillCount = state.availableSkills.length;
        let configCount = 0;

        Object.values(data.projects || {}).forEach(proj => {
          const skillsList = proj.skills || [];
          configCount += skillsList.length;
        });

        document.getElementById('stat-skills').textContent = skillCount;
        document.getElementById('stat-projects').textContent = projectCount;
        document.getElementById('stat-links').textContent = configCount;
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    }
  };

  // Skills Installation
  const installation = {
    async preview() {
      const source = document.getElementById('github-repo').value.trim();
      if (!source) {
        utils.showMessage('请输入 GitHub 仓库或 skill 地址', 'error');
        return;
      }

      const container = document.getElementById('preview-result');
      container.innerHTML = '<div class="loading"><div class="spinner"></div><p>正在扫描仓库...</p></div>';
      container.style.display = 'block';

      try {
        const data = await api.previewSkills(source);
        state.currentPreviewSource = source;

        if (data.isSingle) {
          this.renderSingleSkill(data);
        } else {
          this.renderMultipleSkills(data);
        }

        utils.showMessage(`✅ 找到 ${data.count} 个 skill(s)`, 'success');
      } catch (error) {
        container.innerHTML = `<div class="alert error">❌ ${error.message}</div>`;
        utils.showMessage(`❌ 预览失败: ${error.message}`, 'error');
      }
    },

    renderSingleSkill(data) {
      const skill = data.skills[0];
      const container = document.getElementById('preview-result');
      container.innerHTML = `
        <div class="card" style="margin-top: 20px;">
          <h3>📦 找到 1 个 Skill</h3>
          <div class="skill-item" style="margin: 15px 0; cursor: default; transform: none; box-shadow: none; border: 1px solid var(--border-color);">
            <div class="skill-name">${skill.name}</div>
            <div class="skill-desc">${skill.description}</div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="installation.installSingle(['${skill.name}'])">✅ 直接安装</button>
            <button class="secondary" onclick="document.getElementById('preview-result').style.display='none'">取消</button>
          </div>
        </div>
      `;
    },

    renderMultipleSkills(data) {
      const skillsList = data.skills.map(skill => `
        <div class="skill-item" data-name="${skill.name}" onclick="installation.toggleSelection('${skill.name}')">
          <span class="checkbox"></span>
          <div class="skill-name" style="margin-bottom:0.25rem;">${skill.name}</div>
          <div class="skill-desc" style="font-size:0.85rem; margin-bottom:0;">${skill.description}</div>
        </div>
      `).join('');

      const container = document.getElementById('preview-result');
      container.innerHTML = `
        <div class="card" style="margin-top: 20px;">
          <h3>📦 找到 ${data.count} 个 Skills</h3>
          <p style="color: var(--text-muted); margin-bottom: 15px;">请选择要安装的 skills：</p>
          <div class="skills-grid">${skillsList}</div>
          <div style="margin-top: 20px; display: flex; gap: 10px;">
            <button onclick="installation.installSelected()">✅ 安装选中的 (${data.count})</button>
            <button class="secondary" onclick="document.getElementById('preview-result').style.display='none'">取消</button>
          </div>
        </div>
      `;

      state.selectedSkills.clear();
      data.skills.forEach(s => state.selectedSkills.add(s.name));
      document.querySelectorAll('#preview-result .skill-item').forEach(item => {
        item.classList.add('selected');
      });
    },

    toggleSelection(name) {
      const item = document.querySelector(`#preview-result .skill-item[data-name="${name}"]`);

      if (state.selectedSkills.has(name)) {
        state.selectedSkills.delete(name);
        item.classList.remove('selected');
      } else {
        state.selectedSkills.add(name);
        item.classList.add('selected');
      }

      const btn = document.querySelector('#preview-result button');
      if (btn) {
        btn.textContent = `✅ 安装选中的 (${state.selectedSkills.size})`;
      }
    },

    async installSelected() {
      if (state.selectedSkills.size === 0) {
        utils.showMessage('请至少选择一个 skill', 'error');
        return;
      }
      await this.install(Array.from(state.selectedSkills));
    },

    async installSingle(skillNames) {
      await this.install(skillNames);
    },

    async install(skillNames) {
      const source = state.currentPreviewSource;

      document.getElementById('preview-result').style.display = 'none';
      document.getElementById('install-progress').style.display = 'block';

      try {
        const data = await api.installSkills(source, skillNames);
        utils.showMessage(`✅ ${data.message}`, 'success');
        state.selectedSkills.clear();
        state.currentPreviewSource = '';
        await this.loadAllSkills();
        await stats.load();
      } catch (error) {
        utils.showMessage(`❌ 安装失败: ${error.message}`, 'error');
      } finally {
        document.getElementById('install-progress').style.display = 'none';
      }
    },

    async loadAllSkills() {
      try {
        const data = await api.getSkills();
        state.availableSkills = data.skills;
      } catch (error) {
        console.error('Failed to load skills:', error);
      }
    }
  };

  // Projects Management
  const projects = {
    async load() {
      try {
        const data = await api.getProjects();
        state.projectsData = data;
        this.render(data.projects || {});
      } catch (error) {
        console.error('Failed to load projects:', error);
      }
    },

    render(projects) {
      const container = document.getElementById('projects-list');

      if (Object.keys(projects).length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <p>暂无项目</p>
            <p style="font-size: 0.9rem; margin-top: 10px;">点击右上角"新建项目"开始</p>
          </div>
        `;
        return;
      }

      container.innerHTML = Object.entries(projects).map(([name, project]) => {
        const skills = project.skills || [];
        const skillTags = skills.map(s => `<span class="skill-tag">${s}</span>`).join('');

        return `
          <div class="project-card">
            <div class="project-header">
              <h3 class="project-title">📦 ${name}</h3>
              <div class="project-actions">
                <button onclick="projects.edit('${name}')" class="secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem; min-height: 36px;">✏️ 编辑</button>
                <button onclick="projects.delete('${name}')" class="secondary danger" style="background: #fee2e2; border-color: #fca5a5; color: #991b1b; font-size: 0.85rem; padding: 0.5rem 1rem; min-height: 36px;">🗑️ 删除</button>
              </div>
            </div>
            <div class="project-path">📍 ${project.path}</div>
            <div class="project-skills">
              <span style="font-size: 0.9rem; color: var(--text-muted);">🔧 Skills:</span>
              ${skillTags || '<span style="color: var(--text-muted); font-size: 0.9rem;">暂无</span>'}
              <button onclick="projects.edit('${name}')" class="secondary" style="padding: 0; width: 24px; height: 24px; min-height: auto; border-radius: 50%; font-size: 14px; line-height: 1;">➕</button>
            </div>
          </div>
        `;
      }).join('');
    },

    openModal(projectName = null) {
      state.currentEditProject = projectName;
      const project = projectName ? state.projectsData.projects[projectName] : null;
      const isEdit = !!projectName;

      const skillsCheckboxes = state.availableSkills.map(skill => {
        const isChecked = project && project.skills && project.skills.includes(skill.name);
        const displayLabel = skill.displayName && skill.displayName !== skill.name
          ? `${skill.name} <span style="color: var(--primary); font-size: 0.9em;">(${skill.displayName})</span>`
          : skill.name;

        return `
          <label class="skill-checkbox-item">
            <input type="checkbox" name="skills" value="${skill.name}" ${isChecked ? 'checked' : ''}>
            <div class="skill-checkbox-label">
              <div>${displayLabel}</div>
              <div class="skill-checkbox-desc">${skill.description}</div>
            </div>
          </label>
        `;
      }).join('');

      const modal = document.createElement('div');
      modal.id = 'project-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-header">
            <h2 class="modal-title">${isEdit ? '✏️ 编辑项目' : '✨ 新建项目'}</h2>
            <button class="modal-close" onclick="projects.closeModal()">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>项目名称</label>
              <input type="text" id="modal-project-name" placeholder="我的AI项目" value="${project?.name || ''}" ${isEdit ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label>项目路径</label>
              <input type="text" id="modal-project-path" placeholder="D:\\我的项目" value="${project?.path || ''}" oninput="projects.onPathChange()">
              <small style="color: var(--text-muted); display: block; margin-top: 5px; font-size: 0.85rem;">
                💡 输入路径后将自动扫描已有的 skills
              </small>
            </div>
            <div class="form-group">
              <label>选择 Skills</label>
              <div class="skills-checklist" id="modal-skills-list">
                ${skillsCheckboxes}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="secondary" onclick="projects.closeModal()">取消</button>
            <button onclick="projects.save()">${isEdit ? '💾 保存修改' : '💾 创建项目'}</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    closeModal() {
      const modal = document.getElementById('project-modal');
      if (modal) modal.remove();
      state.currentEditProject = null;
    },

    scanTimeout: null,

    async onPathChange() {
      clearTimeout(this.scanTimeout);
      const projectPath = document.getElementById('modal-project-path').value.trim();

      if (!projectPath) return;

      this.scanTimeout = setTimeout(async () => {
        try {
          const data = await api.scanProject(projectPath);

          if (data.success && data.skills && data.skills.length > 0) {
            const externalSkills = [];

            data.skills.forEach(skillName => {
              const checkbox = document.querySelector(`input[name="skills"][value="${skillName}"]`);
              if (checkbox) {
                checkbox.checked = true;
              } else {
                externalSkills.push(skillName);
              }
            });

            if (externalSkills.length > 0) {
              this.addExternalSkills(externalSkills, projectPath);
              utils.showMessage(`✅ 自动扫描到 ${data.skills.length} 个 skills (包含 ${externalSkills.length} 个外部 Skill)`, 'success');
            } else {
              utils.showMessage(`✅ 自动扫描到 ${data.skills.length} 个 skills`, 'success');
            }
          }
        } catch (error) {
          console.error('Scan failed:', error);
        }
      }, 1000);
    },

    addExternalSkills(externalSkills, projectPath) {
      const container = document.getElementById('modal-skills-list');
      if (!container) return;

      externalSkills.forEach(skillName => {
        if (document.querySelector(`input[name="skills"][value="${skillName}"]`)) return;

        const item = document.createElement('label');
        item.className = 'skill-checkbox-item';
        item.id = `external-skill-${skillName}`;
        item.style.borderLeft = '4px solid #f59e0b';
        item.style.background = '#fffbeb';
        item.innerHTML = `
          <input type="checkbox" name="skills" value="${skillName}" checked>
          <div class="skill-checkbox-label" style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>${skillName} <span style="color: #d97706; font-size: 0.75rem;">（项目本地）</span></span>
              <button type="button" onclick="event.preventDefault(); event.stopPropagation(); projects.importSkill('${skillName}')"
                      style="padding: 4px 10px; min-height: auto; font-size: 12px; background: #f59e0b;">
                📥 导入到 Hub
              </button>
            </div>
            <div class="skill-checkbox-desc">此 skill 存在于项目中，但未在 Hub 中安装。点击导入可同步。</div>
          </div>
        `;
        container.insertBefore(item, container.firstChild);
      });
    },

    async importSkill(skillName) {
      const projectPath = document.getElementById('modal-project-path').value.trim();
      if (!projectPath) {
        utils.showMessage('请先输入项目路径', 'error');
        return;
      }

      try {
        const data = await api.importSkill(skillName, projectPath);
        utils.showMessage(`✅ ${data.message}`, 'success');

        const item = document.getElementById(`external-skill-${skillName}`);
        if (item) {
          item.style.borderLeft = '';
          item.style.background = '';
          item.innerHTML = `
            <input type="checkbox" name="skills" value="${skillName}" checked>
            <div class="skill-checkbox-label">
              <div>${skillName} <span style="color: #22c55e; font-size: 0.75rem;">✓ 已导入 Hub</span></div>
              <div class="skill-checkbox-desc">${data.description || '已成功导入到 Hub'}</div>
            </div>
          `;
        }

        await installation.loadAllSkills();
      } catch (error) {
        utils.showMessage(`❌ 导入失败: ${error.message}`, 'error');
      }
    },

    async save() {
      const projectName = state.currentEditProject || document.getElementById('modal-project-name').value.trim();
      const projectPath = document.getElementById('modal-project-path').value.trim();
      const selectedSkills = Array.from(document.querySelectorAll('input[name="skills"]:checked'))
        .map(cb => cb.value);

      if (!projectName) {
        utils.showMessage('请输入项目名称', 'error');
        return;
      }

      if (!projectPath) {
        utils.showMessage('请输入项目路径', 'error');
        return;
      }

      try {
        const data = await api.saveProject({
          name: projectName,
          path: projectPath,
          skills: selectedSkills
        });

        utils.showMessage(`✅ ${data.message}`, 'success');
        this.closeModal();
        await this.load();
        await stats.load();
      } catch (error) {
        utils.showMessage(`❌ 保存失败: ${error.message}`, 'error');
      }
    },

    edit(projectName) {
      this.openModal(projectName);
    },

    async delete(projectName) {
      if (!confirm(`确定要删除项目 "${projectName}" 吗？\n\n注意：这只会删除配置记录，不会删除实际的文件和链接。`)) {
        return;
      }

      try {
        const data = await api.deleteProject(projectName);
        utils.showMessage(`✅ ${data.message}`, 'success');
        await this.load();
        await stats.load();
      } catch (error) {
        utils.showMessage(`❌ 删除失败: ${error.message}`, 'error');
      }
    }
  };

  // Skills Management
  const skillsManagement = {
    async load() {
      try {
        const container = document.getElementById('installed-skills-list');
        container.innerHTML = '<div class="loading"><div class="spinner"></div><p>加载中...</p></div>';

        const [skillsData, tagsData, projectsData] = await Promise.all([
          api.getSkills(),
          api.getTags(),
          api.getProjects()
        ]);

        state.allSkillsData = skillsData.skills;
        state.allTagsList = tagsData.tags;

        this.renderTagsFilter();
        this.renderList(projectsData.skillUsage || {});
      } catch (error) {
        utils.showMessage(`❌ 加载失败: ${error.message}`, 'error');
      }
    },

    renderTagsFilter() {
      const container = document.getElementById('tags-filter');
      const hasActiveTag = state.activeTagsFilter.size > 0;

      let html = `<button class="tag-filter-btn ${!hasActiveTag ? 'active' : ''}" onclick="skillsManagement.toggleTagFilter('')" data-tag="">
        ${!hasActiveTag ? '✓ ' : ''}全部
      </button>`;

      if (state.allTagsList.length === 0) {
        container.innerHTML = html + `<span style="color: var(--text-muted); font-size: 0.9rem; padding: 8px 0;">
          暂无标签，为 skills 添加标签后可在此筛选
        </span>`;
        return;
      }

      state.allTagsList.forEach(tag => {
        const isActive = state.activeTagsFilter.has(tag);
        html += `<button class="tag-filter-btn ${isActive ? 'active' : ''}" onclick="skillsManagement.toggleTagFilter('${tag}')" data-tag="${tag}">
          ${isActive ? '✓ ' : ''}#${tag}
        </button>`;
      });

      container.innerHTML = html;
    },

    toggleTagFilter(tag) {
      if (tag === '') {
        state.activeTagsFilter.clear();
      } else {
        if (state.activeTagsFilter.has(tag)) {
          state.activeTagsFilter.delete(tag);
        } else {
          state.activeTagsFilter.add(tag);
        }
      }

      this.renderTagsFilter();
      this.filter();
    },

    filter() {
      const searchQuery = document.getElementById('skills-search').value.trim();

      let filtered = state.allSkillsData;

      // Filter by tags
      if (state.activeTagsFilter.size > 0) {
        filtered = filtered.filter(s =>
          Array.from(state.activeTagsFilter).every(t => s.tags.includes(t))
        );
      }

      // Search by query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(s =>
          s.displayName.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some(t => t.toLowerCase().includes(query))
        );
      }

      api.getProjects().then(data => this.renderList(data.skillUsage || {}, filtered));
    },

    renderList(skillUsage, skills = state.allSkillsData) {
      const container = document.getElementById('installed-skills-list');

      if (skills.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 40px;">没有找到匹配的 skills</p>';
        return;
      }

      container.innerHTML = skills.map(skill => {
        const usageProjects = skillUsage[skill.name] || [];
        const tagsHtml = skill.tags.length > 0
          ? skill.tags.map(t => `<span class="skill-tag-badge">#${t}</span>`).join('')
          : '<span style="color: var(--text-muted); font-size: 0.8rem;">无标签</span>';

        const displayName = skill.displayName !== skill.name
          ? `${skill.name} <span style="color: var(--primary); font-weight: 500;">(${skill.displayName})</span>`
          : skill.name;

        return `
          <div class="card" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div style="flex: 1;">
                <h3 style="margin: 0; font-size: 1.1rem; margin-bottom: 8px;">${displayName}</h3>
                <p style="color: var(--text-muted); margin: 8px 0; font-size: 0.9rem; line-height: 1.4;">${skill.description || '无描述'}</p>
                <div class="skill-tags">${tagsHtml}</div>
                <div style="margin-top: 12px; font-size: 0.85rem; color: var(--text-muted);">
                  <span>📦 ${utils.formatSize(skill.size)}</span>
                  <span style="margin: 0 10px;">•</span>
                  <span>🔗 ${usageProjects.length} 个项目</span>
                  ${usageProjects.length > 0 ? `<span style="margin-left: 10px;">(${usageProjects.join(', ')})</span>` : ''}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="skillsManagement.openEditModal('${skill.name}')">✏️ 编辑</button>
                <button class="secondary danger" style="background: #fee2e2; border-color: #fca5a5; color: #991b1b; padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="skillsManagement.uninstall('${skill.name}', ${usageProjects.length})">🗑️ 卸载</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    openEditModal(skillName) {
      const skill = state.allSkillsData.find(s => s.name === skillName);
      if (!skill) return;

      state.currentEditingSkill = skillName;

      document.getElementById('edit-original-name').value = skillName;
      document.getElementById('edit-display-name').value = skill.displayName !== skillName ? skill.displayName : '';
      document.getElementById('edit-tags').value = skill.tags.join(' ');

      document.getElementById('skill-edit-modal').style.display = 'flex';
    },

    closeEditModal() {
      document.getElementById('skill-edit-modal').style.display = 'none';
      state.currentEditingSkill = null;
    },

    addTag(tag) {
      const input = document.getElementById('edit-tags');
      const currentTags = input.value.trim().split(/\s+|,\s*/).filter(t => t);

      if (!currentTags.includes(tag)) {
        currentTags.push(tag);
        input.value = currentTags.join(' ');
      }
    },

    async saveEdit() {
      if (!state.currentEditingSkill) return;

      const displayName = document.getElementById('edit-display-name').value.trim();
      const tagsInput = document.getElementById('edit-tags').value.trim();
      const tags = tagsInput ? tagsInput.split(/\s+|,\s*/).filter(t => t) : [];

      try {
        const data = await api.updateSkill(state.currentEditingSkill, { displayName, tags });
        utils.showMessage(`✅ ${data.message}`, 'success');
        this.closeEditModal();
        await this.load();
        await installation.loadAllSkills();
        await stats.load();
      } catch (error) {
        utils.showMessage(`❌ 保存失败: ${error.message}`, 'error');
      }
    },

    async uninstall(skillName, usageCount) {
      if (usageCount > 0) {
        utils.showMessage(`❌ 无法卸载: 该 skill 正在被 ${usageCount} 个项目使用`, 'error');
        return;
      }

      if (!confirm(`确定要卸载 "${skillName}" 吗？`)) {
        return;
      }

      try {
        const data = await api.uninstallSkill(skillName);
        utils.showMessage(`✅ ${data.message}`, 'success');
        await this.load();
        await installation.loadAllSkills();
        await stats.load();
      } catch (error) {
        utils.showMessage(`❌ 卸载失败: ${error.message}`, 'error');
      }
    }
  };

  // Settings Management
  const settings = {
    async openModal() {
      try {
        const data = await api.getSettings();

        document.getElementById('current-hub-root').value = data.hubRoot;
        document.getElementById('new-hub-root').value = '';
        document.getElementById('migrate-data').checked = true;

        document.getElementById('settings-modal').style.display = 'flex';
      } catch (error) {
        utils.showMessage(`❌ 加载设置失败: ${error.message}`, 'error');
      }
    },

    closeModal() {
      document.getElementById('settings-modal').style.display = 'none';
    },

    async saveStorage() {
      const newHubRoot = document.getElementById('new-hub-root').value.trim();
      const migrate = document.getElementById('migrate-data').checked;

      if (!newHubRoot) {
        utils.showMessage('❌ 请输入新的存储路径', 'error');
        return;
      }

      if (!confirm(`确定要将存储位置更改为:\n${newHubRoot}\n\n${migrate ? '现有数据将被迁移到新位置' : '现有数据不会被迁移，请手动处理'}\n\n更改后需要重启服务器。是否继续？`)) {
        return;
      }

      try {
        const data = await api.updateStorageSettings(newHubRoot, migrate);
        this.closeModal();
        utils.showMessage(`✅ ${data.message}`, 'success');

        setTimeout(() => {
          alert('设置已保存！\n\n请按以下步骤重启服务器：\n1. 在运行服务器的终端按 Ctrl + C 停止\n2. 运行 npm start 重新启动\n\n重启后将使用新的存储位置。');
        }, 500);
      } catch (error) {
        utils.showMessage(`❌ 保存失败: ${error.message}`, 'error');
      }
    }
  };

  // Initialize application
  function init() {
    tabs.init();
    installation.loadAllSkills();
    stats.load();

    // Expose functions to global scope for onclick handlers
    window.installation = installation;
    window.projects = projects;
    window.skillsManagement = skillsManagement;
    window.settings = settings;
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
