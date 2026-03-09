import { Pool } from 'pg';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.development' });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  console.error('   请确保 .env.development 文件存在且包含 DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function checkDatabase() {
  try {
    console.log('=== Good-Trending 数据库统计 ===\n');
    console.log('数据库:', DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***@'));
    console.log('');

    // 检查商品数量
    const productResult = await pool.query('SELECT COUNT(*) as count FROM product');
    console.log('📦 商品数量:', productResult.rows[0].count);

    // 检查类目数量
    const categoryResult = await pool.query('SELECT COUNT(*) as count FROM category');
    console.log('📁 类目数量:', categoryResult.rows[0].count);

    // 检查趋势榜单数据数量
    const trendResult = await pool.query('SELECT COUNT(*) as count FROM trend_rank');
    console.log('📈 趋势榜单数据数量:', trendResult.rows[0].count);

    // 检查今天的趋势数据
    const today = new Date().toISOString().split('T')[0];
    const todayTrendResult = await pool.query(
      'SELECT COUNT(*) as count FROM trend_rank WHERE stat_date = $1',
      [today]
    );
    console.log(`📅 今天(${today})的趋势数据数量:`, todayTrendResult.rows[0].count);

    // 显示最近5天的趋势数据分布
    const recentTrends = await pool.query(`
      SELECT stat_date as date, COUNT(*) as count
      FROM trend_rank
      GROUP BY stat_date
      ORDER BY stat_date DESC
      LIMIT 5
    `);
    console.log('\n📊 最近5天的趋势数据分布:');
    if (recentTrends.rows.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentTrends.rows.forEach(t => {
        console.log(`  ${t.date}: ${t.count} 条记录`);
      });
    }

    // 显示最近的爬虫日志
    const recentLogs = await pool.query(`
      SELECT
        task_type,
        source_type,
        status,
        items_found,
        items_saved,
        created_at
      FROM crawler_log
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('\n🕷️ 最近5条爬虫日志:');
    if (recentLogs.rows.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentLogs.rows.forEach(log => {
        const date = new Date(log.created_at).toLocaleString('zh-CN');
        console.log(`  [${date}] ${log.task_type} | ${log.source_type} | ${log.status} | 找到:${log.items_found} 保存:${log.items_saved}`);
      });
    }

    // 显示最近的商品（按首次发现时间）
    const recentProducts = await pool.query(`
      SELECT
        name,
        first_seen_at,
        discovered_from
      FROM product
      ORDER BY first_seen_at DESC
      LIMIT 5
    `);
    console.log('\n🆕 最近5条发现的商品:');
    if (recentProducts.rows.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentProducts.rows.forEach(p => {
        const name = p.name.length > 50 ? p.name.substring(0, 50) + '...' : p.name;
        console.log(`  [${p.first_seen_at}] ${name} (${p.discovered_from})`);
      });
    }

    // 按数据来源统计商品数量
    const sourceStats = await pool.query(`
      SELECT discovered_from, COUNT(*) as count
      FROM product
      GROUP BY discovered_from
    `);
    console.log('\n📊 按数据来源统计商品数量:');
    if (sourceStats.rows.length === 0) {
      console.log('  (暂无数据)');
    } else {
      sourceStats.rows.forEach(s => {
        console.log(`  ${s.discovered_from}: ${s.count} 个商品`);
      });
    }

    console.log('\n=== 统计完成 ===');
  } catch (error) {
    console.error('\n❌ 查询失败:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   请检查 PostgreSQL 数据库是否已启动 (端口: 5436)');
    } else if (error.message.includes('does not exist')) {
      console.error('   数据库表不存在，请运行迁移命令: pnpm db:migrate');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();
