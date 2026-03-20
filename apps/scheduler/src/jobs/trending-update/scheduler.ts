/**
 * 趋势更新任务 - 调度配置
 * 每天凌晨4点生成所有周期的趋势榜单并清除缓存
 */

export const TRENDING_UPDATE_SCHEDULE = {
  name: "trending-update",
  cron: "0 4 * * *", // 每天凌晨4点
  enabled: true,
  description: "生成所有周期趋势榜单（TODAY/YESTERDAY/THIS_WEEK/...）并清除缓存",
  queue: "trending" as const,
};
