# 🚀 Universal Skill Hub - 使用指南

## 📦 规范化的 Skill 存储格式

```
D:/skills-hub/skills/
├── pdf/                    # 每个 skill 就是一个文件夹
│   └── SKILL.md
├── xlsx/
│   └── SKILL.md
├── brainstorming/
│   └── SKILL.md
└── ...
```

**每个 skill 文件夹必须包含**：
- `SKILL.md` - skill 的主文件（YAML frontmatter + markdown）
- `references/` - 可选的参考文档
- `scripts/` - 可选的脚本文件
- `assets/` - 可选的资源文件

## 🎯 安装流程

### 方式 1：安装整个仓库（多个 skills）

```
输入: anthropics/skills
↓
点击 "🔍 预览 Skills"
↓
显示所有 skills（默认全选）
☑ pdf        - PDF 操作工具
☑ xlsx       - Excel 操作
☑ docx       - Word 文档操作
☑ brainstorming - 创意头脑风暴
↓
取消勾选不需要的
↓
点击 "✅ 安装选中的 (3)"
↓
完成！
```

### 方式 2：安装单个 skill（子路径）

```
输入: obra/superpowers/skills/brainstorming
↓
点击 "🔍 预览 Skills"
↓
显示单个 skill
📦 brainstorming - 创意头脑风暴和探索
↓
点击 "✅ 直接安装"
↓
完成！
```

## 📋 支持的输入格式

| 格式 | 示例 | 说明 |
|------|------|------|
| `owner/repo` | `anthropics/skills` | 安装整个仓库，会显示选择列表 |
| `owner/repo/subpath` | `obra/superpowers/skills/brainstorming` | 安装子路径，单个 skill |
| `https://github.com/...` | `https://github.com/anthropics/skills` | 完整 URL |
| 带 tree 的 URL | `https://github.com/.../tree/main/skills/xxx` | GitHub 页面 URL |

## 🔄 完整工作流

### 1️⃣ 安装 Skills

```
Web UI → 📦 安装 Skills 标签
↓
输入仓库地址
↓
预览 → 选择 → 安装
```

### 2️⃣ 为项目配置 Skills

```
Web UI → 📁 项目管理 标签
↓
填写项目名称和路径
↓
加载 Skills → 勾选需要的
↓
链接到项目 → 生成 AGENTS.md
```

### 3️⃣ 在 AI 编程工具中使用

- **Claude Code**: 自动识别 `.claude/skills/`
- **Cursor**: 自动读取 `AGENTS.md`
- **Windsurf**: 自动读取 `AGENTS.md`

## 🎨 界面演示

### 预览界面（多个 skills）

```
┌─────────────────────────────────────────┐
│  📦 找到 10 个 Skills                    │
│                                         │
│  请选择要安装的 skills：                 │
│                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │☑ pdf     │ │☑ xlsx    │ │☐ docx    ││
│  │PDF 操作   │ │Excel操作 │ │Word文档  ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                         │
│  [✅ 安装选中的 (10)] [取消]             │
└─────────────────────────────────────────┘
```

### 预览界面（单个 skill）

```
┌─────────────────────────────────────────┐
│  📦 找到 1 个 Skill                      │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │ brainstorming                       ││
│  │ 创意头脑风暴和探索                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  [✅ 直接安装] [取消]                    │
└─────────────────────────────────────────┘
```

## 💡 技巧

1. **批量安装**: 输入 `anthropics/skills` 可以一次性预览所有官方 skills
2. **精确安装**: 使用子路径格式只安装需要的单个 skill
3. **自定义选择**: 预览后可以取消勾选不需要的 skills
4. **覆盖安装**: 重新安装同名 skill 会自动覆盖旧的

## ⚙️ 配置文件位置

```
D:/skills-hub/
├── skills/                  # 所有 skills 的物理存储
├── projects/
│   └── project-manifest.json   # 项目配置追踪
├── registry.json           # Skill 注册表
└── temp/                   # 临时文件（自动清理）
```

## 🆘 故障排除

### 预览失败
- 检查网络连接
- 确认 GitHub 仓库地址正确
- 检查仓库是否包含 `SKILL.md` 文件

### 安装失败
- 检查磁盘空间
- 确认 `D:/skills-hub/` 目录存在
- 查看服务器日志获取详细错误

### Skills 无法识别
- 确认项目 `.claude/skills/` 目录存在
- 检查 `AGENTS.md` 是否正确生成
- 重启 AI 编程工具

## 📚 参考资料

- [OpenSkills](https://github.com/numman-ali/openskills) - CLI 版本
- [Anthropic Skills](https://github.com/anthropics/skills) - 官方 skills
- [AGENTS.md 规范](https://agents.md/) - 配置文件格式
