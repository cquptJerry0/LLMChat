
/**
 * 业务错误码
 */
export const BusinessErrorCode = {
  INVALID_STATE: 'INVALID_STATE',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  STREAM_ERROR: 'STREAM_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_INPUT: 'INVALID_INPUT',
  OPERATION_FAILED: 'OPERATION_FAILED'
} as const;

/**
 * API错误
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 响应解析错误
 */
export class ResponseParseError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'ResponseParseError';
  }
}

/**
 * 业务错误
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public data?: any
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

/**
 * 统一App错误
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly type: string,
    public readonly code: string,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * API错误
 */
export function handleApiError(error: unknown): ApiError {
  // 已经是ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // 处理AbortError
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('请求已取消', undefined, 'REQUEST_ABORTED');
  }

  // 其他错误
  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('未知错误');
}

/**
 * 创建业务错误
 */
export function createBusinessError(code: string, message: string, data?: any): BusinessError {
  return new BusinessError(message, code, data);
}

/**
 * 创建解析错误
 */
export function createParseError(message: string, originalError?: unknown): ResponseParseError {
  return new ResponseParseError(message, originalError);
}

/**
 * 简单错误处理函数
 */
export function handleError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error(typeof error === 'string' ? error : '未知错误');
}
