const { Notification } = require('electron');
const log = require('electron-log');

/**
 * 通知管理器
 * 负责处理系统通知、托盘通知和应用内状态更新
 */
class NotificationManager {
  constructor(tray = null) {
    this.tray = tray;
    this.notificationHistory = [];
    this.maxHistorySize = 50;

    // 通知级别配置
    this.notificationLevels = {
      SUCCESS: { icon: '✅', color: 'green', priority: 1 },
      WARNING: { icon: '⚠️', color: 'orange', priority: 2 },
      ERROR: { icon: '❌', color: 'red', priority: 3 },
      INFO: { icon: 'ℹ️', color: 'blue', priority: 1 }
    };

    log.info('NotificationManager: 通知管理器已初始化');
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(title, body, level = 'INFO', options = {}) {
    try {
      // 检查通知权限
      if (!Notification.isSupported()) {
        log.warn('NotificationManager: 系统不支持通知');
        return false;
      }

      const levelConfig = this.notificationLevels[level] || this.notificationLevels.INFO;

      const notification = new Notification({
        title: `${levelConfig.icon} ${title}`,
        body,
        silent: options.silent || false,
        urgency: this.getUrgencyLevel(level),
        timeoutType: 'never', // 让通知持续显示
        ...options
      });

      // 添加通知事件监听
      notification.on('show', () => {
        log.info('NotificationManager: 通知已显示');
      });

      notification.on('click', () => {
        log.info('NotificationManager: 通知被点击');
      });

      notification.on('close', () => {
        log.info('NotificationManager: 通知已关闭');
      });

      notification.show();

      // 记录通知历史
      this.recordNotification({
        type: 'system',
        level,
        title,
        body,
        timestamp: new Date().toISOString()
      });

      log.info('NotificationManager: 系统通知已发送', { title, level });
      return true;
    } catch (error) {
      log.error('NotificationManager: 发送系统通知失败', error);
      return false;
    }
  }

  /**
   * 发送托盘通知
   */
  async sendTrayNotification(title, body, level = 'INFO') {
    try {
      if (!this.tray) {
        log.warn('NotificationManager: 托盘不可用');
        return false;
      }

      const levelConfig = this.notificationLevels[level] || this.notificationLevels.INFO;

      // 更新托盘工具提示
      this.tray.setToolTip(`${levelConfig.icon} ${title}: ${body}`);

      // 发送托盘气球通知（Windows）
      if (process.platform === 'win32') {
        this.tray.displayBalloon({
          title: `${levelConfig.icon} ${title}`,
          content: body,
          iconType: this.getIconType(level)
        });
      }

      // 记录通知历史
      this.recordNotification({
        type: 'tray',
        level,
        title,
        body,
        timestamp: new Date().toISOString()
      });

      log.info('NotificationManager: 托盘通知已发送', { title, level });
      return true;
    } catch (error) {
      log.error('NotificationManager: 发送托盘通知失败', error);
      return false;
    }
  }

  /**
   * 发送心跳状态通知
   */
  async sendHeartbeatNotification(healthStatus, recoveryActions = []) {
    try {
      let level, title, body;

      if (healthStatus.healthy) {
        level = 'SUCCESS';
        title = '系统健康检查';
        body = '所有系统组件运行正常';
      } else {
        level = healthStatus.issues.length > 3 ? 'ERROR' : 'WARNING';
        title = '系统健康警告';
        body = `发现 ${healthStatus.issues.length} 个问题: ${healthStatus.issues.slice(0, 2).join(', ')}`;

        if (healthStatus.issues.length > 2) {
          body += '...';
        }
      }

      // 如果有恢复操作，添加到通知中
      if (recoveryActions.length > 0) {
        const successfulActions = recoveryActions.filter(action => action.result.success);
        if (successfulActions.length > 0) {
          title = '系统自动恢复';
          body = `已执行 ${successfulActions.length} 项恢复操作`;
          level = 'SUCCESS';
        }
      }

      // 发送系统通知
      await this.sendSystemNotification(title, body, level);

      // 发送托盘通知
      await this.sendTrayNotification(title, body, level);

      return true;
    } catch (error) {
      log.error('NotificationManager: 发送心跳通知失败', error);
      return false;
    }
  }

  /**
   * 发送任务执行通知
   */
  async sendTaskNotification(taskName, status, message = '') {
    try {
      let level, title, body;

      switch (status) {
        case 'success':
          level = 'SUCCESS';
          title = '任务执行成功';
          body = `任务 "${taskName}" 已成功完成`;
          break;
        case 'failed':
          level = 'ERROR';
          title = '任务执行失败';
          body = `任务 "${taskName}" 执行失败${message ? ': ' + message : ''}`;
          break;
        case 'started':
          level = 'INFO';
          title = '任务开始执行';
          body = `任务 "${taskName}" 已开始执行`;
          break;
        default:
          level = 'INFO';
          title = '任务状态更新';
          body = `任务 "${taskName}": ${message}`;
      }

      // 只对失败和重要事件发送通知
      if (status === 'failed' || status === 'success') {
        await this.sendSystemNotification(title, body, level);
      }

      // 总是更新托盘状态
      await this.sendTrayNotification(title, body, level);

      return true;
    } catch (error) {
      log.error('NotificationManager: 发送任务通知失败', error);
      return false;
    }
  }

  /**
   * 获取紧急程度级别
   */
  getUrgencyLevel(level) {
    switch (level) {
      case 'ERROR': return 'critical';
      case 'WARNING': return 'normal';
      default: return 'low';
    }
  }

  /**
   * 获取图标类型（Windows托盘）
   */
  getIconType(level) {
    switch (level) {
      case 'ERROR': return 'error';
      case 'WARNING': return 'warning';
      case 'SUCCESS': return 'info';
      default: return 'none';
    }
  }

  /**
   * 记录通知历史
   */
  recordNotification(notification) {
    this.notificationHistory.push(notification);

    // 保持历史记录大小限制
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory.shift();
    }
  }

  /**
   * 获取通知历史
   */
  getNotificationHistory(limit = 10) {
    return this.notificationHistory.slice(-limit);
  }

  /**
   * 清理通知历史
   */
  clearNotificationHistory() {
    this.notificationHistory = [];
    log.info('NotificationManager: 通知历史已清理');
  }

  /**
   * 设置托盘引用
   */
  setTray(tray) {
    this.tray = tray;
    log.info('NotificationManager: 托盘引用已设置');
  }
}

module.exports = NotificationManager;
