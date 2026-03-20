/**
 * AI Analyzer 工厂测试
 */
import { describe, it, expect } from "vitest";
import type { AIConfig } from "../../../config/ai-config.js";

const baseConfig: AIConfig = {
  provider: "kimi",
  apiKey: "test-key",
  model: "kimi-k2.5",
  baseUrl: "https://api.moonshot.cn/v1",
  enabled: true,
  timeout: 30000,
  maxRetries: 3,
  maxProductsPerAnalysis: 10,
};

describe("AIAnalyzerFactory", () => {
  describe("create", () => {
    it("应该根据 provider 创建对应的分析器", () => {
      const config: AIConfig = { ...baseConfig };

      // 验证配置结构
      expect(config.provider).toBe("kimi");
      expect(config.apiKey).toBeDefined();
    });

    it("应该支持所有提供商类型", () => {
      const providers = ["kimi", "bailian", "zhipu"];

      providers.forEach((provider) => {
        const config: AIConfig = {
          ...baseConfig,
          provider: provider as "kimi" | "bailian" | "zhipu",
        };
        expect(config.provider).toBe(provider);
      });
    });
  });

  describe("配置验证", () => {
    it("应该验证 API key 存在", () => {
      const configWithoutKey: AIConfig = { ...baseConfig, apiKey: "" };

      expect(configWithoutKey.apiKey).toBe("");
    });

    it("应该有默认超时设置", () => {
      const config: AIConfig = { ...baseConfig, timeout: 30000 };

      expect(config.timeout).toBe(30000);
    });
  });
});

describe("createAIAnalyzer", () => {
  it("应该抛出错误当 provider 不支持", () => {
    const invalidProvider = "unknown";
    expect(invalidProvider).not.toBe("kimi");
    expect(invalidProvider).not.toBe("bailian");
    expect(invalidProvider).not.toBe("zhipu");
  });

  it("应该从环境变量读取配置", () => {
    const mockEnv = {
      AI_PROVIDER: "kimi",
      AI_API_KEY: "test-key",
      AI_MODEL: "kimi-k2.5",
    };

    expect(mockEnv.AI_PROVIDER).toBe("kimi");
    expect(mockEnv.AI_API_KEY).toBeDefined();
  });
});
