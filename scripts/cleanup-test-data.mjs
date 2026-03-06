/**
 * 清理测试数据脚本
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanup() {
  const client = await pool.connect();

  try {
    console.log('🧹 开始清理测试数据...');

    // 删除测试分类（名字以 "Test Topic" 或 "Updated Topic" 开头的）
    const deleteTestTopics = await client.query(`
      DELETE FROM topic
      WHERE name LIKE 'Test Topic%' OR name LIKE 'Updated Topic%'
      RETURNING id, name, slug
    `);

    console.log(`✅ 删除了 ${deleteTestTopics.rowCount} 个测试分类:`);
    deleteTestTopics.rows.forEach(row => {
      console.log(`   - ${row.name} (slug: ${row.slug})`);
    });

    console.log('\n🎉 清理完成！');
  } catch (error) {
    console.error('❌ 清理失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
