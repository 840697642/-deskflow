'use client'

import { useMemo } from 'react'
import { Bug, Package, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TONE_BADGE, type Toast } from '@/components/ui-primitives'
import { ConnBanner, StudioCard, StudioEmpty, StudioSection, openDeepLink, type StudioCardModel, type ToolConn } from '@/components/creation-shared'

// =============================================================================
// 应用开发工作室摘要：Bug 看板（按严重度）/ 构建与部署 / 依赖与告警
// =============================================================================

const SEVERITY_ORDER = ['failed', 'blocked', 'running', 'idle', 'draft', 'done'] as const

export default function AppStudio({
  cards,
  conn,
  todayCost,
  todayTokens,
  onToast,
  onAddToPlan,
  onSaveError,
}: {
  cards: StudioCardModel[]
  conn: ToolConn
  todayCost: number
  todayTokens: number
  onToast: (t: Omit<Toast, 'id'>) => void
  onAddToPlan: (card: StudioCardModel) => void
  onSaveError: (card: StudioCardModel) => void
}) {
  const bugs = useMemo(
    () => cards.filter((c) => c.kind === 'bug').sort((a, b) => SEVERITY_ORDER.indexOf(a.status) - SEVERITY_ORDER.indexOf(b.status)),
    [cards],
  )
  const builds = useMemo(() => cards.filter((c) => c.kind === 'build'), [cards])
  const deps = useMemo(() => cards.filter((c) => c.kind === 'dependency'), [cards])

  const openTool = () => openDeepLink('trimode://app/workspace')
  const openCard = (c: StudioCardModel) => openDeepLink(c.deepLink)

  if (cards.length === 0 && conn.status !== 'connected') {
    return <StudioEmpty toolId="app" onOpen={openTool} />
  }

  const critical = bugs.filter((b) => b.status === 'failed').length

  return (
    <div className="flex flex-col gap-6">
      <ConnBanner
        conn={conn}
        cost={todayCost}
        tokens={todayTokens}
        onOpen={openTool}
        onReconnect={() => onToast({ tone: 'info', title: '正在连接应用开发工具', description: '若工具未启动，将尝试通过 trimode:// 唤起。' })}
      />

      <StudioSection
        title="Bug 看板"
        icon={Bug}
        count={bugs.length}
        description="按严重度排序；崩溃与阻塞级 Bug 置顶。"
        action={critical > 0 ? <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', TONE_BADGE.danger)}>{critical} 个严重</span> : undefined}
      >
        {bugs.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} onSaveError={onSaveError} />
        ))}
      </StudioSection>

      <StudioSection title="构建与部署" icon={Rocket} count={builds.length} description="各环境的构建与发布状态。" columns={2}>
        {builds.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
        ))}
      </StudioSection>

      <StudioSection title="依赖与告警" icon={Package} count={deps.length} description="安全告警、过期依赖与 SDK 版本提醒。" columns={2}>
        {deps.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
        ))}
      </StudioSection>
    </div>
  )
}
