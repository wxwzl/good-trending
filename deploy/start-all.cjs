#!/usr/bin/env node
/**
 * 自动化部署启动脚本
 *
 * 功能：
 * 1. 自动安装 deploy/app 下各应用的依赖
 * 2. 使用 PM2 启动或重启所有应用
 *
 * 用法：
 *   node start-all.cjs [选项]
 *
 * 选项：
 *   --skip-install    跳过依赖安装步骤
 *   --only-install    仅安装依赖，不启动服务
 *   --restart         强制重启（而非重载）服务
 *   --help            显示帮助
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  switch (level) {
    case 'INFO': color = colors.cyan; break;
    case 'SUCCESS': color = colors.green; break;
    case 'WARN': color = colors.yellow; break;
    case 'ERROR': color = colors.red; break;
  }
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    skipInstall: args.includes('--skip-install'),
    onlyInstall: args.includes('--only-install'),
    restart: args.includes('--restart'),
    help: args.includes('--help') || args.includes('-h'),
  };
}

function showHelp() {
  console.log(`
${colors.bright}自动化部署启动脚本${colors.reset}

${colors.yellow}功能:${colors.reset}
  1. 自动安装 deploy/app 下各应用的依赖
  2. 使用 PM2 启动或重启所有应用

${colors.yellow}用法:${colors.reset}
  node start-all.cjs [选项]

${colors.yellow}选项:${colors.reset}
  --skip-install    跳过依赖安装步骤
  --only-install    仅安装依赖，不启动服务
  --restart         强制重启（而非重载）服务
  -h, --help        显示帮助信息

${colors.yellow}示例:${colors.reset}
  # 完整流程：安装依赖 + 启动服务
  node start-all.cjs

  # 仅安装依赖
  node start-all.cjs --only-install

  # 跳过安装，直接启动/重启服务
  node start-all.cjs --skip-install

  # 强制重启所有服务
  node start-all.cjs --restart
`);
}

// 检查 PM2 是否安装
function checkPM2() {
  try {
    execSync('pm2 --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// 安装单个应用的依赖
function installDependencies(appDir, appName) {
  const packageJsonPath = path.join(appDir, 'package.json');

  // 检查是否存在 package.json
  if (!fs.existsSync(packageJsonPath)) {
    log('WARN', `${appName}: 未找到 package.json，跳过安装`);
    return false;
  }

  // 检查是否已经有 node_modules
  const nodeModulesPath = path.join(appDir, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    log('INFO', `${appName}: node_modules 已存在，跳过安装`);
    return true;
  }

  log('INFO', `${appName}: 安装依赖...`);
  try {
    execSync('pnpm install --production', {
      cwd: appDir,
      stdio: 'inherit',
    });
    log('SUCCESS', `${appName}: 依赖安装完成`);
    return true;
  } catch (error) {
    log('ERROR', `${appName}: 依赖安装失败 - ${error.message}`);
    return false;
  }
}

// 检查应用是否已经在 PM2 中运行
function isAppRunning(appName) {
  try {
    // 使用 pm2 jlist 获取 JSON 格式的进程列表
    const result = execSync('pm2 jlist', { encoding: 'utf-8' });
    const apps = JSON.parse(result);
    return apps.some(app => app.name === appName && app.pm2_env.status === 'online');
  } catch (error) {
    return false;
  }
}

// 启动或重启服务
function startOrRestartServices(restart = false) {
  const ecosystemPath = path.join(__dirname, 'ecosystem.config.js');

  if (!fs.existsSync(ecosystemPath)) {
    log('ERROR', '未找到 ecosystem.config.js 文件');
    return false;
  }

  log('INFO', '检查 PM2 服务状态...');

  try {
    // 先检查是否有正在运行的服务
    let hasRunningApps = false;
    try {
      const result = execSync('pm2 jlist', { encoding: 'utf-8' });
      const apps = JSON.parse(result);
      hasRunningApps = apps.some(app =>
        app.name.startsWith('good-trending') &&
        (app.pm2_env.status === 'online' || app.pm2_env.status === 'errored')
      );
    } catch (e) {
      // 如果没有运行中的服务，jlist 可能返回空或报错，忽略错误
      hasRunningApps = false;
    }

    if (hasRunningApps) {
      if (restart) {
        log('INFO', '强制重启所有服务...');
        execSync('pm2 restart ecosystem.config.js', { stdio: 'inherit' });
      } else {
        log('INFO', '重载所有服务...');
        execSync('pm2 reload ecosystem.config.js', { stdio: 'inherit' });
      }
    } else {
      log('INFO', '启动所有服务...');
      execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
    }

    log('SUCCESS', '服务操作完成');

    // 显示状态
    log('INFO', '当前服务状态:');
    execSync('pm2 status', { stdio: 'inherit' });

    return true;
  } catch (error) {
    log('ERROR', `服务启动失败: ${error.message}`);
    return false;
  }
}

// 主函数
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  log('INFO', '=====================================');
  log('INFO', '开始自动化部署');
  log('INFO', '=====================================');

  // 获取 deploy/app 目录
  const appDir = path.join(__dirname, 'app');

  if (!fs.existsSync(appDir)) {
    log('ERROR', `应用目录不存在: ${appDir}`);
    process.exit(1);
  }

  // 获取所有应用
  const apps = fs.readdirSync(appDir).filter(file => {
    const fullPath = path.join(appDir, file);
    return fs.statSync(fullPath).isDirectory();
  });

  log('INFO', `发现 ${apps.length} 个应用: ${apps.join(', ')}`);

  // 步骤 1: 安装依赖
  if (!options.skipInstall) {
    log('INFO', '=====================================');
    log('INFO', '步骤 1: 安装依赖');
    log('INFO', '=====================================');

    let installCount = 0;
    for (const app of apps) {
      const appPath = path.join(appDir, app);
      const success = installDependencies(appPath, app);
      if (success) installCount++;
    }

    log('SUCCESS', `依赖安装完成: ${installCount}/${apps.length}`);
  } else {
    log('INFO', '跳过依赖安装（--skip-install）');
  }

  // 如果只安装依赖，到这里就结束
  if (options.onlyInstall) {
    log('SUCCESS', '=====================================');
    log('SUCCESS', '依赖安装完成，退出');
    log('SUCCESS', '=====================================');
    process.exit(0);
  }

  // 步骤 2: 检查 PM2
  log('INFO', '=====================================');
  log('INFO', '步骤 2: 检查 PM2');
  log('INFO', '=====================================');

  if (!checkPM2()) {
    log('ERROR', 'PM2 未安装，请先安装: npm install -g pm2');
    process.exit(1);
  }
  log('SUCCESS', 'PM2 已安装');

  // 步骤 3: 启动/重启服务
  log('INFO', '=====================================');
  log('INFO', '步骤 3: 启动/重启服务');
  log('INFO', '=====================================');

  const success = startOrRestartServices(options.restart);

  if (success) {
    log('SUCCESS', '=====================================');
    log('SUCCESS', '自动化部署完成！');
    log('SUCCESS', '=====================================');
    log('INFO', '');
    log('INFO', '常用命令:');
    log('INFO', '  pm2 status       - 查看服务状态');
    log('INFO', '  pm2 logs         - 查看日志');
    log('INFO', '  pm2 restart all  - 重启所有服务');
    log('INFO', '  pm2 stop all     - 停止所有服务');
  } else {
    process.exit(1);
  }
}

main().catch(error => {
  log('ERROR', `部署失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
