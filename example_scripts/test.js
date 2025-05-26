/**
 * 测试脚本 - 用于验证脚本管理器的执行功能
 */

function main() {
    console.log("=".repeat(50));
    console.log("测试脚本执行");
    console.log("=".repeat(50));
    console.log(`当前时间: ${new Date()}`);
    console.log(`Node.js版本: ${process.version}`);
    console.log(`当前工作目录: ${process.cwd()}`);
    console.log(`脚本路径: ${__filename}`);
    console.log("=".repeat(50));
    console.log("测试成功!");
    console.log("=".repeat(50));
    
    // 添加无限循环
    setTimeout(main, 1000); // 每秒执行一次
}

main();
