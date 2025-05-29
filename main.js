const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const os = require('os');
const { exec: execCommand } = require('child_process');
const log = require('electron-log');

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

// 设置持久化的用户数据目录，避免中文路径问题
const userDataPath = path.join(os.homedir(), '.script-manager');
app.setPath('userData', userDataPath);
app.setPath('temp', path.join(userDataPath, 'temp'));
app.setPath('cache', path.join(userDataPath, 'cache'));

// 确保用户数据目录存在
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

// 配置electron-log
const logsDir = path.join(userDataPath, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 配置应用日志文件
log.transports.file.resolvePathFn = () => path.join(logsDir, 'scripts-manager.log');
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

// 配置日志格式
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
log.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}] {text}';

// 设置日志文件大小限制
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

log.info('Scripts Manager 启动，日志系统已初始化');

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
const TaskScheduler = require('./app/main/task-scheduler');
const SettingsManager = require('./app/main/settings-manager');

class ScriptManagerApp {
  constructor() {
    // 检查单实例锁定
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      log.info('脚本管理器已在运行，退出当前实例');
      app.quit();
      return;
    }

    log.info('获取单实例锁成功，继续启动应用');

    this.mainWindow = null;
    this.testConsoleWindow = null;
    this.tray = null;
    this.scriptManager = new ScriptManager();
    this.scriptExecutor = new ScriptExecutor();
    this.fileManager = new FileManager();
    this.settingsManager = new SettingsManager();
    this.taskScheduler = new TaskScheduler(this.scriptExecutor, this.scriptManager);

    this.initializeApp();
  }

  initializeApp() {
    // 处理第二个实例启动的情况
    app.on('second-instance', (event, commandLine, workingDirectory) => {
      console.log('检测到第二个实例启动，激活现有窗口');
      this.activateMainWindow();
    });

    // 当Electron完成初始化时创建窗口
    app.whenReady().then(() => {
      this.createWindow();
      this.createTray();

      // 设置托盘引用到心跳监控器
      if (this.tray && this.taskScheduler) {
        this.taskScheduler.setTray(this.tray);
      }

      this.setupIPC();
    });

    // 添加退出前的处理逻辑
    app.on('before-quit', () => {
      app.isQuitting = true;
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

  // 激活主窗口的方法
  activateMainWindow() {
    try {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        // 如果窗口存在但被隐藏，显示它
        if (!this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }

        // 如果窗口被最小化，恢复它
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }

        // 将窗口置于前台并获得焦点
        this.mainWindow.focus();

        // 在 Windows 上额外处理，确保窗口真正获得焦点
        if (process.platform === 'win32') {
          this.mainWindow.setAlwaysOnTop(true);
          this.mainWindow.setAlwaysOnTop(false);
        }

        console.log('已激活现有的脚本管理器窗口');
      } else {
        // 如果窗口不存在或已被销毁，创建新窗口
        console.log('主窗口不存在或已销毁，创建新窗口');
        this.createWindow();
      }
    } catch (error) {
      console.error('激活主窗口时发生错误:', error);
      // 发生错误时尝试创建新窗口
      try {
        this.createWindow();
      } catch (createError) {
        console.error('创建新窗口失败:', createError);
      }
    }
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
      icon: path.join(__dirname, 'assets/icon.png'), // 使用新的图标
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
    this.mainWindow.on('close', async (event) => {
      // 获取设置
      const settingResult = await this.settingsManager.getSetting('minimizeToTray');
      const minimizeToTray = settingResult.success && settingResult.value === true;

      if (minimizeToTray && !app.isQuitting) {
        event.preventDefault();
        this.mainWindow.hide();
        return false;
      }

      // 只有在真正关闭窗口时才设置为 null
      if (app.isQuitting) {
      this.mainWindow = null;
      }
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
        // 先删除脚本
        const scriptResult = await this.scriptManager.deleteScript(scriptId);
        if (!scriptResult.success) {
          return scriptResult;
        }

        // 删除脚本成功后，清理相关的定时任务
        const taskResult = await this.taskScheduler.deleteTasksByScript(scriptId);

        return {
          success: true,
          message: '脚本删除成功',
          taskCleanup: taskResult
        };
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
        // 根据平台设置文件过滤器
        const filters = this.getFileFiltersForPlatform();

        const result = await dialog.showOpenDialog(this.mainWindow, {
          properties: ['openFile'],
          filters: filters
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

    ipcMain.handle('open-script-folder', async (event, scriptPath) => {
      try {
        const { shell } = require('electron');

        // 使用shell.showItemInFolder在文件管理器中显示文件
        shell.showItemInFolder(scriptPath);

        return { success: true };
      } catch (error) {
        console.error('打开文件夹失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 定时任务相关IPC
    ipcMain.handle('get-tasks', async () => {
      try {
        const tasks = this.taskScheduler.getTasks();
        return { success: true, tasks };
      } catch (error) {
        console.error('获取任务列表失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('create-task', async (event, taskData) => {
      try {
        return await this.taskScheduler.createTask(taskData);
      } catch (error) {
        console.error('创建任务失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('update-task', async (event, taskId, updates) => {
      try {
        return await this.taskScheduler.updateTask(taskId, updates);
      } catch (error) {
        console.error('更新任务失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('delete-task', async (event, taskId) => {
      try {
        return await this.taskScheduler.deleteTask(taskId);
      } catch (error) {
        console.error('删除任务失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('toggle-task', async (event, taskId, enabled) => {
      try {
        return await this.taskScheduler.toggleTask(taskId, enabled);
      } catch (error) {
        console.error('切换任务状态失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('run-task-now', async (event, taskId) => {
      try {
        return await this.taskScheduler.runTaskNow(taskId);
      } catch (error) {
        console.error('立即执行任务失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-tasks-by-script', async (event, scriptId) => {
      try {
        const tasks = this.taskScheduler.getTasksByScript(scriptId);
        return { success: true, tasks };
      } catch (error) {
        console.error('获取脚本任务失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-scheduler-status', async () => {
      try {
        const status = this.taskScheduler.getStatus();
        return { success: true, status };
      } catch (error) {
        console.error('获取调度器状态失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 心跳监控测试相关IPC
    ipcMain.handle('trigger-heartbeat-test', async () => {
      try {
        await this.taskScheduler.triggerHeartbeatTest();
        return { success: true, message: '心跳检查已触发' };
      } catch (error) {
        console.error('触发心跳检查失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('simulate-failure', async (event, failureType) => {
      try {
        await this.taskScheduler.simulateFailure(failureType);
        return { success: true, message: `已模拟 ${failureType} 故障` };
      } catch (error) {
        console.error('模拟故障失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('reset-simulation', async () => {
      try {
        this.taskScheduler.resetSimulation();
        return { success: true, message: '已重置所有模拟故障' };
      } catch (error) {
        console.error('重置模拟故障失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-heartbeat-status', async () => {
      try {
        const status = this.taskScheduler.getHeartbeatStatus();
        return { success: true, status };
      } catch (error) {
        console.error('获取心跳状态失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 测试系统通知
    ipcMain.handle('test-system-notification', async () => {
      try {
        const { Notification } = require('electron');

        // 检查通知支持和权限
        const supported = Notification.isSupported();
        let permission = 'unknown';

        if (supported) {
          // 通过heartbeatMonitor获取notificationManager
          const notificationManager = this.taskScheduler.heartbeatMonitor.notificationManager;
          const result = await notificationManager.sendSystemNotification(
            '通知测试',
            '这是一个测试通知，如果您看到这条消息，说明系统通知功能正常工作！',
            'INFO'
          );

          return {
            success: result,
            supported,
            permission,
            platform: process.platform,
            electronVersion: process.versions.electron
          };
        } else {
          return {
            success: false,
            error: '系统不支持通知功能',
            supported: false,
            platform: process.platform,
            electronVersion: process.versions.electron
          };
        }
      } catch (error) {
        console.error('测试系统通知失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 测试托盘通知
    ipcMain.handle('test-tray-notification', async () => {
      try {
        if (!this.tray) {
          return { success: false, error: '托盘不可用' };
        }

        // 通过heartbeatMonitor获取notificationManager
        const notificationManager = this.taskScheduler.heartbeatMonitor.notificationManager;
        const result = await notificationManager.sendTrayNotification(
          '托盘通知测试',
          '这是一个托盘通知测试，请检查系统托盘区域！',
          'INFO'
        );

        return { success: result };
      } catch (error) {
        console.error('测试托盘通知失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 检查通知权限
    ipcMain.handle('check-notification-permission', async () => {
      try {
        const { Notification } = require('electron');

        const supported = Notification.isSupported();
        let permission = 'unknown';

        // 在某些平台上可能有权限API
        if (typeof Notification.requestPermission === 'function') {
          permission = await Notification.requestPermission();
        }

        return {
          success: true,
          supported,
          permission,
          platform: process.platform,
          electronVersion: process.versions.electron,
          nodeVersion: process.versions.node
        };
      } catch (error) {
        console.error('检查通知权限失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 测试紧急通知
    ipcMain.handle('test-urgent-notification', async () => {
      try {
        const { Notification } = require('electron');

        if (!Notification.isSupported()) {
          return { success: false, error: '系统不支持通知功能' };
        }

        // 通过heartbeatMonitor获取notificationManager
        const notificationManager = this.taskScheduler.heartbeatMonitor.notificationManager;

        // 发送紧急通知
        const result = await notificationManager.sendSystemNotification(
          '🚨 紧急通知测试',
          '这是一个高优先级的紧急通知！如果您看到这条消息，说明通知系统工作正常。请检查Windows通知设置以确保应用通知已启用。',
          'ERROR',
          {
            urgency: 'critical',
            silent: false,
            timeoutType: 'never'
          }
        );

        // 同时发送托盘通知
        await notificationManager.sendTrayNotification(
          '🚨 紧急通知测试',
          '请检查系统通知区域！',
          'ERROR'
        );

        return { success: result };
      } catch (error) {
        console.error('测试紧急通知失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 模拟心跳异常
    ipcMain.handle('simulate-heartbeat-failure', async () => {
      try {
        // 获取心跳监控器
        const heartbeatMonitor = this.taskScheduler.heartbeatMonitor;

        // 模拟心跳异常
        log.warn('HeartbeatMonitor: 模拟心跳异常 - 测试通知系统');

        // 创建模拟的心跳异常错误
        const simulatedError = new Error('模拟的心跳异常 - 用于测试通知系统');

        // 设置连续失败次数为接近阈值，确保下次调用能触发恢复
        const maxFailures = heartbeatMonitor.maxFailures;
        heartbeatMonitor.consecutiveFailures = maxFailures - 1;

        log.info(`HeartbeatMonitor: 设置连续失败次数为 ${heartbeatMonitor.consecutiveFailures}，阈值为 ${maxFailures}`);

        // 调用心跳异常处理方法，这次调用将触发恢复和通知
        heartbeatMonitor.onHeartbeatError(simulatedError);

        return { success: true };
      } catch (error) {
        console.error('模拟心跳异常失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 设置相关IPC
    ipcMain.handle('load-settings', async () => {
      try {
        return await this.settingsManager.loadSettings();
      } catch (error) {
        console.error('加载设置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-settings', async (event, settings) => {
      try {
        return await this.settingsManager.saveSettings(settings);
      } catch (error) {
        console.error('保存设置失败:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-setting', async (event, key) => {
      try {
        return await this.settingsManager.getSetting(key);
      } catch (error) {
        console.error(`获取设置 ${key} 失败:`, error);
        return { success: false, error: error.message };
      }
    });

    // 打开外部链接
    ipcMain.handle('open-external', async (event, url) => {
      try {
        await shell.openExternal(url);
        return { success: true };
      } catch (error) {
        console.error('打开外部链接失败:', error);
        return { success: false, error: error.message };
      }
    });

    // 打开测试控制台
    ipcMain.handle('open-test-console', async () => {
      try {
        this.createTestConsoleWindow();
        return { success: true };
      } catch (error) {
        console.error('打开测试控制台失败:', error);
        return { success: false, error: error.message };
      }
    });
  }

  createTestConsoleWindow() {
    // 如果测试控制台窗口已存在，直接显示
    if (this.testConsoleWindow && !this.testConsoleWindow.isDestroyed()) {
      this.testConsoleWindow.show();
      this.testConsoleWindow.focus();
      return;
    }

    // 创建测试控制台窗口
    this.testConsoleWindow = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 500,
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
      title: '心跳监控测试控制台',
      show: false,
      autoHideMenuBar: true,
      icon: path.join(__dirname, 'assets/icon.png'),
      frame: true,
      resizable: true,
      maximizable: true,
      minimizable: true,
      closable: true,
      parent: this.mainWindow, // 设置为主窗口的子窗口
      modal: false
    });

    // 加载测试控制台页面
    this.testConsoleWindow.loadFile('app/renderer/test-console.html');

    // 窗口准备好后显示
    this.testConsoleWindow.once('ready-to-show', () => {
      this.testConsoleWindow.show();
    });

    // 开发模式下打开开发者工具
    if (process.argv.includes('--dev')) {
      this.testConsoleWindow.webContents.openDevTools();
    }

    // 处理窗口关闭事件
    this.testConsoleWindow.on('closed', () => {
      this.testConsoleWindow = null;
    });
  }

  createTray() {
    // 创建托盘图标
    const nativeImage = require('electron').nativeImage;
    let trayIcon;

    try {
      // 首先尝试使用小尺寸图标（16x16 或 32x32 最适合托盘）
      let iconPath;
      if (process.platform === 'win32') {
        // Windows 平台优先使用 16x16 图标
        iconPath = path.join(__dirname, 'assets/icon-16.png');
      } else {
        // 其他平台使用 32x32 图标
        iconPath = path.join(__dirname, 'assets/icon-32.png');
      }

      console.log('尝试加载托盘图标:', iconPath);

      if (fs.existsSync(iconPath)) {
        console.log('图标文件存在，正在加载...');
        trayIcon = nativeImage.createFromPath(iconPath);
        console.log('成功加载托盘图标');
      } else {
        // 如果小尺寸图标不存在，尝试使用标准图标
        iconPath = path.join(__dirname, 'assets/icon.png');
        if (fs.existsSync(iconPath)) {
          console.log('使用标准图标:', iconPath);
          trayIcon = nativeImage.createFromPath(iconPath);
          // 调整大小以适合托盘
          trayIcon = trayIcon.resize({ width: 16, height: 16 });
        } else {
          throw new Error('找不到任何图标文件');
        }
      }
    } catch (error) {
      console.error('加载托盘图标失败:', error);

      // 如果加载失败，创建一个简单的图标
      try {
        console.log('创建备用图标...');
        const emptyIcon = nativeImage.createEmpty();
        emptyIcon.addRepresentation({
          width: 16,
          height: 16,
          buffer: Buffer.alloc(16 * 16 * 4, 255),  // 创建一个16x16的白色图标
          scaleFactor: 1.0
        });
        trayIcon = emptyIcon;
        console.log('成功创建备用图标');
      } catch (finalErr) {
        console.error('创建备用图标失败:', finalErr);
        trayIcon = nativeImage.createEmpty();
      }
    }

    // 创建托盘
    console.log('创建系统托盘...');
    this.tray = new Tray(trayIcon);

    // 在 macOS 上设置为模板图标以获得更好的系统集成
    if (process.platform === 'darwin') {
      this.tray.setTemplateImage(true);
    }

    this.tray.setToolTip('脚本管理器');
    console.log('托盘创建成功');

    // 创建托盘菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '显示窗口',
        click: () => {
          if (this.mainWindow) {
            this.mainWindow.show();
          } else {
            this.createWindow();
          }
        }
      },
      {
        label: '退出',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
    console.log('托盘菜单设置完成');

    // 点击托盘图标显示窗口
    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          if (this.mainWindow.isMinimized()) {
            this.mainWindow.restore();
          }
        } else {
          this.mainWindow.show();
        }
        this.mainWindow.focus();
      } else {
        this.createWindow();
      }
    });
    console.log('托盘点击事件设置完成');
  }

  getFileFiltersForPlatform() {
    const baseFilters = [
      { name: 'Python脚本', extensions: ['py', 'pyw'] },
      { name: 'JavaScript脚本', extensions: ['js'] },
      { name: 'TypeScript脚本', extensions: ['ts'] },
      { name: 'Shell脚本', extensions: ['sh'] }
    ];

    if (process.platform === 'win32') {
      // Windows 平台添加特有的脚本类型
      baseFilters.push(
        { name: 'Batch脚本', extensions: ['bat', 'cmd'] },
        { name: 'PowerShell脚本', extensions: ['ps1'] }
      );
    } else if (process.platform === 'darwin') {
      // macOS 平台添加特有的脚本类型
      baseFilters.push(
        { name: 'macOS脚本', extensions: ['command', 'tool'] }
      );
    }

    // 添加所有文件选项
    baseFilters.push({ name: '所有文件', extensions: ['*'] });

    return baseFilters;
  }
}

// 创建应用实例
new ScriptManagerApp();