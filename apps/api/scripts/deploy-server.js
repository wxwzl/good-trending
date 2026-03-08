#!/usr/bin/env node
/**
 * API 部署服务器启动脚本
 * 支持日志输出到文件，用于生产环境部署
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

// 获取部署目录
const deployDir = process.env.DEPLOY_DIR || path.resolve(__dirname, "../../../app/api");
const logsDir = process.env.LOGS_DIR || path.join(deployDir, "logs");

// 确保日志目录存在
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 日志文件路径
const logFile = path.join(logsDir, `app-${new Date().toISOString().split("T")[0]}.log`);
const errorLogFile = path.join(logsDir, `error-${new Date().toISOString().split("T")[0]}.log`);

// 创建日志写入流
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const errorStream = fs.createWriteStream(errorLogFile, { flags: "a" });

// 日志格式化函数
function formatLog(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}\n`;
}

// 写入日志的函数
function writeLog(level, message) {
  const formatted = formatLog(level, message);
  logStream.write(formatted);
  if (level === "ERROR" || level === "WARN") {
    errorStream.write(formatted);
  }
}

// 控制台输出并记录日志
function log(level, ...args) {
  const message = args.join(" ");
  console.log(...args);
  writeLog(level, message);
}

// 加载环境变量
const dotenv = require("dotenv");
const envDir = process.env.ENV_DIR || path.resolve(__dirname, "../../../");

const envFiles = [
  ".env", // 默认（最低优先级）
  ".env.local", // 本地覆盖
  `.env.production`, // 生产环境
  `.env.production.local`, // 最高优先级
];

const loadedEnvFiles = [];
for (const envFile of envFiles) {
  const envPath = path.join(envDir, envFile);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath, override: true });
    if (!result.error) {
      loadedEnvFiles.push(envFile);
    }
  }
}

if (loadedEnvFiles.length > 0) {
  log("INFO", `[deploy-server] 已加载环境文件: ${loadedEnvFiles.join(" -> ")}`);
} else {
  log("WARN", `[deploy-server] 警告: 未找到环境文件，使用系统环境变量`);
}

// 设置 NODE_ENV
process.env.NODE_ENV = "production";

// 读取端口配置
const port = process.env.API_PORT || process.env.PORT || 3015;

log("INFO", `[deploy-server] 部署目录: ${deployDir}`);
log("INFO", `[deploy-server] 日志目录: ${logsDir}`);
log("INFO", `[deploy-server] 服务将启动在: http://0.0.0.0:${port}`);

// 切换到部署目录
process.chdir(deployDir);

// 记录启动信息
log("INFO", `[deploy-server] 正在启动 API 服务...`);
log("INFO", `[deploy-server] NODE_ENV=${process.env.NODE_ENV}`);
log("INFO", `[deploy-server] API_PORT=${port}`);
log("INFO", `[deploy-server] DATABASE_URL=${process.env.DATABASE_URL ? "已配置" : "未设置"}`);
log("INFO", `[deploy-server] REDIS_URL=${process.env.REDIS_URL ? "已配置" : "未设置"}`);

// 启动 NestJS 应用
const mainPath = path.join(deployDir, "dist/main.js");

if (!fs.existsSync(mainPath)) {
  log("ERROR", `[deploy-server] 未找到启动文件: ${mainPath}`);
  process.exit(1);
}

// 设置端口环境变量
process.env.API_PORT = port;

try {
  require(mainPath);
  log("INFO", `[deploy-server] API 服务启动成功`);
} catch (error) {
  log("ERROR", `[deploy-server] 启动失败: ${error.message}`);
  log("ERROR", error.stack);
  process.exit(1);
}

// 处理优雅关闭
process.on("SIGINT", () => {
  log("INFO", "[deploy-server] 收到 SIGINT 信号，正在关闭...");
  logStream.end();
  errorStream.end();
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("INFO", "[deploy-server] 收到 SIGTERM 信号，正在关闭...");
  logStream.end();
  errorStream.end();
  process.exit(0);
});

// 处理未捕获的异常
process.on("uncaughtException", (error) => {
  log("ERROR", `[deploy-server] 未捕获的异常: ${error.message}`);
  log("ERROR", error.stack);
  logStream.end();
  errorStream.end();
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  log("ERROR", `[deploy-server] 未处理的 Promise 拒绝: ${reason}`);
  logStream.end();
  errorStream.end();
  process.exit(1);
});
