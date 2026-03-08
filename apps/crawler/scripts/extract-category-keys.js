#!/usr/bin/env node
/**
 * 提取分类名称并处理 & 符号
 * 输入: apps/crawler/src/category/category.json
 * 输出: apps/crawler/src/category/categoryKeys.json
 */

const fs = require('fs');
const path = require('path');

function extractCategoryKeys() {
  // 读取输入文件
  const inputPath = path.join(__dirname, '../src/category/category.json');
  const outputPath = path.join(__dirname, '../src/category/categoryKeys.json');

  console.log('📖 读取分类数据...');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 文件不存在: ${inputPath}`);
    process.exit(1);
  }

  // 读取并解析 JSON
  const categoryData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  if (!Array.isArray(categoryData)) {
    console.error('❌ 数据格式错误: 期望是一个数组');
    process.exit(1);
  }

  const keys = [];

  // 处理每个分类
  categoryData.forEach((item) => {
    if (item.name) {
      // 如果 name 包含 & 符号，按 & 分隔
      if (item.name.includes('&')) {
        const parts = item.name.split('&').map(part => part.trim()).filter(part => part.length > 0);
        keys.push(...parts);
      } else {
        keys.push(item.name.trim());
      }
    }
  });

  // 去重（如果分割后有重复）
  const uniqueKeys = [...new Set(keys)];

  console.log(`✅ 提取了 ${uniqueKeys.length} 个分类关键字`);
  console.log('\n📋 关键字预览:');
  uniqueKeys.slice(0, 20).forEach((key, i) => {
    console.log(`  ${i + 1}. ${key}`);
  });
  if (uniqueKeys.length > 20) {
    console.log(`  ... 还有 ${uniqueKeys.length - 20} 个`);
  }

  // 确保目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 保存结果
  fs.writeFileSync(outputPath, JSON.stringify(uniqueKeys, null, 2), 'utf-8');
  console.log(`\n💾 结果已保存到: ${outputPath}`);

  return uniqueKeys;
}

// 执行
extractCategoryKeys();
console.log('\n🎉 完成!');
