const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const os = require('os');

class SettingsManager {
  constructor() {
    // 在便携版中使用用户目录存储数据
    const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
    this.dataFile = path.join(userDataPath, 'settings.json');
    this.settings = null;
    this.ensureDataFile();
  }

  async ensureDataFile() {
    try {
      // 确保数据目录存在
      const dataDir = path.dirname(this.dataFile);
      await fs.mkdir(dataDir, { recursive: true });

      // 检查数据文件是否存在
      try {
        await fs.access(this.dataFile);
      } catch (error) {
        // 文件不存在，创建初始数据
        await this.createInitialData();
      }
    } catch (error) {
      console.error('初始化设置文件失败:', error);
    }
  }

  async createInitialData() {
    console.log('SettingsManager: 创建初始设置数据...');

    const initialSettings = this.getDefaultSettings();

    try {
      await fs.writeFile(this.dataFile, JSON.stringify(initialSettings, null, 2), 'utf8');
      console.log('SettingsManager: 已成功创建初始设置数据');
    } catch (error) {
      console.error('SettingsManager: 写入初始设置失败:', error.message);
      throw error;
    }
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      autoRefresh: true,
      showNotifications: true,
      pythonPath: '',
      nodePath: '',
      tsNodePath: '',
      firstRun: true,
      language: 'zh-CN',
      autoCleanup: true,
      maxProcesses: 10,
      minimizeToTray: false,
      updatedAt: new Date().toISOString()
    };
  }

  async loadSettings() {
    try {
      if (this.settings) {
        return { success: true, settings: this.settings };
      }

      console.log('SettingsManager: 开始读取设置数据文件:', this.dataFile);
      const data = await fs.readFile(this.dataFile, 'utf8');
      this.settings = JSON.parse(data);
      
      // 确保所有默认设置字段都存在
      const defaultSettings = this.getDefaultSettings();
      this.settings = { ...defaultSettings, ...this.settings };
      
      console.log('SettingsManager: 成功读取设置数据');
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('SettingsManager: 读取设置数据失败:', error.message);
      
      // 如果文件不存在，尝试创建初始数据
      if (error.code === 'ENOENT') {
        console.log('SettingsManager: 设置文件不存在，创建初始数据...');
        try {
          await this.createInitialData();
          const data = await fs.readFile(this.dataFile, 'utf8');
          this.settings = JSON.parse(data);
          console.log('SettingsManager: 成功创建并读取初始数据');
          return { success: true, settings: this.settings };
        } catch (createError) {
          console.error('SettingsManager: 创建初始数据失败:', createError.message);
          return { success: false, error: '无法创建初始设置数据: ' + createError.message };
        }
      }
      return { success: false, error: error.message };
    }
  }

  async saveSettings(newSettings) {
    try {
      // 加载当前设置
      await this.loadSettings();
      
      // 合并新设置
      this.settings = {
        ...this.settings,
        ...newSettings,
        updatedAt: new Date().toISOString()
      };

      // 写入文件
      await fs.writeFile(this.dataFile, JSON.stringify(this.settings, null, 2), 'utf8');
      console.log('SettingsManager: 设置已保存');
      
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('SettingsManager: 保存设置失败:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getSetting(key) {
    try {
      const { success, settings } = await this.loadSettings();
      if (!success) {
        throw new Error('无法加载设置');
      }
      
      return { success: true, value: settings[key] };
    } catch (error) {
      console.error(`SettingsManager: 获取设置 ${key} 失败:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SettingsManager; 