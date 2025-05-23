#!/usr/bin/env node
/**
 * 示例JavaScript脚本
 * 演示基本的输出功能和异步操作
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 主函数
async function main() {
    console.log("=".repeat(50));
    console.log("🚀 JavaScript脚本执行示例");
    console.log("=".repeat(50));
    
    // 显示基本信息
    console.log(`📅 当前时间: ${new Date().toLocaleString()}`);
    console.log(`🟨 Node.js版本: ${process.version}`);
    console.log(`💻 操作系统: ${os.type()} ${os.release()}`);
    console.log(`📁 当前目录: ${process.cwd()}`);
    
    // 演示异步操作
    console.log("\n🔄 模拟异步处理过程:");
    for (let i = 1; i <= 5; i++) {
        console.log(`  步骤 ${i}/5: 正在处理...`);
        await delay(300);
    }
    
    // 演示文件系统操作
    console.log("\n📂 检查文件系统:");
    try {
        const currentDir = process.cwd();
        const files = fs.readdirSync(currentDir);
        console.log(`  当前目录包含 ${files.length} 个项目`);
        
        // 显示前几个文件/目录
        const displayFiles = files.slice(0, 3);
        displayFiles.forEach(file => {
            const filePath = path.join(currentDir, file);
            const stats = fs.statSync(filePath);
            const type = stats.isDirectory() ? '📁' : '📄';
            console.log(`  ${type} ${file}`);
        });
        
        if (files.length > 3) {
            console.log(`  ... 还有 ${files.length - 3} 个项目`);
        }
    } catch (error) {
        console.log(`  ❌ 读取目录失败: ${error.message}`);
    }
    
    // 演示环境变量
    console.log("\n🌍 环境信息:");
    console.log(`  用户名: ${os.userInfo().username}`);
    console.log(`  主目录: ${os.homedir()}`);
    console.log(`  CPU架构: ${os.arch()}`);
    
    console.log("\n✅ 处理完成!");
    console.log("📝 这是一个演示JavaScript功能的Node.js脚本");
    console.log("🎉 脚本执行成功!");
    
    return 0;
}

// 错误处理
process.on('uncaughtException', (error) => {
    console.error('\n❌ 未捕获的异常:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ 未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 优雅退出处理
process.on('SIGINT', () => {
    console.log('\n⚠️  脚本被用户中断');
    process.exit(1);
});

// 执行主函数
main()
    .then(exitCode => {
        process.exit(exitCode);
    })
    .catch(error => {
        console.error('\n❌ 脚本执行出错:', error.message);
        process.exit(1);
    });
