# 构建指南

## 📦 打包成可执行文件

脚本管理器支持打包成多种格式的可执行文件，无需安装 Node.js 即可运行。

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 构建便携版 (推荐)

#### 方法1: 使用批处理文件 (推荐)
```bash
# 双击运行 build.bat 文件
# 或在命令行中运行：
build.bat
```

#### 方法2: 手动设置环境变量
```bash
# PowerShell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm run build-portable

# 或 CMD
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npm run build-portable
```

生成文件：`dist/脚本管理器-1.2.1-portable.exe`

### 3. 构建安装程序
```bash
npm run build-installer
```
生成文件：`dist/脚本管理器-1.2.1-setup.exe`

## 📋 所有构建命令

### Windows
```bash
# 便携版 (绿色版，无需安装)
npm run build-portable

# 安装程序 (NSIS安装包)
npm run build-installer

# 构建所有Windows版本
npm run build-win
```

### 跨平台
```bash
# Linux AppImage
npm run build-linux

# macOS DMG
npm run build-mac

# 构建所有平台
npm run dist-all
```

### 清理
```bash
# 清理构建文件
npm run clean
```

## 📁 输出文件

构建完成后，文件将保存在 `dist/` 目录：

```
dist/
├── 脚本管理器-1.2.1-portable.exe     # Windows便携版
├── 脚本管理器-1.2.1-setup.exe        # Windows安装程序
├── 脚本管理器-1.2.1.AppImage          # Linux版本
└── 脚本管理器-1.2.1.dmg               # macOS版本
```

## 🎯 推荐使用便携版

**便携版优势**：
- ✅ 无需安装，双击即用
- ✅ 绿色软件，不写注册表
- ✅ 可放在U盘中随身携带
- ✅ 删除文件夹即可完全卸载

## 🔧 自定义图标

1. 准备图标文件：
   - Windows: `build/icon.ico` (多尺寸)
   - macOS: `build/icon.icns`
   - Linux: `build/icon.png` (512x512)

2. 如果没有图标，可以暂时注释掉 `package.json` 中的图标配置

## ⚠️ 注意事项

### Windows Defender
首次运行可能被 Windows Defender 拦截，这是正常现象：
1. 点击"更多信息"
2. 点击"仍要运行"
3. 或添加到白名单

### 文件大小
- 便携版大小约 150-200MB
- 包含了完整的 Electron 运行时
- 首次启动可能需要几秒钟

### 数据存储
- **配置文件**: 存储在用户目录 `~/.script-manager/`
- **脚本数据**: `~/.script-manager/scripts.json`
- **定时任务**: `~/.script-manager/tasks.json`
- **数据持久化**: 重启应用后数据不会丢失

### 系统要求
- **Windows**: Windows 10/11 (x64)
- **macOS**: macOS 10.14+
- **Linux**: 大多数现代发行版

## 🚀 分发建议

### 便携版分发
1. 将 `.exe` 文件上传到 GitHub Releases
2. 用户下载后直接运行
3. 建议提供 SHA256 校验值

### 安装程序分发
1. 提供 `.exe` 安装程序
2. 用户安装后可在开始菜单找到
3. 支持自动更新检查

## 🔍 故障排除

### 网络连接问题 (常见)
如果出现下载 Electron 失败的错误：

```bash
# 方法1: 使用国内镜像 (推荐)
# 已配置在 .npmrc 文件中，或使用 build.bat

# 方法2: 手动下载
# 1. 访问 https://npmmirror.com/mirrors/electron/
# 2. 下载对应版本的 electron-v27.3.11-win32-x64.zip
# 3. 放置到缓存目录
```

### 构建失败
```bash
# 如果文件被占用，先关闭所有便携版进程
# 然后清理后重新构建
npm run clean
npm install
npm run build-portable
```

### 便携版定时任务报错
如果便携版中新建定时任务报错，说明您使用的是旧版本：

```bash
# 重新构建最新版本
npm run clean
.\build.bat
```

新版本已修复数据存储路径问题，数据将保存在用户目录中。

### 缺少图标
```bash
# 临时移除图标配置
# 编辑 package.json，注释掉 "icon" 行
```

### 权限问题
```bash
# 以管理员身份运行命令提示符
# 或使用 PowerShell
```

## 📈 构建优化

### 减小文件大小
- 移除不必要的依赖
- 使用 `files` 配置精确控制打包文件
- 启用压缩选项

### 提高启动速度
- 优化主进程代码
- 减少启动时的文件读取
- 使用预加载脚本

---

**构建完成后，您就可以将可执行文件分发给用户，无需他们安装 Node.js 或 Electron！**
