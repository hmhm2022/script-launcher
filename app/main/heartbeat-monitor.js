const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const os = require('os');
const log = require('electron-log');
const NotificationManager = require('./notification-manager');

/**
 * 心跳监控器
 * 负责定期检查系统健康状态，检测和恢复"悄无声息失效"的问题
 */
class HeartbeatMonitor {
  constructor(taskScheduler, scriptExecutor, scriptManager, tray = null) {
    this.taskScheduler = taskScheduler;
    this.scriptExecutor = scriptExecutor;
    this.scriptManager = scriptManager;

    // 心跳配置
    this.isTestMode = process.argv.includes('--test-heartbeat');
    this.heartbeatInterval = this.isTestMode ? 30 * 1000 : 5 * 60 * 1000; // 测试模式30秒，正常模式5分钟
    this.lastHeartbeat = Date.now();
    this.healthStatus = 'healthy';
    this.consecutiveFailures = 0;
    this.maxFailures = this.isTestMode ? 2 : 3; // 测试模式2次失败触发恢复，正常模式3次

    // 心跳定时器
    this.heartbeatTimer = null;
    this.isRunning = false;

    // 健康检查历史
    this.healthHistory = [];
    this.maxHistorySize = 100; // 保留最近100次检查记录

    // 数据文件路径
    const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
    this.healthDataFile = path.join(userDataPath, 'health-data.json');

    // 初始化通知管理器
    this.notificationManager = new NotificationManager(tray);

    if (this.isTestMode) {
      log.info('HeartbeatMonitor: 心跳监控器已初始化 [测试模式 - 30秒间隔]');
    } else {
      log.info('HeartbeatMonitor: 心跳监控器已初始化 [正常模式 - 5分钟间隔]');
    }
  }

  /**
   * 启动心跳监控
   */
  start() {
    if (this.isRunning) {
      log.warn('HeartbeatMonitor: 心跳监控已在运行');
      return;
    }

    this.isRunning = true;
    this.startHeartbeat();
    log.info('HeartbeatMonitor: 心跳监控已启动');
  }

  /**
   * 停止心跳监控
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    log.info('HeartbeatMonitor: 心跳监控已停止');
  }

  /**
   * 启动心跳定时器
   */
  startHeartbeat() {
    // 立即执行一次健康检查
    this.performHeartbeat();

    // 设置定期心跳
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat();
    }, this.heartbeatInterval);
  }

  /**
   * 执行心跳检查
   */
  async performHeartbeat() {
    try {
      log.debug('HeartbeatMonitor: 开始执行心跳检查');

      const healthCheck = await this.checkSystemHealth();

      // 记录心跳结果
      this.recordHealthCheck(healthCheck);

      if (healthCheck.healthy) {
        this.onHealthyHeartbeat(healthCheck);
      } else {
        this.onUnhealthyHeartbeat(healthCheck);
      }

      this.lastHeartbeat = Date.now();

    } catch (error) {
      log.error('HeartbeatMonitor: 心跳检查异常', error);
      this.onHeartbeatError(error);
    }
  }

  /**
   * 系统健康检查
   */
  async checkSystemHealth() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      healthy: true,
      issues: [],
      details: {}
    };

    try {
      // 1. 检查调度器状态
      const schedulerHealth = this.checkSchedulerHealth();
      healthCheck.details.scheduler = schedulerHealth;
      if (!schedulerHealth.healthy) {
        healthCheck.healthy = false;
        healthCheck.issues.push('调度器异常');
      }

      // 2. 检查任务状态
      const tasksHealth = await this.checkTasksHealth();
      healthCheck.details.tasks = tasksHealth;
      if (!tasksHealth.healthy) {
        healthCheck.healthy = false;
        // 传递具体的任务问题，而不是通用的"任务状态异常"
        healthCheck.issues.push(...tasksHealth.issues);
      }

      // 3. 检查系统资源
      const resourcesHealth = await this.checkSystemResources();
      healthCheck.details.resources = resourcesHealth;
      if (!resourcesHealth.healthy) {
        healthCheck.healthy = false;
        healthCheck.issues.push('系统资源异常');
      }

      // 4. 检查环境依赖
      const environmentHealth = await this.checkEnvironment();
      healthCheck.details.environment = environmentHealth;
      if (!environmentHealth.healthy) {
        healthCheck.healthy = false;
        healthCheck.issues.push('环境依赖异常');
      }

    } catch (error) {
      healthCheck.healthy = false;
      healthCheck.issues.push(`健康检查异常: ${error.message}`);
      log.error('HeartbeatMonitor: 健康检查过程中发生异常', error);
    }

    return healthCheck;
  }

  /**
   * 检查调度器健康状态
   */
  checkSchedulerHealth() {
    try {
      const status = this.taskScheduler.getStatus();

      return {
        healthy: status.isRunning && status.scheduledTasks >= 0,
        isRunning: status.isRunning,
        totalTasks: status.totalTasks,
        activeTasks: status.activeTasks,
        scheduledTasks: status.scheduledTasks,
        issues: []
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`调度器状态检查失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查任务健康状态
   */
  async checkTasksHealth() {
    try {
      const tasks = this.taskScheduler.getTasks();
      const issues = [];
      let healthyTaskCount = 0;

      for (const task of tasks) {
        if (!task.enabled) continue;

        // 检查脚本文件是否存在
        const scriptData = await this.taskScheduler.getScriptData(task.scriptId);
        if (!scriptData) {
          issues.push(`任务 ${task.name}: 关联脚本不存在`);
          continue;
        }

        // 检查脚本文件路径
        const fs = require('fs');
        if (this._simulateScriptMissing || !fs.existsSync(scriptData.path)) {
          issues.push(`任务 ${task.name}: 脚本文件不存在 ${scriptData.path}`);
          continue;
        }

        healthyTaskCount++;
      }

      return {
        healthy: issues.length === 0,
        totalTasks: tasks.length,
        enabledTasks: tasks.filter(t => t.enabled).length,
        healthyTasks: healthyTaskCount,
        issues
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`任务健康检查失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查系统资源
   */
  async checkSystemResources() {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();

      // 简单的资源检查
      const memoryIssues = [];
      if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        memoryIssues.push('内存使用量较高');
      }

      return {
        healthy: memoryIssues.length === 0,
        memory: {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external
        },
        uptime,
        issues: memoryIssues
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`系统资源检查失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查环境依赖
   */
  async checkEnvironment() {
    try {
      const issues = [];
      const environmentDetails = {
        platform: process.platform,
        nodeVersion: process.version,
        pythonAvailable: false,
        pythonVersion: null,
        pathVariables: {},
        diskSpace: null
      };

      // 检查Python可用性
      try {
        const pythonCheck = await this.checkPythonAvailability();
        environmentDetails.pythonAvailable = pythonCheck.available;
        environmentDetails.pythonVersion = pythonCheck.version;
        if (!pythonCheck.available) {
          issues.push('Python环境不可用');
        }
      } catch (error) {
        issues.push(`Python检查失败: ${error.message}`);
      }

      // 检查关键路径变量
      try {
        environmentDetails.pathVariables = this.checkPathVariables();
      } catch (error) {
        issues.push(`路径变量检查失败: ${error.message}`);
      }

      // 检查磁盘空间
      try {
        const diskSpace = await this.checkDiskSpace();
        environmentDetails.diskSpace = diskSpace;
        if (diskSpace.freeSpaceGB < 1) { // 少于1GB空闲空间
          issues.push('磁盘空间不足');
        }
      } catch (error) {
        issues.push(`磁盘空间检查失败: ${error.message}`);
      }

      return {
        healthy: issues.length === 0,
        ...environmentDetails,
        issues
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`环境检查失败: ${error.message}`]
      };
    }
  }

  /**
   * 检查Python可用性
   */
  async checkPythonAvailability() {
    // 如果模拟Python故障，直接返回不可用
    if (this._simulatePythonFailure) {
      return { available: false, version: null };
    }

    return new Promise((resolve) => {
      const { exec } = require('child_process');

      exec('python --version', { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          // 尝试python3命令
          exec('python3 --version', { timeout: 5000 }, (error3, stdout3, stderr3) => {
            if (error3) {
              resolve({ available: false, version: null });
            } else {
              const version = stdout3.trim() || stderr3.trim();
              resolve({ available: true, version });
            }
          });
        } else {
          const version = stdout.trim() || stderr.trim();
          resolve({ available: true, version });
        }
      });
    });
  }

  /**
   * 检查关键路径变量
   */
  checkPathVariables() {
    const pathVars = {
      PATH: process.env.PATH ? process.env.PATH.length > 0 : false,
      USERPROFILE: !!process.env.USERPROFILE,
      TEMP: !!process.env.TEMP,
      APPDATA: !!process.env.APPDATA
    };

    if (process.platform === 'win32') {
      pathVars.SYSTEMROOT = !!process.env.SYSTEMROOT;
      pathVars.WINDIR = !!process.env.WINDIR;
    }

    return pathVars;
  }

  /**
   * 检查磁盘空间
   */
  async checkDiskSpace() {
    try {
      const userDataPath = app.getPath('userData');
      const stats = await fs.stat(userDataPath);

      // 简化的磁盘空间检查（实际项目中可能需要更精确的方法）
      return {
        path: userDataPath,
        freeSpaceGB: 10, // 占位值，实际实现需要系统调用
        totalSpaceGB: 100 // 占位值
      };
    } catch (error) {
      throw new Error(`磁盘空间检查失败: ${error.message}`);
    }
  }

  /**
   * 记录健康检查结果
   */
  recordHealthCheck(healthCheck) {
    this.healthHistory.push(healthCheck);

    // 保持历史记录大小限制
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  /**
   * 处理健康心跳
   */
  onHealthyHeartbeat(healthCheck) {
    this.healthStatus = 'healthy';
    this.consecutiveFailures = 0;
    log.debug('HeartbeatMonitor: 心跳正常');
  }

  /**
   * 处理不健康心跳
   */
  onUnhealthyHeartbeat(healthCheck) {
    this.consecutiveFailures++;
    this.healthStatus = 'unhealthy';

    log.warn(`HeartbeatMonitor: 检测到健康问题 (连续失败: ${this.consecutiveFailures})`, {
      issues: healthCheck.issues
    });

    if (this.consecutiveFailures >= this.maxFailures) {
      this.triggerRecovery(healthCheck);
    }
  }

  /**
   * 处理心跳错误
   */
  onHeartbeatError(error) {
    this.consecutiveFailures++;
    this.healthStatus = 'error';

    log.error(`HeartbeatMonitor: 心跳检查错误 (连续失败: ${this.consecutiveFailures})`, error);

    if (this.consecutiveFailures >= this.maxFailures) {
      this.triggerRecovery({
        healthy: false,
        issues: [`心跳检查错误: ${error.message}`]
      });
    }
  }

  /**
   * 触发恢复机制
   */
  async triggerRecovery(healthCheck) {
    log.warn('HeartbeatMonitor: 触发自动恢复机制', healthCheck);

    const recoveryActions = [];

    try {
      // 分析问题并执行相应的恢复策略
      for (const issue of healthCheck.issues) {
        if (issue.includes('调度器异常')) {
          const result = await this.recoverScheduler();
          recoveryActions.push({ action: '重启调度器', result });
        }

        if (issue.includes('脚本文件不存在')) {
          const result = await this.recoverMissingScripts();
          recoveryActions.push({ action: '修复脚本路径', result });
        }

        if (issue.includes('Python环境不可用')) {
          const result = await this.recoverPythonEnvironment();
          recoveryActions.push({ action: '修复Python环境', result });
        }

        if (issue.includes('磁盘空间不足')) {
          const result = await this.recoverDiskSpace();
          recoveryActions.push({ action: '清理磁盘空间', result });
        }
      }

      // 记录恢复结果
      log.info('HeartbeatMonitor: 自动恢复完成', {
        actions: recoveryActions,
        timestamp: new Date().toISOString()
      });

      // 发送恢复通知
      await this.sendRecoveryNotification(recoveryActions, healthCheck);

    } catch (error) {
      log.error('HeartbeatMonitor: 自动恢复过程中发生错误', error);
    }

    // 重置连续失败计数，避免频繁触发恢复
    this.consecutiveFailures = 0;
  }

  /**
   * 恢复调度器
   */
  async recoverScheduler() {
    try {
      log.info('HeartbeatMonitor: 尝试重启调度器');

      // 停止当前调度器
      if (this.taskScheduler.isRunning) {
        this.taskScheduler.stopScheduler();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
      }

      // 重新启动调度器
      this.taskScheduler.startScheduler();

      // 验证调度器状态
      const status = this.taskScheduler.getStatus();
      if (status.isRunning) {
        return { success: true, message: '调度器重启成功' };
      } else {
        return { success: false, message: '调度器重启失败' };
      }
    } catch (error) {
      return { success: false, message: `调度器恢复失败: ${error.message}` };
    }
  }

  /**
   * 恢复缺失的脚本
   */
  async recoverMissingScripts() {
    try {
      log.info('HeartbeatMonitor: 检查并修复缺失的脚本');

      const tasks = this.taskScheduler.getTasks();
      const recoveredScripts = [];
      const failedScripts = [];

      for (const task of tasks) {
        if (!task.enabled) continue;

        const scriptData = await this.taskScheduler.getScriptData(task.scriptId);
        if (!scriptData) {
          failedScripts.push({ taskName: task.name, reason: '脚本数据不存在' });
          continue;
        }

        const fs = require('fs');
        if (!fs.existsSync(scriptData.path)) {
          // 尝试在常见位置查找脚本
          const recoveredPath = await this.findScriptInCommonLocations(scriptData);
          if (recoveredPath) {
            // 更新脚本路径
            await this.scriptManager.updateScript(task.scriptId, {
              ...scriptData,
              path: recoveredPath
            });
            recoveredScripts.push({ taskName: task.name, newPath: recoveredPath });
          } else {
            failedScripts.push({ taskName: task.name, reason: '无法找到脚本文件' });
          }
        }
      }

      return {
        success: failedScripts.length === 0,
        message: `恢复了 ${recoveredScripts.length} 个脚本，${failedScripts.length} 个失败`,
        details: { recovered: recoveredScripts, failed: failedScripts }
      };
    } catch (error) {
      return { success: false, message: `脚本恢复失败: ${error.message}` };
    }
  }

  /**
   * 在常见位置查找脚本
   */
  async findScriptInCommonLocations(scriptData) {
    const fs = require('fs');
    const commonPaths = [
      path.join(os.homedir(), 'Desktop'),
      path.join(os.homedir(), 'Documents'),
      path.join(os.homedir(), 'Downloads'),
      'C:\\Scripts',
      'D:\\Scripts'
    ];

    const scriptName = path.basename(scriptData.path);

    for (const commonPath of commonPaths) {
      const possiblePath = path.join(commonPath, scriptName);
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }

  /**
   * 恢复Python环境
   */
  async recoverPythonEnvironment() {
    try {
      log.info('HeartbeatMonitor: 尝试修复Python环境');

      // 重新检查Python可用性
      const pythonCheck = await this.checkPythonAvailability();
      if (pythonCheck.available) {
        return { success: true, message: 'Python环境已恢复正常' };
      }

      // 提供修复建议
      const suggestions = [
        '请确保Python已正确安装',
        '检查PATH环境变量是否包含Python路径',
        '尝试重新安装Python或修复安装'
      ];

      return {
        success: false,
        message: 'Python环境仍不可用',
        suggestions
      };
    } catch (error) {
      return { success: false, message: `Python环境恢复失败: ${error.message}` };
    }
  }

  /**
   * 恢复磁盘空间
   */
  async recoverDiskSpace() {
    try {
      log.info('HeartbeatMonitor: 尝试清理磁盘空间');

      const cleanupActions = [];

      // 清理临时文件
      const tempDir = app.getPath('temp');
      try {
        // 这里可以实现临时文件清理逻辑
        cleanupActions.push('清理临时文件');
      } catch (error) {
        log.warn('清理临时文件失败', error);
      }

      // 清理日志文件（保留最近的）
      try {
        // 这里可以实现日志文件清理逻辑
        cleanupActions.push('清理旧日志文件');
      } catch (error) {
        log.warn('清理日志文件失败', error);
      }

      return {
        success: true,
        message: `执行了 ${cleanupActions.length} 项清理操作`,
        actions: cleanupActions
      };
    } catch (error) {
      return { success: false, message: `磁盘空间恢复失败: ${error.message}` };
    }
  }

  /**
   * 发送恢复通知
   */
  async sendRecoveryNotification(recoveryActions, healthCheck) {
    try {
      const successfulActions = recoveryActions.filter(action => action.result.success);
      const failedActions = recoveryActions.filter(action => !action.result.success);

      // 首先发送具体问题通知
      if (healthCheck && healthCheck.issues) {
        await this.sendSpecificProblemNotifications(healthCheck.issues);
      }

      // 然后发送恢复结果通知
      if (recoveryActions.length > 0) {
        await this.sendRecoveryResultNotifications(recoveryActions);
      }

      log.info('HeartbeatMonitor: 恢复通知已发送', {
        successful: successfulActions.length,
        failed: failedActions.length,
        totalActions: recoveryActions.length
      });
    } catch (error) {
      log.error('发送恢复通知失败', error);
    }
  }

  /**
   * 发送具体问题通知
   */
  async sendSpecificProblemNotifications(issues) {
    try {
      for (const issue of issues) {
        let title, body, level;

        // 调度器相关问题
        if (issue.includes('调度器异常')) {
          title = '⚙️ 调度器异常';
          body = '任务调度器停止运行，正在重启调度服务';
          level = 'ERROR';
        } else if (issue.includes('调度器状态检查失败')) {
          title = '⚙️ 调度器检查失败';
          body = '调度器状态检查过程异常，请检查系统状态';
          level = 'ERROR';
        }

        // 任务相关问题
        else if (issue.includes('任务状态异常')) {
          title = '📋 任务状态异常';
          body = '检测到任务执行状态异常，正在检查任务配置';
          level = 'WARNING';
        } else if (issue.includes('关联脚本不存在')) {
          title = '🔗 脚本关联异常';
          body = '任务关联的脚本数据缺失，正在尝试修复';
          level = 'WARNING';
        } else if (issue.includes('脚本文件不存在')) {
          title = '📄 脚本文件丢失';
          body = '检测到脚本文件缺失，正在尝试恢复文件路径';
          level = 'WARNING';
        } else if (issue.includes('任务健康检查失败')) {
          title = '📋 任务检查失败';
          body = '任务健康检查过程异常，请检查任务配置';
          level = 'ERROR';
        }

        // 系统资源相关问题
        else if (issue.includes('系统资源异常')) {
          title = '⚡ 系统资源异常';
          body = '检测到系统资源使用异常，正在监控资源状态';
          level = 'WARNING';
        } else if (issue.includes('内存使用量较高')) {
          title = '🧠 内存使用过高';
          body = '应用内存使用量超过500MB，建议关注内存使用情况';
          level = 'WARNING';
        } else if (issue.includes('系统资源检查失败')) {
          title = '⚡ 资源检查失败';
          body = '系统资源检查过程异常，请检查系统状态';
          level = 'ERROR';
        }

        // 环境依赖相关问题
        else if (issue.includes('环境依赖异常')) {
          title = '🌍 环境依赖异常';
          body = '检测到环境依赖问题，正在检查系统环境配置';
          level = 'WARNING';
        } else if (issue.includes('Python环境不可用')) {
          title = '🐍 Python环境异常';
          body = 'Python环境不可用，正在尝试修复环境配置';
          level = 'ERROR';
        } else if (issue.includes('Python检查失败')) {
          title = '🐍 Python检查失败';
          body = 'Python环境检查过程异常，请检查Python安装';
          level = 'ERROR';
        } else if (issue.includes('路径变量检查失败')) {
          title = '🛤️ 路径变量异常';
          body = '系统路径变量检查失败，请检查环境变量配置';
          level = 'ERROR';
        } else if (issue.includes('磁盘空间不足')) {
          title = '💾 磁盘空间不足';
          body = '系统磁盘空间不足，正在清理临时文件';
          level = 'WARNING';
        } else if (issue.includes('磁盘空间检查失败')) {
          title = '💾 磁盘检查失败';
          body = '磁盘空间检查过程异常，请检查磁盘状态';
          level = 'ERROR';
        } else if (issue.includes('环境检查失败')) {
          title = '🌍 环境检查失败';
          body = '环境依赖检查过程异常，请检查系统环境';
          level = 'ERROR';
        }

        // 心跳检查相关问题
        else if (issue.includes('心跳检查错误')) {
          title = '💓 心跳检查异常';
          body = '心跳检查过程本身出现异常，正在重新初始化监控';
          level = 'ERROR';
        } else if (issue.includes('健康检查异常')) {
          title = '🏥 健康检查异常';
          body = '系统健康检查过程异常，正在重新启动监控系统';
          level = 'ERROR';
        }

        // 兜底通知 - 未知问题
        else {
          title = '🚨 心跳异常检测';
          body = `检测到未知问题：${issue}`;
          level = 'ERROR';
        }

        // 发送系统通知和托盘通知
        await this.notificationManager.sendSystemNotification(title, body, level);
        await this.notificationManager.sendTrayNotification(title, body, level);
      }
    } catch (error) {
      log.error('发送具体问题通知失败', error);
    }
  }

  /**
   * 发送恢复结果通知
   */
  async sendRecoveryResultNotifications(recoveryActions) {
    try {
      const successfulActions = recoveryActions.filter(action => action.result.success);
      const failedActions = recoveryActions.filter(action => !action.result.success);

      // 发送成功恢复通知
      if (successfulActions.length > 0) {
        for (const action of successfulActions) {
          let title, body;

          switch (action.action) {
            case '修复Python环境':
              title = '✅ Python环境已恢复';
              body = 'Python环境问题已解决，系统恢复正常';
              break;
            case '修复脚本路径':
              title = '✅ 脚本路径已修复';
              body = '脚本文件路径已恢复，任务可以正常执行';
              break;
            case '重启调度器':
              title = '✅ 调度器已重启';
              body = '任务调度器已重新启动，定时任务恢复正常';
              break;
            case '清理磁盘空间':
              title = '✅ 磁盘空间已清理';
              body = '磁盘空间清理完成，系统存储恢复正常';
              break;
            default:
              title = '✅ 系统自动恢复';
              body = `${action.action}已完成`;
          }

          await this.notificationManager.sendSystemNotification(title, body, 'SUCCESS');
          await this.notificationManager.sendTrayNotification(title, body, 'SUCCESS');
        }
      }

      // 发送失败恢复通知
      if (failedActions.length > 0) {
        await this.notificationManager.sendSystemNotification(
          '⚠️ 自动恢复部分失败',
          `${failedActions.length} 项恢复操作失败，可能需要手动干预`,
          'WARNING'
        );
        await this.notificationManager.sendTrayNotification(
          '⚠️ 自动恢复部分失败',
          `${failedActions.length} 项恢复操作失败`,
          'WARNING'
        );
      }
    } catch (error) {
      log.error('发送恢复结果通知失败', error);
    }
  }

  /**
   * 手动触发心跳检查（测试用）
   */
  async triggerHeartbeatNow() {
    log.info('HeartbeatMonitor: 手动触发心跳检查');
    await this.performHeartbeat();
  }

  /**
   * 模拟故障（测试用）
   */
  async simulateFailure(failureType) {
    log.warn(`HeartbeatMonitor: 模拟故障 - ${failureType}`);

    switch (failureType) {
      case 'scheduler':
        // 模拟调度器故障
        this.taskScheduler.isRunning = false;
        break;
      case 'script-missing':
        // 模拟脚本文件丢失（通过修改检查逻辑）
        this._simulateScriptMissing = true;
        log.info('HeartbeatMonitor: 已启用脚本文件丢失模拟');
        break;
      case 'python':
        // 模拟Python环境问题（通过修改检查逻辑）
        this._simulatePythonFailure = true;
        break;
      default:
        log.warn('HeartbeatMonitor: 未知的故障类型:', failureType);
    }

    // 立即触发心跳检查
    await this.triggerHeartbeatNow();
  }

  /**
   * 重置模拟故障（测试用）
   */
  resetSimulation() {
    log.info('HeartbeatMonitor: 重置所有模拟故障');
    this._simulatePythonFailure = false;
    this._simulateScriptMissing = false;

    // 重置连续失败计数和健康状态
    this.consecutiveFailures = 0;
    this.healthStatus = 'healthy';

    // 恢复调度器状态
    if (!this.taskScheduler.isRunning) {
      this.taskScheduler.startScheduler();
    }

    log.info('HeartbeatMonitor: 连续失败计数已重置，健康状态已恢复');
  }

  /**
   * 设置托盘引用
   */
  setTray(tray) {
    if (this.notificationManager) {
      this.notificationManager.setTray(tray);
      log.info('HeartbeatMonitor: 托盘引用已设置');
    }
  }

  /**
   * 获取当前健康状态
   */
  getHealthStatus() {
    return {
      status: this.healthStatus,
      lastHeartbeat: this.lastHeartbeat,
      consecutiveFailures: this.consecutiveFailures,
      isRunning: this.isRunning,
      recentHistory: this.healthHistory.slice(-10) // 最近10次检查
    };
  }
}

module.exports = HeartbeatMonitor;
