# Skill Hub

Skill Hub 是一个本地 Web 工具，用于统一管理 Codex 与 Claude Code 的 Skills。

Hub 中的 `skills/` 是普通用户 Skill 的唯一真实来源。Codex 和 Claude Code 通过目录链接读取 Hub 内容，避免同一个 Skill 在多个客户端目录中形成互不一致的副本。

## 功能

- 从 GitHub 仓库预览并安装 Skills。
- 扫描本机已有 Skills，去重后接管到 Hub。
- 识别 Codex 的 `~/.agents/skills`、`~/.codex/skills` 与 Claude Code 的 `~/.claude/skills`。
- 在原安装位置创建指向 Hub 的目录链接。
- 区分 Hub 链接、其他来源、混合来源和未配置状态。
- 按平台、业务标签和关键词组合筛选。
- 编辑显示名称与标签，查看项目引用关系。
- 接管失败时恢复原目录，不覆盖同名但内容不同的 Skill。

以下内容只识别和统计，不会被接管：

- Codex 系统 Skills：`~/.codex/skills/.system`
- Codex 供应 Skills：`~/.codex/vendor_imports/skills`
- Codex / Claude Code 插件缓存中的 Skills

## 快速安装（Windows）

前置要求：

- Node.js 18 或更高版本
- Git
- PowerShell 5.1 或更高版本

在 PowerShell 中运行：

```powershell
irm https://raw.githubusercontent.com/Lincode-hormony/skill-hub/main/install.ps1 | iex
```

安装器会：

1. 将程序安装到 `%LOCALAPPDATA%\SkillHub\app`。
2. 将用户 Skills、标签和项目配置存放到 `%USERPROFILE%\SkillLibrary`。
3. 使用 `npm ci --omit=dev` 安装固定版本的运行依赖。
4. 创建桌面快捷方式。
5. 启动服务并打开 `http://localhost:3001`。

程序与 Skill 库相互独立，更新或卸载程序都不会删除已经整理好的 Skills。

### 首次使用必须接管

首次打开时，主界面会保持锁定。阅读操作说明并勾选“我已了解”后，点击“一键接管并开始使用”。

接管会：

- 识别 Codex 与 Claude Code 的个人 Skill 目录。
- 将普通 Skill 校验后迁入统一 Skill 库。
- 把原安装位置改为指向 Skill 库的目录链接。
- 恢复重装前保存的平台和项目连接。

系统 Skill、供应 Skill和插件 Skill不会接管；同名不同内容不会覆盖；失败时会恢复原目录。首次接管完成前不能进入其他管理功能。

如不希望直接执行远程脚本，可以先下载并检查：

```powershell
irm https://raw.githubusercontent.com/Lincode-hormony/skill-hub/main/install.ps1 -OutFile install.ps1
Get-Content .\install.ps1
.\install.ps1
```

## 更新

重新运行安装命令即可执行快进更新并刷新依赖：

```powershell
irm https://raw.githubusercontent.com/Lincode-hormony/skill-hub/main/install.ps1 | iex
```

安装器使用 `git pull --ff-only`，发现安装目录存在本地修改时会停止，不会自动覆盖。

## 干净卸载

运行：

```powershell
& "$env:LOCALAPPDATA\SkillHub\app\uninstall.ps1"
```

卸载前会明确列出操作并要求确认。确认后会：

- 停止由 Skill Hub 启动的后台服务。
- 删除桌面快捷方式、安装清单、运行状态和程序目录。
- 删除 Codex、Claude Code 与项目中由 Hub 创建的目录链接。
- 保留 `%USERPROFILE%\SkillLibrary` 中已经整理好的 Skills、标签和项目记录。

卸载后不会留下 Skill Hub 的程序或连接痕迹，Skill 库仍是独立、可复用的用户资产。重新安装后需再次确认一键接管，系统会根据保留的连接偏好恢复平台与项目连接。

## 手动运行

```powershell
git clone https://github.com/Lincode-hormony/skill-hub.git
cd skill-hub
npm ci
.\scripts\start-skill-hub.ps1
```

手动启动脚本默认使用：

- 服务地址：`http://localhost:3001`
- Skill 库：`%USERPROFILE%\SkillLibrary`

也可以直接运行开发服务器。此时默认把当前仓库作为数据目录：

```powershell
npm start
```

可通过环境变量覆盖：

```powershell
$env:PORT = '3005'
$env:HUB_ROOT = 'D:\MySkillHubData'
npm start
```

## 使用流程

### 从 GitHub 安装

1. 打开“安装 Skills”。
2. 输入 `owner/repo`、仓库子路径或完整 GitHub URL。
3. 预览并选择需要的 Skills。
4. 安装到 Hub 后，在管理页选择要连接的平台。

### 接管本机 Skills

点击“扫描并统一管理”后，Skill Hub 会：

1. 识别普通目录、Hub 链接、外部链接、系统内容和同名冲突。
2. 将普通 Skill 复制到临时目录并校验完整内容。
3. 将验证通过的版本迁入 Hub。
4. 把原目录替换成指向 Hub 的目录链接。
5. 只有链接验证成功后才删除原目录备份。

同名不同内容不会自动覆盖，需要先决定保留哪个版本。

### 平台状态

- `Hub`：平台目录正在通过链接读取 Hub。
- `其他来源`：平台存在同名实体目录或指向其他位置的链接。
- `混合来源`：Hub 链接与其他来源同时存在。
- `未配置`：平台的全局 Skill 目录中没有该 Skill。

平台筛选与业务标签筛选相互独立，可以叠加使用。

## 数据与隐私

以下本机数据已从 Git 提交中排除：

- `skills/`
- `registry.json`
- `connections.json`
- `onboarding.json`
- `projects/`
- `.hub-config.json`
- 日志、临时目录和备份
- 本机桌面快捷方式、启动器和自定义头像

首次启动时会在数据目录中自动创建所需结构。

## 开发

```powershell
npm ci
npm test
npm run dev
```

当前集成测试使用隔离的临时 HOME 和 Hub，不会扫描或修改开发者真实的 Codex / Claude Code 目录。

## License

[MIT](./LICENSE)
