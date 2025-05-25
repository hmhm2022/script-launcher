# 便携版数据存储修复

## 🐛 问题描述

便携版中新建定时任务报错的问题已修复。

### 原因分析

1. **临时数据目录**: 原来使用临时目录存储数据，每次启动都会丢失
2. **只读路径**: 打包后的应用内部路径是只读的，无法写入数据文件
3. **路径解析**: `__dirname` 在打包后指向应用内部，不是用户可写目录

## ✅ 修复方案

### 1. 数据目录更改
- **修复前**: `临时目录/script-manager-随机数/`
- **修复后**: `用户目录/.script-manager/`

### 2. 文件路径修复
- **scripts.json**: `~/.script-manager/scripts.json`
- **tasks.json**: `~/.script-manager/tasks.json`

### 3. 具体修改

#### main.js
```javascript
// 修复前
const userDataPath = path.join(os.tmpdir(), 'script-manager-' + Date.now());

// 修复后  
const userDataPath = path.join(os.homedir(), '.script-manager');
```

#### script-manager.js
```javascript
// 修复前
this.dataFile = path.join(__dirname, '..', 'data', 'scripts.json');

// 修复后
const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
this.dataFile = path.join(userDataPath, 'scripts.json');
```

#### task-scheduler.js
```javascript
// 修复前
this.dataFile = path.join(__dirname, '..', 'data', 'tasks.json');

// 修复后
const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
this.dataFile = path.join(userDataPath, 'tasks.json');
```

## 📁 数据存储位置

### Windows
```
C:\Users\用户名\.script-manager\
├── scripts.json    # 脚本配置
├── tasks.json      # 定时任务配置
├── temp\          # 临时文件
└── cache\         # 缓存文件
```

### macOS/Linux
```
~/.script-manager/
├── scripts.json    # 脚本配置
├── tasks.json      # 定时任务配置
├── temp/          # 临时文件
└── cache/         # 缓存文件
```

## 🔄 数据迁移

如果您之前使用过便携版，数据可能需要重新配置：

1. **脚本数据**: 重新添加脚本到管理器
2. **定时任务**: 重新创建定时任务
3. **配置保持**: 新版本会自动保持配置

## ✅ 修复验证

修复后的便携版应该能够：

1. ✅ **正常创建定时任务** - 不再报错
2. ✅ **数据持久化** - 重启应用后数据不丢失
3. ✅ **编辑任务** - 编辑按钮正常工作
4. ✅ **立即执行** - 立即执行功能正常
5. ✅ **任务调度** - 定时执行功能正常

## 🚀 重新构建

修复后需要重新构建便携版：

```bash
# 清理旧的构建文件
npm run clean

# 重新构建
.\build.bat
```

## 📋 测试步骤

1. **启动便携版**
2. **添加脚本** - 确认脚本能正常添加
3. **创建定时任务** - 确认不再报错
4. **重启应用** - 确认数据保持
5. **执行任务** - 确认功能正常

## 🎯 优势

修复后的便携版：

- ✅ **真正便携** - 数据存储在用户目录
- ✅ **数据持久** - 不会因重启丢失
- ✅ **权限正确** - 用户目录有写入权限
- ✅ **跨平台** - Windows/macOS/Linux 统一

---

**修复完成！便携版现在可以正常使用定时任务功能了。**
