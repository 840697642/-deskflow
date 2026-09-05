export type ToolId = 'video' | 'game' | 'app'
export type StudioCardKind = 'script' | 'storyboard' | 'director' | 'engine' | 'issue' | 'milestone' | 'bug' | 'build' | 'dependency'
export type StudioCardStatus = 'idle' | 'running' | 'blocked' | 'failed' | 'done' | 'draft'
export interface StudioCardModel { id: string; toolId: ToolId; kind: StudioCardKind; title: string; subtitle?: string; status: StudioCardStatus; meta: Array<{ label: string; value: string; tone?: 'success' | 'warning' | 'danger' | 'info' }>; progress?: number; updatedAt: string; deepLink: string; planable?: boolean; errorable?: boolean }
export type ToolConnectionStatus = 'connected' | 'offline' | 'connecting'
export interface ToolConnection { toolId: ToolId; status: ToolConnectionStatus; version: string; endpoint?: string; lastSeen: string }
export type InboxItemType = 'issue' | 'idea' | 'task'
export type InboxItemStatus = 'pending' | 'accepted' | 'dismissed'
export type InboxItemPriority = 'high' | 'medium' | 'low'
export interface InboxItem { id: string; toolId: ToolId; type: InboxItemType; title: string; note?: string; priority?: InboxItemPriority; project?: string; refUrl?: string; createdAt: string; status: InboxItemStatus; planCardId?: string }
export interface UsageRecord { id: string; toolId: ToolId; model: string; project: string; tokensIn: number; tokensOut: number; cost: number; day: string; createdAt: string }
export interface ToolTimeDay { day: string; label: string; minutes: Record<ToolId, number> }
export interface AcceptInboxPayload { column: 'todo' | 'doing'; priority: InboxItemPriority; project: string; due?: string }
export interface CreateInboxItemPayload { toolId: ToolId; type: InboxItemType; title: string; note?: string; priority?: InboxItemPriority; project?: string; refUrl?: string }
export interface SaveAsErrorPayload { toolId: ToolId; title: string; refUrl?: string; cardId: string }
