const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const os = require('os');

/**
 * 轻量级定时任务调度器
 * 专为个人脚本启动器设计，提供简单实用的定时功能
 */
class TaskScheduler {
  constructor(scriptExecutor, scriptManager) {
    this.scriptExecutor = scriptExecutor;
    this.scriptManager = scriptManager;
    this.tasks = new Map(); // 存储任务配置
    this.timers = new Map(); // 存储定时器

    // 在便携版中使用用户目录存储数据
    const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
    this.dataFile = path.join(userDataPath, 'tasks.json');
    this.isRunning = false;

    this.init();
  }

  async init() {
    await this.loadTasks();
    this.startScheduler();
  }

  /**
   * 加载任务配置
   */
  async loadTasks() {
    try {
      // 确保数据目录存在
      const dataDir = path.dirname(this.dataFile);
      await fs.mkdir(dataDir, { recursive: true });

      // 尝试读取任务文件
      try {
        const data = await fs.readFile(this.dataFile, 'utf8');
        const tasks = JSON.parse(data);

        tasks.forEach(task => {
          this.tasks.set(task.id, task);
        });

        console.log(`TaskScheduler: 加载了 ${tasks.length} 个定时任务`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          // 文件不存在，创建空任务列表
          await this.saveTasks();
          console.log('TaskScheduler: 创建了新的任务配置文件');
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error('TaskScheduler: 加载任务失败:', error);
    }
  }

  /**
   * 保存任务配置
   */
  async saveTasks() {
    try {
      const tasks = Array.from(this.tasks.values());
      await fs.writeFile(this.dataFile, JSON.stringify(tasks, null, 2), 'utf8');
    } catch (error) {
      console.error('TaskScheduler: 保存任务失败:', error);
      throw error;
    }
  }

  /**
   * 启动调度器
   */
  startScheduler() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('TaskScheduler: 调度器已启动');

    // 为所有启用的任务设置定时器
    this.tasks.forEach(task => {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    });
  }

  /**
   * 停止调度器
   */
  stopScheduler() {
    this.isRunning = false;

    // 清除所有定时器
    this.timers.forEach(timer => {
      clearTimeout(timer);
    });
    this.timers.clear();

    console.log('TaskScheduler: 调度器已停止');
  }

  /**
   * 创建定时任务
   */
  async createTask(taskData) {
    try {
      const task = {
        id: this.generateTaskId(),
        scriptId: taskData.scriptId,
        name: taskData.name || `脚本${taskData.scriptId}的定时任务`,
        schedule: taskData.schedule, // { type: 'interval', value: 3600000 } 或 { type: 'daily', time: '09:00' }
        enabled: true,
        createdAt: new Date().toISOString(),
        lastRun: null,
        nextRun: this.calculateNextRun(taskData.schedule),
        runCount: 0
      };

      this.tasks.set(task.id, task);
      await this.saveTasks();

      if (task.enabled && this.isRunning) {
        this.scheduleTask(task);
      }

      return { success: true, task };
    } catch (error) {
      console.error('TaskScheduler: 创建任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId, updates) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        return { success: false, error: '任务不存在' };
      }

      // 更新任务配置
      Object.assign(task, updates);
      task.updatedAt = new Date().toISOString();

      // 重新计算下次运行时间
      if (updates.schedule) {
        task.nextRun = this.calculateNextRun(updates.schedule);
      }

      await this.saveTasks();

      // 重新调度任务
      this.unscheduleTask(taskId);
      if (task.enabled && this.isRunning) {
        this.scheduleTask(task);
      }

      return { success: true, task };
    } catch (error) {
      console.error('TaskScheduler: 更新任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    try {
      this.unscheduleTask(taskId);
      this.tasks.delete(taskId);
      await this.saveTasks();

      return { success: true };
    } catch (error) {
      console.error('TaskScheduler: 删除任务失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取所有任务
   */
  getTasks() {
    return Array.from(this.tasks.values());
  }

  /**
   * 获取脚本的定时任务
   */
  getTasksByScript(scriptId) {
    return this.getTasks().filter(task => task.scriptId === scriptId);
  }

  /**
   * 启用/禁用任务
   */
  async toggleTask(taskId, enabled) {
    return await this.updateTask(taskId, { enabled });
  }

  /**
   * 立即执行任务
   */
  async runTaskNow(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { success: false, error: '任务不存在' };
    }

    return await this.executeTask(task);
  }

  /**
   * 调度单个任务
   */
  scheduleTask(task) {
    const now = new Date();
    const nextRun = new Date(task.nextRun);
    const delay = nextRun.getTime() - now.getTime();

    // 清除现有的定时器
    this.unscheduleTask(task.id);

    if (delay <= 0) {
      // 如果时间已过，重新计算下次运行时间
      task.nextRun = this.calculateNextRun(task.schedule);
      this.saveTasks(); // 保存更新的时间

      // 重新调度
      this.scheduleTask(task);
      return;
    }

    const timer = setTimeout(() => {
      this.executeTask(task);
    }, delay);

    this.timers.set(task.id, timer);
    console.log(`TaskScheduler: 任务 ${task.name} 已调度，将在 ${nextRun.toLocaleString()} 执行`);
  }

  /**
   * 取消调度任务
   */
  unscheduleTask(taskId) {
    const timer = this.timers.get(taskId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(taskId);
    }
  }

  /**
   * 执行任务
   */
  async executeTask(task) {
    try {
      console.log(`TaskScheduler: 开始执行任务 ${task.name}`);

      // 获取脚本信息
      const scriptData = await this.getScriptData(task.scriptId);
      if (!scriptData) {
        throw new Error(`脚本 ID ${task.scriptId} 不存在`);
      }

      // 更新任务状态
      task.lastRun = new Date().toISOString();
      task.runCount++;
      task.nextRun = this.calculateNextRun(task.schedule);

      await this.saveTasks();

      // 执行脚本 - 使用原始脚本数据，不修改name避免Windows命令问题
      const result = await this.scriptExecutor.launchScript(task.scriptId, scriptData);

      console.log(`TaskScheduler: 任务 ${task.name} 执行完成:`, result.success ? '成功' : '失败');

      // 重新调度下次执行
      if (task.enabled && this.isRunning) {
        this.scheduleTask(task);
      }

      return result;
    } catch (error) {
      console.error(`TaskScheduler: 执行任务 ${task.name} 失败:`, error);

      // 即使执行失败也要重新调度
      if (task.enabled && this.isRunning) {
        this.scheduleTask(task);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * 获取脚本数据
   */
  async getScriptData(scriptId) {
    try {
      if (this.scriptManager && this.scriptManager.getScript) {
        return await this.scriptManager.getScript(scriptId);
      }

      // 如果没有scriptManager，直接从文件读取
      const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
      const scriptsFile = path.join(userDataPath, 'scripts.json');
      const data = await fs.readFile(scriptsFile, 'utf8');
      const scripts = JSON.parse(data);

      return scripts.find(script => script.id === scriptId);
    } catch (error) {
      console.error('获取脚本数据失败:', error);
      return null;
    }
  }

  /**
   * 计算下次运行时间
   */
  calculateNextRun(schedule) {
    const now = new Date();

    switch (schedule.type) {
      case 'interval':
        // 间隔执行（毫秒）
        return new Date(now.getTime() + schedule.value);

      case 'daily':
        // 每日定时执行
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);

        // 如果今天的时间已过，设置为明天
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }

        return nextRun;

      case 'weekly':
        // 每周定时执行
        const targetDay = schedule.day; // 0-6 (周日到周六)
        const [weekHours, weekMinutes] = schedule.time.split(':').map(Number);
        const weeklyNext = new Date(now);

        weeklyNext.setHours(weekHours, weekMinutes, 0, 0);

        const daysUntilTarget = (targetDay - now.getDay() + 7) % 7;
        if (daysUntilTarget === 0 && weeklyNext <= now) {
          weeklyNext.setDate(weeklyNext.getDate() + 7);
        } else {
          weeklyNext.setDate(weeklyNext.getDate() + daysUntilTarget);
        }

        return weeklyNext;

      default:
        throw new Error(`不支持的调度类型: ${schedule.type}`);
    }
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      totalTasks: this.tasks.size,
      activeTasks: Array.from(this.tasks.values()).filter(t => t.enabled).length,
      scheduledTasks: this.timers.size
    };
  }
}

module.exports = TaskScheduler;
