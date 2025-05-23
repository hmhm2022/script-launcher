const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec: execCommand } = require('child_process');

// 设置控制台编码为UTF-8，解决中文显示问题
if (process.platform === 'win32') {
  try {
    process.stdout.setEncoding('utf8');
    process.stderr.setEncoding('utf8');
    // 设置Windows控制台代码页为UTF-8
    execCommand('chcp 65001', { encoding: 'utf8' }, (error) => {
      if (error) {
        console.log('设置控制台编码失败，但不影响应用运行');
      }
    });
  } catch (error) {
    // 忽略编码设置错误
  }
}

// 在应用启动前进行全面的错误抑制配置
app.commandLine.appendSwitch('--disable-gpu');
app.commandLine.appendSwitch('--disable-gpu-sandbox');
app.commandLine.appendSwitch('--disable-software-rasterizer');
app.commandLine.appendSwitch('--disable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('--disable-gpu-memory-buffer-video-frames');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-features=TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--no-sandbox');
app.commandLine.appendSwitch('--disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('--disable-gl-drawing-for-tests');
app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('--disable-accelerated-jpeg-decoding');
app.commandLine.appendSwitch('--disable-accelerated-mjpeg-decode');
app.commandLine.appendSwitch('--disable-accelerated-video-decode');
app.commandLine.appendSwitch('--disable-accelerated-video-encode');
app.commandLine.appendSwitch('--disable-gpu-rasterization');
app.commandLine.appendSwitch('--disable-gpu-compositing');
app.commandLine.appendSwitch('--disable-3d-apis');
app.commandLine.appendSwitch('--disable-webgl');
app.commandLine.appendSwitch('--disable-webgl2');
app.commandLine.appendSwitch('--use-gl=swiftshader');
app.commandLine.appendSwitch('--ignore-gpu-blacklist');
app.commandLine.appendSwitch('--disable-dev-shm-usage');

// 禁用GPU加速以避免GPU进程错误
app.disableHardwareAcceleration();

// 设置更安全的用户数据目录，避免中文路径问题
const userDataPath = path.join(os.tmpdir(), 'script-manager-' + Date.now());
app.setPath('userData', userDataPath);
app.setPath('temp', path.join(userDataPath, 'temp'));
app.setPath('cache', path.join(userDataPath, 'cache'));

// 确保用户数据目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// 抑制控制台错误输出
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // 过滤掉已知的无害错误
  if (message.includes('cache_util_win.cc') || 
      message.includes('gpu_disk_cache.cc') || 
      message.includes('disk_cache.cc') ||
      message.includes('Unable to move the cache') ||
      message.includes('Gpu Cache Creation failed') ||
      message.includes('gpu_channel_manager.cc') ||
      message.includes('Failed to create GLES3 context') ||
      message.includes('Failed to create shared context for virtualization') ||
      message.includes('ContextResult::kFatalFailure') ||
      message.includes('fallback to GLES2')) {
    return; // 忽略这些错误
  }
  originalConsoleError.apply(console, args);
};

// 导入业务逻辑模块
const ScriptManager = require('./app/main/script-manager');
const ScriptExecutor = require('./app/main/script-executor');
const FileManager = require('./app/main/file-manager');

class ScriptManagerApp {
  constructor() {
    this.mainWindow = null;
    this.scriptManager = new ScriptManager();
    this.scriptExecutor = new ScriptExecutor();
    this.fileManager = new FileManager();
    
    this.initializeApp();
  }

  initializeApp() {
    // 当Electron完成初始化时创建窗口
    app.whenReady().then(() => {
      this.createWindow();
      this.setupIPC();
    });

    // 当所有窗口关闭时退出应用（macOS除外）
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // macOS激活应用时重新创建窗口
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  createWindow() {
    // 创建主窗口
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true,
        enableRemoteModule: false,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        backgroundThrottling: false,
        offscreen: false,
        sandbox: false,
        spellcheck: false
      },
      title: '脚本管理器',
      show: false, // 先隐藏，加载完成后显示
      autoHideMenuBar: true, // 隐藏菜单栏
      icon: path.join(__dirname, 'assets/icon.png'), // 应用图标（如果存在）
      frame: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true
    });

    // 加载应用界面
    this.mainWindow.loadFile('app/renderer/index.html');

    // 窗口准备好后显示
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    // 处理窗口关闭事件
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    // 脚本管理相关IPC
    ipcMain.handle('load-scripts', async () => {
      try {
        return await this.scriptManager.loadScripts();
      } catch (error) {
        console.error('加载脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-script', async (event, scriptData) => {
      try {
        return await this.scriptManager.saveScript(scriptData);
      } catch (error) {
        console.error('保存脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-script', async (event, scriptId, scriptData) => {
      try {
        return await this.scriptManager.updateScript(scriptId, scriptData);
      } catch (error) {
        console.error('更新脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('delete-script', async (event, scriptId) => {
      try {
        return await this.scriptManager.deleteScript(scriptId);
      } catch (error) {
        console.error('删除脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 脚本启动相关IPC（替代原来的执行）
    ipcMain.handle('launch-script', async (event, scriptId) => {
      try {
        const script = await this.scriptManager.getScript(scriptId);
        if (!script) {
          return { success: false, error: '脚本不存在' };
        }
        return await this.scriptExecutor.launchScript(scriptId, script);
      } catch (error) {
        console.error('启动脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 获取已启动的进程列表
    ipcMain.handle('get-launched-processes', async () => {
      try {
        return { 
          success: true, 
          processes: this.scriptExecutor.getLaunchedProcesses() 
        };
      } catch (error) {
        console.error('获取进程列表失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 停止特定脚本
    ipcMain.handle('stop-script', async (event, scriptId) => {
      try {
        return await this.scriptExecutor.stopScript(scriptId);
      } catch (error) {
        console.error('停止脚本失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 清理已结束的进程记录
    ipcMain.handle('cleanup-processes', async () => {
      try {
        this.scriptExecutor.cleanupProcesses();
        return { success: true };
      } catch (error) {
        console.error('清理进程失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 文件管理相关IPC
    ipcMain.handle('browse-file', async () => {
      try {
        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ['openFile'],
          filters: [
            { name: 'Python脚本', extensions: ['py'] },
            { name: 'JavaScript脚本', extensions: ['js'] },
            { name: 'TypeScript脚本', extensions: ['ts'] },
            { name: 'Batch脚本', extensions: ['bat', 'cmd'] },
            { name: 'PowerShell脚本', extensions: ['ps1'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
          return { success: true, filePath: result.filePaths[0] };
        }
        return { success: false, error: '未选择文件' };
      } catch (error) {
        console.error('浏览文件失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('validate-file', async (event, filePath) => {
      try {
        return await this.fileManager.validateFile(filePath);
      } catch (error) {
        console.error('验证文件失败:', error);
        return { success: false, error: error.message };
      }
    });
  }
}

// 创建应用实例
new ScriptManagerApp(); 