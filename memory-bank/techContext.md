# 技术上下文: 脚本管理器桌面客户端
*版本: 1.1.1*
*更新时间: 2025年5月*

## 技术栈
- **应用框架**: Electron 22.0+
- **运行时**: Node.js 16+
- **前端**: 原生JavaScript (ES6+), HTML5, CSS3
- **数据存储**: JSON文件
- **构建工具**: electron-builder
- **包管理**: npm

## 开发环境配置
```bash
# 环境要求
Node.js: v16.0+
npm: v8.0+
操作系统: Windows 10+ (主要), macOS 10.15+ (次要)

# 项目初始化
npm install
npm start  # 开发模式
npm run dev  # 带开发者工具
```

## 核心依赖
- **electron**: ^22.0.0 - 桌面应用框架
- **electron-builder**: ^24.0.0 - 应用打包工具

## 开发依赖
- **@electron/rebuild**: 原生模块重建
- **electron-devtools-installer**: 开发工具扩展

## 技术约束
- **平台兼容性**: 优先Windows，其次macOS，暂不支持Linux
- **Node.js版本**: 最低v16，推荐v18+
- **内存使用**: 目标<200MB运行时内存
- **启动时间**: 目标<3秒冷启动
- **中文支持**: 完全支持中文路径和输出

## 构建和部署
### 开发构建
```bash
npm start          # 开发模式运行
npm run dev        # 带开发者工具运行
```

### 生产构建
```bash
npm run build      # 构建应用
npm run dist       # 打包分发版本
```

### 部署配置
```json
{
  "build": {
    "appId": "com.scriptmanager.app",
    "productName": "脚本管理器",
    "directories": {
      "output": "dist"
    },
    "files": [
      "app/**/*",
      "main.js",
      "preload.js",
      "package.json"
    ],
    "win": {
      "target": "portable",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    }
  }
}
```

## 测试策略
### 单元测试
- **框架**: Jest (计划中)
- **覆盖范围**: 业务逻辑模块
- **目标覆盖率**: >80%

### 集成测试
- **工具**: Spectron (计划中)
- **测试范围**: IPC通信、文件操作
- **自动化**: CI/CD集成

### 端到端测试
- **方式**: 手动测试
- **场景**: 完整用户工作流
- **平台**: Windows和macOS

## 脚本启动环境
### 支持的脚本类型
- **Python**: 需要系统安装Python 3.6+
- **JavaScript**: 使用内置Node.js执行
- **TypeScript**: 需要全局安装ts-node
- **Batch**: Windows原生支持
- **PowerShell**: Windows原生支持
- **Bash**: 需要WSL或Git Bash

### 启动配置
```javascript
// 脚本启动器配置
const launchers = {
  python: 'python',
  javascript: 'node',
  typescript: 'ts-node',
  batch: 'cmd /c',
  powershell: 'powershell -File',
  bash: 'bash'
};

// 启动选项
const spawnOptions = {
  detached: true,       // 独立进程
  stdio: 'inherit',     // 继承I/O，允许控制台交互
  shell: true,          // 使用shell
  windowsHide: false    // Windows显示控制台窗口
};
```

## 错误抑制配置
### 命令行参数
```javascript
// GPU相关错误抑制
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('--disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('--use-gl=swiftshader');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');

// 性能优化参数
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

// 安全参数
app.commandLine.appendSwitch('--disable-features=TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--no-sandbox');
```

### 错误过滤
```javascript
// 控制台错误过滤
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // 过滤掉已知的无害错误
  if (message.includes('cache_util_win.cc') || 
      message.includes('gpu_disk_cache.cc') || 
      message.includes('disk_cache.cc') ||
      message.includes('Unable to move the cache') ||
      message.includes('Gpu Cache Creation failed')) {
    return; // 忽略这些错误
  }
  originalConsoleError.apply(console, args);
};
```

## 安全配置
### Electron安全设置
```javascript
{
  nodeIntegration: false,           // 禁用Node.js集成
  contextIsolation: true,           // 启用上下文隔离
  enableRemoteModule: false,        // 禁用remote模块
  webSecurity: true,                // 启用Web安全
  allowRunningInsecureContent: false,
  sandbox: false,                   // 沙箱禁用（因为需要spawn）
  spellcheck: false                 // 禁用拼写检查
}
```

### 内容安全策略
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

## 性能监控
### 关键指标
- **启动时间**: 应用启动到界面可用
- **内存使用**: 运行时内存占用
- **脚本启动时间**: 从点击到脚本窗口显示
- **界面响应**: 用户操作到界面反馈时间
- **运行脚本数**: 同时运行的脚本数量

### 监控工具
- **Electron DevTools**: 开发时性能分析
- **Process Monitor**: 系统资源监控
- **自定义状态栏**: 显示当前运行脚本数量和最后更新时间

## 错误处理
### 日志系统
```javascript
// 主进程日志
console.log('ScriptManager: 操作信息');
console.error('ScriptManager: 错误信息');

// 渲染进程日志
console.log('Renderer: 界面操作');
console.error('Renderer: 界面错误');
```

### 异常捕获
- **主进程**: try-catch + process.on('uncaughtException')
- **渲染进程**: try-catch + window.onerror
- **IPC通信**: 统一错误返回格式
- **脚本启动**: 错误反馈到用户界面通知

---

*本文档描述了项目中使用的技术和开发环境配置。* 