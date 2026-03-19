-- ============================================
-- 商品社交统计表按月分区迁移
-- ============================================

-- 1. 重命名原表为备份
ALTER TABLE product_social_stat RENAME TO product_social_stat_backup;

-- 2. 创建分区表（范围分区，按月）
CREATE TABLE product_social_stat (
    id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    stat_date DATE NOT NULL,
    today_reddit_count INTEGER DEFAULT 0 NOT NULL,
    today_x_count INTEGER DEFAULT 0 NOT NULL,
    yesterday_reddit_count INTEGER DEFAULT 0 NOT NULL,
    yesterday_x_count INTEGER DEFAULT 0 NOT NULL,
    this_week_reddit_count INTEGER DEFAULT 0 NOT NULL,
    this_week_x_count INTEGER DEFAULT 0 NOT NULL,
    this_month_reddit_count INTEGER DEFAULT 0 NOT NULL,
    this_month_x_count INTEGER DEFAULT 0 NOT NULL,
    last_7_days_reddit_count INTEGER DEFAULT 0 NOT NULL,
    last_7_days_x_count INTEGER DEFAULT 0 NOT NULL,
    last_15_days_reddit_count INTEGER DEFAULT 0 NOT NULL,
    last_15_days_x_count INTEGER DEFAULT 0 NOT NULL,
    last_30_days_reddit_count INTEGER DEFAULT 0 NOT NULL,
    last_30_days_x_count INTEGER DEFAULT 0 NOT NULL,
    last_60_days_reddit_count INTEGER DEFAULT 0 NOT NULL,
    last_60_days_x_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, stat_date)
) PARTITION BY RANGE (stat_date);

-- 3. 创建唯一索引（分区键必须包含在唯一索引中）
CREATE UNIQUE INDEX social_stat_product_date_idx ON product_social_stat (product_id, stat_date);
CREATE INDEX social_stat_date_idx ON product_social_stat (stat_date);

-- 4. 创建外键（需要在分区表上单独创建）
-- 注意：分区表的外键需要引用其他表的主键

-- 5. 创建初始分区（最近3个月 + 未来1个月）
-- 2026年分区
CREATE TABLE product_social_stat_2026_01 PARTITION OF product_social_stat
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE product_social_stat_2026_02 PARTITION OF product_social_stat
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE product_social_stat_2026_03 PARTITION OF product_social_stat
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE product_social_stat_2026_04 PARTITION OF product_social_stat
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

-- 6. 创建自动分区管理函数
CREATE OR REPLACE FUNCTION create_monthly_partition(
    p_table_name TEXT,
    p_year INT,
    p_month INT
) RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := p_table_name || '_' || p_year || '_' || LPAD(p_month::TEXT, 2, '0');
    start_date := MAKE_DATE(p_year, p_month, 1);
    end_date := start_date + INTERVAL '1 month';

    -- 检查分区是否已存在
    IF EXISTS (
        SELECT 1 FROM pg_tables
        WHERE tablename = partition_name
        AND schemaname = 'public'
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;

    -- 创建分区
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        p_table_name,
        start_date,
        end_date
    );

    RETURN 'Created partition ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建分区清理函数（删除3年前的分区）
CREATE OR REPLACE FUNCTION cleanup_old_partitions(
    p_table_name TEXT,
    p_retention_months INT DEFAULT 36
) RETURNS TABLE (dropped_partition TEXT) AS $$
DECLARE
    cutoff_date DATE;
    partition_record RECORD;
BEGIN
    cutoff_date := CURRENT_DATE - (p_retention_months || ' months')::INTERVAL;

    FOR partition_record IN
        SELECT
            child.relname AS partition_name,
            pg_get_expr(child.relpartbound, child.oid) AS partition_bounds
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        JOIN pg_class child ON pg_inherits.inhrelid = child.oid
        WHERE parent.relname = p_table_name
    LOOP
        -- 解析分区边界，检查是否早于 cutoff_date
        IF partition_record.partition_bounds ~ 'FOR VALUES FROM \(''([0-9]{4}-[0-9]{2}-[0-9]{2})''\) TO'
        THEN
            DECLARE
                partition_start DATE;
            BEGIN
                partition_start := (regexp_match(partition_record.partition_bounds, 'FOR VALUES FROM \(''([0-9]{4}-[0-9]{2}-[0-9]{2})''\) TO'))[1]::DATE;

                IF partition_start < cutoff_date THEN
                    EXECUTE format('DROP TABLE IF EXISTS %I', partition_record.partition_name);
                    dropped_partition := partition_record.partition_name;
                    RETURN NEXT;
                END IF;
            END;
        END IF;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 8. 迁移旧数据（可选，根据数据量决定）
-- INSERT INTO product_social_stat SELECT * FROM product_social_stat_backup;

-- 9. 删除备份表（数据迁移完成后执行）
-- DROP TABLE product_social_stat_backup;

-- ============================================
-- 使用说明：
-- 1. 手动创建未来分区：
--    SELECT create_monthly_partition('product_social_stat', 2026, 5);
--
-- 2. 清理3年前的旧分区：
--    SELECT * FROM cleanup_old_partitions('product_social_stat', 36);
--
-- 3. 查看所有分区：
--    SELECT * FROM pg_tables WHERE tablename LIKE 'product_social_stat_%';
-- ============================================