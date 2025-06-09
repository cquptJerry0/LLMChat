// src/services/api/errorHandler.ts
import axios, { AxiosError } from 'axios'

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

export function handleApiError(error: any): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError

    if (axiosError.response) {
      // 服务器返回了错误状态码
      const status = axiosError.response.status
      const data = axiosError.response.data as any

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
  return new ApiError(
    error?.message || '未知错误',
    undefined,
    'UNKNOWN_ERROR'
  )
}