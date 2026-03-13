/**
 * 延迟和随机化工具
 * 用于模拟人类操作，避免被反爬虫机制检测
 */

/**
 * 延迟范围配置
 */
export const DELAY_RANGES = {
  /** 短延迟: 1-3 秒，用于页面内操作 */
  SHORT: { min: 1000, max: 3000 },
  /** 中等延迟: 2-5 秒，用于请求间隔 */
  MEDIUM: { min: 2000, max: 5000 },
  /** 长延迟: 3-8 秒，用于敏感操作 */
  LONG: { min: 3000, max: 8000 },
  /** 人类操作间隔: 0.5-1.5 秒 */
  HUMAN: { min: 500, max: 1500 },
  /** 反检测延迟: 2-4 秒 */
  ANTI_DETECTION: { min: 2000, max: 4000 },
};

/**
 * 随机延迟
 * @param min 最小延迟（毫秒）
 * @param max 最大延迟（毫秒）
 * @returns Promise，在随机延迟后 resolve
 */
export const randomDelay = async (
  min: number = DELAY_RANGES.MEDIUM.min,
  max: number = DELAY_RANGES.MEDIUM.max
): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * 带随机抖动的请求间隔
 * @param baseDelay 基础延迟（毫秒）
 * @returns Promise，在基础延迟 ±500ms 抖动后 resolve
 */
export const requestDelay = async (baseDelay: number): Promise<void> => {
  const jitter = Math.random() * 1000 - 500; // ±500ms 抖动
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
};

/**
 * 人类化延迟 - 模拟人类阅读/操作时间
 * @returns Promise，在 1-3 秒后 resolve
 */
export const humanDelay = async (): Promise<void> => {
  await randomDelay(DELAY_RANGES.SHORT.min, DELAY_RANGES.SHORT.max);
};

/**
 * 反检测延迟 - 在关键操作前使用
 * @returns Promise，在 2-4 秒后 resolve
 */
export const antiDetectionDelay = async (): Promise<void> => {
  await randomDelay(DELAY_RANGES.ANTI_DETECTION.min, DELAY_RANGES.ANTI_DETECTION.max);
};

/**
 * 滚动延迟 - 模拟人类滚动后的停留时间
 * @returns Promise，在 500-1500ms 后 resolve
 */
export const scrollDelay = async (): Promise<void> => {
  await randomDelay(DELAY_RANGES.HUMAN.min, DELAY_RANGES.HUMAN.max);
};
