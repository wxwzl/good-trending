/**
 * Bitmap 工具函数
 * 用于处理近 N 天出现次数的位图存储
 *
 * 每一位代表某一天是否出现 (1=出现, 0=未出现)
 * 每天左移一位实现滑动窗口
 */

/**
 * 更新位图（滑动窗口）
 * @param bitmap 当前位图值
 * @param windowSize 窗口大小（7/15/30/60）
 * @param appearedToday 今天是否出现
 * @returns 更新后的位图值
 */
export function updateBitmap(
  bitmap: bigint,
  windowSize: number,
  appearedToday: boolean
): bigint {
  // 左移一位
  let newBitmap = bitmap << 1n;

  // 屏蔽超出窗口大小的位
  const mask = (1n << BigInt(windowSize)) - 1n;
  newBitmap = newBitmap & mask;

  // 设置今天的状态
  if (appearedToday) {
    newBitmap = newBitmap | 1n;
  }

  return newBitmap;
}

/**
 * 计算位图中 1 的个数（出现次数）
 * @param bitmap 位图值
 * @returns 出现次数
 */
export function countBitmap(bitmap: bigint): number {
  let count = 0;
  let n = bitmap;

  while (n > 0n) {
    n = n & (n - 1n); // 清除最低位的 1
    count++;
  }

  return count;
}

/**
 * 检查某一天是否出现
 * @param bitmap 位图值
 * @param dayOffset 天数偏移（0=今天，1=昨天，以此类推）
 * @returns 是否出现
 */
export function isDaySet(bitmap: bigint, dayOffset: number): boolean {
  const mask = 1n << BigInt(dayOffset);
  return (bitmap & mask) !== 0n;
}

/**
 * 设置某一天的状态
 * @param bitmap 位图值
 * @param dayOffset 天数偏移
 * @param value 是否出现
 * @returns 更新后的位图值
 */
export function setDay(
  bitmap: bigint,
  dayOffset: number,
  value: boolean
): bigint {
  const mask = 1n << BigInt(dayOffset);

  if (value) {
    return bitmap | mask;
  } else {
    return bitmap & ~mask;
  }
}

/**
 * 将位图转换为二进制字符串（用于调试）
 * @param bitmap 位图值
 * @param length 字符串长度
 * @returns 二进制字符串
 */
export function bitmapToString(bitmap: bigint, length: number = 30): string {
  return bitmap.toString(2).padStart(length, "0");
}

/**
 * 获取近 N 天的出现次数统计
 * @param bitmap7 近7天位图
 * @param bitmap15 近15天位图
 * @param bitmap30 近30天位图
 * @param bitmap60 近60天位图
 * @returns 各时间段出现次数
 */
export function getAppearanceCounts(
  bitmap7: bigint,
  bitmap15: bigint,
  bitmap30: bigint,
  bitmap60: bigint
): {
  last7Days: number;
  last15Days: number;
  last30Days: number;
  last60Days: number;
} {
  return {
    last7Days: countBitmap(bitmap7),
    last15Days: countBitmap(bitmap15),
    last30Days: countBitmap(bitmap30),
    last60Days: countBitmap(bitmap60),
  };
}

// ==================== 示例用法 ====================

/*
// 初始化
let bitmap7 = 0n;

// 每天更新（假设今天出现了）
bitmap7 = updateBitmap(bitmap7, 7, true);

// 获取近7天出现次数
const count = countBitmap(bitmap7);
console.log(`近7天出现 ${count} 次`);

// 查看具体哪几天出现了
const binaryStr = bitmapToString(bitmap7, 7);
console.log(`位图: ${binaryStr}`);
// 输出类似: 1011001 (从右到左: 今天, 昨天, 前天...)
*/
