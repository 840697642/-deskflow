import type { ChangelogEntry } from './types'

/**
 * 开发日志数据
 * 记录前端每次迭代的改动、数据契约与后端对接要点
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.6',
    date: '9 月 4 日',
    title: '知识库专属界面：空间隔离 / 错题本 / 对话采集',
    summary: '知识库改为独立组件 knowledge-base.tsx：按空间隔离,四个分区(文件 / 错题本 / AI 对话 / 接入采集),文件详情弹窗展示 AI 总结与原文。',
    branch: 'main',
    changes: [
      { kind: 'ui', text: '左栏：空间切换(项目空间 × 3 相互隔离 + 通用空间 × 3)与可折叠目录树；右栏：优先级统计条 + 四个标签页。' },
      { kind: 'interaction', text: '文件列表重点优先排序；悬停出现「归类 / AI 总结 / 重点」；统计条数字可直接跳转对应筛选。' },
      { kind: 'interaction', text: '错题按严重度排序,未解决 → 已解决 → 已归档 单向流转；AI 对话可归档到项目空间。' },
      { kind: 'contract', text: '新增 Space / Folder / File / ErrorEntry / Conversation 五个实体,以及对话采集端点 POST /api/v1/conversations。' },
      { kind: 'rename', text: '旧「置顶文件」概念并入 File.starred(重点)；「置顶」仅保留给公告。' },
    ],
    contracts: [
      {
        entity: 'File',
        fields: [
          { name: 'spaceId', type: "'app' | 'video' | 'game' | 'learning' | 'collect' | 'chat'", note: '所有查询必须带 spaceId,空间之间不可跨查。' },
          { name: 'folderId', type: 'string', note: '目录树按 parentId 递归；前端选中父目录时会展示所有子目录文件,后端请提供 descendants 查询或返回全量目录。' },
          { name: 'starred', type: 'boolean', note: '重点标记,列表默认置顶。' },
          { name: 'aiSummary', type: 'string | null', note: 'AI 清洗后的要点；为 null 表示未清洗。清洗是异步任务,返回 job id,前端走任务队列。' },
          { name: 'status', type: "'inbox' | 'organized'", note: '待整理 / 已归类。上传或采集进入 inbox。' },
          { name: 'tags', type: 'string[]', note: '标签在空间内维护,前端按空间聚合展示。' },
        ],
      },
      {
        entity: 'ErrorEntry',
        fields: [
          { name: 'message', type: 'string', note: '原始报错,保留换行,前端等宽展示。' },
          { name: 'severity', type: "'high' | 'medium' | 'low'", note: '决定排序与圆点颜色。' },
          { name: 'status', type: "'open' | 'solved' | 'archived'", note: '单向流转,archived 可 reopen。' },
          { name: 'occurrences', type: 'number', note: '同一错误再次出现时 +1 而不是新建,去重依据 message 指纹。' },
          { name: 'fromConversationId', type: 'string | null', note: '由对话自动提取时回链原对话。' },
        ],
      },
      {
        entity: 'Conversation',
        fields: [
          { name: 'source', type: "'codex' | 'cursor' | 'trae' | 'claude' | 'custom'", note: '来源工具。' },
          { name: 'sessionId', type: 'string', note: '去重合并键,同 sessionId 多次推送合并为一条。' },
          { name: 'projectHint', type: 'string | null', note: '仓库名 / 工作目录；匹配到项目则 spaceId 归入该项目,否则 chat。' },
          { name: 'summarized', type: 'boolean', note: '是否已生成总结文件。' },
          { name: 'hasError', type: 'boolean', note: '服务端检测堆栈 / HTTP 错误码 / 断言失败后置 true,并生成错题草稿。' },
        ],
      },
    ],
    actions: [
      { action: 'POST /api/v1/conversations  (Bearer API Key)', trigger: 'Codex / Cursor / Trae / Claude Code 会话结束推送', expect: '201 返回 { id, space_id, summary_job_id }；同 sessionId 返回 200 并合并；2 MB 上限；60 次/分钟,超限 429 + Retry-After。' },
      { action: 'MCP: save_conversation · save_error · search_knowledge', trigger: 'AI 工具通过 MCP 调用', expect: 'search_knowledge 需按空间权限过滤,默认只检索当前项目空间 + 通用空间。' },
      { action: 'POST /files/:id/summarize', trigger: '文件行「AI 总结」/ 详情弹窗', expect: '异步；返回 job id；完成后写入 aiSummary 并发通知。' },
      { action: 'PATCH /files/:id  { starred | status | folderId | tags }', trigger: '重点 / 归类 / 移动 / 标签', expect: '前端乐观更新,失败回滚。' },
      { action: 'PATCH /errors/:id  { status }', trigger: '标为已解决 / 归档 / 重新打开', expect: '校验状态流转。' },
      { action: 'PATCH /conversations/:id  { spaceId }', trigger: '「归档到…」下拉', expect: '只能从 chat 归档到项目空间。' },
      { action: 'POST /api-keys/rotate', trigger: '接入采集页「重新生成」', expect: '需二次确认；旧 Key 立即失效。' },
    ],
    cautions: [
      '空间隔离是硬约束：所有 files / errors / conversations 接口都必须校验 spaceId 归属,不能只靠前端筛选。',
      '入库前脱敏(API Key / Token / 邮箱 / 手机号)在服务端执行,前端只展示开关状态。',
      'API Key 只在生成时返回一次明文,之后只返回前 8 位；前端「显示」按钮仅对当前会话缓存有效。',
    ],
  },
  {
    version: 'v0.5',
    date: '9 月 4 日',
    title: '今日焦点首屏 + 视图切换',
    summary: '首屏改为"需要你处理 + 时间线",其余模块由左侧导航切换,不再纵向堆叠。',
    branch: 'main',
    changes: [
      { kind: 'ui', text: '新增「今日焦点」视图,右栏 288px 放置顶文件与置顶公告。' },
      { kind: 'interaction', text: '左侧导航驱动视图切换：任务队列 / 计划看板 / 知识库 / 服务 / 项目各占一屏。' },
      { kind: 'contract', text: '任务新增可选字段 eta(预计完成时间),时间线用它排列运行中任务。' },
      { kind: 'rename', text: '导航「工作台」更名为「今日焦点」,「日志」保留。' },
    ],
    contracts: [{ entity: 'Job', fields: [{ name: 'eta', type: 'string | null', note: '预计完成时间,ISO 8601；前端按本地时区显示 HH:mm。运行中任务缺失时不显示。' }] }],
    actions: [{ action: 'GET /jobs?status=failed,permission_required,waiting_input', trigger: '进入今日焦点', expect: '按紧急度排序：failed > permission_required > waiting_input；heartbeatStale 为 true 的任务也需返回。' }],
    cautions: ['时间分段(今天 / 明天 / 本周)目前由前端按 due 计算,后端返回统一 ISO 日期即可,不要返回"9 月 5 日"这类文案。'],
  },
  {
    version: 'v0.4',
    date: '9 月 3 日',
    title: '弹层体系、跑马灯、看板、知识库',
    summary: '加入 Toast / 确认框 / 公告弹窗三类弹层,新增计划看板与知识库置顶。',
    branch: 'main',
    changes: [
      { kind: 'interaction', text: '取消任务前弹出二次确认(alertdialog)；其他操作用右下角 Toast 反馈,4 秒自动消失。' },
      { kind: 'ui', text: '命令栏下新增 40px 跑马灯公告条,置顶公告优先滚动,悬停暂停。' },
      { kind: 'ui', text: '新增计划看板(待办 / 进行中 / 已完成)与知识库面板(置顶文件 / 最近更新)。' },
      { kind: 'rename', text: '任务列「最近心跳」更名为「最近响应」,超时显示"无响应"并附解释提示。' },
      { kind: 'contract', text: '新增 Announcement / KnowledgeDoc / PlanCard 三个实体。' },
    ],
    contracts: [
      { entity: 'Announcement', fields: [
        { name: 'id', type: 'string', note: '' },
        { name: 'text', type: 'string', note: '单行文案,建议 ≤ 80 字,跑马灯不换行。' },
        { name: 'tone', type: "'info' | 'warning' | 'success'", note: '决定圆点颜色。' },
        { name: 'pinned', type: 'boolean', note: '置顶公告进入弹窗与跑马灯前列。' },
        { name: 'publishedAt', type: 'string', note: 'ISO 8601。' },
      ] },
      { entity: 'KnowledgeDoc', fields: [
        { name: 'kind', type: "'doc' | 'code' | 'sheet'", note: '决定文件图标。' },
        { name: 'pinned', type: 'boolean', note: '用户可切换；需按用户维度持久化。' },
        { name: 'size', type: 'number', note: '字节数,前端格式化为 KB / MB。' },
      ] },
      { entity: 'PlanCard', fields: [
        { name: 'column', type: "'todo' | 'doing' | 'done'", note: '看板列。' },
        { name: 'priority', type: "'high' | 'medium' | 'low'", note: '高优先级在时间线中标红。' },
        { name: 'due', type: 'string', note: 'ISO 8601 日期。' },
      ] },
    ],
    actions: [
      { action: 'PATCH /announcements/:id  { pinned }', trigger: '公告管理弹窗点击置顶 / 取消置顶', expect: '返回更新后的对象；前端乐观更新,失败需回滚并提示。' },
      { action: 'PATCH /docs/:id  { pinned }', trigger: '知识库图钉', expect: '同上。' },
      { action: 'PATCH /plan/:id  { column }', trigger: '看板卡片「移到下一列」', expect: '仅允许 todo→doing→done 顺序流转；后端拒绝时返回 409。' },
    ],
    cautions: ['取消任务是不可逆操作,接口应幂等：重复调用已取消任务返回 200 而不是报错。', '跑马灯文案由后端提供,请勿包含 HTML。'],
  },
  { version: 'v0.3', date: '9 月 2 日', title: 'Apple 风格视觉精炼', summary: '切换到 #007AFF 主色、无边框卡片、8px 状态圆点,纯样式改动,无契约变化。', branch: 'ui', changes: [
    { kind: 'ui', text: '色板、圆角、阴影、字号层级全部替换为规范令牌。' },
    { kind: 'ui', text: '状态徽章改为「圆点 + 文字 + 图标」组合,不再使用带边框标签。' },
    { kind: 'ui', text: '检查器在 1280px 宽下改为浮层覆盖,避免挤压任务表。' },
  ] },
  { version: 'v0.2', date: '9 月 2 日', title: '任务队列与检查器', summary: '定义任务状态机与操作集合,是后端任务接口的核心契约。', branch: 'main', changes: [
    { kind: 'contract', text: '定义 JobStatus 八种状态与 Job 实体。' },
    { kind: 'interaction', text: '暂停 / 继续 / 取消 / 重试 / 查看日志 / 去授权 / 提供输入 七种任务操作。' },
    { kind: 'ui', text: '任务行固定 80px,加载态与正常态等高避免抖动。' },
  ], contracts: [{ entity: 'Job', fields: [
    { name: 'status', type: "'running' | 'queued' | 'paused' | 'waiting_input' | 'failed' | 'permission_required' | 'completed'", note: '前端还有本地 loading 态,后端无需返回。' },
    { name: 'progress', type: 'number | null', note: '0–100；queued / waiting_input 可为 null。' },
    { name: 'heartbeat', type: 'string', note: '最后一次上报时间,ISO 8601；前端显示相对时间。' },
    { name: 'heartbeatStale', type: 'boolean', note: '由后端判定(建议阈值 60s),前端不自行计算。' },
    { name: 'note', type: 'string | null', note: '失败原因 / 等待说明,直接展示给用户。' },
    { name: 'logs', type: 'string[]', note: '最近 N 条,检查器只展示,不做分页。' },
  ] }], actions: [
    { action: 'POST /jobs/:id/pause · resume · cancel · retry', trigger: '任务行与检查器操作按钮', expect: '返回更新后的 Job；状态流转由后端校验。' },
    { action: 'POST /jobs/:id/authorize', trigger: '「去授权」', expect: '返回授权 URL 或直接完成；完成后状态回到 running。' },
    { action: 'POST /jobs/:id/input  { value }', trigger: '「提供输入」', expect: '成功后状态回到 running。' },
  ], cautions: ['重试应生成新的执行记录但保留同一 Job id,前端依赖 id 做选中态。'] },
  { version: 'v0.1', date: '9 月 1 日', title: '工作台骨架', summary: '224px 导航、64px 命令栏、320px 检查器的三栏布局与设计令牌。', branch: 'main', changes: [
    { kind: 'ui', text: '建立布局骨架与 globals.css 设计令牌。' },
    { kind: 'contract', text: '定义 Service / Project 实体与服务状态(online / offline / degraded / permission_required)。' },
  ], contracts: [{ entity: 'Service', fields: [
    { name: 'scope', type: "'local' | 'cloud'", note: '决定图标。' },
    { name: 'status', type: "'online' | 'offline' | 'degraded' | 'permission_required'", note: '' },
    { name: 'actionLabel', type: 'string | null', note: '异常时的下一步动作文案,如"重新连接"。' },
  ] }] },
]
