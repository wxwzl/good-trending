#!/usr/bin/env node
/**
 * 部署脚本 - 替代 deploy.sh
 *
 * 用法:
 *   node deploy/scripts/deploy.cjs [命令] [选项]
 *
 * 命令:
 *   pack    - 仅打包，生成压缩包
 *   upload  - 仅上传已有压缩包
 *   deploy  - 打包并上传（默认）
 *
 * 选项:
 *   -h, --host <host>       - 服务器地址
 *   -u, --user <user>       - 服务器用户名
 *   -p, --password <pass>   - 服务器密码
 *   -k, --key <path>        - SSH 私钥路径
 *   -P, --port <port>       - SSH 端口（默认 22）
 *   -r, --remote <path>     - 远程目录（默认 /workspace）
 *   -l, --local <path>      - 本地压缩包路径
 *   -o, --output <name>     - 输出文件名
 *   --keep                  - 打包后不清理 deploy/app 和 deploy/packages
 *
 * 示例:
 *   node deploy/scripts/deploy.cjs pack
 *   node deploy/scripts/deploy.cjs upload -h 192.168.1.100 -u root -p password
 *   node deploy/scripts/deploy.cjs deploy -h 192.168.1.100 -u root -p password
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
    case 'DEBUG': color = colors.gray; break;
  }
  console.log(`${color}[${timestamp}] [${level}] ${message}${colors.reset}`);
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    command: 'deploy', // 默认命令
    host: process.env.DEPLOY_HOST || '',
    user: process.env.DEPLOY_USER || '',
    password: process.env.DEPLOY_PASSWORD || '',
    key: process.env.DEPLOY_KEY || '',
    port: parseInt(process.env.DEPLOY_PORT || '22', 10),
    remotePath: process.env.DEPLOY_REMOTE_PATH || '/workspace',
    localPath: '',
    output: '',
    keep: false,
  };

  // 第一个参数可能是命令
  if (args.length > 0 && !args[0].startsWith('-')) {
    const cmd = args[0].toLowerCase();
    if (['pack', 'upload', 'deploy'].includes(cmd)) {
      options.command = cmd;
      args.shift();
    }
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-h':
      case '--host':
        options.host = args[++i];
        break;
      case '-u':
      case '--user':
        options.user = args[++i];
        break;
      case '-p':
      case '--password':
        options.password = args[++i];
        break;
      case '-k':
      case '--key':
        options.key = args[++i];
        break;
      case '-P':
      case '--port':
        options.port = parseInt(args[++i], 10);
        break;
      case '-r':
      case '--remote':
        options.remotePath = args[++i];
        break;
      case '-l':
      case '--local':
        options.localPath = args[++i];
        break;
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '--keep':
        options.keep = true;
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${colors.bright}部署脚本${colors.reset}

${colors.yellow}用法:${colors.reset}
  node deploy/scripts/deploy.cjs [命令] [选项]

${colors.yellow}命令:${colors.reset}
  pack    - 仅打包，生成压缩包
  upload  - 仅上传已有压缩包
  deploy  - 打包并上传（默认）

${colors.yellow}选项:${colors.reset}
  -h, --host <host>       服务器地址
  -u, --user <user>       服务器用户名
  -p, --password <pass>   服务器密码
  -k, --key <path>        SSH 私钥路径
  -P, --port <port>       SSH 端口（默认 22）
  -r, --remote <path>     远程目录（默认 /workspace）
  -l, --local <path>      本地压缩包路径（upload 命令使用）
  -o, --output <name>     输出文件名
  --keep                  打包后不清理 deploy/app 和 deploy/packages
  --help                  显示帮助信息

${colors.yellow}示例:${colors.reset}
  # 仅打包
  node deploy/scripts/deploy.cjs pack

  # 打包并上传
  node deploy/scripts/deploy.cjs deploy -h 192.168.1.100 -u root -p password

  # 使用密钥上传
  node deploy/scripts/deploy.cjs deploy -h 192.168.1.100 -u root -k ~/.ssh/id_rsa

  # 仅上传已有压缩包
  node deploy/scripts/deploy.cjs upload -h 192.168.1.100 -u root -p password -l ./deploy-20240317.tar.gz

${colors.yellow}环境变量:${colors.reset}
  DEPLOY_HOST       - 服务器地址
  DEPLOY_USER       - 服务器用户名
  DEPLOY_PASSWORD   - 服务器密码
  DEPLOY_KEY        - SSH 私钥路径
  DEPLOY_PORT       - SSH 端口
  DEPLOY_REMOTE_PATH - 远程目录
`);
}

// 检查依赖是否安装
async function checkDependencies() {
  const dependencies = ['tar', 'ssh2-sftp-client'];
  const missing = [];

  for (const dep of dependencies) {
    try {
      require.resolve(dep, { paths: [path.join(__dirname, '..')] });
    } catch (e) {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    log('ERROR', `缺少依赖包: ${missing.join(', ')}`);
    log('INFO', '请安装依赖: npm install tar ssh2-sftp-client');
    process.exit(1);
  }
}

// 生成压缩包文件名
function generateArchiveName() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
  return `deploy-${dateStr}-${timeStr}.tar.gz`;
}

// 打包函数
async function pack(options) {
  log('INFO', '=====================================');
  log('INFO', '开始打包部署文件');
  log('INFO', '=====================================');

  const rootDir = path.resolve(__dirname,'..');
  const deployDir = path.join(rootDir, 'deploy');
  const outputDir = path.join(rootDir, 'dist');

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const archiveName = options.output || generateArchiveName();
  const archivePath = path.join(outputDir, archiveName);

  // 检查 deploy 目录内容
  if (!fs.existsSync(deployDir)) {
    log('ERROR', `Deploy 目录不存在: ${deployDir}`);
    process.exit(1);
  }

  const deployContents = fs.readdirSync(deployDir);
  log('INFO', `Deploy 目录内容: ${deployContents.join(', ')}`);

  // 使用 tar 包创建压缩包
  log('INFO', `创建压缩包: ${archiveName}`);

  try {
    const tar = require('tar');

    await tar.create(
      {
        gzip: true,
        file: archivePath,
        cwd: deployDir,
      },
      ['.']
    );

    const stats = fs.statSync(archivePath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    log('SUCCESS', `压缩包创建成功: ${archivePath}`);
    log('INFO', `文件大小: ${sizeInMB} MB (${stats.size} bytes)`);

    // 清理 deploy 目录（除非指定 --keep）
    if (!options.keep) {
      log('INFO', '清理 deploy 目录...');
      const dirsToClean = ['app', 'packages'];
      for (const dir of dirsToClean) {
        const dirPath = path.join(deployDir, dir);
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
          log('INFO', `已删除: ${dirPath}`);
        }
      }
    } else {
      log('INFO', '跳过清理（--keep 模式）');
    }

    return archivePath;
  } catch (error) {
    log('ERROR', `创建压缩包失败: ${error.message}`);
    throw error;
  }
}

// 上传函数
async function upload(options, archivePath) {
  log('INFO', '=====================================');
  log('INFO', '开始上传部署包');
  log('INFO', '=====================================');

  // 验证参数
  if (!options.host) {
    log('ERROR', '缺少服务器地址，请使用 -h 或 --host 指定');
    process.exit(1);
  }
  if (!options.user) {
    log('ERROR', '缺少用户名，请使用 -u 或 --user 指定');
    process.exit(1);
  }
  if (!options.password && !options.key) {
    log('ERROR', '缺少认证信息，请使用 -p/--password 或 -k/--key 指定');
    process.exit(1);
  }

  // 确定要上传的文件
  const localFile = archivePath || options.localPath;
  if (!localFile) {
    log('ERROR', '未指定要上传的压缩包，请先打包或使用 -l 指定');
    process.exit(1);
  }

  if (!fs.existsSync(localFile)) {
    log('ERROR', `压缩包不存在: ${localFile}`);
    process.exit(1);
  }

  const Client = require('ssh2-sftp-client');
  const sftp = new Client();

  try {
    // 构建连接配置
    const connectConfig = {
      host: options.host,
      port: options.port,
      username: options.user,
    };

    if (options.key) {
      // 使用密钥认证
      if (!fs.existsSync(options.key)) {
        log('ERROR', `私钥文件不存在: ${options.key}`);
        process.exit(1);
      }
      connectConfig.privateKey = fs.readFileSync(options.key);
      log('INFO', `使用密钥认证: ${options.key}`);
    } else {
      // 使用密码认证
      connectConfig.password = options.password;
      log('INFO', '使用密码认证');
    }

    // 连接服务器
    log('INFO', `连接到服务器: ${options.host}:${options.port}`);
    await sftp.connect(connectConfig);
    log('SUCCESS', '连接成功');

    // 确保远程目录存在
    const remoteDir = options.remotePath;
    log('INFO', `检查远程目录: ${remoteDir}`);

    try {
      await sftp.mkdir(remoteDir, true);
    } catch (err) {
      // 目录可能已存在，忽略错误
    }

    // 上传文件
    const fileName = path.basename(localFile);
    const remoteFile = path.posix.join(remoteDir, fileName);

    log('INFO', `上传文件: ${localFile} -> ${remoteFile}`);

    await sftp.put(localFile, remoteFile);

    // 验证上传
    const remoteStats = await sftp.stat(remoteFile);
    const remoteSizeInMB = (remoteStats.size / 1024 / 1024).toFixed(2);

    log('SUCCESS', `上传成功！`);
    log('INFO', `远程文件: ${remoteFile}`);
    log('INFO', `文件大小: ${remoteSizeInMB} MB (${remoteStats.size} bytes)`);

    // 关闭连接
    await sftp.end();
    log('SUCCESS', '连接已关闭');

  } catch (error) {
    log('ERROR', `上传失败: ${error.message}`);
    try {
      await sftp.end();
    } catch (e) {
      // 忽略关闭错误
    }
    throw error;
  }
}

// 主函数
async function main() {
  const options = parseArgs();

  log('INFO', `执行命令: ${options.command}`);

  // 根据命令执行操作
  try {
    if (options.command === 'pack') {
      await checkDependencies();
      await pack(options);
    } else if (options.command === 'upload') {
      await checkDependencies();
      await upload(options);
    } else if (options.command === 'deploy') {
      await checkDependencies();
      const archivePath = await pack(options);
      await upload(options, archivePath);
    }

    log('SUCCESS', '=====================================');
    log('SUCCESS', '部署完成！');
    log('SUCCESS', '=====================================');
  } catch (error) {
    log('ERROR', `部署失败: ${error.message}`);
    process.exit(1);
  }
}

main();
