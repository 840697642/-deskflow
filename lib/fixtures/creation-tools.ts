import type { AcceptInboxPayload, InboxItem, StudioCardModel, ToolConnection, ToolTimeDay, UsageRecord } from '@/lib/types/creation-tools'

const now = new Date()
const iso = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000).toISOString()
const day = now.toISOString().slice(0, 10)
const previousDay = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10)

export const mockToolConnections: ToolConnection[] = [
  { toolId: 'video', status: 'connected', version: '1.2.3', endpoint: 'ws://localhost:3001', lastSeen: iso(1) },
  { toolId: 'game', status: 'connected', version: '0.9.1', endpoint: 'ws://localhost:3002', lastSeen: iso(2) },
  { toolId: 'app', status: 'offline', version: '2.0.0-beta', lastSeen: iso(125) },
]

const card = (toolId: StudioCardModel['toolId'], kind: StudioCardModel['kind'], id: string, title: string, status: StudioCardModel['status'], extra: Partial<StudioCardModel> = {}): StudioCardModel => ({
  id, toolId, kind, title, status, meta: [{ label: '项目', value: toolId === 'video' ? '山海拾遗' : toolId === 'game' ? '星尘塔防' : '轻记账' }], updatedAt: iso(10), deepLink: `trimode://${toolId}/${kind}/${id}`, ...extra,
})

export const mockStudioCards: StudioCardModel[] = [
  card('video', 'script', 'vid-script-1', '第 4 集剧本', 'running', { subtitle: 'AI 初稿已生成', progress: 70, planable: true, meta: [{ label: '字数', value: '4,820' }, { label: '待审', value: '3 处', tone: 'warning' }] }),
  card('video', 'storyboard', 'vid-story-1', '第 3 集分镜', 'running', { subtitle: '24 个镜头', progress: 75, planable: true, errorable: true, meta: [{ label: '已渲染', value: '18 / 24' }, { label: '失败', value: '1', tone: 'danger' }] }),
  card('video', 'director', 'vid-director-1', '导演台 · 山海拾遗', 'blocked', { subtitle: '等待审核', planable: true, meta: [{ label: '队列', value: '2 渲染 · 1 排队' }, { label: '状态', value: '等待审核', tone: 'warning' }] }),
  card('game', 'engine', 'game-engine-1', 'HarmonyOS NEXT SDK', 'done', { subtitle: 'API 12', meta: [{ label: '版本', value: '5.0.0.25' }] }),
  card('game', 'issue', 'game-issue-1', 'ArkTS @Link 跨层传递报错', 'failed', { subtitle: 'TS2322', planable: true, errorable: true, meta: [{ label: '严重度', value: '高', tone: 'danger' }, { label: '出现次数', value: '3 次' }] }),
  card('game', 'milestone', 'game-milestone-1', 'v0.3 关卡 1-10', 'running', { subtitle: '数值平衡测试', progress: 70, planable: true, meta: [{ label: '完成', value: '7 / 10' }] }),
  card('app', 'bug', 'app-bug-1', 'LedgerService 跨月汇总错误', 'failed', { subtitle: 'TypeError: sum of undefined', planable: true, errorable: true, meta: [{ label: '严重度', value: '严重', tone: 'danger' }, { label: '影响', value: '12 用户' }] }),
  card('app', 'build', 'app-build-1', 'HAP 签名 v1.2.5', 'done', { subtitle: '发布构建', progress: 100, meta: [{ label: '环境', value: 'release' }] }),
  card('app', 'dependency', 'app-dep-1', '@ohos/axios 安全更新', 'draft', { subtitle: '3.2.1 → 3.2.2', planable: true, meta: [{ label: '优先级', value: '中', tone: 'warning' }] }),
]

export const mockInboxItems: InboxItem[] = [
  { id: 'inbox-1', toolId: 'video', type: 'issue', title: 'S03-C09 雨夜镜头被内容策略拦截', note: '已重试 2 次', priority: 'high', project: '山海拾遗', refUrl: 'trimode://video/storyboard/ep3#c09', createdAt: iso(25), status: 'pending' },
  { id: 'inbox-2', toolId: 'game', type: 'idea', title: 'Boss 战粒子改为 GPU Instancing', project: '星尘塔防', refUrl: 'trimode://game/issue/1042', createdAt: iso(38), status: 'pending' },
  { id: 'inbox-3', toolId: 'app', type: 'task', title: '升级 @ohos/axios 并回归导出功能', priority: 'high', project: '轻记账', refUrl: 'trimode://app/deps/axios', createdAt: iso(60), status: 'pending' },
  { id: 'inbox-4', toolId: 'video', type: 'idea', title: '第 5 集尝试用 veo-3 做开场长镜头', project: '山海拾遗', createdAt: iso(1_440), status: 'pending' },
]

export const mockUsageRecords: UsageRecord[] = Array.from({ length: 12 }, (_, i) => ({
  id: `usage-${i + 1}`, toolId: (['video', 'game', 'app'] as const)[i % 3], model: i % 3 === 1 ? 'ollama/qwen2.5-coder:14b' : i % 3 === 0 ? 'kling-v2.1' : 'anthropic/claude-sonnet-4.5', project: i % 3 === 0 ? '山海拾遗' : i % 3 === 1 ? '星尘塔防' : '轻记账', tokensIn: i % 3 === 0 ? 0 : 1_500 + i * 250, tokensOut: i % 3 === 0 ? 0 : 500 + i * 100, cost: i % 3 === 1 ? 0 : Number((1.2 + i * 0.7).toFixed(2)), day: i < 8 ? day : previousDay, createdAt: iso(i * 45),
}))

export const mockToolTimeDays: ToolTimeDay[] = Array.from({ length: 7 }, (_, i) => ({ day: new Date(now.getTime() - i * 86_400_000).toISOString().slice(0, 10), label: i === 0 ? '今' : `${i} 天前`, minutes: { video: 60 + i * 15, game: 40 + i * 10, app: 30 + i * 8 } }))

export const mockPlanCards: Array<AcceptInboxPayload & { id: string; title: string; description?: string; tags: string[]; source: string; sourceId: string; createdAt: string }> = []
