/**
 * 智谱 AI 分析器实现
 * 使用智谱 AI (Zhipu AI / BigModel) API 进行内容分析
 */

import { BaseAIAnalyzer, SYSTEM_PROMPT, fetchWithTimeout } from "./base-analyzer";
import { AIAnalysisResult, RedditPost } from "./ai-analyzer.interface";
import type { AIConfig } from "../../config/ai-config";

/**
 * 智谱 API 响应
 */
interface ZhipuResponse {
  id: string;
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
 * 智谱 AI 分析器
 */
export class ZhipuAnalyzer extends BaseAIAnalyzer {
  constructor(config: AIConfig) {
    super(config);
  }

  getProviderName(): string {
    return "zhipu";
  }

  async analyze(post: RedditPost): Promise<AIAnalysisResult> {
    return this.executeWithRetry(async () => {
      const prompt = this.buildPrompt(post);

      this.logger.debug("Sending request to Zhipu API", {
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
        throw new Error(
          `Zhipu API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as ZhipuResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from Zhipu API");
      }

      this.logger.debug("Received response from Zhipu API", {
        tokens: data.usage?.total_tokens,
        content: content.substring(0, 200),
      });

      return this.parseResponse(content);
    }, "Zhipu analysis");
  }
}
