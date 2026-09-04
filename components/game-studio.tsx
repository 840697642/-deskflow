'use client'

import { useMemo } from 'react'
import { Cpu, Flag, TriangleAlert } from 'lucide-react'
import type { Toast } from '@/components/ui-primitives'
import { ConnBanner, StudioCard, StudioEmpty, StudioSection, openDeepLink, type StudioCardModel, type ToolConn } from '@/components/creation-shared'

// =============================================================================
// 鸿蒙游戏工作室摘要：引擎与构建 / 问题与阻塞 / 资源与里程碑
// =============================================================================

export default function GameStudio({
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
  const engines = useMemo(() => cards.filter((c) => c.kind === 'engine'), [cards])
  const issues = useMemo(() => cards.filter((c) => c.kind === 'issue'), [cards])
  const milestones = useMemo(() => cards.filter((c) => c.kind === 'milestone'), [cards])

  const openTool = () => openDeepLink('trimode://game/workspace')
  const openCard = (c: StudioCardModel) => openDeepLink(c.deepLink)

  if (cards.length === 0 && conn.status !== 'connected') {
    return <StudioEmpty toolId="game" onOpen={openTool} />
  }

  const blocked = issues.filter((i) => i.status === 'blocked' || i.status === 'failed').length

  return (
    <div className="flex flex-col gap-6">
      <ConnBanner
        conn={conn}
        cost={todayCost}
        tokens={todayTokens}
        onOpen={openTool}
        onReconnect={() => onToast({ tone: 'info', title: '正在连接游戏开发工具', description: '若工具未启动，将尝试通过 trimode:// 唤起。' })}
      />

      <StudioSection title="引擎与构建" icon={Cpu} count={engines.length} description="项目使用的引擎、当前构建状态与目标设备。">
        {engines.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
        ))}
      </StudioSection>

      <StudioSection
        title="问题与阻塞"
        icon={TriangleAlert}
        count={issues.length}
        description={blocked > 0 ? `${blocked} 个问题正在阻塞进度，可加入计划或存为错题。` : '运行时问题、签名与真机调试异常。'}
      >
        {issues.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} onSaveError={onSaveError} />
        ))}
      </StudioSection>

      <StudioSection title="资源与里程碑" icon={Flag} count={milestones.length} description="资产打包、关卡与发布节点进度。">
        {milestones.map((c) => (
          <StudioCard key={c.id} card={c} onOpen={openCard} onAddToPlan={onAddToPlan} />
        ))}
      </StudioSection>
    </div>
  )
}
