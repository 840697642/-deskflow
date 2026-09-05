import { useEffect, useState } from 'react'
import {
  fetchToolConnection,
  fetchInboxItems,
  fetchUsageRecords,
  fetchToolTimeStats,
  fetchStudioCards,
  type ToolConnection,
} from '@/lib/api-client'
import type { ToolId, ToolConn, StudioCardModel, InboxItem, Usage, ToolTimeDay } from '@/components/creation-shared'
import type { View } from '../types'

interface UseCreationToolsReturn {
  connections: Record<ToolId, ToolConn>
  studioCards: StudioCardModel[]
  inbox: InboxItem[]
  usage: Usage[]
  toolTime: ToolTimeDay[]
  setInbox: React.Dispatch<React.SetStateAction<InboxItem[]>>
  setStudioCards: React.Dispatch<React.SetStateAction<StudioCardModel[]>>
}

/**
 * 创作工具数据 Hook
 * 负责加载视频/游戏/应用三个工具的连接状态、Studio 卡片、收件箱、用量统计
 */
export function useCreationTools(currentView: View): UseCreationToolsReturn {
  const [connections, setConnections] = useState<Record<ToolId, ToolConn>>({
    video: { toolId: 'video', status: 'starting' },
    game: { toolId: 'game', status: 'starting' },
    app: { toolId: 'app', status: 'starting' },
  })
  const [studioCards, setStudioCards] = useState<StudioCardModel[]>([])
  const [inbox, setInbox] = useState<InboxItem[]>([])
  const [usage, setUsage] = useState<Usage[]>([])
  const [toolTime, setToolTime] = useState<ToolTimeDay[]>([])

  // 加载三个创作工具的连接状态、收件箱、用量统计（只加载一次）
  useEffect(() => {
    void Promise.all([
      fetchToolConnection('video'),
      fetchToolConnection('game'),
      fetchToolConnection('app'),
    ])
      .then((conns) => {
        const mapped = conns.map((connection: ToolConnection) => [
          connection.toolId,
          {
            ...connection,
            status: connection.status === 'connecting' ? 'starting' : connection.status,
          } satisfies ToolConn,
        ] as const)
        setConnections(Object.fromEntries(mapped) as Record<ToolId, ToolConn>)
      })
      .catch(() => undefined)

    void fetchInboxItems({ status: 'pending' })
      .then((items) => setInbox(items as InboxItem[]))
      .catch(() => undefined)

    void fetchUsageRecords()
      .then((items) => setUsage(items as Usage[]))
      .catch(() => undefined)

    void fetchToolTimeStats({ days: 7 })
      .then((items) => setToolTime(items as ToolTimeDay[]))
      .catch(() => undefined)
  }, [])

  // 根据当前视图加载对应工具的 Studio 卡片
  useEffect(() => {
    if (currentView !== 'video' && currentView !== 'game' && currentView !== 'app') return
    void fetchStudioCards(currentView)
      .then((cards) => setStudioCards(cards as StudioCardModel[]))
      .catch(() => setStudioCards([]))
  }, [currentView])

  return {
    connections,
    studioCards,
    inbox,
    usage,
    toolTime,
    setInbox,
    setStudioCards,
  }
}
