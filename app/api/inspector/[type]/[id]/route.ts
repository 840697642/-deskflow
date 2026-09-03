import { NextRequest } from 'next/server'
import { jsonError, jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

type InspectorType = 'task' | 'job' | 'module' | 'conversation' | 'artifact'

export async function GET(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await context.params
  const store = getMockStore()
  const item = type === 'task'
    ? store.tasks.find((entry) => entry.id === id)
    : type === 'job'
      ? store.jobs.find((entry) => entry.id === id)
      : type === 'module'
        ? store.modules.find((entry) => entry.id === id)
        : type === 'conversation'
          ? store.conversations.find((entry) => entry.id === id)
          : type === 'artifact'
            ? store.artifacts.find((entry) => entry.id === id)
            : undefined

  if (!item || !['task', 'job', 'module', 'conversation', 'artifact'].includes(type)) {
    return jsonError(request, 404, 'INSPECTOR_ITEM_NOT_FOUND', 'Inspector 对象不存在', false, { type, id })
  }
  return jsonSuccess(request, { type: type as InspectorType, id, item })
}
