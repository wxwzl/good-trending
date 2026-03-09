# PostgreSQL 数据库维护指南

> 本文档记录 Good-Trending 项目 PostgreSQL 数据库的维护相关信息

---

## 1. 数据目录位置

### 默认数据目录

```
/var/lib/postgresql/16/main/
```

### 子目录说明

| 目录/文件 | 说明 |
|-----------|------|
| `/var/lib/postgresql/16/main/base/` | 数据库数据文件 |
| `/var/lib/postgresql/16/main/global/` | 全局数据（如用户、权限） |
| `/etc/postgresql/16/main/` | 配置文件目录 |
| `/var/log/postgresql/` | 日志文件目录 |

### 查看当前数据目录

```bash
sudo -u postgres psql -c "SHOW data_directory;"
```

---

## 2. 常用查询命令

### 查看数据库大小

```bash
# 查看指定数据库大小
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('good_trending'));"

# 查看所有数据库大小
sudo -u postgres psql -c "\l+"
```

### 查看表大小

```bash
sudo -u postgres psql -d good_trending -c "
SELECT schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname='public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### 查看连接信息

```bash
# 查看当前连接
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# 查看最大连接数
sudo -u postgres psql -c "SHOW max_connections;"
```

---

## 3. 备份与恢复

### 备份数据目录（物理备份）

```bash
# 停止 PostgreSQL
sudo systemctl stop postgresql

# 打包数据目录
sudo tar -czvf /backup/postgres-backup-$(date +%Y%m%d).tar.gz /var/lib/postgresql/16/main/

# 启动 PostgreSQL
sudo systemctl start postgresql
```

### 逻辑备份（pg_dump）

```bash
# 备份单个数据库
sudo -u postgres pg_dump good_trending > /backup/good_trending-$(date +%Y%m%d).sql

# 备份为压缩格式
sudo -u postgres pg_dump -Fc good_trending > /backup/good_trending-$(date +%Y%m%d).dump

# 只备份结构（不含数据）
sudo -u postgres pg_dump --schema-only good_trending > /backup/good_trending-schema.sql
```

### 恢复数据库

```bash
# 从 SQL 文件恢复
sudo -u postgres psql good_trending < /backup/good_trending-20260310.sql

# 从压缩格式恢复
sudo -u postgres pg_restore -d good_trending /backup/good_trending-20260310.dump
```

---

## 4. 修改数据目录位置

如需将数据目录迁移到大容量磁盘：

### 步骤 1：停止 PostgreSQL

```bash
sudo systemctl stop postgresql
```

### 步骤 2：复制数据到新位置

```bash
# 创建新目录（假设新磁盘挂载在 /data）
sudo mkdir -p /data/postgresql/16/main
sudo chown -R postgres:postgres /data/postgresql

# 复制数据（保留权限）
sudo rsync -av /var/lib/postgresql/16/main/ /data/postgresql/16/main/
```

### 步骤 3：修改配置

```bash
# 编辑配置文件
sudo nano /etc/postgresql/16/main/postgresql.conf

# 修改 data_directory 配置
data_directory = '/data/postgresql/16/main'
```

### 步骤 4：启动服务

```bash
sudo systemctl start postgresql

# 验证
sudo -u postgres psql -c "SHOW data_directory;"
```

---

## 5. 常见问题

### 清理 WAL 日志

```bash
# 查看 WAL 目录大小
du -sh /var/lib/postgresql/16/main/pg_wal/

# 手动触发 checkpoint（可释放部分 WAL）
sudo -u postgres psql -c "CHECKPOINT;"
```

### 重启 PostgreSQL

```bash
sudo systemctl restart postgresql
```

### 查看服务状态

```bash
sudo systemctl status postgresql
```

---

## 6. 相关脚本

| 脚本 | 用途 |
|------|------|
| `init-database.sh` | 初始化数据库和用户 |
| `install-ubuntu-remaining.sh` | 安装 PostgreSQL 服务 |

---

_文档位置: `deploy/DATABASE-MAINTENANCE.md`_
