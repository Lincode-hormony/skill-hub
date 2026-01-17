# 🚀 快速开始 - 重构版

## 两种使用方式

### 方式1：继续使用原始代码（无需改变）

```bash
# 原始代码完全保留，可以继续使用
npm start  # 使用原始的server.js
```

### 方式2：使用重构后的代码（推荐）

```bash
# 直接使用重构后的服务器
node server-refactored.js

# 或者创建一个启动脚本
echo "node server-refactored.js" > start-refactored.bat
# Windows: start-refactored.bat
```

## 验证功能

启动后，访问 http://localhost:3000 并验证：

1. ✅ 安装Skills功能
2. ✅ 项目管理功能
3. ✅ Skills管理功能
4. ✅ 设置功能

## 文件对照

| 原始文件 | 重构后文件 | 说明 |
|----------|------------|------|
| `server.js` | `server-refactored.js` | 主服务器文件 |
| `web-ui/index.html` | `web-ui/index-refactored.html` | 前端HTML |
| - | `config.js` | 新增：配置管理 |
| - | `utils/*.js` | 新增：工具函数 |
| - | `routes/*.js` | 新增：API路由 |
| - | `web-ui/styles.css` | 新增：分离的CSS |
| - | `web-ui/app.js` | 新增：模块化JS |

## 切换到重构版

### Windows
```bash
# 备份原文件
copy server.js server.js.backup
copy web-ui\index.html web-ui\index.html.backup

# 使用重构版
copy server-refactored.js server.js
copy web-ui\index-refactored.html web-ui\index.html

# 启动
npm start
```

### Mac/Linux
```bash
# 备份原文件
cp server.js server.js.backup
cp web-ui/index.html web-ui/index.html.backup

# 使用重构版
cp server-refactored.js server.js
cp web-ui/index-refactored.html web-ui/index.html

# 启动
npm start
```

## 主要优势

- 📦 更清晰的代码结构
- 🔧 更容易维护和修改
- 🚀 更快的开发速度
- 📚 更好的文档支持
- ✨ 100%功能兼容

## 需要帮助？

查看详细文档：
- `REFACTORING.md` - 重构说明
- `CODE_IMPROVEMENTS.md` - 代码对比
- `REFACTORING_SUMMARY.md` - 详细对比
- `README_REFACTORING.md` - 完整总结

## 回滚方法

如果需要回滚到原始代码：

```bash
# Windows
copy server.js.backup server.js
copy web-ui\index.html.backup web-ui\index.html

# Mac/Linux
cp server.js.backup server.js
cp web-ui/index.html.backup web-ui/index.html
```

---

**推荐：** 使用重构后的代码以获得更好的开发体验！
