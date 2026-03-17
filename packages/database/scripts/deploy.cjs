#!/usr/bin/env node
/**
 * Database 部署脚本
 * 将迁移文件部署到项目根目录下的 deploy/app/database 目录
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  switch (level) {
    case "INFO":
      color = colors.cyan;
      break;
    case "SUCCESS":
      color = colors.green;
      break;
    case "WARN":
      color = colors.yellow;
      break;
    case "ERROR":
      color = colors.red;
      break;
  }
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`);
}

// 路径配置
const databaseDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(__dirname, "../../..");
const deployDir = path.join(rootDir, "deploy");
const deployDatabaseDir = path.join(deployDir, "app", "database");

// 确保目录存在
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log("INFO", `创建目录: ${dir}`);
  }
}

// 清空目录
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
    log("INFO", `清空目录: ${dir}`);
  }
}

// 复制文件或目录
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    const files = fs.readdirSync(src);
    for (const file of files) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 主函数
async function main() {
  log("INFO", "=====================================");
  log("INFO", "开始 Database 部署构建");
  log("INFO", "=====================================");

  // 1. 检查环境
  log("INFO", "检查环境...");
  if (!fs.existsSync(path.join(rootDir, "package.json"))) {
    log("ERROR", "未找到 package.json，请确保在项目根目录运行");
    process.exit(1);
  }

  // 2. 创建部署目录
  log("INFO", "创建部署目录...");
  ensureDir(deployDir);
  ensureDir(deployDatabaseDir);

  // 3. 清空旧的部署文件
  log("INFO", "清理旧的部署文件...");
  cleanDir(deployDatabaseDir);
  ensureDir(deployDatabaseDir);

  // 4. 复制迁移脚本
  log("INFO", "复制迁移脚本...");
  const migrateScriptSrc = path.join(databaseDir, "scripts", "migrate.cjs");
  if (fs.existsSync(migrateScriptSrc)) {
    fs.copyFileSync(migrateScriptSrc, path.join(deployDatabaseDir, "migrate.cjs"));
    log("INFO", "复制: migrate.cjs");
  } else {
    log("ERROR", "未找到 migrate.cjs");
    process.exit(1);
  }

  // 5. 复制 drizzle 配置
  log("INFO", "复制 Drizzle 配置...");
  const drizzleConfigSrc = path.join(databaseDir, "drizzle.config.ts");
  if (fs.existsSync(drizzleConfigSrc)) {
    fs.copyFileSync(drizzleConfigSrc, path.join(deployDatabaseDir, "drizzle.config.ts"));
    log("INFO", "复制: drizzle.config.ts");
  }

  // 6. 复制 migrations 目录
  log("INFO", "复制 migrations 目录...");
  const migrationsSrc = path.join(databaseDir, "migrations");
  const migrationsDest = path.join(deployDatabaseDir, "migrations");
  if (fs.existsSync(migrationsSrc)) {
    copyRecursive(migrationsSrc, migrationsDest);
    const migrationFiles = fs.readdirSync(migrationsDest).filter(f => f.endsWith('.sql'));
    log("INFO", `复制了 ${migrationFiles.length} 个迁移文件`);
  } else {
    log("WARN", "未找到 migrations 目录");
  }

  // 7. 复制 scripts 目录（排除 deploy.cjs 本身避免递归）
  log("INFO", "复制 scripts 目录...");
  const scriptsSrc = path.join(databaseDir, "scripts");
  const scriptsDest = path.join(deployDatabaseDir, "scripts");
  if (fs.existsSync(scriptsSrc)) {
    ensureDir(scriptsDest);
    const scriptFiles = fs.readdirSync(scriptsSrc);
    let copiedCount = 0;
    for (const file of scriptFiles) {
      // 跳过 deploy.cjs 避免递归复制自身
      if (file === "deploy.cjs") continue;
      const srcPath = path.join(scriptsSrc, file);
      const destPath = path.join(scriptsDest, file);
      copyRecursive(srcPath, destPath);
      copiedCount++;
    }
    log("INFO", `复制了 ${copiedCount} 个脚本文件`);
  } else {
    log("WARN", "未找到 scripts 目录");
  }

  // 8. 复制 category 目录
  log("INFO", "复制 category 目录...");
  const categorySrc = path.join(databaseDir, "category");
  const categoryDest = path.join(deployDatabaseDir, "category");
  if (fs.existsSync(categorySrc)) {
    copyRecursive(categorySrc, categoryDest);
    const categoryFiles = fs.readdirSync(categoryDest);
    log("INFO", `复制了 ${categoryFiles.length} 个分类文件`);
  } else {
    log("WARN", "未找到 category 目录");
  }

  // 9. 读取原始 package.json 获取版本信息
  const originalPackageJson = JSON.parse(
    fs.readFileSync(path.join(databaseDir, "package.json"), "utf-8")
  );

  // 8. 创建部署 package.json
  log("INFO", "创建部署 package.json...");
  const deployPackageJson = {
    name: "@good-trending/database-deploy",
    version: originalPackageJson.version,
    private: true,
    type: "commonjs",
    scripts: {
      migrate: "node migrate.cjs",
    },
    dependencies: {
      "drizzle-kit": originalPackageJson.devDependencies?.["drizzle-kit"] || "^0.31.4",
      dotenv: "^16.4.5",
      pg: "^8.14.1",
    },
  };
  fs.writeFileSync(
    path.join(deployDatabaseDir, "package.json"),
    JSON.stringify(deployPackageJson, null, 2)
  );

  // 9. 创建部署说明
  log("INFO", "创建部署说明...");
  const readmeContent = `# Database 部署包

## 目录结构

\`\`\`
deploy/app/database/
├── migrate.cjs        # 数据库迁移脚本
├── drizzle.config.ts  # Drizzle 配置
├── migrations/        # SQL 迁移文件目录
├── scripts/           # 数据库脚本工具
├── category/          # 分类数据文件
├── package.json       # 部署配置
└── README.md          # 本文件
\`\`\`

## 使用方法

### 执行数据库迁移

\`\`\`bash
cd deploy/app/database
pnpm install
pnpm migrate
\`\`\`

迁移脚本会根据 \`APP_ENV\` 环境变量自动选择对应的配置文件：
- \`APP_ENV=development\` → 使用 \`.env.development\`
- \`APP_ENV=production\` → 使用 \`.env.production\`
- \`APP_ENV=test\` → 使用 \`.env.test\`

### 环境变量要求

必需的环境变量（在 deploy/ 目录的 .env 文件中配置）：
- \`DATABASE_URL\`: PostgreSQL 数据库连接字符串

## 注意事项

1. 迁移脚本会自动加载 deploy/ 目录下的环境变量文件
2. 确保数据库服务已启动并可访问
3. 建议在生产环境迁移前备份数据库
`;
  fs.writeFileSync(path.join(deployDatabaseDir, "README.md"), readmeContent);

  // 10. 创建 .gitignore
  const gitignoreContent = `# 本地环境文件
.env.local
.env.production.local

# Node modules
node_modules/

# 临时文件
*.tmp
*.temp
`;
  fs.writeFileSync(path.join(deployDatabaseDir, ".gitignore"), gitignoreContent);

  // 11. 验证部署包
  log("INFO", "验证部署包...");
  const requiredFiles = ["migrate.cjs", "drizzle.config.ts", "migrations", "package.json"];
  for (const file of requiredFiles) {
    const filePath = path.join(deployDatabaseDir, file);
    if (!fs.existsSync(filePath)) {
      log("ERROR", `部署包缺少必需文件: ${file}`);
      process.exit(1);
    }
  }

  // 验证额外目录
  const additionalDirs = ["scripts", "category"];
  for (const dir of additionalDirs) {
    const dirPath = path.join(deployDatabaseDir, dir);
    if (!fs.existsSync(dirPath)) {
      log("WARN", `部署包缺少可选目录: ${dir}`);
    } else {
      const fileCount = fs.readdirSync(dirPath).length;
      log("INFO", `验证目录 ${dir}: ${fileCount} 个文件`);
    }
  }

  // 12. 计算部署包大小
  log("INFO", "计算部署包大小...");
  try {
    const getFolderSize = (dirPath) => {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          totalSize += getFolderSize(filePath);
        } else {
          totalSize += stat.size;
        }
      }
      return totalSize;
    };

    const sizeInBytes = getFolderSize(deployDatabaseDir);
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
    log("INFO", `部署包大小: ${sizeInMB} MB (${sizeInBytes} bytes)`);
  } catch (e) {
    log("WARN", `无法计算部署包大小: ${e.message}`);
  }

  log("SUCCESS", "=====================================");
  log("SUCCESS", "Database 部署构建完成！");
  log("SUCCESS", "=====================================");
  log("INFO", `部署目录: ${deployDatabaseDir}`);
  log("INFO", "");
  log("INFO", "使用方式:");
  log("INFO", `  cd ${deployDatabaseDir}`);
  log("INFO", "  pnpm install");
  log("INFO", "  pnpm migrate");
  log("INFO", "");
  log("INFO", "注意: 确保 deploy/ 目录下有正确的 .env 配置文件");
}

main().catch((error) => {
  log("ERROR", `部署构建失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
