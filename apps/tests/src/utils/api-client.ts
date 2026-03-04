export interface ApiClientOptions {
  baseUrl: string
  headers?: Record<string, string>
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
  headers?: Record<string, string>
  params?: Record<string, string | number | undefined>
}

export class ApiClient {
  private baseUrl: string
  private headers: Record<string, string>

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    let url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.set(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    return url
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<{ data: T; status: number }> {
    const { method = 'GET', body, headers, params } = options
    const url = this.buildUrl(path, params)

    const response = await fetch(url, {
      method,
      headers: {
        ...this.headers,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(response.status, data)
    }

    return { data, status: response.status }
  }

  get<T>(path: string, params?: Record<string, string | number | undefined>) {
    return this.request<T>(path, { method: 'GET', params })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body })
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body })
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PATCH', body })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' })
  }
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(status: number, data: unknown) {
    super(`API Error: ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Create API client for testing
 */
export function createApiClient(baseUrl: string = process.env.E2E_API_URL || 'http://localhost:3001') {
  return new ApiClient({ baseUrl })
}
