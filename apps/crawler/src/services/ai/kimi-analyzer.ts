/**
 * Kimi AI 分析器实现
 * 使用 Moonshot AI (Kimi) API 进行内容分析
 */

import { BaseAIAnalyzer, SYSTEM_PROMPT, fetchWithTimeout } from "./base-analyzer";
import { AIAnalysisResult, RedditPost } from "./ai-analyzer.interface";
import type { AIConfig } from "../../config/ai-config";

/**
 * Kimi API 响应
 */
interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Kimi AI 分析器
 */
export class KimiAnalyzer extends BaseAIAnalyzer {
  constructor(config: AIConfig) {
    super(config);
  }

  getProviderName(): string {
    return "kimi";
  }

  async analyze(post: RedditPost): Promise<AIAnalysisResult> {
    return this.executeWithRetry(async () => {
      const prompt = this.buildPrompt(post);

      this.logger.debug("Sending request to Kimi API", {
        model: this.config.model,
        promptLength: prompt.length,
      });

      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        },
        this.config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kimi API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = (await response.json()) as KimiResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from Kimi API");
      }

      this.logger.debug("Received response from Kimi API", {
        tokens: data.usage?.total_tokens,
        content: content.substring(0, 200),
      });

      return this.parseResponse(content);
    }, "Kimi analysis");
  }
}
