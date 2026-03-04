import { pgEnum } from "drizzle-orm/pg-core";

// 数据来源类型
export const sourceTypeEnum = pgEnum("source_type", ["X_PLATFORM", "AMAZON"]);

// 爬虫状态
export const crawlerStatusEnum = pgEnum("crawler_status", ["RUNNING", "COMPLETED", "FAILED"]);
