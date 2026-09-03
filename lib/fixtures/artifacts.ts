import type { Artifact } from '@/lib/types/common'

export const mockArtifacts: Artifact[] = [
  {
    id: 'artifact-1',
    name: 'Scene-00 / establishing shot',
    type: 'video',
    status: 'ready',
    updatedAt: '2026-09-02T10:18:00Z',
    projectId: 'project-tri-mode',
  },
  {
    id: 'artifact-2',
    name: 'Harmony Game prototype',
    type: 'build',
    status: 'processing',
    updatedAt: '2026-09-02T07:30:00Z',
    projectId: 'project-tri-mode',
  },
]
