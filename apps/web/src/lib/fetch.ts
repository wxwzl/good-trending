/**
 * 基础 HTTP 客户端
 * 封装 fetch API，统一处理错误
 */

/**
 * 获取 API 基础 URL
 * 服务端渲染使用 API_URL (Docker 容器内访问主机)
 * 客户端使用 NEXT_PUBLIC_API_URL
 */
const getApiBaseUrl = (): string => {
  // 服务端渲染 (Node.js 环境) - 需要完整 URL
  if (typeof window === "undefined") {
    return process.env.API_URL || "http://localhost:3015/api/v1";
  }
  // 浏览器环境 - 使用相对路径，通过 Next.js rewrite 代理到后端
  return process.env.NEXT_PUBLIC_API_URL || "/backend/api/v1";
};

export interface FetchOptions extends RequestInit {
  locale?: string;
  next?: {
    revalidate?: number; // Next.js revalidate (秒)
  };
}

/**
 * API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 发送 API 请求
 * @param endpoint API 端点路径
 * @param options 请求选项
 * @returns 响应数据
 * @throws ApiError 请求失败时抛出
 */
export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { locale = "en", ...fetchOptions } = options;

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  // 构建请求选项
  const requestInit: RequestInit = {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": locale,
      ...fetchOptions.headers,
    },
  };

  const response = await fetch(url, {
    ...requestInit,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
    throw new ApiError(errorData.message || `HTTP ${response.status}`, response.status, response);
  }

  const data = await response.json();
  // 兼容后端直接返回数据包装在 data 字段中的情况
  return data.data || data;
}
