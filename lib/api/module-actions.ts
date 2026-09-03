import { NextRequest } from 'next/server'
import { jsonError, jsonStoredSuccess, readJson, requestIdFrom, successBody } from '@/lib/api/response'
import { getMockStore, getMutation, mutationKey, saveMutation } from '@/lib/mock-store'
import { validateReconnectModule } from '@/lib/state/validators'
import { ModuleHealthStatus, type ModuleHealth } from '@/lib/types/module'

export async function handleModuleReconnect(request: NextRequest, id: string) {
  const requestId = requestIdFrom(request)
  const body = await readJson(request)
  if (body.error) return jsonError(request, 400, 'INVALID_JSON', body.error, false, {}, requestId)
  const parsed = validateReconnectModule(body.value, requestId)
  if (parsed.error || !parsed.value) {
    return jsonError(request, 400, 'INVALID_REQUEST', parsed.error?.message ?? '请求体无效', false, parsed.error?.details ?? {}, requestId)
  }

  const store = getMockStore()
  const module = store.modules.find((item) => item.id === id)
  if (!module) return jsonError(request, 404, 'MODULE_NOT_FOUND', '模块不存在', false, { moduleId: id }, requestId)
  if (!module.canReconnect && !module.canStart && module.status !== ModuleHealthStatus.HEALTHY) {
    return jsonError(request, 409, 'MODULE_RECONNECT_UNAVAILABLE', '该模块当前不支持重新连接', false, { moduleId: id, status: module.status }, requestId)
  }

  const actor = parsed.value.actor ?? 'mock-user'
  const mutationId = parsed.value.clientMutationId ?? requestId
  const key = mutationKey(`modules:reconnect:${id}:${actor}`, mutationId)
  const previous = getMutation(store, key)
  if (previous) return jsonStoredSuccess(previous.body, previous.status)

  const now = new Date().toISOString()
  const updated: ModuleHealth = {
    ...module,
    status: ModuleHealthStatus.HEALTHY,
    statusText: '已重新连接 · 刚刚',
    lastHeartbeat: now,
    canReconnect: false,
    canStart: false,
    errorMessage: undefined,
  }
  store.modules[store.modules.indexOf(module)] = updated
  const responseBody = successBody(request, updated, { requestId })
  saveMutation(store, key, 200, responseBody)
  return jsonStoredSuccess(responseBody, 200)
}
