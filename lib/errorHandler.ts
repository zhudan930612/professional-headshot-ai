interface JsonResponse {
  status(code: number): JsonResponse;
  json(body: unknown): void;
}

/**
 * 自定义API错误类
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 统一错误处理函数
 * @param error 错误对象
 * @param res Vercel响应对象
 */
export function handleAPIError(error: unknown, res: JsonResponse): void {
  console.error('[Error Handler]', error instanceof Error ? error.name : 'UnknownError');

  // 处理自定义API错误
  if (error instanceof APIError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  // 处理认证错误
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return;
  }

  // 处理未知错误
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}

/**
 * 常用错误工厂函数
 */
export const Errors = {
  unauthorized: () => new APIError(401, 'UNAUTHORIZED', 'Authentication required'),
  forbidden: () => new APIError(403, 'FORBIDDEN', 'Access denied'),
  notFound: (resource: string) => new APIError(404, 'NOT_FOUND', `${resource} not found`),
  badRequest: (message: string) => new APIError(400, 'BAD_REQUEST', message),
  quotaExceeded: () => new APIError(429, 'QUOTA_EXCEEDED', 'Quota exceeded'),
  internalError: (message?: string) => new APIError(500, 'INTERNAL_ERROR', message || 'Internal server error'),
};
