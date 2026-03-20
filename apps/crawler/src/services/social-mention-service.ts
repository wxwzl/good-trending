/**
 * 社交提及统计服务
 * 用于统计商品在 Reddit 和 X 平台的提及次数
 */

import { createLoggerInstance } from "@good-trending/shared";
import { GoogleSearchService } from "../adapters/legacy/google/index.js";

const logger = createLoggerInstance("social-mention-service");

/**
 * 时间段类型
 */
export type PeriodType =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_7_DAYS"
  | "LAST_15_DAYS"
  | "LAST_30_DAYS"
  | "LAST_60_DAYS";

/**
 * 平台提及统计
 */
export interface PlatformMentions {
  reddit: number;
  x: number;
}

/**
 * 商品提及统计结果
 */
export interface ProductMentionStats {
  productName: string;
  productId: string;
  today: PlatformMentions;
  yesterday: PlatformMentions;
  thisWeek: PlatformMentions;
  thisMonth: PlatformMentions;
  last7Days: PlatformMentions;
  last15Days: PlatformMentions;
  last30Days: PlatformMentions;
  last60Days: PlatformMentions;
}

/**
 * 社交提及统计服务
 */
export class SocialMentionService {
  private searchService: GoogleSearchService;

  constructor() {
    this.searchService = new GoogleSearchService();
  }

  /**
   * 统计商品的社交提及
   * @param productId - 商品ID
   * @param productName - 商品名称
   * @param date - 统计日期（默认今天）
   * @returns 提及统计结果
   */
  async countMentions(
    productId: string,
    productName: string,
    date: Date = new Date()
  ): Promise<ProductMentionStats> {
    logger.info(`统计商品提及: "${productName}"`);

    const today = this.formatDate(date);

    // 计算各时间段的起始日期
    const yesterday = this.formatDate(this.addDays(date, -1));
    const weekStart = this.formatDate(this.getWeekStart(date));
    const monthStart = this.formatDate(new Date(date.getFullYear(), date.getMonth(), 1));
    const last7Days = this.formatDate(this.addDays(date, -7));
    const last15Days = this.formatDate(this.addDays(date, -15));
    const last30Days = this.formatDate(this.addDays(date, -30));
    const last60Days = this.formatDate(this.addDays(date, -60));

    // 并行统计各时间段
    const [
      todayResult,
      yesterdayResult,
      thisWeekResult,
      thisMonthResult,
      last7DaysResult,
      last15DaysResult,
      last30DaysResult,
      last60DaysResult,
    ] = await Promise.all([
      this.searchMentions(productName, today),
      this.searchMentions(productName, yesterday, today),
      this.searchMentions(productName, weekStart),
      this.searchMentions(productName, monthStart),
      this.searchMentions(productName, last7Days),
      this.searchMentions(productName, last15Days),
      this.searchMentions(productName, last30Days),
      this.searchMentions(productName, last60Days),
    ]);

    logger.info(
      `提及统计完成: "${productName}" - 今日 Reddit: ${todayResult.reddit}, X: ${todayResult.x}`
    );

    return {
      productName,
      productId,
      today: todayResult,
      yesterday: yesterdayResult,
      thisWeek: thisWeekResult,
      thisMonth: thisMonthResult,
      last7Days: last7DaysResult,
      last15Days: last15DaysResult,
      last30Days: last30DaysResult,
      last60Days: last60DaysResult,
    };
  }

  /**
   * 搜索指定平台的提及数
   */
  private async searchMentions(
    productName: string,
    afterDate: string,
    beforeDate?: string
  ): Promise<PlatformMentions> {
    // 构建查询
    const redditQuery = this.buildQuery(productName, "REDDIT", afterDate, beforeDate);
    const xQuery = this.buildQuery(productName, "X_PLATFORM", afterDate, beforeDate);

    // 并行搜索
    const [redditResult, xResult] = await Promise.all([
      this.searchService.search(redditQuery),
      this.searchService.search(xQuery),
    ]);

    return {
      reddit: redditResult.success ? redditResult.totalResults : 0,
      x: xResult.success ? xResult.totalResults : 0,
    };
  }

  /**
   * 构建搜索查询
   */
  private buildQuery(
    productName: string,
    platform: "REDDIT" | "X_PLATFORM",
    afterDate: string,
    beforeDate?: string
  ): string {
    const site = platform === "REDDIT" ? "reddit.com" : "x.com";
    const quotedName = `"${productName}"`;

    if (beforeDate) {
      return `site:${site} ${quotedName} after:${afterDate} before:${beforeDate}`;
    }
    return `site:${site} ${quotedName} after:${afterDate}`;
  }

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * 添加天数
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 获取本周开始日期（周一）
   */
  private getWeekStart(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    return result;
  }

  /**
   * 批量统计多个商品
   * @param products - 商品列表
   * @returns 统计结果列表
   */
  async countMentionsBatch(
    products: Array<{ id: string; name: string }>,
    date: Date = new Date()
  ): Promise<ProductMentionStats[]> {
    const results: ProductMentionStats[] = [];

    for (const product of products) {
      try {
        const stats = await this.countMentions(product.id, product.name, date);
        results.push(stats);

        // 每个商品之间添加延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        logger.error(`统计商品 "${product.name}" 提及失败: ${error}`);
        // 继续处理下一个商品
      }
    }

    return results;
  }
}

/**
 * 创建社交提及统计服务实例
 */
export function createSocialMentionService(): SocialMentionService {
  return new SocialMentionService();
}
