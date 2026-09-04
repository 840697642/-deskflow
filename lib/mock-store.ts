import { mockArtifacts } from '@/lib/fixtures/artifacts'
import { mockConversations } from '@/lib/fixtures/conversations'
import { mockJobs } from '@/lib/fixtures/jobs'
import { mockModules } from '@/lib/fixtures/modules'
import { mockTasks } from '@/lib/fixtures/tasks'
import { mockKnowledgeDocs } from '@/lib/fixtures/knowledge-docs'
import { mockKnowledgeSpaces } from '@/lib/fixtures/knowledge-spaces'
import { mockKnowledgeFiles } from '@/lib/fixtures/knowledge-files'
import { mockKnowledgeErrors } from '@/lib/fixtures/knowledge-errors'
import { mockKnowledgeConversations } from '@/lib/fixtures/knowledge-conversations'
import { mockKnowledgeFolders } from '@/lib/fixtures/knowledge-folders'
import { mockKnowledgeApiKeys } from '@/lib/fixtures/knowledge-api-keys'
import type { ApiSuccess, Artifact, Conversation } from '@/lib/types/common'
import type { Job } from '@/lib/types/job'
import type { ModuleHealth } from '@/lib/types/module'
import type { Task } from '@/lib/types/task'
import type { KnowledgeDoc } from '@/lib/types/knowledge-doc'
import type { ApiKeyRecord, Conversation as KnowledgeConversation, ErrorEntry, Folder, KnowledgeFile, Space } from '@/lib/types/knowledge'

export interface MutationRecord {
  status: number
  body: ApiSuccess<unknown>
}

export interface MockStore {
  tasks: Task[]
  jobs: Job[]
  modules: ModuleHealth[]
  conversations: Conversation[]
  artifacts: Artifact[]
  knowledgeDocs: KnowledgeDoc[]
  knowledgeSpaces: Space[]
  knowledgeFiles: KnowledgeFile[]
  knowledgeErrors: ErrorEntry[]
  knowledgeConversations: KnowledgeConversation[]
  knowledgeFolders: Folder[]
  knowledgeApiKeys: ApiKeyRecord[]
  mutations: Map<string, MutationRecord>
}

const globalState = globalThis as typeof globalThis & { __triModeMockStore?: MockStore }

function createStore(): MockStore {
  return {
    tasks: mockTasks.map((task) => ({ ...task })),
    jobs: mockJobs.map((job) => ({ ...job, logs: [...job.logs] })),
    modules: mockModules.map((module) => ({ ...module })),
    conversations: mockConversations.map((conversation) => ({ ...conversation })),
    artifacts: mockArtifacts.map((artifact) => ({ ...artifact })),
    knowledgeDocs: mockKnowledgeDocs.map((doc) => ({ ...doc, tags: doc.tags ? [...doc.tags] : undefined })),
    knowledgeSpaces: mockKnowledgeSpaces.map((space) => ({ ...space })),
    knowledgeFiles: mockKnowledgeFiles.map((file) => ({ ...file, tags: [...file.tags], metadata: { ...file.metadata }, aiSummary: file.aiSummary ? { ...file.aiSummary } : undefined })),
    knowledgeErrors: mockKnowledgeErrors.map((error) => ({ ...error, relatedFileIds: [...error.relatedFileIds] })),
    knowledgeConversations: mockKnowledgeConversations.map((conversation) => ({ ...conversation, messages: conversation.messages.map((message) => ({ ...message })), extractedErrors: [...conversation.extractedErrors] })),
    knowledgeFolders: mockKnowledgeFolders.map((folder) => ({ ...folder })),
    knowledgeApiKeys: mockKnowledgeApiKeys.map((key) => ({ ...key, scopes: [...key.scopes] })),
    mutations: new Map(),
  }
}

export function getMockStore(): MockStore {
  globalState.__triModeMockStore ??= createStore()
  return globalState.__triModeMockStore
}

export function resetMockStore(): void {
  globalState.__triModeMockStore = createStore()
}

export function mutationKey(actor: string, clientMutationId: string): string {
  return `${actor}:${clientMutationId}`
}

export function getMutation(store: MockStore, key: string): MutationRecord | undefined {
  return store.mutations.get(key)
}

export function saveMutation<T>(store: MockStore, key: string, status: number, body: ApiSuccess<T>): void {
  store.mutations.set(key, { status, body: body as ApiSuccess<unknown> })
}
