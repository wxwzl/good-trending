import { db } from '@good-trending/database';
import { products, trends } from '@good-trending/database';
import { count, sql } from 'drizzle-orm';

async function checkData() {
  try {
    // 检查产品数量
    const productCount = await db.select({ count: count() }).from(products);
    console.log('产品数量:', productCount[0]?.count || 0);

    // 检查趋势数据数量
    const trendCount = await db.select({ count: count() }).from(trends);
    console.log('趋势数据数量:', trendCount[0]?.count || 0);

    // 检查今天的趋势数据
    const today = new Date().toISOString().split('T')[0];
    const todayTrends = await db
      .select({ count: count() })
      .from(trends)
      .where(sql`${trends.date} = ${today}`);
    console.log(`今天(${today})的趋势数据数量:`, todayTrends[0]?.count || 0);

    // 显示最近5条趋势数据
    const recentTrends = await db
      .select({
        date: trends.date,
        count: sql`COUNT(*)`.as('count')
      })
      .from(trends)
      .groupBy(trends.date)
      .orderBy(sql`${trends.date} DESC`)
      .limit(5);
    console.log('\n最近5天的趋势数据分布:');
    recentTrends.forEach(t => {
      console.log(`  ${t.date}: ${t.count} 条记录`);
    });

    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error.message);
    process.exit(1);
  }
}

checkData();
