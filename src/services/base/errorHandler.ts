import axios, { AxiosError } from 'axios'

export interface ApiErrorResponse {
  message?: string;
  code?: string;
  [key: string]: any;
}

/**
 * API错误基类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public data?: any
  ) {
    super(message)
    this.name = 'BusinessError'
  }
}

/**
 * 网络请求错误处理函数
 * 专门处理网络层面的错误，如连接失败、超时等
 */
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>

    if (axiosError.response) {
      // 服务器返回了错误状态码
      const status = axiosError.response.status
      const data = axiosError.response.data

      return new ApiError(
        data?.message || `请求失败 (${status})`,
        status,
        data?.code,
        axiosError.response
      )
    } else if (axiosError.request) {
      // 请求已发送但未收到响应
      return new ApiError('网络连接失败，请检查网络', undefined, 'NETWORK_ERROR')
    }
  }

  // 其他错误
  if (error instanceof Error) {
    return new ApiError(
      error.message,
      undefined,
      'UNKNOWN_ERROR'
    )
  }

  return new ApiError(
    '未知错误',
    undefined,
    'UNKNOWN_ERROR'
  )
}

/**
 * 创建业务错误
 */
export function createBusinessError(code: string, message: string, data?: any): BusinessError {
  return new BusinessError(message, code, data)
}

/**
 * 常见业务错误代码
 */
export enum BusinessErrorCode {
  INVALID_STATE = 'INVALID_STATE',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  STREAM_ERROR = 'STREAM_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_INPUT = 'INVALID_INPUT',
  OPERATION_FAILED = 'OPERATION_FAILED'
}
