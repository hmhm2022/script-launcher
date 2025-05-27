const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class ScriptExecutor {
  constructor() {
    this.launchedProcesses = new Map(); // 跟踪已启动的进程
  }

  // 启动脚本（替代原来的executeScript）
  async launchScript(scriptId, scriptData) {
    try {
      console.log(`准备启动脚本: ${scriptData.name} (${scriptId})`);

      // 验证脚本文件是否存在
      if (!fs.existsSync(scriptData.path)) {
        throw new Error(`脚本文件不存在: ${scriptData.path}`);
      }

      // 根据脚本类型确定启动命令
      const command = this.getScriptCommand(scriptData.type, scriptData.path);

      console.log(`启动命令: ${command.cmd} ${command.args.join(' ')}`);

      // 在Windows上，使用cmd /c start来在新窗口中启动脚本
      let finalCmd, finalArgs;

      if (process.platform === 'win32') {
        // Windows: 在新控制台窗口中启动
        // 使用绝对路径避免相对路径问题
        const absoluteScriptPath = path.resolve(scriptData.path);
        const absoluteCommand = this.getScriptCommand(scriptData.type, absoluteScriptPath);

        finalCmd = 'cmd';
        finalArgs = ['/c', 'start', `"${scriptData.name}"`, '/D', path.dirname(absoluteScriptPath), absoluteCommand.cmd, ...absoluteCommand.args];
      } else if (process.platform === 'darwin') {
        // macOS: 使用 Terminal.app 在新窗口中启动脚本
        const absoluteScriptPath = path.resolve(scriptData.path);
        const absoluteCommand = this.getScriptCommand(scriptData.type, absoluteScriptPath);

        // 构建要在终端中执行的命令
        const terminalCommand = `cd "${path.dirname(absoluteScriptPath)}" && ${absoluteCommand.cmd} ${absoluteCommand.args.join(' ')}`;

        finalCmd = 'osascript';
        finalArgs = ['-e', `tell application "Terminal" to do script "${terminalCommand.replace(/"/g, '\\"')}"`];
      } else {
        // Linux: 尝试使用常见的终端模拟器
        const absoluteScriptPath = path.resolve(scriptData.path);
        const absoluteCommand = this.getScriptCommand(scriptData.type, absoluteScriptPath);

        // 尝试使用 gnome-terminal，如果不存在则直接执行
        finalCmd = 'gnome-terminal';
        finalArgs = ['--', 'bash', '-c', `cd "${path.dirname(absoluteScriptPath)}" && ${absoluteCommand.cmd} ${absoluteCommand.args.join(' ')}; read -p "Press Enter to continue..."`];
      }

      // 确定工作目录 - 统一使用绝对路径
      const workingDir = path.dirname(path.resolve(scriptData.path));

      const childProcess = spawn(finalCmd, finalArgs, {
        detached: true,   // 独立进程
        stdio: 'ignore',  // 不捕获输出
        shell: false,     // 不使用shell（因为我们已经用cmd处理了）
        cwd: workingDir, // 设置工作目录
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',
          PYTHONUNBUFFERED: '1'
        }
      });

      // 分离进程，让它完全独立运行
      childProcess.unref();

      // 记录启动的进程
      this.launchedProcesses.set(scriptId, {
        pid: childProcess.pid,
        name: scriptData.name,
        startTime: new Date(),
        process: childProcess
      });

      // 立即返回启动成功（启动器模式）
      return {
        success: true,
        message: `脚本 "${scriptData.name}" 已在新窗口中启动`,
        pid: childProcess.pid
      };

    } catch (error) {
      console.error(`启动脚本异常:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 获取脚本启动命令
  getScriptCommand(type, scriptPath) {
    const commands = {
      python: {
        // 根据文件扩展名选择合适的Python执行器
        cmd: this.getPythonExecutor(scriptPath),
        args: ['-u', scriptPath]
      },
      javascript: {
        cmd: 'node',
        args: [scriptPath]
      },
      typescript: {
        cmd: 'ts-node',
        args: [scriptPath]
      },
      batch: {
        cmd: 'cmd',
        args: ['/c', scriptPath]
      },
      powershell: {
        cmd: 'powershell',
        args: ['-ExecutionPolicy', 'Bypass', '-File', scriptPath]
      },
      bash: {
        cmd: 'bash',
        args: [scriptPath]
      }
    };

    const command = commands[type];
    if (!command) {
      // 对于未知类型，尝试直接执行
      return {
        cmd: scriptPath,
        args: []
      };
    }

    return command;
  }

  // 根据Python文件扩展名选择合适的执行器
  getPythonExecutor(scriptPath) {
    const ext = path.extname(scriptPath).toLowerCase();

    // 在Windows上，.pyw文件使用pythonw.exe（无控制台窗口）
    if (process.platform === 'win32' && ext === '.pyw') {
      return 'pythonw';
    }

    // 其他情况使用标准python命令
    return 'python';
  }

  // 获取已启动的进程列表
  getLaunchedProcesses() {
    const processes = [];
    for (const [scriptId, processInfo] of this.launchedProcesses) {
      processes.push({
        scriptId,
        pid: processInfo.pid,
        name: processInfo.name,
        startTime: processInfo.startTime
      });
    }
    return processes;
  }

  // 清理已结束的进程记录
  cleanupProcesses() {
    for (const [scriptId, processInfo] of this.launchedProcesses) {
      try {
        // 检查进程是否还在运行
        process.kill(processInfo.pid, 0);
      } catch (error) {
        // 进程已结束，从记录中移除
        this.launchedProcesses.delete(scriptId);
        console.log(`清理已结束的进程记录: ${processInfo.name} (PID: ${processInfo.pid})`);
      }
    }
  }

  // 停止特定脚本（如果需要的话）
  async stopScript(scriptId) {
    const processInfo = this.launchedProcesses.get(scriptId);
    if (!processInfo) {
      return { success: false, error: '进程不存在或已结束' };
    }

    try {
      process.kill(processInfo.pid, 'SIGTERM');
      this.launchedProcesses.delete(scriptId);
      return {
        success: true,
        message: `已停止脚本: ${processInfo.name}`
      };
    } catch (error) {
      return {
        success: false,
        error: `停止脚本失败: ${error.message}`
      };
    }
  }
}

module.exports = ScriptExecutor;