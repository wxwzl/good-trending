/**
 * 环境变量加载模块
 * 被 run.js 和 crawl-30days.js 共用
 */

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

/**
 * 加载环境变量
 * @param {Object} options
 * @param {string} options.command - 命令 (dev/build/start)
 * @param {string} options.customAppEnv - 自定义 APP_ENV
 * @returns {Object} 加载的环境变量信息
 */
function loadEnv(options = {}) {
  const { command = "dev", customAppEnv } = options;

  // 确定环境
  const appEnv =
    customAppEnv || process.env.APP_ENV || (command === "dev" ? "development" : "production");
  const nodeEnv = process.env.NODE_ENV || (command === "dev" ? "development" : "production");

  // 获取项目根目录
  const rootDir = path.resolve(__dirname, "../../..");

  // 加载环境文件的优先级（从低到高）
  const envFiles = [
    ".env", // 默认（最低优先级）
    ".env.local", // 本地覆盖
    `.env.${appEnv}`, // 特定环境
  ];

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

  return {
    rootDir,
    appEnv,
    nodeEnv,
    loadedEnvFiles,
    isLoaded: loadedEnvFiles.length > 0,
  };
}

/**
 * 验证数据库配置
 * @returns {boolean}
 */
function validateDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL 环境变量未设置");
    console.error("   请检查 .env 文件是否正确配置");
    return false;
  }
  return true;
}

/**
 * 打印环境信息
 * @param {Object} envInfo
 */
function printEnvInfo(envInfo) {
  const { appEnv, nodeEnv, loadedEnvFiles } = envInfo;

  if (loadedEnvFiles.length > 0) {
    console.log(`[env] 已加载环境文件: ${loadedEnvFiles.join(" -> ")}`);
  } else {
    console.log("[env] 警告: 未找到环境文件，使用系统环境变量");
  }

  console.log(`[env] NODE_ENV=${nodeEnv}, APP_ENV=${appEnv}`);

  if (process.env.DATABASE_URL) {
    console.log(
      `[env] DATABASE_URL: ${process.env.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, "://***:***@")}`
    );
  }
}

module.exports = {
  loadEnv,
  validateDatabaseConfig,
  printEnvInfo,
};
