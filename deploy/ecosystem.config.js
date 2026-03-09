/**
 * PM2 配置文件
 * 用于管理 Good-Trending 所有服务
 *
 * 使用方法:
 * 1. 安装 PM2: npm install -g pm2
 * 2. 启动所有服务: pm2 start ecosystem.config.js
 * 3. 查看状态: pm2 status
 * 4. 查看日志: pm2 logs
 * 5. 重启服务: pm2 restart all
 * 6. 停止服务: pm2 stop all
 * 7. 保存配置: pm2 save
 * 8. 设置开机启动: pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "good-trending-api",
      cwd: "./app/api",
      script: "dist/main.js",
      instances: 2, // 启动 2 个实例，利用多核
      exec_mode: "cluster", // 集群模式
      max_memory_restart: "512M", // 内存超过 512M 自动重启
      env: {
        NODE_ENV: "production",
        APP_ENV: "production",
        API_PORT: 3015,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_log: "./app/api/logs/error.log",
      out_log: "./app/api/logs/app.log",
      merge_logs: true,
      log_type: "json",
      // 自动重启配置
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      // 健康检查
      health_check_grace_period: 30000,
      // 优雅关闭
      kill_timeout: 5000,
      listen_timeout: 10000,
      // 日志切割
      log_rotate_interval: "1d",
      log_max_size: "100M",
    },
    {
      name: "good-trending-web",
      cwd: "./app/web",
      script: "server.js",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        APP_ENV: "production",
        PORT: 3010,
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_log: "./app/web/logs/error.log",
      out_log: "./app/web/logs/app.log",
      merge_logs: true,
      log_type: "json",
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      health_check_grace_period: 30000,
      kill_timeout: 5000,
      listen_timeout: 10000,
      log_rotate_interval: "1d",
      log_max_size: "100M",
    },
    // {
    //   name: "good-trending-scheduler",
    //   cwd: "./app/scheduler",
    //   script: "dist/index.mjs",
    //   instances: 1, // Scheduler 只需要单实例
    //   exec_mode: "fork",
    //   max_memory_restart: "512M",
    //   env: {
    //     NODE_ENV: "production",
    //     APP_ENV: "production",
    //     SCHEDULER_PORT: 3017,
    //   },
    //   log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    //   error_log: "./app/scheduler/logs/error.log",
    //   out_log: "./app/scheduler/logs/app.log",
    //   merge_logs: true,
    //   log_type: "json",
    //   autorestart: true,
    //   min_uptime: "10s",
    //   max_restarts: 10,
    //   kill_timeout: 5000,
    //   listen_timeout: 10000,
    //   log_rotate_interval: "1d",
    //   log_max_size: "100M",
    // },
  ],
};
