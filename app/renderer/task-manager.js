/**
 * 定时任务管理器 - 轻量级个人使用版本
 * 提供简单实用的定时任务功能
 */
class TaskManager {
  constructor() {
    this.tasks = new Map();
    this.currentScript = null;
    this.init();
  }

  init() {
    this.loadTasks();
    this.bindEvents();
  }

  /**
   * 加载任务列表
   */
  async loadTasks() {
    try {
      const result = await window.electronAPI.getTasks();
      if (result.success) {
        this.tasks.clear();
        result.tasks.forEach(task => {
          this.tasks.set(task.id, task);
        });
      }
    } catch (error) {
      console.error('加载任务失败:', error);
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 定时任务按钮点击
    document.getElementById('timer-btn')?.addEventListener('click', () => {
      this.showTaskManager();
    });
  }

  /**
   * 显示任务管理界面
   */
  showTaskManager() {
    const modalBody = document.getElementById('modal-body');
    const modalTitle = document.getElementById('modal-title');

    modalTitle.textContent = '定时任务管理';
    modalBody.innerHTML = this.renderTaskManagerHTML();

    // 显示模态框
    document.getElementById('modal-overlay').style.display = 'flex';

    // 绑定任务管理事件
    this.bindTaskManagerEvents();

    // 刷新任务列表
    this.refreshTaskList();
  }

  /**
   * 渲染任务管理界面HTML
   */
  renderTaskManagerHTML() {
    return `
      <div class="task-manager">
        <div class="task-manager-header">
          <div class="task-stats">
            <span class="stat-item">
              <span class="stat-label">总任务:</span>
              <span class="stat-value" id="total-tasks">0</span>
            </span>
            <span class="stat-item">
              <span class="stat-label">活跃:</span>
              <span class="stat-value" id="active-tasks">0</span>
            </span>
          </div>
          <button class="btn btn-primary btn-sm" id="add-task-btn">
            <span class="btn-icon">+</span>
            新建任务
          </button>
        </div>

        <div class="task-list" id="task-list">
          <div class="loading-placeholder">正在加载任务...</div>
        </div>
      </div>

      <style>
        .task-manager {
          max-width: 600px;
          margin: 0 auto;
        }

        .task-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #e0e0e0;
        }

        .task-stats {
          display: flex;
          gap: 20px;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .stat-label {
          color: #666;
          font-size: 14px;
        }

        .stat-value {
          font-weight: bold;
          color: #2196F3;
        }

        .task-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .task-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 10px;
          background: #f9f9f9;
        }

        .task-item.enabled {
          border-color: #4CAF50;
          background: #f1f8e9;
        }

        .task-info {
          flex: 1;
        }

        .task-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .task-schedule {
          font-size: 12px;
          color: #666;
          margin-bottom: 3px;
        }

        .task-next-run {
          font-size: 11px;
          color: #999;
        }

        .task-actions {
          display: flex;
          gap: 8px;
        }

        .task-toggle {
          padding: 4px 8px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .task-toggle.enabled {
          background: #4CAF50;
          color: white;
        }

        .task-toggle.disabled {
          background: #ccc;
          color: #666;
        }

        .loading-placeholder {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .empty-tasks {
          text-align: center;
          padding: 40px;
          color: #999;
        }
      </style>
    `;
  }

  /**
   * 绑定任务管理事件
   */
  bindTaskManagerEvents() {
    // 新建任务按钮
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
      console.log('绑定新建任务按钮事件');
      addTaskBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('新建任务按钮被点击');
        this.showCreateTaskDialog();
      });
    } else {
      console.error('找不到新建任务按钮');
    }
  }

  /**
   * 刷新任务列表
   */
  async refreshTaskList() {
    await this.loadTasks();

    const taskListEl = document.getElementById('task-list');
    const totalTasksEl = document.getElementById('total-tasks');
    const activeTasksEl = document.getElementById('active-tasks');

    if (!taskListEl) return;

    const tasks = Array.from(this.tasks.values());
    const activeTasks = tasks.filter(t => t.enabled);

    // 更新统计
    if (totalTasksEl) totalTasksEl.textContent = tasks.length;
    if (activeTasksEl) activeTasksEl.textContent = activeTasks.length;

    // 渲染任务列表
    if (tasks.length === 0) {
      taskListEl.innerHTML = `
        <div class="empty-tasks">
          <p>还没有定时任务</p>
          <p>点击"新建任务"开始创建</p>
        </div>
      `;
    } else {
      taskListEl.innerHTML = tasks.map(task => this.renderTaskItem(task)).join('');
      this.bindTaskItemEvents();
    }
  }

  /**
   * 渲染单个任务项
   */
  renderTaskItem(task) {
    const scheduleText = this.formatSchedule(task.schedule);
    const nextRunText = task.nextRun ?
      `下次运行: ${new Date(task.nextRun).toLocaleString()}` :
      '未调度';

    return `
      <div class="task-item ${task.enabled ? 'enabled' : ''}" data-task-id="${task.id}">
        <div class="task-info">
          <div class="task-name">${task.name}</div>
          <div class="task-schedule">${scheduleText}</div>
          <div class="task-next-run">${nextRunText}</div>
        </div>
        <div class="task-actions">
          <button class="task-toggle ${task.enabled ? 'enabled' : 'disabled'}"
                  data-task-id="${task.id}" data-action="toggle">
            ${task.enabled ? '禁用' : '启用'}
          </button>
          <button class="btn btn-sm btn-secondary"
                  data-task-id="${task.id}" data-action="run">
            立即执行
          </button>
          <button class="btn btn-sm btn-secondary"
                  data-task-id="${task.id}" data-action="edit">
            编辑
          </button>
          <button class="btn btn-sm btn-danger"
                  data-task-id="${task.id}" data-action="delete">
            删除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定任务项事件
   */
  bindTaskItemEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const taskId = e.target.dataset.taskId;
        const action = e.target.dataset.action;

        switch (action) {
          case 'toggle':
            await this.toggleTask(taskId);
            break;
          case 'run':
            await this.runTaskNow(taskId);
            break;
          case 'edit':
            await this.editTask(taskId);
            break;
          case 'delete':
            await this.deleteTask(taskId);
            break;
        }
      });
    });
  }

  /**
   * 格式化调度信息
   */
  formatSchedule(schedule) {
    switch (schedule.type) {
      case 'interval':
        const minutes = Math.floor(schedule.value / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
          return `每 ${hours} 小时执行`;
        } else {
          return `每 ${minutes} 分钟执行`;
        }
      case 'daily':
        return `每天 ${schedule.time} 执行`;
      case 'weekly':
        const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return `每${days[schedule.day]} ${schedule.time} 执行`;
      default:
        return '未知调度';
    }
  }

  /**
   * 显示创建任务对话框
   */
  showCreateTaskDialog() {
    console.log('显示创建任务对话框');

    // 获取可用的脚本列表
    this.showCreateTaskForm();
  }

  /**
   * 显示创建任务表单
   */
  async showCreateTaskForm() {
    try {
      // 获取脚本列表
      const scriptsResult = await window.electronAPI.loadScripts();
      if (!scriptsResult.success) {
        this.showNotification('无法获取脚本列表', 'error');
        return;
      }

      const scripts = scriptsResult.scripts || [];
      if (scripts.length === 0) {
        this.showNotification('请先添加脚本再创建定时任务', 'warning');
        return;
      }

      // 更新模态框内容为创建任务表单
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');

      modalTitle.textContent = '创建定时任务';
      modalBody.innerHTML = this.renderCreateTaskForm(scripts);

      // 绑定表单事件
      this.bindCreateTaskFormEvents();

    } catch (error) {
      console.error('显示创建任务表单失败:', error);
      this.showNotification('显示创建任务表单失败: ' + error.message, 'error');
    }
  }

  /**
   * 渲染创建任务表单
   */
  renderCreateTaskForm(scripts) {
    return `
      <form id="create-task-form">
        <div class="form-group">
          <label class="form-label">选择脚本</label>
          <select class="form-select" id="task-script-id" required>
            <option value="">请选择脚本</option>
            ${scripts.map(script =>
              `<option value="${script.id}">${script.name} (${script.type})</option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">任务名称</label>
          <input type="text" class="form-input" id="task-name" placeholder="可选，留空将自动生成">
        </div>

        <div class="form-group">
          <label class="form-label">调度类型</label>
          <select class="form-select" id="schedule-type" required>
            <option value="">请选择调度类型</option>
            <option value="interval">间隔执行</option>
            <option value="daily">每日定时</option>
            <option value="weekly">每周定时</option>
          </select>
        </div>

        <div class="form-group" id="interval-config" style="display: none;">
          <label class="form-label">执行间隔</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" class="form-input" id="interval-value" min="1" value="60" style="width: 100px;">
            <select class="form-select" id="interval-unit" style="width: 100px;">
              <option value="minutes">分钟</option>
              <option value="hours">小时</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="daily-config" style="display: none;">
          <label class="form-label">执行时间</label>
          <input type="time" class="form-input" id="daily-time" value="09:00">
        </div>

        <div class="form-group" id="weekly-config" style="display: none;">
          <label class="form-label">星期几</label>
          <select class="form-select" id="weekly-day">
            <option value="0">周日</option>
            <option value="1" selected>周一</option>
            <option value="2">周二</option>
            <option value="3">周三</option>
            <option value="4">周四</option>
            <option value="5">周五</option>
            <option value="6">周六</option>
          </select>
          <label class="form-label" style="margin-top: 10px;">执行时间</label>
          <input type="time" class="form-input" id="weekly-time" value="09:00">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-create-task">取消</button>
          <button type="submit" class="btn btn-primary">创建任务</button>
        </div>
      </form>
    `;
  }

  /**
   * 绑定创建任务表单事件
   */
  bindCreateTaskFormEvents() {
    const form = document.getElementById('create-task-form');
    const scheduleTypeSelect = document.getElementById('schedule-type');
    const cancelBtn = document.getElementById('cancel-create-task');

    // 调度类型变化时显示对应配置
    scheduleTypeSelect?.addEventListener('change', (e) => {
      const type = e.target.value;

      // 隐藏所有配置
      document.getElementById('interval-config').style.display = 'none';
      document.getElementById('daily-config').style.display = 'none';
      document.getElementById('weekly-config').style.display = 'none';

      // 显示对应配置
      if (type) {
        document.getElementById(`${type}-config`).style.display = 'block';
      }
    });

    // 取消按钮
    cancelBtn?.addEventListener('click', () => {
      this.showTaskManager(); // 返回任务管理界面
    });

    // 表单提交
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleCreateTaskSubmit();
    });
  }

  /**
   * 处理创建任务表单提交
   */
  async handleCreateTaskSubmit() {
    try {
      const scriptId = parseInt(document.getElementById('task-script-id').value);
      const taskName = document.getElementById('task-name').value.trim();
      const scheduleType = document.getElementById('schedule-type').value;

      if (!scriptId || !scheduleType) {
        this.showNotification('请填写所有必填字段', 'warning');
        return;
      }

      let schedule;
      switch (scheduleType) {
        case 'interval':
          const intervalValue = parseInt(document.getElementById('interval-value').value);
          const intervalUnit = document.getElementById('interval-unit').value;
          const milliseconds = intervalUnit === 'hours' ? intervalValue * 3600000 : intervalValue * 60000;
          schedule = { type: 'interval', value: milliseconds };
          break;

        case 'daily':
          const dailyTime = document.getElementById('daily-time').value;
          schedule = { type: 'daily', time: dailyTime };
          break;

        case 'weekly':
          const weeklyDay = parseInt(document.getElementById('weekly-day').value);
          const weeklyTime = document.getElementById('weekly-time').value;
          schedule = { type: 'weekly', day: weeklyDay, time: weeklyTime };
          break;

        default:
          this.showNotification('不支持的调度类型', 'error');
          return;
      }

      const taskData = {
        scriptId,
        schedule
      };

      if (taskName) {
        taskData.name = taskName;
      }

      await this.createTask(taskData);

    } catch (error) {
      console.error('创建任务失败:', error);
      this.showNotification('创建任务失败: ' + error.message, 'error');
    }
  }

  /**
   * 创建任务
   */
  async createTask(taskData) {
    try {
      const result = await window.electronAPI.createTask(taskData);
      if (result.success) {
        this.showNotification('任务创建成功', 'success');
        // 返回任务管理界面并刷新列表
        this.showTaskManager();
      } else {
        this.showNotification('创建任务失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('创建任务失败: ' + error.message, 'error');
    }
  }

  /**
   * 切换任务状态
   */
  async toggleTask(taskId) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) return;

      const result = await window.electronAPI.toggleTask(taskId, !task.enabled);
      if (result.success) {
        this.showNotification(`任务已${task.enabled ? '禁用' : '启用'}`, 'success');
        this.refreshTaskList();
      } else {
        this.showNotification('操作失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('操作失败: ' + error.message, 'error');
    }
  }

  /**
   * 立即执行任务
   */
  async runTaskNow(taskId) {
    try {
      const result = await window.electronAPI.runTaskNow(taskId);
      if (result.success) {
        this.showNotification('任务已启动执行', 'success');
      } else {
        this.showNotification('执行失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('执行失败: ' + error.message, 'error');
    }
  }

  /**
   * 编辑任务
   */
  async editTask(taskId) {
    try {
      const task = this.tasks.get(taskId);
      if (!task) {
        this.showNotification('任务不存在', 'error');
        return;
      }

      // 获取脚本列表
      const scriptsResult = await window.electronAPI.loadScripts();
      if (!scriptsResult.success) {
        this.showNotification('无法获取脚本列表', 'error');
        return;
      }

      const scripts = scriptsResult.scripts || [];

      // 更新模态框内容为编辑任务表单
      const modalTitle = document.getElementById('modal-title');
      const modalBody = document.getElementById('modal-body');

      modalTitle.textContent = '编辑定时任务';
      modalBody.innerHTML = this.renderEditTaskForm(task, scripts);

      // 绑定编辑表单事件
      this.bindEditTaskFormEvents(taskId);

    } catch (error) {
      console.error('编辑任务失败:', error);
      this.showNotification('编辑任务失败: ' + error.message, 'error');
    }
  }

  /**
   * 渲染编辑任务表单
   */
  renderEditTaskForm(task, scripts) {
    return `
      <form id="edit-task-form">
        <div class="form-group">
          <label class="form-label">选择脚本</label>
          <select class="form-select" id="edit-task-script-id" required>
            <option value="">请选择脚本</option>
            ${scripts.map(script =>
              `<option value="${script.id}" ${script.id === task.scriptId ? 'selected' : ''}>${script.name} (${script.type})</option>`
            ).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">任务名称</label>
          <input type="text" class="form-input" id="edit-task-name" value="${task.name || ''}" placeholder="可选，留空将自动生成">
        </div>

        <div class="form-group">
          <label class="form-label">调度类型</label>
          <select class="form-select" id="edit-schedule-type" required>
            <option value="">请选择调度类型</option>
            <option value="interval" ${task.schedule.type === 'interval' ? 'selected' : ''}>间隔执行</option>
            <option value="daily" ${task.schedule.type === 'daily' ? 'selected' : ''}>每日定时</option>
            <option value="weekly" ${task.schedule.type === 'weekly' ? 'selected' : ''}>每周定时</option>
          </select>
        </div>

        <div class="form-group" id="edit-interval-config" style="display: ${task.schedule.type === 'interval' ? 'block' : 'none'};">
          <label class="form-label">执行间隔</label>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" class="form-input" id="edit-interval-value" min="1" value="${this.getIntervalValue(task.schedule)}" style="width: 100px;">
            <select class="form-select" id="edit-interval-unit" style="width: 100px;">
              <option value="minutes" ${this.getIntervalUnit(task.schedule) === 'minutes' ? 'selected' : ''}>分钟</option>
              <option value="hours" ${this.getIntervalUnit(task.schedule) === 'hours' ? 'selected' : ''}>小时</option>
            </select>
          </div>
        </div>

        <div class="form-group" id="edit-daily-config" style="display: ${task.schedule.type === 'daily' ? 'block' : 'none'};">
          <label class="form-label">执行时间</label>
          <input type="time" class="form-input" id="edit-daily-time" value="${task.schedule.time || '09:00'}">
        </div>

        <div class="form-group" id="edit-weekly-config" style="display: ${task.schedule.type === 'weekly' ? 'block' : 'none'};">
          <label class="form-label">星期几</label>
          <select class="form-select" id="edit-weekly-day">
            <option value="0" ${task.schedule.day === 0 ? 'selected' : ''}>周日</option>
            <option value="1" ${task.schedule.day === 1 ? 'selected' : ''}>周一</option>
            <option value="2" ${task.schedule.day === 2 ? 'selected' : ''}>周二</option>
            <option value="3" ${task.schedule.day === 3 ? 'selected' : ''}>周三</option>
            <option value="4" ${task.schedule.day === 4 ? 'selected' : ''}>周四</option>
            <option value="5" ${task.schedule.day === 5 ? 'selected' : ''}>周五</option>
            <option value="6" ${task.schedule.day === 6 ? 'selected' : ''}>周六</option>
          </select>
          <label class="form-label" style="margin-top: 10px;">执行时间</label>
          <input type="time" class="form-input" id="edit-weekly-time" value="${task.schedule.time || '09:00'}">
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-edit-task">取消</button>
          <button type="submit" class="btn btn-primary">保存修改</button>
        </div>
      </form>
    `;
  }

  /**
   * 获取间隔值（用于编辑表单）
   */
  getIntervalValue(schedule) {
    if (schedule.type !== 'interval') return 60;
    const minutes = Math.floor(schedule.value / 60000);
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? hours : minutes;
  }

  /**
   * 获取间隔单位（用于编辑表单）
   */
  getIntervalUnit(schedule) {
    if (schedule.type !== 'interval') return 'minutes';
    const minutes = Math.floor(schedule.value / 60000);
    return minutes >= 60 ? 'hours' : 'minutes';
  }

  /**
   * 绑定编辑任务表单事件
   */
  bindEditTaskFormEvents(taskId) {
    const form = document.getElementById('edit-task-form');
    const scheduleTypeSelect = document.getElementById('edit-schedule-type');
    const cancelBtn = document.getElementById('cancel-edit-task');

    // 调度类型变化时显示对应配置
    scheduleTypeSelect?.addEventListener('change', (e) => {
      const type = e.target.value;

      // 隐藏所有配置
      document.getElementById('edit-interval-config').style.display = 'none';
      document.getElementById('edit-daily-config').style.display = 'none';
      document.getElementById('edit-weekly-config').style.display = 'none';

      // 显示对应配置
      if (type) {
        document.getElementById(`edit-${type}-config`).style.display = 'block';
      }
    });

    // 取消按钮
    cancelBtn?.addEventListener('click', () => {
      this.showTaskManager(); // 返回任务管理界面
    });

    // 表单提交
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEditTaskSubmit(taskId);
    });
  }

  /**
   * 处理编辑任务表单提交
   */
  async handleEditTaskSubmit(taskId) {
    try {
      const scriptId = parseInt(document.getElementById('edit-task-script-id').value);
      const taskName = document.getElementById('edit-task-name').value.trim();
      const scheduleType = document.getElementById('edit-schedule-type').value;

      if (!scriptId || !scheduleType) {
        this.showNotification('请填写所有必填字段', 'warning');
        return;
      }

      let schedule;
      switch (scheduleType) {
        case 'interval':
          const intervalValue = parseInt(document.getElementById('edit-interval-value').value);
          const intervalUnit = document.getElementById('edit-interval-unit').value;
          const milliseconds = intervalUnit === 'hours' ? intervalValue * 3600000 : intervalValue * 60000;
          schedule = { type: 'interval', value: milliseconds };
          break;

        case 'daily':
          const dailyTime = document.getElementById('edit-daily-time').value;
          schedule = { type: 'daily', time: dailyTime };
          break;

        case 'weekly':
          const weeklyDay = parseInt(document.getElementById('edit-weekly-day').value);
          const weeklyTime = document.getElementById('edit-weekly-time').value;
          schedule = { type: 'weekly', day: weeklyDay, time: weeklyTime };
          break;

        default:
          this.showNotification('不支持的调度类型', 'error');
          return;
      }

      const updates = {
        scriptId,
        schedule
      };

      if (taskName) {
        updates.name = taskName;
      }

      const result = await window.electronAPI.updateTask(taskId, updates);
      if (result.success) {
        this.showNotification('任务修改成功', 'success');
        // 返回任务管理界面并刷新列表
        this.showTaskManager();
      } else {
        this.showNotification('修改任务失败: ' + result.error, 'error');
      }

    } catch (error) {
      console.error('修改任务失败:', error);
      this.showNotification('修改任务失败: ' + error.message, 'error');
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId) {
    // 使用ScriptManager的确认对话框
    if (window.scriptManager) {
      const confirmed = await window.scriptManager.showConfirmDialog('确认删除', '确定要删除这个任务吗？');
      if (!confirmed) return;
    } else {
      // 降级到原生确认框
      if (!confirm('确定要删除这个任务吗？')) return;
    }

    try {
      const result = await window.electronAPI.deleteTask(taskId);
      if (result.success) {
        this.showNotification('任务已删除', 'success');
        this.refreshTaskList();
      } else {
        this.showNotification('删除失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showNotification('删除失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    // 使用现有的通知系统
    if (window.scriptManager && window.scriptManager.showNotification) {
      window.scriptManager.showNotification(message, type);
    } else {
      // 创建简单的通知
      this.createSimpleNotification(message, type);
    }
  }

  /**
   * 创建简单通知
   */
  createSimpleNotification(message, type) {
    // 创建通知容器（如果不存在）
    let container = document.querySelector('.notification-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'notification-container';
      document.body.appendChild(container);
    }

    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // 添加到容器
    container.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  /**
   * 为脚本显示定时任务设置
   */
  async showTaskSettingsForScript(scriptId) {
    this.currentScript = scriptId;

    // 获取该脚本的任务
    const result = await window.electronAPI.getTasksByScript(scriptId);
    if (result.success) {
      const tasks = result.tasks;

      if (tasks.length === 0) {
        // 没有任务，显示创建界面
        this.showCreateTaskDialog();
      } else {
        // 有任务，显示任务列表
        this.showTaskManager();
      }
    }
  }
}

// 导出给全局使用
window.TaskManager = TaskManager;
