/**
 * 数据库 push 脚本
 * 先加载环境变量，再执行 drizzle-kit push
 */

import "./loadEnv";
import { execSync } from "child_process";
import path from "path";

const args = process.argv.slice(2);
const drizzleKitPath = path.resolve(__dirname, "../node_modules/.bin/drizzle-kit");

try {
  console.log("🚀 执行 drizzle-kit push...\n");
  execSync(`${drizzleKitPath} push ${args.join(" ")}`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (error) {
  console.error("❌ drizzle-kit push 失败");
  process.exit(1);
}
