/**
 * 脚本管理器 - 现代化卡片布局渲染器
 * 重构版本：从执行监控器转为启动器
 */

class ScriptManager {
  // 脚本类型常量定义
  static SCRIPT_TYPES = {
    PYTHON: 'python',
    JAVASCRIPT: 'javascript',
    TYPESCRIPT: 'typescript',
    BATCH: 'batch',
    POWERSHELL: 'powershell',
    BASH: 'bash',
    OTHER: 'other'
  };

  // 扩展名到类型的映射
  static FILE_EXTENSIONS = {
    py: 'python',
    pyw: 'python',
    js: 'javascript',
    ts: 'typescript',
    bat: 'batch',
    cmd: 'batch',
    ps1: 'powershell',
    sh: 'bash'
  };

  // 类型到显示名称的映射
  static TYPE_DISPLAYS = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    batch: 'Batch',
    powershell: 'PowerShell',
    bash: 'Bash',
    other: '其他'
  };

  constructor() {
    this.scripts = new Map();
    this.currentCategory = 'all';
    this.currentSort = 'name';
    this.searchQuery = '';
    this.selectedScript = null;
    this.settings = null;

    // DOM元素引用
    this.elements = {};

    // 初始化应用
    this.initializeApp();
  }

  async initializeApp() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupApp());
    } else {
      this.setupApp();
    }
  }

  async setupApp() {
    try {
      // 获取DOM元素引用
      this.initializeElements();

      // 设置事件监听器
      this.setupEventListeners();

      // 加载设置
      await this.loadSettings();

      // 应用设置
      this.applySettings();

      // 加载脚本数据
      if (this.settings.autoRefresh) {
      await this.loadScripts();
      }

      // 渲染界面
      this.renderScripts();

      // 更新统计信息
      this.updateStatistics();

      console.log('脚本管理器初始化完成');
    } catch (error) {
      console.error('初始化失败:', error);
      this.showNotification('初始化失败: ' + error.message, 'error');
    }
  }

  initializeElements() {
    // 搜索和过滤
    this.elements.searchInput = document.getElementById('search-input');
    this.elements.sortSelect = document.getElementById('sort-select');

    // 分类标签
    this.elements.categoryTabs = document.querySelectorAll('.category-tab');

    // 主要按钮
    this.elements.addScriptBtn = document.getElementById('add-script-btn');
    this.elements.welcomeAddBtn = document.getElementById('welcome-add-btn');
    this.elements.refreshBtn = document.getElementById('refresh-btn');
    this.elements.settingsBtn = document.getElementById('settings-btn');

    // 内容区域
    this.elements.scriptsGrid = document.getElementById('scripts-grid');
    this.elements.welcomeScreen = document.getElementById('welcome-screen');
    this.elements.loadingScreen = document.getElementById('loading-screen');
    this.elements.emptyScreen = document.getElementById('empty-screen');

    // 状态栏
    this.elements.totalScripts = document.getElementById('total-scripts');
    this.elements.runningScripts = document.getElementById('running-scripts');
    this.elements.lastUpdate = document.getElementById('last-update');

    // 模态对话框
    this.elements.modalOverlay = document.getElementById('modal-overlay');
    this.elements.modalTitle = document.getElementById('modal-title');
    this.elements.modalBody = document.getElementById('modal-body');
    this.elements.modalClose = document.getElementById('modal-close');

    // 右键菜单
    this.elements.contextMenu = document.getElementById('context-menu');
    this.elements.contextLaunch = document.getElementById('context-launch');
    this.elements.contextEdit = document.getElementById('context-edit');
    this.elements.contextSchedule = document.getElementById('context-schedule');
    this.elements.contextCopy = document.getElementById('context-copy');
    this.elements.contextOpenFolder = document.getElementById('context-open-folder');
    this.elements.contextDelete = document.getElementById('context-delete');

    // 通知容器
    this.elements.notificationContainer = document.getElementById('notification-container');

    // 分类计数
    this.elements.countAll = document.getElementById('count-all');
    this.elements.countPython = document.getElementById('count-python');
    this.elements.countJavascript = document.getElementById('count-javascript');
    this.elements.countTypescript = document.getElementById('count-typescript');
    this.elements.countBatch = document.getElementById('count-batch');
    this.elements.countPowershell = document.getElementById('count-powershell');
    this.elements.countBash = document.getElementById('count-bash');
    this.elements.countOther = document.getElementById('count-other');
  }

  setupEventListeners() {
    // 搜索功能
    this.elements.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.renderScripts();
    });

    // 排序功能
    this.elements.sortSelect?.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.renderScripts();
    });

    // 分类标签
    this.elements.categoryTabs?.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchCategory(e.target.dataset.category);
      });
    });

    // 添加脚本按钮
    this.elements.addScriptBtn?.addEventListener('click', () => {
      this.showAddScriptModal();
    });

    this.elements.welcomeAddBtn?.addEventListener('click', () => {
      this.showAddScriptModal();
    });

    // 刷新按钮
    this.elements.refreshBtn?.addEventListener('click', () => {
      this.refreshScripts();
    });

    // 设置按钮
    this.elements.settingsBtn?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // 测试控制台按钮（仅在测试模式下显示）
    this.elements.testConsoleBtn = document.getElementById('test-console-btn');
    if (this.isTestMode()) {
      this.elements.testConsoleBtn.style.display = 'block';
      this.elements.testConsoleBtn?.addEventListener('click', () => {
        this.openTestConsole();
      });
    }

    // GitHub链接
    document.getElementById('github-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openGitHubRepository();
    });

    // 模态对话框关闭
    this.elements.modalClose?.addEventListener('click', () => {
      this.hideModal();
    });

    // 注释掉点击外部区域关闭弹窗的功能
    // this.elements.modalOverlay?.addEventListener('click', (e) => {
    //   if (e.target === this.elements.modalOverlay) {
    //     this.hideModal();
    //   }
    // });

    // 右键菜单
    this.elements.contextLaunch?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.launchScript(this.selectedScript);
      }
      this.hideContextMenu();
    });

    this.elements.contextEdit?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.showEditScriptModal(this.selectedScript);
      }
      this.hideContextMenu();
    });

    this.elements.contextCopy?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.copyScriptPath(this.selectedScript);
      }
      this.hideContextMenu();
    });

    this.elements.contextOpenFolder?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.openScriptFolder(this.selectedScript);
      }
      this.hideContextMenu();
    });

    this.elements.contextSchedule?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.showTaskSettingsForScript(this.selectedScript);
      }
      this.hideContextMenu();
    });

    this.elements.contextDelete?.addEventListener('click', () => {
      if (this.selectedScript) {
        this.deleteScript(this.selectedScript);
      }
      this.hideContextMenu();
    });

    // 全局点击隐藏右键菜单
    document.addEventListener('click', () => {
      this.hideContextMenu();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // 拖拽支持
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    const grid = this.elements.scriptsGrid;
    if (!grid) return;

    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      grid.classList.add('drag-over');
    });

    grid.addEventListener('dragleave', (e) => {
      if (!grid.contains(e.relatedTarget)) {
        grid.classList.remove('drag-over');
      }
    });

    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      grid.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (this.isScriptFile(file.name)) {
          this.addScriptFromFile(file.path);
        }
      });
    });
  }

  async loadScripts() {
    try {
      this.showLoading(true);

      const result = await window.electronAPI.loadScripts();

      if (result.success) {
        this.scripts.clear();

        if (result.scripts && Array.isArray(result.scripts)) {
          result.scripts.forEach(script => {
            this.scripts.set(script.id, script);
          });
        }

        this.updateLastUpdateTime();
        console.log(`加载了 ${this.scripts.size} 个脚本`);
      } else {
        throw new Error(result.error || '加载脚本失败');
      }
    } catch (error) {
      console.error('加载脚本失败:', error);
      this.showNotification('加载脚本失败: ' + error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async refreshScripts() {
    this.showNotification('正在刷新脚本列表...', 'info');
    await this.loadScripts();
    this.renderScripts();
    this.updateStatistics();
    this.showNotification('脚本列表已刷新', 'success');
  }

  async renderScripts() {
    const grid = this.elements.scriptsGrid;
    if (!grid) return;

    // 清空现有内容
    grid.innerHTML = '';

    // 获取过滤后的脚本
    const filteredScripts = this.getFilteredScripts();

    // 如果没有脚本，显示欢迎屏幕
    if (this.scripts.size === 0) {
      grid.appendChild(this.elements.welcomeScreen);
      return;
    }

    // 如果过滤后没有结果，显示空状态
    if (filteredScripts.length === 0) {
      grid.appendChild(this.elements.emptyScreen);
      return;
    }

    // 渲染脚本卡片（异步）
    for (const script of filteredScripts) {
      const card = await this.createScriptCard(script);
      grid.appendChild(card);
    }

    // 更新分类计数
    this.updateCategoryCounts();
  }

  getFilteredScripts() {
    let scripts = Array.from(this.scripts.values());

    // 按分类过滤
    if (this.currentCategory !== 'all') {
      scripts = scripts.filter(script => script.type === this.currentCategory);
    }

    // 按搜索关键词过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      scripts = scripts.filter(script => {
        return script.name.toLowerCase().includes(query) ||
               script.description?.toLowerCase().includes(query) ||
               script.path.toLowerCase().includes(query);
      });
    }

    // 排序
    scripts.sort((a, b) => {
      switch (this.currentSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'type':
          return a.type.localeCompare(b.type);
        case 'created':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'used':
          return (b.usageCount || 0) - (a.usageCount || 0);
        default:
          return 0;
      }
    });

    return scripts;
  }

  async createScriptCard(script) {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.dataset.scriptId = script.id;

    // 获取脚本图标
    const icon = this.getScriptIcon(script.type);

    // 获取脚本类型显示名称
    const typeDisplay = this.getScriptTypeDisplay(script.type);

    // 获取定时任务信息
    const taskInfo = await this.getScriptTaskInfo(script.id);

    // 确保描述内容不为空
    const description = script.description || '暂无描述';

    let timerInfoHtml = '';
    if (taskInfo.hasTask) {
      timerInfoHtml = `
        <div class="card-timer-info">
          <span class="timer-icon">⏰</span>
          <span class="timer-text">${taskInfo.scheduleText}</span>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="card-icon">${icon}</div>
      <div class="card-title" title="${script.name}">${script.name}</div>
      <div class="card-type">${typeDisplay}</div>
      <div class="card-description" title="${description}">${description}</div>
      <div class="card-footer">
        <div class="card-status">就绪</div>
        ${timerInfoHtml}
        <div class="card-actions">
          <button class="card-action-btn" title="启动">▶</button>
          <button class="card-action-btn" title="编辑">✎</button>
        </div>
      </div>
    `;

    // 添加事件监听器
    this.setupCardEventListeners(card, script);

    return card;
  }

  setupCardEventListeners(card, script) {
    // 点击卡片不再启动脚本（根据用户要求移除此功能）
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不触发卡片点击
      if (e.target.classList.contains('card-action-btn')) {
        return;
      }
      // this.launchScript(script.id); // 已移除：左键点击不再运行脚本
    });

    // 右键菜单
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.selectedScript = script.id;
      this.showContextMenu(e.clientX, e.clientY);
    });

    // 卡片内按钮
    const actionBtns = card.querySelectorAll('.card-action-btn');
    actionBtns[0]?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.launchScript(script.id);
    });

    actionBtns[1]?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showEditScriptModal(script.id);
    });
  }

  async launchScript(scriptId) {
    try {
      const script = this.scripts.get(scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }

      // 更新卡片状态为启动中
      this.updateCardStatus(scriptId, 'launching', '启动中...');

      // 根据设置决定是否显示启动通知
      if (this.settings?.showNotifications !== false) {
      this.showNotification(`正在启动脚本: ${script.name}`, 'info');
      }

      const result = await window.electronAPI.launchScript(scriptId);

      if (result.success) {
        // 更新使用次数
        script.usageCount = (script.usageCount || 0) + 1;
        script.lastUsed = new Date().toISOString();

        // 保存更新
        await window.electronAPI.updateScript(scriptId, script);

        // 更新卡片状态
        this.updateCardStatus(scriptId, 'running', '运行中');

        // 根据设置决定是否显示成功通知
        if (this.settings?.showNotifications !== false) {
        this.showNotification(`脚本启动成功: ${script.name}`, 'success');
        }

        // 3秒后恢复就绪状态（因为脚本是独立运行的）
        setTimeout(() => {
          this.updateCardStatus(scriptId, 'ready', '就绪');
        }, 3000);

      } else {
        this.updateCardStatus(scriptId, 'error', '启动失败');
        // 错误通知始终显示，不受设置影响
        this.showNotification(`启动失败: ${result.error}`, 'error');

        // 2秒后恢复就绪状态
        setTimeout(() => {
          this.updateCardStatus(scriptId, 'ready', '就绪');
        }, 2000);
      }

      this.updateStatistics();

    } catch (error) {
      console.error('启动脚本失败:', error);
      this.updateCardStatus(scriptId, 'error', '启动失败');
      this.showNotification('启动脚本失败: ' + error.message, 'error');

      setTimeout(() => {
        this.updateCardStatus(scriptId, 'ready', '就绪');
      }, 2000);
    }
  }

  updateCardStatus(scriptId, status, statusText) {
    const card = document.querySelector(`[data-script-id="${scriptId}"]`);
    if (!card) return;

    // 移除所有状态类
    card.classList.remove('launching', 'running', 'error');

    // 添加新状态类
    if (status !== 'ready') {
      card.classList.add(status);
    }

    // 更新状态文本
    const statusElement = card.querySelector('.card-status');
    if (statusElement) {
      statusElement.textContent = statusText;
    }
  }

  switchCategory(category) {
    this.currentCategory = category;

    // 更新标签状态
    this.elements.categoryTabs?.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // 重新渲染
    this.renderScripts();
  }

  updateCategoryCounts() {
    // 初始化所有类型的计数为0
    const counts = {
      all: this.scripts.size
    };

    // 为每种类型初始化计数
    Object.values(ScriptManager.SCRIPT_TYPES).forEach(type => {
      counts[type] = 0;
    });

    // 统计每种类型的脚本数量
    this.scripts.forEach(script => {
      const type = script.type || ScriptManager.SCRIPT_TYPES.OTHER;
      if (counts.hasOwnProperty(type)) {
        counts[type]++;
      } else {
        counts[ScriptManager.SCRIPT_TYPES.OTHER]++;
      }
    });

    // 更新UI显示
    if (this.elements.countAll) this.elements.countAll.textContent = counts.all;
    if (this.elements.countPython) this.elements.countPython.textContent = counts.python;
    if (this.elements.countJavascript) this.elements.countJavascript.textContent = counts.javascript;
    if (this.elements.countTypescript) this.elements.countTypescript.textContent = counts.typescript;
    if (this.elements.countBatch) this.elements.countBatch.textContent = counts.batch;
    if (this.elements.countPowershell) this.elements.countPowershell.textContent = counts.powershell;
    if (this.elements.countBash) this.elements.countBash.textContent = counts.bash;
    if (this.elements.countOther) this.elements.countOther.textContent = counts.other;
  }

  updateStatistics() {
    // 更新总脚本数
    if (this.elements.totalScripts) {
      this.elements.totalScripts.textContent = this.scripts.size;
    }

    // 更新运行中脚本数（这里简化处理，实际可以通过IPC获取）
    if (this.elements.runningScripts) {
      const runningCount = document.querySelectorAll('.script-card.running').length;
      this.elements.runningScripts.textContent = runningCount;
    }
  }

  updateLastUpdateTime() {
    if (this.elements.lastUpdate) {
      const now = new Date();
      const timeString = now.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      this.elements.lastUpdate.textContent = `最后更新: ${timeString}`;
    }
  }

  showContextMenu(x, y) {
    const menu = this.elements.contextMenu;
    if (!menu) return;

    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // 确保菜单不超出屏幕
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = (y - rect.height) + 'px';
    }
  }

  hideContextMenu() {
    const menu = this.elements.contextMenu;
    if (menu) {
      menu.style.display = 'none';
    }
  }

  async copyScriptPath(scriptId) {
    try {
      const script = this.scripts.get(scriptId);
      if (!script) return;

      await navigator.clipboard.writeText(script.path);
      this.showNotification('脚本路径已复制到剪贴板', 'success');
    } catch (error) {
      console.error('复制路径失败:', error);
      this.showNotification('复制路径失败', 'error');
    }
  }

  async openScriptFolder(scriptId) {
    try {
      const script = this.scripts.get(scriptId);
      if (!script) {
        this.showNotification('脚本不存在', 'error');
        return;
      }

      const result = await window.electronAPI.openScriptFolder(script.path);

      if (result.success) {
        this.showNotification('已打开脚本所在文件夹', 'success');
      } else {
        this.showNotification('打开文件夹失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('打开文件夹失败:', error);
      this.showNotification('打开文件夹失败: ' + error.message, 'error');
    }
  }

  async deleteScript(scriptId) {
    try {
      const script = this.scripts.get(scriptId);
      if (!script) return;

      // 查询相关的定时任务
      let taskInfo = '';
      try {
        const taskResult = await window.electronAPI.getTasksByScript(scriptId);
        if (taskResult.success && taskResult.tasks.length > 0) {
          taskInfo = `\n\n同时将删除 ${taskResult.tasks.length} 个相关的定时任务。`;
        }
      } catch (error) {
        console.warn('查询相关任务失败:', error);
        // 继续执行删除，不因为查询任务失败而中断
      }

      const confirmed = await this.showConfirmDialog(
        '确认删除',
        `确定要删除脚本 "${script.name}" 吗？${taskInfo}`
      );
      if (!confirmed) return;

      const result = await window.electronAPI.deleteScript(scriptId);

      if (result.success) {
        this.scripts.delete(scriptId);
        this.renderScripts();
        this.updateStatistics();

        // 构建删除成功的消息
        let successMessage = `脚本 "${script.name}" 已删除`;
        if (result.taskCleanup && result.taskCleanup.deletedCount > 0) {
          successMessage += `，同时清理了 ${result.taskCleanup.deletedCount} 个相关任务`;
        }

        this.showNotification(successMessage, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除脚本失败:', error);
      this.showNotification('删除脚本失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示脚本的定时任务设置
   */
  async showTaskSettingsForScript(scriptId) {
    try {
      if (!scriptId) {
        this.showNotification('无效的脚本ID', 'error');
        return;
      }

      if (!window.taskManager) {
        this.showNotification('定时任务功能未初始化', 'error');
        return;
      }

      // 确保模态框已准备好
      const modalOverlay = document.getElementById('modal-overlay');
      if (!modalOverlay) {
        this.showNotification('模态框元素未找到', 'error');
        return;
      }

      await window.taskManager.showTaskSettingsForScript(scriptId);

      // 确保模态框显示
      if (modalOverlay.style.display !== 'flex') {
        modalOverlay.style.display = 'flex';
      }
    } catch (error) {
      console.error('显示定时任务设置失败:', error);
      this.showNotification('显示定时任务设置失败: ' + error.message, 'error');
    }
  }

  showAddScriptModal() {
    this.elements.modalTitle.textContent = '添加脚本';
    this.elements.modalBody.innerHTML = this.getAddScriptModalContent();
    this.setupAddScriptModalEvents();
    this.showModal();
  }

  showEditScriptModal(scriptId) {
    const script = this.scripts.get(scriptId);
    if (!script) return;

    this.elements.modalTitle.textContent = '编辑脚本';
    this.elements.modalBody.innerHTML = this.getEditScriptModalContent(script);
    this.setupEditScriptModalEvents(scriptId);
    this.showModal();
  }

  showSettingsModal() {
    this.elements.modalTitle.textContent = '设置';
    this.elements.modalBody.innerHTML = this.getSettingsModalContent();

    // 设置表单值
    if (this.settings) {
      const themeSelect = document.getElementById('theme-select');
      const autoRefresh = document.getElementById('auto-refresh');
      const showNotifications = document.getElementById('show-notifications');
      const minimizeToTray = document.getElementById('minimize-to-tray');

      if (themeSelect) themeSelect.value = this.settings.theme || 'light';
      if (autoRefresh) autoRefresh.checked = this.settings.autoRefresh !== false;
      if (showNotifications) showNotifications.checked = this.settings.showNotifications !== false;
      if (minimizeToTray) minimizeToTray.checked = this.settings.minimizeToTray === true;
    }

    this.setupSettingsModalEvents();
    this.showModal();
  }

  getAddScriptModalContent() {
    return `
      <form id="add-script-form">
        <div class="form-group">
          <label class="form-label">脚本名称</label>
          <input type="text" class="form-input" id="script-name" required>
        </div>

        <div class="form-group">
          <label class="form-label">脚本路径</label>
          <div class="file-input-group">
            <input type="text" class="form-input" id="script-path" required>
            <button type="button" class="btn btn-secondary" id="browse-file-btn">浏览</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">脚本类型</label>
          <select class="form-select" id="script-type" required>
            <option value="">请选择类型</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="batch">Batch</option>
            <option value="powershell">PowerShell</option>
            <option value="bash">Bash</option>
            <option value="other">其他</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea class="form-textarea" id="script-description" placeholder="可选：描述脚本的功能"></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary">添加脚本</button>
        </div>
      </form>
    `;
  }

  getEditScriptModalContent(script) {
    return `
      <form id="edit-script-form">
        <div class="form-group">
          <label class="form-label">脚本名称</label>
          <input type="text" class="form-input" id="script-name" value="${script.name}" required>
        </div>

        <div class="form-group">
          <label class="form-label">脚本路径</label>
          <div class="file-input-group">
            <input type="text" class="form-input" id="script-path" value="${script.path}" required>
            <button type="button" class="btn btn-secondary" id="browse-file-btn">浏览</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">脚本类型</label>
          <select class="form-select" id="script-type" required>
            <option value="python" ${script.type === 'python' ? 'selected' : ''}>Python</option>
            <option value="javascript" ${script.type === 'javascript' ? 'selected' : ''}>JavaScript</option>
            <option value="typescript" ${script.type === 'typescript' ? 'selected' : ''}>TypeScript</option>
            <option value="batch" ${script.type === 'batch' ? 'selected' : ''}>Batch</option>
            <option value="powershell" ${script.type === 'powershell' ? 'selected' : ''}>PowerShell</option>
            <option value="bash" ${script.type === 'bash' ? 'selected' : ''}>Bash</option>
            <option value="other" ${script.type === 'other' ? 'selected' : ''}>其他</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">描述</label>
          <textarea class="form-textarea" id="script-description" placeholder="可选：描述脚本的功能">${script.description || ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
          <button type="submit" class="btn btn-primary">保存更改</button>
        </div>
      </form>
    `;
  }

  getSettingsModalContent() {
    return `
      <div class="settings-content">
        <div class="form-group">
          <label class="form-label">应用主题</label>
          <select class="form-select" id="theme-select">
            <option value="light">
              <svg xmlns="http://www.w3.org/2000/svg" width="36.61" height="32" viewBox="0 0 1025 896" class="theme-icon">
                <path fill="#eab308" d="M1024.526 768q0 53-37.5 90.5t-90.5 37.5h-768q-53 0-90.5-37.5T.526 768V256q0-26 18.5-45t45.5-19h480q0-12 11.5-33t22.5-36l12-16q7-18 28-30.5t44-12.5h240q24 0 45 12.5t28 30.5q49 58 49 85zm-978-725q7-18 28-30.5t44-12.5h240q24 0 45 12.5t29 30.5l48 85h-480z"/>
              </svg>
              浅色主题
            </option>
            <option value="dark">
              <svg xmlns="http://www.w3.org/2000/svg" width="36.61" height="32" viewBox="0 0 1025 896" class="theme-icon">
                <path fill="#eab308" d="M1024.526 768q0 53-37.5 90.5t-90.5 37.5h-768q-53 0-90.5-37.5T.526 768V256q0-26 18.5-45t45.5-19h480q0-12 11.5-33t22.5-36l12-16q7-18 28-30.5t44-12.5h240q24 0 45 12.5t28 30.5q49 58 49 85zm-978-725q7-18 28-30.5t44-12.5h240q24 0 45 12.5t29 30.5l48 85h-480z"/>
              </svg>
              深色主题
            </option>
            <option value="auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="36.61" height="32" viewBox="0 0 1025 896" class="theme-icon">
                <path fill="#eab308" d="M1024.526 768q0 53-37.5 90.5t-90.5 37.5h-768q-53 0-90.5-37.5T.526 768V256q0-26 18.5-45t45.5-19h480q0-12 11.5-33t22.5-36l12-16q7-18 28-30.5t44-12.5h240q24 0 45 12.5t28 30.5q49 58 49 85zm-978-725q7-18 28-30.5t44-12.5h240q24 0 45 12.5t29 30.5l48 85h-480z"/>
              </svg>
              跟随系统
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
          <input type="checkbox" id="auto-refresh" checked>
            <span>启动时自动刷新</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
          <input type="checkbox" id="show-notifications" checked>
            <span>显示启动通知</span>
          </label>
        </div>

        <div class="form-group">
          <label class="checkbox-label">
          <input type="checkbox" id="minimize-to-tray">
            <span>关闭时最小化到托盘</span>
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancel-btn">取消</button>
          <button type="button" class="btn btn-primary" id="save-settings-btn">保存设置</button>
        </div>
      </div>
    `;
  }

  setupAddScriptModalEvents() {
    const form = document.getElementById('add-script-form');
    const browseBtn = document.getElementById('browse-file-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const pathInput = document.getElementById('script-path');
    const typeSelect = document.getElementById('script-type');

    browseBtn?.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.browseFile();
        if (result.success) {
          pathInput.value = result.filePath;

          // 自动检测脚本类型
          const detectedType = this.detectScriptType(result.filePath);
          if (detectedType) {
            typeSelect.value = detectedType;
          }
        }
      } catch (error) {
        this.showNotification('浏览文件失败: ' + error.message, 'error');
      }
    });

    cancelBtn?.addEventListener('click', () => {
      this.hideModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleAddScript();
    });
  }

  setupEditScriptModalEvents(scriptId) {
    const form = document.getElementById('edit-script-form');
    const browseBtn = document.getElementById('browse-file-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const pathInput = document.getElementById('script-path');
    const typeSelect = document.getElementById('script-type');

    browseBtn?.addEventListener('click', async () => {
      try {
        const result = await window.electronAPI.browseFile();
        if (result.success) {
          pathInput.value = result.filePath;

          const detectedType = this.detectScriptType(result.filePath);
          if (detectedType) {
            typeSelect.value = detectedType;
          }
        }
      } catch (error) {
        this.showNotification('浏览文件失败: ' + error.message, 'error');
      }
    });

    cancelBtn?.addEventListener('click', () => {
      this.hideModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleEditScript(scriptId);
    });
  }

  setupSettingsModalEvents() {
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-settings-btn');

    cancelBtn?.addEventListener('click', () => {
      this.hideModal();
    });

    saveBtn?.addEventListener('click', () => {
      this.saveSettings();
      this.hideModal();
    });
  }

  async handleAddScript() {
    try {
      const name = document.getElementById('script-name').value.trim();
      const path = document.getElementById('script-path').value.trim();
      const type = document.getElementById('script-type').value;
      const description = document.getElementById('script-description').value.trim();

      if (!name || !path || !type) {
        this.showNotification('请填写所有必填字段', 'warning');
        return;
      }

      // 检查是否已存在相同路径的脚本
      const existingScript = Array.from(this.scripts.values()).find(s => s.path === path);
      if (existingScript) {
        const confirmUpdate = await this.showConfirmDialog('确认更新', `已存在路径为 "${path}" 的脚本。\n\n是否更新现有脚本？`);
        if (confirmUpdate) {
          // 更新现有脚本
          return await this.handleEditScript(existingScript.id, {
            name,
            path,
            type,
            description
          });
        } else {
          return; // 用户取消操作
        }
      }

      // 检查文件扩展名与选择的类型是否匹配
      const detectedType = this.detectScriptType(path);
      if (detectedType !== type && detectedType !== ScriptManager.SCRIPT_TYPES.OTHER) {
        const confirmWrongType = await this.showConfirmDialog('类型不匹配', `您选择的脚本类型 "${this.getScriptTypeDisplay(type)}" 与文件扩展名不匹配。\n\n文件扩展名表明这可能是 "${this.getScriptTypeDisplay(detectedType)}" 脚本。\n\n是否继续使用选择的类型？`);
        if (!confirmWrongType) {
          document.getElementById('script-type').value = detectedType;
          return;
        }
      }

      const scriptData = {
        name,
        path,
        type,
        description,
        createdAt: new Date().toISOString(),
        usageCount: 0
      };

      const result = await window.electronAPI.saveScript(scriptData);

      if (result.success) {
        this.scripts.set(result.script.id, result.script);
        this.renderScripts();
        this.updateStatistics();
        this.hideModal();
        this.showNotification(`脚本 "${name}" 添加成功`, 'success');

        // 为新添加的脚本卡片添加特效
        setTimeout(() => {
          const newCard = document.querySelector(`[data-script-id="${result.script.id}"]`);
          if (newCard) {
            newCard.classList.add('new-card');

            // 滚动到新卡片位置
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 5秒后移除特效
            setTimeout(() => {
              newCard.classList.remove('new-card');
            }, 5000);
          }
        }, 100); // 短暂延迟确保DOM已更新
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('添加脚本失败:', error);
      this.showNotification('添加脚本失败: ' + error.message, 'error');
    }
  }

  async handleEditScript(scriptId, customData = null) {
    try {
      let scriptData;

      // 如果提供了自定义数据，使用它；否则从表单获取数据
      if (customData) {
        scriptData = {
          ...customData,
          updatedAt: new Date().toISOString()
        };
      } else {
        const name = document.getElementById('script-name').value.trim();
        const path = document.getElementById('script-path').value.trim();
        const type = document.getElementById('script-type').value;
        const description = document.getElementById('script-description').value.trim();

        if (!name || !path || !type) {
          this.showNotification('请填写所有必填字段', 'warning');
          return;
        }

        scriptData = {
          name,
          path,
          type,
          description,
          updatedAt: new Date().toISOString()
        };
      }

      const result = await window.electronAPI.updateScript(scriptId, scriptData);

      if (result.success) {
        // 更新本地数据
        const script = this.scripts.get(scriptId);
        Object.assign(script, scriptData);

        this.renderScripts();
        this.hideModal();
        this.showNotification(`脚本 "${scriptData.name}" 更新成功`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('更新脚本失败:', error);
      this.showNotification('更新脚本失败: ' + error.message, 'error');
    }
  }

  async loadSettings() {
    try {
      const result = await window.electronAPI.loadSettings();

      if (result.success) {
        this.settings = result.settings;
        console.log('设置加载成功:', this.settings);
      } else {
        throw new Error(result.error || '加载设置失败');
      }
    } catch (error) {
      console.error('加载设置失败:', error);
      this.showNotification('加载设置失败: ' + error.message, 'error');
      // 使用默认设置
      this.settings = {
        theme: 'light',
        autoRefresh: true,
        showNotifications: true
      };
    }
  }

  applySettings() {
    if (!this.settings) return;

    // 应用主题
    document.documentElement.setAttribute('data-theme', this.settings.theme);

    // 其他设置应用逻辑可以在这里添加
    console.log('已应用设置');
  }

  async saveSettings() {
    try {
      // 获取设置表单中的值
      const themeSelect = document.getElementById('theme-select');
      const autoRefresh = document.getElementById('auto-refresh');
      const showNotifications = document.getElementById('show-notifications');
      const minimizeToTray = document.getElementById('minimize-to-tray');

      const newSettings = {
        theme: themeSelect.value,
        autoRefresh: autoRefresh.checked,
        showNotifications: showNotifications.checked,
        minimizeToTray: minimizeToTray.checked
      };

      // 保存设置
      const result = await window.electronAPI.saveSettings(newSettings);

      if (result.success) {
        this.settings = result.settings;
        this.applySettings();
    this.showNotification('设置已保存', 'success');
      } else {
        throw new Error(result.error || '保存设置失败');
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      this.showNotification('保存设置失败: ' + error.message, 'error');
    }
  }

  showModal() {
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.style.display = 'flex';
    }
  }

  hideModal() {
    if (this.elements.modalOverlay) {
      this.elements.modalOverlay.style.display = 'none';
    }
  }

  showLoading(show) {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.display = show ? 'flex' : 'none';
    }
  }

  showNotification(message, type = 'info') {
    const container = this.elements.notificationContainer;
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <span class="notification-icon">${this.getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
    `;

    container.appendChild(notification);

    // 自动移除通知
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);

    // 点击移除通知
    notification.addEventListener('click', () => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    });
  }

  handleKeyboardShortcuts(e) {
    // Ctrl+N: 添加新脚本
    if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      this.showAddScriptModal();
    }

    // F5: 刷新
    if (e.key === 'F5') {
      e.preventDefault();
      this.refreshScripts();
    }

    // Escape: 关闭模态框或右键菜单
    if (e.key === 'Escape') {
      this.hideModal();
      this.hideContextMenu();
    }
  }

  // 打开GitHub仓库
  async openGitHubRepository() {
    try {
      const repositoryUrl = 'https://github.com/hmhm2022/scripts-manager';
      await window.electronAPI.openExternal(repositoryUrl);
    } catch (error) {
      console.error('打开GitHub仓库失败:', error);
      this.showNotification('打开GitHub仓库失败', 'error');
    }
  }

  /**
   * 获取脚本的定时任务信息
   */
  async getScriptTaskInfo(scriptId) {
    try {
      const result = await window.electronAPI.getTasksByScript(scriptId);
      if (result.success && result.tasks.length > 0) {
        const activeTasks = result.tasks.filter(task => task.enabled);
        if (activeTasks.length > 0) {
          const task = activeTasks[0]; // 显示第一个活跃任务
          return {
            hasTask: true,
            scheduleText: this.formatTaskSchedule(task.schedule),
            taskCount: activeTasks.length
          };
        }
      }
      return { hasTask: false };
    } catch (error) {
      console.error('获取脚本任务信息失败:', error);
      return { hasTask: false };
    }
  }

  /**
   * 格式化任务调度信息
   */
  formatTaskSchedule(schedule) {
    switch (schedule.type) {
      case 'interval':
        const minutes = Math.floor(schedule.value / 60000);
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
          return `每${hours}小时`;
        } else {
          return `每${minutes}分钟`;
        }
      case 'daily':
        return `每天${schedule.time}`;
      case 'weekly':
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return `周${days[schedule.day]} ${schedule.time}`;
      default:
        return '定时任务';
    }
  }

  // 工具方法
  getScriptIcon(type) {
    // SVG图标库
    const svgIcons = {
      python: `<svg class="icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#3776AB" d="M11.94,0C5.86,0,6.24,2.68,6.24,2.68l0,2.75h5.8v0.83H3.93c0,0-3.93-0.44-3.93,5.77 s3.43,5.97,3.43,5.97h2.04v-2.87c0,0-0.11-3.43,3.38-3.43h5.82c0,0,3.26,0.05,3.26-3.15V3.25C17.93,3.25,18.28,0,11.94,0z M8.75,1.88c0.58,0,1.04,0.47,1.04,1.04c0,0.58-0.47,1.04-1.04,1.04S7.71,3.49,7.71,2.92C7.71,2.34,8.17,1.88,8.75,1.88z"/>
                <path fill="#FFC331" d="M12.05,24c6.08,0,5.7-2.68,5.7-2.68l0-2.75h-5.8v-0.83h8.11c0,0,3.93,0.44,3.93-5.77 s-3.43-5.97-3.43-5.97h-2.04v2.87c0,0,0.11,3.43-3.38,3.43H9.33c0,0-3.26-0.05-3.26,3.15v5.33C6.07,20.75,5.72,24,12.05,24z M15.25,22.12c-0.58,0-1.04-0.47-1.04-1.04c0-0.58,0.47-1.04,1.04-1.04c0.58,0,1.04,0.47,1.04,1.04 C16.29,21.66,15.83,22.12,15.25,22.12z"/>
              </svg>`,
      javascript: `<svg class="icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#F7DF1E" d="M0,0h24v24H0V0z"/>
                    <path fill="#000000" d="M16.8,15.7c0.2,0.5,0.5,0.9,1,1.2c0.5,0.3,1,0.4,1.6,0.4c0.5,0,1-0.1,1.4-0.3 c0.4-0.2,0.6-0.5,0.6-0.9c0-0.3-0.1-0.6-0.4-0.8c-0.3-0.2-0.7-0.4-1.2-0.5l-1.2-0.3c-0.8-0.2-1.5-0.5-2-1c-0.5-0.5-0.8-1.1-0.8-1.9 c0-0.5,0.1-1,0.4-1.4c0.3-0.4,0.6-0.7,1.1-1c0.5-0.3,1-0.4,1.7-0.4c0.9,0,1.6,0.2,2.2,0.6c0.6,0.4,1,1,1.2,1.8l-1.8,0.5 c-0.1-0.3-0.3-0.6-0.6-0.8c-0.3-0.2-0.7-0.3-1.1-0.3c-0.4,0-0.8,0.1-1.1,0.3c-0.3,0.2-0.4,0.4-0.4,0.7c0,0.3,0.1,0.5,0.3,0.7 c0.2,0.2,0.5,0.3,0.9,0.4l1.2,0.3c0.9,0.2,1.6,0.6,2.1,1.1c0.5,0.5,0.7,1.1,0.7,1.9c0,0.6-0.2,1.1-0.5,1.5c-0.3,0.4-0.7,0.8-1.3,1 c-0.5,0.2-1.1,0.4-1.8,0.4c-0.9,0-1.7-0.2-2.4-0.7c-0.7-0.5-1.1-1.1-1.3-2L16.8,15.7z M9.8,15.7c0.1,0.3,0.3,0.5,0.6,0.7 c0.3,0.2,0.6,0.2,0.9,0.2c0.4,0,0.8-0.1,1-0.3c0.3-0.2,0.4-0.5,0.4-0.9v-6.2h2v6.2c0,0.6-0.1,1.1-0.4,1.5c-0.3,0.4-0.6,0.8-1.1,1 c-0.5,0.2-1,0.3-1.6,0.3c-0.9,0-1.7-0.2-2.3-0.7c-0.6-0.5-1-1.1-1.1-1.9L9.8,15.7z"/>
                  </svg>`,
      typescript: `<svg class="icon-svg" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#059669" d="M0 16v16h32V0H0zm25.786-1.276a4 4 0 0 1 2.005 1.156c.292.312.729.885.766 1.026c.01.042-1.38.974-2.224 1.495c-.031.021-.156-.109-.292-.313c-.411-.599-.844-.859-1.505-.906c-.969-.063-1.594.443-1.589 1.292a1.26 1.26 0 0 0 .135.599c.214.443.615.708 1.854 1.245c2.292.984 3.271 1.635 3.88 2.557c.682 1.031.833 2.677.375 3.906c-.51 1.328-1.771 2.234-3.542 2.531c-.547.099-1.849.083-2.438-.026c-1.286-.229-2.505-.865-3.255-1.698c-.297-.323-.87-1.172-.833-1.229c.016-.021.146-.104.292-.188l1.188-.688l.922-.536l.193.286c.271.411.859.974 1.214 1.161c1.021.542 2.422.464 3.115-.156c.281-.234.438-.594.417-.958c0-.37-.047-.536-.24-.813c-.25-.354-.755-.656-2.198-1.281c-1.651-.714-2.365-1.151-3.01-1.854a4.2 4.2 0 0 1-.88-1.599c-.12-.453-.151-1.589-.057-2.042c.339-1.599 1.547-2.708 3.281-3.036c.563-.109 1.875-.068 2.427.068zm-7.51 1.339l.01 1.307h-4.167v11.839h-2.948V17.37H7.01v-1.281c0-.714.016-1.307.036-1.323c.016-.021 2.547-.031 5.62-.026l5.594.016z"/>
                  </svg>`,
      batch: `<svg class="icon-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#8aadf4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 15.5c-.7 0-1.5-.8-1.5-1.5V5c0-.7.8-1.5 1.5-1.5h9c.7 0 1.5.8 1.5 1.5v9c0 .7-.8 1.5-1.5 1.5z"/>
                <path d="m1.2 3.8l3.04-2.5S5.17.5 5.7.5h8.4c.66 0 1.4.73 1.4 1.4v7.73a2.7 2.7 0 0 1-.7 1.75l-2.68 3.51M3 8.5l3 2l-3 2"/>
              </g>
            </svg>`,
      powershell: `<svg class="icon-svg" viewBox="0 0 1025 1024" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#0284c7" d="M896.428 1024h-768q-53 0-90.5-37.5T.428 896V128q0-53 37.5-90.5t90.5-37.5h768q53 0 90.5 37.5t37.5 90.5v768q0 53-37.5 90.5t-90.5 37.5m-406-562l-187-188q-19-20-46.5-20t-47 19.5t-19.5 47t20 46.5l141 143l-141 142q-20 20-20 47.5t19.5 46.5t47 19t46.5-19l187-188q18-17 19-42t-14-44q2-3-5-10m278 177h-192q-26 0-45 19t-19 45.5t19 45.5t45 19h192q27 0 45.5-19t18.5-45.5t-18.5-45.5t-45.5-19"/>
                  </svg>`,
      bash: `<svg class="icon-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#a6da95" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 15.5c-.7 0-1.5-.8-1.5-1.5V5c0-.7.8-1.5 1.5-1.5h9c.7 0 1.5.8 1.5 1.5v9c0 .7-.8 1.5-1.5 1.5z"/>
                <path d="m1.2 3.8l3.04-2.5S5.17.5 5.7.5h8.4c.66 0 1.4.73 1.4 1.4v7.73a2.7 2.7 0 0 1-.7 1.75l-2.68 3.51"/>
                <path d="M6 8.75c0-.69-.54-1.25-1.2-1.25h-.6c-.66 0-1.2.56-1.2 1.25S3.54 10 4.2 10h.6c.66 0 1.2.56 1.2 1.25s-.54 1.25-1.2 1.25h-.6c-.66 0-1.2-.56-1.2-1.25M4.5 6.5v1m0 5v1"/>
              </g>
            </svg>`,
      other: `<svg class="icon-svg" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4f46e5" fill-rule="evenodd" d="M.218 2.09C0 2.518 0 3.078 0 4.2v7.6c0 1.12 0 1.68.218 2.11c.192.376.498.682.874.874c.428.218.988.218 2.11.218h9.6c1.12 0 1.68 0 2.11-.218c.376-.192.682-.498.874-.874c.218-.428.218-.988.218-2.11V4.2c0-1.12 0-1.68-.218-2.11a2 2 0 0 0-.874-.874c-.428-.218-.988-.218-2.11-.218h-9.6c-1.12 0-1.68 0-2.11.218a2 2 0 0 0-.874.874M1 11.8V5h14v6.8c0 .577 0 .949-.024 1.23c-.022.272-.06.372-.085.422a1 1 0 0 1-.437.437c-.05.025-.15.063-.422.085c-.283.023-.656.024-1.23.024h-9.6c-.577 0-.949 0-1.23-.024c-.272-.022-.372-.06-.422-.085a1 1 0 0 1-.437-.437c-.025-.05-.063-.15-.085-.422a17 17 0 0 1-.024-1.23zM2 4a1 1 0 1 0 0-2a1 1 0 0 0 0 2m4-1a1 1 0 1 1-2 0a1 1 0 0 1 2 0m2 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2" clip-rule="evenodd"/>
            </svg>`
    };

    return svgIcons[type] || svgIcons.other;
  }

  getScriptTypeDisplay(type) {
    return ScriptManager.TYPE_DISPLAYS[type] || '未知';
  }

  detectScriptType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    return ScriptManager.FILE_EXTENSIONS[ext] || ScriptManager.SCRIPT_TYPES.OTHER;
  }

  isScriptFile(fileName) {
    const scriptExtensions = ['.py', '.pyw', '.js', '.ts', '.bat', '.cmd', '.ps1', '.sh'];
    return scriptExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  }

  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }

  async addScriptFromFile(filePath) {
    try {
      if (!filePath || !this.isScriptFile(filePath)) {
        this.showNotification('不支持的文件类型', 'warning');
        return;
      }

      // 提取文件名和扩展名
      const fileName = filePath.split(/[\\/]/).pop();
      const name = fileName.split('.')[0];

      // 检测脚本类型
    const type = this.detectScriptType(filePath);

    // 检查是否已存在相同路径的脚本
    const existingScript = Array.from(this.scripts.values()).find(s => s.path === filePath);
    if (existingScript) {
      const confirmUpdate = await this.showConfirmDialog('确认更新', `已存在路径为 "${filePath}" 的脚本。\n\n是否更新现有脚本？`);
      if (confirmUpdate) {
        // 更新现有脚本
        const scriptData = {
            name: existingScript.name,
          path: filePath,
          type,
          description: existingScript.description || `从文件导入: ${filePath}`,
          updatedAt: new Date().toISOString()
        };

        return await this.handleEditScript(existingScript.id, scriptData);
      } else {
        return; // 用户取消操作
      }
    }

      // 创建新脚本
    const scriptData = {
      name,
      path: filePath,
      type,
      description: `从文件导入: ${filePath}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

      const result = await window.electronAPI.saveScript(scriptData);

      if (result.success) {
        this.scripts.set(result.script.id, result.script);
        this.renderScripts();
        this.updateStatistics();
        this.showNotification(`脚本 "${name}" 导入成功`, 'success');

        // 为新添加的脚本卡片添加特效
        setTimeout(() => {
          const newCard = document.querySelector(`[data-script-id="${result.script.id}"]`);
          if (newCard) {
            newCard.classList.add('new-card');

            // 滚动到新卡片位置
            newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 5秒后移除特效
            setTimeout(() => {
              newCard.classList.remove('new-card');
            }, 5000);
          }
        }, 100); // 短暂延迟确保DOM已更新
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('导入脚本失败:', error);
      this.showNotification('导入脚本失败: ' + error.message, 'error');
    }
  }

  /**
   * 显示自定义确认对话框
   * @param {string} title - 对话框标题
   * @param {string} message - 确认消息
   * @param {string} confirmText - 确认按钮文本
   * @param {string} cancelText - 取消按钮文本
   * @returns {Promise<boolean>} - 用户选择结果
   */
  showConfirmDialog(title, message, confirmText = '确定', cancelText = '取消') {
    return new Promise((resolve) => {
      // 设置模态框标题和内容
      this.elements.modalTitle.textContent = title;

      // 创建确认对话框内容
      const confirmContent = document.createElement('div');
      confirmContent.className = 'confirm-dialog';
      confirmContent.innerHTML = `
        <div class="confirm-message">${message}</div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="confirm-cancel-btn">${cancelText}</button>
          <button type="button" class="btn btn-primary" id="confirm-ok-btn">${confirmText}</button>
        </div>
      `;

      // 清空并添加新内容
      this.elements.modalBody.innerHTML = '';
      this.elements.modalBody.appendChild(confirmContent);

      // 设置按钮事件
      document.getElementById('confirm-cancel-btn').addEventListener('click', () => {
        this.hideModal();
        resolve(false);
      });

      document.getElementById('confirm-ok-btn').addEventListener('click', () => {
        this.hideModal();
        resolve(true);
      });

      // 显示模态框
      this.showModal();
    });
  }

  /**
   * 检测是否为测试模式
   */
  isTestMode() {
    // 检查URL参数
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('test')) {
      return true;
    }

    // 检查是否通过IPC获取测试模式状态
    try {
      // 由于process.argv在渲染进程中不可用，我们通过其他方式检测
      // 暂时总是显示测试按钮，便于测试
      return true;
    } catch (error) {
      console.log('测试模式检测失败:', error);
      return false;
    }
  }

  /**
   * 打开测试控制台
   */
  async openTestConsole() {
    try {
      // 通过主进程创建测试控制台窗口
      const result = await window.electronAPI.openTestConsole();

      if (!result.success) {
        this.showNotification('打开测试控制台失败: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('打开测试控制台失败:', error);
      this.showNotification('打开测试控制台失败: ' + error.message, 'error');
    }
  }
}

// 初始化应用
const scriptManager = new ScriptManager();
const taskManager = new TaskManager();

// 将实例添加到全局，方便其他组件使用
window.scriptManager = scriptManager;
window.taskManager = taskManager;