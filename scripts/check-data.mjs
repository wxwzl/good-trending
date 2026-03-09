import { db } from '@good-trending/database';
import { products, trendRanks, categories, crawlerLogs } from '@good-trending/database';
import { count, sql } from 'drizzle-orm';

async function checkData() {
  try {
    console.log('=== Good-Trending 数据库统计 ===\n');

    // 检查商品数量
    const productCount = await db.select({ count: count() }).from(products);
    console.log('📦 商品数量:', productCount[0]?.count || 0);

    // 检查类目数量
    const categoryCount = await db.select({ count: count() }).from(categories);
    console.log('📁 类目数量:', categoryCount[0]?.count || 0);

    // 检查趋势榜单数据数量
    const trendCount = await db.select({ count: count() }).from(trendRanks);
    console.log('📈 趋势榜单数据数量:', trendCount[0]?.count || 0);

    // 检查今天的趋势数据
    const today = new Date().toISOString().split('T')[0];
    const todayTrends = await db
      .select({ count: count() })
      .from(trendRanks)
      .where(sql`${trendRanks.statDate} = ${today}`);
    console.log(`📅 今天(${today})的趋势数据数量:`, todayTrends[0]?.count || 0);

    // 显示最近5天的趋势数据分布
    const recentTrends = await db
      .select({
        date: trendRanks.statDate,
        count: sql`COUNT(*)`.as('count')
      })
      .from(trendRanks)
      .groupBy(trendRanks.statDate)
      .orderBy(sql`${trendRanks.statDate} DESC`)
      .limit(5);
    console.log('\n📊 最近5天的趋势数据分布:');
    if (recentTrends.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentTrends.forEach(t => {
        console.log(`  ${t.date}: ${t.count} 条记录`);
      });
    }

    // 显示最近的爬虫日志
    const recentLogs = await db
      .select({
        taskType: crawlerLogs.taskType,
        sourceType: crawlerLogs.sourceType,
        status: crawlerLogs.status,
        itemsFound: crawlerLogs.itemsFound,
        itemsSaved: crawlerLogs.itemsSaved,
        createdAt: crawlerLogs.createdAt
      })
      .from(crawlerLogs)
      .orderBy(sql`${crawlerLogs.createdAt} DESC`)
      .limit(5);
    console.log('\n🕷️ 最近5条爬虫日志:');
    if (recentLogs.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentLogs.forEach(log => {
        const date = new Date(log.createdAt).toLocaleString('zh-CN');
        console.log(`  [${date}] ${log.taskType} | ${log.sourceType} | ${log.status} | 找到:${log.itemsFound} 保存:${log.itemsSaved}`);
      });
    }

    // 显示最近的商品（按首次发现时间）
    const recentProducts = await db
      .select({
        name: products.name,
        firstSeenAt: products.firstSeenAt,
        discoveredFrom: products.discoveredFrom
      })
      .from(products)
      .orderBy(sql`${products.firstSeenAt} DESC`)
      .limit(5);
    console.log('\n🆕 最近5条发现的商品:');
    if (recentProducts.length === 0) {
      console.log('  (暂无数据)');
    } else {
      recentProducts.forEach(p => {
        console.log(`  [${p.firstSeenAt}] ${p.name.substring(0, 50)}${p.name.length > 50 ? '...' : ''} (${p.discoveredFrom})`);
      });
    }

    console.log('\n=== 统计完成 ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   请检查 PostgreSQL 数据库是否已启动 (端口: 5436)');
    }
    process.exit(1);
  }
}

checkData();
