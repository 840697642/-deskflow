export type SkillOutput = 'image' | 'text' | 'code' | 'video' | 'data'
export type SkillSourceKind = 'github' | 'url' | 'local' | 'tool' | 'evolved'
export type SkillDomain = 'app' | 'video' | 'game' | 'general'
export type RiskLevel = 'low' | 'medium' | 'high'
export interface SkillSource { kind: SkillSourceKind; label: string; url?: string; linked: boolean; version?: string; upstreamVersion?: string }
export interface SkillCompat { codex: boolean; cursor: boolean; trae: boolean; claude: boolean }
export interface SkillPermission { label: string; risk: RiskLevel }
export interface SkillShowcase { id: string; output: SkillOutput; title: string; prompt: string; model: string; result: string; imageSrc?: string; score?: number; createdAt: string }
export interface Skill { id: string; name: string; slug: string; description: string; output: SkillOutput; domains: SkillDomain[]; tags: string[]; structure: string[]; useCases: string[]; usage: string; pinned: boolean; usageCount: number; usageTrend: number[]; successRate: number; lastUsedAt: string; addedAt: string; source: SkillSource; compat: SkillCompat; permissions: SkillPermission[]; version: string; parentIds?: string[]; showcase: SkillShowcase[]; goldenCases: number; enabled?: boolean; status?: 'active' | 'draft' }
