'use strict'

const assert = require('node:assert/strict')
const api = require('./api-client.ts')
const { TaskStatus } = require('./types/task.ts')
const { JobStatus } = require('./types/job.ts')

const task = { id: 'task-1', title: '测试任务', status: 'todo', priority: 'medium', module: '测试', estimatedTime: '30 分钟', projectId: 'project-tri-mode', createdAt: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z' }
const job = { id: 'job-1', title: '测试作业', type: 'TEST', status: 'running', progress: 10, lastHeartbeat: '2026-09-03T00:00:00Z', updatedAt: '2026-09-03T00:00:00Z', module: '测试', projectId: 'project-tri-mode', canRetry: true, logs: [] }
const moduleHealth = { id: 'module-1', name: '测试模块', status: 'healthy', statusText: '正常', lastHeartbeat: '2026-09-03T00:00:00Z', canReconnect: false, canStart: false }
const inputRequirement = { jobId: 'job-5', prompt: '请选择视频导出格式', type: 'select', options: ['MP4 (H.264)', 'WebM (VP9)'], defaultValue: 'MP4 (H.264)', validation: { required: true } }
const authRequirement = { id: 'job-6', type: 'job', title: '推送到 GitHub', provider: 'github', requiredScopes: ['repo', 'workflow'], authUrl: 'http://localhost:3000/auth/mock', description: '需要访问 GitHub' }
const authResponse = { success: true, message: 'GitHub 授权成功，任务已继续' }
const knowledgeDoc = { id: 'doc-3', title: 'API 对接清单', type: 'spreadsheet', path: '/sheets/api-checklist.xlsx', size: '45 KB', updatedAt: '2026-09-03T09:20:00Z', pinned: false, tags: ['API'], previewText: '后端 API 开发进度跟踪表', icon: 'FileSpreadsheet' }
const conversation = { id: 'conversation-1', title: '测试会话', tool: 'Claude Code', model: 'test', status: 'verified', updatedAt: '2026-09-03T00:00:00Z' }
const artifact = { id: 'artifact-1', name: '测试产物', type: 'markdown', status: 'ready', updatedAt: '2026-09-03T00:00:00Z' }
const summary = { tasks: { total: 1, open: 1, completed: 0 }, jobs: { total: 1, active: 1 }, modules: { total: 1, healthy: 1, attention: 0 }, needsAttention: [], recentConversations: [conversation], recentArtifacts: [artifact] }

const ok = (data) => new Response(JSON.stringify({ data, requestId: 'req-test', schemaVersion: '1.0', timestamp: '2026-09-03T00:00:00Z' }), { status: 200 })

async function main() {
  const calls = []
  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    const path = new URL(url).pathname
    calls.push({ url, init })
    if (path === '/api/tasks' && init.method === 'POST') return ok(task)
    if (path === '/api/tasks/task-1/complete' || path === '/api/tasks/task-1') return ok(task)
    if (path === '/api/tasks') return ok([task])
    if (path === '/api/jobs' && (!init.method || init.method === 'GET')) return ok([job])
    if (path === '/api/jobs/job-1') return ok(job)
    if (path.startsWith('/api/jobs/job-1/')) return ok(job)
    if (path === '/api/jobs/job-5/input-requirements') return ok(inputRequirement)
    if (path === '/api/jobs/job-5/input') return ok({ ...job, id: 'job-5', status: 'running' })
    if (path === '/api/auth/requirements/job/job-6') return ok(authRequirement)
    if (path === '/api/auth/callback' && init.method === 'POST') return ok(authResponse)
    if (path === '/api/modules' || path === '/api/modules/health') return ok([moduleHealth])
    if (path === '/api/modules/module-1/reconnect' || path === '/api/modules/module-1') return ok(moduleHealth)
    if (path === '/api/workbench/summary') return ok(summary)
    if (path === '/api/conversations' || path === '/api/artifacts') return ok(path.endsWith('conversations') ? [conversation] : [artifact])
    if (path === '/api/knowledge/docs' && (!init.method || init.method === 'GET')) {
      const query = new URL(url).searchParams
      if (query.get('limit') === '2' && query.get('pinned') === 'true') return ok([knowledgeDoc])
      return ok([knowledgeDoc])
    }
    if (path === '/api/knowledge/docs/doc-3/pin' && init.method === 'POST') return ok({ ...knowledgeDoc, pinned: true })
    if (path.startsWith('/api/inspector/')) return ok({ type: 'task', id: task.id, item: task })
    throw new Error(`unhandled test URL: ${url}`)
  }
  const options = { baseUrl: 'http://localhost:3000', fetchImpl }

  assert.deepEqual(await api.fetchTasks({ status: TaskStatus.TODO, projectId: 'project-tri-mode' }, options), [task])
  assert.deepEqual(await api.fetchTask(task.id, options), task)
  assert.deepEqual(await api.createTask({ title: '新任务', module: '测试' }, options), task)
  assert.deepEqual(await api.completeTask(task.id, { actor: 'test-actor', clientMutationId: 'fixed-id', schemaVersion: '1.0', projectId: 'project-test' }, options), task)
  assert.deepEqual(await api.updateTask(task.id, { title: '更新' }, options), task)
  assert.deepEqual(await api.fetchJobs({ status: JobStatus.RUNNING, module: '测试' }, options), [job])
  assert.deepEqual(await api.fetchJob(job.id, options), job)
  assert.deepEqual(await api.pauseJob(job.id, undefined, options), job)
  assert.deepEqual(await api.resumeJob(job.id, undefined, options), job)
  assert.deepEqual(await api.cancelJob(job.id, undefined, options), job)
  assert.deepEqual(await api.retryJob(job.id, undefined, options), job)
  assert.deepEqual(await api.controlJob(job.id, 'pause', undefined, options), job)
  assert.deepEqual(await api.fetchInputRequirements('job-5', options), inputRequirement)
  assert.deepEqual((await api.submitJobInput('job-5', 'MP4 (H.264)', undefined, options)).status, 'running')
  assert.deepEqual(await api.fetchAuthRequirements('job', 'job-6', options), authRequirement)
  assert.deepEqual(await api.submitAuthCallback({ type: 'job', id: 'job-6', code: 'oauth-code', provider: 'github' }, undefined, options), authResponse)
  assert.deepEqual(await api.fetchModules(options), [moduleHealth])
  assert.deepEqual(await api.fetchModuleHealth(options), [moduleHealth])
  assert.deepEqual(await api.fetchModule(moduleHealth.id, options), moduleHealth)
  assert.deepEqual(await api.reconnectModule(moduleHealth.id, undefined, options), moduleHealth)
  assert.deepEqual(await api.fetchWorkbenchSummary(options), summary)
  assert.deepEqual(await api.fetchConversations(2, options), [conversation])
  assert.deepEqual(await api.fetchArtifacts(2, options), [artifact])
  assert.deepEqual(await api.fetchKnowledgeDocs({ limit: 2, pinned: true }, options), [knowledgeDoc])
  assert.deepEqual((await api.pinKnowledgeDoc('doc-3', true, undefined, options)).pinned, true)
  assert.deepEqual(await api.fetchInspector('task', task.id, options), { type: 'task', id: task.id, item: task })

  const writes = calls.filter(({ init }) => init.method === 'POST' || init.method === 'PATCH')
  assert.equal(writes.length, 12)
  for (const { init } of writes) {
    const body = JSON.parse(init.body)
    assert.equal(body.actor, body.clientMutationId === 'fixed-id' ? 'test-actor' : 'claude-code')
    assert.equal(typeof body.clientMutationId, 'string')
    assert.equal(body.projectId, body.clientMutationId === 'fixed-id' ? 'project-test' : 'project-tri-mode')
    assert.equal(body.schemaVersion, body.clientMutationId === 'fixed-id' ? '1.0' : '1.0')
  }

  const errorFetch = async () => new Response(JSON.stringify({ error: { code: 'TASK_NOT_FOUND', message: '任务不存在', retryable: false, details: { id: 'missing' } }, requestId: 'req-error', schemaVersion: '1.0', timestamp: '2026-09-03T00:00:00Z' }), { status: 404 })
  await assert.rejects(api.fetchTask('missing', { ...options, fetchImpl: errorFetch }), (error) => error instanceof api.ApiError && error.code === 'TASK_NOT_FOUND' && error.retryable === false && error.status === 404)
  const invalidInputFetch = async () => new Response(JSON.stringify({ error: { code: 'INVALID_INPUT_VALUE', message: '输入值无效', retryable: false, details: { field: 'value' } }, requestId: 'req-error', schemaVersion: '1.0', timestamp: '2026-09-03T00:00:00Z' }), { status: 400 })
  await assert.rejects(api.submitJobInput('job-5', '', { clientMutationId: 'invalid-input' }, { ...options, fetchImpl: invalidInputFetch }), (error) => error instanceof api.ApiError && error.code === 'INVALID_INPUT_VALUE' && error.status === 400 && error.details.field === 'value')
  await assert.rejects(api.fetchTasks(undefined, { ...options, fetchImpl: async () => { throw new Error('offline') } }), (error) => error instanceof api.ApiError && error.code === 'NETWORK_ERROR' && error.retryable === true)
  console.log(`api-client: ${calls.length} endpoint calls passed; error mapping passed`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
