#!/usr/bin/env node
/**
 * 环境变量加载模块
 * 根据 APP_ENV 加载对应的环境文件
 *
 * 用法:
 *   const { loadEnv } = require('./loadEnv');
 *   loadEnv({ command: 'dev' }); // 或 'build', 'start'
 */

const fs = require("fs");
const path = require("path");

/**
 * 加载环境变量
 * @param {Object} options - 配置选项
 * @param {string} options.command - 命令类型: 'dev', 'build', 'start'
 * @param {boolean} options.silent - 是否静默输出（默认false）
 * @returns {Object} 加载结果
 */
function loadEnv(options = {}) {
  const { command = "dev", silent = false } = options;

  // 确定环境 (APP_ENV 用于加载自定义环境文件, NODE_ENV 保持标准值)
  const appEnv = process.env.APP_ENV || (command === "dev" ? "development" : "production");
  const nodeEnv = process.env.NODE_ENV || (command === "dev" ? "development" : "production");

  // 加载环境文件的优先级（从低到高，后加载的覆盖先加载的）
  const rootDir = path.resolve(__dirname, "../../..");
  const envFiles = [
    ".env", // 默认（最低优先级）
    ".env.local", // 本地覆盖
    `.env.${appEnv}`, // 特定环境 (使用 APP_ENV)
    `.env.${appEnv}.local`, // 最高优先级: 特定环境的本地文件
  ];

  // 加载环境变量
  const dotenv = require("dotenv");
  const loadedEnvFiles = [];

  for (const envFile of envFiles) {
    const envPath = path.resolve(rootDir, envFile);
    if (fs.existsSync(envPath)) {
      const result = dotenv.config({ path: envPath, override: true });
      if (!result.error) {
        loadedEnvFiles.push(envFile);
      }
    }
  }

  if (!silent) {
    if (loadedEnvFiles.length > 0) {
      console.log(`[${command}] 已加载环境文件: ${loadedEnvFiles.join(" -> ")}`);
    } else {
      console.log(`[${command}] 警告: 未找到环境文件，使用系统环境变量`);
    }
    console.log(`[${command}] NODE_ENV=${nodeEnv}, APP_ENV=${appEnv}`);
  }

  // 标记由脚本启动，避免重复加载环境变量
  process.env.RUN_BY_RUNJS = "true";

  return {
    rootDir,
    appEnv,
    nodeEnv,
    loadedEnvFiles,
  };
}

module.exports = { loadEnv };
