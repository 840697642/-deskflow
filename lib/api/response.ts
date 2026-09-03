import { NextResponse } from 'next/server'
import type { ApiErrorResponse, ApiSuccess } from '@/lib/types/common'

export function createRequestId(): string {
  return `req_mock_${crypto.randomUUID()}`
}

export function requestIdFrom(request: Request): string {
  return request.headers.get('x-request-id')?.trim() || createRequestId()
}

function responseHeaders(): HeadersInit {
  return { 'Cache-Control': 'no-store' }
}

export function successBody<T>(
  request: Request,
  data: T,
  options: { status?: number; total?: number; requestId?: string } = {},
): ApiSuccess<T> {
  return {
    data,
    requestId: options.requestId ?? requestIdFrom(request),
    schemaVersion: '1.0',
    timestamp: new Date().toISOString(),
    ...(options.total === undefined ? {} : { total: options.total }),
  }
}

export function jsonSuccess<T>(
  request: Request,
  data: T,
  options: { status?: number; total?: number; requestId?: string } = {},
): NextResponse<ApiSuccess<T>> {
  const body = successBody(request, data, options)
  return NextResponse.json(body, { status: options.status ?? 200, headers: responseHeaders() })
}

export function jsonStoredSuccess<T>(body: ApiSuccess<T>, status: number): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(body, { status, headers: responseHeaders() })
}

export function jsonError(
  request: Request,
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  details: Record<string, unknown> = {},
  requestId = requestIdFrom(request),
): NextResponse<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    error: { code, message, retryable, ...(Object.keys(details).length > 0 ? { details } : {}) },
    requestId,
    schemaVersion: '1.0',
    timestamp: new Date().toISOString(),
  }
  return NextResponse.json(body, { status, headers: responseHeaders() })
}

export async function readJson(request: Request): Promise<{ value?: unknown; error?: string }> {
  try {
    const text = await request.text()
    if (text.trim().length === 0) return { value: {} }
    return { value: JSON.parse(text) as unknown }
  } catch {
    return { error: '请求体不是有效的 JSON' }
  }
}
