#!/usr/bin/env node
/**
 * API 开发服务器启动脚本
 * 从 .env.dev 读取 API_PORT 变量并启动 NestJS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 读取 .env.dev 文件
const envDevPath = path.resolve(__dirname, '../../../.env.dev');
let port = 3015; // 默认端口

if (fs.existsSync(envDevPath)) {
  const envContent = fs.readFileSync(envDevPath, 'utf-8');
  const portMatch = envContent.match(/API_PORT=(\d+)/);
  if (portMatch) {
    port = portMatch[1];
    console.log(`[dev] 从 .env.dev 读取到 API_PORT=${port}`);
  } else {
    console.log(`[dev] .env.dev 中未找到 API_PORT，使用默认端口 ${port}`);
  }
} else {
  console.log(`[dev] 未找到 .env.dev，使用默认端口 ${port}`);
}

// 先加载 .env.dev 环境变量，然后启动 NestJS
const command = `npx dotenv -e ../../.env.dev -- nest start --watch --debug --port ${port}`;

console.log(`[dev] 启动 API 开发服务器: http://localhost:${port}`);

try {
  execSync(command, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
} catch (error) {
  console.error('[dev] 启动失败:', error.message);
  process.exit(1);
}
