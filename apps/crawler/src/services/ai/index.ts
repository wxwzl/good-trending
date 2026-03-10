/**
 * AI 分析服务模块
 * 提供 Reddit 帖子内容分析和商品关键词提取
 */

// 导出接口和类型
export type { AIAnalyzer, RedditPost, AIAnalysisResult } from "./ai-analyzer.interface";
export { AIAnalysisError } from "./ai-analyzer.interface";

// 导出基类和工具
export { BaseAIAnalyzer, SYSTEM_PROMPT, fetchWithTimeout } from "./base-analyzer";

// 导出具体实现
export { KimiAnalyzer } from "./kimi-analyzer";
export { BailianAnalyzer } from "./bailian-analyzer";
export { ZhipuAnalyzer } from "./zhipu-analyzer";

// 导出工厂
export { AIAnalyzerFactory, createAIAnalyzer, createAIAnalyzerIfEnabled } from "./factory";

// 重新导出配置
export type { AIConfig, AIProvider } from "../../config/ai-config";
export { aiConfig, validateAIConfig } from "../../config/ai-config";
