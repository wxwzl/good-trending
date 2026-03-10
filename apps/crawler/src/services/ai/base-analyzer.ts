/**
 * AI 分析器基类
 * 提供通用的 Prompt 构建和错误处理
 */

import { createLoggerInstance } from "@good-trending/shared";
import { AIAnalyzer, AIAnalysisResult, RedditPost, AIAnalysisError } from "./ai-analyzer.interface";
import type { AIConfig } from "../../config/ai-config";

/**
 * 系统提示词常量
 * 导出供子类使用
 */
export const SYSTEM_PROMPT =
  "你是一个专业的商品分析助手。你的任务是从 Reddit 帖子中提取用户提到的商品关键词。只返回 JSON 格式的数组，不要添加任何解释。";

/**
 * 带超时的 fetch 封装
 * 导出供子类使用
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * AI 分析器基类
 */
export abstract class BaseAIAnalyzer implements AIAnalyzer {
  protected config: AIConfig;
  protected logger: ReturnType<typeof createLoggerInstance>;

  constructor(config: AIConfig) {
    this.config = config;
    // 使用提供商名称创建独立的 logger 实例
    this.logger = createLoggerInstance(`ai-analyzer:${this.getProviderName()}`);
  }

  /**
   * 构建分析 Prompt
   */
  protected buildPrompt(post: RedditPost): string {
    const commentsText =
      post.comments.length > 0
        ? post.comments.slice(0, 20).join("\n---\n") // 最多取20条评论
        : "无评论";

    return `请分析以下 Reddit 帖子内容，提取其中提到的所有商品关键词。

## 帖子标题
${post.title}

## 帖子内容
${post.content || "无内容"}

## 评论（节选）
${commentsText}

## 任务要求
1. 识别帖子中提到的所有具体商品名称、品牌或产品类型
2. 返回格式必须是有效的 JSON 数组，例如：["iPhone 15", "AirPods Pro", "Nintendo Switch"]
3. 只返回 JSON 数组，不要返回任何其他解释文字
4. 如果没有识别到任何商品，返回空数组：[]
5. 关键词应该具体，不要太笼统（如用 "iPhone 15" 而不是 "phone"）

## 输出格式
["商品关键词1", "商品关键词2", ...]`;
  }

  /**
   * 解析 AI 响应
   */
  protected parseResponse(content: string): AIAnalysisResult {
    try {
      // 清理响应内容
      let cleaned = content.trim();

      // 如果包含 markdown 代码块，提取其中的内容
      const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        cleaned = codeBlockMatch[1].trim();
      }

      // 尝试解析 JSON
      const keywords = JSON.parse(cleaned) as string[];

      if (!Array.isArray(keywords)) {
        throw new Error("Response is not an array");
      }

      // 过滤和清理关键词
      const validKeywords = keywords
        .map((k) => k.trim())
        .filter((k) => k.length > 0 && k.length < 100);

      return {
        keywords: validKeywords,
        summary: content.substring(0, 200),
      };
    } catch (error) {
      this.logger.warn("Failed to parse AI response", {
        content: content.substring(0, 500),
        error: error instanceof Error ? error.message : String(error),
      });

      // 如果 JSON 解析失败，尝试用正则提取
      return this.extractKeywordsWithRegex(content);
    }
  }

  /**
   * 使用正则表达式提取关键词（后备方案）
   */
  private extractKeywordsWithRegex(content: string): AIAnalysisResult {
    // 匹配引号中的内容
    const matches = content.match(/"([^"]+)"/g);
    if (matches) {
      const keywords = matches
        .map((m) => m.replace(/"/g, "").trim())
        .filter((k) => k.length > 0 && k.length < 100 && !k.includes("\n"));

      return {
        keywords: [...new Set(keywords)], // 去重
        summary: content.substring(0, 200),
      };
    }

    return {
      keywords: [],
      summary: content.substring(0, 200),
    };
  }

  /**
   * 执行分析（子类实现）
   */
  abstract analyze(post: RedditPost): Promise<AIAnalysisResult>;

  /**
   * 获取提供商名称（子类实现）
   */
  abstract getProviderName(): string;

  /**
   * 带重试的分析执行
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName}, attempt ${attempt}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(`${operationName} failed (attempt ${attempt})`, {
          error: lastError.message,
        });

        if (attempt < this.config.maxRetries) {
          // 指数退避
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new AIAnalysisError(
      `${operationName} failed after ${this.config.maxRetries} attempts: ${lastError?.message}`,
      this.getProviderName(),
      lastError
    );
  }
}
