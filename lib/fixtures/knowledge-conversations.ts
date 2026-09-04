import type { Conversation } from '@/lib/types/knowledge'
import { AISummaryStatus, ConversationTool } from '@/lib/types/knowledge'
const t = '2026-09-04T10:00:00Z'
const tools = [ConversationTool.CODEX, ConversationTool.CURSOR, ConversationTool.TRAE, ConversationTool.CLAUDE_CODE, ConversationTool.OTHER]
export const mockKnowledgeConversations: Conversation[] = Array.from({ length: 10 }, (_, i) => ({
  id: `kconv-${i + 1}`, spaceId: i < 3 ? 'space-ai-video' : i < 6 ? 'space-game-dev' : 'space-inbox', title: `知识库对话 ${i + 1}`, tool: tools[i % tools.length], messageCount: 2, hasErrors: i % 2 === 0, summary: i % 3 === 0 ? { status: AISummaryStatus.COMPLETED, content: '摘要内容', keyPoints: ['要点'], generatedAt: t } : undefined, sessionId: `session-${i + 1}`, messages: [{ role: 'user', content: '请分析这个问题', timestamp: t }, { role: 'assistant', content: i % 2 === 0 ? 'Error: 示例错误' : '已完成', timestamp: t }], extractedErrors: i % 2 === 0 ? [`kerr-${(i % 8) + 1}`] : [], createdAt: t, updatedAt: t,
}))
export const MOCK_CONVERSATIONS = mockKnowledgeConversations
