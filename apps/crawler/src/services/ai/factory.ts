/**
 * AI 分析器工厂
 * 根据配置创建对应的 AI 分析器实例
 */

import { AIAnalyzer } from "./ai-analyzer.interface";
import { KimiAnalyzer } from "./kimi-analyzer";
import { BailianAnalyzer } from "./bailian-analyzer";
import { ZhipuAnalyzer } from "./zhipu-analyzer";
import { aiConfig, type AIConfig, validateAIConfig } from "../../config/ai-config";
import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("ai-analyzer-factory");

/**
 * AI 分析器工厂
 */
export class AIAnalyzerFactory {
  /**
   * 创建 AI 分析器实例
   * @param config - AI 配置，默认使用全局配置
   * @returns AI 分析器实例
   * @throws 如果配置无效或提供商不支持
   */
  static create(config: AIConfig = aiConfig): AIAnalyzer {
    // 验证配置
    validateAIConfig(config);

    if (!config.enabled) {
      throw new Error("AI analysis is disabled. Set ENABLE_AI_ANALYSIS=true to enable.");
    }

    logger.info("Creating AI analyzer", { provider: config.provider });

    switch (config.provider) {
      case "kimi":
        return new KimiAnalyzer(config);
      case "bailian":
        return new BailianAnalyzer(config);
      case "zhipu":
        return new ZhipuAnalyzer(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  /**
   * 创建 AI 分析器实例（如果启用）
   * @param config - AI 配置，默认使用全局配置
   * @returns AI 分析器实例，如果禁用则返回 null
   */
  static createIfEnabled(config: AIConfig = aiConfig): AIAnalyzer | null {
    if (!config.enabled) {
      logger.info("AI analysis is disabled, skipping analyzer creation");
      return null;
    }

    try {
      return this.create(config);
    } catch (error) {
      logger.error("Failed to create AI analyzer", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取支持的提供商列表
   */
  static getSupportedProviders(): string[] {
    return ["kimi", "bailian", "zhipu"];
  }
}

/**
 * 默认导出工厂创建方法
 */
export const createAIAnalyzer = AIAnalyzerFactory.create;
export const createAIAnalyzerIfEnabled = AIAnalyzerFactory.createIfEnabled;
