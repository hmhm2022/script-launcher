const fs = require('fs').promises;
const path = require('path');

class FileManager {
  constructor() {
    // 基础支持的脚本类型
    this.baseSupportedExtensions = ['.py', '.js', '.ts', '.sh'];
    // 根据平台设置支持的扩展名
    this.supportedExtensions = this.getSupportedExtensionsForPlatform();
  }

  getSupportedExtensionsForPlatform() {
    const base = [...this.baseSupportedExtensions];

    if (process.platform === 'win32') {
      // Windows 平台添加特有的脚本类型
      return [...base, '.bat', '.cmd', '.ps1'];
    } else if (process.platform === 'darwin') {
      // macOS 平台添加特有的脚本类型
      return [...base, '.command', '.tool'];
    } else {
      // Linux 和其他平台
      return base;
    }
  }

  async validateFile(filePath) {
    try {
      // 检查文件是否存在
      await fs.access(filePath);

      // 获取文件信息
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return { success: false, error: '指定路径不是文件' };
      }

      // 获取文件扩展名和类型
      const ext = path.extname(filePath).toLowerCase();
      const scriptType = this.getScriptTypeByExtension(ext);

      // 获取文件大小
      const fileSize = stats.size;

      // 检查文件是否过大（超过10MB）
      if (fileSize > 10 * 1024 * 1024) {
        return {
          success: false,
          error: '文件过大（超过10MB），可能不是脚本文件'
        };
      }

      return {
        success: true,
        fileInfo: {
          path: filePath,
          name: path.basename(filePath),
          extension: ext,
          scriptType: scriptType,
          size: fileSize,
          lastModified: stats.mtime,
          isSupported: this.supportedExtensions.includes(ext)
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `文件验证失败: ${error.message}`
      };
    }
  }

  getScriptTypeByExtension(extension) {
    const typeMap = {
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.bat': 'batch',
      '.cmd': 'batch',
      '.ps1': 'powershell',
      '.sh': 'bash',
      '.command': 'bash',  // macOS 可执行脚本
      '.tool': 'bash'      // macOS 工具脚本
    };

    return typeMap[extension.toLowerCase()] || 'other';
  }

  async browseDirectory(dirPath) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      const result = await Promise.all(
        items.map(async (item) => {
          const fullPath = path.join(dirPath, item.name);
          const stats = await fs.stat(fullPath);

          return {
            name: item.name,
            path: fullPath,
            isDirectory: item.isDirectory(),
            isFile: item.isFile(),
            size: stats.size,
            lastModified: stats.mtime,
            extension: item.isFile() ? path.extname(item.name).toLowerCase() : null,
            isScriptFile: item.isFile() && this.supportedExtensions.includes(
              path.extname(item.name).toLowerCase()
            )
          };
        })
      );

      // 排序：目录在前，然后按名称排序
      result.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        currentPath: dirPath,
        items: result
      };

    } catch (error) {
      return {
        success: false,
        error: `浏览目录失败: ${error.message}`
      };
    }
  }

  async getRecentFiles(limit = 10) {
    try {
      // 这里可以实现最近使用文件的逻辑
      // 暂时返回空数组，后续可以扩展
      return {
        success: true,
        files: []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchFiles(searchPath, pattern, options = {}) {
    try {
      const {
        recursive = true,
        includeHidden = false,
        fileTypesOnly = this.supportedExtensions
      } = options;

      const results = [];

      await this.searchFilesRecursive(
        searchPath,
        pattern,
        results,
        recursive,
        includeHidden,
        fileTypesOnly
      );

      return {
        success: true,
        files: results
      };

    } catch (error) {
      return {
        success: false,
        error: `搜索文件失败: ${error.message}`
      };
    }
  }

  async searchFilesRecursive(dirPath, pattern, results, recursive, includeHidden, fileTypes) {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        // 跳过隐藏文件（如果不包含隐藏文件）
        if (!includeHidden && item.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, item.name);

        if (item.isFile()) {
          const ext = path.extname(item.name).toLowerCase();

          // 检查文件类型
          if (fileTypes.length > 0 && !fileTypes.includes(ext)) {
            continue;
          }

          // 检查文件名是否匹配模式
          if (item.name.toLowerCase().includes(pattern.toLowerCase())) {
            const stats = await fs.stat(fullPath);
            results.push({
              name: item.name,
              path: fullPath,
              extension: ext,
              scriptType: this.getScriptTypeByExtension(ext),
              size: stats.size,
              lastModified: stats.mtime
            });
          }
        } else if (item.isDirectory() && recursive) {
          // 递归搜索子目录
          await this.searchFilesRecursive(
            fullPath,
            pattern,
            results,
            recursive,
            includeHidden,
            fileTypes
          );
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
      console.warn(`无法访问目录: ${dirPath}, 错误: ${error.message}`);
    }
  }

  async createBackup(filePath) {
    try {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);

      return {
        success: true,
        backupPath: backupPath
      };
    } catch (error) {
      return {
        success: false,
        error: `创建备份失败: ${error.message}`
      };
    }
  }

  normalizePath(inputPath) {
    // 标准化路径，处理相对路径和绝对路径
    if (path.isAbsolute(inputPath)) {
      return inputPath;
    }

    return path.resolve(process.cwd(), inputPath);
  }

  isValidScriptFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.supportedExtensions.includes(ext);
  }

  getSupportedExtensions() {
    return [...this.supportedExtensions];
  }
}

module.exports = FileManager;