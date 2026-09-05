import {
  AppWindow,
  BookOpen,
  Clapperboard,
  FolderKanban,
  Gamepad2,
  HardDrive,
  History,
  KanbanSquare,
  LayoutDashboard,
  ListTodo,
  ScrollText,
  Settings,
  Sparkles,
} from 'lucide-react'
import type {
  NavSection,
  Job,
  Service,
  Project,
  Announcement,
  KnowledgeDoc,
  PlanCard,
} from '../../components/workbench/types'

// =============================================================================
// 导航
// =============================================================================

export const MOCK_NAV: NavSection[] = [
  {
    title: '工作空间',
    items: [
      { id: 'workbench', label: '今日焦点', icon: LayoutDashboard },
      { id: 'queue', label: '任务队列', icon: ListTodo, badge: 4 },
      { id: 'plan', label: '计划看板', icon: KanbanSquare },
      { id: 'projects', label: '项目', icon: FolderKanban },
      { id: 'services', label: '服务', icon: HardDrive },
    ],
  },
  {
    title: '创作工具',
    items: [
      { id: 'video', label: 'AI 视频', icon: Clapperboard },
      { id: 'game', label: '鸿蒙游戏', icon: Gamepad2 },
      { id: 'app', label: '应用开发', icon: AppWindow },
      { id: 'knowledge', label: '知识库', icon: BookOpen },
      { id: 'skills', label: '技能', icon: Sparkles },
    ],
  },
  {
    title: '系统',
    items: [
      { id: 'logs', label: '日志', icon: ScrollText },
      { id: 'settings', label: '设置', icon: Settings },
      { id: 'changelog', label: '开发日志', icon: History },
    ],
  },
]

// =============================================================================
// 任务
// =============================================================================

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1042',
    name: '《山海拾遗》第 3 集分镜渲染',
    project: '山海拾遗',
    domain: 'video',
    status: 'running',
    step: '渲染镜头 14 / 22',
    progress: 63,
    heartbeat: '8 秒前',
    startedAt: '10:42',
    eta: '11:40',
    logs: [
      '[10:42:03] 任务开始，加载分镜脚本 v7',
      '[10:44:18] 镜头 01-08 渲染完成',
      '[10:51:02] 镜头 09-13 渲染完成',
      '[10:57:40] 正在渲染镜头 14，采样步数 30/50',
    ],
  },
  {
    id: 'job-1041',
    name: '鸿蒙 ArkTS 编译 · 关卡编辑器',
    project: '星尘塔防',
    domain: 'game',
    status: 'waiting_input',
    step: '等待选择签名证书',
    heartbeat: '2 分钟前',
    startedAt: '10:31',
    note: '需要选择用于 HAP 包签名的证书后才能继续。',
    logs: ['[10:31:10] hvigor 构建开始', '[10:36:55] 构建完成，等待签名证书'],
  },
  {
    id: 'job-1040',
    name: '知识库向量化 · 鸿蒙 API 文档',
    project: '共享知识库',
    domain: 'knowledge',
    status: 'paused',
    step: '已处理 1,280 / 3,400 个片段',
    progress: 38,
    heartbeat: '14 分钟前',
    heartbeatStale: true,
    startedAt: '09:58',
    note: '由用户手动暂停。',
    logs: ['[09:58:00] 开始切分文档', '[10:12:31] 已写入 1,280 个向量', '[10:12:35] 用户暂停任务'],
  },
  {
    id: 'job-1039',
    name: '云端配音合成 · 第 2 集旁白',
    project: '山海拾遗',
    domain: 'video',
    status: 'permission_required',
    step: '等待授权云 TTS 服务',
    heartbeat: '—',
    startedAt: '10:20',
    note: '云 TTS 访问令牌已过期，请重新授权后任务将自动继续。',
    logs: ['[10:20:12] 提交合成请求', '[10:20:13] 401：访问令牌已过期'],
  },
  {
    id: 'job-1038',
    name: '记账应用 · 单元测试',
    project: '轻记账',
    domain: 'app',
    status: 'failed',
    step: '3 个测试失败',
    progress: 100,
    heartbeat: '26 分钟前',
    startedAt: '09:40',
    note: 'LedgerService.spec.ts 断言失败，查看日志了解详情。',
    logs: [
      '[09:40:02] 运行 128 个测试用例',
      '[09:46:10] ✕ LedgerService › 应正确汇总月度支出',
      '[09:46:11] 测试结束：125 通过，3 失败',
    ],
  },
  {
    id: 'job-1037',
    name: '技能「分镜脚本生成」评估',
    project: '技能库',
    domain: 'skill',
    status: 'queued',
    step: '排队中 · 第 2 位',
    heartbeat: '—',
    startedAt: '—',
    logs: [],
  },
  {
    id: 'job-1036',
    name: '资产导出 · 角色贴图打包',
    project: '星尘塔防',
    domain: 'game',
    status: 'success',
    step: '已导出 42 个文件',
    progress: 100,
    heartbeat: '1 小时前',
    startedAt: '08:55',
    logs: ['[08:55:00] 开始打包', '[09:02:14] 导出完成，共 42 个文件 (186 MB)'],
  },
  {
    id: 'job-loading',
    name: '',
    project: '',
    domain: 'chat',
    status: 'loading',
    step: '',
    heartbeat: '',
    startedAt: '',
    logs: [],
  },
]

// =============================================================================
// 服务
// =============================================================================

export const MOCK_SERVICES: Service[] = [
  { id: 'svc-1', name: '本地渲染引擎', scope: 'local', status: 'online', detail: 'GPU 使用率 72% · 显存 9.4 / 12 GB' },
  {
    id: 'svc-2',
    name: 'DevEco 构建服务',
    scope: 'local',
    status: 'offline',
    detail: '未检测到进程。请启动 DevEco Studio 后重连。',
    actionLabel: '重新连接',
  },
  { id: 'svc-3', name: '本地模型 (Ollama)', scope: 'local', status: 'degraded', detail: '响应延迟 4.8s，高于 2s 阈值' },
  {
    id: 'svc-4',
    name: '云端 TTS',
    scope: 'cloud',
    status: 'permission_required',
    detail: '访问令牌已过期，需要重新授权。',
    actionLabel: '重新授权',
  },
  { id: 'svc-5', name: '云端对话模型', scope: 'cloud', status: 'online', detail: '今日已用 38,200 tokens' },
  { id: 'svc-6', name: '对象存储同步', scope: 'cloud', status: 'loading', detail: '正在检查连接…' },
]

// =============================================================================
// 项目
// =============================================================================

export const MOCK_PROJECTS: Project[] = [
  { id: 'p-1', name: '山海拾遗', domain: 'video', updatedAt: '刚刚', activeJobs: 2 },
  { id: 'p-2', name: '星尘塔防', domain: 'game', updatedAt: '5 分钟前', activeJobs: 1 },
  { id: 'p-3', name: '轻记账', domain: 'app', updatedAt: '26 分钟前', activeJobs: 0 },
  { id: 'p-4', name: '共享知识库', domain: 'knowledge', updatedAt: '14 分钟前', activeJobs: 1 },
]

// =============================================================================
// 公告
// =============================================================================

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a-1', text: '本周六 02:00–04:00 云端渲染集群例行维护，期间云渲染任务将自动排队。', tone: 'warning', pinned: true, publishedAt: '今天 09:00' },
  { id: 'a-2', text: '鸿蒙 NEXT API 12 文档已同步至知识库，向量化完成后即可检索。', tone: 'info', pinned: true, publishedAt: '昨天 18:30' },
  { id: 'a-3', text: '新技能「分镜脚本生成 v2」已上线，支持多角色对白。', tone: 'success', pinned: false, publishedAt: '昨天 14:00' },
  { id: 'a-4', text: '本地模型 Ollama 建议升级到 0.6.x 以修复长上下文延迟问题。', tone: 'info', pinned: false, publishedAt: '3 天前' },
]

// =============================================================================
// 知识库文档
// =============================================================================

export const MOCK_DOCS: KnowledgeDoc[] = [
  { id: 'd-1', title: '鸿蒙 ArkTS 编码规范 v3', kind: 'doc', project: '共享知识库', updatedAt: '2 小时前', size: '48 KB', pinned: true },
  { id: 'd-2', title: '《山海拾遗》世界观设定集', kind: 'doc', project: '山海拾遗', updatedAt: '昨天', size: '1.2 MB', pinned: true },
  { id: 'd-3', title: 'HAP 签名与发布流程', kind: 'doc', project: '星尘塔防', updatedAt: '3 天前', size: '22 KB', pinned: true },
  { id: 'd-4', title: 'LedgerService 测试用例矩阵', kind: 'sheet', project: '轻记账', updatedAt: '26 分钟前', size: '96 KB', pinned: false },
  { id: 'd-5', title: '分镜提示词模板库', kind: 'code', project: '技能库', updatedAt: '5 小时前', size: '14 KB', pinned: false },
  { id: 'd-6', title: '云 TTS 音色对照表', kind: 'sheet', project: '山海拾遗', updatedAt: '1 周前', size: '31 KB', pinned: false },
]

// =============================================================================
// 计划看板
// =============================================================================

export const MOCK_PLAN: PlanCard[] = [
  { id: 'pl-1', title: '第 4 集分镜脚本定稿', project: '山海拾遗', domain: 'video', due: '9 月 5 日', priority: 'high', column: 'todo' },
  { id: 'pl-2', title: '接入华为账号登录', project: '轻记账', domain: 'app', due: '9 月 8 日', priority: 'medium', column: 'todo' },
  { id: 'pl-3', title: '技能评估基准集扩充', project: '技能库', domain: 'skill', due: '9 月 12 日', priority: 'low', column: 'todo' },
  { id: 'pl-4', title: '关卡编辑器 HAP 签名发布', project: '星尘塔防', domain: 'game', due: '9 月 3 日', priority: 'high', column: 'doing' },
  { id: 'pl-5', title: '鸿蒙 API 文档向量化', project: '共享知识库', domain: 'knowledge', due: '9 月 4 日', priority: 'medium', column: 'doing' },
  { id: 'pl-6', title: '第 3 集分镜渲染', project: '山海拾遗', domain: 'video', due: '9 月 2 日', priority: 'high', column: 'doing' },
  { id: 'pl-7', title: '角色贴图资产打包', project: '星尘塔防', domain: 'game', due: '9 月 1 日', priority: 'medium', column: 'done' },
  { id: 'pl-8', title: '第 2 集旁白脚本', project: '山海拾遗', domain: 'video', due: '8 月 30 日', priority: 'low', column: 'done' },
]
