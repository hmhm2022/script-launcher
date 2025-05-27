# Scripts Manager

一个轻量级桌面脚本管理工具，基于 Electron 构建，用于管理、启动和定时执行各种类型的脚本（Python、JavaScript、TypeScript、Batch、PowerShell 等），支持类似青龙面板的定时任务调度功能。

[![Version](https://img.shields.io/badge/version-1.3.6-blue.svg)](https://github.com/hmhm2022/scripts-manager)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#系统要求)

## 功能特点

- 🖥️ **原生桌面应用**: 基于 Electron，提供原生桌面体验
- 🚀 **脚本启动器**: 点击即启动，脚本在独立窗口中运行
- 📁 **多脚本类型支持**: Python、JavaScript、TypeScript、Batch、PowerShell、Bash
- 🎨 **现代化界面**: 卡片网格布局，类似应用商店体验
- 🔍 **智能搜索**: 支持按名称、类型、描述搜索脚本
- 📂 **文件浏览**: 内置文件选择器，方便添加脚本
- 🏷️ **分类管理**: 按脚本类型自动分类和过滤
- ⏰ **定时任务**: 轻量级任务调度器，支持间隔、每日、每周执行
- 🌍 **跨平台支持**: Windows、macOS、Linux 全平台兼容
- 🚀 **绿色便携**: 支持打包为便携版可执行文件
- 🌙 **深色主题**: 支持浅色/深色主题切换
- 🔔 **系统托盘**: 最小化到系统托盘，后台运行

## 安装和运行

### 方式一：下载预编译版本（推荐）

1. 前往 [Releases](https://github.com/hmhm2022/scripts-manager/releases) 页面
2. 下载文件：   - **Windows**: `ScriptsManager-1.3.6-portable.exe` (便携版)
3. 运行下载的文件即可使用

### 方式二：开发环境运行

#### 前提条件
- Node.js (v16+)
- npm

#### 步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/hmhm2022/scripts-manager.git
   cd scripts-manager
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动应用**
   ```bash
   # 普通模式
   npm start

   # 开发模式（带开发者工具）
   npm run dev
   ```

### 打包分发

```bash
# Windows 便携版
npm run build-portable

# Windows 安装程序
npm run build-installer

# macOS DMG
npm run build-mac

# Linux AppImage
npm run build-linux

# 构建所有平台
npm run dist-all
```

## 使用说明

### 脚本管理

- **添加脚本**: 点击顶部"+"按钮，填写脚本信息
- **编辑脚本**: 右键点击脚本卡片选择"编辑"
- **删除脚本**: 右键点击脚本卡片选择"删除"
- **搜索脚本**: 使用顶部搜索框
- **分类过滤**: 点击分类标签（全部、Python、JavaScript等）

### 定时任务

- **创建定时任务**: 点击顶部⏰按钮，选择"新建任务"
- **管理任务**: 在任务管理界面中编辑、启用/禁用、删除任务
- **快速设置**: 右键点击脚本卡片选择"设置定时"
- **立即执行**: 在任务列表中点击"立即执行"按钮

### 脚本启动

1. 点击脚本卡片
2. 脚本将在新的控制台窗口中启动
3. 脚本独立运行，可以关闭管理器应用

### 支持的脚本类型

| 脚本类型 | 扩展名 | Windows | macOS | Linux | 运行环境要求 |
|---------|--------|---------|-------|-------|-------------|
| **Python** | `.py` | ✅ | ✅ | ✅ | Python 3.x |
| **JavaScript** | `.js` | ✅ | ✅ | ✅ | Node.js |
| **TypeScript** | `.ts` | ✅ | ✅ | ✅ | ts-node |
| **Batch** | `.bat`, `.cmd` | ✅ | ❌ | ❌ | Windows 内置 |
| **PowerShell** | `.ps1` | ✅ | ✅ | ✅ | PowerShell Core |
| **Bash** | `.sh` | ✅* | ✅ | ✅ | Bash Shell |
| **macOS 脚本** | `.command`, `.tool` | ❌ | ✅ | ❌ | macOS 内置 |

> *Windows 上的 Bash 脚本需要 WSL、Git Bash 或 Cygwin 环境

### 平台特性

#### Windows
- 脚本在新的 CMD 窗口中启动
- 支持 Batch 和 PowerShell 脚本
- 便携版无需安装，绿色运行

#### macOS
- 脚本在 Terminal.app 中启动
- 支持 `.command` 和 `.tool` 文件
- 原生 DMG 安装包
- 支持 Intel 和 Apple Silicon

#### Linux
- 脚本在终端模拟器中启动
- AppImage 格式，无需安装
- 支持大多数现代发行版

## 技术架构

### 核心技术栈

- **Electron**: 跨平台桌面应用框架
- **Node.js**: 后端运行时
- **原生JavaScript**: 前端界面
- **JSON**: 数据存储

### 架构设计

- **主进程**: 应用生命周期管理、IPC通信、系统API访问
- **渲染进程**: 用户界面、用户交互
- **IPC通信**: 主进程与渲染进程间的安全通信
- **模块化设计**: 脚本管理、启动、文件操作分离

## 特色功能

### 🔒 安全性
- 上下文隔离和预加载脚本确保安全
- 禁用Node.js集成，防止安全漏洞

### 🌍 国际化
- 完全支持中文路径和文件名
- 正确处理中文脚本输出（GBK/UTF-8编码）

### ⚡ 性能优化
- 禁用GPU加速，避免兼容性问题
- 智能缓存管理
- 异步操作，界面响应流畅

### 🎯 用户体验
- 现代化卡片网格布局
- 脚本在独立窗口中运行
- 响应式界面设计
- 右键菜单操作

## 故障排除

### 常见问题

1. **脚本启动失败**
   - 检查脚本路径是否正确
   - 确认相应运行时环境已安装
   - 查看控制台错误信息

2. **中文显示问题**
   - 应用已优化中文支持
   - 如有问题请检查系统编码设置

3. **权限问题**
   - 确保脚本文件有执行权限
   - PowerShell脚本可能需要调整执行策略


详细更新日志请查看 [CHANGELOG.md](CHANGELOG.md)


## 许可证

MIT License

---

**享受 Scripts Manager 带来的高效脚本管理体验！** 🚀
