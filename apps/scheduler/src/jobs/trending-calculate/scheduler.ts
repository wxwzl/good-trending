/**
 * 趋势计算任务 - 调度配置
 * 每天凌晨3点计算今日趋势分数
 */

export const TRENDING_CALCULATE_SCHEDULE = {
  name: "trending-calculate",
  cron: "0 3 * * *", // 每天凌晨3点
  enabled: true,
  description: "计算所有商品今日趋势分数并生成榜单",
  queue: "trending" as const,
};
