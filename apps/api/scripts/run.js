#!/usr/bin/env node
/**
 * API 统一启动脚本
 * 根据 APP_ENV 加载对应的环境文件，支持 dev/build/start 所有命令
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

// 确定环境 (APP_ENV 用于加载自定义环境文件, NODE_ENV 保持标准值)
const appEnv = process.env.APP_ENV || (command === "dev" ? "development" : "production");
const nodeEnv = process.env.NODE_ENV || (command === "dev" ? "development" : "production");

// 加载环境文件的优先级（从高到低）
const rootDir = path.resolve(__dirname, "../../..");
const envFiles = [
  `.env.${appEnv}.local`,   // 最高优先级: 特定环境的本地文件 (使用 APP_ENV)
  ".env.local",             // 本地覆盖
  `.env.${appEnv}`,         // 特定环境 (使用 APP_ENV)
  ".env",                   // 默认
];

// 加载环境变量
const dotenv = require("dotenv");
let loadedEnvFile = null;

for (const envFile of envFiles) {
  const envPath = path.resolve(rootDir, envFile);
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      loadedEnvFile = envFile;
      console.log(`[${command}] 已加载环境文件: ${envFile}`);
      break;
    }
  }
}

if (!loadedEnvFile) {
  console.log(`[${command}] 警告: 未找到环境文件，使用系统环境变量`);
}

console.log(`[${command}] NODE_ENV=${nodeEnv}, APP_ENV=${appEnv}`);

// 读取端口配置
const port = process.env.API_PORT || 3015;

// 构建命令
let args;
if (command === "dev") {
  args = ["nest", "start", "--watch", "--debug", "--port", port];
} else if (command === "build") {
  args = ["nest", "build"];
} else {
  args = ["node", "dist/main"];
}

console.log(`[${command}] 执行: npx ${args.join(" ")}`);

// 启动
const child = spawn("npx", args, {
  stdio: "inherit",
  cwd: path.resolve(__dirname, ".."),
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code);
});
