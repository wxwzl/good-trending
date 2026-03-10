/**
 * 阿里百炼 AI 分析器实现
 * 使用阿里云百炼 (DashScope) API 进行内容分析
 */

import { BaseAIAnalyzer, SYSTEM_PROMPT, fetchWithTimeout } from "./base-analyzer";
import { AIAnalysisResult, RedditPost } from "./ai-analyzer.interface";
import type { AIConfig } from "../../config/ai-config";

/**
 * 百炼 API 响应
 */
interface BailianResponse {
  output: {
    choices: Array<{
      message: {
        role: string;
        content: string;
      };
      finish_reason: string;
    }>;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  request_id: string;
}

/**
 * 阿里百炼 AI 分析器
 */
export class BailianAnalyzer extends BaseAIAnalyzer {
  constructor(config: AIConfig) {
    super(config);
  }

  getProviderName(): string {
    return "bailian";
  }

  async analyze(post: RedditPost): Promise<AIAnalysisResult> {
    return this.executeWithRetry(async () => {
      const prompt = this.buildPrompt(post);

      this.logger.debug("Sending request to Bailian API", {
        model: this.config.model,
        promptLength: prompt.length,
      });

      const response = await fetchWithTimeout(
        `${this.config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            input: {
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
            },
            parameters: {
              temperature: 0.3,
              max_tokens: 500,
            },
          }),
        },
        this.config.timeout
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Bailian API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = (await response.json()) as BailianResponse;
      const content = data.output?.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from Bailian API");
      }

      this.logger.debug("Received response from Bailian API", {
        tokens: data.usage?.total_tokens,
        content: content.substring(0, 200),
      });

      return this.parseResponse(content);
    }, "Bailian analysis");
  }
}
