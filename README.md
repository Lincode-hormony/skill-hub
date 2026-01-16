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
