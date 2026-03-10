/**
 * AI 分析器接口
 * 定义统一的 AI 分析能力
 */

/**
 * Reddit 帖子数据
 */
export interface RedditPost {
  /** 帖子标题 */
  title: string;
  /** 帖子内容（可能为空） */
  content?: string;
  /** 评论列表 */
  comments: string[];
}

/**
 * AI 分析结果
 */
export interface AIAnalysisResult {
  /** 提取的商品关键词列表 */
  keywords: string[];
  /** 分析的原始内容摘要（用于调试） */
  summary?: string;
}

/**
 * AI 分析器接口
 * 所有 AI 提供商的实现都需要遵循此接口
 */
export interface AIAnalyzer {
  /**
   * 分析 Reddit 帖子，提取商品关键词
   * @param post - Reddit 帖子数据
   * @returns 分析结果，包含商品关键词列表
   */
  analyze(post: RedditPost): Promise<AIAnalysisResult>;

  /**
   * 获取提供商名称
   */
  getProviderName(): string;
}

/**
 * AI 分析错误
 */
export class AIAnalysisError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "AIAnalysisError";
  }
}
