import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'
import type { ToolId } from '@/lib/types/creation-tools'
const tools: ToolId[] = ['video', 'game', 'app']
export async function GET(request: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params
  if (!tools.includes(tool as ToolId)) return jsonError(request, 400, 'INVALID_TOOL', `未知的工具类型: ${tool}`, false)
  const connection = getMockStore().toolConnections.find((item) => item.toolId === tool)
  if (!connection) return jsonError(request, 404, 'NOT_FOUND', `工具 ${tool} 未找到连接记录`, false)
  return jsonSuccess(request, { ...connection, status: Date.now() - Date.parse(connection.lastSeen) > 30_000 ? 'offline' : connection.status })
}
