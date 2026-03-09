/**
 * 日期格式化工具函数
 */

/**
 * 将 Date 格式化为 YYYY-MM-DD 格式的字符串
 * @param date Date 对象或时间戳
 * @returns 格式化后的日期字符串，如 "2024-03-09"
 */
export function formatDate(date: Date | number | string): string {
  const d = typeof date === "number" || typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * 获取今天的日期字符串 (YYYY-MM-DD)
 * @returns 今天的日期字符串
 */
export function getToday(): string {
  return formatDate(new Date());
}

/**
 * 获取指定天数前的日期字符串
 * @param days 天数
 * @returns 日期字符串
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}
