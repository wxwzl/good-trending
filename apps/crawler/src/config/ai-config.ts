/**
 * AI 分析配置模块
 * 支持 Kimi / 阿里百炼 / 智谱 三个平台
 */

import { createLoggerInstance } from "@good-trending/shared";

const logger = createLoggerInstance("ai-config");

/**
 * AI 提供商类型
 */
export type AIProvider = "kimi" | "bailian" | "zhipu";

/**
 * AI 配置接口
 */
export interface AIConfig {
  /** 提供商 */
  provider: AIProvider;
  /** API Key */
  apiKey: string;
  /** 模型名称 */
  model: string;
  /** API 基础 URL */
  baseUrl: string;
  /** 是否启用 AI 分析 */
  enabled: boolean;
  /** 请求超时 (毫秒) */
  timeout: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 每次分析的最大商品数 */
  maxProductsPerAnalysis: number;
}

/**
 * 提供商默认配置
 */
const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; model: string }> = {
  kimi: {
    baseUrl: "https://api.moonshot.cn/v1",
    model: "kimi-k2.5",
  },
  bailian: {
    baseUrl: "https://dashscope.aliyuncs.com/api/v1",
    model: "qwen-coder-plus",
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-coder",
  },
};

/**
 * 加载 AI 配置
 */
function loadAIConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER as AIProvider) || "kimi";
  const enabled = process.env.ENABLE_AI_ANALYSIS === "true";

  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.kimi;

  return {
    provider,
    apiKey: process.env.AI_API_KEY || "",
    model: process.env.AI_MODEL || defaults.model,
    baseUrl: process.env.AI_BASE_URL || defaults.baseUrl,
    enabled,
    timeout: parseInt(process.env.AI_TIMEOUT || "30000", 10),
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
    maxProductsPerAnalysis: parseInt(process.env.AI_MAX_PRODUCTS || "6", 10),
  };
}

/**
 * 验证 AI 配置
 */
export function validateAIConfig(config: AIConfig = aiConfig): void {
  if (!config.enabled) {
    logger.info("AI analysis is disabled");
    return;
  }

  if (!config.apiKey) {
    throw new Error(
      `AI_API_KEY is required when ENABLE_AI_ANALYSIS is true (provider: ${config.provider})`
    );
  }

  const validProviders: AIProvider[] = ["kimi", "bailian", "zhipu"];
  if (!validProviders.includes(config.provider)) {
    throw new Error(
      `Invalid AI_PROVIDER: ${config.provider}. Must be one of: ${validProviders.join(", ")}`
    );
  }

  logger.info("AI configuration validated", {
    provider: config.provider,
    model: config.model,
    enabled: config.enabled,
  });
}

/**
 * AI 配置实例
 */
export const aiConfig = loadAIConfig();

/**
 * 亚马逊搜索配置
 */
export interface AmazonSearchConfig {
  /** 每个关键词取前 N 个商品 */
  limit: number;
  /** 搜索间隔 (毫秒) */
  delay: number;
  /** 亚马逊域名 */
  domain: string;
}

/**
 * 亚马逊搜索配置实例
 */
export const amazonSearchConfig: AmazonSearchConfig = {
  limit: parseInt(process.env.AMAZON_SEARCH_LIMIT || "6", 10),
  delay: parseInt(process.env.AMAZON_SEARCH_DELAY || "5000", 10),
  domain: process.env.AMAZON_DOMAIN || "amazon.com",
};

/**
 * 导出默认配置
 */
export default {
  ai: aiConfig,
  amazon: amazonSearchConfig,
};
