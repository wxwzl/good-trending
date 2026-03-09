# PostgreSQL 故障排查指南

> 本文档记录 PostgreSQL 服务状态检查、进程管理及常见问题排查方法

---

## 1. 服务状态检查

### 查看主服务状态

```bash
sudo systemctl status postgresql
```

**典型输出解析：**

```
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (/lib/systemd/system/postgresql.service; enabled; vendor preset: enabled)
     Active: active (exited) since Mon 2026-03-09 23:45:33 CST; 19min ago
   Main PID: 20392 (code=exited, status=0/SUCCESS)
```

| 字段 | 说明 |
|------|------|
| `active (exited)` | 主服务脚本已完成启动任务 |
| `Main PID exited` | wrapper 脚本退出，实际进程由子服务管理 |
| `enabled` | 开机自启已启用 |

### 查看具体数据库实例状态

```bash
# PostgreSQL 16 主实例状态
sudo systemctl status postgresql@16-main

# 或查看所有 PostgreSQL 相关服务
sudo systemctl list-units | grep postgres
```

### 快速验证数据库是否可连接

```bash
# 检查数据库就绪状态
sudo -u postgres pg_isready

# 预期输出：
# /var/run/postgresql:5432 - accepting connections
```

---

## 2. 进程检查

### 查看 PostgreSQL 进程

```bash
# 查看所有 postgres 进程
ps aux | grep postgres

# 典型输出应包含：
# postgres  1234  0.0  1.2  123456  7890 ?  Ss  23:45  0:00 /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main -c config_file=/etc/postgresql/16/main/postgresql.conf
# postgres  1235  0.0  0.1  123456  1234 ?  Ss  23:45  0:00 postgres: 16/main: checkpointer
# postgres  1236  0.0  0.1  123456  1234 ?  Ss  23:45  0:00 postgres: 16/main: background writer
# postgres  1237  0.0  0.1  123456  1234 ?  Ss  23:45  0:00 postgres: 16/main: walwriter
# postgres  1238  0.0  0.2  123456  2345 ?  Ss  23:45  0:00 postgres: 16/main: autovacuum launcher
```

### 查看端口监听

```bash
# 查看 5432 端口
sudo ss -tlnp | grep 5432
# 或
sudo netstat -tlnp | grep 5432

# 预期输出：
# LISTEN 0  244  127.0.0.1:5432  0.0.0.0:*  users:("postgres",pid=1234,fd=5)
```

---

## 3. 日志查看

### 查看服务日志

```bash
# 查看主服务日志
sudo journalctl -u postgresql -n 50

# 查看具体实例日志
sudo journalctl -u postgresql@16-main -n 50

# 实时查看日志
sudo journalctl -u postgresql@16-main -f
```

### 查看 PostgreSQL 数据库日志

```bash
# 查看日志目录
ls -la /var/log/postgresql/

# 查看最新日志
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

---

## 4. 常见问题处理

### 问题 1：服务启动失败

```bash
# 检查配置语法
sudo -u postgres pg_ctlcluster 16 main check

# 尝试手动启动查看错误
sudo -u postgres pg_ctlcluster 16 main start

# 查看详细错误日志
sudo journalctl -u postgresql@16-main --no-pager -l
```

### 问题 2：无法连接数据库

```bash
# 检查服务是否运行
sudo systemctl is-active postgresql@16-main

# 检查端口监听
sudo ss -tlnp | grep 5432

# 检查防火墙
sudo ufw status | grep 5432

# 测试本地连接
sudo -u postgres psql -c "SELECT version();"

# 测试网络连接
psql -h localhost -U good_trending -d good_trending -c "SELECT 1;"
```

### 问题 3：权限拒绝

```bash
# 检查数据目录权限
ls -la /var/lib/postgresql/16/main/

# 修复权限（谨慎使用）
sudo chown -R postgres:postgres /var/lib/postgresql/16/main/
sudo chmod 700 /var/lib/postgresql/16/main/
```

---

## 5. 服务管理命令

```bash
# 启动服务
sudo systemctl start postgresql

# 停止服务
sudo systemctl stop postgresql

# 重启服务
sudo systemctl restart postgresql

# 重载配置（不重启）
sudo systemctl reload postgresql

# 启用开机自启
sudo systemctl enable postgresql

# 禁用开机自启
sudo systemctl disable postgresql
```

---

## 6. 检查清单

当数据库出现问题时，按以下顺序检查：

- [ ] 服务状态：`sudo systemctl status postgresql@16-main`
- [ ] 进程存在：`ps aux | grep postgres`
- [ ] 端口监听：`sudo ss -tlnp | grep 5432`
- [ ] 本地连接：`sudo -u postgres pg_isready`
- [ ] 错误日志：`sudo journalctl -u postgresql@16-main -n 50`
- [ ] 磁盘空间：`df -h /var/lib/postgresql/`
- [ ] 内存使用：`free -h`

---

## 7. 相关文档

| 文档 | 用途 |
|------|------|
| `DATABASE-MAINTENANCE.md` | 数据备份、目录管理 |
| `init-database.sh` | 初始化数据库和用户 |

---

_文档位置: `deploy/POSTGRESQL-TROUBLESHOOTING.md`_
