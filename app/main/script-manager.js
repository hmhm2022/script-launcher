const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');
const os = require('os');

class ScriptManager {
  constructor() {
    // 在便携版中使用用户目录存储数据
    const userDataPath = app.getPath('userData') || path.join(os.homedir(), '.script-manager');
    this.dataFile = path.join(userDataPath, 'scripts.json');
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
      console.error('初始化数据文件失败:', error);
    }
  }

  async createInitialData() {
    console.log('ScriptManager: 创建初始脚本数据...');

    // 便携版不包含示例脚本，创建空的脚本列表
    const initialScripts = [];

    try {
      await fs.writeFile(this.dataFile, JSON.stringify(initialScripts, null, 2), 'utf8');
      console.log('ScriptManager: 已成功创建初始脚本数据，包含', initialScripts.length, '个示例脚本');
    } catch (error) {
      console.error('ScriptManager: 写入初始数据失败:', error.message);
      throw error;
    }
  }

  async loadScripts() {
    try {
      console.log('ScriptManager: 开始读取脚本数据文件:', this.dataFile);
      const data = await fs.readFile(this.dataFile, 'utf8');
      const scripts = JSON.parse(data);
      console.log('ScriptManager: 成功读取脚本数据，共', scripts.length, '个脚本');
      return { success: true, scripts };
    } catch (error) {
      console.error('ScriptManager: 读取脚本数据失败:', error.message);
      // 如果文件不存在，尝试创建初始数据
      if (error.code === 'ENOENT') {
        console.log('ScriptManager: 数据文件不存在，创建初始数据...');
        try {
          await this.createInitialData();
          const data = await fs.readFile(this.dataFile, 'utf8');
          const scripts = JSON.parse(data);
          console.log('ScriptManager: 成功创建并读取初始数据，共', scripts.length, '个脚本');
          return { success: true, scripts };
        } catch (createError) {
          console.error('ScriptManager: 创建初始数据失败:', createError.message);
          return { success: false, error: '无法创建初始数据: ' + createError.message, scripts: [] };
        }
      }
      return { success: false, error: error.message, scripts: [] };
    }
  }

  async saveScript(scriptData) {
    try {
      const { scripts } = await this.loadScripts();

      // 生成新的ID
      const newId = scripts.length > 0 ? Math.max(...scripts.map(s => s.id)) + 1 : 1;

      const newScript = {
        id: newId,
        name: scriptData.name,
        type: scriptData.type,
        path: scriptData.path,
        description: scriptData.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      scripts.push(newScript);
      await fs.writeFile(this.dataFile, JSON.stringify(scripts, null, 2), 'utf8');

      return { success: true, script: newScript };
    } catch (error) {
      console.error('保存脚本失败:', error);
      return { success: false, error: error.message };
    }
  }

  async updateScript(scriptId, scriptData) {
    try {
      const { scripts } = await this.loadScripts();
      const index = scripts.findIndex(s => s.id === scriptId);

      if (index === -1) {
        return { success: false, error: '脚本不存在' };
      }

      scripts[index] = {
        ...scripts[index],
        name: scriptData.name,
        type: scriptData.type,
        path: scriptData.path,
        description: scriptData.description,
        updatedAt: new Date().toISOString()
      };

      await fs.writeFile(this.dataFile, JSON.stringify(scripts, null, 2), 'utf8');

      return { success: true, script: scripts[index] };
    } catch (error) {
      console.error('更新脚本失败:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteScript(scriptId) {
    try {
      const { scripts } = await this.loadScripts();
      const filteredScripts = scripts.filter(s => s.id !== scriptId);

      if (filteredScripts.length === scripts.length) {
        return { success: false, error: '脚本不存在' };
      }

      await fs.writeFile(this.dataFile, JSON.stringify(filteredScripts, null, 2), 'utf8');

      return { success: true };
    } catch (error) {
      console.error('删除脚本失败:', error);
      return { success: false, error: error.message };
    }
  }

  async getScript(scriptId) {
    try {
      const { scripts } = await this.loadScripts();
      return scripts.find(s => s.id === scriptId);
    } catch (error) {
      console.error('获取脚本失败:', error);
      return null;
    }
  }

  async searchScripts(query) {
    try {
      const { scripts } = await this.loadScripts();
      const lowercaseQuery = query.toLowerCase();

      const filteredScripts = scripts.filter(script =>
        script.name.toLowerCase().includes(lowercaseQuery) ||
        script.type.toLowerCase().includes(lowercaseQuery) ||
        script.description.toLowerCase().includes(lowercaseQuery) ||
        script.path.toLowerCase().includes(lowercaseQuery)
      );

      return { success: true, scripts: filteredScripts };
    } catch (error) {
      console.error('搜索脚本失败:', error);
      return { success: false, error: error.message, scripts: [] };
    }
  }

  async getScriptsByType(type) {
    try {
      const { scripts } = await this.loadScripts();
      const filteredScripts = scripts.filter(script => script.type === type);

      return { success: true, scripts: filteredScripts };
    } catch (error) {
      console.error('按类型获取脚本失败:', error);
      return { success: false, error: error.message, scripts: [] };
    }
  }
}

module.exports = ScriptManager;