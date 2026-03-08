#!/usr/bin/env node
/**
 * Web 统一启动脚本
 * 根据 NODE_ENV 加载对应的环境文件，支持 dev/build/start 所有命令
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// 获取命令参数: dev, build, start
let command = process.argv[2] || "dev";

if (!["dev", "build", "start"].includes(command)) {
  console.error(`[error] 未知的命令: ${command}`);
  console.error("[error] 支持的命令: dev, build, start");
  process.exit(1);
}

// 确定环境 (APP_ENV 用于加载自定义环境文件, NODE_ENV 保持标准值给 Next.js)
// 允许外部覆盖 APP_ENV，用于部署构建场景
const appEnv = process.env.APP_ENV || (command === "dev" ? "development" : "production");

// 如果外部设置了 APP_ENV，使用外部的值（用于部署构建）
if (process.env.APP_ENV) {
  console.log(`[${command}] 使用外部设置的 APP_ENV: ${process.env.APP_ENV}`);
}

// 加载环境文件的优先级（从低到高，后加载的覆盖先加载的）
const rootDir = path.resolve(__dirname, "../../..");
const envFiles = [
  ".env",                   // 默认（最低优先级）
  ".env.local",             // 本地覆盖
  `.env.${appEnv}`,         // 特定环境 (使用 APP_ENV)
  `.env.${appEnv}.local`,   // 最高优先级: 特定环境的本地文件
];

// 加载环境变量
const dotenv = require("dotenv");
const loadedEnvFiles = [];

for (const envFile of envFiles) {
  const envPath = path.resolve(rootDir, envFile);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      loadedEnvFiles.push(envFile);
    }
  }
}

const loadedEnvFile = loadedEnvFiles.length > 0 ? loadedEnvFiles.join(", ") : null;

if (loadedEnvFiles.length > 0) {
  console.log(`[${command}] 已加载环境文件: ${loadedEnvFiles.join(" -> ")}`);
} else {
  console.log(`[${command}] 警告: 未找到环境文件，使用系统环境变量`);
}

// 调试缓存模式
if (process.env.NEXT_PRIVATE_DEBUG_CACHE === "1") {
  console.log(`[${command}] 调试缓存模式已启用 (NEXT_PRIVATE_DEBUG_CACHE=1)`);
  console.log(`[${command}] 调试缓存模式必须用start命令启动，且不支持dev/build命令，已强制改成start命令`);
  command = "start";
  process.env.NODE_ENV = "production";
}

const nodeEnv = process.env.NODE_ENV
console.log(`[${command}] NODE_ENV=${nodeEnv}, APP_ENV=${appEnv}`);
// 读取端口配置
const port = process.env.WEB_PORT || 3010;

// 构建 next 命令参数
const args = [command];

// 端口参数
if (command !== "build") {
  args.push("--port", port);
}

// turbopack 只在 dev 模式下启用
if (command === "dev") {
  args.push("--turbopack");
}

console.log(`[${command}] 执行: npx next ${args.join(" ")}`);
console.log(`[${command}] API_PORT=${process.env.API_PORT}`);

// 启动 Next.js
const child = spawn("npx", ["next", ...args], {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code);
});
