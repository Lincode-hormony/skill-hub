# 🚀 Universal Skill Hub

**跨工具通用 Skills 管理系统** —— 让 Claude Code、Cursor、Windsurf 一次配置，同时拥有超能力。

---

## 💡 这是什么？

一个 **Web 界面的 Skills 管理工具**，帮你：

- 📦 **从 GitHub 一键安装** AI Skills（如 PDF 处理、Excel 操作、代码分析等）
- 🔗 **统一管理**：安装一次，多个项目、多个 AI 工具同时使用
- 🎯 **可视化配置**：勾选即用，自动生成配置文件

支持的 AI 编程工具：
- **Claude Code** - 自动识别 `.claude/skills/` 目录
- **Cursor** - 自动读取 `AGENTS.md` 配置
- **Windsurf** - 自动读取 `AGENTS.md` 配置

---

## 📦 安装

### 前置要求
- [Node.js](https://nodejs.org/) 16.0 或更高版本
- [Git](https://git-scm.com/)

### Windows 用户

```powershell
# 克隆项目
git clone https://github.com/你的用户名/universal-skill-hub.git
cd universal-skill-hub

# 安装依赖
npm install

# 启动服务
npm start

# 浏览器打开 http://localhost:3000
```

> **注意**：如果遇到权限问题，建议开启 Windows 的 [开发者模式](https://learn.microsoft.com/zh-cn/windows/apps/get-started/enable-your-device-for-development)。

### Mac / Linux 用户

```bash
# 克隆项目
git clone https://github.com/你的用户名/universal-skill-hub.git
cd universal-skill-hub

# 安装依赖
npm install

# 启动服务
npm start

# 浏览器打开 http://localhost:3000
```

---

## 🎯 快速上手

### 1️⃣ 安装 Skills

打开 Web 界面后：
1. 进入 **"📦 安装 Skills"** 标签页
2. 输入 GitHub 仓库地址，如：
   - `anthropics/skills` （官方 Skills 库）
   - `obra/superpowers` （社区 Skills）
3. 点击 **"预览"**，勾选需要的 Skills
4. 点击 **"安装"**

### 2️⃣ 配置项目

1. 切换到 **"📁 项目管理"** 标签页
2. 填写项目名称和项目路径
3. 为不同的工具（Claude Code / Cursor / Windsurf）勾选需要的 Skills
4. 点击 **"保存"**

系统会自动：
- 创建 `.claude/skills/` 目录并建立符号链接
- 生成 `AGENTS.md` 配置文件

### 3️⃣ 开始使用

在你的 AI 编程工具中直接调用 Skills，无需额外配置！

---

## ⚙️ 自定义配置（可选）

通过环境变量自定义存储路径：

| 环境变量 | 说明 | 默认值 (Windows) | 默认值 (Mac/Linux) |
|---------|------|------------------|--------------------|
| `HUB_ROOT` | Skills 存储目录 | `~/skills-hub` | `~/.skills-hub` |
| `PORT` | Web 服务端口 | `3000` | `3000` |

**示例**：

```bash
# Windows
set HUB_ROOT=D:\my-skills
npm start

# Mac/Linux
export HUB_ROOT=~/my-skills
npm start
```

也可以在 Web UI 中通过 **⚙️ 设置** 按钮更改存储位置，支持一键迁移现有数据。

---

## ✨ 功能特性

### 🏷️ 标签管理

- **自定义标签**：为每个 Skill 添加标签，如 `前端`、`后端`、`工具`、`AI` 等
- **标签筛选**：在 Skills 列表中通过标签快速筛选
- **多标签选择**：支持同时选择多个标签进行精确筛选
- **标签统计**：查看每个标签下有多少个 Skill

### 🔍 搜索功能

- **全文搜索**：搜索 Skill 名称、描述和标签
- **实时筛选**：输入即搜索，无需点击按钮
- **标签关联**：搜索时同时匹配标签内容

### ✏️ 自定义命名

- **别名系统**：为 Skill 设置自定义显示名称
- **双重显示**：显示格式为 `original-name (自定义名称)`
- **便于记忆**：为复杂的 Skill 名称设置易懂的别名
- **不影响功能**：原名称保持不变，仅在界面显示时使用别名

### 🗂️ 设置管理

- **存储位置配置**：随时更改 Skills 存储目录
- **数据迁移**：更改存储位置时自动迁移现有数据
- **路径扩展**：支持 `~/` 和绝对路径格式
- **即时生效**：更改后立即应用，无需重启

### 📊 Skills 管理

- **持久化存储**：所有 Skills 配置、标签、自定义名称永久保存
- **批量操作**：一次安装多个 Skills
- **实时预览**：安装前预览仓库中的所有 Skills
- **版本追踪**：自动记录安装来源和版本信息

---

## 📚 推荐 Skills 仓库

| 仓库 | 描述 |
|------|------|
| [anthropics/skills](https://github.com/anthropics/skills) | Anthropic 官方 Skills 库 |
| [obra/superpowers](https://github.com/obra/superpowers) | 社区高质量 Skills 集合 |

---

## 🙏 致谢

本项目的设计理念和格式规范参考自：
- [OpenSkills](https://github.com/numman-ali/openskills) (Apache 2.0 License)
- [AGENTS.md 规范](https://agents.md/)

> 注：本项目为独立实现，未使用 OpenSkills 的源代码。

---

## 📄 开源协议

[MIT License](./LICENSE)
