import { NextResponse } from "next/server";

/**
 * API 健康检查响应
 */
interface ApiHealthResponse {
  status: "ok" | "error" | "unreachable";
  latency?: number;
  error?: string;
}

/**
 * 前端健康检查响应
 */
interface HealthCheckResponse {
  status: "ok" | "error" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    api: ApiHealthResponse;
    frontend: {
      status: "ok";
    };
  };
}

/**
 * 检查 API 服务健康状态
 */
async function checkApiHealth(): Promise<ApiHealthResponse> {
  const apiBaseUrl = process.env.API_URL || "http://localhost:3015";

  try {
    const start = Date.now();
    const response = await fetch(`${apiBaseUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      // 设置超时时间
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - start;

    if (response.ok) {
      return {
        status: "ok",
        latency,
      };
    }

    return {
      status: "error",
      latency,
      error: `API returned status ${response.status}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        return {
          status: "unreachable",
          error: "API request timeout",
        };
      }
      return {
        status: "unreachable",
        error: error.message,
      };
    }

    return {
      status: "unreachable",
      error: "Unknown error",
    };
  }
}

/**
 * 前端健康检查 API
 *
 * GET /api/health
 *
 * 返回前端服务和 API 服务的健康状态
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  // 并行检查 API 服务
  const apiHealth = await checkApiHealth();

  // 计算整体状态
  let overallStatus: "ok" | "error" | "degraded" = "ok";

  if (apiHealth.status === "unreachable") {
    overallStatus = "degraded"; // API 不可达时降级，前端仍可提供静态内容
  } else if (apiHealth.status === "error") {
    overallStatus = "degraded";
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 0,
    version: process.env.npm_package_version || "1.0.0",
    services: {
      api: apiHealth,
      frontend: {
        status: "ok",
      },
    },
  });
}
