#!/usr/bin/env node
/**
 * Web 开发服务器启动脚本
 * 从 .env.dev 读取 PORT 变量并启动 Next.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 读取 .env.dev 文件
const envDevPath = path.resolve(__dirname, "../../../.env.dev");
let port = 3010; // 默认端口

if (fs.existsSync(envDevPath)) {
  const envContent = fs.readFileSync(envDevPath, "utf-8");
  const portMatch = envContent.match(/WEB_PORT=(\d+)/);
  if (portMatch) {
    port = portMatch[1];
    console.log(`[dev] 从 .env.dev 读取到 WEB_PORT=${port}`);
  } else {
    console.log(`[dev] .env.dev 中未找到 WEB_PORT，使用默认端口 ${port}`);
  }
} else {
  console.log(`[dev] 未找到 .env.dev，使用默认端口 ${port}`);
}

// 先加载 .env.dev 环境变量，然后启动 Next.js
const command = `npx dotenv -e ../../.env.dev -- next dev --turbopack --port ${port}`;

console.log(`[dev] 启动 Web 开发服务器: http://localhost:${port}`);

try {
  execSync(command, {
    stdio: "inherit",
    cwd: path.resolve(__dirname, ".."),
  });
} catch (error) {
  console.error("[dev] 启动失败:", error.message);
  process.exit(1);
}
