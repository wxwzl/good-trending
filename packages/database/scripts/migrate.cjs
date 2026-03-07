#!/usr/bin/env node

/**
 * 数据库迁移脚本
 *
 * 根据 NODE_ENV 环境变量自动选择对应的 .env 文件执行迁移
 *
 * 用法:
 *   cross-env NODE_ENV=development node scripts/migrate.cjs
 *   cross-env NODE_ENV=test node scripts/migrate.cjs
 *   cross-env NODE_ENV=production node scripts/migrate.cjs
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 使用 dotenv 加载环境文件
require("dotenv").config();

// 获取 NODE_ENV，默认为 development
const nodeEnv = process.env.APP_ENV || "development";

// 定义环境文件映射
const envFiles = {
  development: ".env.development",
  test: ".env.test",
  production: ".env.production",
};

// 获取当前工作目录（应该是项目根目录）
const rootDir = path.resolve(__dirname, "../../..");
const databaseDir = path.resolve(__dirname, "..");

// 确定要使用的 env 文件
const envFileName = envFiles[nodeEnv] || ".env";
const envFilePath = path.join(rootDir, envFileName);

console.log(`🚀 数据库迁移脚本`);
console.log(`   环境: ${nodeEnv}`);
console.log(`   配置文件: ${envFilePath}`);

// 检查环境文件是否存在
if (!fs.existsSync(envFilePath)) {
  console.error(`❌ 错误: 环境文件不存在: ${envFilePath}`);
  console.error(`   请创建该文件或检查 NODE_ENV 设置`);
  process.exit(1);
}

// 使用 dotenv 加载指定的环境文件（覆盖已存在的环境变量）
const dotenv = require("dotenv");
const result = dotenv.config({
  path: envFilePath,
  override: true,
});

if (result.error) {
  console.error(`❌ 错误: 无法加载环境文件: ${result.error.message}`);
  process.exit(1);
}

// 验证必需的 DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(`❌ 错误: DATABASE_URL 未设置`);
  console.error(`   请在 ${envFileName} 中配置 DATABASE_URL`);
  process.exit(1);
}

// 隐藏敏感信息用于显示
const displayUrl = databaseUrl.replace(/:[^:@]+@/, ":****@");
console.log(`   数据库: ${displayUrl}`);
console.log("");

// 执行 drizzle-kit migrate
try {
  console.log("📦 开始执行数据库迁移...\n");

  execSync("npx drizzle-kit migrate", {
    cwd: databaseDir,
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n✅ 数据库迁移完成!");
} catch (error) {
  console.error("\n❌ 数据库迁移失败");
  console.error(`   退出码: ${error.status}`);
  process.exit(error.status || 1);
}
