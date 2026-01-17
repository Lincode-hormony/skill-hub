# 🚀 Universal Skill Hub - 快速开始

## 📋 安装

### 前置要求

- [Node.js](https://nodejs.org/) 16.0 或更高版本
- [Git](https://git-scm.com/)

### 1. 克隆项目

```bash
git clone https://github.com/Lincode-hormony/skill-hub.git
cd skill-hub
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动服务器

**Windows**:
```bash
npm start
```
或双击 `start.bat` 文件

**Mac/Linux**:
```bash
npm start
```

### 4. 打开 Web UI

浏览器访问: http://localhost:3000

## 🎯 使用流程

### 第一步：安装 Skills

1. 打开 Web UI
2. 在"📦 安装 Skills"标签页
3. 输入 GitHub 仓库地址（如 `anthropics/skills`）
4. 点击"预览"按钮查看仓库中的所有 Skills
5. 勾选需要安装的 Skills
6. 点击"安装"按钮
7. 等待下载完成

**推荐 Skills 仓库**：
- `anthropics/skills` - Anthropic 官方 Skills 库
- `obra/superpowers` - 社区高质量 Skills 集合

### 第二步：管理 Skills（可选）

在"📦 安装 Skills"标签页中，你可以：

- **🏷️ 添加标签**：为每个 Skill 添加自定义标签（如 `前端`、`后端`、`工具` 等）
- **✏️ 自定义命名**：为 Skill 设置便于记忆的别名
- **🔍 搜索筛选**：通过名称、描述或标签快速查找 Skills

### 第三步：为项目配置 Skills

1. 切换到"📁 项目管理"标签页
2. 填写项目名称和路径
3. 点击"加载 Skills"
4. 勾选需要的 skills
5. 点击"链接到项目"
6. 点击"生成 AGENTS.md"

### 第四步：在任何工具中使用

- **Claude Code**: 直接使用，自动识别 `.claude/skills/`
- **Cursor**: 直接使用，自动读取 `AGENTS.md`
- **Windsurf**: 直接使用，自动读取 `AGENTS.md`

## 📂 目录结构

```
D:/skills-hub/                    # Hub 根目录
├── skills/                       # 所有 skills 的物理存储
│   ├── pdf/
│   ├── xlsx/
│   └── ...
├── projects/
│   └── project-manifest.json     # 项目配置
├── web-ui/
│   └── index.html                # Web 界面
├── server.js                     # 后端服务器
└── registry.json                 # Skill 注册表
```

## 🔧 配置文件

### 项目路径 (server.js:10-14)

```javascript
const CONFIG = {
  hubRoot: 'D:/skills-hub',           // Hub 根目录
  skillsDir: 'D:/skills-hub/skills',  // Skills 存储
  projectsFile: 'D:/skills-hub/projects/project-manifest.json',
  registryFile: 'D:/skills-hub/registry.json',
};
```

修改这些路径可以自定义 Hub 位置。

## 🎨 功能特性

- ✅ Web UI 可视化管理
- ✅ 一键从 GitHub 安装 skills
- ✅ 符号链接，节省空间
- ✅ 自动生成 AGENTS.md
- ✅ 项目配置追踪
- ✅ 跨工具通用（Claude Code, Cursor, Windsurf）

## 📚 API 接口

### GET /api/skills
获取所有已安装的 skills

### POST /api/skills/install
安装新的 skills
```json
{
  "source": "anthropics/skills",
  "skills": ["pdf", "xlsx"]
}
```

### GET /api/projects
获取所有项目配置

### POST /api/projects/:name/link
为项目链接 skills
```json
{
  "projectPath": "D:/项目路径",
  "skills": ["pdf", "xlsx"]
}
```

### POST /api/projects/:name/sync
为项目生成 AGENTS.md
```json
{
  "projectPath": "D:/项目路径"
}
```

## 🐛 故障排除

### 端口被占用
修改 `server.js` 中的 `PORT = 3000` 为其他端口

### 符号链接失败（Windows）
1. 以管理员身份运行
2. 或启用开发者模式：
   设置 → 更新和安全 → 开发者选项 → 开发人员模式

### Skills 无法识别
1. 检查 `.claude/skills/` 目录是否存在
2. 检查 AGENTS.md 是否正确生成
3. 重启 AI 编程工具

## 📞 获取帮助

- 查看完整文档: [README.md](README.md)
- OpenSkills 参考: https://github.com/numman-ali/openskills
- AGENTS.md 规范: https://agents.md/
