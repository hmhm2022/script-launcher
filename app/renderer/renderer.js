/**
 * 脚本管理器 - 现代化卡片布局渲染器
 * 重构版本：从执行监控器转为启动器
 */

class ScriptManager {
  constructor() {
    this.scripts = new Map();
    this.currentCategory = 'all';
    this.currentSort = 'name';
    this.searchQuery = '';
    this.selectedScript = null;
    
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
      
      // 加载脚本数据
      await this.loadScripts();
      
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
    this.elements.contextCopy = document.getElementById('context-copy');
    this.elements.contextDelete = document.getElementById('context-delete');
    
    // 通知容器
    this.elements.notificationContainer = document.getElementById('notification-container');
    
    // 分类计数
    this.elements.countAll = document.getElementById('count-all');
    this.elements.countPython = document.getElementById('count-python');
    this.elements.countJavascript = document.getElementById('count-javascript');
    this.elements.countBatch = document.getElementById('count-batch');
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

    // 模态对话框关闭
    this.elements.modalClose?.addEventListener('click', () => {
      this.hideModal();
    });
    
    this.elements.modalOverlay?.addEventListener('click', (e) => {
      if (e.target === this.elements.modalOverlay) {
        this.hideModal();
      }
    });

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

  renderScripts() {
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

    // 渲染脚本卡片
    filteredScripts.forEach(script => {
      const card = this.createScriptCard(script);
      grid.appendChild(card);
    });

    // 更新分类计数
    this.updateCategoryCounts();
  }

  getFilteredScripts() {
    let scripts = Array.from(this.scripts.values());

    // 按分类过滤
    if (this.currentCategory !== 'all') {
      scripts = scripts.filter(script => {
        const type = this.normalizeScriptType(script.type);
        return type === this.currentCategory;
      });
    }

    // 按搜索关键词过滤
    if (this.searchQuery) {
      scripts = scripts.filter(script => {
        return script.name.toLowerCase().includes(this.searchQuery) ||
               script.description?.toLowerCase().includes(this.searchQuery) ||
               script.path.toLowerCase().includes(this.searchQuery);
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

  createScriptCard(script) {
    const card = document.createElement('div');
    card.className = 'script-card';
    card.dataset.scriptId = script.id;

    // 获取脚本图标
    const icon = this.getScriptIcon(script.type);
    
    // 获取脚本类型显示名称
    const typeDisplay = this.getScriptTypeDisplay(script.type);

    card.innerHTML = `
      <div class="card-icon">${icon}</div>
      <div class="card-title" title="${script.name}">${script.name}</div>
      <div class="card-type">${typeDisplay}</div>
      <div class="card-description" title="${script.description || '暂无描述'}">${script.description || '暂无描述'}</div>
      <div class="card-footer">
        <div class="card-status">就绪</div>
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
    // 点击卡片启动脚本
    card.addEventListener('click', (e) => {
      // 如果点击的是按钮，不触发卡片点击
      if (e.target.classList.contains('card-action-btn')) {
        return;
      }
      this.launchScript(script.id);
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
      
      this.showNotification(`正在启动脚本: ${script.name}`, 'info');

      const result = await window.electronAPI.launchScript(scriptId);

      if (result.success) {
        // 更新使用次数
        script.usageCount = (script.usageCount || 0) + 1;
        script.lastUsed = new Date().toISOString();
        
        // 保存更新
        await window.electronAPI.updateScript(scriptId, script);
        
        // 更新卡片状态
        this.updateCardStatus(scriptId, 'running', '运行中');
        
        this.showNotification(`脚本启动成功: ${script.name}`, 'success');
        
        // 3秒后恢复就绪状态（因为脚本是独立运行的）
        setTimeout(() => {
          this.updateCardStatus(scriptId, 'ready', '就绪');
        }, 3000);
        
      } else {
        this.updateCardStatus(scriptId, 'error', '启动失败');
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
    const counts = {
      all: this.scripts.size,
      python: 0,
      javascript: 0,
      batch: 0,
      other: 0
    };

    this.scripts.forEach(script => {
      const type = this.normalizeScriptType(script.type);
      if (counts.hasOwnProperty(type)) {
        counts[type]++;
      } else {
        counts.other++;
      }
    });

    // 更新显示
    if (this.elements.countAll) this.elements.countAll.textContent = counts.all;
    if (this.elements.countPython) this.elements.countPython.textContent = counts.python;
    if (this.elements.countJavascript) this.elements.countJavascript.textContent = counts.javascript;
    if (this.elements.countBatch) this.elements.countBatch.textContent = counts.batch;
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

  async deleteScript(scriptId) {
    try {
      const script = this.scripts.get(scriptId);
      if (!script) return;

      const confirmed = confirm(`确定要删除脚本 "${script.name}" 吗？`);
      if (!confirmed) return;

      const result = await window.electronAPI.deleteScript(scriptId);
      
      if (result.success) {
        this.scripts.delete(scriptId);
        this.renderScripts();
        this.updateStatistics();
        this.showNotification(`脚本 "${script.name}" 已删除`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('删除脚本失败:', error);
      this.showNotification('删除脚本失败: ' + error.message, 'error');
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
            <option value="batch">批处理</option>
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
            <option value="batch" ${script.type === 'batch' ? 'selected' : ''}>批处理</option>
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
            <option value="light">浅色主题</option>
            <option value="dark">深色主题</option>
            <option value="auto">跟随系统</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="form-label">启动时自动刷新</label>
          <input type="checkbox" id="auto-refresh" checked>
        </div>
        
        <div class="form-group">
          <label class="form-label">显示启动通知</label>
          <input type="checkbox" id="show-notifications" checked>
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
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('添加脚本失败:', error);
      this.showNotification('添加脚本失败: ' + error.message, 'error');
    }
  }

  async handleEditScript(scriptId) {
    try {
      const name = document.getElementById('script-name').value.trim();
      const path = document.getElementById('script-path').value.trim();
      const type = document.getElementById('script-type').value;
      const description = document.getElementById('script-description').value.trim();

      if (!name || !path || !type) {
        this.showNotification('请填写所有必填字段', 'warning');
        return;
      }

      const scriptData = {
        name,
        path,
        type,
        description,
        updatedAt: new Date().toISOString()
      };

      const result = await window.electronAPI.updateScript(scriptId, scriptData);
      
      if (result.success) {
        // 更新本地数据
        const script = this.scripts.get(scriptId);
        Object.assign(script, scriptData);
        
        this.renderScripts();
        this.hideModal();
        this.showNotification(`脚本 "${name}" 更新成功`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('更新脚本失败:', error);
      this.showNotification('更新脚本失败: ' + error.message, 'error');
    }
  }

  saveSettings() {
    // 这里可以保存设置到本地存储或配置文件
    this.showNotification('设置已保存', 'success');
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

  // 工具方法
  getScriptIcon(type) {
    const icons = {
      python: '🐍',
      javascript: '⚡',
      typescript: '🔷',
      batch: '🔧',
      powershell: '💙',
      bash: '🐚',
      other: '📄'
    };
    return icons[type] || icons.other;
  }

  getScriptTypeDisplay(type) {
    const displays = {
      python: 'Python',
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      batch: '批处理',
      powershell: 'PowerShell',
      bash: 'Bash',
      other: '其他'
    };
    return displays[type] || '未知';
  }

  normalizeScriptType(type) {
    const normalized = {
      js: 'javascript',
      ts: 'typescript',
      bat: 'batch',
      cmd: 'batch',
      ps1: 'powershell',
      sh: 'bash'
    };
    return normalized[type] || type;
  }

  detectScriptType(filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const typeMap = {
      py: 'python',
      js: 'javascript',
      ts: 'typescript',
      bat: 'batch',
      cmd: 'batch',
      ps1: 'powershell',
      sh: 'bash'
    };
    return typeMap[ext] || 'other';
  }

  isScriptFile(fileName) {
    const scriptExtensions = ['.py', '.js', '.ts', '.bat', '.cmd', '.ps1', '.sh'];
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
    const name = filePath.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '');
    const type = this.detectScriptType(filePath);
    
    const scriptData = {
      name,
      path: filePath,
      type,
      description: `从文件导入: ${filePath}`,
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    try {
      const result = await window.electronAPI.saveScript(scriptData);
      if (result.success) {
        this.scripts.set(result.script.id, result.script);
        this.renderScripts();
        this.updateStatistics();
        this.showNotification(`脚本 "${name}" 导入成功`, 'success');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.showNotification('导入脚本失败: ' + error.message, 'error');
    }
  }
}

// 初始化应用
const scriptManager = new ScriptManager(); 
const app = new ScriptManagerApp(); 