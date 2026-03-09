import { config } from "dotenv";
import path, { resolve } from "path";
import fs from "fs";
const appEnv = process.env.APP_ENV || process.env.NODE_ENV || "development";
// 获取当前工作目录（应该是项目根目录）
const rootDir = resolve(__dirname, "../../../");

const envFiles = [
  ".env", // 默认（最低优先级）
  ".env.local", // 本地覆盖
  `.env.${appEnv}`, // 特定环境
];

// 确定要使用的 env 文件
const envFilePath = path.join(rootDir, `.env.${appEnv}`);
// 检查环境文件是否存在
if (!fs.existsSync(envFilePath)) {
  console.error(`❌ 错误: 环境文件不存在: ${envFilePath}`);
  console.error(`   请创建该文件或检查 NODE_ENV 设置`);
  process.exit(1);
}

const loadedEnvFiles: string[] = [];
for (const envFile of envFiles) {
  const result = config({ path: resolve(rootDir, envFile), override: true });
  if (!result.error) {
    loadedEnvFiles.push(envFile);
  }
}

if (loadedEnvFiles.length > 0) {
  console.log(`[api] Loaded environment files: ${loadedEnvFiles.join(" -> ")}`);
} else {
  console.log("[api] Warning: No environment file found, using system environment variables");
}
