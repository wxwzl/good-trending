/**
 * 爬虫错误类型定义
 * 统一错误处理体系
 */

/**
 * 基础爬虫错误
 */
export class CrawlerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "CrawlerError";
  }
}

/**
 * 网络错误
 */
export class NetworkError extends CrawlerError {
  constructor(
    message: string,
    public readonly url?: string
  ) {
    super(message, "NETWORK_ERROR", true);
    this.name = "NetworkError";
  }
}

/**
 * 超时错误
 */
export class TimeoutError extends CrawlerError {
  constructor(
    message: string,
    public readonly timeoutMs?: number
  ) {
    super(message, "TIMEOUT_ERROR", true);
    this.name = "TimeoutError";
  }
}

/**
 * 反爬检测错误
 */
export class AntiDetectionError extends CrawlerError {
  constructor(
    message: string,
    public readonly platform: "google" | "reddit" | "amazon" | "x"
  ) {
    super(message, "ANTI_DETECTION_ERROR", true);
    this.name = "AntiDetectionError";
  }
}

/**
 * 验证/验证码错误
 */
export class CaptchaError extends CrawlerError {
  constructor(
    message: string,
    public readonly platform: string
  ) {
    super(message, "CAPTCHA_ERROR", false);
    this.name = "CaptchaError";
  }
}

/**
 * 数据提取错误
 */
export class ExtractionError extends CrawlerError {
  constructor(
    message: string,
    public readonly selector?: string
  ) {
    super(message, "EXTRACTION_ERROR", false);
    this.name = "ExtractionError";
  }
}

/**
 * 配置错误
 */
export class ConfigurationError extends CrawlerError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR", false);
    this.name = "ConfigurationError";
  }
}
