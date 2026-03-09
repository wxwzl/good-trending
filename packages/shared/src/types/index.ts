/**
 * 爬虫日志类型
 * 用于爬虫执行记录（内部使用）
 */
export interface CrawlerLog {
  id: string;
  sourceType: import("@good-trending/dto/common").SourceType;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startTime: Date;
  endTime?: Date;
  duration?: number;
  itemsFound: number;
  itemsSaved: number;
  errors?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
