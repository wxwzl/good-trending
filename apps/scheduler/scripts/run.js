#!/usr/bin/env node
/**
 * Scheduler 统一启动脚本
 * 根据 APP_ENV 加载对应的环境文件，支持 dev/build/start 所有命令
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const path = require("path");
const { loadEnv } = require("./loadEnv");

// 获取命令参数: dev, build, start
let command = process.argv[2] || "dev";

if (!["dev", "build", "start"].includes(command)) {
  console.error(`[error] 未知的命令: ${command}`);
  console.error("[error] 支持的命令: dev, build, start");
  process.exit(1);
}

// 加载环境变量
const { rootDir } = loadEnv({ command });

// 构建命令
let args;
if (command === "dev") {
  args = ["tsx", "watch", "src/index.ts"];
} else if (command === "build") {
  args = ["tsup"];
} else {
  args = ["node", "dist/index.js"];
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
